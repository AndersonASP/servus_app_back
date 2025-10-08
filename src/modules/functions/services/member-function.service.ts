import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberFunction,
  MemberFunctionStatus,
  MemberFunctionLevel,
} from '../schemas/member-function.schema';
import { MinistryFunction } from '../schemas/ministry-function.schema';
import { Tenant } from '../../tenants/schemas/tenant.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { User } from '../../users/schema/user.schema';

export interface CreateMemberFunctionDto {
  userId: string;
  ministryId: string;
  functionId: string;
  status?: MemberFunctionStatus;
  level?: MemberFunctionLevel;
  priority?: number;
  notes?: string;
  isActive?: boolean;
  createdByRole?: string; // Role do usuário que está criando
}

export interface UpdateMemberFunctionStatusDto {
  status: MemberFunctionStatus;
  notes?: string;
  approvedBy?: string;
}

export interface MemberFunctionResponseDto {
  id: string;
  userId: string;
  ministryId: string;
  functionId: string;
  status: MemberFunctionStatus;
  level?: MemberFunctionLevel;
  priority?: number;
  notes?: string;
  isActive: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy?: string;
  tenantId: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Dados populados
  function?: {
    id: string;
    name: string;
    description?: string;
    slug?: string;
  };
  ministry?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable()
export class MemberFunctionService {
  constructor(
    @InjectModel(MemberFunction.name)
    private memberFunctionModel: Model<MemberFunction>,
    @InjectModel(MinistryFunction.name)
    private ministryFunctionModel: Model<MinistryFunction>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createMemberFunction(
    tenantId: string,
    branchId: string | null,
    dto: CreateMemberFunctionDto,
    currentUserId: string,
  ): Promise<MemberFunctionResponseDto> {
    // Validar se os IDs são ObjectIds válidos
    console.log('🔍 Validando IDs para MemberFunction:');
    console.log(
      '   - dto.userId:',
      dto.userId,
      '(length:',
      dto.userId?.length,
      ')',
    );
    console.log(
      '   - dto.ministryId:',
      dto.ministryId,
      '(length:',
      dto.ministryId?.length,
      ')',
    );
    console.log(
      '   - dto.functionId:',
      dto.functionId,
      '(length:',
      dto.functionId?.length,
      ')',
    );
    console.log('   - tenantId:', tenantId, '(length:', tenantId?.length, ')');
    console.log('   - branchId:', branchId, '(length:', branchId?.length, ')');

    try {
      new Types.ObjectId(dto.userId);
      console.log('✅ userId válido');
      new Types.ObjectId(dto.ministryId);
      console.log('✅ ministryId válido');
      new Types.ObjectId(dto.functionId);
      console.log('✅ functionId válido');
      // tenantId é uma string UUID, não ObjectId
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('tenantId deve ser uma string válida');
      }
      console.log('✅ tenantId válido');
      if (branchId) {
        new Types.ObjectId(branchId);
        console.log('✅ branchId válido');
      }
    } catch (error) {
      console.log('❌ Erro na validação de ID:', error);
      throw new BadRequestException(
        'ID inválido fornecido. Verifique se os IDs são válidos.',
      );
    }

    // Buscar o tenant pelo ObjectId
    let tenant: any;
    try {
      if (tenantId === 'servus-system') {
        console.log('🔓 ServusAdmin detectado - pulando validação de tenant');
        tenant = { _id: 'servus-system' };
      } else {
        tenant = await this.tenantModel.findById(tenantId);
        if (!tenant) {
          throw new NotFoundException('Tenant não encontrado');
        }
        console.log('✅ Tenant encontrado:', tenant.name);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar tenant:', error);
      throw new BadRequestException('Tenant inválido');
    }

    // Verificar se já existe uma MemberFunction para este usuário, ministério e função
    const existingMemberFunction = await this.memberFunctionModel.findOne({
      memberId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      functionId: new Types.ObjectId(dto.functionId),
      tenantId:
        tenant._id === 'servus-system'
          ? 'servus-system'
          : new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });

    if (existingMemberFunction) {
      console.log('⚠️ MemberFunction já existe, atualizando...');
      return this.updateMemberFunctionStatus(
        (existingMemberFunction._id as Types.ObjectId).toString(),
        {
          status: dto.status || MemberFunctionStatus.PENDING,
          notes: dto.notes,
          approvedBy: currentUserId,
        },
      );
    }

    // Determinar status baseado no role do usuário que está criando
    let finalStatus = dto.status || MemberFunctionStatus.PENDING;
    let finalNotes = dto.notes;

    if (
      dto.createdByRole === 'tenant_admin' ||
      dto.createdByRole === 'leader'
    ) {
      // Aprovação automática quando criado por tenant_admin ou leader
      finalStatus = MemberFunctionStatus.APROVADO;
      finalNotes =
        finalNotes || `Aprovado automaticamente pelo ${dto.createdByRole}`;
      console.log(
        `✅ [MemberFunctionService] Aprovação automática pelo ${dto.createdByRole}`,
      );
    } else {
      console.log(
        `⏳ [MemberFunctionService] Status pendente - aguardando aprovação`,
      );
    }

    // Criar nova MemberFunction
    const memberFunctionData = {
      memberId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      functionId: new Types.ObjectId(dto.functionId),
      status: finalStatus,
      level: dto.level || MemberFunctionLevel.INICIANTE,
      priority: dto.priority || 1,
      notes: finalNotes,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      tenantId:
        tenant._id === 'servus-system'
          ? 'servus-system'
          : (tenant._id as Types.ObjectId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      createdBy: currentUserId,
      approvedBy:
        finalStatus === MemberFunctionStatus.APROVADO
          ? currentUserId
          : undefined,
      approvedAt:
        finalStatus === MemberFunctionStatus.APROVADO ? new Date() : undefined,
    };

    console.log('🔧 Criando MemberFunction com dados:', memberFunctionData);

    const memberFunction = new this.memberFunctionModel(memberFunctionData);
    const savedMemberFunction = await memberFunction.save();

    console.log(
      '✅ MemberFunction criada com sucesso:',
      savedMemberFunction._id,
    );

    return this.mapToResponseDto(savedMemberFunction);
  }

  /**
   * Busca uma função pelo nome em um ministério específico
   */
  async findFunctionByNameInMinistry(
    functionName: string,
    ministryId: string,
    tenantId: string,
  ): Promise<any> {
    console.log(
      `🔍 Buscando função "${functionName}" no ministério ${ministryId}`,
    );

    // Buscar na tabela MinistryFunction
    const ministryFunction = await this.ministryFunctionModel
      .findOne({
        ministryId: new Types.ObjectId(ministryId),
        tenantId:
          tenantId === 'servus-system'
            ? 'servus-system'
            : new Types.ObjectId(tenantId),
        isActive: true,
      })
      .populate('functionId', 'name');

    if (!ministryFunction) {
      console.log(`❌ Nenhuma função encontrada no ministério ${ministryId}`);
      return null;
    }

    // Verificar se o nome da função corresponde
    const functionData = ministryFunction.functionId as any;
    if (functionData.name === functionName) {
      console.log(
        `✅ Função "${functionName}" encontrada com ID: ${functionData._id}`,
      );
      return {
        functionId: functionData._id,
        functionName: functionData.name,
      };
    }

    console.log(
      `❌ Função "${functionName}" não encontrada. Função disponível: "${functionData.name}"`,
    );
    return null;
  }

  async updateMemberFunctionStatus(
    memberFunctionId: string,
    dto: UpdateMemberFunctionStatusDto,
  ): Promise<MemberFunctionResponseDto> {
    console.log('🔄 [MemberFunctionService] Atualizando status da função...');
    console.log('   - MemberFunction ID:', memberFunctionId);
    console.log('   - Novo status:', dto.status);

    const memberFunction =
      await this.memberFunctionModel.findById(memberFunctionId);
    if (!memberFunction) {
      throw new NotFoundException('MemberFunction não encontrada');
    }

    console.log('✅ MemberFunction encontrada:', {
      id: memberFunction._id,
      userId: memberFunction.memberId,
      ministryId: memberFunction.ministryId,
      currentStatus: memberFunction.status,
      newStatus: dto.status,
    });

    memberFunction.status = dto.status;
    if (dto.notes !== undefined) {
      memberFunction.notes = dto.notes;
    }
    if (dto.approvedBy) {
      memberFunction.approvedBy = dto.approvedBy;
      memberFunction.approvedAt = new Date();
    }

    const updatedMemberFunction = await memberFunction.save();
    console.log('✅ Status da função atualizado');

    // Se a função foi APROVADA, ativar o membership e usuário
    if (dto.status === MemberFunctionStatus.APROVADO) {
      console.log('🎉 Função aprovada! Ativando membership e usuário...');

      try {
        // Ativar o membership e remover flag de aprovação pendente
        await this.membershipModel.findOneAndUpdate(
          {
            user: memberFunction.memberId,
            ministry: memberFunction.ministryId,
            tenantId: memberFunction.tenantId,
          },
          {
            isActive: true,
            needsApproval: false, // Remover flag de aprovação pendente
          },
          { new: true },
        );
        console.log('✅ Membership ativado e flag de aprovação removida');

        // Ativar o usuário (se ainda estiver inativo)
        await this.userModel.findByIdAndUpdate(
          memberFunction.memberId,
          { isActive: true },
          { new: true },
        );
        console.log('✅ Usuário ativado');

        console.log('🎉 Usuário e membership ativados com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao ativar membership/usuário:', error);
        // Não falhar a operação se houver erro na ativação
      }
    }

    return this.mapToResponseDto(updatedMemberFunction);
  }

  async getMemberFunctionsByUser(
    userId: string,
    tenantId?: string,
  ): Promise<MemberFunctionResponseDto[]> {
    console.log('🔍 [MemberFunctionService] Buscando funções do usuário...');
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    const query: any = {
      memberId: new Types.ObjectId(userId),
    };

    if (tenantId === 'servus-system') {
      console.log(
        '🔓 [MemberFunctionService] ServusAdmin detectado - pulando filtro de tenantId',
      );
      // Não adicionar filtro de tenantId para servus_admin
    } else {
      if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
        try {
          query.tenantId = new Types.ObjectId(tenantId);
        } catch (error) {
          console.error(
            '❌ [MemberFunctionService] Erro ao converter tenantId para ObjectId:',
            tenantId,
            error,
          );
          throw new BadRequestException('tenantId inválido');
        }
      }
    }

    console.log(
      '🔍 [MemberFunctionService] Query:',
      JSON.stringify(query, null, 2),
    );

    const memberFunctions = await this.memberFunctionModel
      .find(query)
      .populate('functionId', 'name description slug')
      .populate('ministryId', 'name')
      .populate('memberId', 'name email')
      .sort({ createdAt: -1 });

    console.log(
      '📋 [MemberFunctionService] MemberFunctions encontradas:',
      memberFunctions.length,
    );

    return memberFunctions.map((mf) => this.mapToResponseDto(mf));
  }

  async getMemberFunctionsByUserAndMinistry(
    userId: string,
    ministryId: string,
    status?: MemberFunctionStatus,
    tenantId?: string,
  ): Promise<MemberFunctionResponseDto[]> {
    console.log(
      '🔍 [MemberFunctionService] Buscando funções do usuário no ministério...',
    );
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Status:', status);
    console.log('   - Tenant ID:', tenantId);

    const query: any = {
      memberId: new Types.ObjectId(userId),
      $or: [
        { ministryId: new Types.ObjectId(ministryId) },
        { ministryId: ministryId },
      ],
    };

    if (status) {
      query.status = status;
    }

    if (tenantId === 'servus-system') {
      console.log(
        '🔓 [MemberFunctionService] ServusAdmin detectado - pulando filtro de tenantId',
      );
      // Não adicionar filtro de tenantId para servus_admin
    } else {
      if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
        try {
          query.tenantId = new Types.ObjectId(tenantId);
        } catch (error) {
          console.error(
            '❌ [MemberFunctionService] Erro ao converter tenantId para ObjectId:',
            tenantId,
            error,
          );
          throw new BadRequestException('tenantId inválido');
        }
      }
    }

    console.log(
      '🔍 [MemberFunctionService] Query:',
      JSON.stringify(query, null, 2),
    );

    const memberFunctions = await this.memberFunctionModel
      .find(query)
      .populate('functionId', 'name description slug')
      .populate('ministryId', 'name')
      .populate('memberId', 'name email')
      .sort({ createdAt: -1 });

    console.log(
      '📋 [MemberFunctionService] MemberFunctions encontradas:',
      memberFunctions.length,
    );

    return memberFunctions.map((mf) => this.mapToResponseDto(mf));
  }

