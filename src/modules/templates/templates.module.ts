import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import {
  ScaleTemplate,
  ScaleTemplateSchema,
} from './schemas/scale-template.schema';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScaleTemplate.name, schema: ScaleTemplateSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
