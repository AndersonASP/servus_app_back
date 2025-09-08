import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Function, FunctionSchema } from './schemas/function.schema';
import { MinistryFunction, MinistryFunctionSchema } from './schemas/ministry-function.schema';
import { MemberFunction, MemberFunctionSchema } from './schemas/member-function.schema';
import { FunctionsService } from './services/functions.service';
import { FunctionsController, MinistryFunctionsController } from './controllers/functions.controller';
import { Membership, MembershipSchema } from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Function.name, schema: FunctionSchema },
      { name: MinistryFunction.name, schema: MinistryFunctionSchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [FunctionsController, MinistryFunctionsController],
  providers: [FunctionsService],
  exports: [FunctionsService],
})
export class FunctionsModule {}
