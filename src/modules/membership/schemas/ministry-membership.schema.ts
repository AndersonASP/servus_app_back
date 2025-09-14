import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MembershipRole } from '../../../common/enums/role.enum';

export type MinistryMembershipDocument = MinistryMembership & Document;

@Schema({ timestamps: true })
export class MinistryMembership {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true })
  ministryId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(MembershipRole), 
    required: true 
  })
  role: MembershipRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  joinedAt: Date;

  @Prop({ type: Date })
  leftAt?: Date;

  @Prop({ type: String })
  notes?: string;

  // Campos de auditoria
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const MinistryMembershipSchema = SchemaFactory.createForClass(MinistryMembership);

// Índices para performance
MinistryMembershipSchema.index({ userId: 1, ministryId: 1 }, { unique: true });
MinistryMembershipSchema.index({ ministryId: 1, isActive: 1 });
MinistryMembershipSchema.index({ userId: 1, isActive: 1 });
MinistryMembershipSchema.index({ role: 1, isActive: 1 });
