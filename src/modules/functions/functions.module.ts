import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Function, FunctionSchema } from './schemas/function.schema';
import { MinistryFunction, MinistryFunctionSchema } from './schemas/ministry-function.schema';
import { MemberFunction, MemberFunctionSchema } from './schemas/member-function.schema';
import { FunctionsService } from './services/functions.service';
import { MemberFunctionService } from './services/member-function.service';
import { FunctionsController, MinistryFunctionsController } from './controllers/functions.controller';
import { MemberFunctionController } from './controllers/member-function.controller';
import { Membership, MembershipSchema } from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Ministry, MinistrySchema } from '../ministries/schemas/ministry.schema';
import { User, UserSchema } from '../users/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Function.name, schema: FunctionSchema },
      { name: MinistryFunction.name, schema: MinistryFunctionSchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: Ministry.name, schema: MinistrySchema },
    ]),
  ],
  controllers: [FunctionsController, MinistryFunctionsController, MemberFunctionController],
  providers: [FunctionsService, MemberFunctionService],
  exports: [FunctionsService, MemberFunctionService],
})
export class FunctionsModule {}
