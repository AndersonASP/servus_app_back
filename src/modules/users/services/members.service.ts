import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { Branch } from '../../branches/schemas/branch.schema';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { Tenant } from '../../tenants/schemas/tenant.schema';
import { MemberFunction } from '../../functions/schemas/member-function.schema';
import { CreateMemberDto, MembershipAssignmentDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { MemberResponseDto } from '../dto/member-response.dto';
import { MembershipRole, Role } from '../../../common/enums/role.enum';
import { EmailService } from '../../notifications/services/email.service';
import { MembershipIntegrityService } from '../../membership/services/membership-integrity.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Ministry.name) private ministryModel: Model<Ministry>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(MemberFunction.name) private memberFunctionModel: Model<MemberFunction>,
    private emailService: EmailService,
    private integrityService: MembershipIntegrityService,
  ) {}

  async createMember(
    createMemberDto: CreateMemberDto,
    tenantId: string, // ObjectId como string
    userRole: string,
    createdBy: string,
  ): Promise<MemberResponseDto> {
    console.log('🚀 [MembersService] Iniciando criação de membro...');
    console.log('📋 [MembersService] Dados recebidos:', {
      name: createMemberDto.name,
      email: createMemberDto.email,
      phone: createMemberDto.phone,
      memberships: createMemberDto.memberships,
      tenantId,
      userRole,
      createdBy
    });

    // Validações básicas
    if (!createMemberDto.email && !createMemberDto.phone) {
      console.log('❌ [MembersService] Erro: Email ou telefone é obrigatório');
      throw new BadRequestException('Email ou telefone é obrigatório');
    }

    if (createMemberDto.memberships.length === 0) {
      console.log('❌ [MembersService] Erro: Pelo menos um vínculo organizacional é obrigatório');
      throw new BadRequestException('Pelo menos um vínculo organizacional é obrigatório');
    }

    // Gerar senha temporária se não fornecida
    const provisionalPassword = createMemberDto.password || this.generateProvisionalPassword();
    const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

    console.log('👤 [MembersService] Criando usuário...');
    const user = new this.userModel({
      ...createMemberDto,
      password: hashedPassword,
      tenantId: new Types.ObjectId(tenantId), // Converter string para ObjectId
      isActive: true,
    });

    console.log('💾 [MembersService] Salvando usuário no banco...');
    const savedUser = await user.save();
    console.log('✅ [MembersService] Usuário criado com sucesso:', savedUser._id);

    // Buscar informações do tenant pelo ObjectId
    const tenant = await this.tenantModel.findById(tenantId).select('name _id');
    const tenantName = tenant?.name || 'Igreja';

    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // Criar memberships e coletar informações para o email
    let branchName: string | undefined;
    let ministryName: string | undefined;
    let primaryRole: string = 'volunteer'; // Será atualizado com a role do primeiro membership

    console.log('🔗 [MembersService] Criando memberships...');
    for (const membershipData of createMemberDto.memberships) {
      console.log('📝 [MembersService] Criando membership:', {
        role: membershipData.role,
        branchId: membershipData.branchId,
        ministryId: membershipData.ministryId,
        functionIds: membershipData.functionIds
      });

      const membership = new this.membershipModel({
        user: savedUser._id,
        tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
        role: membershipData.role,
        branch: membershipData.branchId ? new Types.ObjectId(membershipData.branchId) : null,
        ministry: membershipData.ministryId ? new Types.ObjectId(membershipData.ministryId) : null,
        isActive: membershipData.isActive ?? true,
        createdBy,
      });

      console.log('💾 [MembersService] Salvando membership no banco...');
      await membership.save();
      console.log('✅ [MembersService] Membership criado com sucesso:', membership._id);

      // Criar vínculos MemberFunction se houver funções selecionadas
      if (membershipData.functionIds && membershipData.functionIds.length > 0 && membershipData.ministryId) {
        console.log('⚙️ [MembersService] Criando MemberFunctions:', membershipData.functionIds);
        for (const functionId of membershipData.functionIds) {
          console.log('🔧 [MembersService] Criando MemberFunction:', {
            userId: savedUser._id,
            ministryId: membershipData.ministryId,
            functionId: functionId,
            tenantId: tenantId,
            branchId: membershipData.branchId
          });

          const memberFunction = new this.memberFunctionModel({
            memberId: savedUser._id, // ✅ Usar memberId conforme schema
            ministryId: new Types.ObjectId(membershipData.ministryId),
            functionId: new Types.ObjectId(functionId),
            status: 'aprovado', // ✅ Usar status correto conforme enum
            tenantId: new Types.ObjectId(tenantId), // ObjectId do tenant
            approvedBy: createdBy, // ✅ Manter como string conforme schema
            approvedAt: new Date(),
            isActive: true,
          });

          console.log('💾 [MembersService] Salvando MemberFunction no banco...');
          await memberFunction.save();
          console.log('✅ [MembersService] MemberFunction criada com sucesso:', memberFunction._id);
        }
      } else if (membershipData.role === 'leader' && membershipData.ministryId) {
        // Para leaders sem funções específicas, buscar e atribuir todas as funções do ministério
        console.log('🔍 [MembersService] Leader sem funções específicas, buscando todas as funções do ministério...');
        
        try {
          // Buscar todas as funções do ministério
          const ministryFunctions = await this.memberFunctionModel.find({
            ministryId: new Types.ObjectId(membershipData.ministryId),
            tenantId: new Types.ObjectId(tenantId),
          }).distinct('functionId');

          console.log('📋 [MembersService] Funções encontradas no ministério:', ministryFunctions.length);

          if (ministryFunctions.length > 0) {
            // Criar MemberFunctions para todas as funções do ministério
            for (const functionId of ministryFunctions) {
              console.log('🔧 [MembersService] Criando MemberFunction automática para leader:', {
                userId: savedUser._id,
                ministryId: membershipData.ministryId,
                functionId: functionId,
                tenantId: tenantId,
                branchId: membershipData.branchId
              });

              const memberFunction = new this.memberFunctionModel({
                userId: savedUser._id,
                ministryId: new Types.ObjectId(membershipData.ministryId),
                functionId: new Types.ObjectId(functionId),
                status: 'approved', // Aprovado automaticamente para leader
                tenantId: new Types.ObjectId(tenantId),
                branchId: membershipData.branchId ? new Types.ObjectId(membershipData.branchId) : null,
                approvedBy: createdBy ? new Types.ObjectId(createdBy) : null,
                approvedAt: new Date(),
              });

              await memberFunction.save();
              console.log('✅ [MembersService] MemberFunction automática criada:', memberFunction._id);
            }
          } else {
            console.log('⚠️ [MembersService] Nenhuma função encontrada no ministério para atribuir ao leader');
          }
        } catch (error) {
          console.error('❌ [MembersService] Erro ao buscar funções do ministério:', error);
          // Não falhar a criação do membership por erro ao buscar funções
        }
      }

      // Coletar informações do primeiro membership para o email
      if (!branchName && membershipData.branchId) {
        const branch = await this.branchModel.findById(membershipData.branchId).select('name');
        branchName = branch?.name;
      }

      if (!ministryName && membershipData.ministryId) {
        const ministry = await this.ministryModel.findById(membershipData.ministryId).select('name');
        ministryName = ministry?.name;
      }

      // Definir primaryRole com a role do primeiro membership
      if (primaryRole === 'volunteer') {
        primaryRole = membershipData.role;
      }
    }

    // Atualizar a role do usuário com a primaryRole
    console.log('🔄 [MembersService] Atualizando role do usuário para:', primaryRole);
    await this.userModel.findByIdAndUpdate(savedUser._id, { role: primaryRole });
    console.log('✅ [MembersService] Role do usuário atualizada com sucesso');

    // Enviar email com credenciais se o usuário tem email
    if (createMemberDto.email) {
      try {
        await this.emailService.sendUserCredentials(
          createMemberDto.email,
          createMemberDto.name,
          tenantName,
          provisionalPassword,
          primaryRole,
          branchName,
          ministryName,
        );
        console.log(`✅ Email de credenciais enviado para ${createMemberDto.email}`);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de credenciais:', emailError);
        // Não falhar a criação do usuário por erro de email
      }
    }

    console.log('🎯 [MembersService] Buscando dados do membro criado...');
    const result = await this.getMemberById(savedUser._id.toString(), tenantId);
    console.log('🎉 [MembersService] Membro criado com sucesso!');
    console.log('📊 [MembersService] Resultado final:', {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      memberships: result.memberships?.length || 0
    });
    return result;
  }

  async getMembers(
    filters: MemberFilterDto,
    tenantId: string, // ObjectId como string
    userRole: string,
    currentUserId?: string,
  ): Promise<{ members: MemberResponseDto[], total: number }> {
    console.log('🔍 [MembersService] getMembers iniciado');
    console.log('📋 [MembersService] Filtros recebidos:', filters);
    console.log('🏢 [MembersService] TenantId:', tenantId);
    console.log('👤 [MembersService] UserRole:', userRole);
    console.log('👤 [MembersService] CurrentUserId:', currentUserId);
    console.log('🔍 [MembersService] Comparação de roles:');
    console.log('   - userRole === MembershipRole.Leader:', userRole === MembershipRole.Leader);
    console.log('   - userRole === "leader":', userRole === 'leader');
    console.log('   - MembershipRole.Leader value:', MembershipRole.Leader);

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      console.log('❌ [MembersService] Tenant não encontrado:', tenantId);
      throw new BadRequestException('Tenant não encontrado');
    }

    // Validação específica para líderes
    if (userRole === MembershipRole.Leader && currentUserId) {
      console.log('🔍 [MembersService] Validando permissões de líder...');
      
      // Buscar o membership do líder atual
      const leaderMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(currentUserId),
        tenant: new Types.ObjectId(tenantId),
        role: MembershipRole.Leader,
        isActive: true
      }).populate('ministry', '_id name');

      if (!leaderMembership) {
        console.log('❌ [MembersService] Líder não encontrado ou inativo');
        throw new BadRequestException('Líder não encontrado ou inativo');
      }

      const leaderMinistryId = leaderMembership.ministry?._id?.toString();
      console.log('🏢 [MembersService] Ministério do líder:', leaderMinistryId);

      // Se o líder está tentando filtrar por ministério, verificar se é o seu ministério
      if (filters.ministryId && filters.ministryId !== leaderMinistryId) {
        console.log('❌ [MembersService] Líder tentando acessar ministério diferente do seu');
        throw new BadRequestException('Líder só pode acessar membros do seu próprio ministério');
      }

      // Líder pode ver todos os membros do tenant para vincular ao seu ministério
      // Não aplicar filtro automático de ministério - deixar vazio para mostrar todos
      console.log('🔧 [MembersService] Líder pode ver todos os membros do tenant');

      console.log('🔧 [MembersService] Filtros após validação de líder:', filters);
    }

    // Buscar TODOS os usuários do tenant (incluindo os sem vínculos)
    // Primeiro, vamos buscar usuários que têm tenantId correto
    let usersQuery: any = { tenantId: new Types.ObjectId(tenantId) };
    
    console.log('🔍 [MembersService] Query de usuários:', JSON.stringify(usersQuery, null, 2));
    console.log('🔍 [MembersService] TenantId recebido:', tenantId);
    console.log('🔍 [MembersService] TenantId como ObjectId:', new Types.ObjectId(tenantId));

    // DEBUG: Verificar se há usuários sem tenantId que deveriam estar no tenant
    const usersWithoutTenantIdDebug = await this.userModel
      .find({ tenantId: { $exists: false } })
      .select('_id name email phone role tenantId isActive createdAt updatedAt')
      .lean();
    
    console.log('🔍 [MembersService] Usuários sem tenantId:', usersWithoutTenantIdDebug.length);
    if (usersWithoutTenantIdDebug.length > 0) {
      console.log('🔍 [MembersService] Primeiros usuários sem tenantId:');
      usersWithoutTenantIdDebug.slice(0, 3).forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
      });
    }

    // DEBUG: Buscar usuário específico por email
    const specificUser = await this.userModel
      .findOne({ email: 'moisess@gmail.com' })
      .select('_id name email phone role tenantId isActive createdAt updatedAt')
      .lean();
    
    console.log('🔍 [MembersService] DEBUG - Usuário moisess@gmail.com:', specificUser);

    // DEBUG: Buscar usuário específico Samilla Arau
    const samillaUser = await this.userModel
      .findOne({ email: 'arau@gmail.com' })
      .select('_id name email phone role tenantId isActive createdAt updatedAt')
      .lean();
    
    console.log('🔍 [MembersService] DEBUG - Usuário arau@gmail.com (Samilla):', samillaUser);
    console.log('🔍 [MembersService] DEBUG - Samilla tem tenantId?', !!samillaUser?.tenantId);
    console.log('🔍 [MembersService] DEBUG - Samilla tenantId:', samillaUser?.tenantId);

    // DEBUG: Buscar usuário por ID específico
    const userById = await this.userModel
      .findById('68d4bd1300dc962134a18e8a')
      .select('_id name email phone role tenantId isActive createdAt updatedAt')
      .lean();
    
    console.log('🔍 [MembersService] DEBUG - Usuário por ID 68d4bd1300dc962134a18e8a:', userById);

    // Buscar todos os usuários do tenant (agora todos devem ter tenantId)
    const users = await this.userModel
      .find(usersQuery)
      .select('_id name email phone role tenantId isActive createdAt updatedAt')
      .lean();

    console.log('📊 [MembersService] Usuários encontrados:', users.length);
    console.log('📋 [MembersService] Usuários encontrados:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. User: ${user.name || 'N/A'}, Email: ${user.email || 'N/A'}, Role: ${user.role || 'N/A'}, TenantId: ${user.tenantId}`);
      
      // DEBUG: Verificar se é o usuário Samilla
      if (user.email === 'arau@gmail.com' || user._id.toString() === '68d4bd1300dc962134a18e8a') {
        console.log('🎯 [MembersService] ENCONTRADO - Usuário Samilla na lista principal!');
        console.log('   - ID:', user._id);
        console.log('   - Nome:', user.name);
        console.log('   - Email:', user.email);
        console.log('   - TenantId:', user.tenantId);
        console.log('   - TenantId tipo:', typeof user.tenantId);
        console.log('   - TenantId esperado:', tenantId);
      }
    });

    // Para cada usuário, buscar seus memberships (se houver)
    const usersWithMemberships = await Promise.all(
      users.map(async (user) => {
        const memberships = await this.membershipModel
          .find({ user: user._id, tenant: new Types.ObjectId(tenantId) })
          .populate('branch', 'name address')
          .populate('ministry', 'name description')
          .lean();

        return {
          user,
          memberships: memberships || []
        };
      })
    );

    console.log('📊 [MembersService] Usuários com memberships processados:', usersWithMemberships.length);

    // Aplicar filtro de busca nos usuários
    let filteredUsers = usersWithMemberships;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredUsers = usersWithMemberships.filter(({ user }) => {
        return user.name?.toLowerCase().includes(searchTerm) ||
               user.email?.toLowerCase().includes(searchTerm);
      });
    }

    // Aplicar filtro de role se especificado
    if (filters.role) {
      filteredUsers = filteredUsers.filter(({ user }) => user.role === filters.role);
    }

    // Calcular total baseado em usuários únicos
    const total = filteredUsers.length;
    
    // Paginação baseada em usuários únicos
    const page = parseInt(filters.page || '1') || 1;
    const limit = parseInt(filters.limit || '10') || 10;
    const skip = (page - 1) * limit;
    
    // Pegar apenas os usuários para a página atual
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    console.log('📄 [MembersService] Paginação:', { page, limit, skip, total, paginatedCount: paginatedUsers.length });

    // Mapear para resposta
    const members = paginatedUsers.map(({ user, memberships }) => {
      console.log('👤 [MembersService] Mapeando user:', {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipsCount: memberships.length
      });
      return this.mapUserToMemberResponse(user, memberships);
    });

    console.log('✅ [MembersService] Resposta final:', {
      membersCount: members.length,
      total,
      firstMember: members[0] ? {
        id: members[0].id,
        name: members[0].name,
        email: members[0].email
      } : 'nenhum'
    });

    return { members, total };
  }

  async getMemberById(id: string, tenantId: string): Promise<MemberResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    const memberships = await this.membershipModel
      .find({ 
        user: user._id, 
        tenant: new Types.ObjectId(tenantId),
        isActive: true // CORREÇÃO: Filtrar apenas memberships ativos
      })
      .populate('branch', 'name address')
      .populate('ministry', 'name description');

    return this.mapUserToMemberResponse(user, memberships);
  }

  async updateMember(
    id: string,
    updateMemberDto: UpdateMemberDto,
    tenantId: string,
    userRole: string,
  ): Promise<MemberResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Atualizar dados do usuário
    Object.assign(user, updateMemberDto);
    await user.save();

    return this.getMemberById(id, tenantId);
  }

  async deleteMember(id: string, tenantId: string, userRole: string, currentUserId?: string): Promise<void> {
    console.log('🗑️ [MembersService] Deletando membro com validações de integridade...');
    console.log('   - User ID:', id);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User Role:', userRole);
    console.log('   - Current User ID:', currentUserId);

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Validação específica para líderes
    if (userRole === MembershipRole.Leader || userRole === 'leader') {
      console.log('🔐 [MembersService] Validando permissões de líder para exclusão...');
      
      // Líder não pode excluir a si mesmo
      if (currentUserId && currentUserId === id) {
        throw new BadRequestException('Você não pode excluir a si mesmo');
      }
      
      // Verificar se o membro a ser excluído pertence ao ministério do líder
      const leaderMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(currentUserId),
        tenant: new Types.ObjectId(tenantId),
        role: MembershipRole.Leader,
        isActive: true
      }).populate('ministry', '_id name');

      if (!leaderMembership) {
        throw new BadRequestException('Líder não encontrado ou inativo');
      }

      const leaderMinistryId = leaderMembership.ministry?._id?.toString();
      console.log('🏢 [MembersService] Ministério do líder:', leaderMinistryId);

      // Verificar se o membro a ser excluído pertence ao ministério do líder
      const targetMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(id),
        tenant: new Types.ObjectId(tenantId),
        ministry: new Types.ObjectId(leaderMinistryId),
        isActive: true
      });

      if (!targetMembership) {
        throw new BadRequestException('Você só pode excluir membros do seu próprio ministério');
      }

      console.log('✅ [MembersService] Permissões de líder validadas');
    }

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verificar estatísticas do usuário antes da remoção
    const integrityStats = await this.integrityService.getUserIntegrityStats(id, tenantId);
    console.log('📊 [MembersService] Estatísticas de integridade:', integrityStats);

    // 🗑️ REMOÇÃO EM CASCATA: Remover todos os vínculos relacionados ao usuário
    console.log('🗑️ [MembersService] Iniciando remoção em cascata de todos os vínculos...');

    // 1. Remover todas as MemberFunctions do usuário
    console.log('🗑️ [MembersService] Removendo MemberFunctions do usuário...');
    const deletedFunctionsCount = await this.memberFunctionModel.deleteMany({
      userId: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    });
    console.log(`✅ [MembersService] ${deletedFunctionsCount.deletedCount} MemberFunctions removidas`);

    // 2. Remover todos os memberships do usuário no tenant
    console.log('🗑️ [MembersService] Removendo memberships do usuário...');
    const deletedMembershipsCount = await this.membershipModel.deleteMany({ 
      user: user._id, 
      tenant: new Types.ObjectId(tenantId) 
    });
    console.log(`✅ [MembersService] ${deletedMembershipsCount.deletedCount} memberships removidos`);

    // 3. Ministry-memberships removidos - usando apenas memberships agora

    // 4. Remover referências em campos de auditoria (createdBy, updatedBy, approvedBy)
    console.log('🗑️ [MembersService] Removendo referências de auditoria...');
    
    // MemberFunctions com approvedBy
    const updatedMemberFunctionsCount = await this.memberFunctionModel.updateMany(
      { approvedBy: new Types.ObjectId(id) },
      { $unset: { approvedBy: 1 } }
    );
    console.log(`✅ [MembersService] ${updatedMemberFunctionsCount.modifiedCount} MemberFunctions com approvedBy atualizadas`);

    // Memberships com createdBy/updatedBy
    const updatedMembershipsCount = await this.membershipModel.updateMany(
      { 
        $or: [
          { createdBy: new Types.ObjectId(id) },
          { updatedBy: new Types.ObjectId(id) }
        ]
      },
      { 
        $unset: { 
          createdBy: 1, 
          updatedBy: 1 
        } 
      }
    );
    console.log(`✅ [MembersService] ${updatedMembershipsCount.modifiedCount} memberships com campos de auditoria atualizados`);

    // 🗑️ DELETAR USUÁRIO: Remover o usuário do sistema
    console.log('🗑️ [MembersService] Deletando usuário...');
    await this.userModel.findByIdAndDelete(id);
    console.log('✅ [MembersService] Usuário deletado com sucesso');

    console.log('📊 [MembersService] Resumo da remoção em cascata:');
    console.log(`   - MemberFunctions removidas: ${deletedFunctionsCount.deletedCount}`);
    console.log(`   - Memberships removidos: ${deletedMembershipsCount.deletedCount}`);
    console.log(`   - MemberFunctions com approvedBy atualizadas: ${updatedMemberFunctionsCount.modifiedCount}`);
    console.log(`   - Memberships com campos de auditoria atualizados: ${updatedMembershipsCount.modifiedCount}`);
    console.log(`   - Usuário deletado: ${id}`);
    console.log('✅ [MembersService] Remoção em cascata concluída com sucesso');
  }

  /**
   * Gera uma senha provisória segura
   */
  private generateProvisionalPassword(): string {
    const crypto = require('crypto');
    
    // Caracteres seguros para senha
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Garantir pelo menos um de cada tipo (mais seguro)
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // Preencher o resto com caracteres aleatórios criptograficamente seguros
    for (let i = 4; i < 16; i++) { // Senha de 16 caracteres
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Embaralhar a senha usando crypto.randomBytes para maior segurança
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
  }

  private mapUserToMemberResponse(user: any, memberships: any[]): MemberResponseDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      bio: user.bio,
      skills: user.skills || [],
      availability: user.availability,
      address: user.address,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted || false,
      role: user.role || 'volunteer',
      memberships: memberships.map(membership => ({
        id: membership._id.toString(),
        role: membership.role,
        branch: membership.branch ? {
          id: membership.branch._id.toString(),
          name: membership.branch.name,
        } : undefined,
        ministry: membership.ministry ? {
          id: membership.ministry._id.toString(),
          name: membership.ministry.name,
        } : undefined,
        isActive: membership.isActive,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async toggleMemberStatus(
    memberId: string,
    tenantId: string,
    userRole: string,
  ): Promise<MemberResponseDto> {
    // Buscar o usuário
    const user = await this.userModel.findById(memberId);
    if (!user) {
      throw new Error('Membro não encontrado');
    }

    // Verificar se o usuário pertence ao tenant
    if (user.tenantId?.toString() !== tenantId) {
      throw new Error('Membro não pertence a este tenant');
    }

    // Toggle do status
    user.isActive = !user.isActive;
    await user.save();

    // Buscar memberships ativos do usuário
    const memberships = await this.membershipModel
      .find({ user: memberId, isActive: true })
      .populate('tenant branch ministry')
      .lean();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      bio: user.bio,
      skills: user.skills,
      availability: user.availability,
      address: user.address,
      picture: user.picture,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      role: user.role,
      tenantId: user.tenantId?.toString(),
      branchId: user.branchId?.toString(),
      memberships: memberships.map((membership) => ({
        id: membership._id.toString(),
        role: membership.role,
        tenant: membership.tenant ? {
          id: (membership.tenant as any)._id.toString(),
          tenantId: (membership.tenant as any).tenantId,
          name: (membership.tenant as any).name,
        } : undefined,
        branch: membership.branch ? {
          id: (membership.branch as any)._id.toString(),
          branchId: (membership.branch as any).branchId,
          name: (membership.branch as any).name,
        } : undefined,
        ministry: membership.ministry ? {
          id: (membership.ministry as any)._id.toString(),
          name: (membership.ministry as any).name,
        } : undefined,
        isActive: membership.isActive,
        createdAt: (membership as any).createdAt || new Date(),
        updatedAt: (membership as any).updatedAt || new Date(),
      })),
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }

  /**
   * Busca membros pendentes de aprovação em um ministério específico
   */
  async getPendingMembersByMinistry(
    ministryId: string,
    tenantId: string,
    branchId?: string
  ): Promise<MemberResponseDto[]> {
    console.log('🔍 [MembersService] Buscando membros pendentes...');
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Branch ID:', branchId);

    try {
      // Buscar memberships que precisam de aprovação do líder
      // (usuários inativos OU que têm flag needsApproval)
      const memberships = await this.membershipModel
        .find({
          ministry: new Types.ObjectId(ministryId),
          tenant: new Types.ObjectId(tenantId),
          $or: [
            { isActive: false }, // Membros inativos (fluxo antigo)
            { needsApproval: true } // Membros que precisam aprovação (fluxo novo)
          ],
          ...(branchId && { branch: new Types.ObjectId(branchId) })
        })
        .populate('user', 'name email phone role isActive createdAt profileCompleted')
        .populate('ministry', 'name')
        .populate('branch', 'name')
        .populate('tenant', 'name')
        .sort({ createdAt: -1 }); // Mais recentes primeiro

      console.log(`✅ Encontrados ${memberships.length} membros pendentes de aprovação`);

      // Converter para DTO
      const pendingMembers: MemberResponseDto[] = memberships.map(membership => {
        const user = membership.user as any;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          profileCompleted: user.profileCompleted || false,
          memberships: [{
            id: (membership as any)._id.toString(),
            role: membership.role,
            tenant: {
              id: (membership.tenant as any)._id.toString(),
              tenantId: (membership.tenant as any).tenantId,
              name: (membership.tenant as any).name,
            },
            branch: membership.branch ? {
              id: (membership.branch as any)._id.toString(),
              branchId: (membership.branch as any).branchId,
              name: (membership.branch as any).name,
            } : undefined,
            ministry: {
              id: (membership.ministry as any)._id.toString(),
              name: (membership.ministry as any).name,
            },
            isActive: membership.isActive,
            createdAt: (membership as any).createdAt || new Date(),
            updatedAt: (membership as any).updatedAt || new Date(),
          }],
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        };
      });

      console.log('✅ Membros pendentes convertidos para DTO');
      return pendingMembers;

    } catch (error) {
      console.error('❌ Erro ao buscar membros pendentes:', error);
      throw new BadRequestException('Erro ao buscar membros pendentes');
    }
  }
}