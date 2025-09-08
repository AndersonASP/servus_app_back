import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';
import { ExportService } from 'src/modules/users/services/export.service';

export interface ReportFilter {
  tenantId: string;
  branchIds?: string[];
  ministryIds?: string[];
  roles?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  userStatus?: 'active' | 'inactive' | 'all';
  profileCompleted?: boolean;
  skills?: string[];
  availability?: string[];
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'users' | 'engagement' | 'activities' | 'growth' | 'custom';
  filters: ReportFilter;
  groupBy?: 'branch' | 'ministry' | 'role' | 'date' | 'skills';
  metrics: string[];
  visualization: 'table' | 'chart' | 'dashboard';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
  };
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
}

@Injectable()
export class ReportsService {
  private savedReports: ReportConfig[] = []; // Em produção, usar MongoDB

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private memModel: Model<Membership>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    private exportService: ExportService,
  ) {}

  // 📊 Gerar relatório de usuários
  async generateUsersReport(filters: ReportFilter): Promise<{
    data: any[];
    summary: any;
    charts?: any;
  }> {
    // Construir query base
    const matchStage: any = {
      tenant: new Types.ObjectId(filters.tenantId),
      isActive: filters.userStatus !== 'inactive',
    };

    if (filters.userStatus === 'inactive') {
      matchStage.isActive = false;
    }

    if (filters.branchIds?.length) {
      matchStage.branch = {
        $in: filters.branchIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters.ministryIds?.length) {
      matchStage.ministry = {
        $in: filters.ministryIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters.roles?.length) {
      matchStage.role = { $in: filters.roles };
    }

    if (filters.dateRange) {
      matchStage.createdAt = {
        $gte: filters.dateRange.startDate,
        $lte: filters.dateRange.endDate,
      };
    }

    // Agregação principal
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      { $unwind: { path: '$ministryData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$userData._id',
          name: '$userData.name',
          email: '$userData.email',
          phone: '$userData.phone',
          role: '$role',
          branch: '$branchData.name',
          ministry: '$ministryData.name',
          profileCompleted: '$userData.profileCompleted',
          skills: '$userData.skills',
          availability: '$userData.availability',
          createdAt: '$createdAt',
          isActive: '$isActive',
        },
      },
    ];

    // Aplicar filtros adicionais
    if (filters.profileCompleted !== undefined) {
      pipeline.push({
        $match: { profileCompleted: filters.profileCompleted },
      });
    }

    if (filters.skills?.length) {
      pipeline.push({
        $match: {
          skills: { $in: filters.skills },
        },
      });
    }

    const data = await this.memModel.aggregate(pipeline);

    // Calcular resumo
    const summary = this.calculateUsersSummary(data);

    return {
      data,
      summary,
      charts: this.generateUsersCharts(data),
    };
  }

  // 📈 Gerar relatório de engajamento
  async generateEngagementReport(filters: ReportFilter): Promise<{
    data: any[];
    summary: any;
    charts: any;
  }> {
    // Buscar usuários do tenant/branch/ministry
    const usersQuery: any = { tenant: filters.tenantId, isActive: true };

    if (filters.branchIds?.length) {
      usersQuery.branch = { $in: filters.branchIds };
    }

    if (filters.ministryIds?.length) {
      usersQuery.ministry = { $in: filters.ministryIds };
    }

    const memberships = await this.memModel
      .find(usersQuery)
      .populate('user', 'name email profileCompleted')
      .populate('branch', 'name')
      .populate('ministry', 'name');

    const engagementData = memberships.map((membership) => {
      const user = membership.user as any;
      const profileScore = this.calculateProfileScore(user);
      const engagementLevel = this.calculateEngagementLevel(profileScore);

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: membership.role,
        branch: (membership.branch as any)?.name || 'N/A',
        ministry: (membership.ministry as any)?.name || 'N/A',
        profileScore,
        engagementLevel,
        profileCompleted: user.profileCompleted,
        lastActivity: new Date(), // Simular - em produção, buscar da atividade
        activeDays: Math.floor(Math.random() * 30), // Simular
        interactionScore: Math.floor(Math.random() * 100), // Simular
      };
    });

    const summary = this.calculateEngagementSummary(engagementData);

    return {
      data: engagementData,
      summary,
      charts: this.generateEngagementCharts(engagementData),
    };
  }

  // 📊 Gerar relatório de crescimento
  async generateGrowthReport(filters: ReportFilter): Promise<{
    data: any[];
    summary: any;
    charts: any;
  }> {
    const startDate =
      filters.dateRange?.startDate ||
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = filters.dateRange?.endDate || new Date();

    // Crescimento por dia
    const growthData: Array<{
      date: string;
      newUsers: number;
      totalUsers: number;
      growthRate: number;
    }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

      const newUsersCount = await this.memModel.countDocuments({
        tenant: filters.tenantId,
        createdAt: { $gte: dayStart, $lt: dayEnd },
        ...(filters.branchIds?.length && {
          branch: { $in: filters.branchIds },
        }),
        ...(filters.roles?.length && { role: { $in: filters.roles } }),
      });

      const totalUsersCount = await this.memModel.countDocuments({
        tenant: filters.tenantId,
        createdAt: { $lte: dayEnd },
        isActive: true,
        ...(filters.branchIds?.length && {
          branch: { $in: filters.branchIds },
        }),
        ...(filters.roles?.length && { role: { $in: filters.roles } }),
      });

      growthData.push({
        date: currentDate.toISOString().split('T')[0],
        newUsers: newUsersCount,
        totalUsers: totalUsersCount,
        growthRate:
          growthData.length > 0
            ? ((totalUsersCount -
                growthData[growthData.length - 1].totalUsers) /
                growthData[growthData.length - 1].totalUsers) *
              100
            : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const summary = this.calculateGrowthSummary(growthData);

    return {
      data: growthData,
      summary,
      charts: this.generateGrowthCharts(growthData),
    };
  }

  // 💾 Salvar configuração de relatório
  async saveReportConfig(
    config: Omit<ReportConfig, 'id' | 'createdAt'>,
  ): Promise<ReportConfig> {
    const reportConfig: ReportConfig = {
      ...config,
      id: this.generateId(),
      createdAt: new Date(),
    };

    this.savedReports.push(reportConfig);

    console.log(
      `💾 Relatório salvo: ${reportConfig.name} por ${reportConfig.createdBy}`,
    );

    return reportConfig;
  }

  // 📋 Listar relatórios salvos
  async getSavedReports(
    tenantId: string,
    createdBy?: string,
  ): Promise<ReportConfig[]> {
    return this.savedReports.filter((report) => {
      const matchesTenant = report.filters.tenantId === tenantId;
      const matchesCreator = !createdBy || report.createdBy === createdBy;
      return matchesTenant && matchesCreator;
    });
  }

  // 🔄 Executar relatório salvo
  async executeReport(reportId: string): Promise<any> {
    const report = this.savedReports.find((r) => r.id === reportId);
    if (!report) {
      throw new Error('Relatório não encontrado');
    }

    let result;
    switch (report.type) {
      case 'users':
        result = await this.generateUsersReport(report.filters);
        break;
      case 'engagement':
        result = await this.generateEngagementReport(report.filters);
        break;
      case 'growth':
        result = await this.generateGrowthReport(report.filters);
        break;
      default:
        throw new Error(`Tipo de relatório não suportado: ${report.type}`);
    }

    // Atualizar última execução
    report.lastGenerated = new Date();

    return {
      reportConfig: report,
      result,
    };
  }

  // 📊 Gerar relatório personalizado
  async generateCustomReport(
    tenantId: string,
    config: {
      type: string;
      filters: any;
      groupBy?: string;
      metrics: string[];
    },
  ): Promise<any> {
    // Implementar lógica de relatório personalizado baseado na configuração
    const baseFilters: ReportFilter = { ...config.filters, tenantId };

    switch (config.type) {
      case 'users_by_branch':
        return this.generateUsersByBranchReport(baseFilters);
      case 'skills_analysis':
        return this.generateSkillsAnalysisReport(baseFilters);
      case 'ministry_participation':
        return this.generateMinistryParticipationReport(baseFilters);
      default:
        return this.generateUsersReport(baseFilters);
    }
  }

  // 📊 Relatório de usuários por filial
  private async generateUsersByBranchReport(
    filters: ReportFilter,
  ): Promise<any> {
    const pipeline: any[] = [
      {
        $match: {
          tenant: new Types.ObjectId(filters.tenantId),
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      {
        $unwind: {
          path: '$branchData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$branchData.name',
          branchId: { $first: '$branchData._id' },
          totalUsers: { $sum: 1 },
          roles: { $addToSet: '$role' },
          users: { $push: '$$ROOT' },
        },
      },
      {
        $sort: {
          totalUsers: -1,
        },
      },
    ];

    const data = await this.memModel.aggregate(pipeline);

    return {
      data,
      summary: {
        totalBranches: data.length,
        totalUsers: data.reduce((sum, branch) => sum + branch.totalUsers, 0),
        averageUsersPerBranch:
          data.length > 0
            ? Math.round(
                data.reduce((sum, branch) => sum + branch.totalUsers, 0) /
                  data.length,
              )
            : 0,
      },
    };
  }

  // 🎯 Relatório de análise de habilidades
  private async generateSkillsAnalysisReport(
    filters: ReportFilter,
  ): Promise<any> {
    const users = await this.userModel.find({
      skills: { $exists: true, $ne: [] },
    });

    const skillsCount: { [skill: string]: number } = {};
    const skillsByRole: { [role: string]: { [skill: string]: number } } = {};

    users.forEach((user) => {
      user.skills?.forEach((skill) => {
        skillsCount[skill] = (skillsCount[skill] || 0) + 1;

        const userRole = user.role || 'volunteer';
        if (!skillsByRole[userRole]) {
          skillsByRole[userRole] = {};
        }
        skillsByRole[userRole][skill] =
          (skillsByRole[userRole][skill] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillsCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      data: {
        topSkills,
        skillsByRole,
        totalUniqueSkills: Object.keys(skillsCount).length,
        usersWithSkills: users.length,
      },
      summary: {
        mostPopularSkill: topSkills[0]?.skill || 'N/A',
        averageSkillsPerUser:
          users.length > 0
            ? Math.round(
                users.reduce(
                  (sum, user) => sum + (user.skills?.length || 0),
                  0,
                ) / users.length,
              )
            : 0,
        totalSkillsRegistered: Object.values(skillsCount).reduce(
          (sum, count) => sum + count,
          0,
        ),
      },
    };
  }

  // ⛪ Relatório de participação em ministérios
  private async generateMinistryParticipationReport(
    filters: ReportFilter,
  ): Promise<any> {
    const pipeline: any[] = [
      {
        $match: {
          tenant: new Types.ObjectId(filters.tenantId),
          isActive: true,
          ministry: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      {
        $unwind: '$ministryData',
      },
      {
        $group: {
          _id: '$ministryData.name',
          ministryId: { $first: '$ministryData._id' },
          totalParticipants: { $sum: 1 },
          leaders: {
            $sum: { $cond: [{ $eq: ['$role', 'leader'] }, 1, 0] },
          },
          volunteers: {
            $sum: { $cond: [{ $eq: ['$role', 'volunteer'] }, 1, 0] },
          },
        },
      },
      {
        $sort: {
          totalParticipants: -1,
        },
      },
    ];

    const data = await this.memModel.aggregate(pipeline);

    return {
      data,
      summary: {
        totalMinistries: data.length,
        totalParticipants: data.reduce(
          (sum, ministry) => sum + ministry.totalParticipants,
          0,
        ),
        averageParticipantsPerMinistry:
          data.length > 0
            ? Math.round(
                data.reduce(
                  (sum, ministry) => sum + ministry.totalParticipants,
                  0,
                ) / data.length,
              )
            : 0,
        mostActiveMinistry: data[0]?._id || 'N/A',
      },
    };
  }

  // 📈 Funções auxiliares para cálculos
  private calculateUsersSummary(data: any[]): any {
    const summary = {
      totalUsers: data.length,
      activeUsers: data.filter((u) => u.isActive).length,
      completedProfiles: data.filter((u) => u.profileCompleted).length,
      byRole: {} as { [role: string]: number },
      byBranch: {} as { [branch: string]: number },
    };

    data.forEach((user) => {
      summary.byRole[user.role] = (summary.byRole[user.role] || 0) + 1;
      if (user.branch) {
        summary.byBranch[user.branch] =
          (summary.byBranch[user.branch] || 0) + 1;
      }
    });

    return summary;
  }

  private calculateEngagementSummary(data: any[]): any {
    const totalUsers = data.length;
    const highEngagement = data.filter(
      (u) => u.engagementLevel === 'high',
    ).length;
    const mediumEngagement = data.filter(
      (u) => u.engagementLevel === 'medium',
    ).length;
    const lowEngagement = data.filter(
      (u) => u.engagementLevel === 'low',
    ).length;

    return {
      totalUsers,
      engagementDistribution: {
        high: highEngagement,
        medium: mediumEngagement,
        low: lowEngagement,
      },
      averageProfileScore:
        totalUsers > 0
          ? Math.round(
              data.reduce((sum, u) => sum + u.profileScore, 0) / totalUsers,
            )
          : 0,
      averageInteractionScore:
        totalUsers > 0
          ? Math.round(
              data.reduce((sum, u) => sum + u.interactionScore, 0) / totalUsers,
            )
          : 0,
    };
  }

  private calculateGrowthSummary(data: any[]): any {
    const totalGrowth =
      data.length > 0
        ? data[data.length - 1].totalUsers - data[0].totalUsers
        : 0;
    const averageGrowthRate =
      data.length > 0
        ? data.reduce((sum, d) => sum + d.growthRate, 0) / data.length
        : 0;
    const newUsersTotal = data.reduce((sum, d) => sum + d.newUsers, 0);

    return {
      totalGrowth,
      averageGrowthRate: Math.round(averageGrowthRate * 100) / 100,
      newUsersTotal,
      growthTrend:
        totalGrowth > 0 ? 'positive' : totalGrowth < 0 ? 'negative' : 'stable',
    };
  }

  private calculateProfileScore(user: any): number {
    const fields = [
      'name',
      'email',
      'phone',
      'birthDate',
      'address',
      'bio',
      'skills',
      'availability',
    ];
    const filledFields = fields.filter((field) => {
      const value = user[field];
      return value && value !== '' && value !== null && value !== undefined;
    });

    return Math.round((filledFields.length / fields.length) * 100);
  }

  private calculateEngagementLevel(
    profileScore: number,
  ): 'high' | 'medium' | 'low' {
    if (profileScore >= 80) return 'high';
    if (profileScore >= 50) return 'medium';
    return 'low';
  }

  private generateUsersCharts(data: any[]): any {
    return {
      roleDistribution: this.createPieChart(data, 'role'),
      branchDistribution: this.createPieChart(data, 'branch'),
      profileCompletion: {
        completed: data.filter((u) => u.profileCompleted).length,
        incomplete: data.filter((u) => !u.profileCompleted).length,
      },
    };
  }

  private generateEngagementCharts(data: any[]): any {
    return {
      engagementLevels: this.createPieChart(data, 'engagementLevel'),
      profileScoreDistribution: this.createHistogram(
        data.map((u) => u.profileScore),
      ),
    };
  }

  private generateGrowthCharts(data: any[]): any {
    return {
      userGrowthTimeline: data.map((d) => ({
        date: d.date,
        value: d.totalUsers,
      })),
      newUsersTimeline: data.map((d) => ({ date: d.date, value: d.newUsers })),
      growthRateTimeline: data.map((d) => ({
        date: d.date,
        value: d.growthRate,
      })),
    };
  }

  private createPieChart(data: any[], field: string): any[] {
    const counts: { [key: string]: number } = {};
    data.forEach((item) => {
      const value = item[field] || 'N/A';
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }

  private createHistogram(values: number[]): any {
    const bins = [0, 20, 40, 60, 80, 100];
    const histogram = bins.slice(0, -1).map((bin, index) => ({
      range: `${bin}-${bins[index + 1]}`,
      count: values.filter((v) => v >= bin && v < bins[index + 1]).length,
    }));

    return histogram;
  }

  private generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
