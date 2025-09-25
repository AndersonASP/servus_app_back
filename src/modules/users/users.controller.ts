import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  Res,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './services/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserWithMembershipDto } from './dto/create-user-with-membership.dto';
import { SelfRegistrationDto } from './dto/self-registration.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS, Role, MembershipRole } from 'src/common/enums/role.enum';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';
import { buildUserFiltersFromScope } from 'src/common/utils/helpers/build-user-filters-scope.util';
import { UserFilterDto } from './dto/user-filter.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ========================================
  // 🔐 FLUXO 1: CRIAÇÃO INTERNA (ADMIN)
  // ========================================

  // 👤 Criar usuário com membership (tenant scope) - ADMIN
  @Post('tenants/:tenantId/with-membership')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_USERS,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  ])
  async createWithMembership(
    @Param('tenantId') tenantId: string,
    @Body() createUserWithMembershipDto: CreateUserWithMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const createdBy = req.user.email;
    const creatorRole = req.user.role;

    // Buscar memberships do usuário atual
    const creatorMemberships = await this.usersService.getUserMemberships(
      req.user.sub,
    );

    const result = await this.usersService.createWithMembership(
      createUserWithMembershipDto.userData,
      {
        ...createUserWithMembershipDto.membershipData,
        tenantId,
        userId: '', // Será preenchido no service
      },
      createdBy,
      creatorRole,
      creatorMemberships,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/users/${result.user._id}`)
      .json(result);
  }

  // 👤 Criar usuário na branch específica - ADMIN
  @Post('tenants/:tenantId/branches/:branchId/with-membership')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_USERS,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  ])
  async createWithMembershipInBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Body()
    body: {
      userData: any;
      membershipData: { role: MembershipRole; ministryId?: string };
    },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const createdBy = req.user.email;
    const creatorRole = req.user.role;

    // Buscar memberships do usuário atual
    const creatorMemberships = await this.usersService.getUserMemberships(
      req.user.sub,
    );

    const result = await this.usersService.createWithMembership(
      body.userData,
      {
        tenantId,
        branchId,
        ministryId: body.membershipData.ministryId,
        role: body.membershipData.role,
        userId: '', // Será preenchido no service
      },
      createdBy,
      creatorRole,
      creatorMemberships,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/users/${result.user._id}`)
      .json(result);
  }

  // ========================================
  // 🔓 FLUXO 2: AUTO-REGISTRO (VOLUNTÁRIO)
  // ========================================

  // 🔍 Buscar usuário por email (público para descoberta de tenant)
  @Public()
  @Get('find-by-email/:email')
  async findByEmail(@Param('email') email: string) {
    console.log('🔍 [CONTROLLER] Iniciando busca de usuário por email...');
    
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      console.log('❌ [CONTROLLER] Usuário não encontrado na base de dados:', email);
      throw new NotFoundException(`Usuário com email ${email} não está cadastrado no sistema.`);
    }

    console.log('✅ [CONTROLLER] Usuário encontrado:', user.email);
    console.log('👤 [CONTROLLER] Dados do usuário:');
    console.log('   - ID:', user._id);
    console.log('   - Nome:', user.name);
    console.log('   - Role:', user.role);
    console.log('   - TenantId:', user.tenantId);

    // Buscar memberships do usuário para incluir informações de tenant
    console.log('🔍 [CONTROLLER] Buscando memberships do usuário...');
    const memberships = await this.usersService.getUserMemberships(user._id.toString());
    
    console.log('📋 [CONTROLLER] Memberships encontrados:', memberships.length);
    memberships.forEach((m, index) => {
      console.log(`   ${index + 1}. Membership:`);
      console.log(`      - ID: ${m._id}`);
      console.log(`      - Role: ${m.role}`);
      console.log(`      - Tenant: ${m.tenant}`);
      console.log(`      - Branch: ${m.branch}`);
      console.log(`      - Ministry: ${m.ministry}`);
      console.log(`      - Ativo: ${m.isActive}`);
    });
    
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      memberships: memberships.map(m => ({
        id: m._id,
        role: m.role,
        tenant: m.tenant ? {
          id: m.tenant._id || m.tenant,
          tenantId: m.tenant._id || m.tenant
        } : null,
        branch: m.branch && typeof m.branch === 'object' ? {
          id: (m.branch as any)._id,
          branchId: (m.branch as any).branchId,
          name: (m.branch as any).name
        } : null,
        ministry: m.ministry && typeof m.ministry === 'object' ? {
          id: (m.ministry as any)._id,
          name: (m.ministry as any).name
        } : null
      }))
    };
    
    console.log('📤 [CONTROLLER] Resposta final:');
    console.log('   - Usuário:', response.name);
    console.log('   - Role:', response.role);
    console.log('   - Memberships:', response.memberships.length);
    response.memberships.forEach((m, index) => {
      console.log(`   ${index + 1}. Membership: ${m.role} - Tenant: ${m.tenant?.id || 'NENHUM'}`);
    });
    
    return response;
  }

  // 🧪 Endpoint de debug para tenant
  @Public()
  @Get('debug-tenant/:email')
  async debugTenant(@Param('email') email: string) {
    console.log('🧪 [DEBUG] Iniciando debug de tenant...');
    
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      console.log('👤 [DEBUG] Usuário encontrado:', user.name);
      
      // Busca memberships sem populate para ver os dados brutos
      const memberships = await this.usersService.getUserMembershipsRaw(user._id.toString());
      
      console.log('📋 [DEBUG] Memberships brutos:', JSON.stringify(memberships, null, 2));
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        memberships: memberships
      };
    } catch (error) {
      console.log('❌ [DEBUG] Erro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🧪 Endpoint de teste simples
  @Public()
  @Get('test/:email')
  async testEndpoint(@Param('email') email: string) {
    console.log('🧪 [TEST] Endpoint de teste chamado');
    
    try {
      const user = await this.usersService.findByEmail(email);
      console.log('👤 [TEST] Usuário encontrado:', !!user);
      
      if (user) {
        console.log('👤 [TEST] Dados do usuário:');
        console.log('   - ID:', user._id);
        console.log('   - Nome:', user.name);
        console.log('   - Role:', user.role);
        
        return {
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        };
      } else {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }
    } catch (error) {
      console.log('❌ [TEST] Erro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🔍 Buscar tenant do usuário por email (público para descoberta de tenant)
  @Public()
  @Get(':email/tenant')
  async getUserTenant(@Param('email') email: string) {
    console.log('🔍 [CONTROLLER] Iniciando busca de tenant por email...');
    
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log('❌ [CONTROLLER] Usuário não encontrado na base de dados:', email);
      throw new NotFoundException(`Usuário com email ${email} não está cadastrado no sistema.`);
    }

    console.log('✅ [CONTROLLER] Usuário encontrado para busca de tenant:', user.email);

    // Buscar memberships do usuário para encontrar o tenant
    console.log('🔍 [CONTROLLER] Buscando memberships para encontrar tenant...');
    const memberships = await this.usersService.getUserMemberships(user._id.toString());
    
    console.log('📋 [CONTROLLER] Memberships encontrados para tenant:', memberships.length);
    
    if (memberships.length > 0 && memberships[0].tenant) {
      const tenant = memberships[0].tenant;
      console.log('✅ [CONTROLLER] Tenant encontrado:', tenant);
      
      // Extrai o _id corretamente (agora tenant deve ser um objeto com _id)
      const tenantId = tenant._id;
      console.log('✅ [CONTROLLER] Tenant ID extraído:', tenantId);
      
      return {
        id: tenantId,
        tenantId: tenantId
      };
    }
    
    console.log('❌ [CONTROLLER] Nenhum tenant encontrado nos memberships');
    throw new NotFoundException(`Usuário ${email} não possui acesso a nenhum tenant.`);
  }

  // 👤 Auto-registro via link de convite - VOLUNTÁRIO
  @Post('self-register')
  async selfRegister(
    @Body() selfRegistrationDto: SelfRegistrationDto,
    @Res() res: Response,
  ) {
    const result = await this.usersService.selfRegister(selfRegistrationDto);

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/users/${result.user._id}`)
      .json(result);
  }

  // 👤 Completar perfil após auto-registro - VOLUNTÁRIO
  @Post('complete-profile/:userId')
  async completeProfile(
    @Param('userId') userId: string,
    @Body()
    profileData: {
      name: string;
      phone?: string;
      birthDate?: string;
      address?: any;
    },
    @Res() res: Response,
  ) {
    const result = await this.usersService.completeProfile(userId, profileData);

    return res.status(HttpStatus.OK).json(result);
  }

  // ========================================
  // 🔐 FLUXO LEGADO: CRIAÇÃO SIMPLES (ADMIN)
  // ========================================

  // 🔐 Criação: ServusAdmin, TenantAdmin, BranchAdmin, Leader (cada um no seu escopo)
  @Post()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
      {
        membership: {
          roles: [MembershipRole.Leader],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
    ],
  })
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    // 1) Resolve escopo coerente com quem está criando
    const { tenantId, branchId } = resolveTenantAndBranchScope(req.user, {
      dtoTenantId: dto.tenantId,
      dtoBranchId: dto.branchId,
    });

    // 2) Se é APENAS líder nesse escopo, só pode criar Volunteer
    const isLeaderOnly = await this.usersService.isLeaderOnly(
      req.user._id,
      tenantId ?? '',
      branchId,
    );
    if (isLeaderOnly && dto.role !== Role.Volunteer) {
      throw new ForbiddenException('Líder só pode criar voluntários.');
    }

    return this.usersService.create(dto, req.user.email, tenantId, branchId);
  }

  // 🔎 Listar todos do tenant: ServusAdmin ou TenantAdmin
  @Get()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      // Se quiser permitir BranchAdmin listar, descomente a linha abaixo:
      // { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'user', allowNullBranch: true } },
    ],
  })
  async findAll(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.findAll(tenantId);
  }

  // 🔎 Filtro com RBAC aplicado
  @Get('filter')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
      {
        membership: {
          roles: [MembershipRole.Leader],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
    ],
  })
  async filterUsers(@Query() query: UserFilterDto, @Req() req: any) {
    const filters = buildUserFiltersFromScope(req.user, query);
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    return this.usersService.findWithFilters(filters, { page, limit });
  }

  // 🔍 Detalhe
  @Get(':id')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
      {
        membership: {
          roles: [MembershipRole.Leader],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
    ],
  })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.findOne(id, tenantId);
  }

  // ✏️ Atualização
  @Put(':id')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
      {
        membership: {
          roles: [MembershipRole.Leader],
          tenantFrom: 'user',
          allowNullBranch: true,
        },
      },
    ],
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  // 🗑️ Remoção
  @Delete(':id')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      // Se quiser permitir BranchAdmin remover dentro da própria filial, avalie e descomente:
      // { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'user', allowNullBranch: true } },
    ],
  })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.remove(id, tenantId);
  }

  // ========================================
  // 🔍 FLUXO 3: LISTAGEM COM FILTROS POR ROLE
  // ========================================

  // 🔎 Listar usuários por role no tenant (TenantAdmin)
  @Get('tenants/:tenantId/by-role/:role')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
    ],
  })
  async listUsersByRole(
    @Param('tenantId') tenantId: string,
    @Param('role') role: MembershipRole,
    @Query()
    query: {
      page?: string;
      limit?: string;
      search?: string;
      branchId?: string;
    },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.usersService.listUsersByRole(
      tenantId,
      role,
      { page, limit, search: query.search, branchId: query.branchId },
      req.user,
    );
  }

  // 🔎 Listar usuários por role na branch (BranchAdmin)
  @Get('tenants/:tenantId/branches/:branchId/by-role/:role')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
          branchParam: 'branchId',
        },
      },
    ],
  })
  async listUsersByRoleInBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('role') role: MembershipRole,
    @Query()
    query: {
      page?: string;
      limit?: string;
      search?: string;
      ministryId?: string;
    },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.usersService.listUsersByRoleInBranch(
      tenantId,
      branchId,
      role,
      { page, limit, search: query.search, ministryId: query.ministryId },
      req.user,
    );
  }

  // 🔎 Listar voluntários por ministry (Leader)
  @Get('tenants/:tenantId/ministries/:ministryId/volunteers')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } },
    ],
  })
  async listVolunteersByMinistry(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Query()
    query: {
      page?: string;
      limit?: string;
      search?: string;
      branchId?: string;
    },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.usersService.listVolunteersByMinistry(
      tenantId,
      ministryId,
      { page, limit, search: query.search, branchId: query.branchId },
      req.user,
    );
  }

  // 🔎 Dashboard de usuários por tenant (TenantAdmin)
  @Get('tenants/:tenantId/dashboard')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
    ],
  })
  async getUsersDashboard(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
  ) {
    return this.usersService.getUsersDashboard(tenantId, req.user);
  }

  // 🔎 Dashboard de usuários por branch (BranchAdmin)
  @Get('tenants/:tenantId/branches/:branchId/dashboard')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
          branchParam: 'branchId',
        },
      },
    ],
  })
  async getBranchUsersDashboard(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
  ) {
    return this.usersService.getBranchUsersDashboard(
      tenantId,
      branchId,
      req.user,
    );
  }

  // 🔎 Buscar usuários por nome/email (com escopo baseado na role)
  @Get('search')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'user' },
      },
      {
        membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'user' },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'user' } },
    ],
  })
  async searchUsers(
    @Query() query: { q: string; page?: string; limit?: string },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.usersService.searchUsers(query.q, { page, limit }, req.user);
  }

  // ========================================
  // 📊 FLUXO 4: EXPORTAÇÃO DE DADOS
  // ========================================

  // 📊 Exportar usuários por role do tenant para CSV/Excel
  @Get('tenants/:tenantId/by-role/:role/export')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
    ],
  })
  async exportUsersByRole(
    @Param('tenantId') tenantId: string,
    @Param('role') role: MembershipRole,
    @Query()
    query: { format?: 'csv' | 'xlsx'; search?: string; branchId?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const format = query.format || 'xlsx';

    // Buscar todos os usuários (sem paginação para export)
    const result = await this.usersService.listUsersByRole(
      tenantId,
      role,
      { page: 1, limit: 10000, search: query.search, branchId: query.branchId },
      req.user,
    );

    // Transformar dados para exportação
    const exportData = result.users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.membership.role,
      branchName: user.membership.branch?.name,
      ministryName: user.membership.ministry?.name,
      profileCompleted: user.profileCompleted,
      skills: user.skills,
      availability: user.availability,
      createdAt: new Date(), // Simular data de criação
      isActive: user.membership.isActive,
    }));

    const filename = this.usersService.exportService.generateFilename(
      `usuarios_${role}_tenant`,
      tenantId,
      format,
    );

    if (format === 'csv') {
      await this.usersService.exportService.exportUsersToCSV(
        exportData,
        filename,
        res,
      );
    } else {
      await this.usersService.exportService.exportUsersToExcel(
        exportData,
        filename,
        res,
      );
    }
  }

  // 📊 Exportar usuários por role da branch para CSV/Excel
  @Get('tenants/:tenantId/branches/:branchId/by-role/:role/export')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
          branchParam: 'branchId',
        },
      },
    ],
  })
  async exportUsersByRoleInBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('role') role: MembershipRole,
    @Query()
    query: { format?: 'csv' | 'xlsx'; search?: string; ministryId?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const format = query.format || 'xlsx';

    // Buscar todos os usuários da branch
    const result = await this.usersService.listUsersByRoleInBranch(
      tenantId,
      branchId,
      role,
      {
        page: 1,
        limit: 10000,
        search: query.search,
        ministryId: query.ministryId,
      },
      req.user,
    );

    // Transformar dados para exportação
    const exportData = result.users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.membership.role,
      branchName: 'N/A', // Na branch específica
      ministryName: user.membership.ministry?.name,
      profileCompleted: user.profileCompleted,
      skills: user.skills,
      availability: user.availability,
      createdAt: new Date(),
      isActive: user.membership.isActive,
    }));

    const filename = this.usersService.exportService.generateFilename(
      `usuarios_${role}_branch`,
      `${tenantId}_${branchId}`,
      format,
    );

    if (format === 'csv') {
      await this.usersService.exportService.exportUsersToCSV(
        exportData,
        filename,
        res,
      );
    } else {
      await this.usersService.exportService.exportUsersToExcel(
        exportData,
        filename,
        res,
      );
    }
  }

  // 📊 Exportar voluntários por ministry para CSV/Excel
  @Get('tenants/:tenantId/ministries/:ministryId/volunteers/export')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } },
    ],
  })
  async exportVolunteersByMinistry(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Query()
    query: { format?: 'csv' | 'xlsx'; search?: string; branchId?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const format = query.format || 'xlsx';

    // Buscar todos os voluntários do ministry
    const result = await this.usersService.listVolunteersByMinistry(
      tenantId,
      ministryId,
      { page: 1, limit: 10000, search: query.search, branchId: query.branchId },
      req.user,
    );

    // Transformar dados para exportação
    const exportData = result.users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: 'volunteer',
      branchName: user.membership.branch?.name,
      ministryName: 'N/A', // Ministry específico
      profileCompleted: user.profileCompleted,
      skills: user.skills,
      availability: user.availability,
      createdAt: new Date(),
      isActive: user.membership.isActive,
    }));

    const filename = this.usersService.exportService.generateFilename(
      `voluntarios_ministry`,
      `${tenantId}_${ministryId}`,
      format,
    );

    if (format === 'csv') {
      await this.usersService.exportService.exportUsersToCSV(
        exportData,
        filename,
        res,
      );
    } else {
      await this.usersService.exportService.exportUsersToExcel(
        exportData,
        filename,
        res,
      );
    }
  }

  // 📊 Exportar dashboard para Excel
  @Get('tenants/:tenantId/dashboard/export')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
    ],
  })
  async exportTenantDashboard(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Buscar dados do dashboard
    const dashboardData = await this.usersService.getUsersDashboard(
      tenantId,
      req.user,
    );

    const filename = this.usersService.exportService.generateFilename(
      'dashboard_tenant',
      tenantId,
      'xlsx',
    );

    await this.usersService.exportService.exportDashboardToExcel(
      dashboardData,
      filename,
      res,
    );
  }

  // 📊 Exportar dashboard da branch para Excel
  @Get('tenants/:tenantId/branches/:branchId/dashboard/export')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'header',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'header',
          branchParam: 'branchId',
        },
      },
    ],
  })
  async exportBranchDashboard(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Buscar dados do dashboard da branch
    const dashboardData = await this.usersService.getBranchUsersDashboard(
      tenantId,
      branchId,
      req.user,
    );

    const filename = this.usersService.exportService.generateFilename(
      'dashboard_branch',
      `${tenantId}_${branchId}`,
      'xlsx',
    );

    await this.usersService.exportService.exportDashboardToExcel(
      dashboardData,
      filename,
      res,
    );
  }
}
