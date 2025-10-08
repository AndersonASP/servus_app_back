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
  HttpStatus,
} from '@nestjs/common';
import { VolunteerAvailabilityService } from '../services/volunteer-availability.service';
import { SubstitutionService } from '../services/substitution.service';
import { ServiceHistoryService } from '../services/service-history.service';
import { ScaleAssignmentEngine } from '../services/scale-assignment-engine.service';
import {
  CreateVolunteerAvailabilityDto,
  UpdateVolunteerAvailabilityDto,
  ListVolunteerAvailabilityDto,
} from '../dto/volunteer-availability.dto';
import {
  CreateSubstitutionRequestDto,
  RespondToSubstitutionRequestDto,
  ListSubstitutionRequestDto,
} from '../dto/substitution-request.dto';
import {
  CreateServiceHistoryDto,
  UpdateServiceHistoryDto,
  ListServiceHistoryDto,
} from '../dto/service-history.dto';
import { RequiresPerm } from '../../../common/decorators/requires-perm.decorator';
import { PERMS } from '../../../common/enums/role.enum';

@Controller('scales/:tenantId')
export class ScalesAdvancedController {
  constructor(
    private readonly volunteerAvailabilityService: VolunteerAvailabilityService,
    private readonly substitutionService: SubstitutionService,
    private readonly serviceHistoryService: ServiceHistoryService,
    private readonly scaleAssignmentEngine: ScaleAssignmentEngine,
  ) {}

  // ========================================
  // 📅 DISPONIBILIDADE DE VOLUNTÁRIOS
  // ========================================

  @Post('availability')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async createOrUpdateAvailability(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateVolunteerAvailabilityDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result =
      await this.volunteerAvailabilityService.createOrUpdateAvailability(
        tenantId,
        dto,
        userId,
      );

    return res.status(HttpStatus.CREATED).json({
      success: true,
      data: result,
      message: 'Disponibilidade atualizada com sucesso',
    });
  }

