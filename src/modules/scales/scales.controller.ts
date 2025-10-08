import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ScalesService } from './scales.service';
import {
  CreateScaleDto,
  UpdateScaleDto,
  ListScaleDto,
} from './dto/create-scale.dto';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { PERMS } from '../../common/enums/role.enum';

@Controller('scales')
export class ScalesController {
  constructor(private readonly scalesService: ScalesService) {}

  @Post()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async create(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Body() dto: CreateScaleDto,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.scalesService.create(
      tenantId,
      branchId,
      userId,
      dto,
      req.user.roles,
      req.user.ministryId,
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Escala criada com sucesso.',
    });
  }

  @Get()
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async list(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListScaleDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.scalesService.list(
      tenantId,
      branchId,
      query,
      userId,
      req.user.roles,
      req.user.ministryId,
    );

    res.json({
      success: true,
      data: result,
    });
  }

  @Get(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.scalesService.findOne(
      tenantId,
      branchId,
      id,
      userId,
      req.user.roles,
      req.user.ministryId,
    );

    res.json({
      success: true,
      data: result,
    });
  }

  @Patch(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async update(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateScaleDto,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.scalesService.update(
      tenantId,
      branchId,
      id,
      dto,
      userId,
      req.user.roles,
      req.user.ministryId,
    );

    res.json({
      success: true,
      data: result,
      message: 'Escala atualizada com sucesso.',
    });
  }

  @Delete(':id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.scalesService.remove(
      tenantId,
      branchId,
      id,
      userId,
      req.user.roles,
      req.user.ministryId,
    );

    res.json({
      success: true,
      data: result,
    });
  }
}
