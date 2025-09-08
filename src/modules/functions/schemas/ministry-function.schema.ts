import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MinistryFunction extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Ministry' })
  ministryId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Function' })
  functionId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1 })
  defaultSlots?: number; // Número padrão de slots para esta função no ministério

  @Prop()
  notes?: string; // Observações específicas do ministério para esta função

  @Prop()
  createdBy?: string; // ID do usuário que habilitou
}

export const MinistryFunctionSchema = SchemaFactory.createForClass(MinistryFunction);

// Índices para performance e unicidade
MinistryFunctionSchema.index({ tenantId: 1, ministryId: 1, functionId: 1 }, { unique: true });
MinistryFunctionSchema.index({ tenantId: 1, ministryId: 1, isActive: 1 });
MinistryFunctionSchema.index({ functionId: 1, isActive: 1 });
