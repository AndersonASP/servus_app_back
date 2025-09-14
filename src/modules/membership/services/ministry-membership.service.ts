import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MinistryMembership, MinistryMembershipDocument } from '../schemas/ministry-membership.schema';
import { Membership, MembershipDocument } from '../schemas/membership.schema';
import { User, UserDocument } from '../../users/schema/user.schema';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { MembershipRole } from '../../../common/enums/role.enum';
import { UserFunctionService } from '../../functions/services/user-function.service';

export interface CreateMinistryMembershipDto {
  userId: string;
  ministryId: string;
  role: MembershipRole;
  notes?: string;
  createdBy?: string;
}

export interface UpdateMinistryMembershipDto {
  role?: MembershipRole;
  notes?: string;
  updatedBy?: string;
}

@Injectable()
export class MinistryMembershipService {
  constructor(
    @InjectModel(MinistryMembership.name) 
    private ministryMembershipModel: Model<MinistryMembershipDocument>,
    @InjectModel(Membership.name) 
    private membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
    @InjectModel(Ministry.name) 
    private ministryModel: Model<Ministry>,
    private userFunctionService: UserFunctionService,
  ) {}

  /**
   * Vincular usuário a um ministério
   */
  async addUserToMinistry(
    userId: string,
    ministryId: string,
    role: MembershipRole,
    createdBy?: string,
    notes?: string
  ) {
    console.log('🔗 Vinculando usuário ao ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Role:', role);

    // Validar usuário
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (!user.isActive) {
      throw new BadRequestException('Usuário inativo');
    }

    // Validar ministério
    const ministry = await this.ministryModel.findById(ministryId);
    if (!ministry) {
      throw new NotFoundException('Ministério não encontrado');
    }

    // Verificar se já existe vínculo ativo
    const existingMembership = await this.ministryMembershipModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já está vinculado a este ministério');
    }

    // Verificar se existe vínculo inativo para reativar
    const inactiveMembership = await this.ministryMembershipModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      isActive: false,
    });

    if (inactiveMembership) {
      // Reativar vínculo existente
      inactiveMembership.isActive = true;
      inactiveMembership.role = role;
      inactiveMembership.joinedAt = new Date();
      inactiveMembership.leftAt = undefined;
      inactiveMembership.notes = notes;
      inactiveMembership.updatedBy = createdBy ? new Types.ObjectId(createdBy) : undefined;
      
      const updatedMembership = await inactiveMembership.save();
      console.log('✅ Vínculo reativado com sucesso');
      return updatedMembership;
    }

    // Criar novo vínculo
    const membership = new this.ministryMembershipModel({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      role,
      isActive: true,
      joinedAt: new Date(),
      notes,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
    });

    const savedMembership = await membership.save();
    console.log('✅ Usuário vinculado ao ministério com sucesso');
    return savedMembership;
  }

  /**
   * Desvincular usuário de um ministério
   */
  async removeUserFromMinistry(
    userId: string,
    ministryId: string,
    removedBy?: string
  ) {
    console.log('🗑️ Desvinculando usuário do ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);

    // Buscar vínculo ativo
    const membership = await this.ministryMembershipModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    if (!membership) {
      throw new NotFoundException('Usuário não está vinculado a este ministério');
    }

    // Remover funções do usuário neste ministério
    console.log('🗑️ Removendo funções do usuário no ministério...');
    const deletedFunctionsCount = await this.userFunctionService.deleteUserFunctionsByUserAndMinistry(
      userId,
      ministryId,
      '', // tenantId - será obtido do contexto
      ''  // branchId - será obtido do contexto
    );
    console.log(`✅ ${deletedFunctionsCount} funções removidas`);

    // Desativar vínculo
    membership.isActive = false;
    membership.leftAt = new Date();
    membership.updatedBy = removedBy ? new Types.ObjectId(removedBy) : undefined;

    await membership.save();
    console.log('✅ Usuário desvinculado do ministério com sucesso');

    return {
      message: 'Usuário desvinculado do ministério com sucesso',
      deletedFunctionsCount,
    };
  }

  /**
   * Listar membros de um ministério
   */
  async getMinistryMembers(
    ministryId: string,
    options: {
      role?: MembershipRole;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    console.log('👥 Listando membros do ministério...');
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Options:', options);

    const query: any = {
      ministry: ministryId,
    };

    if (!options.includeInactive) {
      query.isActive = true;
    }

    if (options.role) {
      query.role = options.role;
    }

    console.log('🔍 Executando query no banco...');
    console.log('   - Query:', JSON.stringify(query, null, 2));
    
    const memberships = await this.membershipModel
      .find(query)
      .populate('user', 'name email picture phone')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.offset || 0);

    console.log(`✅ Encontrados ${memberships.length} membros`);
    
    if (memberships.length > 0) {
      console.log('📋 Primeiro membro:', JSON.stringify(memberships[0], null, 2));
    }
    
    return memberships;
  }

  /**
   * Listar ministérios de um usuário
   */
  async getUserMinistries(
    userId: string,
    options: {
      includeInactive?: boolean;
      role?: MembershipRole;
    } = {}
  ) {
    console.log('🏛️ Listando ministérios do usuário...');
    console.log('   - User ID:', userId);
    console.log('   - Options:', options);

    const query: any = {
      userId: new Types.ObjectId(userId),
    };

    if (!options.includeInactive) {
      query.isActive = true;
    }

    if (options.role) {
      query.role = options.role;
    }

    const memberships = await this.ministryMembershipModel
      .find(query)
      .populate('ministryId', 'name description')
      .sort({ joinedAt: -1 });

    console.log(`✅ Encontrados ${memberships.length} ministérios`);
    return memberships;
  }

  /**
   * Atualizar vínculo de ministério
   */
  async updateMinistryMembership(
    userId: string,
    ministryId: string,
    updateData: UpdateMinistryMembershipDto
  ) {
    console.log('✏️ Atualizando vínculo de ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Update data:', updateData);

    const membership = await this.ministryMembershipModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    if (updateData.role) {
      membership.role = updateData.role;
    }
    if (updateData.notes !== undefined) {
      membership.notes = updateData.notes;
    }
    if (updateData.updatedBy) {
      membership.updatedBy = new Types.ObjectId(updateData.updatedBy);
    }

    const updatedMembership = await membership.save();
    console.log('✅ Vínculo atualizado com sucesso');
    return updatedMembership;
  }

  /**
   * Verificar se usuário está vinculado a um ministério
   */
  async isUserInMinistry(userId: string, ministryId: string): Promise<boolean> {
    const membership = await this.ministryMembershipModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    return !!membership;
  }

  /**
   * Obter estatísticas de um ministério
   */
  async getMinistryStats(ministryId: string) {
    const totalMembers = await this.ministryMembershipModel.countDocuments({
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    const volunteers = await this.ministryMembershipModel.countDocuments({
      ministryId: new Types.ObjectId(ministryId),
      role: MembershipRole.Volunteer,
      isActive: true,
    });

    const leaders = await this.ministryMembershipModel.countDocuments({
      ministryId: new Types.ObjectId(ministryId),
      role: MembershipRole.Leader,
      isActive: true,
    });

    return {
      totalMembers,
      volunteers,
      leaders,
    };
  }
}
