import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VolunteerAvailability } from '../schemas/volunteer-availability.schema';
import { MinistrySettings } from '../schemas/ministry-settings.schema';
import { Scale } from '../schemas/scale.schema';

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  reason?: string;
  blockedDates?: Date[];
  maxBlockedDaysReached?: boolean;
}

export interface MonthlyBlockedDaysInfo {
  currentMonth: number;
  maxAllowed: number;
  blockedDates: Date[];
  canBlockMore: boolean;
}

@Injectable()
export class AvailabilityValidator {
  constructor(
    @InjectModel(VolunteerAvailability.name)
    private volunteerAvailabilityModel: Model<VolunteerAvailability>,
    @InjectModel(MinistrySettings.name)
    private ministrySettingsModel: Model<MinistrySettings>,
    @InjectModel(Scale.name)
    private scaleModel: Model<Scale>,
  ) {}

  /**
   * Verifica se um voluntário está disponível em uma data específica
   */
  async checkAvailability(
    userId: string,
    ministryId: string,
    targetDate: Date,
    tenantId: string,
  ): Promise<AvailabilityCheckResult> {
    // Buscar configurações de disponibilidade do voluntário
    const availability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!availability) {
      return {
        isAvailable: true,
        reason: 'Nenhuma restrição de disponibilidade configurada',
      };
    }

    // Verificar se a data está bloqueada
    const isBlocked = availability.blockedDates.some(
      (blockedDate) =>
        blockedDate.isBlocked && this.isSameDate(blockedDate.date, targetDate),
    );

    if (isBlocked) {
      const blockedDateInfo = availability.blockedDates.find(
        (blockedDate) =>
          blockedDate.isBlocked &&
          this.isSameDate(blockedDate.date, targetDate),
      );

      return {
        isAvailable: false,
        reason: `Data bloqueada: ${blockedDateInfo?.reason || 'Motivo não especificado'}`,
        blockedDates: availability.blockedDates
          .filter((bd) => bd.isBlocked)
          .map((bd) => bd.date),
      };
    }

    // Verificar se já tem escala nesta data/horário
    const existingScale = await this.scaleModel.findOne({
      'assignments.assignedMembers': new Types.ObjectId(userId),
      eventDate: targetDate,
      status: { $in: ['published', 'completed'] },
    });

    if (existingScale) {
      return {
        isAvailable: false,
        reason: 'Já possui escala agendada nesta data',
      };
    }

    return {
      isAvailable: true,
      reason: 'Disponível para escalação',
    };
  }

  /**
   * Verifica quantos dias o voluntário bloqueou no mês atual
   */
  async getMonthlyBlockedDaysInfo(
    userId: string,
    ministryId: string,
    tenantId: string,
    year?: number,
    month?: number,
  ): Promise<MonthlyBlockedDaysInfo> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    // Buscar configurações do ministério
    const ministrySettings = await this.ministrySettingsModel.findOne({
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    const maxAllowed = ministrySettings?.maxBlockedDaysPerMonth || 30;

    // Buscar disponibilidade do voluntário
    const availability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!availability) {
      return {
        currentMonth: 0,
        maxAllowed,
        blockedDates: [],
        canBlockMore: true,
      };
    }

    // Filtrar datas bloqueadas do mês atual
    const blockedDates = availability.blockedDates
      .filter((blockedDate) => {
        const date = new Date(blockedDate.date);
        return (
          blockedDate.isBlocked &&
          date.getFullYear() === targetYear &&
          date.getMonth() + 1 === targetMonth
        );
      })
      .map((bd) => bd.date);

    return {
      currentMonth: blockedDates.length,
      maxAllowed,
      blockedDates,
      canBlockMore: blockedDates.length < maxAllowed,
    };
  }

  /**
   * Valida se pode bloquear uma nova data
   */
  async canBlockDate(
    userId: string,
    ministryId: string,
    tenantId: string,
    targetDate: Date,
  ): Promise<{ canBlock: boolean; reason?: string }> {
    // Verificar se a data não é no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return {
        canBlock: false,
        reason: 'Não é possível bloquear datas no passado',
      };
    }

    // Verificar limite mensal
    const monthlyInfo = await this.getMonthlyBlockedDaysInfo(
      userId,
      ministryId,
      tenantId,
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
    );

    if (!monthlyInfo.canBlockMore) {
      return {
        canBlock: false,
        reason: `Limite mensal de ${monthlyInfo.maxAllowed} dias bloqueados atingido`,
      };
    }

    // Verificar se já está bloqueada
    const availability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (availability) {
      const isAlreadyBlocked = availability.blockedDates.some(
        (blockedDate) =>
          blockedDate.isBlocked &&
          this.isSameDate(blockedDate.date, targetDate),
      );

      if (isAlreadyBlocked) {
        return {
          canBlock: false,
          reason: 'Data já está bloqueada',
        };
      }
    }

    return {
      canBlock: true,
      reason: 'Data pode ser bloqueada',
    };
  }

  /**
   * Busca voluntários disponíveis para uma data específica
   */
  async findAvailableVolunteers(
    ministryId: string,
    tenantId: string,
    targetDate: Date,
    excludeUserIds: string[] = [],
  ): Promise<string[]> {
    // Buscar todos os voluntários ativos do ministério
    const availabilityRecords = await this.volunteerAvailabilityModel.find({
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
      userId: { $nin: excludeUserIds.map((id) => new Types.ObjectId(id)) },
    });

    const availableUserIds: string[] = [];

    for (const record of availabilityRecords) {
      const checkResult = await this.checkAvailability(
        record.userId.toString(),
        ministryId,
        targetDate,
        tenantId,
      );

      if (checkResult.isAvailable) {
        availableUserIds.push(record.userId.toString());
      }
    }

    return availableUserIds;
  }

  /**
   * Utilitário para comparar datas (ignorando horário)
   */
  private isSameDate(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
}
