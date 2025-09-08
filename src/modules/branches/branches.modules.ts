import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import {
  Tenant,
  TenantSchema,
} from 'src/modules/tenants/schemas/tenant.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';
import { BranchController } from '../branches/controllers/branches.controller';
import { BranchService } from './services/branches.service';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
