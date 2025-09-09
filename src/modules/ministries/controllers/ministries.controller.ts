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
import { PERMS, ROLE_PERMISSIONS } from 'src/common/enums/role.enum';
import { Public } from 'src/common/decorators/public.decorator';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';
import { PolicyGuard } from 'src/common/guards/policy.guard';

// 🆕 ROTAS PARA MINISTÉRIOS DA MATRIZ (sem branch)
@Controller('tenants/:tenantId/ministries')
export class MinistriesMatrixController {
  constructor(
    private readonly ministriesService: MinistriesService,
    private readonly reflector: Reflector,
    @InjectModel(Membership.name) private readonly memModel: Model<Membership>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
  ) {}

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

  @Get('debug-env')
  @Public()
  async debugEnv() {
    return {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT_SET',
      MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT_SET',
      message: 'Debug environment variables',
    };
  }

  @Get('debug-public')
  @Public()
  async debugPublic() {
    return {
      message: 'Endpoint público funcionando',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('debug-permissions')
  async debugPermissions(@Req() req: any) {
    const user = req.user;
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      // Buscar permissões do usuário diretamente
      const userId = user.sub || user._id;
      const permissions: string[] = [];

      // Busca memberships ativos do usuário
      const memberships = await this.memModel
        .find({
          user: userId,
          isActive: true,
        })
        .populate('tenant branch ministry')
        .lean();

      // Calcula permissões baseadas nos roles dos memberships
      
      for (const membership of memberships) {
        const rolePermissions = ROLE_PERMISSIONS[membership.role] || [];
        permissions.push(...rolePermissions);
      }

      // Remove duplicatas
      const uniquePermissions = [...new Set(permissions)];
      
      return {
        user: {
          id: userId,
          role: user.role,
          tenantId: user.tenantId,
          branchId: user.branchId,
          membershipRole: user.membershipRole,
        },
        memberships: memberships.map(m => ({
          id: m._id,
          role: m.role,
          tenant: m.tenant,
          branch: m.branch,
          ministry: m.ministry,
          isActive: m.isActive,
        })),
        permissions: uniquePermissions,
        message: 'Debug permissions endpoint (matrix)',
      };
    } catch (error) {
      return {
        error: error.message,
        user: user,
        message: 'Erro ao buscar permissões',
      };
    }
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
