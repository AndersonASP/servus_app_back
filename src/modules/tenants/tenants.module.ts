import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { TenantService } from './services/tenants.service';
import { TenantController } from './controllers/tenants.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService, MongooseModule],
})
export class TenantModule {}
