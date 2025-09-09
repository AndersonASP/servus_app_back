import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserFunctionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class UserFunction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true })
  ministryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Function', required: true })
  functionId: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: Object.values(UserFunctionStatus),
    default: UserFunctionStatus.PENDING 
  })
  status: UserFunctionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  notes?: string; // Observações do líder

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId; // null = matriz
}

export const UserFunctionSchema = SchemaFactory.createForClass(UserFunction);

// Índices para performance e unicidade
UserFunctionSchema.index({ userId: 1, ministryId: 1, functionId: 1 }, { unique: true });
UserFunctionSchema.index({ ministryId: 1, status: 1 });
UserFunctionSchema.index({ userId: 1, status: 1 });
UserFunctionSchema.index({ tenantId: 1, branchId: 1 });
