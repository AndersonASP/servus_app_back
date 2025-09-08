import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './services/reports.service';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import {
  Membership,
  MembershipSchema,
} from 'src/modules/membership/schemas/membership.schema';
import {
  Branch,
  BranchSchema,
} from 'src/modules/branches/schemas/branch.schema';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    UsersModule, // Para acessar ExportService
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
