import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Function } from '../schemas/function.schema';
import { MinistryFunction } from '../schemas/ministry-function.schema';
import { MemberFunction, MemberFunctionStatus } from '../schemas/member-function.schema';
import { BulkUpsertFunctionsDto } from '../dto/bulk-upsert-functions.dto';
import { UpdateMinistryFunctionDto } from '../dto/update-ministry-function.dto';
import { BulkUpsertResponseDto, MinistryFunctionResponseDto } from '../dto/ministry-function-response.dto';

@Injectable()
export class FunctionsService {
  constructor(
    @InjectModel(Function.name) private functionModel: Model<Function>,
    @InjectModel(MinistryFunction.name) private ministryFunctionModel: Model<MinistryFunction>,
    @InjectModel(MemberFunction.name) private memberFunctionModel: Model<MemberFunction>,
  ) {}

  /**
   * Normaliza o nome da função para slug
   */
  private normalizeSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .trim();
  }

  /**
   * Busca função por slug ou nome similar
   */
  private async findSimilarFunction(tenantId: string, name: string): Promise<Function | null> {
    const slug = this.normalizeSlug(name);
    
    // Busca exata por slug
    let function_ = await this.functionModel.findOne({ 
      tenantId: tenantId, // Usar string diretamente, não ObjectId
      slug 
    });

    if (function_) return function_;

    // Busca por nome similar (case insensitive)
    function_ = await this.functionModel.findOne({
      tenantId: tenantId, // Usar string diretamente, não ObjectId
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    });

    return function_;
  }

  /**
   * Cria ou reutiliza função e vincula ao ministério
   */
  async bulkUpsertFunctions(
    tenantId: string,
    ministryId: string,
    dto: BulkUpsertFunctionsDto,
    currentUserId: string
  ): Promise<BulkUpsertResponseDto> {
    const response: BulkUpsertResponseDto = {
      created: [],
      linked: [],
      alreadyLinked: [],
      suggestions: []
    };

    for (const name of dto.names) {
      if (!name.trim()) continue;

      const normalizedName = name.trim();
      const slug = this.normalizeSlug(normalizedName);

      try {
        // 1. Buscar função existente
        let function_ = await this.findSimilarFunction(tenantId, normalizedName);

        if (!function_) {
          // 2. Criar nova função
          function_ = new this.functionModel({
            name: normalizedName,
            slug,
            category: dto.category,
            tenantId: tenantId, // Usar string diretamente
            createdBy: currentUserId,
            isActive: true
          });

          await function_.save();
          console.log(`✅ Função criada: ${normalizedName} (${function_._id})`);
        } else {
          console.log(`♻️ Função reutilizada: ${normalizedName} (${function_._id})`);
        }

        // 3. Verificar se já está vinculada ao ministério
        const existingLink = await this.ministryFunctionModel.findOne({
          tenantId: tenantId, // Usar string diretamente
          ministryId: new Types.ObjectId(ministryId),
          functionId: function_._id
        });

        if (existingLink) {
          if (existingLink.isActive) {
            response.alreadyLinked.push(this.mapToMinistryFunctionResponse(function_, existingLink));
          } else {
            // Reativar vínculo existente
            existingLink.isActive = true;
            existingLink.createdBy = currentUserId;
            await existingLink.save();
            response.linked.push(this.mapToMinistryFunctionResponse(function_, existingLink));
          }
        } else {
          // 4. Criar novo vínculo
          const ministryFunction = new this.ministryFunctionModel({
            tenantId: tenantId, // Usar string diretamente
            ministryId: new Types.ObjectId(ministryId),
            functionId: function_._id,
            isActive: true,
            defaultSlots: 1,
            createdBy: currentUserId
          });

          await ministryFunction.save();
          
          if ((function_ as any).createdAt.getTime() === (function_ as any).updatedAt.getTime()) {
            response.created.push(this.mapToMinistryFunctionResponse(function_, ministryFunction));
          } else {
            response.linked.push(this.mapToMinistryFunctionResponse(function_, ministryFunction));
          }
        }

      } catch (error) {
        console.error(`❌ Erro ao processar função "${normalizedName}":`, error);
        response.suggestions.push({
          name: normalizedName,
          suggested: '',
          reason: 'Erro ao processar: ' + error.message
        });
      }
    }

    return response;
  }

  /**
   * Lista funções habilitadas do ministério
   */
  async getMinistryFunctions(
    tenantId: string,
    ministryId: string,
    active?: boolean
  ): Promise<MinistryFunctionResponseDto[]> {
    const query: any = {
      tenantId: tenantId, // Usar string diretamente
      ministryId: new Types.ObjectId(ministryId)
    };

    if (active !== undefined) {
      query.isActive = active;
    }

    const ministryFunctions = await this.ministryFunctionModel
      .find(query)
      .populate('functionId')
      .sort({ createdAt: -1 });

    return ministryFunctions.map(mf => 
      this.mapToMinistryFunctionResponse(mf.functionId as any, mf)
    );
  }

  /**
   * Lista catálogo do tenant com indicação se está habilitada no ministério
   */
  async getTenantFunctions(
    tenantId: string,
    ministryId?: string,
    search?: string
  ): Promise<MinistryFunctionResponseDto[]> {
    const query: any = {
      tenantId: tenantId, // Usar string diretamente
      isActive: true
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    const functions = await this.functionModel
      .find(query)
      .sort({ name: 1 });

    const result: MinistryFunctionResponseDto[] = [];

    for (const func of functions) {
      let ministryFunction = null;
      
      if (ministryId) {
        ministryFunction = await this.ministryFunctionModel.findOne({
          tenantId: tenantId, // Usar string diretamente
          ministryId: new Types.ObjectId(ministryId),
          functionId: func._id
        });
      }

      result.push(this.mapToMinistryFunctionResponse(func, ministryFunction));
    }

    return result;
  }

  /**
   * Atualiza vínculo ministério-função
   */
  async updateMinistryFunction(
    tenantId: string,
    ministryId: string,
    functionId: string,
    dto: UpdateMinistryFunctionDto
  ): Promise<MinistryFunctionResponseDto> {
    const ministryFunction = await this.ministryFunctionModel.findOneAndUpdate(
      {
        tenantId: tenantId, // Usar string diretamente
        ministryId: new Types.ObjectId(ministryId),
        functionId: new Types.ObjectId(functionId)
      },
      dto,
      { new: true }
    ).populate('functionId');

    if (!ministryFunction) {
      throw new NotFoundException('Vínculo ministério-função não encontrado');
    }

    return this.mapToMinistryFunctionResponse(ministryFunction.functionId as any, ministryFunction);
  }

  /**
   * Cria vínculo membro-função
   */
  async createMemberFunction(
    tenantId: string,
    memberId: string,
    ministryId: string,
    functionId: string,
    status: MemberFunctionStatus = MemberFunctionStatus.EM_TREINO,
    createdBy: string
  ): Promise<MemberFunction> {
    // Verificar se a função está habilitada no ministério
    const ministryFunction = await this.ministryFunctionModel.findOne({
      tenantId: tenantId, // Usar string diretamente
      ministryId: new Types.ObjectId(ministryId),
      functionId: new Types.ObjectId(functionId),
      isActive: true
    });

    if (!ministryFunction) {
      throw new BadRequestException('Função não está habilitada neste ministério');
    }

    // Verificar se já existe vínculo
    const existing = await this.memberFunctionModel.findOne({
      tenantId: tenantId, // Usar string diretamente
      memberId: new Types.ObjectId(memberId),
      ministryId: new Types.ObjectId(ministryId),
      functionId: new Types.ObjectId(functionId)
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Membro já possui esta função neste ministério');
      } else {
        // Reativar vínculo existente
        existing.isActive = true;
        existing.status = status;
        existing.createdBy = createdBy;
        return await existing.save();
      }
    }

    // Criar novo vínculo
    const memberFunction = new this.memberFunctionModel({
      tenantId: tenantId, // Usar string diretamente
      memberId: new Types.ObjectId(memberId),
      ministryId: new Types.ObjectId(ministryId),
      functionId: new Types.ObjectId(functionId),
      status,
      isActive: true,
      createdBy
    });

    return await memberFunction.save();
  }

  /**
   * Lista funções do membro em um ministério
   */
  async getMemberFunctions(
    tenantId: string,
    memberId: string,
    ministryId?: string
  ): Promise<MemberFunction[]> {
    const query: any = {
      tenantId: tenantId, // Usar string diretamente
      memberId: new Types.ObjectId(memberId),
      isActive: true
    };

    if (ministryId) {
      query.ministryId = new Types.ObjectId(ministryId);
    }

    return await this.memberFunctionModel
      .find(query)
      .populate('functionId')
      .populate('ministryId')
      .sort({ createdAt: -1 });
  }

  /**
   * Mapeia para DTO de resposta
   */
  private mapToMinistryFunctionResponse(
    func: Function,
    ministryFunction?: MinistryFunction | null
  ): MinistryFunctionResponseDto {
    return {
      functionId: (func._id as any).toString(),
      name: func.name,
      slug: func.slug,
      category: func.category,
      description: func.description,
      isActive: ministryFunction?.isActive ?? false,
      defaultSlots: ministryFunction?.defaultSlots,
      notes: ministryFunction?.notes,
      createdAt: (ministryFunction as any)?.createdAt ?? (func as any).createdAt,
      updatedAt: (ministryFunction as any)?.updatedAt ?? (func as any).updatedAt
    };
  }

  /**
   * Remove todas as funções vinculadas a um ministério (cascade delete)
   */
  async removeMinistryFunctions(tenantId: string, ministryId: string): Promise<void> {
    // Remove todas as funções de ministério
    await this.ministryFunctionModel.deleteMany({
      tenantId: tenantId,
      ministryId: new Types.ObjectId(ministryId),
    });

    // Remove todas as funções de membros vinculadas ao ministério
    await this.memberFunctionModel.deleteMany({
      tenantId: tenantId,
      ministryId: new Types.ObjectId(ministryId),
    });
  }
}
