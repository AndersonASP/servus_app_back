// src/modules/ministries/ministries.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinistrySchema } from './schemas/ministry.schema';
import { MinistriesService } from './ministries.service';
import { MinistriesController } from './controllers/ministries.controller';
import { MinistriesMatrixController } from './controllers/ministries.controller';
import { MembershipSchema } from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { FunctionsModule } from '../functions/functions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Ministry', schema: MinistrySchema },
      { name: 'Membership', schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    FunctionsModule, // Importar o módulo de funções
  ],
  controllers: [MinistriesController, MinistriesMatrixController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
