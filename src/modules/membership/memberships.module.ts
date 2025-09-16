import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import { Ministry, MinistrySchema } from '../ministries/schemas/ministry.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { MemberFunction, MemberFunctionSchema } from '../functions/schemas/member-function.schema';
import { FunctionsModule } from '../functions/functions.module';

import { MembershipController } from './controllers/membership.controller';
import { MinistryMembershipUnifiedController } from './controllers/ministry-membership-unified.controller';
import { MembershipService } from './services/membership.service';
import { MembershipIntegrityService } from './services/membership-integrity.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: Ministry.name, schema: MinistrySchema },
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
    ]),
    FunctionsModule,
  ],
  controllers: [MembershipController, MinistryMembershipUnifiedController],
  providers: [MembershipService, MembershipIntegrityService],
  exports: [MembershipService, MembershipIntegrityService],
})
export class MembershipsModule {}
