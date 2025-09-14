import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import { MinistryMembership, MinistryMembershipSchema } from './schemas/ministry-membership.schema';
import { Ministry, MinistrySchema } from '../ministries/schemas/ministry.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { FunctionsModule } from '../functions/functions.module';

import { MembershipController } from './controllers/membership.controller';
import { MinistryMembershipController } from './controllers/ministry-membership.controller';
import { MembershipService } from './services/membership.service';
import { MinistryMembershipService } from './services/ministry-membership.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: MinistryMembership.name, schema: MinistryMembershipSchema },
      { name: Ministry.name, schema: MinistrySchema },
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    FunctionsModule,
  ],
  controllers: [MembershipController, MinistryMembershipController],
  providers: [MembershipService, MinistryMembershipService],
  exports: [MembershipService, MinistryMembershipService],
})
export class MembershipsModule {}
