import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Req
} from '@nestjs/common';
import { TenantService } from '../services/tenants.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateTenantDto } from '../DTO/create-tenant.dto';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ✅ Apenas SuperAdmin pode criar tenants
  @Post()
  @Roles(Role.SuperAdmin)
  async create(@Body() createTenantDto: CreateTenantDto, @Req() req: any) {
    return this.tenantService.create(createTenantDto, req.user.email);
  }

  // ✅ SuperAdmin pode listar todos
  @Get()
  @Roles(Role.SuperAdmin)
  async list() {
    return this.tenantService.findAll();
  }

  // ✅ SuperAdmin acessa qualquer tenant
  @Get(':tenantId')
  @Roles(Role.SuperAdmin)
  async getTenant(@Param('tenantId') tenantId: string) {
    return this.tenantService.findById(tenantId);
  }

  // ✅ SuperAdmin pode desativar qualquer tenant
  @Delete(':tenantId')
  @Roles(Role.SuperAdmin)
  async deactivate(@Param('tenantId') tenantId: string) {
    return this.tenantService.deactivate(tenantId);
  }

  // ✅ Admin ou SuperAdmin pega seu próprio tenant
  @Get('me')
  @Roles(Role.SuperAdmin, Role.Admin)
  async findMyTenant(@Req() req: any) {
    return this.tenantService.findById(req.user.tenantId);
  }
}