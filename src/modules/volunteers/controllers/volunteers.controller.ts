import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VolunteersService } from '../services/volunteers.service';
import { GetVolunteersDto } from '../dto/get-volunteers.dto';

@Controller('tenants/:tenantId/volunteers')
export class VolunteersController {
  constructor(private readonly svc: VolunteersService) {}

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query() q: GetVolunteersDto,
    @Req() req: any,
  ) {
    return this.svc.list(tenantId, req.user, q);
  }

  @Get('facets')
  async facets(
    @Param('tenantId') tenantId: string,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.svc.facets(tenantId, req.user, branchId);
  }
}