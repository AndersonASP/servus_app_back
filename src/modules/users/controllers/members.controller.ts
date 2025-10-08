import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MembersService } from '../services/members.service';
import { MembershipService } from '../../membership/services/membership.service';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { MemberResponseDto } from '../dto/member-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PolicyGuard } from 'src/common/guards/policy.guard';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS, Role, MembershipRole } from 'src/common/enums/role.enum';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard, PolicyGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly membershipService: MembershipService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo membro com vínculos organizacionais',
    description:
      'Cria um novo usuário e atribui vínculos organizacionais de forma atômica. Operação transacional que garante consistência dos dados.',
  })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Membro criado com sucesso',
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou validação falhou',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para criar este tipo de membro',
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou telefone já está em uso no tenant',
  })
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
  async createMember(
    @Body() createMemberDto: CreateMemberDto,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    console.log(
      '🎬 [MembersController] Recebida requisição de criação de membro',
    );
    console.log('📋 [MembersController] Dados recebidos:', {
      name: createMemberDto.name,
      email: createMemberDto.email,
      phone: createMemberDto.phone,
      memberships: createMemberDto.memberships,
      user: req.user?.sub,
    });

    try {
      const { tenantId } = resolveTenantAndBranchScope(req.user, {
        dtoBranchId: createMemberDto.memberships?.[0]?.branchId,
      });

      console.log('🏢 [MembersController] Tenant ID resolvido:', tenantId);

      if (!tenantId) {
        console.log('❌ [MembersController] Erro: Tenant ID não encontrado');
        throw new BadRequestException('Tenant ID não encontrado');
      }

      const userRole =
        req.user.memberships?.find((m) => m.tenant === tenantId)?.role ||
        'volunteer';
      const createdBy = req.user.sub;

      console.log('👤 [MembersController] Contexto do usuário:', {
        userRole,
        createdBy,
        tenantId,
      });

      return this.membersService.createMember(
        createMemberDto,
        tenantId,
        userRole,
        createdBy,
      );
    } catch (error) {
      console.error('💥 [MembersController] Erro na criação de membro:', error);
      throw error;
    }
  }

  @Get()
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
  async getMembers(
    @Query() filters: MemberFilterDto,
    @Req() req: any,
  ): Promise<{ members: MemberResponseDto[]; total: number }> {
    const { tenantId } = resolveTenantAndBranchScope(req.user, {
      dtoBranchId: filters.branchId,
    });
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const currentUserId = req.user.sub || req.user._id;

    // Buscar o membership do usuário atual no banco de dados
    const userMembership = await this.membershipService.getUserMembership(
      currentUserId,
      tenantId,
    );

    const userRole = userMembership?.role || 'volunteer';

    console.log('🔍 [MembersController] User info:', {
      userId: currentUserId,
      userRole: userRole,
      tenantId: tenantId,
      userMembership: userMembership
        ? { role: userMembership.role, ministry: userMembership.ministry }
        : null,
      reqUserMemberships: req.user.memberships?.map((m) => ({
        tenant: m.tenant,
        role: m.role,
      })),
    });

    return this.membersService.getMembers(
      filters,
      tenantId,
      userRole,
      currentUserId,
    );
  }

  @Get('ministry/:ministryId/pending')
  @ApiOperation({
    summary: 'Listar membros pendentes de aprovação',
    description:
      'Retorna membros que se registraram via código de convite e estão aguardando aprovação do líder',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de membros pendentes',
    type: [MemberResponseDto],
  })
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
  async getPendingMembersByMinistry(
    @Param('ministryId') ministryId: string,
    @Req() req: any,
  ): Promise<MemberResponseDto[]> {
    const { tenantId, branchId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) {
      throw new BadRequestException('Tenant ID não encontrado');
    }
    return await this.membersService.getPendingMembersByMinistry(
      ministryId,
      tenantId,
      branchId,
    );
  }

  @Get(':id')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async getMemberById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');

    return this.membersService.getMemberById(id, tenantId);
  }

  @Put(':id')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async updateMember(
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user, {
      dtoBranchId: updateMemberDto.branchId,
    });
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole =
      req.user.memberships?.find((m) => m.tenant === tenantId)?.role ||
      'volunteer';

    return this.membersService.updateMember(
      id,
      updateMemberDto,
      tenantId,
      userRole,
    );
  }

  @Delete(':id')
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
  async deleteMember(@Param('id') id: string, @Req() req: any): Promise<void> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const currentUserId = req.user.sub || req.user._id;

    // Buscar o membership do usuário atual no banco de dados
    const userMembership = await this.membershipService.getUserMembership(
      currentUserId,
      tenantId,
    );
    const userRole = userMembership?.role || 'volunteer';

    return this.membersService.deleteMember(
      id,
      tenantId,
      userRole,
      currentUserId,
    );
  }

  @Patch(':id/toggle-status')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async toggleMemberStatus(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole =
      req.user.memberships?.find((m) => m.tenant === tenantId)?.role ||
      'volunteer';

    return this.membersService.toggleMemberStatus(id, tenantId, userRole);
  }
}
