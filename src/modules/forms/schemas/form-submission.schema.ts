import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FormSubmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

@Schema({ timestamps: true })
export class FormSubmission extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CustomForm', required: true })
  formId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId;

  @Prop({ required: true })
  volunteerName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: false })
  preferredMinistry?: Types.ObjectId;

  @Prop({ default: 'volunteer' })
  preferredRole: string;

  @Prop({ type: Object, default: {} })
  customFields: Record<string, any>;

  // 🆕 Campos específicos para aprovação de voluntários por líderes
  @Prop({ type: [String], default: [] })
  selectedFunctions: string[]; // Funções selecionadas pelo voluntário

  @Prop({
    required: true,
    enum: FormSubmissionStatus,
    default: FormSubmissionStatus.PENDING,
  })
  status: FormSubmissionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewNotes?: string;

  @Prop()
  reviewedAt?: Date;

  // 🆕 Campos específicos para aprovação por líderes de ministério
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedByLeader?: Types.ObjectId; // Líder que aprovou especificamente

  @Prop()
  leaderApprovalNotes?: string; // Comentários do líder na aprovação

  @Prop()
  leaderApprovedAt?: Date; // Data da aprovação pelo líder

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  processedBy?: Types.ObjectId;

  @Prop()
  processedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdUserId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Membership', required: false })
  createdMembershipId?: Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FormSubmissionSchema =
  SchemaFactory.createForClass(FormSubmission);

// Índices para performance
FormSubmissionSchema.index({ formId: 1, status: 1 });
FormSubmissionSchema.index({ tenantId: 1, status: 1 });
FormSubmissionSchema.index({ email: 1 });
FormSubmissionSchema.index({ createdAt: -1 });

// 🆕 Índices específicos para aprovações por ministério
FormSubmissionSchema.index({ preferredMinistry: 1, status: 1 });
FormSubmissionSchema.index({ tenantId: 1, preferredMinistry: 1, status: 1 });
FormSubmissionSchema.index({ approvedByLeader: 1 });
