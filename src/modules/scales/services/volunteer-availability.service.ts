import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VolunteerAvailability } from '../schemas/volunteer-availability.schema';
import { MinistrySettings } from '../schemas/ministry-settings.schema';
import { SubstitutionRequest } from '../schemas/substitution-request.schema';
import { ServiceHistory } from '../schemas/service-history.schema';
import { AvailabilityValidator } from '../services/availability-validator.service';
import { ScaleAssignmentEngine } from '../services/scale-assignment-engine.service';
import { SubstitutionEngine } from '../services/substitution-engine.service';
import {
  CreateVolunteerAvailabilityDto,
  UpdateVolunteerAvailabilityDto,
  ListVolunteerAvailabilityDto,
} from '../dto/volunteer-availability.dto';
import {
  CreateMinistrySettingsDto,
  UpdateMinistrySettingsDto,
} from '../dto/ministry-settings.dto';
import {
  CreateSubstitutionRequestDto,
  RespondToSubstitutionRequestDto,
  ListSubstitutionRequestDto,
} from '../dto/substitution-request.dto';
import {
  CreateServiceHistoryDto,
  UpdateServiceHistoryDto,
  ListServiceHistoryDto,
} from '../dto/service-history.dto';

@Injectable()
export class VolunteerAvailabilityService {
  constructor(
    @InjectModel(VolunteerAvailability.name)
    private volunteerAvailabilityModel: Model<VolunteerAvailability>,
    @InjectModel(MinistrySettings.name)
    private ministrySettingsModel: Model<MinistrySettings>,
    private availabilityValidator: AvailabilityValidator,
  ) {}

