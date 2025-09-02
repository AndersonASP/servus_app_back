import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: false }) // null para login via Google
  password?: string;

  @Prop({
    required: true,
    default: Role.Volunteer,
    enum: Object.values(Role),
  })
  role: string;

  @Prop({ required: false })
  tenantId?: string; // pode ser null para superadmin// Igreja Matriz

  @Prop({ type: String, required: false })
  branchId?: string; // Filial específica, se houver

  @Prop({ required: false })
  googleId?: string; // ID único do Google

  @Prop({ required: false })
  picture?: string;

  @Prop({ default: true })
  isActive: boolean;

  // ========================================
  // 📱 CAMPOS PARA AUTO-REGISTRO
  // ========================================
  
  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  birthDate?: string;

  @Prop({
    type: {
      cep: String,
      rua: String,
      numero: String,
      bairro: String,
      cidade: String,
      estado: String,
    },
    required: false,
  })
  address?: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };

  @Prop({ required: false })
  bio?: string; // Breve descrição sobre o usuário

  @Prop({ type: [String], required: false })
  skills?: string[]; // Habilidades/competências

  @Prop({ required: false })
  availability?: string; // Disponibilidade para servir

  @Prop({ default: false })
  profileCompleted: boolean; // Se o perfil foi completado

  @Prop({
    type: [
      {
        token: String,
        deviceId: String,
        expiresAt: Date,
        absoluteExpiry: Date,
      },
    ],
    default: [],
  })
  refreshTokens: {
    token: string;
    deviceId: string;
    expiresAt: Date;
    absoluteExpiry: Date;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices para otimizar queries por tenant
UserSchema.index({ tenantId: 1, email: 1 });
