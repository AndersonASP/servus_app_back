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
import { TemplatesService } from './templates.service';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';

@Controller('tenants/:tenantId/templates')
export class TemplatesTenantController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
  ])
  async create(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() dto: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    // Para templates de tenant, branchId é null
    const result = await this.templatesService.create(
      tenantId,
      null, // branchId null para templates de tenant
      userId,
      dto,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header(
        'Location',
        `/tenants/${tenantId}/templates/${result._id}`,
      )
      .json(result);
  }

  @Get()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
  ])
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    // Para templates de tenant, branchId é null
    return this.templatesService.list(tenantId, null, query);
  }

  @Get(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
  ])
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    // Para templates de tenant, branchId é null
    return this.templatesService.findOne(tenantId, null, id);
  }

  @Patch(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
  ])
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    // Para templates de tenant, branchId é null
    return this.templatesService.update(tenantId, null, id, userId, dto);
  }

  @Delete(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
  ])
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    // Para templates de tenant, branchId é null
    return this.templatesService.remove(tenantId, null, id, userId);
  }
}