  /**
   * Criar ou atualizar disponibilidade de um voluntário
   */
  async createOrUpdateAvailability(
    tenantId: string,
    dto: CreateVolunteerAvailabilityDto,
    userId: string,
  ): Promise<VolunteerAvailability> {
    // Buscar configurações do ministério
    const ministrySettings = await this.ministrySettingsModel.findOne({
      ministryId: new Types.ObjectId(dto.ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    const maxBlockedDays = ministrySettings?.maxBlockedDaysPerMonth || 30;

    // Verificar se já existe disponibilidade
    const existingAvailability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingAvailability) {
      // Atualizar disponibilidade existente
      return await this.updateAvailability(
        tenantId,
        (existingAvailability._id as any).toString(),
        dto as UpdateVolunteerAvailabilityDto,
        userId,
      );
    }

    // Criar nova disponibilidade
    const availability = new this.volunteerAvailabilityModel({
      userId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null,
      tenantId: new Types.ObjectId(tenantId),
      blockedDates:
        dto.blockedDates?.map((bd) => ({
          date: new Date(bd.date),
          reason: bd.reason,
          isBlocked: bd.isBlocked ?? true,
          createdAt: new Date(),
        })) || [],
      maxBlockedDaysPerMonth: dto.maxBlockedDaysPerMonth || maxBlockedDays,
      isActive: dto.isActive ?? true,
      lastUpdated: new Date(),
    });

    return await availability.save();
  }

  /**
   * Atualizar disponibilidade existente
   */
  async updateAvailability(
    tenantId: string,
    availabilityId: string,
    dto: UpdateVolunteerAvailabilityDto,
    userId: string,
  ): Promise<VolunteerAvailability> {
    const availability =
      await this.volunteerAvailabilityModel.findById(availabilityId);

    if (!availability) {
      throw new NotFoundException('Disponibilidade não encontrada');
    }

    if (availability.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    // Atualizar campos
    if (dto.blockedDates) {
      availability.blockedDates = dto.blockedDates.map((bd) => ({
        date: new Date(bd.date),
        reason: bd.reason,
        isBlocked: bd.isBlocked ?? true,
        createdAt: new Date(),
      }));
    }

    if (dto.maxBlockedDaysPerMonth !== undefined) {
      availability.maxBlockedDaysPerMonth = dto.maxBlockedDaysPerMonth;
    }

    if (dto.isActive !== undefined) {
      availability.isActive = dto.isActive;
    }

    availability.lastUpdated = new Date();

    return await availability.save();
  }

  /**
   * Encontrar ou criar documento de disponibilidade de forma atômica
   */
  private async findOrCreateAvailability(
    userId: string,
    ministryId: string,
    tenantId: string,
  ): Promise<VolunteerAvailability> {
    const query = {
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
    };

    // Tentar encontrar documento existente
    let availability = await this.volunteerAvailabilityModel.findOne(query);

    if (availability) {
      // Atualizar timestamp
      availability.lastUpdated = new Date();
      await availability.save();
      return availability;
    }

    // Documento não existe, criar usando upsert atômico
    try {
      availability = await this.volunteerAvailabilityModel.findOneAndUpdate(
        query,
        {
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
            ministryId: new Types.ObjectId(ministryId),
            tenantId: new Types.ObjectId(tenantId),
            blockedDates: [],
            maxBlockedDaysPerMonth: 30,
            isActive: true,
          },
          $set: {
            lastUpdated: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      return availability!;
    } catch (error) {
      // Se der erro de duplicata, buscar novamente
      if (error.code === 11000) {
        availability = await this.volunteerAvailabilityModel.findOne(query);
        if (availability) {
          availability.lastUpdated = new Date();
          await availability.save();
          return availability;
        }
      }
      
      throw new Error(`Falha ao criar disponibilidade: ${error.message}`);
    }
  }

  /**
   * Bloquear uma data específica
   */
  async blockDate(
    tenantId: string,
    userId: string,
    ministryId: string,
    date: Date,
    reason: string,
  ): Promise<VolunteerAvailability> {
    // Verificar se pode bloquear a data
    const canBlock = await this.availabilityValidator.canBlockDate(
      userId,
      ministryId,
      tenantId,
      date,
    );

    if (!canBlock.canBlock) {
      throw new BadRequestException(canBlock.reason);
    }

    // Usar operação atômica para garantir consistência
    const availability = await this.findOrCreateAvailability(
      userId,
      ministryId,
      tenantId
    );

    // Verificar se a data já está bloqueada
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const existingBlockedDate = availability.blockedDates.find(
      (blockedDate) => {
        const blockedDateString = new Date(blockedDate.date).toISOString().split('T')[0];
        return blockedDateString === dateString && blockedDate.isBlocked === true;
      }
    );

    if (existingBlockedDate) {
      // Atualizar motivo se diferente
      if (existingBlockedDate.reason !== reason) {
        existingBlockedDate.reason = reason;
        existingBlockedDate.createdAt = new Date();
        availability.lastUpdated = new Date();
        await availability.save();
        return availability;
      }
      // Data já bloqueada com mesmo motivo, retornar sem alteração
      return availability;
    }

    // Adicionar nova data bloqueada
    availability.blockedDates.push({
      date: date,
      reason: reason,
      isBlocked: true,
      createdAt: new Date(),
    });

    availability.lastUpdated = new Date();
    await availability.save();

    return availability;
  }

  /**
   * Listar todas as indisponibilidades de um voluntário
   */
  async getVolunteerUnavailabilities(
    tenantId: string,
    userId: string,
    ministryId?: string,
  ): Promise<VolunteerAvailability[]> {
    const query: any = {
      userId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    };

    if (ministryId) {
      query.ministryId = new Types.ObjectId(ministryId);
    }

    return await this.volunteerAvailabilityModel
      .find(query)
      .populate('ministryId', 'name')
      .sort({ lastUpdated: -1 })
      .exec();
  }

  /**
   * Verificar se uma data específica está bloqueada
   */
  async isDateBlocked(
    tenantId: string,
    userId: string,
    ministryId: string,
    date: Date,
  ): Promise<boolean> {
    const availability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!availability) {
      return false;
    }

    const dateString = date.toISOString().split('T')[0];
    return availability.blockedDates.some(
      (blockedDate) => {
        const blockedDateString = new Date(blockedDate.date).toISOString().split('T')[0];
        return blockedDateString === dateString && blockedDate.isBlocked === true;
      }
    );
  }

  /**
   * Desbloquear uma data específica
   */
  async unblockDate(
    tenantId: string,
    userId: string,
    ministryId: string,
    date: Date,
  ): Promise<VolunteerAvailability> {
    const availability = await this.volunteerAvailabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!availability) {
      throw new NotFoundException('Disponibilidade não encontrada');
    }

    // Remover data bloqueada
    availability.blockedDates = availability.blockedDates.filter(
      (bd) => !this.isSameDate(bd.date, date),
    );

    availability.lastUpdated = new Date();

    return await availability.save();
  }

  /**
   * Listar disponibilidades
   */
  async listAvailability(
    tenantId: string,
    query: ListVolunteerAvailabilityDto,
  ): Promise<VolunteerAvailability[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.ministryId) {
      filter.ministryId = new Types.ObjectId(query.ministryId);
    }

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    return await this.volunteerAvailabilityModel
      .find(filter)
      .populate('userId', 'name email')
      .populate('ministryId', 'name')
      .sort({ lastUpdated: -1 })
      .exec();
  }

  /**
   * Verificar disponibilidade de um voluntário
   */
  async checkVolunteerAvailability(
    tenantId: string,
    userId: string,
    ministryId: string,
    date: Date,
  ) {
    return await this.availabilityValidator.checkAvailability(
      userId,
      ministryId,
      date,
      tenantId,
    );
  }

  /**
   * Obter informações de dias bloqueados no mês
   */
  async getMonthlyBlockedDaysInfo(
    tenantId: string,
    userId: string,
    ministryId: string,
    year?: number,
    month?: number,
  ) {
    return await this.availabilityValidator.getMonthlyBlockedDaysInfo(
      userId,
      ministryId,
      tenantId,
      year,
      month,
    );
  }

  /**
   * Utilitário para comparar datas
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
