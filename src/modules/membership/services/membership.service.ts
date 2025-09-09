import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership } from '../schemas/membership.schema';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UpdateMembershipDto } from '../dto/update-membership.dto';
import { MembershipRole, Role } from 'src/common/enums/role.enum';


@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
  ) {}

  // ========================================
  // 🔗 ADICIONAR MEMBROS A MINISTÉRIOS
  // ========================================

  /**
   * Adiciona um voluntário ao ministério
   * Permissões: Leader, BranchAdmin, TenantAdmin, ServusAdmin
   */
  async addVolunteerToMinistry(
    tenantId: string,
    ministryId: string,
    createMembershipDto: CreateMembershipDto,
    currentUserId: string,
  ) {
    console.log('🔗 Adicionando voluntário ao ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - User ID:', createMembershipDto.userId);
    console.log('   - Current User ID:', currentUserId);

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar se o usuário existe
    const user = await this.validateUser(createMembershipDto.userId);

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'add_volunteer');

    // Verificar se já existe membership para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: tenantId, // tenantId é UUID, não ObjectId
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já está vinculado a este ministério');
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: tenantId, // tenantId é UUID, não ObjectId
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
      ministry: new Types.ObjectId(ministryId),
      role: MembershipRole.Volunteer, // Força role de voluntário
      isActive: createMembershipDto.isActive ?? true,
    });

    const savedMembership = await membership.save();



    console.log('✅ Voluntário adicionado com sucesso');
    return {
      id: savedMembership._id,
      userId: createMembershipDto.userId,
      ministryId,
      role: savedMembership.role,
      isActive: savedMembership.isActive,
      message: 'Voluntário adicionado ao ministério com sucesso',
    };
  }

  /**
   * Adiciona um líder ao ministério
   * Permissões: BranchAdmin, TenantAdmin, ServusAdmin
   */
  async addLeaderToMinistry(
    tenantId: string,
    ministryId: string,
    createMembershipDto: CreateMembershipDto,
    currentUserId: string,
  ) {
    console.log('🔗 Adicionando líder ao ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - User ID:', createMembershipDto.userId);
    console.log('   - Current User ID:', currentUserId);

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar se o usuário existe
    const user = await this.validateUser(createMembershipDto.userId);

    // Verificar permissões do usuário atual (apenas Admin podem adicionar líderes)
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'add_leader');

    // Verificar se já existe membership para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: tenantId, // tenantId é UUID, não ObjectId
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já está vinculado a este ministério');
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: tenantId, // tenantId é UUID, não ObjectId
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
      ministry: new Types.ObjectId(ministryId),
      role: MembershipRole.Leader, // Força role de líder
      isActive: createMembershipDto.isActive ?? true,
    });

    const savedMembership = await membership.save();



    console.log('✅ Líder adicionado com sucesso');
    return {
      id: savedMembership._id,
      userId: createMembershipDto.userId,
      ministryId,
      role: savedMembership.role,
      isActive: savedMembership.isActive,
      message: 'Líder adicionado ao ministério com sucesso',
    };
  }

  // ========================================
  // 🔍 CONSULTAR MEMBROS
  // ========================================

  /**
   * Lista todos os membros de um ministério
   */
  async getMinistryMembers(
    tenantId: string,
    ministryId: string,
    options: {
      page: number;
      limit: number;
      role?: string;
      search?: string;
      branchId?: string;
    },
    currentUser: any,
  ) {
    console.log('📋 Listando membros do ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Options:', options);

    // Debug: Log dos IDs recebidos
    console.log('🔍 Debug - IDs recebidos:');
    console.log('   - ministryId:', ministryId, '(tipo:', typeof ministryId, ', length:', ministryId?.length, ')');
    console.log('   - tenantId:', tenantId, '(tipo:', typeof tenantId, ', length:', tenantId?.length, ')');
    console.log('   - branchId:', options.branchId, '(tipo:', typeof options.branchId, ', length:', options.branchId?.length, ')');

    // Validar se ministryId é um ObjectId válido ANTES de qualquer operação
    if (!Types.ObjectId.isValid(ministryId)) {
      console.error('❌ ID do ministério inválido:', ministryId);
      throw new BadRequestException(`ID do ministério inválido: ${ministryId}`);
    }

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(currentUser.sub, tenantId, ministryId, 'view_members');

    // Construir filtros
    console.log('🔧 Criando filtros...');
    console.log('   - tenantId é UUID (36 chars), não ObjectId (24 chars)');
    console.log('   - Criando ObjectId para ministryId:', ministryId);
    const ministryObjectId = new Types.ObjectId(ministryId);
    console.log('   - Ministry ObjectId criado:', ministryObjectId);
    
    const filters: any = {
      tenant: tenantId, // tenantId é UUID, não ObjectId
      ministry: ministryObjectId,
      isActive: true,
    };

    // Filtrar por branch se especificado
    if (options.branchId) {
      console.log('   - branchId recebido:', options.branchId, '(length:', options.branchId.length, ')');
      
      // Verificar se é ObjectId (24 chars) ou UUID (36 chars)
      if (Types.ObjectId.isValid(options.branchId)) {
        console.log('   - branchId é ObjectId válido');
        filters.branch = new Types.ObjectId(options.branchId);
      } else if (options.branchId.length === 36) {
        console.log('   - branchId é UUID, usando como string');
        filters.branch = options.branchId;
      } else {
        throw new BadRequestException('ID da filial inválido: deve ser ObjectId (24 chars) ou UUID (36 chars)');
      }
    } else {
      filters.branch = null; // Apenas membros da matriz
    }

    // Filtrar por role se especificado
    if (options.role) {
      filters.role = options.role;
    }

    // Buscar membros via membership
    const query = this.membershipModel.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          user: {
            _id: '$userData._id',
            name: '$userData.name',
            email: '$userData.email',
            phone: '$userData.phone',
            picture: '$userData.picture',
          },
          branch: '$branchData',
          role: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Aplicar busca por texto se especificado
    if (options.search) {
      query.match({
        $or: [
          { 'user.name': { $regex: options.search, $options: 'i' } },
          { 'user.email': { $regex: options.search, $options: 'i' } },
        ],
      });
    }

    // Contar total para paginação
    const totalQuery = this.membershipModel.aggregate([
      { $match: filters },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    const members = await query.skip(skip).limit(options.limit).exec();

    console.log('✅ Membros listados com sucesso');
    console.log('   - Members count:', members.length);
    console.log('   - Members type:', typeof members);
    console.log('   - Is array:', Array.isArray(members));
    
    return {
      members,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  // ========================================
  // 🗑️ REMOVER MEMBROS
  // ========================================

  /**
   * Remove um membro do ministério
   * Permissões: Leader pode remover voluntários, Admin pode remover todos
   */
  async removeMinistryMember(
    tenantId: string,
    ministryId: string,
    membershipId: string,
    currentUserId: string,
    branchId?: string,
  ) {
    console.log('🗑️ Removendo membro do ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Membership ID:', membershipId);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Branch ID:', branchId);

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Buscar o membership
    const membership = await this.membershipModel.findById(membershipId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    // Verificar se o membership pertence ao ministério correto
    if (!membership.ministry || membership.ministry.toString() !== ministryId) {
      throw new BadRequestException('Vínculo não pertence a este ministério');
    }

    // Verificar se o membership pertence ao tenant correto
    if (!membership.tenant || membership.tenant.toString() !== tenantId) {
      throw new BadRequestException('Vínculo não pertence a este tenant');
    }

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'remove_member', membership);

    // Remover o membership
    await this.membershipModel.findByIdAndDelete(membershipId);

    console.log('✅ Membro removido com sucesso');
    return {
      message: 'Membro removido do ministério com sucesso',
    };
  }

  // ========================================
  // 🔄 ATUALIZAR MEMBROS
  // ========================================

  /**
   * Atualiza a role de um membro
   * Permissões: Apenas Admin
   */
  async updateMemberRole(
    tenantId: string,
    ministryId: string,
    membershipId: string,
    updateMembershipDto: UpdateMembershipDto,
    currentUserId: string,
    branchId?: string,
  ) {
    console.log('✏️ Atualizando role do membro...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Membership ID:', membershipId);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Branch ID:', branchId);
    console.log('   - Update Data:', updateMembershipDto);

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Buscar o membership
    const membership = await this.membershipModel.findById(membershipId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    // Verificar se o membership pertence ao ministério correto
    if (!membership.ministry || membership.ministry.toString() !== ministryId) {
      throw new BadRequestException('Vínculo não pertence a este ministério');
    }

    // Verificar se o membership pertence ao tenant correto
    if (!membership.tenant || membership.tenant.toString() !== tenantId) {
      throw new BadRequestException('Vínculo não pertence a este tenant');
    }

    // Verificar permissões do usuário atual (apenas Admin podem alterar roles)
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'update_role');

    // Atualizar o membership
    const updatedMembership = await this.membershipModel.findByIdAndUpdate(
      membershipId,
      {
        $set: {
          ...(updateMembershipDto.role && { role: updateMembershipDto.role }),
          ...(updateMembershipDto.isActive !== undefined && { isActive: updateMembershipDto.isActive }),
        },
      },
      { new: true },
    );

    if (!updatedMembership) {
      throw new NotFoundException('Erro ao atualizar membership');
    }

    console.log('✅ Role atualizada com sucesso');
    return {
      id: updatedMembership._id,
      role: updatedMembership.role,
      isActive: updatedMembership.isActive,
      message: 'Role do membro atualizada com sucesso',
    };
  }

  // ========================================
  // 🔧 MÉTODOS AUXILIARES
  // ========================================

  /**
   * Valida se o ministério existe e pertence ao tenant
   */
  private async validateMinistry(tenantId: string, ministryId: string) {
    // TODO: Implementar validação do ministério
    // Por enquanto, retorna true
    return true;
  }

  /**
   * Valida se o usuário existe
   */
  private async validateUser(userId: string) {
    // TODO: Implementar validação do usuário
    // Por enquanto, retorna true
    return true;
  }

  /**
   * Valida as permissões do usuário atual
   */
  private async validateUserPermissions(
    currentUserId: string,
    tenantId: string,
    ministryId: string,
    action: 'add_volunteer' | 'add_leader' | 'view_members' | 'remove_member' | 'update_role',
    targetMembership?: any,
  ) {
    // TODO: Implementar validação de permissões baseada no sistema atual
    // Por enquanto, permite todas as ações
    console.log('🔐 Validando permissões...');
    console.log('   - Action:', action);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Target Membership:', targetMembership);
    
    return true;
  }
}
