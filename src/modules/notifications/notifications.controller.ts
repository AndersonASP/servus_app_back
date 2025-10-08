import { Controller, Get, Post, Param, Query, Req, Put } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  // 📋 Listar notificações do usuário atual
  @Get()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
            MembershipRole.Volunteer,
          ],
          tenantFrom: 'user',
        },
      },
    ],
  })
  async getUserNotifications(
    @Query() query: { page?: string; limit?: string; unreadOnly?: string },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const unreadOnly = query.unreadOnly === 'true';

    return this.notificationService.getUserNotifications(req.user._id, {
      page,
      limit,
      unreadOnly,
    });
  }

  // 📊 Estatísticas de notificações do usuário
  @Get('stats')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
            MembershipRole.Volunteer,
          ],
          tenantFrom: 'user',
        },
      },
    ],
  })
  async getNotificationStats(@Req() req: any) {
    return this.notificationService.getNotificationStats(req.user._id);
  }

  // ✅ Marcar notificação como lida
  @Put(':notificationId/read')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
            MembershipRole.Volunteer,
          ],
          tenantFrom: 'user',
        },
      },
    ],
  })
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Req() req: any,
  ) {
    await this.notificationService.markAsRead(notificationId, req.user._id);
    return { message: 'Notificação marcada como lida' };
  }

  // ✅ Marcar todas as notificações como lidas
  @Put('mark-all-read')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      {
        membership: {
          roles: [
            MembershipRole.TenantAdmin,
            MembershipRole.BranchAdmin,
            MembershipRole.Leader,
            MembershipRole.Volunteer,
          ],
          tenantFrom: 'user',
        },
      },
    ],
  })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user._id);
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  // 🧪 Teste de conexão com servidor de email
  @Get('test-email-connection')
  @Authorize({
    anyOf: [{ global: [Role.ServusAdmin] }],
  })
  async testEmailConnection() {
    const isConnected = await this.emailService.testConnection();
    return {
      success: isConnected,
      message: isConnected
        ? 'Conexão com servidor de email funcionando'
        : 'Erro na conexão com servidor de email',
    };
  }

  // 🧪 Teste de envio de email de credenciais
  @Post('test-email-credentials')
  @Authorize({
    anyOf: [{ global: [Role.ServusAdmin] }],
  })
  async testEmailCredentials(@Req() req: any) {
    const testEmail = req.body.email || 'test@example.com';
    const success = await this.emailService.sendUserCredentials(
      testEmail,
      'Usuário Teste',
      'Igreja Teste',
      'TempPass123!',
      'volunteer',
      'Filial Central',
      'Ministério de Louvor',
    );

    return {
      success,
      message: success
        ? `Email de teste enviado para ${testEmail}`
        : 'Erro ao enviar email de teste',
    };
  }
}
