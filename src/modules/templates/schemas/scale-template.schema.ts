import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class FunctionRequirement {
  @Prop({ type: Types.ObjectId, ref: 'Function', required: true })
  functionId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  requiredSlots: number;

  @Prop({ default: true })
  isRequired: boolean;

  @Prop({ default: 0 })
  priority: number; // prioridade para auto-atribuição

  @Prop()
  notes?: string;
}

@Schema({ timestamps: true })
export class ScaleTemplate extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId; // ministério ao qual este template pertence

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ trim: true, maxlength: 300 })
  description?: string;

  @Prop({ required: true })
  eventType: string; // tipo de evento a que se aplica (ex: culto, especial)

  @Prop({ type: [FunctionRequirement], default: [] })
  functionRequirements: FunctionRequirement[]; // funções e quantidades necessárias

  @Prop({ default: false })
  autoAssign: boolean;

  @Prop({ default: false })
  allowOverbooking: boolean;

  @Prop({ default: 2 })
  reminderDaysBefore: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const ScaleTemplateSchema = SchemaFactory.createForClass(ScaleTemplate);

ScaleTemplateSchema.index({ tenantId: 1, branchId: 1, ministryId: 1, eventType: 1 });
ScaleTemplateSchema.index({ tenantId: 1, ministryId: 1 });
ScaleTemplateSchema.index({ name: 'text' });


