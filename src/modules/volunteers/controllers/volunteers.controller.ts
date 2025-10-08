import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VolunteersService } from '../services/volunteers.service';
import { GetVolunteersDto } from '../dto/get-volunteers.dto';
import { PolicyGuard } from 'src/common/guards/policy.guard';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('tenants/:tenantId/volunteers')
@UseGuards(PolicyGuard)
export class VolunteersController {
  constructor(private readonly svc: VolunteersService) {}

  @Get()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
          ],
          tenantFrom: 'param',
        },
      },
    ],
  })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() q: GetVolunteersDto,
    @Req() req: any,
  ) {
    return this.svc.list(tenantId, req.user, q);
  }

  @Get('facets')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
          ],
          tenantFrom: 'param',
        },
      },
    ],
  })
  async facets(
    @Param('tenantId') tenantId: string,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.svc.facets(tenantId, req.user, branchId);
  }

  @Get('pending')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
          ],
          tenantFrom: 'param',
        },
      },
    ],
  })
  async getPendingSubmissions(
    @Param('tenantId') tenantId: string,
    @Query() q: GetVolunteersDto,
    @Req() req: any,
  ) {
    return this.svc.getPendingSubmissions(tenantId, req.user, q);
  }

  @Delete(':volunteerId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
          ],
          tenantFrom: 'param',
        },
      },
    ],
  })
  async deleteVolunteer(
    @Param('tenantId') tenantId: string,
    @Param('volunteerId') volunteerId: string,
    @Req() req: any,
  ) {
    return this.svc.deleteVolunteer(tenantId, volunteerId, req.user);
  }
}
