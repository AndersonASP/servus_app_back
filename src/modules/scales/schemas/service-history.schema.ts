import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ServiceHistory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Scale', required: true, index: true })
  scaleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Function', required: true, index: true })
  functionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId;

  @Prop({ required: true, index: true })
  serviceDate: Date;

  @Prop({
    enum: ['completed', 'missed', 'cancelled', 'replaced'],
    default: 'completed',
    index: true,
  })
  status: string;

  @Prop()
  notes?: string;

  // Campos para auditoria
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recordedBy?: Types.ObjectId; // Quem registrou (líder ou sistema)

  @Prop({ default: Date.now })
  recordedAt: Date;

  // Campos de contexto
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  // Campos para substituição
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  originalUserId?: Types.ObjectId; // Usuário original (se foi substituição)

  @Prop({ type: Types.ObjectId, ref: 'SubstitutionRequest', required: false })
  substitutionRequestId?: Types.ObjectId; // Referência à solicitação de troca
}

export const ServiceHistorySchema =
  SchemaFactory.createForClass(ServiceHistory);

// Índices para performance
ServiceHistorySchema.index({ userId: 1, serviceDate: 1 });
ServiceHistorySchema.index({ ministryId: 1, serviceDate: 1 });
ServiceHistorySchema.index({ tenantId: 1, serviceDate: 1 });
ServiceHistorySchema.index({ status: 1, serviceDate: 1 });
