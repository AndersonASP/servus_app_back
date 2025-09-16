import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { NotificationService } from './notification.service';

export interface FeedbackData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  userId: string;
  tenantId?: string;
  branchId?: string;
  ministryId?: string;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  metadata?: any;
}

@Injectable()
export class FeedbackService {
  private feedbacks: FeedbackData[] = [];

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Criar feedback de sucesso
   */
  async createSuccessFeedback(
    userId: string,
    title: string,
    message: string,
    tenantId?: string,
    branchId?: string,
    ministryId?: string,
    actionUrl?: string,
    metadata?: any,
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateId(),
      type: 'success',
      title,
      message,
      userId,
      tenantId,
      branchId,
      ministryId,
      createdAt: new Date(),
      actionUrl,
      metadata,
    };

    this.feedbacks.push(feedback);
    
    // Enviar notificação em tempo real se possível
    await this.sendRealtimeNotification(feedback);
    
    console.log(`✅ [FeedbackService] Feedback de sucesso criado: ${title}`);
    return feedback;
  }

  /**
   * Criar feedback de erro
   */
  async createErrorFeedback(
    userId: string,
    title: string,
    message: string,
    tenantId?: string,
    branchId?: string,
    ministryId?: string,
    actionUrl?: string,
    metadata?: any,
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateId(),
      type: 'error',
      title,
      message,
      userId,
      tenantId,
      branchId,
      ministryId,
      createdAt: new Date(),
      actionUrl,
      metadata,
    };

    this.feedbacks.push(feedback);
    
    // Enviar notificação em tempo real se possível
    await this.sendRealtimeNotification(feedback);
    
    console.log(`❌ [FeedbackService] Feedback de erro criado: ${title}`);
    return feedback;
  }

  /**
   * Criar feedback de aviso
   */
  async createWarningFeedback(
    userId: string,
    title: string,
    message: string,
    tenantId?: string,
    branchId?: string,
    ministryId?: string,
    actionUrl?: string,
    metadata?: any,
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      userId,
      tenantId,
      branchId,
      ministryId,
      createdAt: new Date(),
      actionUrl,
      metadata,
    };

    this.feedbacks.push(feedback);
    
    // Enviar notificação em tempo real se possível
    await this.sendRealtimeNotification(feedback);
    
    console.log(`⚠️ [FeedbackService] Feedback de aviso criado: ${title}`);
    return feedback;
  }

  /**
   * Criar feedback informativo
   */
  async createInfoFeedback(
    userId: string,
    title: string,
    message: string,
    tenantId?: string,
    branchId?: string,
    ministryId?: string,
    actionUrl?: string,
    metadata?: any,
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateId(),
      type: 'info',
      title,
      message,
      userId,
      tenantId,
      branchId,
      ministryId,
      createdAt: new Date(),
      actionUrl,
      metadata,
    };

    this.feedbacks.push(feedback);
    
    // Enviar notificação em tempo real se possível
    await this.sendRealtimeNotification(feedback);
    
    console.log(`ℹ️ [FeedbackService] Feedback informativo criado: ${title}`);
    return feedback;
  }

  /**
   * Métodos específicos para operações CRUD
   */
  async createTenantSuccess(
    userId: string,
    tenantName: string,
    tenantId: string,
    adminCreated?: boolean,
  ): Promise<FeedbackData> {
    const title = 'Tenant Criado com Sucesso!';
    const message = adminCreated 
      ? `A igreja "${tenantName}" foi criada com sucesso e o administrador foi configurado.`
      : `A igreja "${tenantName}" foi criada com sucesso.`;
    
    return this.createSuccessFeedback(
      userId,
      title,
      message,
      tenantId,
      undefined,
      undefined,
      `/tenants/${tenantId}`,
      { tenantName, adminCreated }
    );
  }

  async createTenantError(
    userId: string,
    tenantName: string,
    error: string,
  ): Promise<FeedbackData> {
    const title = 'Erro ao Criar Tenant';
    const message = `Não foi possível criar a igreja "${tenantName}". ${error}`;
    
    return this.createErrorFeedback(
      userId,
      title,
      message,
      undefined,
      undefined,
      undefined,
      undefined,
      { tenantName, error }
    );
  }

  async createUserSuccess(
    userId: string,
    userName: string,
    tenantId: string,
    role: string,
  ): Promise<FeedbackData> {
    const title = 'Usuário Criado com Sucesso!';
    const message = `O usuário "${userName}" foi criado com sucesso como ${this.translateRole(role)}.`;
    
    return this.createSuccessFeedback(
      userId,
      title,
      message,
      tenantId,
      undefined,
      undefined,
      `/users`,
      { userName, role }
    );
  }

  async createUserError(
    userId: string,
    userName: string,
    error: string,
  ): Promise<FeedbackData> {
    const title = 'Erro ao Criar Usuário';
    const message = `Não foi possível criar o usuário "${userName}". ${error}`;
    
    return this.createErrorFeedback(
      userId,
      title,
      message,
      undefined,
      undefined,
      undefined,
      undefined,
      { userName, error }
    );
  }

  /**
   * Obter feedbacks do usuário
   */
  async getUserFeedbacks(
    userId: string,
    tenantId?: string,
    limit: number = 50,
  ): Promise<FeedbackData[]> {
    let filteredFeedbacks = this.feedbacks.filter(f => f.userId === userId);
    
    if (tenantId) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.tenantId === tenantId);
    }
    
    return filteredFeedbacks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Marcar feedback como lido
   */
  async markAsRead(feedbackId: string, userId: string): Promise<boolean> {
    const feedback = this.feedbacks.find(f => f.id === feedbackId && f.userId === userId);
    if (feedback) {
      feedback.readAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Limpar feedbacks antigos
   */
  async cleanupOldFeedbacks(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const initialLength = this.feedbacks.length;
    this.feedbacks = this.feedbacks.filter(f => f.createdAt > cutoffDate);
    
    const removedCount = initialLength - this.feedbacks.length;
    console.log(`🧹 [FeedbackService] Removidos ${removedCount} feedbacks antigos`);
    
    return removedCount;
  }

  /**
   * Enviar notificação em tempo real
   */
  private async sendRealtimeNotification(feedback: FeedbackData): Promise<void> {
    try {
      // Em produção, implementar WebSocket ou Server-Sent Events
      console.log(`📡 [FeedbackService] Enviando notificação em tempo real para usuário ${feedback.userId}: ${feedback.title}`);
      
      // Simular envio de notificação em tempo real
      // TODO: Implementar WebSocket ou Server-Sent Events
      
    } catch (error) {
      console.error('Erro ao enviar notificação em tempo real:', error);
    }
  }

  /**
   * Gerar ID único
   */
  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Traduzir roles para português
   */
  private translateRole(role: string): string {
    const translations: { [key: string]: string } = {
      servus_admin: 'Administrador do Servus',
      tenant_admin: 'Administrador da Igreja',
      branch_admin: 'Administrador da Filial',
      leader: 'Líder de Ministério',
      volunteer: 'Voluntário',
    };
    
    return translations[role] || role;
  }
}
