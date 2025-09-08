// ministries.controller.ts
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
  BadRequestException,
} from '@nestjs/common';
import { MinistriesService } from '../ministries.service';
import { CreateMinistryDto } from '../dto/create-ministry.dto';
import { ListMinistryDto } from '../dto/list-ministry.dto';
import { UpdateMinistryDto } from '../dto/update-ministry.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';

// 🆕 ROTAS PARA MINISTÉRIOS DA MATRIZ (sem branch)
@Controller('tenants/:tenantId/ministries')
export class MinistriesMatrixController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get('debug-auth')
  async debugAuth(@Req() req: any) {
    console.log('🔍 Debug Auth Matrix - User:', req.user);
    console.log('🔍 Debug Auth Matrix - Headers:', req.headers);
    return {
      user: req.user,
      message: 'Debug auth endpoint (matrix)',
      type: 'matrix',
    };
  }

  @Post('debug-create')
  async debugCreate(@Req() req: any, @Body() dto: any) {
    console.log('🔍 Debug Create Matrix - User:', req.user);
    console.log('🔍 Debug Create Matrix - Body:', dto);
    return {
      user: req.user,
      message: 'Debug create endpoint (matrix)',
      data: dto,
      type: 'matrix',
    };
  }

  @Post('debug-create-no-perm')
  async debugCreateNoPerm(@Req() req: any, @Body() dto: any) {
    console.log('🔍 Debug Create Matrix No Perm - User:', req.user);
    console.log('🔍 Debug Create Matrix No Perm - Body:', dto);
    return {
      user: req.user,
      message: 'Debug create endpoint (matrix, no permissions required)',
      data: dto,
      type: 'matrix',
    };
  }

  @Post()
  @RequiresPerm(
    [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT_MINISTRIES],
    false,
  )
  async createMatrix(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() dto: CreateMinistryDto,
  ) {
    // Remove espaços em branco do tenantId
    const cleanTenantId = tenantId.trim();

    console.log(
      '🔍 MinistriesController.createMatrix - tenantId original:',
      `"${tenantId}"`,
    );
    console.log(
      '🔍 MinistriesController.createMatrix - tenantId limpo:',
      `"${cleanTenantId}"`,
    );
    console.log('🔍 MinistriesController.createMatrix - req.body:', req.body);
    console.log('🔍 MinistriesController.createMatrix - dto:', dto);
    console.log('🔍 MinistriesController.createMatrix - dto type:', typeof dto);

    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    // Para matriz, passa branchId como null ou string vazia
    const result = await this.ministriesService.create(
      cleanTenantId,
      '',
      userId,
      dto,
    );

    return result;
  }

  @Get()
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_TENANT_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async listMatrix(
    @Param('tenantId') tenantId: string,
    @Query() query: ListMinistryDto,
  ) {
    return this.ministriesService.list(tenantId.trim(), '', query);
  }

  @Get(':id')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_TENANT_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async findOneMatrix(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.ministriesService.findOne(tenantId.trim(), '', id);
  }

  @Patch(':id')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_TENANT_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async updateMatrix(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMinistryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.update(tenantId.trim(), '', id, userId, dto);
  }

  @Delete(':id')
  @RequiresPerm(
    [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT_MINISTRIES],
    false,
  )
  async removeMatrix(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.remove(tenantId.trim(), '', id, userId);
  }

  @Patch(':id/toggle-status')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_TENANT_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async toggleStatusMatrix(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { isActive: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.toggleStatus(
      tenantId.trim(),
      '',
      id,
      userId,
      dto.isActive,
    );
  }
}

// 🏢 ROTAS PARA MINISTÉRIOS DE FILIAIS (com branch)
@Controller('tenants/:tenantId/branches/:branchId/ministries')
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get('debug-auth')
  async debugAuth(@Req() req: any) {
    console.log('🔍 Debug Auth - User:', req.user);
    console.log('🔍 Debug Auth - Headers:', req.headers);
    return { user: req.user, message: 'Debug auth endpoint' };
  }

  @Post('debug-create')
  async debugCreate(@Req() req: any, @Body() dto: any) {
    console.log('🔍 Debug Create - User:', req.user);
    console.log('🔍 Debug Create - Body:', dto);
    return { user: req.user, message: 'Debug create endpoint', data: dto };
  }

  @Post('debug-create-no-perm')
  async debugCreateNoPerm(@Req() req: any, @Body() dto: any) {
    console.log('🔍 Debug Create No Perm - User:', req.user);
    console.log('🔍 Debug Create No Perm - Body:', dto);
    return {
      user: req.user,
      message: 'Debug create endpoint (no permissions required)',
      data: dto,
    };
  }

  @Post()
  @RequiresPerm(
    [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_MINISTRIES],
    false,
  )
  async create(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
    @Body() dto: CreateMinistryDto,
    @Res() res: any,
  ) {
    const userId: string | undefined = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.ministriesService.create(
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
        `/tenants/${tenantId}/branches/${branchId}/ministries/${result._id}`,
      )
      .json(result);
  }

  @Get()
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_BRANCH_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async list(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListMinistryDto,
  ) {
    return this.ministriesService.list(tenantId, branchId, query);
  }

  @Get(':id')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_BRANCH_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    return this.ministriesService.findOne(tenantId, branchId, id);
  }

  @Patch(':id')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_BRANCH_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async update(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMinistryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.update(tenantId, branchId, id, userId, dto);
  }

  @Delete(':id')
  @RequiresPerm(
    [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_MINISTRIES],
    false,
  )
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.remove(tenantId, branchId, id, userId);
  }

  @Patch(':id/toggle-status')
  @RequiresPerm(
    [
      PERMS.MANAGE_ALL_TENANTS,
      PERMS.MANAGE_BRANCH_MINISTRIES,
      PERMS.MANAGE_MINISTRY,
    ],
    false,
  )
  async toggleStatus(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: { isActive: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    return this.ministriesService.toggleStatus(
      tenantId.trim(),
      branchId.trim(),
      id,
      userId,
      dto.isActive,
    );
  }
}
