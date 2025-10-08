import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VolunteerAvailability extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ministry', required: true, index: true })
  ministryId: Types.ObjectId;

  // Bloqueios por datas específicas
  @Prop({
    type: [
      {
        date: { type: Date, required: true },
        reason: { type: String, required: true },
        isBlocked: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  blockedDates: {
    date: Date;
    reason: string;
    isBlocked: boolean;
    createdAt: Date;
  }[];

  // Configurações do ministério
  @Prop({ default: 30 })
  maxBlockedDaysPerMonth: number; // Definido pelo líder

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const VolunteerAvailabilitySchema = SchemaFactory.createForClass(
  VolunteerAvailability,
);

// Índices para performance e integridade
VolunteerAvailabilitySchema.index(
  { userId: 1, ministryId: 1, tenantId: 1 },
  { 
    unique: true,
    name: 'user_ministry_tenant_unique',
    background: true
  }
);

// Índices adicionais para performance
VolunteerAvailabilitySchema.index(
  { tenantId: 1, ministryId: 1 },
  { background: true }
);

VolunteerAvailabilitySchema.index(
  { 'blockedDates.date': 1 },
  { background: true }
);

VolunteerAvailabilitySchema.index(
  { userId: 1, isActive: 1 },
  { background: true }
);

// Configurações adicionais do schema
VolunteerAvailabilitySchema.set('timestamps', true);
VolunteerAvailabilitySchema.set('collection', 'volunteeravailabilities');
