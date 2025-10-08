import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceHistory } from '../schemas/service-history.schema';
import { Scale } from '../schemas/scale.schema';
import {
  CreateServiceHistoryDto,
  UpdateServiceHistoryDto,
  ListServiceHistoryDto,
  ServiceHistoryStatus,
} from '../dto/service-history.dto';

@Injectable()
export class ServiceHistoryService {
  constructor(
    @InjectModel(ServiceHistory.name)
    private serviceHistoryModel: Model<ServiceHistory>,
    @InjectModel(Scale.name)
    private scaleModel: Model<Scale>,
  ) {}

  /**
   * Criar registro de histórico de serviço
   */
  async createServiceHistory(
    tenantId: string,
    dto: CreateServiceHistoryDto,
    recordedBy?: string,
  ): Promise<ServiceHistory> {
    // Verificar se a escala existe
    const scale = await this.scaleModel.findById(dto.scaleId);
    if (!scale) {
      throw new NotFoundException('Escala não encontrada');
    }

    if (scale.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    // Verificar se já existe histórico para este usuário nesta escala
    const existingHistory = await this.serviceHistoryModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      scaleId: new Types.ObjectId(dto.scaleId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingHistory) {
      throw new BadRequestException('Histórico já existe para este serviço');
    }

    const serviceHistory = new this.serviceHistoryModel({
      userId: new Types.ObjectId(dto.userId),
      scaleId: new Types.ObjectId(dto.scaleId),
      functionId: new Types.ObjectId(dto.functionId),
      ministryId: new Types.ObjectId(dto.ministryId),
      serviceDate: new Date(dto.serviceDate),
      status: dto.status || ServiceHistoryStatus.COMPLETED,
      notes: dto.notes,
      recordedBy: recordedBy ? new Types.ObjectId(recordedBy) : null,
      recordedAt: new Date(),
      tenantId: new Types.ObjectId(tenantId),
      branchId: scale.branchId,
      originalUserId: dto.originalUserId
        ? new Types.ObjectId(dto.originalUserId)
        : null,
      substitutionRequestId: dto.substitutionRequestId
        ? new Types.ObjectId(dto.substitutionRequestId)
        : null,
    });

    return await serviceHistory.save();
  }

  /**
   * Atualizar histórico de serviço
   */
  async updateServiceHistory(
    tenantId: string,
    historyId: string,
    dto: UpdateServiceHistoryDto,
    updatedBy?: string,
  ): Promise<ServiceHistory> {
    const serviceHistory = await this.serviceHistoryModel.findById(historyId);

    if (!serviceHistory) {
      throw new NotFoundException('Histórico de serviço não encontrado');
    }

    if (serviceHistory.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    // Atualizar campos
    if (dto.status !== undefined) {
      serviceHistory.status = dto.status;
    }

    if (dto.notes !== undefined) {
      serviceHistory.notes = dto.notes;
    }

    return await serviceHistory.save();
  }

  /**
   * Listar histórico de serviços
   */
  async listServiceHistory(
    tenantId: string,
    query: ListServiceHistoryDto,
  ): Promise<ServiceHistory[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.ministryId) {
      filter.ministryId = new Types.ObjectId(query.ministryId);
    }

    if (query.scaleId) {
      filter.scaleId = new Types.ObjectId(query.scaleId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.startDate) {
      filter.serviceDate = { $gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      filter.serviceDate = {
        ...filter.serviceDate,
        $lte: new Date(query.endDate),
      };
    }

    return await this.serviceHistoryModel
      .find(filter)
      .populate('userId', 'name email')
      .populate('functionId', 'name description')
      .populate('ministryId', 'name')
      .populate('scaleId', 'name eventDate eventTime')
      .populate('recordedBy', 'name email')
      .sort({ serviceDate: -1 })
      .exec();
  }

  /**
   * Obter histórico de serviço por ID
   */
  async getServiceHistoryById(
    tenantId: string,
    historyId: string,
  ): Promise<ServiceHistory> {
    const serviceHistory = await this.serviceHistoryModel
      .findById(historyId)
      .populate('userId', 'name email')
      .populate('functionId', 'name description')
      .populate('ministryId', 'name')
      .populate('scaleId', 'name eventDate eventTime')
      .populate('recordedBy', 'name email')
      .exec();

    if (!serviceHistory) {
      throw new NotFoundException('Histórico de serviço não encontrado');
    }

    if (serviceHistory.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    return serviceHistory;
  }

  /**
   * Obter estatísticas de serviço de um voluntário
   */
  async getVolunteerServiceStats(
    tenantId: string,
    userId: string,
    ministryId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
    };

    if (ministryId) {
      filter.ministryId = new Types.ObjectId(ministryId);
    }

    if (startDate) {
      filter.serviceDate = { $gte: startDate };
    }

    if (endDate) {
      filter.serviceDate = {
        ...filter.serviceDate,
        $lte: endDate,
      };
    }

    const stats = await this.serviceHistoryModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalServices = await this.serviceHistoryModel.countDocuments(filter);
    const completedServices =
      stats.find((s) => s._id === 'completed')?.count || 0;
    const missedServices = stats.find((s) => s._id === 'missed')?.count || 0;
    const cancelledServices =
      stats.find((s) => s._id === 'cancelled')?.count || 0;

    return {
      totalServices,
      completedServices,
      missedServices,
      cancelledServices,
      attendanceRate:
        totalServices > 0 ? (completedServices / totalServices) * 100 : 0,
      stats,
    };
  }

  /**
   * Obter estatísticas de serviço de um ministério
   */
  async getMinistryServiceStats(
    tenantId: string,
    ministryId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      ministryId: new Types.ObjectId(ministryId),
    };

    if (startDate) {
      filter.serviceDate = { $gte: startDate };
    }

    if (endDate) {
      filter.serviceDate = {
        ...filter.serviceDate,
        $lte: endDate,
      };
    }

    const stats = await this.serviceHistoryModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            userId: '$userId',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          services: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
          totalServices: { $sum: '$count' },
        },
      },
    ]);

    return {
      totalVolunteers: stats.length,
      totalServices: stats.reduce((sum, s) => sum + s.totalServices, 0),
      volunteerStats: stats,
    };
  }

  /**
   * Registrar serviço automaticamente quando escala é completada
   */
  async recordServiceFromScale(
    tenantId: string,
    scaleId: string,
    recordedBy?: string,
  ): Promise<ServiceHistory[]> {
    const scale = await this.scaleModel.findById(scaleId);

    if (!scale) {
      throw new NotFoundException('Escala não encontrada');
    }

    if (scale.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    const serviceHistories: ServiceHistory[] = [];

    for (const assignment of scale.assignments) {
      for (const memberId of assignment.assignedMembers) {
        const serviceHistory = new this.serviceHistoryModel({
          userId: memberId,
          scaleId: new Types.ObjectId(scaleId),
          functionId: assignment.functionId,
          ministryId: scale.ministryId,
          serviceDate: scale.eventDate,
          status: ServiceHistoryStatus.COMPLETED,
          recordedBy: recordedBy ? new Types.ObjectId(recordedBy) : null,
          recordedAt: new Date(),
          tenantId: new Types.ObjectId(tenantId),
          branchId: scale.branchId,
        });

        const savedHistory = await serviceHistory.save();
        serviceHistories.push(savedHistory);
      }
    }

    return serviceHistories;
  }
}
