import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MemberFunctionStatus {
  EM_TREINO = 'em_treino',
  APROVADO = 'aprovado',
  BLOQUEADO = 'bloqueado',
}

export enum MemberFunctionLevel {
  INICIANTE = 'iniciante',
  INTERMEDIARIO = 'intermediario',
  AVANCADO = 'avancado',
  ESPECIALISTA = 'especialista',
}

@Schema({ timestamps: true })
export class MemberFunction extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  memberId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Ministry' })
  ministryId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Function' })
  functionId: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: Object.values(MemberFunctionStatus),
    default: MemberFunctionStatus.EM_TREINO 
  })
  status: MemberFunctionStatus;

  @Prop({ 
    enum: Object.values(MemberFunctionLevel),
    default: MemberFunctionLevel.INICIANTE 
  })
  level?: MemberFunctionLevel;

  @Prop({ default: 1 })
  priority?: number; // Prioridade/preferência (1 = mais preferido)

  @Prop()
  notes?: string; // Observações sobre a qualificação

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  approvedBy?: string; // ID do usuário que aprovou

  @Prop()
  approvedAt?: Date;

  @Prop()
  createdBy?: string; // ID do usuário que criou o vínculo
}

export const MemberFunctionSchema = SchemaFactory.createForClass(MemberFunction);

// Índices para performance e unicidade
MemberFunctionSchema.index({ tenantId: 1, memberId: 1, ministryId: 1, functionId: 1 }, { unique: true });
MemberFunctionSchema.index({ tenantId: 1, ministryId: 1, functionId: 1, status: 1 });
MemberFunctionSchema.index({ memberId: 1, isActive: 1 });
