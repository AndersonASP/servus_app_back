// src/modules/membership/schemas/membership.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MembershipRole } from 'src/common/enums/role.enum';

@Schema({ timestamps: true })
export class Membership extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenant: Types.ObjectId; // matriz

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branch?: Types.ObjectId; // null = vínculo na matriz

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: false })
  ministry?: Types.ObjectId; // opcional p/ tenant_admin / branch_admin

  @Prop({ required: true, enum: Object.values(MembershipRole) })
  role: MembershipRole;

  @Prop({ default: true })
  isActive: boolean;
}
export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Único por combinação (user+tenant+branch+ministry)
MembershipSchema.index(
  { user: 1, tenant: 1, branch: 1, ministry: 1 },
  { unique: true },
);

// Acelera consultas
MembershipSchema.index({
  tenant: 1,
  branch: 1,
  ministry: 1,
  role: 1,
  isActive: 1,
});
