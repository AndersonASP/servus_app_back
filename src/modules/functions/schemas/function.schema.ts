import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Function extends Document {
  @Prop({ required: true })
  name: string; // Nome original digitado pelo usuário

  @Prop({ required: true, unique: true })
  slug: string; // Nome normalizado (lowercase, sem acentos/espaços)

  @Prop()
  category?: string; // Categoria opcional (ex: "Música", "Técnico")

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop()
  createdBy?: string; // ID do usuário que criou

  @Prop()
  aliases?: string[]; // Sinônimos/variações do nome
}

export const FunctionSchema = SchemaFactory.createForClass(Function);

// Índices para performance
FunctionSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
FunctionSchema.index({ tenantId: 1, name: 1 });
FunctionSchema.index({ tenantId: 1, isActive: 1 });
