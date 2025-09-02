import { Body, Controller, Get, Post, Patch, Delete, Param, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';

@Controller('tenants/:tenantId/branches/:branchId/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCHEDULES, PERMS.MANAGE_MINISTRY_SCHEDULES, PERMS.MANAGE_MINISTRY_TEMPLATES])
  async create(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Body() dto: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.templatesService.create(tenantId, branchId, userId, dto);
    
    // Retornar 201 com Location header
    return res.status(HttpStatus.CREATED)
      .header('Location', `/tenants/${tenantId}/branches/${branchId}/templates/${result._id}`)
      .json(result);
  }

  @Get()
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCHEDULES, PERMS.MANAGE_MINISTRY_SCHEDULES, PERMS.MANAGE_MINISTRY_TEMPLATES])
  async list(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: any,
  ) {
    return this.templatesService.list(tenantId, branchId, query);
  }

  @Get(':id')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCHEDULES, PERMS.MANAGE_MINISTRY_SCHEDULES, PERMS.MANAGE_MINISTRY_TEMPLATES])
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    return this.templatesService.findOne(tenantId, branchId, id);
  }

  @Patch(':id')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCHEDULES, PERMS.MANAGE_MINISTRY_SCHEDULES, PERMS.MANAGE_MINISTRY_TEMPLATES])
  async update(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    
    return this.templatesService.update(tenantId, branchId, id, userId, dto);
  }

  @Delete(':id')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCHEDULES, PERMS.MANAGE_MINISTRY_SCHEDULES, PERMS.MANAGE_MINISTRY_TEMPLATES])
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');
    
    return this.templatesService.remove(tenantId, branchId, id, userId);
  }
}
