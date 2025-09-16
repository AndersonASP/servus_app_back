import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Function, FunctionSchema } from './schemas/function.schema';
import { MinistryFunction, MinistryFunctionSchema } from './schemas/ministry-function.schema';
import { MemberFunction, MemberFunctionSchema } from './schemas/member-function.schema';
import { UserFunction, UserFunctionSchema } from './schemas/user-function.schema';
import { FunctionsService } from './services/functions.service';
import { UserFunctionService } from './services/user-function.service';
import { MemberFunctionService } from './services/member-function.service';
import { FunctionsController, MinistryFunctionsController } from './controllers/functions.controller';
import { UserFunctionController } from './controllers/user-function.controller';
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
      { name: UserFunction.name, schema: UserFunctionSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: Ministry.name, schema: MinistrySchema },
    ]),
  ],
  controllers: [FunctionsController, MinistryFunctionsController, UserFunctionController, MemberFunctionController],
  providers: [FunctionsService, UserFunctionService, MemberFunctionService],
  exports: [FunctionsService, UserFunctionService, MemberFunctionService],
})
export class FunctionsModule {}
