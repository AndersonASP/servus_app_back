import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { TenantService } from '../services/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { CreateTenantWithAdminDto } from '../dto/create-tenant-with-admin.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PolicyGuard } from 'src/common/guards/policy.guard';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ✅ Apenas SuperAdmin pode criar tenants
  @Post()
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async create(@Body() dto: CreateTenantDto, @Req() req: any) {
    return this.tenantService.create(dto, req.user.sub);
  }

  // 🏢 ServusAdmin: Criar Tenant + TenantAdmin (opcional)
  @Post('with-admin')
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async createWithAdmin(
    @Body() createTenantWithAdminDto: CreateTenantWithAdminDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const createdBy = req.user.sub;
    const creatorRole = req.user.role;

    const result = await this.tenantService.createWithAdmin(
      createTenantWithAdminDto,
      createdBy,
      creatorRole,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/tenants/${result.tenant.tenantId}`)
      .json(result);
  }

  // ✅ SuperAdmin pode listar todos os tenants
  @Get()
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async list() {
    return this.tenantService.findAll();
  }

  // ✅ SuperAdmin acessa qualquer tenant
  @Get(':tenantId')
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async getTenant(@Param('tenantId') tenantId: string) {
    return this.tenantService.findById(tenantId);
  }

  // ✅ SuperAdmin pode desativar qualquer tenant
  @Delete(':tenantId')
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async deactivate(@Param('tenantId') tenantId: string) {
    return this.tenantService.deactivate(tenantId);
  }

  // ✅ Listar voluntários pendentes de aprovação no tenant
  @Get(':tenantId/volunteers/pending')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async getPendingVolunteers(
    @Param('tenantId') tenantId: string,
    @Query('ministryId') ministryId?: string,
  ) {
    console.log('🔍 [TenantsController] getPendingVolunteers chamado');
    console.log('   - tenantId:', tenantId);
    console.log('   - ministryId:', ministryId);
    console.log('   - ministryId type:', typeof ministryId);
    console.log('   - ministryId is undefined:', ministryId === undefined);
    console.log('   - ministryId is null:', ministryId === null);

    return this.tenantService.getPendingVolunteers(tenantId, ministryId);
  }

  // ✅ Buscar funções disponíveis de um ministério
  @Get(':tenantId/ministries/:ministryId/functions')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async getMinistryFunctions(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
  ) {
    return this.tenantService.getMinistryFunctions(tenantId, ministryId);
  }

  // ✅ Aprovar voluntário pendente
  @Put(':tenantId/volunteers/:userId/approve')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async approveVolunteer(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body()
    body: { functionId?: string; functionIds?: string[]; notes?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.tenantService.approveVolunteer(
        tenantId,
        userId,
        req.user.sub,
        body.functionId,
        body.functionIds,
        body.notes,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Voluntário aprovado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  // ✅ Rejeitar voluntário pendente
  @Put(':tenantId/volunteers/:userId/reject')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async rejectVolunteer(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() body: { notes?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.tenantService.rejectVolunteer(
        tenantId,
        userId,
        req.user.sub,
        body.notes,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Voluntário rejeitado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  // 🔍 DEBUG: Endpoint para verificar dados brutos
  @Get(':tenantId/volunteers/debug')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async debugVolunteers(@Param('tenantId') tenantId: string) {
    return this.tenantService.debugVolunteers(tenantId);
  }

  // 🔍 DEBUG: Endpoint para verificar funções de um ministério
  @Get(':tenantId/ministries/:ministryId/functions/debug')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async debugMinistryFunctions(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
  ) {
    return this.tenantService.debugMinistryFunctions(tenantId, ministryId);
  }

  // 🔍 DEBUG: Endpoint para verificar MemberFunctions de um usuário
  @Get(':tenantId/volunteers/:userId/memberfunctions/debug')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
      {
        membership: {
          roles: [MembershipRole.BranchAdmin],
          tenantFrom: 'param',
        },
      },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async debugMemberFunctions(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantService.debugMemberFunctions(tenantId, userId);
  }

  // ✅ ServusAdmin ou TenantAdmin (do próprio tenant) podem consultar o "meu tenant"
  @Get('me')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT])
  async findMyTenant(@Req() req: any) {
    return this.tenantService.findById(req.user.tenantId);
  }
}
