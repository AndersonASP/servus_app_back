import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { ListMinistryDto } from './dto/list-ministry.dto';
import { makeSlug } from 'src/common/utils/helpers/slug.util';
import { Ministry } from './schemas/ministry.schema';
import { Membership } from '../membership/schemas/membership.schema';
import { FunctionsService } from '../functions/services/functions.service';

@Injectable()
export class MinistriesService {
  constructor(
    @InjectModel('Ministry') private ministryModel: Model<Ministry>,
    @InjectModel('Membership') private readonly memModel: Model<Membership>,
    private readonly functionsService: FunctionsService,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    userId: string,
    dto: CreateMinistryDto,
  ) {
    const slug = makeSlug(dto.name);

    // checa unicidade por (tenantId, branchId, slug)
    const exists = await this.ministryModel.exists({
      tenantId,
      branchId,
      slug,
    });
    if (exists) {
      const location = branchId ? 'nesta filial' : 'na matriz';
      throw new ConflictException(
        `Já existe um ministério com esse nome ${location}.`,
      );
    }

    // Criar o ministério primeiro
    const doc = await this.ministryModel.create({
      tenantId,
      branchId, // pode ser null para ministérios da matriz
      name: dto.name,
      slug,
      description: dto.description,
      ministryFunctions: dto.ministryFunctions ?? [],
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });

    // Se há funções para processar, criar/vinculá-las ao ministério
    if (dto.ministryFunctions && dto.ministryFunctions.length > 0) {
      try {
        console.log(`🔄 Processando ${dto.ministryFunctions.length} funções para ministério ${doc._id}`);
        
        const bulkUpsertDto = {
          names: dto.ministryFunctions,
          category: 'Geral', // Categoria padrão
        };

        const result = await this.functionsService.bulkUpsertFunctions(
          tenantId,
          (doc._id as any).toString(),
          bulkUpsertDto,
          userId
        );

        console.log(`✅ Funções processadas: ${result.created.length} criadas, ${result.linked.length} vinculadas`);
      } catch (error) {
        console.error('❌ Erro ao processar funções:', error);
        // Não falhar a criação do ministério se as funções derem erro
      }
    }

    return doc.toObject();
  }

  async list(
    tenantId: string,
    branchId: string | null,
    query: ListMinistryDto,
  ) {
    const { page = 1, limit = 10, search, isActive } = query;
    const filter: FilterQuery<Ministry> = { tenantId, branchId };

    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive;
    }

    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [{ name: rx }, { slug: rx }, { description: rx }];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.ministryModel
        .find(filter)
        .sort({ 
          isActive: -1, // Ativos primeiro (true = 1, false = 0, então -1 coloca true primeiro)
          createdAt: -1 // Dentro de cada grupo, mais recentes primeiro
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ministryModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(tenantId: string, branchId: string | null, id: string) {
    const doc = await this.ministryModel
      .findOne({ _id: id, tenantId, branchId })
      .lean();
    if (!doc) throw new NotFoundException('Ministério não encontrado.');
    return doc;
  }

  async update(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
    dto: UpdateMinistryDto,
  ) {
    const updateData: Partial<Ministry> = {
      ...dto,
      updatedBy: userId,
    };

    if (dto.name) {
      const newSlug = makeSlug(dto.name);
      // Se mudar o nome, valida slug único
      const exists = await this.ministryModel.exists({
        tenantId,
        branchId,
        slug: newSlug,
        _id: { $ne: id },
      });
      if (exists) {
        throw new ConflictException(
          'Já existe um ministério com esse nome neste campus.',
        );
      }
      updateData.slug = newSlug;
    }

    const doc = await this.ministryModel
      .findOneAndUpdate({ _id: id, tenantId, branchId }, updateData, {
        new: true,
      })
      .lean();

    if (!doc) throw new NotFoundException('Ministério não encontrado.');
    return doc;
  }

  // Exclusão física: remove completamente da base de dados
  async remove(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
  ) {
    const doc = await this.ministryModel.findOne({
      _id: id,
      tenantId,
      branchId,
    });
    if (!doc) throw new NotFoundException('Ministério não encontrado.');

    // Desvincula todos os membros do ministério (remove apenas a referência)
    await this.memModel.updateMany(
      {
        ministry: id,
        tenant: tenantId,
      },
      {
        $unset: { ministry: 1 }
      }
    );

    // Remove todas as funções vinculadas ao ministério (cascade delete)
    await this.functionsService.removeMinistryFunctions(tenantId, id);

    // Remove fisicamente da base de dados
    await this.ministryModel.findByIdAndDelete(id);

    return { success: true };
  }

  // Toggle status ativo/inativo
  async toggleStatus(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
    isActive: boolean,
  ) {
    const doc = await this.ministryModel.findOne({
      _id: id,
      tenantId,
      branchId,
    });
    if (!doc) throw new NotFoundException('Ministério não encontrado.');

    doc.isActive = isActive;
    (doc as any).updatedBy = userId;
    await doc.save();

    return doc.toObject();
  }
}
