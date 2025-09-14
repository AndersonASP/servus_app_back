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
    
    console.log(`🔍 [FunctionsService] findSimilarFunction - Buscando função: "${name}" (slug: "${slug}")`);
    
    // Busca exata por slug
    let function_ = await this.functionModel.findOne({ 
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
      slug 
    });

    if (function_) {
      console.log(`✅ [FunctionsService] findSimilarFunction - Encontrada por slug: "${function_.name}" (${function_._id})`);
      return function_;
    }

    // Busca por nome similar (case insensitive) - ESCAPAR caracteres especiais
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedName}$`, 'i');
    console.log(`🔍 [FunctionsService] findSimilarFunction - Buscando por regex: ${regex}`);
    
    function_ = await this.functionModel.findOne({
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
      name: { $regex: regex },
      isActive: true
    });

    if (function_) {
      console.log(`✅ [FunctionsService] findSimilarFunction - Encontrada por nome: "${function_.name}" (${function_._id})`);
    } else {
      console.log(`❌ [FunctionsService] findSimilarFunction - Nenhuma função encontrada para: "${name}"`);
    }

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
    console.log('🚀 [FunctionsService] Iniciando bulkUpsertFunctions...');
    console.log('📋 [FunctionsService] Parâmetros:', {
      tenantId,
      ministryId,
      currentUserId,
      dto: {
        names: dto.names,
        category: dto.category
      }
    });

    const response: BulkUpsertResponseDto = {
      created: [],
      linked: [],
      alreadyLinked: [],
      suggestions: []
    };

    console.log(`🔄 [FunctionsService] Processando ${dto.names.length} funções...`);

    for (const name of dto.names) {
      if (!name.trim()) {
        console.log('⚠️ [FunctionsService] Nome vazio, pulando...');
        continue;
      }

      const normalizedName = name.trim();
      const slug = this.normalizeSlug(normalizedName);

      console.log(`🔍 [FunctionsService] Processando função: "${normalizedName}" (slug: "${slug}")`);

      try {
        // 1. Buscar função existente
        console.log(`🔍 [FunctionsService] Buscando função existente para: "${normalizedName}"`);
        let function_ = await this.findSimilarFunction(tenantId, normalizedName);

        if (!function_) {
          // 2. Criar nova função
          console.log(`💾 [FunctionsService] Criando nova função: "${normalizedName}"`);
          function_ = new this.functionModel({
            name: normalizedName,
            slug,
            category: dto.category,
            tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
            createdBy: new Types.ObjectId(currentUserId),
            isActive: true
          });

          console.log(`💾 [FunctionsService] Salvando função no banco...`);
          await function_.save();
          console.log(`✅ [FunctionsService] Função criada com sucesso: ${normalizedName} (${function_._id})`);
        } else {
          console.log(`♻️ [FunctionsService] Função reutilizada: ${normalizedName} (${function_._id})`);
        }

        // 3. Verificar se já está vinculada ao ministério
        console.log(`🔗 [FunctionsService] Verificando vínculo existente para função: ${function_._id}`);
        const existingLink = await this.ministryFunctionModel.findOne({
          tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
          ministryId: new Types.ObjectId(ministryId),
          functionId: function_._id
        });

        if (existingLink) {
          console.log(`🔗 [FunctionsService] Vínculo existente encontrado (isActive: ${existingLink.isActive})`);
          if (existingLink.isActive) {
            console.log(`✅ [FunctionsService] Função já vinculada: ${normalizedName}`);
            response.alreadyLinked.push(this.mapToMinistryFunctionResponse(function_, existingLink));
          } else {
            // Reativar vínculo existente
            console.log(`🔄 [FunctionsService] Reativando vínculo existente: ${normalizedName}`);
            existingLink.isActive = true;
            existingLink.createdBy = currentUserId;
            await existingLink.save();
            response.linked.push(this.mapToMinistryFunctionResponse(function_, existingLink));
          }
        } else {
          // 4. Criar novo vínculo
          console.log(`🔗 [FunctionsService] Criando novo vínculo para função: ${normalizedName}`);
          const ministryFunction = new this.ministryFunctionModel({
            tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
            ministryId: new Types.ObjectId(ministryId),
            functionId: function_._id,
            isActive: true,
            defaultSlots: 1,
            createdBy: new Types.ObjectId(currentUserId)
          });

          console.log(`💾 [FunctionsService] Salvando vínculo no banco...`);
          await ministryFunction.save();
          console.log(`✅ [FunctionsService] Vínculo criado com sucesso: ${normalizedName} (${ministryFunction._id})`);
          
          if ((function_ as any).createdAt.getTime() === (function_ as any).updatedAt.getTime()) {
            console.log(`📝 [FunctionsService] Função adicionada como CRIADA: ${normalizedName}`);
            response.created.push(this.mapToMinistryFunctionResponse(function_, ministryFunction));
          } else {
            console.log(`📝 [FunctionsService] Função adicionada como VINCULADA: ${normalizedName}`);
            response.linked.push(this.mapToMinistryFunctionResponse(function_, ministryFunction));
          }
        }

      } catch (error) {
        console.error(`❌ [FunctionsService] Erro ao processar função "${normalizedName}":`, error);
        response.suggestions.push({
          name: normalizedName,
          suggested: '',
          reason: 'Erro ao processar: ' + error.message
        });
      }
    }

    console.log('🎯 [FunctionsService] Resumo do bulkUpsertFunctions:');
    console.log(`   - Criadas: ${response.created.length}`);
    console.log(`   - Vinculadas: ${response.linked.length}`);
    console.log(`   - Já vinculadas: ${response.alreadyLinked.length}`);
    console.log(`   - Sugestões: ${response.suggestions.length}`);
    console.log(`   - Total processadas: ${response.created.length + response.linked.length + response.alreadyLinked.length + response.suggestions.length}`);

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
    console.log('🔍 [FunctionsService] getMinistryFunctions iniciado');
    console.log('   - tenantId:', tenantId);
    console.log('   - ministryId:', ministryId);
    console.log('   - active:', active);

    const query: any = {
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
      ministryId: new Types.ObjectId(ministryId)
    };

    if (active !== undefined) {
      query.isActive = active;
    }

    console.log('🔍 [FunctionsService] Query:', query);

    const ministryFunctions = await this.ministryFunctionModel
      .find(query)
      .populate('functionId')
      .sort({ createdAt: -1 });

    console.log('📊 [FunctionsService] MinistryFunctions encontradas:', ministryFunctions.length);
    console.log('📋 [FunctionsService] Primeira ministryFunction:', ministryFunctions[0] ? {
      id: ministryFunctions[0]._id,
      functionId: ministryFunctions[0].functionId,
      isActive: ministryFunctions[0].isActive
    } : 'nenhuma');

    const result = ministryFunctions.map(mf => 
      this.mapToMinistryFunctionResponse(mf.functionId as any, mf)
    );

    console.log('✅ [FunctionsService] Resultado final:', result.length);
    console.log('📋 [FunctionsService] Funções:', result.map(r => r.name));

    return result;
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
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
          tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
        tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
      ministryId: new Types.ObjectId(ministryId),
      functionId: new Types.ObjectId(functionId),
      isActive: true
    });

    if (!ministryFunction) {
      throw new BadRequestException('Função não está habilitada neste ministério');
    }

    // Verificar se já existe vínculo
    const existing = await this.memberFunctionModel.findOne({
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
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
      tenantId: new Types.ObjectId(tenantId),
      ministryId: new Types.ObjectId(ministryId),
    });

    // Remove todas as funções de membros vinculadas ao ministério
    await this.memberFunctionModel.deleteMany({
      tenantId: new Types.ObjectId(tenantId),
      ministryId: new Types.ObjectId(ministryId),
    });
  }
}
