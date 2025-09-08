import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Ministry extends Document {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: false, index: true }) // Pode ser null para ministérios da matriz
  branchId?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  ministryFunctions?: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const MinistrySchema = SchemaFactory.createForClass(Ministry);

// Índice único para tenant + branch + slug (permitindo branch null)
MinistrySchema.index(
  { tenantId: 1, branchId: 1, slug: 1 },
  {
    unique: true,
    sparse: true, // Permite múltiplos documentos com branchId null
  },
);
