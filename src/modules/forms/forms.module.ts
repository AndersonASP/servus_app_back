import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomForm, CustomFormSchema } from './schemas/custom-form.schema';
import { FormSubmission, FormSubmissionSchema } from './schemas/form-submission.schema';
import { Ministry, MinistrySchema } from '../ministries/schemas/ministry.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { Membership, MembershipSchema } from '../membership/schemas/membership.schema';
import { CustomFormService } from './services/custom-form.service';
import { MinistryApprovalService } from './services/ministry-approval.service';
import { CustomFormController } from './controllers/custom-form.controller';
import { FormDynamicController } from './controllers/form-dynamic.controller';
import { MinistryApprovalController } from './controllers/ministry-approval.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MemberFunctionService } from '../functions/services/member-function.service';
import { MemberFunction, MemberFunctionSchema } from '../functions/schemas/member-function.schema';
import { MinistryFunction, MinistryFunctionSchema } from '../functions/schemas/ministry-function.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CustomForm', schema: CustomFormSchema },
      { name: 'FormSubmission', schema: FormSubmissionSchema },
      { name: 'Ministry', schema: MinistrySchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
      { name: MinistryFunction.name, schema: MinistryFunctionSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    NotificationsModule, // 🆕 Importar módulo de notificações
  ],
  controllers: [CustomFormController, FormDynamicController, MinistryApprovalController],
  providers: [CustomFormService, MinistryApprovalService, MemberFunctionService],
  exports: [CustomFormService, MinistryApprovalService],
})
export class FormsModule {}
