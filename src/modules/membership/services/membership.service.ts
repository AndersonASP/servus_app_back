import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership } from '../schemas/membership.schema';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UpdateMembershipDto } from '../dto/update-membership.dto';
import { MembershipRole, Role } from 'src/common/enums/role.enum';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { User } from '../../users/schema/user.schema';
import { MemberFunctionService } from '../../functions/services/member-function.service';
import { FunctionsService } from '../../functions/services/functions.service';
import {
  MemberFunctionStatus,
  MemberFunctionLevel,
} from '../../functions/schemas/member-function.schema';
import { MembershipIntegrityService } from './membership-integrity.service';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(Ministry.name) private ministryModel: Model<Ministry>,
    @InjectModel(User.name) private userModel: Model<User>,
    private memberFunctionService: MemberFunctionService,
    private functionsService: FunctionsService,
    private integrityService: MembershipIntegrityService,
  ) {}

  // ========================================
  // 🔗 ADICIONAR MEMBROS A MINISTÉRIOS
  // ========================================

  /**
   * Adiciona um voluntário ao ministério
   * Permissões: Leader, BranchAdmin, TenantAdmin, ServusAdmin
   */
  async addVolunteerToMinistry(
    tenantId: string, // ObjectId como string // ObjectId como string
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
    await this.validateUserPermissions(
      currentUserId,
      tenantId,
      ministryId,
      'add_volunteer',
    );

    // Validar se o role é válido para líderes
    await this.validateRoleForLeader(
      currentUserId,
      tenantId,
      createMembershipDto.role,
    );

    // Verificar se já existe membership ATIVO para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId
        ? new Types.ObjectId(createMembershipDto.branchId)
        : null,
      isActive: true, // ← Só considera memberships ativos
    });

    if (existingMembership) {
      throw new BadRequestException(
        'Usuário já está vinculado a este ministério',
      );
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      branch: createMembershipDto.branchId
        ? new Types.ObjectId(createMembershipDto.branchId)
        : null,
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
    tenantId: string, // ObjectId como string
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
    await this.validateUserPermissions(
      currentUserId,
      tenantId,
      ministryId,
      'add_leader',
    );

    // Verificar se já existe membership ATIVO para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId
        ? new Types.ObjectId(createMembershipDto.branchId)
        : null,
      isActive: true, // ← Só considera memberships ativos
    });

    if (existingMembership) {
      throw new BadRequestException(
        'Usuário já está vinculado a este ministério',
      );
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      branch: createMembershipDto.branchId
        ? new Types.ObjectId(createMembershipDto.branchId)
        : null,
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
    tenantId: string, // ObjectId como string
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
    console.log(
      '   - ministryId:',
      ministryId,
      '(tipo:',
      typeof ministryId,
      ', length:',
      ministryId?.length,
      ')',
    );
    console.log(
      '   - tenantId:',
      tenantId,
      '(tipo:',
      typeof tenantId,
      ', length:',
      tenantId?.length,
      ')',
    );
    console.log(
      '   - branchId:',
      options.branchId,
      '(tipo:',
      typeof options.branchId,
      ', length:',
      options.branchId?.length,
      ')',
    );

    // Validar se ministryId é um ObjectId válido ANTES de qualquer operação
    // Aceita tanto ObjectId (24 chars) quanto UUID (36 chars)
    if (!Types.ObjectId.isValid(ministryId) && ministryId.length !== 36) {
      console.error('❌ ID do ministério inválido:', ministryId);
      throw new BadRequestException(`ID do ministério inválido: ${ministryId}`);
    }

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(
      currentUser.sub,
      tenantId,
      ministryId,
      'view_members',
    );

    // Construir filtros
    console.log('🔧 Criando filtros...');
    console.log('   - tenantId é UUID string');
    console.log(
      '   - ministryId:',
      ministryId,
      '(length:',
      ministryId.length,
      ')',
    );

    const filters: any = {
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: Types.ObjectId.isValid(ministryId)
        ? new Types.ObjectId(ministryId)
        : ministryId,
      isActive: true,
    };

    console.log('   - Filtros criados:', JSON.stringify(filters, null, 2));

    // Filtrar por branch se especificado
    if (options.branchId) {
      console.log(
        '   - branchId recebido:',
        options.branchId,
        '(length:',
        options.branchId.length,
        ')',
      );

      // Verificar se é ObjectId (24 chars) ou UUID (36 chars)
      if (Types.ObjectId.isValid(options.branchId)) {
        console.log('   - branchId é ObjectId válido');
        filters.branch = new Types.ObjectId(options.branchId);
      } else if (options.branchId.length === 36) {
        console.log('   - branchId é UUID, usando como string');
        filters.branch = options.branchId;
      } else {
        throw new BadRequestException(
          'ID da filial inválido: deve ser ObjectId (24 chars) ou UUID (36 chars)',
        );
      }
    }
    // Se não há branchId, não adiciona filtro de branch - permite tanto matriz quanto filiais

    // Filtrar por role se especificado
    if (options.role) {
      filters.role = options.role;
    }

    // Buscar membros via membership
    console.log('🔍 Executando query de agregação...');
    console.log('   - Filtros:', JSON.stringify(filters, null, 2));

    // Teste: verificar se há membros no banco
    const totalMemberships = await this.membershipModel.countDocuments();
    console.log('   - Total de memberships no banco:', totalMemberships);

    const membershipsWithMinistry = await this.membershipModel.countDocuments({
      ministry: Types.ObjectId.isValid(ministryId)
        ? new Types.ObjectId(ministryId)
        : ministryId,
    });
    console.log(
      '   - Memberships com este ministério:',
      membershipsWithMinistry,
    );

    // Primeiro, vamos testar uma query simples
    console.log('🔍 Testando query simples...');
    const simpleQuery = await this.membershipModel
      .find(filters)
      .limit(5)
      .exec();
    console.log(
      '   - Query simples retornou:',
      simpleQuery.length,
      'documentos',
    );

    if (simpleQuery.length > 0) {
      console.log(
        '   - Primeiro documento:',
        JSON.stringify(simpleQuery[0], null, 2),
      );
    }

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
    console.log('🔍 Executando query de contagem...');
    const totalQuery = this.membershipModel.aggregate([
      { $match: filters },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;
    console.log('   - Total encontrado:', total);

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    console.log('🔍 Aplicando paginação...');
    console.log('   - Skip:', skip);
    console.log('   - Limit:', options.limit);

    const members = await query.skip(skip).limit(options.limit).exec();

    console.log('✅ Membros listados com sucesso');
    console.log('   - Members count:', members.length);
    console.log('   - Members type:', typeof members);
    console.log('   - Is array:', Array.isArray(members));

    if (members.length > 0) {
      console.log('   - Primeiro membro:', JSON.stringify(members[0], null, 2));
    }

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
   * Remove um membro do ministério com validações de integridade
   * Permissões: Leader pode remover voluntários, Admin pode remover todos
   */
  async removeMinistryMember(
    tenantId: string, // ObjectId como string
    ministryId: string,
    membershipId: string,
    currentUserId: string,
    branchId?: string,
  ) {
    console.log(
      '🗑️ [MembershipService] Removendo membro do ministério com validações de integridade...',
    );
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Membership ID:', membershipId);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Branch ID:', branchId);
    console.log(
      '🚨 [MembershipService] MÉTODO: removeMinistryMember - EXCLUSÃO PERMANENTE',
    );

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
    await this.validateUserPermissions(
      currentUserId,
      tenantId,
      ministryId,
      'remove_member',
      membership,
    );

    const userId = membership.user.toString();

    // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verificar se remoção não deixará usuário órfão
    const integrityCheck =
      await this.integrityService.validateMembershipRemoval(
        userId,
        membershipId,
        tenantId,
      );

    if (!integrityCheck.valid) {
      throw new BadRequestException(integrityCheck.reason);
    }

    console.log('✅ [MembershipService] Validação de integridade aprovada');
    console.log(
      `📊 [MembershipService] Memberships restantes: ${integrityCheck.remainingMemberships}`,
    );

    // 🗑️ REMOÇÃO EM CASCATA: Remover todas as funções do usuário neste ministério
    console.log(
      '🗑️ [MembershipService] Removendo funções do usuário no ministério...',
    );
    const deletedFunctionsCount =
      await this.integrityService.removeMemberFunctionsFromMinistry(
        userId,
        ministryId,
        tenantId,
        branchId,
      );
    console.log(
      `✅ [MembershipService] ${deletedFunctionsCount} funções removidas do usuário no ministério`,
    );

    // 🗑️ EXCLUIR definitivamente o membership
    await this.membershipModel.findByIdAndDelete(membershipId);
    console.log(
      '✅ [MembershipService] Membro desvinculado com sucesso (membership excluído)',
    );

    // 🔧 GARANTIR MEMBERSHIP PADRÃO: Criar membership padrão SEM ministério específico
    await this.integrityService.ensureDefaultMembership(
      userId,
      tenantId,
      currentUserId,
    );

    return {
      message: 'Membro desvinculado do ministério com sucesso',
      deletedFunctionsCount,
      remainingMemberships: integrityCheck.remainingMemberships,
    };
  }

  /**
   * Desvincula um membro de um ministério (exclui membership permanentemente)
   * Remove TUDO relacionado ao vínculo: MemberFunctions + Memberships
   */
  async unlinkMemberFromMinistry(
    tenantId: string,
    ministryId: string,
    userId: string,
    currentUserId: string,
    branchId?: string,
  ) {
    console.log('🔗 [MembershipService] Desvinculando membro do ministério...');
    console.log('   - Tenant ID:', tenantId, '(tipo:', typeof tenantId, ')');
    console.log(
      '   - Ministry ID:',
      ministryId,
      '(tipo:',
      typeof ministryId,
      ')',
    );
    console.log('   - User ID:', userId, '(tipo:', typeof userId, ')');
    console.log(
      '   - Current User ID:',
      currentUserId,
      '(tipo:',
      typeof currentUserId,
      ')',
    );
    console.log('   - Branch ID:', branchId, '(tipo:', typeof branchId, ')');
    console.log(
      '🚨 [MembershipService] MÉTODO: unlinkMemberFromMinistry - EXCLUSÃO PERMANENTE',
    );

    // Verificar se os IDs são válidos
    try {
      new Types.ObjectId(tenantId);
      console.log('✅ Tenant ID é válido');
    } catch (e) {
      console.log('❌ Tenant ID inválido:', e.message);
    }

    try {
      new Types.ObjectId(ministryId);
      console.log('✅ Ministry ID é válido');
    } catch (e) {
      console.log('❌ Ministry ID inválido:', e.message);
    }

    try {
      new Types.ObjectId(userId);
      console.log('✅ User ID é válido');
    } catch (e) {
      console.log('❌ User ID inválido:', e.message);
    }

    try {
      new Types.ObjectId(currentUserId);
      console.log('✅ Current User ID é válido');
    } catch (e) {
      console.log('❌ Current User ID inválido:', e.message);
    }

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar permissões do usuário atual
    console.log(
      '🔐 [MembershipService] Validando permissões do usuário atual...',
    );
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Action: remove_member');

    // Buscar o membership do usuário que será removido para validação
    const targetMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      ministry: new Types.ObjectId(ministryId),
      isActive: true,
    });

    console.log(
      '🔍 [MembershipService] Target membership encontrado:',
      targetMembership ? 'SIM' : 'NÃO',
    );
    if (targetMembership) {
      console.log('   - Target Role:', targetMembership.role);
      console.log('   - Target User ID:', targetMembership.user);
    }

    await this.validateUserPermissions(
      currentUserId,
      tenantId,
      ministryId,
      'remove_member',
      targetMembership,
    );
    console.log('✅ [MembershipService] Permissões validadas com sucesso');

    // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verificar se desvinculação não deixará usuário órfão
    const integrityCheck = await this.integrityService.validateMinistryRemoval(
      userId,
      ministryId,
      tenantId,
    );

    if (!integrityCheck.valid) {
      throw new BadRequestException(integrityCheck.reason);
    }

    console.log('✅ [MembershipService] Validação de integridade aprovada');
    console.log(
      `📊 [MembershipService] Memberships afetados: ${integrityCheck.affectedMemberships}`,
    );

    // 🗑️ REMOÇÃO EM CASCATA: Remover todas as funções do usuário neste ministério
    console.log(
      '🗑️ [MembershipService] Removendo funções do usuário no ministério...',
    );
    const deletedFunctionsCount =
      await this.integrityService.removeMemberFunctionsFromMinistry(
        userId,
        ministryId,
        tenantId,
        branchId,
      );
    console.log(
      `✅ [MembershipService] ${deletedFunctionsCount} funções removidas do usuário no ministério`,
    );

    // 🗑️ EXCLUIR memberships do usuário neste ministério (exclusão permanente)
    const query: any = {
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      ministry: new Types.ObjectId(ministryId),
    };

    if (branchId) {
      query.branch = new Types.ObjectId(branchId);
    } else {
      query.branch = null; // Matriz
    }

    console.log(
      '🗑️ [MembershipService] Query de exclusão:',
      JSON.stringify(query, null, 2),
    );

    const result = await this.membershipModel.deleteMany(query);

    console.log(
      `✅ [MembershipService] ${result.deletedCount} memberships excluídos permanentemente`,
    );
    console.log('🔍 [MembershipService] Resultado da exclusão:', {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged,
    });

    // 🔧 GARANTIR MEMBERSHIP PADRÃO: Criar membership padrão SEM ministério específico
    await this.integrityService.ensureDefaultMembership(
      userId,
      tenantId,
      currentUserId,
    );

    return {
      message:
        'Membro desvinculado do ministério com sucesso - vínculo excluído permanentemente',
      deletedFunctionsCount,
      deletedMemberships: result.deletedCount,
      affectedMemberships: integrityCheck.affectedMemberships,
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
    tenantId: string, // ObjectId como string
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
    await this.validateUserPermissions(
      currentUserId,
      tenantId,
      ministryId,
      'update_role',
    );

    // Atualizar o membership
    const updatedMembership = await this.membershipModel.findByIdAndUpdate(
      membershipId,
      {
        $set: {
          ...(updateMembershipDto.role && { role: updateMembershipDto.role }),
          ...(updateMembershipDto.isActive !== undefined && {
            isActive: updateMembershipDto.isActive,
          }),
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
    // tenantId é ObjectId como string
    console.log('🔍 Validando ministério...');
    console.log('   - tenantId:', tenantId);
    console.log('   - ministryId:', ministryId);

    try {
      const ministry = await this.ministryModel.findOne({
        _id: Types.ObjectId.isValid(ministryId)
          ? new Types.ObjectId(ministryId)
          : ministryId,
        tenantId: new Types.ObjectId(tenantId), // ObjectId do tenant
      });

      if (!ministry) {
        console.log('❌ Ministério não encontrado');
        throw new BadRequestException(
          'Ministério não encontrado ou não pertence ao tenant',
        );
      }

      console.log('✅ Ministério validado:', ministry.name);
      return ministry;
    } catch (error) {
      console.log('❌ Erro ao validar ministério:', error);
      throw error;
    }
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
    tenantId: string, // ObjectId como string
    ministryId: string,
    action:
      | 'add_volunteer'
      | 'add_leader'
      | 'view_members'
      | 'remove_member'
      | 'update_role',
    targetMembership?: any,
  ) {
    console.log('🔐 Validando permissões...');
    console.log('   - Action:', action);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Target Membership:', targetMembership);

    // Primeiro, buscar o membership do usuário atual em qualquer ministério do tenant
    console.log(
      '🔍 [MembershipService] Buscando membership do usuário atual...',
    );
    console.log(
      '   - Query: { user: ObjectId(' +
        currentUserId +
        '), tenant: ObjectId(' +
        tenantId +
        '), isActive: true }',
    );

    const anyMembership = await this.membershipModel
      .findOne({
        user: new Types.ObjectId(currentUserId),
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .populate('ministry', 'name');

    console.log('🔍 [MembershipService] Resultado da busca:');
    console.log('   - Membership encontrado:', anyMembership ? 'SIM' : 'NÃO');

    if (!anyMembership) {
      console.log(
        '❌ [MembershipService] Nenhum membership encontrado - verificando todos os memberships do usuário...',
      );

      // Debug: buscar TODOS os memberships do usuário (ativos e inativos)
      const allMemberships = await this.membershipModel
        .find({
          user: new Types.ObjectId(currentUserId),
        })
        .populate('ministry', 'name')
        .populate('tenant', 'name');

      console.log('🔍 [MembershipService] Todos os memberships do usuário:');
      allMemberships.forEach((membership, index) => {
        console.log(
          `   ${index + 1}. Tenant: ${(membership.tenant as any)?.name || membership.tenant}, Ministry: ${(membership.ministry as any)?.name || membership.ministry}, Role: ${membership.role}, Active: ${membership.isActive}`,
        );
      });

      throw new ForbiddenException(
        'Usuário não possui membership ativo neste tenant',
      );
    }

    console.log('🔍 [MembershipService] Membership encontrado:');
    console.log('   - Role:', anyMembership.role);
    console.log('   - Ministry ID:', anyMembership.ministry?._id?.toString());
    console.log('   - Target Ministry ID:', ministryId);

    // Se é admin, pode gerenciar qualquer ministério
    if (
      anyMembership.role === MembershipRole.TenantAdmin ||
      anyMembership.role === MembershipRole.BranchAdmin
    ) {
      console.log(
        '✅ [MembershipService] Usuário é admin do tenant - permissão concedida',
      );
      return true;
    }

    // Se é líder, só pode gerenciar o seu próprio ministério
    if (anyMembership.role === MembershipRole.Leader) {
      const currentMinistryId = anyMembership.ministry?._id?.toString();

      if (currentMinistryId !== ministryId) {
        console.log(
          '❌ [MembershipService] Líder não pode gerenciar outros ministérios',
        );
        throw new ForbiddenException(
          'Líder só pode gerenciar membros do seu próprio ministério',
        );
      }

      console.log(
        '✅ [MembershipService] Líder pode gerenciar seu próprio ministério',
      );
      // Usar o membership encontrado como currentUserMembership
      const currentUserMembership = anyMembership;

      console.log('   - Current User Role:', currentUserMembership.role);
      console.log(
        '   - Current User Ministry:',
        currentUserMembership.ministry,
      );

      // Validar permissões específicas do líder
      console.log('🔐 Usuário é líder - validando permissões específicas...');
      return await this.validateLeaderPermissions(
        currentUserMembership,
        ministryId,
        action,
        targetMembership,
      );
    }

    // Se chegou até aqui, é voluntário ou outro role sem permissão
    console.log(
      '❌ [MembershipService] Usuário não possui permissão para esta ação',
    );
    throw new ForbiddenException(
      'Usuário não possui permissão para gerenciar este ministério',
    );
  }

  /**
   * Valida se o role é permitido para líderes
   */
  private async validateRoleForLeader(
    currentUserId: string,
    tenantId: string,
    targetRole: MembershipRole,
  ) {
    // Buscar o membership do usuário atual
    const currentUserMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(currentUserId),
      tenant: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!currentUserMembership) {
      throw new ForbiddenException(
        'Usuário não possui membership ativo neste tenant',
      );
    }

    // Se não é líder, permitir qualquer role
    if (currentUserMembership.role !== MembershipRole.Leader) {
      console.log('✅ Usuário não é líder, permitindo qualquer role');
      return true;
    }

    // Líder só pode cadastrar voluntários
    if (targetRole !== MembershipRole.Volunteer) {
      throw new ForbiddenException(
        'Líder só pode cadastrar voluntários. Não é permitido cadastrar tenant_admin, branch_admin ou outros líderes',
      );
    }

    console.log('✅ Líder pode cadastrar voluntário');
    return true;
  }

  /**
   * Valida permissões específicas para líderes
   */
  private async validateLeaderPermissions(
    currentUserMembership: any,
    ministryId: string,
    action:
      | 'add_volunteer'
      | 'add_leader'
      | 'view_members'
      | 'remove_member'
      | 'update_role',
    targetMembership?: any,
  ) {
    const currentMinistryId = currentUserMembership.ministry?._id?.toString();

    console.log('🔐 Validando permissões de líder...');
    console.log('   - Current Ministry ID:', currentMinistryId);
    console.log('   - Target Ministry ID:', ministryId);

    // Líder só pode acessar seu próprio ministério
    if (currentMinistryId !== ministryId) {
      throw new ForbiddenException(
        'Líder só pode acessar membros do seu próprio ministério',
      );
    }

    switch (action) {
      case 'view_members':
        // Líder pode ver membros do seu ministério (incluindo ele mesmo)
        console.log('✅ Líder pode visualizar membros do seu ministério');
        return true;

      case 'add_volunteer':
        // Líder pode adicionar apenas voluntários ao seu ministério
        console.log('✅ Líder pode adicionar voluntários ao seu ministério');
        return true;

      case 'add_leader':
        // Líder NÃO pode adicionar outros líderes
        throw new ForbiddenException('Líder não pode adicionar outros líderes');

      case 'remove_member':
        // Líder pode remover membros do seu ministério (exceto ele mesmo se for o único líder)
        console.log(
          '🔍 [MembershipService] Validando remoção de membro por líder...',
        );

        if (targetMembership) {
          const targetUserId = targetMembership.user.toString();
          const currentUserId = currentUserMembership.user.toString();
          const targetRole = targetMembership.role;

          console.log('   - Target User ID:', targetUserId);
          console.log('   - Current User ID:', currentUserId);
          console.log('   - Target Role:', targetRole);

          // Se está tentando remover a si mesmo
          if (targetUserId === currentUserId) {
            console.log(
              '⚠️ [MembershipService] Tentativa de remover a si mesmo',
            );
            // Verificar se é o único líder do ministério
            const leaderCount = await this.membershipModel.countDocuments({
              ministry: new Types.ObjectId(ministryId),
              role: MembershipRole.Leader,
              isActive: true,
            });

            console.log('   - Leader Count:', leaderCount);

            if (leaderCount <= 1) {
              throw new ForbiddenException(
                'Não é possível remover o único líder do ministério',
              );
            }
          } else if (targetRole === MembershipRole.Leader) {
            // Líder tentando remover outro líder
            console.log(
              '⚠️ [MembershipService] Tentativa de remover outro líder',
            );
            const leaderCount = await this.membershipModel.countDocuments({
              ministry: new Types.ObjectId(ministryId),
              role: MembershipRole.Leader,
              isActive: true,
            });

            if (leaderCount <= 1) {
              throw new ForbiddenException(
                'Não é possível remover o único líder do ministério',
              );
            }
          } else {
            // Removendo voluntário - permitido
            console.log(
              '✅ [MembershipService] Removendo voluntário - permitido',
            );
          }
        }

        console.log(
          '✅ [MembershipService] Líder pode remover membros do seu ministério',
        );
        return true;

      case 'update_role':
        // Líder NÃO pode alterar roles
        throw new ForbiddenException('Líder não pode alterar roles de membros');

      default:
        throw new ForbiddenException('Ação não permitida para líder');
    }
  }

  // ========================================
  // 🔗 MÉTODOS DE MINISTRY-MEMBERSHIP (MIGRADOS)
  // ========================================

  /**
   * Vincular usuário a um ministério (método unificado)
   */
  async addUserToMinistry(
    userId: string,
    ministryId: string,
    role: MembershipRole,
    createdBy?: string,
    createdByRole?: string,
  ) {
    console.log('🔗 [MembershipService] addUserToMinistry iniciado');
    console.log('📋 [MembershipService] Parâmetros recebidos:', {
      userId,
      ministryId,
      role,
      createdBy,
      createdByRole,
      userIdType: typeof userId,
      ministryIdType: typeof ministryId,
      roleType: typeof role,
    });

    try {
      // Buscar tenant do ministério
      console.log('🔍 [MembershipService] Buscando ministério...');
      const ministry = await this.ministryModel
        .findById(ministryId)
        .select('tenantId');

      console.log('📊 [MembershipService] Ministério encontrado:', {
        ministryExists: !!ministry,
        ministryId: ministry?._id,
        tenantId: ministry?.tenantId,
        tenantIdType: typeof ministry?.tenantId,
      });

      if (!ministry || !ministry.tenantId) {
        console.log(
          '❌ [MembershipService] Ministério não encontrado ou sem tenant',
        );
        throw new BadRequestException(
          'Ministério não encontrado ou sem tenant',
        );
      }

      const tenantId = ministry.tenantId;
      console.log('✅ [MembershipService] TenantId obtido:', {
        tenantId,
        tenantIdType: typeof tenantId,
        tenantIdString: tenantId.toString(),
      });

      // ✅ CORREÇÃO: Validar se o usuário está ativo antes de criar vínculo
      console.log('🔍 [MembershipService] Verificando status do usuário...');
      const user = await this.userModel.findById(userId).select('isActive');

      console.log('📊 [MembershipService] Usuário encontrado:', {
        userId,
        userExists: !!user,
        isActive: user?.isActive,
        userActiveType: typeof user?.isActive,
      });

      if (!user) {
        console.log('❌ [MembershipService] Usuário não encontrado');
        throw new BadRequestException('Usuário não encontrado');
      }

      if (user.isActive !== true) {
        console.log(
          '❌ [MembershipService] Usuário está inativo - bloqueando vinculação',
        );
        throw new BadRequestException(
          'Não é possível vincular usuário inativo a um ministério',
        );
      }

      console.log(
        '✅ [MembershipService] Usuário está ativo - prosseguindo com vinculação',
      );

      // Verificar se já existe vínculo ativo com este ministério específico
      console.log(
        '🔍 [MembershipService] Verificando vínculos existentes com este ministério...',
      );
      const existingMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        ministry: new Types.ObjectId(ministryId),
        isActive: true,
      });

      console.log('📊 [MembershipService] Vínculo ativo encontrado:', {
        exists: !!existingMembership,
        membershipId: existingMembership?._id,
        ministryId: existingMembership?.ministry,
      });

      if (existingMembership) {
        console.log(
          '❌ [MembershipService] Usuário já está vinculado a este ministério específico',
        );
        throw new BadRequestException(
          'Usuário já está vinculado a este ministério',
        );
      }

      // Verificar se usuário tem outros vínculos ativos (para informação)
      const otherActiveMemberships = await this.membershipModel.find({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
        ministry: { $ne: new Types.ObjectId(ministryId) },
      });

      console.log('📊 [MembershipService] Outros vínculos ativos do usuário:', {
        count: otherActiveMemberships.length,
        ministries: otherActiveMemberships.map((m) => m.ministry),
      });

      // Como usamos exclusão permanente, não há vínculos inativos para reativar
      // Sempre criar novo vínculo
      console.log(
        '🆕 [MembershipService] Criando novo vínculo (exclusão permanente ativa)...',
      );
      const membership = new this.membershipModel({
        user: new Types.ObjectId(userId),
        tenant: ministry.tenantId,
        ministry: new Types.ObjectId(ministryId),
        role:
          role === 'leader' ? MembershipRole.Leader : MembershipRole.Volunteer,
        isActive: true,
      });

      console.log('💾 [MembershipService] Salvando novo membership...');
      const savedMembership = await membership.save();
      console.log(
        '✅ [MembershipService] Vínculo criado:',
        savedMembership._id,
      );

      // Criar MemberFunctions para o usuário no ministério
      console.log(
        '🔧 [MembershipService] Criando MemberFunctions para novo vínculo...',
      );
      await this._createMemberFunctionsForMinistry(
        userId,
        ministryId,
        role,
        tenantId,
        createdBy,
        createdByRole,
      );

      console.log(
        '✅ [MembershipService] addUserToMinistry concluído (novo vínculo)',
      );
      return savedMembership;
    } catch (error) {
      console.error('❌ [MembershipService] Erro em addUserToMinistry:', error);
      console.error('❌ [MembershipService] Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Listar membros de um ministério (versão simplificada para ministry-memberships)
   */
  async getMinistryMembersSimple(
    ministryId: string,
    options: {
      role?: MembershipRole;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {},
    currentUser?: any,
    tenantId?: string,
  ) {
    console.log('👥 Listando membros do ministério (versão simplificada)...');
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Options:', options);
    console.log('   - Current User:', currentUser?.sub || currentUser?._id);
    console.log('   - Tenant ID:', tenantId);

    // Se temos informações do usuário atual, validar permissões
    if (currentUser && tenantId) {
      try {
        await this.validateUserPermissions(
          currentUser.sub || currentUser._id,
          tenantId,
          ministryId,
          'view_members',
        );
        console.log('✅ Permissões validadas para listar membros');
      } catch (error) {
        console.error('❌ Erro na validação de permissões:', error.message);
        throw error;
      }
    }

    const query: any = {
      ministry: new Types.ObjectId(ministryId),
    };

    if (!options.includeInactive) {
      query.isActive = true;
    }

    if (options.role) {
      query.role = options.role;
    }

    console.log('🔍 Query final:', JSON.stringify(query, null, 2));
    console.log('🔍 MinistryId recebido:', ministryId);
    console.log('🔍 MinistryId tipo:', typeof ministryId);

    // DEBUG: Verificar todos os memberships do tenant para debug
    const allMemberships = await this.membershipModel
      .find({ tenant: new Types.ObjectId(tenantId) })
      .populate('user', 'name email')
      .populate('ministry', 'name')
      .lean();

    console.log('🔍 DEBUG - Todos os memberships do tenant:');
    allMemberships.forEach((membership, index) => {
      // Corrigir conversão do MinistryId
      let membershipMinistryId: string;
      if (membership.ministry && typeof membership.ministry === 'object') {
        // Se é um ObjectId, usar toString()
        membershipMinistryId =
          (membership.ministry as any)._id?.toString() ||
          (membership.ministry as any).toString();
      } else {
        // Se já é string, usar diretamente
        membershipMinistryId = (membership.ministry as any)?.toString() || '';
      }

      const matchesTarget = membershipMinistryId === ministryId;
      console.log(
        `   ${index + 1}. User: ${(membership.user as any)?.name || 'N/A'}`,
      );
      console.log(
        `       - Ministry: ${(membership.ministry as any)?.name || 'N/A'}`,
      );
      console.log(
        `       - MinistryId: ${membershipMinistryId} (tipo: ${typeof membershipMinistryId})`,
      );
      console.log(
        `       - Target: ${ministryId} (tipo: ${typeof ministryId})`,
      );
      console.log(`       - Match: ${matchesTarget}`);
      console.log(`       - Active: ${membership.isActive}`);
      console.log(`       ---`);
    });

    const memberships = await this.membershipModel
      .find(query)
      .populate('user', 'name email picture phone')
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.offset || 0);

    console.log(`✅ Encontrados ${memberships.length} membros`);
    console.log('📋 Membros encontrados:');
    memberships.forEach((membership, index) => {
      console.log(
        `   ${index + 1}. User: ${(membership.user as any)?.name || 'N/A'}, ID: ${membership.user}`,
      );
    });

    return memberships;
  }

  /**
   * Buscar membership de um usuário específico
   */
  async getUserMembership(userId: string, tenantId: string) {
    console.log('🔍 [MembershipService] Buscando membership do usuário...');
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    const membership = await this.membershipModel
      .findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .populate('ministry', '_id name');

    console.log(
      '📋 [MembershipService] Membership encontrado:',
      membership
        ? {
            role: membership.role,
            ministry: membership.ministry?._id?.toString(),
          }
        : 'nenhum',
    );

    return membership;
  }

  /**
   * Listar ministérios de um usuário
   */
  async getUserMinistries(
    userId: string,
    options: {
      includeInactive?: boolean;
      role?: MembershipRole;
    } = {},
  ) {
    console.log('🏛️ Listando ministérios do usuário...');
    console.log('   - User ID:', userId);
    console.log('   - Options:', options);

    const query: any = {
      user: new Types.ObjectId(userId),
    };

    if (!options.includeInactive) {
      query.isActive = true;
    }

    if (options.role) {
      query.role = options.role;
    }

    const memberships = await this.membershipModel
      .find(query)
      .populate('ministry', 'name description')
      .sort({ createdAt: -1 });

    console.log(`✅ Encontrados ${memberships.length} ministérios`);
    return memberships;
  }

  /**
   * Atualizar vínculo de ministério
   */
  async updateMinistryMembership(
    userId: string,
    ministryId: string,
    updateData: {
      role?: MembershipRole;
    },
  ) {
    console.log('✏️ Atualizando vínculo de ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Update data:', updateData);

    const membership = await this.membershipModel.findOne({
      user: new Types.ObjectId(userId),
      ministry: new Types.ObjectId(ministryId),
      isActive: true,
    });

    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    if (updateData.role) {
      membership.role = updateData.role;
    }

    const updatedMembership = await membership.save();
    console.log('✅ Vínculo atualizado com sucesso');
    return updatedMembership;
  }

  /**
   * Verificar se usuário está vinculado a um ministério
   */
  async isUserInMinistry(userId: string, ministryId: string): Promise<boolean> {
    const membership = await this.membershipModel.findOne({
      user: new Types.ObjectId(userId),
      ministry: new Types.ObjectId(ministryId),
      isActive: true,
    });

    return !!membership;
  }

  /**
   * Obter estatísticas de um ministério
   */
  async getMinistryStats(ministryId: string) {
    const totalMembers = await this.membershipModel.countDocuments({
      ministry: new Types.ObjectId(ministryId),
      isActive: true,
    });

    const volunteers = await this.membershipModel.countDocuments({
      ministry: new Types.ObjectId(ministryId),
      role: MembershipRole.Volunteer,
      isActive: true,
    });

    const leaders = await this.membershipModel.countDocuments({
      ministry: new Types.ObjectId(ministryId),
      role: MembershipRole.Leader,
      isActive: true,
    });

    return {
      totalMembers,
      volunteers,
      leaders,
    };
  }

  /**
   * Obtém estatísticas de integridade de um usuário
   */
  async getUserIntegrityStats(userId: string, tenantId: string) {
    console.log(
      '📊 [MembershipService] Obtendo estatísticas de integridade...',
    );
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    // Usar o serviço de integridade
    return await this.integrityService.getUserIntegrityStats(userId, tenantId);
  }

  /**
   * Criar MemberFunctions para um usuário em um ministério
   */
  private async _createMemberFunctionsForMinistry(
    userId: string,
    ministryId: string,
    role: MembershipRole,
    tenantId: Types.ObjectId,
    createdBy?: string,
    createdByRole?: string,
  ): Promise<void> {
    console.log(
      '🔧 [MembershipService] _createMemberFunctionsForMinistry iniciado',
    );
    console.log('📋 [MembershipService] Parâmetros:', {
      userId,
      ministryId,
      role,
      tenantId,
      tenantIdString: tenantId.toString(),
      createdBy,
      createdByRole,
      userIdType: typeof userId,
      ministryIdType: typeof ministryId,
      tenantIdType: typeof tenantId,
    });

    try {
      // Apenas para LEADERS criar MemberFunctions automaticamente
      if (role === MembershipRole.Leader) {
        console.log(
          '👑 [MembershipService] Leader detectado - buscando todas as funções do ministério...',
        );

        // Buscar todas as funções disponíveis no ministério
        console.log('🔍 [MembershipService] Buscando funções do ministério...');
        console.log(
          '📋 [MembershipService] Parâmetros para getMinistryFunctions:',
          {
            tenantId: tenantId.toString(),
            ministryId,
            active: true,
          },
        );

        const ministryFunctions =
          await this.functionsService.getMinistryFunctions(
            tenantId.toString(),
            ministryId,
            true, // apenas funções ativas
          );

        console.log(
          '📋 [MembershipService] Funções encontradas no ministério:',
          ministryFunctions.length,
        );
        console.log(
          '📋 [MembershipService] Detalhes das funções:',
          ministryFunctions.map((f) => ({
            name: f.name,
            functionId: f.functionId,
          })),
        );

        if (ministryFunctions.length === 0) {
          console.log(
            '⚠️ [MembershipService] Nenhuma função encontrada no ministério para atribuir ao leader',
          );
          return;
        }

        // Leaders sempre aprovados automaticamente
        const functionStatus = MemberFunctionStatus.APROVADO;
        const functionLevel = MemberFunctionLevel.ESPECIALISTA;
        const notes = 'Atribuído automaticamente ao líder do ministério';

        console.log(
          '📋 [MembershipService] Status das funções:',
          functionStatus,
        );
        console.log('📋 [MembershipService] Nível das funções:', functionLevel);
        console.log('📋 [MembershipService] Notas:', notes);

        // Criar MemberFunctions para todas as funções do ministério
        for (const ministryFunction of ministryFunctions) {
          try {
            console.log(
              `🔧 [MembershipService] Criando MemberFunction para leader:`,
            );
            console.log(`   - userId: ${userId}`);
            console.log(`   - ministryId: ${ministryId}`);
            console.log(`   - functionId: ${ministryFunction.functionId}`);
            console.log(`   - tenantId: ${tenantId.toString()}`);
            console.log(`   - status: ${functionStatus}`);
            console.log(`   - level: ${functionLevel}`);

            const result =
              await this.memberFunctionService.createMemberFunction(
                tenantId.toString(),
                null, // branchId
                {
                  userId: userId,
                  ministryId: ministryId,
                  functionId: ministryFunction.functionId,
                  status: functionStatus,
                  level: functionLevel,
                  priority: 1,
                  notes: notes,
                  isActive: true,
                  createdByRole: createdByRole, // Passar o role do usuário que está criando
                },
                createdBy || 'system',
              );
            console.log(
              `✅ [MembershipService] MemberFunction criada para leader: ${ministryFunction.functionId}`,
            );
          } catch (error) {
            console.error(
              `❌ [MembershipService] Erro ao criar MemberFunction para leader:`,
              error,
            );
            // Continuar com as outras funções mesmo se uma falhar
          }
        }
      } else {
        console.log(
          '👤 [MembershipService] Voluntário detectado - funções serão atribuídas via chamada específica',
        );
        console.log(
          '   - As funções específicas serão criadas via endpoint /ministries/{ministryId}/members/{memberId}/functions',
        );
      }
    } catch (error) {
      console.error(
        '❌ [MembershipService] Erro ao criar MemberFunctions:',
        error,
      );
      // Não falhar a vinculação por erro ao criar funções
    }
  }
}
