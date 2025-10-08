// src/modules/ministries/ministries.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinistrySchema } from './schemas/ministry.schema';
import { InviteCodeSchema } from './schemas/invite-code.schema';
import { MinistriesService } from './ministries.service';
import { InviteCodeService } from './services/invite-code.service';
import { MinistriesController } from './controllers/ministries.controller';
import { MinistriesMatrixController } from './controllers/ministries.controller';
import { InviteCodeController } from './controllers/invite-code.controller';
import { MembershipSchema } from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { FunctionsModule } from '../functions/functions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Ministry', schema: MinistrySchema },
      { name: 'InviteCode', schema: InviteCodeSchema },
      { name: 'Membership', schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
    ]),
    FunctionsModule, // Importar o módulo de funções
  ],
  controllers: [
    MinistriesController,
    MinistriesMatrixController,
    InviteCodeController,
  ],
  providers: [MinistriesService, InviteCodeService],
  exports: [MinistriesService, InviteCodeService],
})
export class MinistriesModule {}
