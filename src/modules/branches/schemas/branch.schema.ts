import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Branch extends Document {
  // 🔹 Identificação
  @Prop({ required: true, unique: true })
  branchId: string; // Ex.: igreja001-filial01

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  // 🔹 Endereço completo
  @Prop({
    type: {
      cep: String,
      rua: String,
      numero: String,
      bairro: String,
      cidade: String,
      estado: String,
      complemento: String,
    },
    _id: false,
  })
  endereco?: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    complemento?: string;
  };

  // 🔹 Contato
  @Prop()
  telefone?: string;

  @Prop()
  email?: string;

  @Prop()
  whatsappOficial?: string;

  // 🔹 Relação com tenant (igreja matriz)
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenant: Types.ObjectId;

  // 🔹 Usuário responsável pela filial
  @Prop({ type: Types.ObjectId, ref: 'User' })
  responsavel?: Types.ObjectId;

  // 🔹 Configurações de cultos semanais
  @Prop({
    type: [
      {
        dia: { type: String, required: true },      // domingo, quarta
        horarios: { type: [String], required: true } // ["09:00", "19:30"]
      }
    ],
    default: []
  })
  diasCulto?: { dia: string; horarios: string[] }[];

  // 🔹 Eventos padrão (templates)
  @Prop({
    type: [
      {
        nome: { type: String, required: true },
        dia: { type: String, required: true },
        horarios: { type: [String], required: true },
        tipo: { type: String, default: 'culto' }
      }
    ],
    default: []
  })
  eventosPadrao?: {
    nome: string;
    dia: string;
    horarios: string[];
    tipo?: string;
  }[];

  // 🔹 Módulos ativos nesta filial
  @Prop({ type: [String], default: ['voluntariado'] })
  modulosAtivos?: string[];

  // 🔹 Branding e idioma
  @Prop()
  logoUrl?: string;

  @Prop()
  corTema?: string;

  @Prop({ default: 'pt-BR' })
  idioma?: string;

  @Prop()
  timezone?: string;

  // 🔹 Controle
  @Prop()
  createdBy?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

BranchSchema.index({ name: 1, tenant: 1 }, { unique: true });