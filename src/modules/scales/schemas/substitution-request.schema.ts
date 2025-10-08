import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SubstitutionRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Scale', required: true, index: true })
  scaleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requesterId: Types.ObjectId; // Voluntário A (quem solicita)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  targetId: Types.ObjectId; // Voluntário B (quem recebe a solicitação)

  @Prop({ type: Types.ObjectId, ref: 'Function', required: true, index: true })
  functionId: Types.ObjectId;

  @Prop({ required: true })
  reason: string; // Motivo da troca

  @Prop({
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ required: false })
  rejectionReason?: string; // Motivo da rejeição (se aplicável)

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now() + 24 * 60 * 60 * 1000 }) // 24 horas
  expiresAt: Date; // Prazo para resposta

  // Campos para auditoria
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  respondedBy?: Types.ObjectId; // Quem respondeu (targetId)

  @Prop({ required: false })
  respondedAt?: Date;

  // Campos de contexto
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId;
}

export const SubstitutionRequestSchema =
  SchemaFactory.createForClass(SubstitutionRequest);

// Índices para performance
SubstitutionRequestSchema.index({ scaleId: 1, status: 1 });
SubstitutionRequestSchema.index({ requesterId: 1, status: 1 });
SubstitutionRequestSchema.index({ targetId: 1, status: 1 });
SubstitutionRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL para limpeza automática
