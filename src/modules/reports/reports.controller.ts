import { Controller, Get, Post, Param, Query, Body, Req } from '@nestjs/common';
import { ReportsService, ReportFilter } from './services/reports.service';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 📊 Gerar relatório de usuários
  @Post('tenants/:tenantId/users')
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
    ],
  })
  async generateUsersReport(
    @Param('tenantId') tenantId: string,
    @Body() filters: Omit<ReportFilter, 'tenantId'>,
    @Req() req: any,
  ) {
    const reportFilters: ReportFilter = {
      ...filters,
      tenantId,
    };

    return this.reportsService.generateUsersReport(reportFilters);
  }

  // 📈 Gerar relatório de engajamento
  @Post('tenants/:tenantId/engagement')
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
    ],
  })
  async generateEngagementReport(
    @Param('tenantId') tenantId: string,
    @Body() filters: Omit<ReportFilter, 'tenantId'>,
    @Req() req: any,
  ) {
    const reportFilters: ReportFilter = {
      ...filters,
      tenantId,
    };

    return this.reportsService.generateEngagementReport(reportFilters);
  }

  // 📊 Gerar relatório de crescimento
  @Post('tenants/:tenantId/growth')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [MembershipRole.TenantAdmin],
          tenantFrom: 'param',
        },
      },
    ],
  })
  async generateGrowthReport(
    @Param('tenantId') tenantId: string,
    @Body() filters: Omit<ReportFilter, 'tenantId'>,
    @Req() req: any,
  ) {
    const reportFilters: ReportFilter = {
      ...filters,
      tenantId,
    };

    return this.reportsService.generateGrowthReport(reportFilters);
  }

  // 🎯 Gerar relatório personalizado
  @Post('tenants/:tenantId/custom')
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
    ],
  })
  async generateCustomReport(
    @Param('tenantId') tenantId: string,
    @Body()
    config: {
      type: string;
      filters: any;
      groupBy?: string;
      metrics: string[];
    },
    @Req() req: any,
  ) {
    return this.reportsService.generateCustomReport(tenantId, config);
  }

  // 💾 Salvar configuração de relatório
  @Post('tenants/:tenantId/save')
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
    ],
  })
  async saveReport(
    @Param('tenantId') tenantId: string,
    @Body()
    reportConfig: {
      name: string;
      description: string;
      type: 'users' | 'engagement' | 'activities' | 'growth' | 'custom';
      filters: Omit<ReportFilter, 'tenantId'>;
      groupBy?: 'branch' | 'ministry' | 'role' | 'date' | 'skills';
      metrics: string[];
      visualization: 'table' | 'chart' | 'dashboard';
      schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        enabled: boolean;
      };
    },
    @Req() req: any,
  ) {
    const config = {
      ...reportConfig,
      filters: {
        ...reportConfig.filters,
        tenantId,
      },
      createdBy: req.user.email,
    };

    return this.reportsService.saveReportConfig(config);
  }

  // 📋 Listar relatórios salvos
  @Get('tenants/:tenantId/saved')
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
  async getSavedReports(
    @Param('tenantId') tenantId: string,
    @Query() query: { createdBy?: string },
    @Req() req: any,
  ) {
    // Leaders só podem ver seus próprios relatórios
    const createdBy =
      req.user.role === Role.ServusAdmin ||
      req.user.memberships?.some((m: any) =>
        ['tenant_admin', 'branch_admin'].includes(m.role),
      )
        ? query.createdBy
        : req.user.email;

    return this.reportsService.getSavedReports(tenantId, createdBy);
  }

  // 🔄 Executar relatório salvo
  @Get('saved/:reportId/execute')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
          ],
          tenantFrom: 'user',
        },
      },
    ],
  })
  async executeReport(@Param('reportId') reportId: string, @Req() req: any) {
    return this.reportsService.executeReport(reportId);
  }

  // 📊 Relatórios pré-definidos populares
  @Get('tenants/:tenantId/templates')
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
    ],
  })
  async getReportTemplates(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
  ) {
    return [
      {
        id: 'users_overview',
        name: 'Visão Geral de Usuários',
        description: 'Relatório completo de todos os usuários do tenant',
        type: 'users',
        metrics: ['total', 'active', 'by_role', 'by_branch'],
        visualization: 'dashboard',
      },
      {
        id: 'engagement_analysis',
        name: 'Análise de Engajamento',
        description: 'Análise detalhada do engajamento dos usuários',
        type: 'engagement',
        metrics: ['profile_completion', 'activity_score', 'last_activity'],
        visualization: 'chart',
      },
      {
        id: 'monthly_growth',
        name: 'Crescimento Mensal',
        description: 'Relatório de crescimento de usuários no último mês',
        type: 'growth',
        metrics: ['new_users', 'total_growth', 'growth_rate'],
        visualization: 'chart',
      },
      {
        id: 'skills_inventory',
        name: 'Inventário de Habilidades',
        description: 'Análise das habilidades disponíveis na organização',
        type: 'custom',
        customType: 'skills_analysis',
        metrics: ['top_skills', 'skills_by_role', 'skills_distribution'],
        visualization: 'dashboard',
      },
      {
        id: 'ministry_participation',
        name: 'Participação em Ministérios',
        description: 'Relatório de participação em ministérios por filial',
        type: 'custom',
        customType: 'ministry_participation',
        metrics: [
          'participation_rate',
          'leaders_vs_volunteers',
          'growth_by_ministry',
        ],
        visualization: 'table',
      },
      {
        id: 'branch_comparison',
        name: 'Comparação entre Filiais',
        description: 'Análise comparativa entre diferentes filiais',
        type: 'custom',
        customType: 'users_by_branch',
        metrics: [
          'users_per_branch',
          'engagement_by_branch',
          'growth_by_branch',
        ],
        visualization: 'chart',
      },
    ];
  }

  // 🎯 Executar template de relatório
  @Post('tenants/:tenantId/templates/:templateId/execute')
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
    ],
  })
  async executeReportTemplate(
    @Param('tenantId') tenantId: string,
    @Param('templateId') templateId: string,
    @Req() req: any,
    @Body() customFilters?: Partial<ReportFilter>,
  ) {
    // Configurações padrão para cada template
    const templateConfigs: { [key: string]: any } = {
      users_overview: {
        type: 'users',
        filters: { ...customFilters },
      },
      engagement_analysis: {
        type: 'engagement',
        filters: { ...customFilters },
      },
      monthly_growth: {
        type: 'growth',
        filters: {
          ...customFilters,
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
        },
      },
      skills_inventory: {
        type: 'skills_analysis',
        filters: { ...customFilters },
      },
      ministry_participation: {
        type: 'ministry_participation',
        filters: { ...customFilters },
      },
      branch_comparison: {
        type: 'users_by_branch',
        filters: { ...customFilters },
      },
    };

    const config = templateConfigs[templateId];
    if (!config) {
      throw new Error('Template de relatório não encontrado');
    }

    if (config.type === 'users') {
      return this.reportsService.generateUsersReport({
        tenantId,
        ...config.filters,
      });
    } else if (config.type === 'engagement') {
      return this.reportsService.generateEngagementReport({
        tenantId,
        ...config.filters,
      });
    } else if (config.type === 'growth') {
      return this.reportsService.generateGrowthReport({
        tenantId,
        ...config.filters,
      });
    } else {
      return this.reportsService.generateCustomReport(tenantId, {
        type: config.type,
        filters: config.filters,
        metrics: [],
      });
    }
  }
}
