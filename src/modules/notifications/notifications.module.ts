import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { NotificationsService } from './notifications.service';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { FeedbackService } from './services/feedback.service';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import {
  Membership,
  MembershipSchema,
} from 'src/modules/membership/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [NotificationsController, FeedbackController],
  providers: [NotificationsService, NotificationService, EmailService, FeedbackService],
  exports: [NotificationService, EmailService, FeedbackService],
})
export class NotificationsModule {}
