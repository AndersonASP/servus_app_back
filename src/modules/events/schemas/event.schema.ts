import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

@Schema({ _id: false })
class RecurrencePattern {
  @Prop()
  interval?: number; // a cada X dias/semanas/meses

  @Prop({ type: [Number], default: undefined })
  daysOfWeek?: number[]; // 0-6 (domingo-sábado)

  @Prop()
  dayOfMonth?: number; // 1-31

  @Prop()
  weekOfMonth?: number; // 1-5 (primeira, segunda, terceira, quarta, quinta semana)

  @Prop()
  dayOfWeek?: number; // 0-6 (domingo-sábado) - usado com weekOfMonth

  @Prop()
  endDate?: Date; // data de término da recorrência

  @Prop()
  occurrences?: number; // número máximo de ocorrências
}

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: false, index: true })
  ministryId?: Types.ObjectId; // ministério responsável (opcional para eventos globais)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({ required: true })
  eventDate: Date; // data base do evento (para não recorrentes) ou primeira ocorrência

  @Prop({ required: true })
  eventTime: string; // HH:mm (armazenado como string para simplicidade)

  @Prop({
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
    index: true,
  })
  recurrenceType: RecurrenceType;

  @Prop({ type: RecurrencePattern })
  recurrencePattern?: RecurrencePattern;

  @Prop({
    enum: ['global', 'ministry_specific'],
    default: 'global',
    index: true,
  })
  eventType: 'global' | 'ministry_specific';

  @Prop({ default: true, index: true })
  isGlobal: boolean; // true para eventos globais (admin-only), false para específicos de ministério

  @Prop({ type: String })
  specialNotes?: string; // anotações como "chegar mais cedo para passagem de som"

  @Prop({
    enum: ['draft', 'published', 'completed', 'cancelled'],
    default: 'draft',
    index: true,
  })
  status: 'draft' | 'published' | 'completed' | 'cancelled';
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ tenantId: 1, branchId: 1, eventDate: 1 });
EventSchema.index({ tenantId: 1, isGlobal: 1, eventType: 1 });
EventSchema.index({ tenantId: 1, status: 1, eventDate: 1 });
EventSchema.index({ name: 'text' });
