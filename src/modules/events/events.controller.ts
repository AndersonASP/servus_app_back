import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';
import { GetRecurrencesDto } from './dto/get-recurrences.dto';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private normalizeBranchId(branchId: string): string | null {
    return branchId === 'null' || branchId === 'undefined' ? null : branchId;
  }

  // Rota para Tenant Admin (sem branch) e Leaders
  @Post('tenants/:tenantId/events')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async createForTenant(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() dto: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    // Tenant admin sempre cria com branchId = null
    const result = await this.eventsService.create(
      tenantId,
      null, // branchId sempre null para tenant admin
      userId,
      dto,
      req.user.roles,
      req.user.ministryId,
    );

    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/tenants/${tenantId}/events/${result._id}`)
      .json(result);
  }

  // Rota para Branch Admin (com branch)
  @Post('tenants/:tenantId/branches/:branchId/events')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async createForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Body() dto: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    // Tratar branchId null
    const normalizedBranchId = this.normalizeBranchId(branchId);

    const result = await this.eventsService.create(
      tenantId,
      normalizedBranchId,
      userId,
      dto,
      req.user.roles,
      req.user.ministryId,
    );

    return res
      .status(HttpStatus.CREATED)
      .header(
        'Location',
        `/tenants/${tenantId}/branches/${branchId}/events/${result._id}`,
      )
      .json(result);
  }

  // Listar eventos para Tenant Admin
  @Get('tenants/:tenantId/events')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.VIEW_EVENTS,
  ])
  async listForTenant(
    @Param('tenantId') tenantId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    return this.eventsService.list(
      tenantId,
      null,
      query,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Listar eventos para Branch Admin
  @Get('tenants/:tenantId/branches/:branchId/events')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.VIEW_EVENTS,
  ])
  async listForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    const normalizedBranchId = this.normalizeBranchId(branchId);
    return this.eventsService.list(
      tenantId,
      normalizedBranchId,
      query,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Buscar recorrências para Tenant Admin
  @Get('tenants/:tenantId/events/recurrences')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.VIEW_EVENTS,
  ])
  async getRecurrencesForTenant(
    @Param('tenantId') tenantId: string,
    @Query() query: GetRecurrencesDto,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    return this.eventsService.getRecurrences(
      tenantId,
      null,
      query,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Buscar recorrências para Branch Admin
  @Get('tenants/:tenantId/branches/:branchId/events/recurrences')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.VIEW_EVENTS,
  ])
  async getRecurrencesForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: GetRecurrencesDto,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    const normalizedBranchId = this.normalizeBranchId(branchId);
    return this.eventsService.getRecurrences(
      tenantId,
      normalizedBranchId,
      query,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Buscar evento específico para Tenant Admin
  @Get('tenants/:tenantId/events/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.VIEW_EVENTS,
  ])
  async findOneForTenant(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    return this.eventsService.findOne(
      tenantId,
      null,
      id,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Buscar evento específico para Branch Admin
  @Get('tenants/:tenantId/branches/:branchId/events/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.VIEW_EVENTS,
  ])
  async findOneForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user?._id || req.user?.sub;
    const normalizedBranchId = this.normalizeBranchId(branchId);
    return this.eventsService.findOne(
      tenantId,
      normalizedBranchId,
      id,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Atualizar evento para Tenant Admin
  @Patch('tenants/:tenantId/events/:id')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT])
  async updateForTenant(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    return this.eventsService.update(
      tenantId,
      null,
      id,
      userId,
      dto,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Atualizar evento para Branch Admin
  @Patch('tenants/:tenantId/branches/:branchId/events/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async updateForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const normalizedBranchId = this.normalizeBranchId(branchId);
    return this.eventsService.update(
      tenantId,
      normalizedBranchId,
      id,
      userId,
      dto,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Deletar evento para Tenant Admin ou Líder
  @Delete('tenants/:tenantId/events/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async removeForTenant(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.remove(
      tenantId,
      null,
      cleanedId,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Deletar evento para Branch Admin
  @Delete('tenants/:tenantId/branches/:branchId/events/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async removeForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const normalizedBranchId = this.normalizeBranchId(branchId);
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.remove(
      tenantId,
      normalizedBranchId,
      cleanedId,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Exceção: pular ocorrência específica
  @Delete('tenants/:tenantId/events/:id/instances')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT])
  async skipInstanceForTenant(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('date') dateIso: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.skipInstance(
      tenantId,
      null,
      cleanedId,
      dateIso,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  @Delete('tenants/:tenantId/branches/:branchId/events/:id/instances')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async skipInstanceForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Query('date') dateIso: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    const normalizedBranchId = this.normalizeBranchId(branchId);
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.skipInstance(
      tenantId,
      normalizedBranchId,
      cleanedId,
      dateIso,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  // Exceção: encerrar série após uma data
  @Patch('tenants/:tenantId/events/:id/cancel-after')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT])
  async cancelSeriesAfterForTenant(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('from') fromIso: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.cancelSeriesAfter(
      tenantId,
      null,
      cleanedId,
      fromIso,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }

  @Patch('tenants/:tenantId/branches/:branchId/events/:id/cancel-after')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async cancelSeriesAfterForBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Query('from') fromIso: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    const normalizedBranchId = this.normalizeBranchId(branchId);
    const cleanedId =
      typeof id === 'string' && id.includes('_') ? id.split('_')[0] : id;
    return this.eventsService.cancelSeriesAfter(
      tenantId,
      normalizedBranchId,
      cleanedId,
      fromIso,
      userId,
      req.user.roles,
      req.user.ministryId,
    );
  }
}