  async getApprovedFunctionsForUser(
    userId: string,
    tenantId?: string,
  ): Promise<MemberFunctionResponseDto[]> {
    console.log(
      '🔍 [MemberFunctionService] Buscando funções aprovadas do usuário...',
    );
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    const query: any = {
      memberId: new Types.ObjectId(userId),
      status: MemberFunctionStatus.APROVADO, // Aprovado = aprovado
    };

    if (tenantId === 'servus-system') {
      console.log(
        '🔓 [MemberFunctionService] ServusAdmin detectado - pulando filtro de tenantId',
      );
      // Não adicionar filtro de tenantId para servus_admin
    } else {
      if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
        try {
          query.tenantId = new Types.ObjectId(tenantId);
        } catch (error) {
          console.error(
            '❌ [MemberFunctionService] Erro ao converter tenantId para ObjectId:',
            tenantId,
            error,
          );
          throw new BadRequestException('tenantId inválido');
        }
      }
    }

    console.log(
      '🔍 [MemberFunctionService] Query:',
      JSON.stringify(query, null, 2),
    );

    const memberFunctions = await this.memberFunctionModel
      .find(query)
      .populate('functionId', 'name description slug')
      .populate('ministryId', 'name')
      .populate('memberId', 'name email')
      .sort({ createdAt: -1 });