  @Patch('availability/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async updateAvailability(
    @Param('tenantId') tenantId: string,
    @Param('id') availabilityId: string,
    @Body() dto: UpdateVolunteerAvailabilityDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.volunteerAvailabilityService.updateAvailability(
      tenantId,
      availabilityId,
      dto,
      userId,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Disponibilidade atualizada com sucesso',
    });
  }

  @Post('availability/block-date')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
    PERMS.UPDATE_OWN_AVAILABILITY, // ✅ Permitir voluntários bloquearem suas próprias datas
  ])
  async blockDate(
    @Param('tenantId') tenantId: string,
    @Body()
    body: { userId: string; ministryId: string; date: string; reason: string },
    @Req() req: any,
    @Res() res: any,
  ) {
    const currentUserId = req.user?.sub;
    
    console.log('🔍 [ScalesAdvancedController] ===== BLOCK DATE INICIADO =====');
    console.log('🔍 [ScalesAdvancedController] TenantId: ', tenantId);
    console.log('🔍 [ScalesAdvancedController] Body: ', body);
    console.log('🔍 [ScalesAdvancedController] CurrentUserId: ', currentUserId);
    console.log('🔍 [ScalesAdvancedController] User permissions: ', req.user?.permissions);

    // ✅ Verificar se o usuário está tentando bloquear sua própria data
    if (body.userId !== currentUserId) {
      console.log('⚠️ [ScalesAdvancedController] Usuário tentando bloquear data de outro usuário');
      // Se não for a própria data, verificar se tem permissões de admin/leader
      const hasAdminPerms = req.user?.permissions?.some((perm: string) =>
        [
          PERMS.MANAGE_ALL_TENANTS,
          PERMS.MANAGE_BRANCH_SCALES,
          PERMS.MANAGE_MINISTRY_SCALES,
        ].includes(perm as any),
      );

      if (!hasAdminPerms) {
        console.log('❌ [ScalesAdvancedController] Usuário sem permissões de admin');
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Você só pode bloquear suas próprias datas',
          error: 'Forbidden',
          statusCode: 403,
        });
      }
    }

    try {
      console.log('🔍 [ScalesAdvancedController] Chamando volunteerAvailabilityService.blockDate...');
      const result = await this.volunteerAvailabilityService.blockDate(
        tenantId,
        body.userId,
        body.ministryId,
        new Date(body.date),
        body.reason,
      );

      console.log('✅ [ScalesAdvancedController] Bloqueio realizado com sucesso');
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        message: 'Data bloqueada com sucesso',
      });
    } catch (error) {
      console.log('❌ [ScalesAdvancedController] Erro no bloqueio: ', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Erro ao bloquear data',
        error: error.message,
      });
    }
  }

  @Post('availability/unblock-date')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
    PERMS.UPDATE_OWN_AVAILABILITY, // ✅ Permitir voluntários desbloquearem suas próprias datas
  ])
  async unblockDate(
    @Param('tenantId') tenantId: string,
    @Body() body: { userId: string; ministryId: string; date: string },
    @Req() req: any,
    @Res() res: any,
  ) {
    const currentUserId = req.user?.sub;

    // ✅ Verificar se o usuário está tentando desbloquear sua própria data
    if (body.userId !== currentUserId) {
      // Se não for a própria data, verificar se tem permissões de admin/leader
      const hasAdminPerms = req.user?.permissions?.some((perm: string) =>
        [
          PERMS.MANAGE_ALL_TENANTS,
          PERMS.MANAGE_BRANCH_SCALES,
          PERMS.MANAGE_MINISTRY_SCALES,
        ].includes(perm as any),
      );

      if (!hasAdminPerms) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Você só pode desbloquear suas próprias datas',
          error: 'Forbidden',
          statusCode: 403,
        });
      }
    }

    const result = await this.volunteerAvailabilityService.unblockDate(
      tenantId,
      body.userId,
      body.ministryId,
      new Date(body.date),
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Data desbloqueada com sucesso',
    });
  }

  @Get('availability/unavailabilities')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
    PERMS.UPDATE_OWN_AVAILABILITY,
  ])
  async getUnavailabilities(
    @Param('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Req() req: any,
    @Res() res: any,
    @Query('ministryId') ministryId?: string,
  ) {
    const currentUserId = req.user?.sub;
    
    // Verificar se o usuário pode ver estas indisponibilidades
    if (userId !== currentUserId) {
      const hasAdminPerms = req.user?.permissions?.some((perm: string) => 
        [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCALES, PERMS.MANAGE_MINISTRY_SCALES].includes(perm as any)
      );
      
      if (!hasAdminPerms) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Você só pode ver suas próprias indisponibilidades',
        });
      }
    }

    try {
      const result = await this.volunteerAvailabilityService.getVolunteerUnavailabilities(
        tenantId,
        userId,
        ministryId,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        message: 'Indisponibilidades listadas com sucesso',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao listar indisponibilidades',
      });
    }
  }

  @Get('availability/check-date')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
    PERMS.UPDATE_OWN_AVAILABILITY,
  ])
  async checkDate(
    @Param('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('ministryId') ministryId: string,
    @Query('date') date: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const currentUserId = req.user?.sub;
    
    // Verificar se o usuário pode verificar esta data
    if (userId !== currentUserId) {
      const hasAdminPerms = req.user?.permissions?.some((perm: string) => 
        [PERMS.MANAGE_ALL_TENANTS, PERMS.MANAGE_BRANCH_SCALES, PERMS.MANAGE_MINISTRY_SCALES].includes(perm as any)
      );
      
      if (!hasAdminPerms) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Você só pode verificar suas próprias datas',
        });
      }
    }

    try {
      const isBlocked = await this.volunteerAvailabilityService.isDateBlocked(
        tenantId,
        userId,
        ministryId,
        new Date(date),
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        data: { isBlocked },
        message: 'Verificação realizada com sucesso',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao verificar data',
      });
    }
  }

  @Get('availability')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async listAvailability(
    @Param('tenantId') tenantId: string,
    @Query() query: ListVolunteerAvailabilityDto,
    @Res() res: any,
  ) {
    const result = await this.volunteerAvailabilityService.listAvailability(
      tenantId,
      query,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Disponibilidades listadas com sucesso',
    });
  }

  @Get('availability/check/:userId/:ministryId/:date')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async checkAvailability(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Param('date') date: string,
    @Res() res: any,
  ) {
    const result =
      await this.volunteerAvailabilityService.checkVolunteerAvailability(
        tenantId,
        userId,
        ministryId,
        new Date(date),
      );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Disponibilidade verificada',
    });
  }

  @Get('availability/monthly-info/:userId/:ministryId')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async getMonthlyBlockedDaysInfo(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: any,
  ) {
    const result =
      await this.volunteerAvailabilityService.getMonthlyBlockedDaysInfo(
        tenantId,
        userId,
        ministryId,
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined,
      );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Informações mensais obtidas',
    });
  }

  // ========================================
  // 🔄 SOLICITAÇÕES DE TROCA
  // ========================================

  @Get('swap/candidates/:scaleId/:requesterId')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async findSwapCandidates(
    @Param('tenantId') tenantId: string,
    @Param('scaleId') scaleId: string,
    @Param('requesterId') requesterId: string,
    @Res() res: any,
  ) {
    const result = await this.substitutionService.findSwapCandidates(
      tenantId,
      scaleId,
      requesterId,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Candidatos para troca encontrados',
    });
  }

  @Post('swap/request')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async createSwapRequest(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateSubstitutionRequestDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const requesterId = req.user?.sub;
    if (!requesterId) throw new Error('userId ausente');

    const result = await this.substitutionService.createSwapRequest(
      tenantId,
      requesterId,
      dto,
    );

    return res.status(HttpStatus.CREATED).json({
      success: result.success,
      data: result,
      message: result.message,
    });
  }

  @Patch('swap/request/:swapRequestId/respond')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async respondToSwapRequest(
    @Param('tenantId') tenantId: string,
    @Param('swapRequestId') swapRequestId: string,
    @Body() dto: RespondToSubstitutionRequestDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const targetId = req.user?.sub;
    if (!targetId) throw new Error('userId ausente');

    const result = await this.substitutionService.respondToSwapRequest(
      tenantId,
      swapRequestId,
      targetId,
      dto,
    );

    return res.status(HttpStatus.OK).json({
      success: result.success,
      data: result,
      message: result.message,
    });
  }

  @Patch('swap/request/:swapRequestId/cancel')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async cancelSwapRequest(
    @Param('tenantId') tenantId: string,
    @Param('swapRequestId') swapRequestId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const requesterId = req.user?.sub;
    if (!requesterId) throw new Error('userId ausente');

    const result = await this.substitutionService.cancelSwapRequest(
      tenantId,
      swapRequestId,
      requesterId,
    );

    return res.status(HttpStatus.OK).json({
      success: result.success,
      data: result,
      message: result.message,
    });
  }

  @Get('swap/requests')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async listSwapRequests(
    @Param('tenantId') tenantId: string,
    @Query() query: ListSubstitutionRequestDto,
    @Res() res: any,
  ) {
    const result = await this.substitutionService.listSwapRequests(
      tenantId,
      query,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Solicitações de troca listadas',
    });
  }

  @Get('swap/requests/pending')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async getPendingRequestsForUser(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.substitutionService.getPendingRequestsForUser(
      tenantId,
      userId,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Solicitações pendentes obtidas',
    });
  }

  @Get('swap/requests/sent')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async getSentRequestsByUser(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('userId ausente');

    const result = await this.substitutionService.getSentRequestsByUser(
      tenantId,
      userId,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Solicitações enviadas obtidas',
    });
  }

  // ========================================
  // 📊 HISTÓRICO DE SERVIÇOS
  // ========================================

  @Post('service-history')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async createServiceHistory(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateServiceHistoryDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const recordedBy = req.user?.sub;

    const result = await this.serviceHistoryService.createServiceHistory(
      tenantId,
      dto,
      recordedBy,
    );

    return res.status(HttpStatus.CREATED).json({
      success: true,
      data: result,
      message: 'Histórico de serviço criado',
    });
  }

  @Patch('service-history/:id')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async updateServiceHistory(
    @Param('tenantId') tenantId: string,
    @Param('id') historyId: string,
    @Body() dto: UpdateServiceHistoryDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const updatedBy = req.user?.sub;

    const result = await this.serviceHistoryService.updateServiceHistory(
      tenantId,
      historyId,
      dto,
      updatedBy,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Histórico de serviço atualizado',
    });
  }

  @Get('service-history')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async listServiceHistory(
    @Param('tenantId') tenantId: string,
    @Query() query: ListServiceHistoryDto,
    @Res() res: any,
  ) {
    const result = await this.serviceHistoryService.listServiceHistory(
      tenantId,
      query,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Histórico de serviços listado',
    });
  }

  @Get('service-history/stats/volunteer/:userId')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.VIEW_SCALES,
  ])
  async getVolunteerServiceStats(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('ministryId') ministryId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: any,
  ) {
    const result = await this.serviceHistoryService.getVolunteerServiceStats(
      tenantId,
      userId,
      ministryId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Estatísticas do voluntário obtidas',
    });
  }

  @Get('service-history/stats/ministry/:ministryId')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async getMinistryServiceStats(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: any,
  ) {
    const result = await this.serviceHistoryService.getMinistryServiceStats(
      tenantId,
      ministryId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Estatísticas do ministério obtidas',
    });
  }

  // ========================================
  // 🎯 GERAÇÃO DE ESCALAS
  // ========================================

  @Post('generate-assignments/:scaleId')
  @RequiresPerm([
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_MINISTRY_SCALES,
  ])
  async generateScaleAssignments(
    @Param('tenantId') tenantId: string,
    @Param('scaleId') scaleId: string,
    @Res() res: any,
  ) {
    const result = await this.scaleAssignmentEngine.generateScaleAssignments(
      scaleId,
      tenantId,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: 'Sugestões de escalação geradas',
    });
  }
}
