import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ScaleTemplate } from './schemas/scale-template.schema';
import { CreateScaleTemplateDto } from './dto/create-scale-template.dto';
import { UpdateScaleTemplateDto } from './dto/update-scale-template.dto';
import { ListScaleTemplateDto } from './dto/list-scale-template.dto';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { MembershipRole } from 'src/common/enums/role.enum';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(ScaleTemplate.name)
    private readonly templateModel: Model<ScaleTemplate>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    userId: string,
    dto: CreateScaleTemplateDto,
  ) {
    // Se usuário for líder, restringir que o ministryId pertença aos seus ministérios
    const leaderMinistries = await this.getLeaderMinistryIds(
      userId,
      tenantId,
      branchId,
    );
    if (leaderMinistries.length > 0) {
      if (!leaderMinistries.includes(dto.ministryId)) {
        throw new ForbiddenException(
          'Líder só pode criar templates para seu próprio ministério.',
        );
      }
    }
    // Validação de duplicidade por (tenantId, branchId, eventType, name)
    const exists = await this.templateModel.exists({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      eventType: dto.eventType,
      name: dto.name.trim(),
    } as any);
    if (exists) {
      throw new BadRequestException(
        'Já existe um template com este nome para este tipo de evento.',
      );
    }

    const created = await this.templateModel.create({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      ministryId: new Types.ObjectId(dto.ministryId),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      eventType: dto.eventType,
      functionRequirements: dto.functionRequirements,
      autoAssign: dto.autoAssign ?? false,
      allowOverbooking: dto.allowOverbooking ?? false,
      reminderDaysBefore: dto.reminderDaysBefore ?? 2,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    // Converter ObjectIds para strings na resposta
    return {
      ...created.toObject(),
      _id: (created._id as Types.ObjectId).toString(),
      tenantId: created.tenantId.toString(),
      branchId: created.branchId?.toString(),
      ministryId: created.ministryId.toString(),
      createdBy: created.createdBy.toString(),
      updatedBy: created.updatedBy?.toString(),
      functionRequirements: created.functionRequirements.map(req => ({
        ...req,
        functionId: req.functionId.toString(),
      })),
    };
  }

  async list(
    tenantId: string,
    branchId: string | null,
    query: ListScaleTemplateDto & { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const filter: FilterQuery<ScaleTemplate> = {
      tenantId: new Types.ObjectId(tenantId),
    } as any;

    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId) as any;
    } else {
      filter.branchId = null as any;
    }

    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    if (query.ministryId) {
      filter['ministryRequirements.ministryId'] = query.ministryId as any;
    }

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' } as any;
    }

    const [items, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.templateModel.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;
    // Converter ObjectIds para strings na resposta
    const serializedItems = items.map((template) => ({
      ...template.toObject(),
      _id: (template._id as Types.ObjectId).toString(),
      tenantId: template.tenantId.toString(),
      branchId: template.branchId?.toString(),
      ministryId: template.ministryId.toString(),
      createdBy: template.createdBy.toString(),
      updatedBy: template.updatedBy?.toString(),
      functionRequirements: template.functionRequirements.map(req => ({
        ...req,
        functionId: req.functionId.toString(),
      })),
    }));

    return {
      items: serializedItems,
      total,
      page,
      limit,
      pages,
    };
  }

  async findOne(tenantId: string, branchId: string | null, id: string) {
    const doc = await this.templateModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!doc) throw new NotFoundException('Template não encontrado');
    
    // Converter ObjectIds para strings na resposta
    return {
      ...doc.toObject(),
      _id: (doc._id as Types.ObjectId).toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId?.toString(),
      ministryId: doc.ministryId.toString(),
      createdBy: doc.createdBy.toString(),
      updatedBy: doc.updatedBy?.toString(),
      functionRequirements: doc.functionRequirements.map(req => ({
        ...req,
        functionId: req.functionId.toString(),
      })),
    };
  }

  async update(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
    dto: UpdateScaleTemplateDto,
  ) {
    const current = await this.templateModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!current) throw new NotFoundException('Template não encontrado');

    // Restringir líder ao próprio ministério
    const leaderMinistries = await this.getLeaderMinistryIds(
      userId,
      tenantId,
      branchId,
    );
    if (leaderMinistries.length > 0) {
      const canEdit = leaderMinistries.includes(current.ministryId.toString());
      if (!canEdit)
        throw new ForbiddenException('Você não pode alterar este template.');
      // Se atualizar ministry, validar também
      if (dto.ministryId) {
        if (!leaderMinistries.includes(dto.ministryId)) {
          throw new ForbiddenException(
            'Você não pode mover o template para outro ministério.',
          );
        }
      }
    }

    const updated = await this.templateModel.findOneAndUpdate(
      { _id: id, tenantId, branchId: branchId ?? null } as any,
      { ...dto, updatedBy: userId },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Template não encontrado');
    return updated.toObject();
  }

  async remove(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId?: string,
  ) {
    if (userId) {
      const current = await this.templateModel.findOne({
        _id: id,
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
      } as any);
      if (!current) throw new NotFoundException('Template não encontrado');
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        const canDelete = leaderMinistries.includes(
          current.ministryId.toString(),
        );
        if (!canDelete)
          throw new ForbiddenException('Você não pode excluir este template.');
      }
    }

    const res = await this.templateModel.deleteOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (res.deletedCount === 0)
      throw new NotFoundException('Template não encontrado');
    return { success: true };
  }

  private async getLeaderMinistryIds(
    userId: string,
    tenantId: string,
    branchId: string | null,
  ): Promise<string[]> {
    const query: any = {
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      role: MembershipRole.Leader,
      isActive: true,
    };
    if (branchId !== null) query.branch = new Types.ObjectId(branchId);
    else query.branch = null;

    const memberships = await this.membershipModel
      .find(query)
      .select('ministry')
      .lean();
    return memberships
      .map((m: any) => m.ministry?.toString())
      .filter((id: any) => !!id);
  }
}
