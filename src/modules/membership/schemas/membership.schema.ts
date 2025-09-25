// src/modules/membership/schemas/membership.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MembershipRole } from 'src/common/enums/role.enum';

@Schema({ timestamps: true })
export class Membership extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenant: Types.ObjectId; // ObjectId do tenant

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branch?: Types.ObjectId; // null = vínculo na matriz

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: false })
  ministry?: Types.ObjectId; // opcional p/ tenant_admin / branch_admin

  @Prop({ required: true, enum: Object.values(MembershipRole) })
  role: MembershipRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  needsApproval: boolean; // Para usuários criados via invite que precisam de aprovação do líder

  @Prop({ 
    type: String, 
    enum: ['invite', 'form', 'manual'], 
    default: 'manual',
    required: true 
  })
  source: string; // Origem do voluntário: invite, form, manual

  @Prop({ type: Object, required: false })
  sourceData?: {
    // Para invites
    inviteCode?: string;
    // Para formulários
    formSubmissionId?: Types.ObjectId;
    formData?: any;
  }; // Dados específicos da origem

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId; // Quem aprovou o membership

  @Prop({ required: false })
  approvedAt?: Date; // Quando foi aprovado

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  rejectedBy?: Types.ObjectId; // Quem rejeitou o membership

  @Prop({ required: false })
  rejectedAt?: Date; // Quando foi rejeitado

  @Prop({ required: false })
  rejectionNotes?: string; // Motivo da rejeição
}
export const MembershipSchema = SchemaFactory.createForClass(Membership);
export type MembershipDocument = Membership & Document;

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
