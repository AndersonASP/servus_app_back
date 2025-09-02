import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { SeedService } from './seed.service';

import { Tenant, TenantSchema } from '../../modules/tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../../modules/branches/schemas/branch.schema';
import { User, UserSchema } from '../../modules/users/schema/user.schema';
import { Membership, MembershipSchema } from '../../modules/membership/schemas/membership.schema';
import { Ministry, MinistrySchema } from '../../modules/ministries/schemas/ministry.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // conecta no mesmo DB da app
    MongooseModule.forRoot(process.env.MONGO_URI!),

    // registra os models usados no seed
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Ministry.name, schema: MinistrySchema }, 
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedsModule {}