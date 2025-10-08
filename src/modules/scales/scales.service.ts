import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Scale } from './schemas/scale.schema';
import {
  CreateScaleDto,
  UpdateScaleDto,
  ListScaleDto,
} from './dto/create-scale.dto';

@Injectable()
export class ScalesService {
  constructor(@InjectModel(Scale.name) private scaleModel: Model<Scale>) {}

  async create(
    tenantId: string,
    branchId: string | null,
    userId: string,
    dto: CreateScaleDto,
    userRoles: string[],
    userMinistryId?: string,
  ) {
    // Verificar se o usuário é líder do ministério ou admin
    if (
      !this.isTenantOrBranchAdmin(userRoles) &&
      userMinistryId !== dto.ministryId
    ) {
      throw new ForbiddenException(
        'Você só pode criar escalas para o seu próprio ministério.',
      );
    }

    const scale = new this.scaleModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      eventId: new Types.ObjectId(dto.eventId),
      ministryId: new Types.ObjectId(dto.ministryId),
      templateId: new Types.ObjectId(dto.templateId),
      eventDate: new Date(dto.eventDate),
      assignments:
        dto.assignments?.map((assignment) => ({
          ...assignment,
          functionId: new Types.ObjectId(assignment.functionId),
          assignedMembers:
            assignment.assignedMembers?.map((id) => new Types.ObjectId(id)) ||
            [],
        })) || [],
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return scale.save();
  }

  async list(
    tenantId: string,
    branchId: string | null,
    query: ListScaleDto & { page?: number; limit?: number },
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    };

    // Filtros específicos
    if (query.eventId) {
      filter.eventId = new Types.ObjectId(query.eventId);
    }
    if (query.ministryId) {
      filter.ministryId = new Types.ObjectId(query.ministryId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    // Se não for admin, só pode ver escalas do seu ministério
    if (userRoles && !this.isTenantOrBranchAdmin(userRoles) && userMinistryId) {
      filter.ministryId = new Types.ObjectId(userMinistryId);
    }

    const [scales, total] = await Promise.all([
      this.scaleModel
        .find(filter)
        .populate('eventId', 'name eventDate eventTime')
        .populate('ministryId', 'name')
        .populate('templateId', 'name')
        .populate('assignments.functionId', 'name')
        .populate('assignments.assignedMembers', 'name email')
        .sort({ eventDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.scaleModel.countDocuments(filter),
    ]);

    return {
      items: scales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const scale = await this.scaleModel
      .findOne({
        _id: id,
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
      })
      .populate('eventId', 'name eventDate eventTime')
      .populate('ministryId', 'name')
      .populate('templateId', 'name')
      .populate('assignments.functionId', 'name')
      .populate('assignments.assignedMembers', 'name email')
      .exec();

    if (!scale) {
      throw new NotFoundException('Escala não encontrada.');
    }

    // Verificar permissão
    if (userRoles && !this.isTenantOrBranchAdmin(userRoles) && userMinistryId) {
      if (scale.ministryId.toString() !== userMinistryId) {
        throw new ForbiddenException(
          'Você só pode visualizar escalas do seu próprio ministério.',
        );
      }
    }

    return scale;
  }

  async update(
    tenantId: string,
    branchId: string | null,
    id: string,
    dto: UpdateScaleDto,
    userId: string,
    userRoles: string[],
    userMinistryId?: string,
  ) {
    const scale = await this.scaleModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });

    if (!scale) {
      throw new NotFoundException('Escala não encontrada.');
    }

    // Verificar permissão
    if (!this.isTenantOrBranchAdmin(userRoles) && userMinistryId) {
      if (scale.ministryId.toString() !== userMinistryId) {
        throw new ForbiddenException(
          'Você só pode editar escalas do seu próprio ministério.',
        );
      }
    }

    const updateData: any = {
      ...dto,
      updatedBy: new Types.ObjectId(userId),
    };

    if (dto.eventId) updateData.eventId = new Types.ObjectId(dto.eventId);
    if (dto.ministryId)
      updateData.ministryId = new Types.ObjectId(dto.ministryId);
    if (dto.templateId)
      updateData.templateId = new Types.ObjectId(dto.templateId);
    if (dto.eventDate) updateData.eventDate = new Date(dto.eventDate);
    if (dto.assignments) {
      updateData.assignments = dto.assignments.map((assignment) => ({
        ...assignment,
        functionId: new Types.ObjectId(assignment.functionId),
        assignedMembers:
          assignment.assignedMembers?.map((id) => new Types.ObjectId(id)) || [],
      }));
    }

    const updated = await this.scaleModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return updated;
  }

  async remove(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
    userRoles: string[],
    userMinistryId?: string,
  ) {
    const scale = await this.scaleModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });

    if (!scale) {
      throw new NotFoundException('Escala não encontrada.');
    }

    // Verificar permissão
    if (!this.isTenantOrBranchAdmin(userRoles) && userMinistryId) {
      if (scale.ministryId.toString() !== userMinistryId) {
        throw new ForbiddenException(
          'Você só pode excluir escalas do seu próprio ministério.',
        );
      }
    }

    await this.scaleModel.findByIdAndDelete(id);
    return { message: 'Escala excluída com sucesso.' };
  }

  private isTenantOrBranchAdmin(userRoles: string[] | undefined): boolean {
    if (!userRoles || !Array.isArray(userRoles)) {
      return false;
    }
    return (
      userRoles.includes('tenant_admin') || userRoles.includes('branch_admin')
    );
  }
}
