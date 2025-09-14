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
  Request,
} from '@nestjs/common';
import { MinistryMembershipService } from '../services/ministry-membership.service';
import type { CreateMinistryMembershipDto, UpdateMinistryMembershipDto } from '../services/ministry-membership.service';
import { MembershipRole } from '../../../common/enums/role.enum';
import { PolicyGuard } from '../../../common/guards/policy.guard';
import { Authorize } from '../../../common/decorators/authorize/authorize.decorator';
import { Role } from '../../../common/enums/role.enum';

@Controller('ministry-memberships')
@UseGuards(PolicyGuard)
export class MinistryMembershipController {
  constructor(
    private readonly ministryMembershipService: MinistryMembershipService,
  ) {}

  /**
   * POST /ministry-memberships
   * Vincular usuário a um ministério
   */
  @Post()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async addUserToMinistry(
    @Body() createDto: CreateMinistryMembershipDto,
    @Request() req: any
  ) {
    return await this.ministryMembershipService.addUserToMinistry(
      createDto.userId,
      createDto.ministryId,
      createDto.role,
      req.user?.id,
      createDto.notes
    );
  }

  /**
   * DELETE /ministry-memberships/user/:userId/ministry/:ministryId
   * Desvincular usuário de um ministério
   */
  @Delete('user/:userId/ministry/:ministryId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async removeUserFromMinistry(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Request() req: any
  ) {
    return await this.ministryMembershipService.removeUserFromMinistry(
      userId,
      ministryId,
      req.user?.id
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
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getMinistryMembers(
    @Param('ministryId') ministryId: string,
    @Query('role') role?: MembershipRole,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return await this.ministryMembershipService.getMinistryMembers(ministryId, {
      role,
      includeInactive: includeInactive === true,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  /**
   * GET /ministry-memberships/user/:userId
   * Listar ministérios de um usuário
   */
  @Get('user/:userId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getUserMinistries(
    @Param('userId') userId: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('role') role?: MembershipRole
  ) {
    return await this.ministryMembershipService.getUserMinistries(userId, {
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
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async updateMinistryMembership(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Body() updateData: UpdateMinistryMembershipDto,
    @Request() req: any
  ) {
    return await this.ministryMembershipService.updateMinistryMembership(
      userId,
      ministryId,
      {
        ...updateData,
        updatedBy: req.user?.id,
      }
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
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getMinistryStats(@Param('ministryId') ministryId: string) {
    return await this.ministryMembershipService.getMinistryStats(ministryId);
  }

  /**
   * GET /ministry-memberships/user/:userId/ministry/:ministryId/check
   * Verificar se usuário está vinculado a um ministério
   */
  @Get('user/:userId/ministry/:ministryId/check')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async checkUserInMinistry(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string
  ) {
    const isInMinistry = await this.ministryMembershipService.isUserInMinistry(
      userId,
      ministryId
    );
    return { isInMinistry };
  }
}
