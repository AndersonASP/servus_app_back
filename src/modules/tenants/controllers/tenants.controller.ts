import { Body, Controller, Get, Param, Post, Delete, Req, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { TenantService } from '../services/tenants.service';
import { CreateTenantDto } from '../DTO/create-tenant.dto';
import { CreateTenantWithAdminDto } from '../DTO/create-tenant-with-admin.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ✅ Apenas SuperAdmin pode criar tenants
  @Post()
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async create(@Body() dto: CreateTenantDto, @Req() req: any) {
    return this.tenantService.create(dto, req.user.email);
  }

  // 🏢 ServusAdmin: Criar Tenant + TenantAdmin (opcional)
  @Post('with-admin')
  @RequiresPerm(PERMS.MANAGE_ALL_TENANTS)
  async createWithAdmin(
    @Body() createTenantWithAdminDto: CreateTenantWithAdminDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const createdBy = req.user.email;
    const creatorRole = req.user.role;

    const result = await this.tenantService.createWithAdmin(
      createTenantWithAdminDto,
      createdBy,
      creatorRole,
    );

    // Retornar 201 com Location header
    return res.status(HttpStatus.CREATED)
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

  // ✅ ServusAdmin ou TenantAdmin (do próprio tenant) podem consultar o "meu tenant"
  @Get('me')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_TENANT])
  async findMyTenant(@Req() req: any) {
    return this.tenantService.findById(req.user.tenantId);
  }
}