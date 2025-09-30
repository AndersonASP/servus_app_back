import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class FunctionAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Function', required: true })
  functionId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  requiredSlots: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assignedMembers: Types.ObjectId[];

  @Prop({ default: false })
  isComplete: boolean;
}

@Schema({ _id: false })
class MinistryScale {
  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true })
  ministryId: Types.ObjectId;

  @Prop({ type: [FunctionAssignment], default: [] })
  functionAssignments: FunctionAssignment[];
}

@Schema({ timestamps: true })
export class EventInstance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  instanceDate: Date;

  @Prop({ type: [MinistryScale], default: [] })
  ministryScales: MinistryScale[];

  @Prop({ enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled', index: true })
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  @Prop()
  notes?: string;
}

export const EventInstanceSchema = SchemaFactory.createForClass(EventInstance);

EventInstanceSchema.index({ tenantId: 1, branchId: 1, instanceDate: 1 });
EventInstanceSchema.index({ eventId: 1, instanceDate: 1 });


