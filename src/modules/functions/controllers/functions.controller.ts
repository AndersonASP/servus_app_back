import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query,
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FunctionsService } from '../services/functions.service';
import { BulkUpsertFunctionsDto } from '../dto/bulk-upsert-functions.dto';
import { UpdateMinistryFunctionDto } from '../dto/update-ministry-function.dto';
import { BulkUpsertResponseDto, MinistryFunctionResponseDto } from '../dto/ministry-function-response.dto';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { PolicyGuard } from 'src/common/guards/policy.guard';
import { Role, MembershipRole } from 'src/common/enums/role.enum';
import type { TenantRequest } from 'src/common/middlewares/tenant.middleware';
import { Membership } from '../../membership/schemas/membership.schema';

@Controller()
@UseGuards(PolicyGuard)
export class FunctionsController {
  constructor(
    private readonly functionsService: FunctionsService,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>
  ) {}

  /**
   * GET /functions?scope=tenant&ministryId=...&search=...
   * Lista catálogo do tenant com indicação se está habilitada no ministério
   */
  @Get('functions')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getTenantFunctions(
    @Query('scope') scope: string,
    @Request() req: TenantRequest,
    @Query('ministryId') ministryId?: string,
    @Query('search') search?: string
  ): Promise<MinistryFunctionResponseDto[]> {
    // Usar tenantSlug do middleware em vez de req.user.tenantId
    let tenantId = req.tenantSlug;
    const user = (req as any).user;
    const isServusAdmin = user?.role === 'servus_admin';
    
    if (scope !== 'tenant') {
      throw new BadRequestException('Scope deve ser "tenant"');
    }
    
    // Se não há tenantId, tentar buscar do usuário
    if (!tenantId) {
      if (isServusAdmin) {
        // Para ServusAdmin, buscar o primeiro tenant ativo
        const membership = await this.membershipModel
          .findOne({ isActive: true })
          .populate('tenant', 'tenantId')
          .lean();
        
        if (membership?.tenant) {
          tenantId = (membership.tenant as any).tenantId;
        }
      } else {
        // Para outros usuários, buscar tenant do primeiro membership ativo
        const membership = await this.membershipModel
          .findOne({ 
            user: user?.sub || user?._id,
            isActive: true 
          })
          .populate('tenant', 'tenantId')
          .lean();
        
        if (membership?.tenant) {
          tenantId = (membership.tenant as any).tenantId;
        }
      }
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
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
  constructor(
    private readonly functionsService: FunctionsService,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>
  ) {}

  /**
   * Busca tenantId do usuário quando não fornecido
   */
  private async findUserTenantId(req: TenantRequest): Promise<string | null> {
    const tenantId = req.tenantSlug;
    if (tenantId) return tenantId;

    const user = (req as any).user;
    const isServusAdmin = user?.role === 'servus_admin';

    if (isServusAdmin) {
      // Para ServusAdmin, buscar o primeiro tenant ativo
      const membership = await this.membershipModel
        .findOne({ isActive: true })
        .populate('tenant', 'tenantId')
        .lean();
      
      if (membership?.tenant) {
        return (membership.tenant as any).tenantId;
      }
    } else {
      // Para outros usuários, buscar tenant do primeiro membership ativo
      const membership = await this.membershipModel
        .findOne({ 
          user: user?.sub || user?._id,
          isActive: true 
        })
        .populate('tenant', 'tenantId')
        .lean();
      
      if (membership?.tenant) {
        return (membership.tenant as any).tenantId;
      }
    }

    return null;
  }

  /**
   * POST /ministries/{ministryId}/functions/bulk-upsert
   * Cria ou reutiliza funções e vincula ao ministério
   */
  @Post(':ministryId/functions/bulk-upsert')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async bulkUpsertFunctions(
    @Param('ministryId') ministryId: string,
    @Body() dto: BulkUpsertFunctionsDto,
    @Request() req: TenantRequest
  ): Promise<BulkUpsertResponseDto> {
    // Buscar tenantId do usuário
    const tenantId = await this.findUserTenantId(req);
    const userId = (req as any).user?.sub || (req as any).user?._id;
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
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
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getMinistryFunctions(
    @Param('ministryId') ministryId: string,
    @Request() req: TenantRequest,
    @Query('active') active?: string
  ): Promise<MinistryFunctionResponseDto[]> {
    // Buscar tenantId do usuário
    const tenantId = await this.findUserTenantId(req);
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
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
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async updateMinistryFunction(
    @Param('ministryId') ministryId: string,
    @Param('functionId') functionId: string,
    @Body() dto: UpdateMinistryFunctionDto,
    @Request() req: TenantRequest
  ): Promise<MinistryFunctionResponseDto> {
    // Buscar tenantId do usuário
    const tenantId = await this.findUserTenantId(req);
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }
    
    return await this.functionsService.updateMinistryFunction(
      tenantId,
      ministryId,
      functionId,
      dto
    );
  }
}
