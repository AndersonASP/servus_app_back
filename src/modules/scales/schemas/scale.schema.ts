import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScaleStatus = 'draft' | 'published' | 'completed' | 'cancelled';

@Schema({ _id: false })
class ScaleAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Function', required: true })
  functionId: Types.ObjectId;

  @Prop({ required: true })
  functionName: string;

  @Prop({ required: true, min: 1 })
  requiredSlots: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  assignedMembers: Types.ObjectId[];

  @Prop({ default: false })
  isRequired: boolean; // se a função é obrigatória para o evento
}

@Schema({ timestamps: true })
export class Scale extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId: Types.ObjectId; // evento global ao qual esta escala pertence

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId; // ministério responsável por esta escala

  @Prop({ type: Types.ObjectId, ref: 'ScaleTemplate', required: true })
  templateId: Types.ObjectId; // template usado para criar esta escala

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // líder do ministério que criou

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string; // nome da escala (ex: "Escala de Louvor - Culto Domingo")

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({ required: true })
  eventDate: Date; // data específica desta escala (pode ser diferente do evento base)

  @Prop({ required: true })
  eventTime: string; // HH:mm

  @Prop({ type: [ScaleAssignment], default: [] })
  assignments: ScaleAssignment[];

  @Prop({ enum: ['draft', 'published', 'completed', 'cancelled'], default: 'draft', index: true })
  status: ScaleStatus;

  @Prop({ default: false })
  autoAssign: boolean; // se deve tentar atribuir automaticamente

  @Prop({ default: false })
  allowOverbooking: boolean; // se permite mais voluntários que o necessário

  @Prop({ default: 1 })
  reminderDaysBefore: number; // dias antes para lembrar os voluntários

  @Prop({ type: String })
  specialNotes?: string; // notas específicas desta escala
}

export const ScaleSchema = SchemaFactory.createForClass(Scale);

// Índices para consultas eficientes
ScaleSchema.index({ tenantId: 1, branchId: 1, eventId: 1, ministryId: 1 });
ScaleSchema.index({ tenantId: 1, ministryId: 1, eventDate: 1 });
ScaleSchema.index({ tenantId: 1, status: 1, eventDate: 1 });
ScaleSchema.index({ eventId: 1, ministryId: 1 }); // para buscar escalas de um evento por ministério
ScaleSchema.index({ name: 'text' });
