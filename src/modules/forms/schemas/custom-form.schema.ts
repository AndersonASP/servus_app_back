import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  TEXTAREA = 'textarea',
  DATE = 'date',
  NUMBER = 'number',
  CHECKBOX = 'checkbox',
  MINISTRY_SELECT = 'ministry_select',
  FUNCTION_MULTISELECT = 'function_multiselect',
}

export class FormField {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true, enum: FormFieldType })
  type: FormFieldType;

  @Prop({ default: false })
  required: boolean;

  @Prop({ default: '' })
  placeholder: string;

  @Prop({ default: '' })
  helpText: string;

  @Prop({ type: [String], default: [] })
  options: string[]; // Para campos select/multiselect

  @Prop({ default: '' })
  defaultValue: string;

  @Prop({ default: 0 })
  order: number;
}

export class FormSettings {
  @Prop({ default: true })
  allowMultipleSubmissions: boolean;

  @Prop({ default: false })
  requireApproval: boolean;

  @Prop({ default: true })
  showProgress: boolean;

  @Prop({ default: '' })
  successMessage: string;

  @Prop({ default: '' })
  submitButtonText: string;
}

@Schema({ timestamps: true })
export class CustomForm extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [FormField], required: true })
  fields: FormField[];

  @Prop({ type: [Types.ObjectId], ref: 'Ministry', default: [] })
  availableMinistries: Types.ObjectId[];

  @Prop({ type: [String], default: ['volunteer'] })
  availableRoles: string[];

  @Prop({ type: FormSettings, default: () => new FormSettings() })
  settings: FormSettings;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: 0 })
  submissionCount: number;

  @Prop({ default: 0 })
  approvedCount: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomFormSchema = SchemaFactory.createForClass(CustomForm);

// Índices para performance
CustomFormSchema.index({ tenantId: 1, isActive: 1 });
CustomFormSchema.index({ createdBy: 1 });
CustomFormSchema.index({ isPublic: 1, isActive: 1 });
CustomFormSchema.index({ expiresAt: 1 });