    console.log(
      '📋 [MemberFunctionService] MemberFunctions aprovadas encontradas:',
      memberFunctions.length,
    );

    return memberFunctions.map((mf) => this.mapToResponseDto(mf));
  }

  async deleteMemberFunction(memberFunctionId: string): Promise<void> {
    const result =
      await this.memberFunctionModel.findByIdAndDelete(memberFunctionId);
    if (!result) {
      throw new NotFoundException('MemberFunction não encontrada');
    }
  }

  private mapToResponseDto(memberFunction: any): MemberFunctionResponseDto {
    return {
      id: memberFunction._id.toString(),
      userId: memberFunction.memberId?.toString() || memberFunction.memberId,
      ministryId:
        memberFunction.ministryId?.toString() || memberFunction.ministryId,
      functionId:
        memberFunction.functionId?.toString() || memberFunction.functionId,
      status: memberFunction.status,
      level: memberFunction.level,
      priority: memberFunction.priority,
      notes: memberFunction.notes,
      isActive: memberFunction.isActive,
      approvedBy: memberFunction.approvedBy,
      approvedAt: memberFunction.approvedAt,
      createdBy: memberFunction.createdBy,
      tenantId: memberFunction.tenantId?.toString() || memberFunction.tenantId,
      branchId: memberFunction.branchId?.toString(),
      createdAt: memberFunction.createdAt,
      updatedAt: memberFunction.updatedAt,
      // Dados populados
      function:
        memberFunction.functionId &&
        typeof memberFunction.functionId === 'object' &&
        memberFunction.functionId.name
          ? {
              id: memberFunction.functionId._id.toString(),
              name: memberFunction.functionId.name,
              description: memberFunction.functionId.description,
              slug: memberFunction.functionId.slug,
            }
          : undefined,
      ministry:
        memberFunction.ministryId &&
        typeof memberFunction.ministryId === 'object'
          ? {
              id: memberFunction.ministryId._id.toString(),
              name: memberFunction.ministryId.name,
            }
          : undefined,
      user:
        memberFunction.memberId && typeof memberFunction.memberId === 'object'
          ? {
              id: memberFunction.memberId._id.toString(),
              name: memberFunction.memberId.name,
              email: memberFunction.memberId.email,
            }
          : undefined,
    };
  }
}
