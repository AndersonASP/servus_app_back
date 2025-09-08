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

@Controller('tenants/:tenantId/branches/:branchId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async create(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Body() dto: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.eventsService.create(
      tenantId,
      branchId,
      userId,
      dto,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header(
        'Location',
        `/tenants/${tenantId}/branches/${branchId}/events/${result._id}`,
      )
      .json(result);
  }

  @Get()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.VIEW_EVENTS,
  ])
  async list(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: any,
  ) {
    return this.eventsService.list(tenantId, branchId, query);
  }

  @Get(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.VIEW_EVENTS,
  ])
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    return this.eventsService.findOne(tenantId, branchId, id);
  }

  @Patch(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async update(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    return this.eventsService.update(tenantId, branchId, id, userId, dto);
  }

  @Delete(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_MINISTRY_EVENTS,
  ])
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    return this.eventsService.remove(tenantId, branchId, id, userId);
  }
}
