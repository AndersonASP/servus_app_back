import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  // 🔹 Identificação básica
  @Prop({ required: true, unique: true })
  tenantId: string; // ex: igreja001

  @Prop({ required: true })
  name: string; // Nome da igreja matriz

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  // 🔹 Dados administrativos
  @Prop()
  cnpj?: string;

  @Prop()
  inscricaoEstadual?: string;

  @Prop()
  inscricaoMunicipal?: string;

  // 🔹 Contato principal
  @Prop()
  email?: string;

  @Prop()
  telefone?: string;

  @Prop()
  site?: string;

  // 🔹 Endereço
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

  // 🔹 Plano contratado
  @Prop({ default: 'basic', enum: ['basic', 'pro', 'enterprise'] })
  plan: string;

  @Prop({ default: 1 }) // -1 = ilimitado
  maxBranches: number;

  @Prop()
  planoAtivoDesde?: Date;

  @Prop()
  planoExpiraEm?: Date;

  @Prop({ enum: ['ativo', 'pendente', 'inadimplente'], default: 'ativo' })
  statusPagamento?: string;

  @Prop({ enum: ['cartao', 'boleto', 'pix'], default: 'pix' })
  formaPagamentoPreferida?: string;

  // 🔹 Branding
  @Prop()
  logoUrl?: string;

  @Prop()
  corTema?: string;

  @Prop({ default: 'pt-BR' })
  idioma?: string;

  @Prop()
  timezone?: string;

  // 🔹 Configurações de cultos semanais
  @Prop({
    type: [
      {
        dia: { type: String, required: true }, // domingo, quarta
        horarios: { type: [String], required: true }, // ["09:00", "19:30"]
      },
    ],
    default: [],
  })
  diasCulto?: { dia: string; horarios: string[] }[];

  // 🔹 Eventos padrão
  @Prop({
    type: [
      {
        nome: { type: String, required: true },
        dia: { type: String, required: true },
        horarios: { type: [String], required: true },
        tipo: { type: String, default: 'culto' },
      },
    ],
    default: [],
  })
  eventosPadrao?: {
    nome: string;
    dia: string;
    horarios: string[];
    tipo?: string;
  }[];

  // 🔹 Comunicação
  @Prop()
  canalComunicacaoPreferido?: string;

  @Prop()
  whatsappOficial?: string;

  @Prop()
  emailFinanceiro?: string;

  @Prop()
  emailSuporte?: string;

  // 🔹 Gestão interna
  @Prop()
  limiteUsuarios?: number;

  @Prop()
  limiteArmazenamento?: number;

  @Prop()
  ultimoAcesso?: Date;

  @Prop()
  notasInternas?: string; // uso interno da equipe Servus

  // 🔹 Relacionamentos
  @Prop({ type: Types.ObjectId, ref: 'User' })
  responsavel?: Types.ObjectId; // admin principal do tenant

  @Prop()
  createdBy?: string; // superadmin que criou o tenant

  // 🔹 Feature Flags
  @Prop({
    type: {
      functionsByMinistry: { type: Boolean, default: false },
    },
    default: {},
  })
  features?: {
    functionsByMinistry?: boolean;
  };
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
