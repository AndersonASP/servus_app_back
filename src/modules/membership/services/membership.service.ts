import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership } from '../schemas/membership.schema';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UpdateMembershipDto } from '../dto/update-membership.dto';
import { MembershipRole, Role } from 'src/common/enums/role.enum';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { MemberFunctionService } from '../../functions/services/member-function.service';
import { FunctionsService } from '../../functions/services/functions.service';
import { MemberFunctionStatus, MemberFunctionLevel } from '../../functions/schemas/member-function.schema';
import { MembershipIntegrityService } from './membership-integrity.service';


@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(Ministry.name) private ministryModel: Model<Ministry>,
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
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'add_volunteer');

    // Verificar se já existe membership ATIVO para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
      isActive: true, // ← Só considera memberships ativos
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já está vinculado a este ministério');
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
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
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'add_leader');

    // Verificar se já existe membership ATIVO para este usuário neste ministério
    const existingMembership = await this.membershipModel.findOne({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: new Types.ObjectId(ministryId),
      branch: createMembershipDto.branchId ? new Types.ObjectId(createMembershipDto.branchId) : null,
      isActive: true, // ← Só considera memberships ativos
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já está vinculado a este ministério');
    }

    // Criar novo membership
    const membership = new this.membershipModel({
      user: new Types.ObjectId(createMembershipDto.userId),
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
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
    console.log('   - ministryId:', ministryId, '(tipo:', typeof ministryId, ', length:', ministryId?.length, ')');
    console.log('   - tenantId:', tenantId, '(tipo:', typeof tenantId, ', length:', tenantId?.length, ')');
    console.log('   - branchId:', options.branchId, '(tipo:', typeof options.branchId, ', length:', options.branchId?.length, ')');

    // Validar se ministryId é um ObjectId válido ANTES de qualquer operação
    // Aceita tanto ObjectId (24 chars) quanto UUID (36 chars)
    if (!Types.ObjectId.isValid(ministryId) && ministryId.length !== 36) {
      console.error('❌ ID do ministério inválido:', ministryId);
      throw new BadRequestException(`ID do ministério inválido: ${ministryId}`);
    }

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(currentUser.sub, tenantId, ministryId, 'view_members');

    // Construir filtros
    console.log('🔧 Criando filtros...');
    console.log('   - tenantId é UUID string');
    console.log('   - ministryId:', ministryId, '(length:', ministryId.length, ')');
    
    const filters: any = {
      tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
      ministry: Types.ObjectId.isValid(ministryId) ? new Types.ObjectId(ministryId) : ministryId,
      isActive: true,
    };
    
    console.log('   - Filtros criados:', JSON.stringify(filters, null, 2));

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
      ministry: Types.ObjectId.isValid(ministryId) ? new Types.ObjectId(ministryId) : ministryId
    });
    console.log('   - Memberships com este ministério:', membershipsWithMinistry);
    
    // Primeiro, vamos testar uma query simples
    console.log('🔍 Testando query simples...');
    const simpleQuery = await this.membershipModel.find(filters).limit(5).exec();
    console.log('   - Query simples retornou:', simpleQuery.length, 'documentos');
    
    if (simpleQuery.length > 0) {
      console.log('   - Primeiro documento:', JSON.stringify(simpleQuery[0], null, 2));
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
    console.log('🗑️ [MembershipService] Removendo membro do ministério com validações de integridade...');
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

    const userId = membership.user.toString();

    // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verificar se remoção não deixará usuário órfão
    const integrityCheck = await this.integrityService.validateMembershipRemoval(
      userId, 
      membershipId, 
      tenantId
    );

    if (!integrityCheck.valid) {
      throw new BadRequestException(integrityCheck.reason);
    }

    console.log('✅ [MembershipService] Validação de integridade aprovada');
    console.log(`📊 [MembershipService] Memberships restantes: ${integrityCheck.remainingMemberships}`);

    // 🗑️ REMOÇÃO EM CASCATA: Remover todas as funções do usuário neste ministério
    console.log('🗑️ [MembershipService] Removendo funções do usuário no ministério...');
    const deletedFunctionsCount = await this.integrityService.removeMemberFunctionsFromMinistry(
      userId,
      ministryId,
      tenantId,
      branchId
    );
    console.log(`✅ [MembershipService] ${deletedFunctionsCount} funções removidas do usuário no ministério`);

    // 🗑️ EXCLUIR definitivamente o membership
    await this.membershipModel.findByIdAndDelete(membershipId);
    console.log('✅ [MembershipService] Membro desvinculado com sucesso (membership excluído)');

    // 🔧 GARANTIR MEMBERSHIP PADRÃO: Se necessário, criar membership padrão
    await this.integrityService.ensureDefaultMembership(userId, tenantId, currentUserId);

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
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - User ID:', userId);
    console.log('   - Current User ID:', currentUserId);
    console.log('   - Branch ID:', branchId);

    // Verificar se o ministério existe e pertence ao tenant
    const ministry = await this.validateMinistry(tenantId, ministryId);

    // Verificar permissões do usuário atual
    await this.validateUserPermissions(currentUserId, tenantId, ministryId, 'remove_member');

    // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verificar se desvinculação não deixará usuário órfão
    const integrityCheck = await this.integrityService.validateMinistryRemoval(
      userId,
      ministryId,
      tenantId
    );

    if (!integrityCheck.valid) {
      throw new BadRequestException(integrityCheck.reason);
    }

    console.log('✅ [MembershipService] Validação de integridade aprovada');
    console.log(`📊 [MembershipService] Memberships afetados: ${integrityCheck.affectedMemberships}`);

    // 🗑️ REMOÇÃO EM CASCATA: Remover todas as funções do usuário neste ministério
    console.log('🗑️ [MembershipService] Removendo funções do usuário no ministério...');
    const deletedFunctionsCount = await this.integrityService.removeMemberFunctionsFromMinistry(
      userId,
      ministryId,
      tenantId,
      branchId
    );
    console.log(`✅ [MembershipService] ${deletedFunctionsCount} funções removidas do usuário no ministério`);

    // 🗑️ EXCLUIR memberships do usuário neste ministério (exclusão completa)
    const query: any = {
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      ministry: new Types.ObjectId(ministryId)
    };

    if (branchId) {
      query.branch = new Types.ObjectId(branchId);
    } else {
      query.branch = null; // Matriz
    }

    const result = await this.membershipModel.deleteMany(query);

    console.log(`✅ [MembershipService] ${result.deletedCount} memberships excluídos permanentemente`);

    // 🔧 GARANTIR MEMBERSHIP PADRÃO: Se necessário, criar membership padrão
    await this.integrityService.ensureDefaultMembership(userId, tenantId, currentUserId);

    return {
      message: 'Membro desvinculado do ministério com sucesso - todos os dados relacionados foram excluídos',
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
  private async validateMinistry(tenantId: string, ministryId: string) { // tenantId é ObjectId como string
    console.log('🔍 Validando ministério...');
    console.log('   - tenantId:', tenantId);
    console.log('   - ministryId:', ministryId);
    
    try {
      const ministry = await this.ministryModel.findOne({
        _id: Types.ObjectId.isValid(ministryId) ? new Types.ObjectId(ministryId) : ministryId,
        tenantId: new Types.ObjectId(tenantId), // ObjectId do tenant
      });
      
      if (!ministry) {
        console.log('❌ Ministério não encontrado');
        throw new BadRequestException('Ministério não encontrado ou não pertence ao tenant');
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
    createdByRole?: string
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
      roleType: typeof role
    });

    try {
      // Buscar tenant do ministério
      console.log('🔍 [MembershipService] Buscando ministério...');
      const ministry = await this.ministryModel.findById(ministryId).select('tenantId');
      
      console.log('📊 [MembershipService] Ministério encontrado:', {
        ministryExists: !!ministry,
        ministryId: ministry?._id,
        tenantId: ministry?.tenantId,
        tenantIdType: typeof ministry?.tenantId
      });
      
      if (!ministry || !ministry.tenantId) {
        console.log('❌ [MembershipService] Ministério não encontrado ou sem tenant');
        throw new BadRequestException('Ministério não encontrado ou sem tenant');
      }

      const tenantId = ministry.tenantId;
      console.log('✅ [MembershipService] TenantId obtido:', {
        tenantId,
        tenantIdType: typeof tenantId,
        tenantIdString: tenantId.toString()
      });

      // Verificar se já existe vínculo ativo
      console.log('🔍 [MembershipService] Verificando vínculos existentes...');
      const existingMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        ministry: new Types.ObjectId(ministryId),
        isActive: true,
      });

      console.log('📊 [MembershipService] Vínculo ativo encontrado:', {
        exists: !!existingMembership,
        membershipId: existingMembership?._id
      });

      if (existingMembership) {
        console.log('❌ [MembershipService] Usuário já está vinculado a este ministério');
        throw new BadRequestException('Usuário já está vinculado a este ministério');
      }

      // Verificar se existe vínculo inativo para reativar
      console.log('🔍 [MembershipService] Verificando vínculos inativos...');
      const inactiveMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        ministry: new Types.ObjectId(ministryId),
        isActive: false,
      });

      console.log('📊 [MembershipService] Vínculo inativo encontrado:', {
        exists: !!inactiveMembership,
        membershipId: inactiveMembership?._id
      });

      if (inactiveMembership) {
        // Reativar vínculo existente
        console.log('🔄 [MembershipService] Reativando vínculo existente...');
        inactiveMembership.isActive = true;
        inactiveMembership.role = role === 'leader' ? MembershipRole.Leader : MembershipRole.Volunteer;
        
        const updatedMembership = await inactiveMembership.save();
        console.log('✅ [MembershipService] Vínculo reativado:', updatedMembership._id);

        // Criar UserFunctions para o usuário no ministério
        console.log('🔧 [MembershipService] Criando MemberFunctions para vínculo reativado...');
        await this._createMemberFunctionsForMinistry(userId, ministryId, role, tenantId, createdBy, createdByRole);

        console.log('✅ [MembershipService] addUserToMinistry concluído (reativação)');
        return updatedMembership;
      }

      // Criar novo vínculo
      console.log('🆕 [MembershipService] Criando novo vínculo...');
      const membership = new this.membershipModel({
        user: new Types.ObjectId(userId),
        tenant: ministry.tenantId,
        ministry: new Types.ObjectId(ministryId),
        role: role === 'leader' ? MembershipRole.Leader : MembershipRole.Volunteer,
        isActive: true,
      });

      console.log('💾 [MembershipService] Salvando novo membership...');
      const savedMembership = await membership.save();
      console.log('✅ [MembershipService] Vínculo criado:', savedMembership._id);

      // Criar UserFunctions para o usuário no ministério
      console.log('🔧 [MembershipService] Criando MemberFunctions para novo vínculo...');
      await this._createMemberFunctionsForMinistry(userId, ministryId, role, tenantId, createdBy, createdByRole);

      console.log('✅ [MembershipService] addUserToMinistry concluído (novo vínculo)');
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
    } = {}
  ) {
    console.log('👥 Listando membros do ministério (versão simplificada)...');
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

    const memberships = await this.membershipModel
      .find(query)
      .populate('user', 'name email picture phone')
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.offset || 0);

    console.log(`✅ Encontrados ${memberships.length} membros`);
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
    }
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
    console.log('📊 [MembershipService] Obtendo estatísticas de integridade...');
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
    createdByRole?: string
  ): Promise<void> {
    console.log('🔧 [MembershipService] _createMemberFunctionsForMinistry iniciado');
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
      tenantIdType: typeof tenantId
    });

    try {
      // Apenas para LEADERS criar MemberFunctions automaticamente
      if (role === MembershipRole.Leader) {
        console.log('👑 [MembershipService] Leader detectado - buscando todas as funções do ministério...');
        
        // Buscar todas as funções disponíveis no ministério
        console.log('🔍 [MembershipService] Buscando funções do ministério...');
        console.log('📋 [MembershipService] Parâmetros para getMinistryFunctions:', {
          tenantId: tenantId.toString(),
          ministryId,
          active: true
        });
        
        const ministryFunctions = await this.functionsService.getMinistryFunctions(
          tenantId.toString(),
          ministryId,
          true // apenas funções ativas
        );

        console.log('📋 [MembershipService] Funções encontradas no ministério:', ministryFunctions.length);
        console.log('📋 [MembershipService] Detalhes das funções:', ministryFunctions.map(f => ({
          name: f.name,
          functionId: f.functionId
        })));

        if (ministryFunctions.length === 0) {
          console.log('⚠️ [MembershipService] Nenhuma função encontrada no ministério para atribuir ao leader');
          return;
        }

        // Leaders sempre aprovados automaticamente
        const functionStatus = MemberFunctionStatus.APROVADO;
        const functionLevel = MemberFunctionLevel.ESPECIALISTA;
        const notes = 'Atribuído automaticamente ao líder do ministério';

        console.log('📋 [MembershipService] Status das funções:', functionStatus);
        console.log('📋 [MembershipService] Nível das funções:', functionLevel);
        console.log('📋 [MembershipService] Notas:', notes);

        // Criar MemberFunctions para todas as funções do ministério
        for (const ministryFunction of ministryFunctions) {
          try {
            console.log(`🔧 [MembershipService] Criando MemberFunction para leader:`);
            console.log(`   - userId: ${userId}`);
            console.log(`   - ministryId: ${ministryId}`);
            console.log(`   - functionId: ${ministryFunction.functionId}`);
            console.log(`   - tenantId: ${tenantId.toString()}`);
            console.log(`   - status: ${functionStatus}`);
            console.log(`   - level: ${functionLevel}`);
            
            const result = await this.memberFunctionService.createMemberFunction(
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
                createdByRole: createdByRole // Passar o role do usuário que está criando
              },
              createdBy || 'system'
            );
            console.log(`✅ [MembershipService] MemberFunction criada para leader: ${ministryFunction.functionId}`);
          } catch (error) {
            console.error(`❌ [MembershipService] Erro ao criar MemberFunction para leader:`, error);
            // Continuar com as outras funções mesmo se uma falhar
          }
        }
      } else {
        console.log('👤 [MembershipService] Voluntário detectado - funções serão atribuídas via chamada específica');
        console.log('   - As funções específicas serão criadas via endpoint /ministries/{ministryId}/members/{memberId}/functions');
      }
    } catch (error) {
      console.error('❌ [MembershipService] Erro ao criar MemberFunctions:', error);
      // Não falhar a vinculação por erro ao criar funções
    }
  }
}
