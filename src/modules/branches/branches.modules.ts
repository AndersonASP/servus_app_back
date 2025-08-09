import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Tenant, TenantSchema } from 'src/modules/tenants/schemas/tenant.schema';
import { BranchController } from '../branches/controllers/branches.controller';
import { BranchService } from './services/branches.service';

// @TODO SEPARAR ISSO AQUI EM UM NOVO MODULO FORA DA ESTRUTURA DE TENANTS
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Branch.name, schema: BranchSchema }]),
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}