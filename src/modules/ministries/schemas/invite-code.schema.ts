import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InviteCode extends Document {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  expiresAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const InviteCodeSchema = SchemaFactory.createForClass(InviteCode);

// Índice único para código
InviteCodeSchema.index({ code: 1 }, { unique: true });

// Índice para buscar códigos por ministério
InviteCodeSchema.index({ ministryId: 1, isActive: 1 });

// Índice para buscar códigos por tenant
InviteCodeSchema.index({ tenantId: 1, isActive: 1 });
