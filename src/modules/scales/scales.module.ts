import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScalesController } from './scales.controller';
import { ScalesAdvancedController } from './controllers/scales-advanced.controller';
import { ScalesService } from './scales.service';
import { Scale, ScaleSchema } from './schemas/scale.schema';
import { ScaleTemplate, ScaleTemplateSchema } from '../templates/schemas/scale-template.schema';
import { Function, FunctionSchema } from '../functions/schemas/function.schema';
import {
  VolunteerAvailability,
  VolunteerAvailabilitySchema,
} from './schemas/volunteer-availability.schema';
import {
  MinistrySettings,
  MinistrySettingsSchema,
} from './schemas/ministry-settings.schema';
import {
  SubstitutionRequest,
  SubstitutionRequestSchema,
} from './schemas/substitution-request.schema';
import {
  ServiceHistory,
  ServiceHistorySchema,
} from './schemas/service-history.schema';
import { AvailabilityValidator } from './services/availability-validator.service';
import { ScaleAssignmentEngine } from './services/scale-assignment-engine.service';
import { SubstitutionEngine } from './services/substitution-engine.service';
import { VolunteerAvailabilityService } from './services/volunteer-availability.service';
import { SubstitutionService } from './services/substitution.service';
import { ServiceHistoryService } from './services/service-history.service';

// Importar schemas de outros módulos
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';
import {
  MemberFunction,
  MemberFunctionSchema,
} from '../functions/schemas/member-function.schema';
import {
  MinistryFunction,
  MinistryFunctionSchema,
} from '../functions/schemas/ministry-function.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Scale.name, schema: ScaleSchema },
      { name: ScaleTemplate.name, schema: ScaleTemplateSchema },
      { name: Function.name, schema: FunctionSchema },
      { name: VolunteerAvailability.name, schema: VolunteerAvailabilitySchema },
      { name: MinistrySettings.name, schema: MinistrySettingsSchema },
      { name: SubstitutionRequest.name, schema: SubstitutionRequestSchema },
      { name: ServiceHistory.name, schema: ServiceHistorySchema },
      // Schemas de outros módulos necessários para os serviços
      { name: Membership.name, schema: MembershipSchema },
      { name: MemberFunction.name, schema: MemberFunctionSchema },
      { name: MinistryFunction.name, schema: MinistryFunctionSchema },
    ]),
  ],
  controllers: [ScalesController, ScalesAdvancedController],
  providers: [
    ScalesService,
    AvailabilityValidator,
    ScaleAssignmentEngine,
    SubstitutionEngine,
    VolunteerAvailabilityService,
    SubstitutionService,
    ServiceHistoryService,
  ],
  exports: [
    ScalesService,
    AvailabilityValidator,
    ScaleAssignmentEngine,
    SubstitutionEngine,
    VolunteerAvailabilityService,
    SubstitutionService,
    ServiceHistoryService,
  ],
})
export class ScalesModule {}
