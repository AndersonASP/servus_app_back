import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MinistrySettings extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId;

  // Configurações de disponibilidade
  @Prop({ default: 30 })
  maxBlockedDaysPerMonth: number; // Máximo de dias que voluntário pode bloquear

  @Prop({ default: 7 })
  advanceNoticeDays: number; // Aviso mínimo para bloquear data

  // Configurações de escala
  @Prop({ default: true })
  autoGenerateScales: boolean; // Gerar escalas automaticamente

  @Prop({ default: 2 })
  reminderDaysBefore: number; // Dias antes para lembrar

  @Prop({ default: true })
  allowSelfSubstitution: boolean; // Permitir auto-substituição

  @Prop({ default: true })
  requireLeaderApproval: boolean; // Requerer aprovação do líder

  // Configurações de troca
  @Prop({ default: 24 })
  swapRequestExpiryHours: number; // Horas para expirar solicitação de troca

  @Prop({ default: 3 })
  maxSwapRequestsPerMonth: number; // Máximo de solicitações de troca por mês

  @Prop({ default: true })
  isActive: boolean;
}

export const MinistrySettingsSchema =
  SchemaFactory.createForClass(MinistrySettings);

// Índices para performance
MinistrySettingsSchema.index({ tenantId: 1, ministryId: 1 }, { unique: true });
