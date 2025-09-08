import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { FunctionsService } from '../services/functions.service';
import { BulkUpsertFunctionsDto } from '../dto/bulk-upsert-functions.dto';
import { UpdateMinistryFunctionDto } from '../dto/update-ministry-function.dto';
import { BulkUpsertResponseDto, MinistryFunctionResponseDto } from '../dto/ministry-function-response.dto';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { PolicyGuard } from 'src/common/guards/policy.guard';
import { Role, MembershipRole } from 'src/common/enums/role.enum';
import type { TenantRequest } from 'src/common/middlewares/tenant.middleware';

@Controller()
@UseGuards(PolicyGuard)
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  /**
   * GET /functions?scope=tenant&ministryId=...&search=...
   * Lista catálogo do tenant com indicação se está habilitada no ministério
   */
  @Get('functions')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin] } },
      { membership: { roles: [MembershipRole.BranchAdmin] } },
      { membership: { roles: [MembershipRole.Leader] } }
    ]
  })
  async getTenantFunctions(
    @Query('scope') scope: string,
    @Request() req: TenantRequest,
    @Query('ministryId') ministryId?: string,
    @Query('search') search?: string
  ): Promise<MinistryFunctionResponseDto[]> {
    // Usar tenantSlug do middleware em vez de req.user.tenantId
    const tenantId = req.tenantSlug;
    
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    if (scope !== 'tenant') {
      throw new Error('Scope deve ser "tenant"');
    }
    
    return await this.functionsService.getTenantFunctions(
      tenantId,
      ministryId,
      search
    );
  }
}

@Controller('ministries')
@UseGuards(PolicyGuard)
export class MinistryFunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  /**
   * POST /ministries/{ministryId}/functions/bulk-upsert
   * Cria ou reutiliza funções e vincula ao ministério
   */
  @Post(':ministryId/functions/bulk-upsert')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin] } },
      { membership: { roles: [MembershipRole.BranchAdmin] } },
      { membership: { roles: [MembershipRole.Leader] } }
    ]
  })
  async bulkUpsertFunctions(
    @Param('ministryId') ministryId: string,
    @Body() dto: BulkUpsertFunctionsDto,
    @Request() req: TenantRequest
  ): Promise<BulkUpsertResponseDto> {
    // Usar tenantSlug do middleware em vez de req.user.tenantId
    const tenantId = req.tenantSlug;
    const userId = (req as any).user?.sub || (req as any).user?._id;
    
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    console.log(`🔄 Bulk upsert de funções para ministério ${ministryId}:`, dto.names);
    
    return await this.functionsService.bulkUpsertFunctions(
      tenantId,
      ministryId,
      dto,
      userId
    );
  }

  /**
   * GET /ministries/{ministryId}/functions
   * Lista funções habilitadas do ministério
   */
  @Get(':ministryId/functions')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin] } },
      { membership: { roles: [MembershipRole.BranchAdmin] } },
      { membership: { roles: [MembershipRole.Leader] } }
    ]
  })
  async getMinistryFunctions(
    @Param('ministryId') ministryId: string,
    @Request() req: TenantRequest,
    @Query('active') active?: string
  ): Promise<MinistryFunctionResponseDto[]> {
    // Usar tenantSlug do middleware em vez de req.user.tenantId
    const tenantId = req.tenantSlug;
    
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    const activeFilter = active === undefined ? undefined : active === 'true';
    
    return await this.functionsService.getMinistryFunctions(
      tenantId,
      ministryId,
      activeFilter
    );
  }

  /**
   * PATCH /ministries/{ministryId}/functions/{functionId}
   * Atualiza vínculo ministério-função
   */
  @Patch(':ministryId/functions/:functionId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin] } },
      { membership: { roles: [MembershipRole.BranchAdmin] } },
      { membership: { roles: [MembershipRole.Leader] } }
    ]
  })
  async updateMinistryFunction(
    @Param('ministryId') ministryId: string,
    @Param('functionId') functionId: string,
    @Body() dto: UpdateMinistryFunctionDto,
    @Request() req: TenantRequest
  ): Promise<MinistryFunctionResponseDto> {
    // Usar tenantSlug do middleware em vez de req.user.tenantId
    const tenantId = req.tenantSlug;
    
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    return await this.functionsService.updateMinistryFunction(
      tenantId,
      ministryId,
      functionId,
      dto
    );
  }
}
