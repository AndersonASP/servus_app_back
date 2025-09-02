import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';

export interface ActivityMetric {
  id: string;
  userId: string;
  tenantId: string;
  branchId?: string;
  ministryId?: string;
  activityType: 'login' | 'profile_update' | 'ministry_join' | 'event_participation' | 'interaction';
  description: string;
  metadata: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface EngagementMetrics {
  userId: string;
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    loginCount: number;
    activeDays: number;
    profileCompleteness: number;
    interactionScore: number;
    lastActivity: Date;
    averageSessionDuration: number;
    ministriesJoined: number;
    eventsParticipated: number;
  };
  calculatedAt: Date;
}

@Injectable()
export class MetricsService {
  private activities: ActivityMetric[] = []; // Em produção, usar MongoDB
  private engagementCache: Map<string, EngagementMetrics> = new Map();

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private memModel: Model<Membership>,
  ) {}

  // 📊 Registrar atividade do usuário
  async recordActivity(
    userId: string,
    tenantId: string,
    activityType: ActivityMetric['activityType'],
    description: string,
    metadata: any = {},
    context?: { branchId?: string; ministryId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const activity: ActivityMetric = {
      id: this.generateId(),
      userId,
      tenantId,
      branchId: context?.branchId,
      ministryId: context?.ministryId,
      activityType,
      description,
      metadata,
      timestamp: new Date(),
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.activities.push(activity);
    console.log(`📊 Atividade registrada: ${activityType} - ${description} para usuário ${userId}`);

    // Atualizar métricas de engajamento em tempo real
    await this.updateEngagementMetrics(userId, tenantId);
  }

  // 📈 Calcular métricas de engajamento para um usuário
  async calculateUserEngagement(
    userId: string,
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<EngagementMetrics> {
    const cacheKey = `${userId}_${tenantId}_${period}`;
    
    // Verificar cache
    if (this.engagementCache.has(cacheKey)) {
      const cached = this.engagementCache.get(cacheKey)!;
      // Cache válido por 1 hora
      if (Date.now() - cached.calculatedAt.getTime() < 3600000) {
        return cached;
      }
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Buscar atividades do período
    const userActivities = this.activities.filter(a => 
      a.userId === userId && 
      a.tenantId === tenantId &&
      a.timestamp >= startDate
    );

    // Calcular métricas
    const loginCount = userActivities.filter(a => a.activityType === 'login').length;
    
    // Dias únicos com atividade
    const activeDates = [...new Set(
      userActivities.map(a => a.timestamp.toDateString())
    )];
    const activeDays = activeDates.length;

    // Buscar dados do usuário
    const user = await this.userModel.findById(userId);
    const profileCompleteness = this.calculateProfileCompleteness(user);

    // Score de interação baseado em tipos de atividade
    const interactionScore = this.calculateInteractionScore(userActivities);

    // Última atividade
    const lastActivity = userActivities.length > 0 
      ? userActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : new Date(0);

    // Duração média de sessão (simulado)
    const averageSessionDuration = this.calculateAverageSessionDuration(userActivities);

    // Ministérios participando
    const memberships = await this.memModel.find({
      user: userId,
      tenant: tenantId,
      isActive: true,
      ministry: { $exists: true, $ne: null }
    });
    const ministriesJoined = memberships.length;

    // Eventos participados (simulado)
    const eventsParticipated = userActivities.filter(a => a.activityType === 'event_participation').length;

    const metrics: EngagementMetrics = {
      userId,
      tenantId,
      period,
      metrics: {
        loginCount,
        activeDays,
        profileCompleteness,
        interactionScore,
        lastActivity,
        averageSessionDuration,
        ministriesJoined,
        eventsParticipated,
      },
      calculatedAt: new Date(),
    };

    // Salvar no cache
    this.engagementCache.set(cacheKey, metrics);

    return metrics;
  }

  // 📊 Métricas agregadas do tenant
  async getTenantMetrics(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    engagementRate: number;
    averageSessionDuration: number;
    topActivities: { type: string; count: number }[];
    userGrowth: { date: string; count: number }[];
    engagementTrends: { date: string; score: number }[];
  }> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Total de usuários do tenant
    const totalUsersCount = await this.memModel.countDocuments({
      tenant: tenantId,
      isActive: true
    });

    // Usuários ativos no período
    const activeUserIds = [...new Set(
      this.activities
        .filter(a => a.tenantId === tenantId && a.timestamp >= startDate)
        .map(a => a.userId)
    )];
    const activeUsers = activeUserIds.length;

    // Novos usuários no período
    const newUsersCount = await this.memModel.countDocuments({
      tenant: tenantId,
      isActive: true,
      createdAt: { $gte: startDate }
    });

    // Taxa de engajamento
    const engagementRate = totalUsersCount > 0 ? (activeUsers / totalUsersCount) * 100 : 0;

    // Duração média de sessão do tenant
    const tenantActivities = this.activities.filter(a => 
      a.tenantId === tenantId && a.timestamp >= startDate
    );
    const averageSessionDuration = this.calculateAverageSessionDuration(tenantActivities);

    // Top atividades
    const activityCounts: { [key: string]: number } = {};
    tenantActivities.forEach(a => {
      activityCounts[a.activityType] = (activityCounts[a.activityType] || 0) + 1;
    });
    const topActivities = Object.entries(activityCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Crescimento de usuários (últimos 30 dias)
    const userGrowth = await this.calculateUserGrowth(tenantId, 30);

    // Tendências de engajamento (últimos 7 dias)
    const engagementTrends = await this.calculateEngagementTrends(tenantId, 7);

    return {
      totalUsers: totalUsersCount,
      activeUsers,
      newUsers: newUsersCount,
      engagementRate: Math.round(engagementRate * 100) / 100,
      averageSessionDuration,
      topActivities,
      userGrowth,
      engagementTrends,
    };
  }

  // 📊 Métricas da branch
  async getBranchMetrics(
    tenantId: string,
    branchId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Usuários da branch
    const branchMemberships = await this.memModel.find({
      tenant: tenantId,
      branch: branchId,
      isActive: true
    });

    const branchUserIds = branchMemberships.map(m => m.user.toString());

    // Atividades da branch
    const branchActivities = this.activities.filter(a => 
      a.tenantId === tenantId && 
      a.branchId === branchId && 
      a.timestamp >= startDate
    );

    const activeUsers = [...new Set(branchActivities.map(a => a.userId))].length;
    const totalUsers = branchUserIds.length;
    const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      engagementRate: Math.round(engagementRate * 100) / 100,
      activitiesCount: branchActivities.length,
      averageSessionDuration: this.calculateAverageSessionDuration(branchActivities),
    };
  }

  // 🔄 Atualizar métricas de engajamento
  private async updateEngagementMetrics(userId: string, tenantId: string): Promise<void> {
    // Invalidar cache para forçar recálculo
    const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
    
    periods.forEach(period => {
      const cacheKey = `${userId}_${tenantId}_${period}`;
      this.engagementCache.delete(cacheKey);
    });
  }

  // 📏 Calcular completude do perfil
  private calculateProfileCompleteness(user: any): number {
    if (!user) return 0;

    const fields = ['name', 'email', 'phone', 'birthDate', 'address', 'bio', 'skills', 'availability'];
    const filledFields = fields.filter(field => {
      const value = user[field];
      return value && value !== '' && value !== null && value !== undefined;
    });

    return Math.round((filledFields.length / fields.length) * 100);
  }

  // 🎯 Calcular score de interação
  private calculateInteractionScore(activities: ActivityMetric[]): number {
    const weights = {
      login: 1,
      profile_update: 3,
      ministry_join: 5,
      event_participation: 4,
      interaction: 2,
    };

    const score = activities.reduce((total, activity) => {
      return total + (weights[activity.activityType] || 1);
    }, 0);

    return Math.min(score, 100); // Máximo 100
  }

  // ⏱️ Calcular duração média de sessão
  private calculateAverageSessionDuration(activities: ActivityMetric[]): number {
    // Simulação - em produção, rastrear sessões reais
    const sessionDurations = activities
      .filter(a => a.activityType === 'login')
      .map(() => Math.random() * 30 + 5); // 5-35 minutos

    if (sessionDurations.length === 0) return 0;

    const total = sessionDurations.reduce((sum, duration) => sum + duration, 0);
    return Math.round((total / sessionDurations.length) * 100) / 100;
  }

  // 📈 Calcular crescimento de usuários
  private async calculateUserGrowth(tenantId: string, days: number): Promise<{ date: string; count: number }[]> {
    const result: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Contar usuários criados até esta data
      const count = await this.memModel.countDocuments({
        tenant: tenantId,
        isActive: true,
        createdAt: { $lte: date }
      });

      result.push({ date: dateString, count });
    }

    return result;
  }

  // 📊 Calcular tendências de engajamento
  private async calculateEngagementTrends(tenantId: string, days: number): Promise<{ date: string; score: number }[]> {
    const result: { date: string; score: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const dayActivities = this.activities.filter(a => 
        a.tenantId === tenantId && 
        a.timestamp >= startOfDay && 
        a.timestamp < endOfDay
      );

      const score = this.calculateInteractionScore(dayActivities);
      result.push({ 
        date: date.toISOString().split('T')[0], 
        score 
      });
    }

    return result;
  }

  // 🆔 Gerar ID único
  private generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 📋 Listar atividades do usuário
  async getUserActivities(
    userId: string,
    options: { page: number; limit: number; type?: string; startDate?: Date; endDate?: Date }
  ): Promise<{ activities: ActivityMetric[]; total: number }> {
    let filtered = this.activities.filter(a => a.userId === userId);

    if (options.type) {
      filtered = filtered.filter(a => a.activityType === options.type);
    }

    if (options.startDate) {
      filtered = filtered.filter(a => a.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(a => a.timestamp <= options.endDate!);
    }

    // Ordenar por data decrescente
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginatedActivities = filtered.slice(startIndex, endIndex);

    return {
      activities: paginatedActivities,
      total: filtered.length,
    };
  }
} 