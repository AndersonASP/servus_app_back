import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
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
    console.log('🚀 [MinistriesService] Iniciando criação de ministério...');
    console.log('📋 [MinistriesService] Dados recebidos:', {
      tenantId,
      branchId,
      userId,
      dto: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive
      }
    });

    const slug = makeSlug(dto.name);

    // checa unicidade por (tenantId, branchId, slug)
    const exists = await this.ministryModel.exists({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      slug,
    });
    if (exists) {
      const location = branchId ? 'nesta filial' : 'na matriz';
      console.log('❌ [MinistriesService] Ministério já existe:', location);
      throw new ConflictException(
        `Já existe um ministério com esse nome ${location}.`,
      );
    }

    // Criar o ministério primeiro
    console.log('💾 [MinistriesService] Criando ministério no banco...');
    const doc = await this.ministryModel.create({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      name: dto.name,
      slug,
      description: dto.description,
      ministryFunctions: dto.ministryFunctions ?? [],
      isActive: dto.isActive ?? true,
      createdBy: new Types.ObjectId(userId),
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

    console.log('✅ [MinistriesService] Ministério criado com sucesso:', {
      id: doc._id,
      name: doc.name,
      tenantId: doc.tenantId,
      branchId: doc.branchId,
      isActive: doc.isActive,
      createdAt: doc.createdAt
    });

    return doc.toObject();
  }

  async list(
    tenantId: string,
    branchId: string | null,
    query: ListMinistryDto,
  ) {
    const startTime = Date.now();
    console.log('🔍 [MinistriesService] Iniciando listagem de ministérios...');
    console.log('📋 [MinistriesService] Parâmetros:', {
      tenantId,
      branchId,
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        isActive: query.isActive
      }
    });

    try {
      const { page = 1, limit = 10, search, isActive } = query;
      const filter: FilterQuery<Ministry> = { 
        tenantId: new Types.ObjectId(tenantId), 
        branchId: branchId ? new Types.ObjectId(branchId) : null 
      };

      if (typeof isActive !== 'undefined') {
        filter.isActive = isActive;
      }

      if (search) {
        const rx = new RegExp(search, 'i');
        filter.$or = [{ name: rx }, { slug: rx }, { description: rx }];
      }

      console.log('🔍 [MinistriesService] Filtro aplicado:', JSON.stringify(filter, null, 2));

      const skip = (page - 1) * limit;

      console.log('⏱️ [MinistriesService] Iniciando consulta ao banco...');
      const queryStartTime = Date.now();

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

      const queryEndTime = Date.now();
      console.log(`⏱️ [MinistriesService] Consulta ao banco concluída em ${queryEndTime - queryStartTime}ms`);

      console.log('🔍 [MinistriesService] Resultado da consulta:');
    console.log('   - total encontrados:', total);
    console.log('   - items count:', items.length);
    console.log('   - items:', items.map(item => ({ id: item._id, name: item.name, isActive: item.isActive, createdAt: item.createdAt })));
    
    // Vamos garantir que os _id sejam serializados corretamente
    const serializedItems = items.map(item => {
      console.log('   - item._id original:', item._id, '(type:', typeof item._id, ')');
      const serialized = {
        ...item,
        _id: item._id?.toString(),
      };
      console.log('   - item._id serializado:', serialized._id, '(type:', typeof serialized._id, ')');
      return serialized;
    });

      const endTime = Date.now();
      console.log(`✅ [MinistriesService] Listagem concluída em ${endTime - startTime}ms`);

      return {
        items: serializedItems,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      };
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ [MinistriesService] Erro na listagem após ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async findOne(tenantId: string, branchId: string | null, id: string) {
    console.log('🔍 Buscando ministério...');
    console.log('   - tenantId:', tenantId);
    console.log('   - branchId:', branchId);
    console.log('   - id:', id);
    
    // Primeiro, vamos verificar se o ID é válido
    if (!Types.ObjectId.isValid(id)) {
      console.log('❌ ID inválido:', id);
      throw new BadRequestException('ID do ministério inválido');
    }
    
    // Buscar o ministério
    const doc = await this.ministryModel
      .findOne({ 
        _id: id, 
        tenantId: new Types.ObjectId(tenantId), 
        branchId: branchId ? new Types.ObjectId(branchId) : null 
      })
      .lean();
    
    if (!doc) {
      console.log('❌ Ministério não encontrado');
      // Vamos verificar se existe algum ministério com esse ID (sem filtros)
      const anyDoc = await this.ministryModel.findOne({ _id: id }).lean();
      if (anyDoc) {
        console.log('⚠️ Ministério existe, mas não pertence ao tenant/branch:');
        console.log('   - doc.tenantId:', anyDoc.tenantId);
        console.log('   - doc.branchId:', anyDoc.branchId);
        console.log('   - expected tenantId:', tenantId);
        console.log('   - expected branchId:', branchId);
      } else {
        console.log('❌ Ministério não existe no banco de dados');
      }
      throw new NotFoundException('Ministério não encontrado.');
    }
    
    console.log('✅ Ministério encontrado:');
    console.log('   - _id:', doc._id);
    console.log('   - name:', doc.name);
    console.log('   - _id type:', typeof doc._id);
    console.log('   - _id toString:', doc._id?.toString());
    console.log('   - _id JSON:', JSON.stringify(doc._id));
    
    // Vamos garantir que o _id seja serializado corretamente
    const result = {
      ...doc,
      _id: doc._id?.toString(),
    };
    
    console.log('✅ Resultado serializado:');
    console.log('   - result._id:', result._id);
    console.log('   - result._id type:', typeof result._id);
    
    return result;
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
      updatedBy: new Types.ObjectId(userId),
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
      .findOneAndUpdate({ 
        _id: id, 
        tenantId: new Types.ObjectId(tenantId), 
        branchId: branchId ? new Types.ObjectId(branchId) : null 
      }, updateData, {
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
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });
    if (!doc) throw new NotFoundException('Ministério não encontrado.');

    // Desvincula todos os membros do ministério (remove apenas a referência)
    await this.memModel.updateMany(
      {
        ministry: new Types.ObjectId(id),
        tenant: new Types.ObjectId(tenantId),
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
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });
    if (!doc) throw new NotFoundException('Ministério não encontrado.');

    doc.isActive = isActive;
    (doc as any).updatedBy = userId;
    await doc.save();

    return doc.toObject();
  }

}
