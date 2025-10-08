import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventExceptionType = 'skip' | 'cancel_after';

@Schema({ timestamps: true })
export class EventException extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId: Types.ObjectId;

  // Para tipo 'skip': data específica da ocorrência a ser ignorada
  @Prop({ required: false, index: true })
  instanceDate?: Date;

  // Para tipo 'cancel_after': quaisquer ocorrências com data >= fromDate serão ignoradas
  @Prop({ required: false, index: true })
  fromDate?: Date;

  @Prop({ enum: ['skip', 'cancel_after'], required: true, index: true })
  type: EventExceptionType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const EventExceptionSchema =
  SchemaFactory.createForClass(EventException);

EventExceptionSchema.index({ tenantId: 1, branchId: 1, eventId: 1, type: 1 });
EventExceptionSchema.index({ eventId: 1, instanceDate: 1 });
EventExceptionSchema.index({ eventId: 1, fromDate: 1 });
