import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './services/metrics.service';
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
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
