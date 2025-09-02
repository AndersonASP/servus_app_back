import { Controller, Get, Post, Param, Query, Req, Put } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  // 📋 Listar notificações do usuário atual
  @Get()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
    ],
  })
  async getUserNotifications(
    @Query() query: { page?: string; limit?: string; unreadOnly?: string },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const unreadOnly = query.unreadOnly === 'true';

    return this.notificationService.getUserNotifications(
      req.user._id,
      { page, limit, unreadOnly }
    );
  }

  // 📊 Estatísticas de notificações do usuário
  @Get('stats')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
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
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
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
      { membership: { roles: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin, MembershipRole.Leader, MembershipRole.Volunteer], tenantFrom: 'user' } },
    ],
  })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user._id);
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }
}
