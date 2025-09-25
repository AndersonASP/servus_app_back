import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { MembershipRole } from 'src/common/enums/role.enum';

export interface NotificationData {
  id: string;
  type:
    | 'user_created'
    | 'user_profile_completed'
    | 'membership_created'
    | 'user_joined_ministry'
    | 'volunteer_submission_pending' // 🆕 Nova submissão de voluntário
    | 'volunteer_submission_approved' // 🆕 Voluntário aprovado
    | 'volunteer_submission_rejected'; // 🆕 Voluntário rejeitado
  title: string;
  message: string;
  data: any;
  recipients: string[]; // User IDs
  tenantId: string;
  branchId?: string;
  ministryId?: string;
  createdAt: Date;
  readBy: string[]; // User IDs que já leram
  actionUrl?: string;
}

@Injectable()
export class NotificationService {
  private notifications: NotificationData[] = []; // Em produção, usar MongoDB

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private memModel: Model<Membership>,
  ) {}

  // 🔔 Notificar criação de novo usuário
  async notifyNewUser(
    newUser: any,
    membership: any,
    createdBy: string,
  ): Promise<void> {
    try {
      // Buscar admins que devem ser notificados
      const recipients = await this.getNotificationRecipients(
        membership.tenant,
        membership.branch,
        ['tenant_admin', 'branch_admin'],
      );

      // Criar notificação
      const notification: NotificationData = {
        id: this.generateId(),
        type: 'user_created',
        title: '👤 Novo usuário criado',
        message: `${newUser.name} foi criado como ${this.translateRole(membership.role)} por ${createdBy}`,
        data: {
          userId: newUser._id,
          userName: newUser.name,
          userEmail: newUser.email,
          userRole: membership.role,
          branchId: membership.branch,
          ministryId: membership.ministry,
          createdBy,
        },
        recipients: recipients.map((r) => r._id.toString()),
        tenantId: membership.tenant.toString(),
        branchId: membership.branch?.toString(),
        ministryId: membership.ministry?.toString(),
        createdAt: new Date(),
        readBy: [],
        actionUrl: `/users/${newUser._id}`,
      };

      // Salvar notificação
      this.notifications.push(notification);

      console.log(
        `🔔 Notificação criada: ${notification.title} para ${recipients.length} usuários`,
      );

      // Em produção, enviar por WebSocket, email, push notification, etc.
      await this.sendNotificationToUsers(notification, recipients);
    } catch (error) {
      console.error(
        '❌ Erro ao criar notificação de novo usuário:',
        error.message,
      );
    }
  }

  // 🔔 Notificar perfil completado
  async notifyProfileCompleted(
    user: any,
    tenantId: string,
    branchId?: string,
  ): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(
        tenantId,
        branchId,
        ['tenant_admin', 'branch_admin', 'leader'],
      );

      const notification: NotificationData = {
        id: this.generateId(),
        type: 'user_profile_completed',
        title: '✅ Perfil completado',
        message: `${user.name} completou seu perfil e está pronto para servir!`,
        data: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          skills: user.skills,
          availability: user.availability,
        },
        recipients: recipients.map((r) => r._id.toString()),
        tenantId: tenantId.toString(),
        branchId: branchId?.toString(),
        createdAt: new Date(),
        readBy: [],
        actionUrl: `/users/${user._id}`,
      };

      this.notifications.push(notification);
      await this.sendNotificationToUsers(notification, recipients);

      console.log(`🔔 Notificação de perfil completado: ${user.name}`);
    } catch (error) {
      console.error('❌ Erro ao notificar perfil completado:', error.message);
    }
  }

  // 🔔 Notificar usuário adicionado ao ministry
  async notifyUserJoinedMinistry(
    user: any,
    membership: any,
    ministryName: string,
  ): Promise<void> {
    try {
      // Buscar leaders do ministry
      const recipients = await this.getMinistryLeaders(
        membership.tenant,
        membership.ministry,
      );

      const notification: NotificationData = {
        id: this.generateId(),
        type: 'user_joined_ministry',
        title: '⛪ Novo membro no ministério',
        message: `${user.name} se juntou ao ministério ${ministryName}`,
        data: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          ministryName,
          userRole: membership.role,
        },
        recipients: recipients.map((r) => r._id.toString()),
        tenantId: membership.tenant.toString(),
        branchId: membership.branch?.toString(),
        ministryId: membership.ministry?.toString(),
        createdAt: new Date(),
        readBy: [],
        actionUrl: `/ministries/${membership.ministry}/members`,
      };

      this.notifications.push(notification);
      await this.sendNotificationToUsers(notification, recipients);

      console.log(
        `🔔 Notificação de novo membro no ministério: ${ministryName}`,
      );
    } catch (error) {
      console.error(
        '❌ Erro ao notificar novo membro no ministério:',
        error.message,
      );
    }
  }

  // 📋 Listar notificações do usuário
  async getUserNotifications(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{
    notifications: NotificationData[];
    total: number;
    unreadCount: number;
  }> {
    const userNotifications = this.notifications
      .filter((n) => n.recipients.includes(userId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const unreadCount = userNotifications.filter(
      (n) => !n.readBy.includes(userId),
    ).length;

    let filtered = userNotifications;
    if (options.unreadOnly) {
      filtered = userNotifications.filter((n) => !n.readBy.includes(userId));
    }

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginatedNotifications = filtered.slice(startIndex, endIndex);

    return {
      notifications: paginatedNotifications,
      total: filtered.length,
      unreadCount,
    };
  }

  // ✅ Marcar notificação como lida
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.find(
      (n) => n.id === notificationId,
    );
    if (notification && !notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      console.log(
        `✅ Notificação ${notificationId} marcada como lida por ${userId}`,
      );
    }
  }

  // ✅ Marcar todas as notificações como lidas
  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.filter(
      (n) => n.recipients.includes(userId) && !n.readBy.includes(userId),
    );

    userNotifications.forEach((n) => n.readBy.push(userId));
    console.log(
      `✅ ${userNotifications.length} notificações marcadas como lidas para ${userId}`,
    );
  }

  // 🔍 Buscar recipients para notificação
  private async getNotificationRecipients(
    tenantId: string,
    branchId?: string,
    roles: string[] = ['tenant_admin', 'branch_admin'],
  ): Promise<any[]> {
    const filter: any = {
      tenant: tenantId,
      role: { $in: roles },
      isActive: true,
    };

    if (branchId) {
      // Se há branchId, buscar admins da branch E admins do tenant
      const branchAdmins = await this.memModel
        .find({ ...filter, branch: branchId })
        .populate('user', '_id name email')
        .lean();

      const tenantAdmins = await this.memModel
        .find({
          tenant: tenantId,
          role: 'tenant_admin',
          isActive: true,
        })
        .populate('user', '_id name email')
        .lean();

      return [...branchAdmins, ...tenantAdmins]
        .map((m) => m.user)
        .filter(
          (user, index, self) =>
            index ===
            self.findIndex((u) => u._id.toString() === user._id.toString()),
        );
    }

    const memberships = await this.memModel
      .find(filter)
      .populate('user', '_id name email')
      .lean();

    return memberships.map((m) => m.user);
  }

  // 🔍 Buscar leaders de um ministry
  private async getMinistryLeaders(
    tenantId: string,
    ministryId: string,
  ): Promise<any[]> {
    const memberships = await this.memModel
      .find({
        tenant: tenantId,
        ministry: ministryId,
        role: MembershipRole.Leader,
        isActive: true,
      })
      .populate('user', '_id name email')
      .lean();

    return memberships.map((m) => m.user);
  }

  // 📨 Enviar notificação para usuários (implementar canais)
  private async sendNotificationToUsers(
    notification: NotificationData,
    recipients: any[],
  ): Promise<void> {
    // Em produção, implementar diferentes canais:
    console.log(`📨 Enviando notificação para ${recipients.length} usuários:`);
    console.log(`   📧 Email: ${recipients.map((r) => r.email).join(', ')}`);
    console.log(`   📱 Push: ${notification.title}`);
    console.log(`   🌐 WebSocket: Notificação em tempo real`);

    // Simular envio de email/push/websocket
    recipients.forEach((recipient) => {
      console.log(
        `   → ${recipient.name} (${recipient.email}): ${notification.message}`,
      );
    });
  }

  // 🔄 Traduzir roles
  private translateRole(role: string): string {
    const translations: { [key: string]: string } = {
      tenant_admin: 'Administrador da Igreja',
      branch_admin: 'Administrador da Filial',
      leader: 'Líder',
      volunteer: 'Voluntário',
    };
    return translations[role] || role;
  }

  // 🆔 Gerar ID único
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 🆕 Notificar líderes sobre nova submissão de voluntário
  async notifyMinistryLeadersAboutSubmission(
    submission: any,
    ministryId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      console.log(`🔔 [NotificationService] Notificando líderes sobre submissão de voluntário`);

      // Buscar líderes do ministério
      const leaders = await this.getMinistryLeaders(tenantId, ministryId);
      
      if (leaders.length === 0) {
        console.log(`⚠️ [NotificationService] Nenhum líder encontrado para ministério ${ministryId}`);
        return;
      }

      const notification: NotificationData = {
        id: `submission_${submission._id}`,
        type: 'volunteer_submission_pending',
        title: 'Nova Submissão de Voluntário',
        message: `${submission.volunteerName} submeteu candidatura para o ministério`,
        data: {
          submissionId: submission._id,
          volunteerName: submission.volunteerName,
          volunteerEmail: submission.email,
          ministryId,
          selectedFunctions: submission.selectedFunctions || [],
        },
        recipients: leaders.map(leader => leader._id.toString()),
        tenantId,
        ministryId,
        createdAt: new Date(),
        readBy: [],
        actionUrl: `/ministry-approvals/ministries/${ministryId}/pending`,
      };

      await this.sendNotificationToUsers(notification, leaders);
      
      console.log(`✅ [NotificationService] Notificação enviada para ${leaders.length} líderes`);
    } catch (error) {
      console.error('❌ [NotificationService] Erro ao notificar líderes:', error);
    }
  }

  // 🆕 Notificar voluntário sobre aprovação/rejeição
  async notifyVolunteerAboutDecision(
    submission: any,
    decision: 'approved' | 'rejected',
    leaderName: string,
    notes?: string,
  ): Promise<void> {
    try {
      console.log(`🔔 [NotificationService] Notificando voluntário sobre decisão: ${decision}`);

      const notification: NotificationData = {
        id: `decision_${submission._id}`,
        type: decision === 'approved' ? 'volunteer_submission_approved' : 'volunteer_submission_rejected',
        title: decision === 'approved' ? 'Candidatura Aprovada!' : 'Candidatura Não Aprovada',
        message: decision === 'approved' 
          ? `Sua candidatura foi aprovada por ${leaderName}. Bem-vindo ao ministério!`
          : `Sua candidatura não foi aprovada por ${leaderName}. ${notes || ''}`,
        data: {
          submissionId: submission._id,
          volunteerName: submission.volunteerName,
          volunteerEmail: submission.email,
          ministryId: submission.preferredMinistry,
          decision,
          leaderName,
          notes,
        },
        recipients: [submission.email], // Usar email como identificador
        tenantId: submission.tenantId.toString(),
        ministryId: submission.preferredMinistry?.toString(),
        createdAt: new Date(),
        readBy: [],
        actionUrl: decision === 'approved' ? '/dashboard' : '/forms',
      };

      // Para notificações de voluntários, enviar por email
      await this.sendVolunteerEmailNotification(notification);
      
      console.log(`✅ [NotificationService] Notificação de ${decision} enviada para ${submission.email}`);
    } catch (error) {
      console.error('❌ [NotificationService] Erro ao notificar voluntário:', error);
    }
  }

  // 🆕 Enviar notificação por email para voluntários
  private async sendVolunteerEmailNotification(notification: NotificationData): Promise<void> {
    // TODO: Implementar envio de email específico para voluntários
    console.log('📧 Email de notificação para voluntário:', {
      type: notification.type,
      title: notification.title,
      recipient: notification.recipients[0],
    });
  }

  // 📊 Estatísticas de notificações
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: { [key: string]: number };
    recentCount: number;
  }> {
    const userNotifications = this.notifications.filter((n) =>
      n.recipients.includes(userId),
    );
    const unreadNotifications = userNotifications.filter(
      (n) => !n.readBy.includes(userId),
    );

    // Notificações das últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = userNotifications.filter(
      (n) => n.createdAt > yesterday,
    );

    // Estatísticas por tipo
    const byType: { [key: string]: number } = {};
    userNotifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      total: userNotifications.length,
      unread: unreadNotifications.length,
      byType,
      recentCount: recentNotifications.length,
    };
  }
}
