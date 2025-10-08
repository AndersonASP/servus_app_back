import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { MembershipService } from '../services/membership.service';
import { MembershipRole } from '../../../common/enums/role.enum';
import { PolicyGuard } from '../../../common/guards/policy.guard';
import { Authorize } from '../../../common/decorators/authorize/authorize.decorator';
import { Role } from '../../../common/enums/role.enum';
import { resolveTenantAndBranchScope } from '../../../common/utils/helpers/user-scope.util';

export interface CreateMinistryMembershipDto {
  userId: string;
  ministryId: string;
  role: MembershipRole;
  createdBy?: string;
  createdByRole?: string;
}

export interface UpdateMinistryMembershipDto {
  role?: MembershipRole;
}

@Controller('ministry-memberships')
@UseGuards(PolicyGuard)
export class MinistryMembershipUnifiedController {
  constructor(private readonly membershipService: MembershipService) {}

  /**
   * POST /ministry-memberships
   * Vincular usuário a um ministério
   */
  @Post()
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
  async addUserToMinistry(
    @Body() createDto: CreateMinistryMembershipDto,
    @Req() req: any,
  ) {
    console.log('🎬 [MinistryMembershipController] addUserToMinistry iniciado');
    console.log('📋 [MinistryMembershipController] Dados recebidos:', {
      userId: createDto.userId,
      ministryId: createDto.ministryId,
      role: createDto.role,
      createdByRole: createDto.createdByRole,
      reqUser: req.user,
    });

    try {
      // Obter tenantId e branchId usando o helper padrão
      const { tenantId, branchId } = resolveTenantAndBranchScope(req.user);

      console.log('🔍 [MinistryMembershipController] Scope resolvido:', {
        tenantId,
        branchId,
        tenantIdType: typeof tenantId,
        branchIdType: typeof branchId,
      });

      if (!tenantId) {
        console.log(
          '❌ [MinistryMembershipController] Tenant ID não encontrado',
        );
        throw new BadRequestException('Tenant ID é obrigatório');
      }

      console.log(
        '✅ [MinistryMembershipController] Chamando membershipService.addUserToMinistry...',
      );

      const result = await this.membershipService.addUserToMinistry(
        createDto.userId,
        createDto.ministryId,
        createDto.role,
        req.user?.id,
        createDto.createdByRole || req.user?.role,
      );

      console.log(
        '✅ [MinistryMembershipController] addUserToMinistry concluído com sucesso',
      );
      return result;
    } catch (error) {
      console.error(
        '❌ [MinistryMembershipController] Erro em addUserToMinistry:',
        error,
      );
      console.error(
        '❌ [MinistryMembershipController] Stack trace:',
        error.stack,
      );
      throw error;
    }
  }

  /**
   * DELETE /ministry-memberships/user/:userId/ministry/:ministryId
   * Desvincular usuário de um ministério
   */
  @Delete('user/:userId/ministry/:ministryId')
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
  async removeUserFromMinistry(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Req() req: any,
  ) {
    // Obter tenantId e branchId usando o helper padrão
    const { tenantId, branchId } = resolveTenantAndBranchScope(req.user);

    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }

    return await this.membershipService.unlinkMemberFromMinistry(
      tenantId,
      ministryId,
      userId,
      req.user?.sub || req.user?._id,
      branchId,
    );
  }

  /**
   * GET /ministry-memberships/ministry/:ministryId
   * Listar membros de um ministério
   */
  @Get('ministry/:ministryId')
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
  async getMinistryMembers(
    @Param('ministryId') ministryId: string,
    @Query('role') role?: MembershipRole,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Req() req?: any,
  ) {
    const tenantId = req.headers['x-tenant-id'];
    return await this.membershipService.getMinistryMembersSimple(
      ministryId,
      {
        role,
        includeInactive: includeInactive === true,
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
      },
      req.user,
      tenantId,
    );
  }

  /**
   * GET /ministry-memberships/user/:userId
   * Listar ministérios de um usuário
   */
  @Get('user/:userId')
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
  async getUserMinistries(
    @Param('userId') userId: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('role') role?: MembershipRole,
  ) {
    return await this.membershipService.getUserMinistries(userId, {
      includeInactive: includeInactive === true,
      role,
    });
  }

  @Get('me')
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
  async getMyMinistries(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('role') role?: MembershipRole,
  ) {
    const userId = req.user._id;
    return await this.membershipService.getUserMinistries(userId, {
      includeInactive: includeInactive === true,
      role,
    });
  }

  /**
   * PUT /ministry-memberships/user/:userId/ministry/:ministryId
   * Atualizar vínculo de ministério
   */
  @Put('user/:userId/ministry/:ministryId')
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
  async updateMinistryMembership(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Body() updateData: UpdateMinistryMembershipDto,
    @Req() req: any,
  ) {
    return await this.membershipService.updateMinistryMembership(
      userId,
      ministryId,
      updateData,
    );
  }

  /**
   * GET /ministry-memberships/ministry/:ministryId/stats
   * Obter estatísticas de um ministério
   */
  @Get('ministry/:ministryId/stats')
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
  async getMinistryStats(@Param('ministryId') ministryId: string) {
    return await this.membershipService.getMinistryStats(ministryId);
  }

  /**
   * GET /ministry-memberships/user/:userId/ministry/:ministryId/check
   * Verificar se usuário está vinculado a um ministério
   */
  @Get('user/:userId/ministry/:ministryId/check')
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
  async checkUserInMinistry(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
  ) {
    const isInMinistry = await this.membershipService.isUserInMinistry(
      userId,
      ministryId,
    );
    return { isInMinistry };
  }

  /**
   * GET /ministry-memberships/user/:userId/integrity
   * Verificar integridade de vínculos de um usuário
   */
  @Get('user/:userId/integrity')
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
  async getUserIntegrity(@Param('userId') userId: string, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }

    return await this.membershipService.getUserIntegrityStats(userId, tenantId);
  }
}
