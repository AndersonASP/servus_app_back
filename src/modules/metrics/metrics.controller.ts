import { Controller, Get, Post, Param, Query, Req, Body } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // 📊 Registrar atividade do usuário (para middleware/interceptor)
  @Post('activity')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
    ],
  })
  async recordActivity(
    @Body() activityData: {
      activityType: 'login' | 'profile_update' | 'ministry_join' | 'event_participation' | 'interaction';
      description: string;
      metadata?: any;
      branchId?: string;
      ministryId?: string;
    },
    @Req() req: any,
  ) {
    // Extrair tenant do usuário atual
    const tenantId = req.user.tenantId || 'default';
    
    await this.metricsService.recordActivity(
      req.user._id,
      tenantId,
      activityData.activityType,
      activityData.description,
      activityData.metadata,
      {
        branchId: activityData.branchId,
        ministryId: activityData.ministryId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return { message: 'Atividade registrada com sucesso' };
  }

  // 📈 Métricas de engajamento do usuário atual
  @Get('user/engagement')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
    ],
  })
  async getUserEngagement(
    @Query() query: { period?: 'daily' | 'weekly' | 'monthly' },
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || 'default';
    const period = query.period || 'monthly';

    return this.metricsService.calculateUserEngagement(
      req.user._id,
      tenantId,
      period
    );
  }

  // 📋 Atividades do usuário atual
  @Get('user/activities')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
    ],
  })
  async getUserActivities(
    @Query() query: { 
      page?: string; 
      limit?: string; 
      type?: string; 
      startDate?: string; 
      endDate?: string; 
    },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.metricsService.getUserActivities(req.user._id, {
      page,
      limit,
      type: query.type,
      startDate,
      endDate,
    });
  }

  // 📊 Métricas do tenant (TenantAdmin)
  @Get('tenants/:tenantId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'param' } },
    ],
  })
  async getTenantMetrics(
    @Param('tenantId') tenantId: string,
    @Query() query: { period?: 'daily' | 'weekly' | 'monthly' },
    @Req() req: any,
  ) {
    const period = query.period || 'monthly';
    return this.metricsService.getTenantMetrics(tenantId, period);
  }

  // 📊 Métricas da branch (BranchAdmin)
  @Get('tenants/:tenantId/branches/:branchId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'param' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'param', branchParam: 'branchId' } },
    ],
  })
  async getBranchMetrics(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Query() query: { period?: 'daily' | 'weekly' | 'monthly' },
    @Req() req: any,
  ) {
    const period = query.period || 'monthly';
    return this.metricsService.getBranchMetrics(tenantId, branchId, period);
  }

  // 📈 Métricas de engajamento de usuário específico (Admin)
  @Get('tenants/:tenantId/users/:userId/engagement')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'param' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'param' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'param' } },
    ],
  })
  async getUserEngagementByAdmin(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query() query: { period?: 'daily' | 'weekly' | 'monthly' },
    @Req() req: any,
  ) {
    const period = query.period || 'monthly';
    return this.metricsService.calculateUserEngagement(userId, tenantId, period);
  }

  // 📊 Dashboard consolidado de métricas (TenantAdmin)
  @Get('tenants/:tenantId/dashboard')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'param' } },
    ],
  })
  async getMetricsDashboard(
    @Param('tenantId') tenantId: string,
    @Query() query: { period?: 'daily' | 'weekly' | 'monthly' },
    @Req() req: any,
  ) {
    const period = query.period || 'monthly';
    
    // Combinar métricas do tenant com dados adicionais
    const tenantMetrics = await this.metricsService.getTenantMetrics(tenantId, period);
    
    // Adicionar métricas comparativas (período anterior)
    let previousPeriod: 'daily' | 'weekly' | 'monthly';
    switch (period) {
      case 'daily':
        previousPeriod = 'daily'; // Dia anterior
        break;
      case 'weekly':
        previousPeriod = 'weekly'; // Semana anterior
        break;
      case 'monthly':
        previousPeriod = 'monthly'; // Mês anterior
        break;
    }

    return {
      current: tenantMetrics,
      period,
      summary: {
        totalUsers: tenantMetrics.totalUsers,
        activeUsers: tenantMetrics.activeUsers,
        engagementRate: tenantMetrics.engagementRate,
        newUsers: tenantMetrics.newUsers,
        topActivity: tenantMetrics.topActivities[0]?.type || 'N/A',
      },
      charts: {
        userGrowth: tenantMetrics.userGrowth,
        engagementTrends: tenantMetrics.engagementTrends,
        topActivities: tenantMetrics.topActivities,
      }
    };
  }
} 