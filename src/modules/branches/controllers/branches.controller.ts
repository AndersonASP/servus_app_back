import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Req,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BranchService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branches.dto';
import { CreateBranchWithAdminDto } from '../dto/create-branch-with-admin.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { BranchFilterDto } from '../dto/branch-filter.dto';
import { AssignAdminDto } from '../dto/assign-admin.dto';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { PERMS } from 'src/common/enums/role.enum';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('tenants/:tenantId/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // Criar branch – ServusAdmin OU TenantAdmin do tenant
  @Post()
  @ApiOperation({
    summary: 'Criar nova filial',
    description:
      'Cria uma nova filial para o tenant. Apenas tenant_admin pode criar filiais.',
  })
  @ApiResponse({
    status: 201,
    description: 'Filial criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou limite de filiais atingido',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para criar filiais',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Para servus_admin, permitir acesso a qualquer tenant
    if (req.user.role !== 'servus_admin') {
      const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
        req.user,
        { dtoTenantId: tenantId },
      );
      if (resolvedTenantId && resolvedTenantId !== tenantId) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'Acesso negado ao tenant especificado',
        });
      }
    }

    const result = await this.branchService.create(dto, req.user.sub, tenantId);

    return res
      .status(HttpStatus.CREATED)
      .header('Location', `/tenants/${tenantId}/branches/${result.branchId}`)
      .json(result);
  }

  // 🏪 TenantAdmin/ServusAdmin: Criar Branch + BranchAdmin (opcional)
  @Post('with-admin')
  @ApiOperation({
    summary: 'Criar filial com administrador',
    description:
      'Cria uma nova filial e opcionalmente um administrador para ela.',
  })
  @ApiResponse({
    status: 201,
    description: 'Filial e administrador criados com sucesso',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async createWithAdmin(
    @Param('tenantId') tenantId: string,
    @Body() createBranchWithAdminDto: CreateBranchWithAdminDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Para servus_admin, permitir acesso a qualquer tenant
    if (req.user.role !== 'servus_admin') {
      const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
        req.user,
        { dtoTenantId: tenantId },
      );
      if (resolvedTenantId && resolvedTenantId !== tenantId) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'Acesso negado ao tenant especificado',
        });
      }
    }

    const createdBy = req.user.sub;
    const creatorRole = req.user.role;

    // Buscar memberships do usuário atual
    const creatorMemberships = await this.branchService.getUserMemberships(
      req.user.sub,
    );

    const result = await this.branchService.createWithAdmin(
      createBranchWithAdminDto,
      createdBy,
      creatorRole,
      creatorMemberships,
      tenantId,
    );

    // Retornar 201 com Location header
    return res
      .status(HttpStatus.CREATED)
      .header(
        'Location',
        `/tenants/${tenantId}/branches/${result.branch.branchId}`,
      )
      .json(result);
  }

  // Listar branches do tenant – ServusAdmin OU TenantAdmin do tenant
  @Get()
  @ApiOperation({
    summary: 'Listar filiais do tenant',
    description:
      'Lista todas as filiais ativas do tenant com filtros opcionais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de filiais retornada com sucesso',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() filters: BranchFilterDto,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.findAll(tenantId, filters);
  }

  // Detalhe da branch – ServusAdmin OU TenantAdmin do tenant OU BranchAdmin da própria branch
  @Get(':branchId')
  @ApiOperation({
    summary: 'Obter detalhes da filial',
    description: 'Retorna os detalhes completos de uma filial específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da filial retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Filial não encontrada',
  })
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCHES,
    PERMS.MANAGE_BRANCH,
  ])
  @Authorize({ anyOf: [] })
  async getBranch(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.findById(branchId, tenantId);
  }

  // Atualizar branch – ServusAdmin OU TenantAdmin do tenant
  @Put(':branchId')
  @ApiOperation({
    summary: 'Atualizar filial',
    description: 'Atualiza os dados de uma filial existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filial atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Filial não encontrada',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.update(branchId, updateBranchDto, req.user.sub);
  }

  // Vincular administrador à filial
  @Post(':branchId/assign-admin')
  @ApiOperation({
    summary: 'Vincular administrador à filial',
    description:
      'Vincula um usuário existente ou cria um novo administrador para a filial.',
  })
  @ApiResponse({
    status: 200,
    description: 'Administrador vinculado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Filial ou usuário não encontrado',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async assignAdmin(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Body() assignAdminDto: AssignAdminDto,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.assignAdmin(
      branchId,
      assignAdminDto,
      req.user.sub,
    );
  }

  // Desativar branch – ServusAdmin OU TenantAdmin do tenant
  @Delete(':branchId')
  @ApiOperation({
    summary: 'Desativar filial',
    description:
      'Desativa uma filial (soft delete). Apenas tenant_admin pode desativar filiais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filial desativada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Filial não encontrada',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.deactivate(branchId, req.user.sub);
  }

  // Remover branch permanentemente – ServusAdmin OU TenantAdmin do tenant
  @Delete(':branchId/permanent')
  @ApiOperation({
    summary: 'Remover filial permanentemente',
    description:
      'Remove uma filial permanentemente do sistema. Apenas tenant_admin pode remover filiais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filial removida permanentemente',
  })
  @ApiResponse({
    status: 404,
    description: 'Filial não encontrada',
  })
  @RequiresPerm([PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCHES])
  @Authorize({ anyOf: [] })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Req() req: any,
  ) {
    const { tenantId: resolvedTenantId } = resolveTenantAndBranchScope(
      req.user,
    );
    if (resolvedTenantId !== tenantId) {
      throw new Error('Acesso negado ao tenant especificado');
    }

    return this.branchService.remove(branchId, req.user.sub);
  }
}
