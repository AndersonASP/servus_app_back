import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersController } from './users.controller';
import { MembersController } from './controllers/members.controller';
import { UsersService } from './services/users.service';
import { MembersService } from './services/members.service';
import { ExportService } from './services/export.service';
import { User, UserSchema } from './schema/user.schema';
import {
  Membership,
  MembershipSchema,
} from 'src/modules/membership/schemas/membership.schema';
import {
  Tenant,
  TenantSchema,
} from 'src/modules/tenants/schemas/tenant.schema';
import {
  Branch,
  BranchSchema,
} from 'src/modules/branches/schemas/branch.schema';
import {
  Ministry,
  MinistrySchema,
} from 'src/modules/ministries/schemas/ministry.schema';
import {
  MemberFunction,
  MemberFunctionSchema,
} from 'src/modules/functions/schemas/member-function.schema';
import { cacheConfig } from 'src/config/cache.config';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { MembershipsModule } from 'src/modules/membership/memberships.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Ministry.name, schema: MinistrySchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
    ]),
    CacheModule.register(cacheConfig),
    NotificationsModule,
    MembershipsModule,
  ],
  controllers: [UsersController, MembersController],
  providers: [UsersService, MembersService, ExportService],
  exports: [UsersService, MembersService],
})
export class UsersModule {}
