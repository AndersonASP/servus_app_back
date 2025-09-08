import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { VolunteersService } from './services/volunteers.service';
import { VolunteersController } from './controllers/volunteers.controller';
import { MinistrySchema } from '../ministries/schemas/ministry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: 'Ministry', schema: MinistrySchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
})
export class VolunteersModule {}
