import { Body, Controller, Get, Param, Post, Delete, Req, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { BranchService } from '../services/branches.service';
import { CreateBranchDto } from '../DTO/create-branches.dto';
import { CreateBranchWithAdminDto } from '../DTO/create-branch-with-admin.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';

@Controller('tenants/:tenantId/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // Criar branch – ServusAdmin OU TenantAdmin do tenant
  @Post()
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBranchDto,
  ) {
    // se quiser registrar quem criou, injete do req via interceptor/guard
    return this.branchService.create(dto, 'emaildequemcriou@gmail.com', tenantId);
  }

  // 🏪 TenantAdmin/ServusAdmin: Criar Branch + BranchAdmin (opcional)
  @Post('with-admin')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  async createWithAdmin(
    @Param('tenantId') tenantId: string,
    @Body() createBranchWithAdminDto: CreateBranchWithAdminDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const createdBy = req.user.email;
    const creatorRole = req.user.role;
    
    // Buscar memberships do usuário atual
    const creatorMemberships = await this.branchService.getUserMemberships(req.user.sub);

    const result = await this.branchService.createWithAdmin(
      createBranchWithAdminDto,
      createdBy,
      creatorRole,
      creatorMemberships,
      tenantId,
    );

    // Retornar 201 com Location header
    return res.status(HttpStatus.CREATED)
      .header('Location', `/tenants/${tenantId}/branches/${result.branch.branchId}`)
      .json(result);
  }

  // Listar branches do tenant – ServusAdmin OU TenantAdmin do tenant
  @Get()
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  async list(@Param('tenantId') tenantId: string) {
    return this.branchService.findAll(tenantId);
  }

  // Detalhe da branch – ServusAdmin OU TenantAdmin do tenant OU BranchAdmin da própria branch
  @Get('detail/:branchId')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES, PERMS.MANAGE_BRANCH])
  async getBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.branchService.findById(branchId);
  }

  // Desativar branch – ServusAdmin OU TenantAdmin do tenant
  @Delete(':branchId')
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.branchService.deactivate(branchId);
  }
}