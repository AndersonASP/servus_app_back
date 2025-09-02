import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import { Membership, MembershipSchema } from 'src/modules/membership/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationService, EmailService],
  exports: [NotificationService, EmailService],
})
export class NotificationsModule {}
