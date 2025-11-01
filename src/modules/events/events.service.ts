import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Event } from './schemas/event.schema';
import { EventInstance } from './schemas/event-instance.schema';
import { EventException } from './schemas/event-exception.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventDto } from './dto/list-event.dto';
import { GetRecurrencesDto } from './dto/get-recurrences.dto';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { MembershipRole } from 'src/common/enums/role.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(EventInstance.name)
    private readonly instanceModel: Model<EventInstance>,
    @InjectModel(EventException.name)
    private readonly exceptionModel: Model<EventException>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    userId: string,
    dto: CreateEventDto,
    userRoles: string[],
    userMinistryId?: string,
  ) {
    console.log('🔍 [EventsService] Criando evento:');
    console.log('   - tenantId:', tenantId);
    console.log('   - branchId:', branchId);
    console.log('   - userId:', userId);
    console.log('   - userRoles:', userRoles);
    console.log('   - userMinistryId:', userMinistryId);
    console.log('   - dto completo:', JSON.stringify(dto, null, 2));

    // Verificar se é admin ou líder
    const isAdmin = this.isTenantOrBranchAdmin(userRoles);
    console.log('   - isTenantOrBranchAdmin:', isAdmin);

    // Se não for admin, verificar se é líder
    let isLeader = false;
    let leaderMinistryIds: string[] = [];
    if (!isAdmin) {
      leaderMinistryIds = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      isLeader = leaderMinistryIds.length > 0;
      console.log('   - isLeader:', isLeader);
      console.log('   - leaderMinistryIds:', leaderMinistryIds);

      if (!isLeader) {
        console.log('❌ [EventsService] Usuário não é admin nem líder, negando acesso');
        throw new ForbiddenException(
          'Apenas administradores ou líderes de ministério podem criar eventos.',
        );
      }

      // Validações específicas para líderes
      if (!dto.ministryId || dto.ministryId.trim() === '') {
        console.log('❌ [EventsService] Líder deve informar o ministryId');
        throw new ForbiddenException(
          'Líder deve criar eventos para o ministério do qual é líder.',
        );
      }

      // Verificar se o ministryId do payload está na lista de ministérios do líder
      // Comparar como strings para garantir compatibilidade
      const dtoMinistryIdStr = dto.ministryId.trim();
      const hasPermission = leaderMinistryIds.some(
        (id) => id.toString() === dtoMinistryIdStr,
      );
      
      if (!hasPermission) {
        console.log('❌ [EventsService] Líder tentando criar evento para ministério diferente do seu');
        console.log('   - dto.ministryId:', dtoMinistryIdStr);
        console.log('   - leaderMinistryIds:', leaderMinistryIds);
        throw new ForbiddenException(
          'Você só pode criar eventos para o ministério do qual é líder.',
        );
      }

      // Líderes só podem criar eventos específicos de ministério
      dto.eventType = 'ministry_specific';
      dto.isGlobal = false;
      console.log('✅ [EventsService] Evento ajustado para ministry_specific (não global)');
    }

    console.log('✅ [EventsService] Usuário autorizado, criando evento...');

    const created = await this.eventModel.create({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      ministryId: dto.ministryId
        ? new Types.ObjectId(dto.ministryId)
        : undefined,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
      recurrenceType: dto.recurrenceType,
      recurrencePattern: dto.recurrencePattern,
      eventType: dto.eventType || (isAdmin ? 'global' : 'ministry_specific'),
      isGlobal: dto.isGlobal ?? (isAdmin ? true : false),
      specialNotes: dto.specialNotes?.trim(),
      status: 'draft',
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    // Geração de instâncias
    console.log('🔄 [EventsService] Gerando instâncias para evento...');
    try {
      if (dto.recurrenceType === 'none') {
        // Para eventos únicos, gerar apenas a instância inicial
        await this.generateInstancesForEvent((created._id as any).toString(), {
          initialOnly: true,
        });
        console.log('✅ [EventsService] Instância única gerada');
      } else {
        // Para eventos recorrentes, gerar todas as instâncias futuras
        await this.generateInstancesForEvent((created._id as any).toString());
        console.log('✅ [EventsService] Instâncias recorrentes geradas');
      }
    } catch (error) {
      console.error('❌ [EventsService] Erro ao gerar instâncias:', error);
      // Não falha a criação do evento se a geração de instâncias falhar
    }

    return created.toObject();
  }

  async list(
    tenantId: string,
    branchId: string | null,
    query: ListEventDto & { page?: number; limit?: number },
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const filter: FilterQuery<Event> = {
      tenantId: new Types.ObjectId(tenantId),
    } as any;

    if (branchId) filter.branchId = new Types.ObjectId(branchId) as any;
    else filter.branchId = null as any;
    if (query.ministryId) filter.ministryId = query.ministryId as any;
    if (query.status) filter.status = query.status;
    if (query.recurrenceType) filter.recurrenceType = query.recurrenceType;
    if (query.eventType) filter.eventType = query.eventType;
    if (typeof query.isOrdinary === 'boolean')
      filter.isOrdinary = query.isOrdinary;
    if (query.search)
      (filter as any).name = { $regex: query.search, $options: 'i' };
    if (query.startDate || query.endDate) {
      (filter as any).eventDate = {};
      if (query.startDate)
        (filter as any).eventDate.$gte = new Date(query.startDate);
      if (query.endDate)
        (filter as any).eventDate.$lte = new Date(query.endDate);
    }

    // Filtro adicional para líderes: ver somente ordinários OU eventos do próprio ministério OU criados por si
    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        const leaderMinistryObjectIds = leaderMinistries
          .filter((id) => !!id)
          .map((id) => new Types.ObjectId(id));

        filter.$or = [
          { isOrdinary: true },
          { ministryId: { $in: leaderMinistryObjectIds } },
          { createdBy: new Types.ObjectId(userId) },
        ] as any;
      }
    }

    const [items, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort({ eventDate: 1, eventTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.eventModel.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;
    return { items: items.map((d) => d.toObject()), total, page, limit, pages };
  }

  async findOne(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const doc = await this.eventModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!doc) throw new NotFoundException('Evento não encontrado');
    // Restrição de líder
    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        const isAllowed =
          doc.isGlobal ||
          leaderMinistries.some(
            (m) => m.toString() === doc.ministryId?.toString(),
          ) ||
          doc.createdBy.toString() === userId.toString();
        if (!isAllowed)
          throw new ForbiddenException('Você não pode visualizar este evento.');
      }
    }
    return doc.toObject();
  }

  async update(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId: string,
    dto: UpdateEventDto,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const current = await this.eventModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!current) throw new NotFoundException('Evento não encontrado');

    // Restrição: líder não altera ordinário; só altera do próprio ministério ou criado por si
    const leaderMinistries = await this.getLeaderMinistryIds(
      userId,
      tenantId,
      branchId,
    );
    if (leaderMinistries.length > 0) {
      if (current.isGlobal)
        throw new ForbiddenException('Líder não pode alterar eventos globais.');
      const canEdit =
        leaderMinistries.some(
          (m) => m.toString() === current.ministryId?.toString(),
        ) || current.createdBy.toString() === userId.toString();
      if (!canEdit)
        throw new ForbiddenException('Você não pode alterar este evento.');
      // Forçar campos proibidos
      if (dto.isGlobal) dto.isGlobal = false;
      if (dto.eventType === 'global') dto.eventType = 'ministry_specific';
      if (dto.ministryId && !leaderMinistries.includes(dto.ministryId as any)) {
        throw new ForbiddenException(
          'Você não pode mover o evento para outro ministério.',
        );
      }
    }

    const updated = await this.eventModel.findOneAndUpdate(
      { 
        _id: new Types.ObjectId(id), 
        tenantId: new Types.ObjectId(tenantId), 
        branchId: branchId ? new Types.ObjectId(branchId) : null 
      } as any,
      { ...dto, updatedBy: new Types.ObjectId(userId) },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Regenerar instâncias quando data/recorrência mudar
    if (dto.eventDate || dto.recurrenceType || dto.recurrencePattern) {
      await this.instanceModel.deleteMany({ eventId: new Types.ObjectId(id) } as any);
      await this.generateInstancesForEvent(id);
    }

    return updated.toObject();
  }

  async remove(
    tenantId: string,
    branchId: string | null,
    id: string,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    if (userId) {
      const current = await this.eventModel.findOne({
        _id: id,
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
      } as any);
      if (!current) throw new NotFoundException('Evento não encontrado');
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        if (current.isGlobal)
          throw new ForbiddenException(
            'Líder não pode excluir eventos globais.',
          );
        const canDelete =
          leaderMinistries.some(
            (m) => m.toString() === current.ministryId?.toString(),
          ) || current.createdBy.toString() === userId.toString();
        if (!canDelete)
          throw new ForbiddenException('Você não pode excluir este evento.');
      }
    }

    const res = await this.eventModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (res.deletedCount === 0)
      throw new NotFoundException('Evento não encontrado');
    // Remover instâncias e exceções associadas
    await Promise.all([
      this.instanceModel.deleteMany({ eventId: new Types.ObjectId(id) } as any),
      this.exceptionModel.deleteMany({
        eventId: new Types.ObjectId(id),
      } as any),
    ]);
    return { success: true };
  }

  /**
   * Marca uma ocorrência específica como ignorada (skip) criando uma exceção
   */
  async skipInstance(
    tenantId: string,
    branchId: string | null,
    eventId: string,
    dateIso: string,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const event = await this.eventModel.findOne({
      _id: eventId,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!event) throw new NotFoundException('Evento não encontrado');

    // Permissões: líderes só nos seus eventos não globais
    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        if (event.isGlobal)
          throw new ForbiddenException(
            'Líder não pode editar eventos globais.',
          );
        const canEdit =
          leaderMinistries.some(
            (m) => m.toString() === event.ministryId?.toString(),
          ) || event.createdBy.toString() === userId.toString();
        if (!canEdit)
          throw new ForbiddenException('Você não pode alterar este evento.');
      }
    }

    const date = new Date(dateIso);
    if (isNaN(date.getTime())) throw new BadRequestException('Data inválida');

    const startOfDay = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    // Criar exceção com data normalizada (início do dia)
    await this.exceptionModel.create({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      eventId: new Types.ObjectId(eventId),
      instanceDate: startOfDay,
      type: 'skip',
      createdBy: new Types.ObjectId(userId),
    } as any);

    // Cancelar instâncias pré-calculadas do dia
    await this.instanceModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
        eventId: new Types.ObjectId(eventId),
        instanceDate: { $gte: startOfDay, $lte: endOfDay },
      } as any,
      { $set: { status: 'cancelled' } },
    );

    // Se a data pulada é a primeira ocorrência (eventDate), mover o início da série
    const evt = await this.eventModel
      .findOne({
        _id: new Types.ObjectId(eventId),
        tenantId,
        branchId: branchId ?? null,
      } as any)
      .lean();
    if (evt) {
      const base = new Date(evt.eventDate);
      const baseDay = new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth(),
          base.getUTCDate(),
          0,
          0,
          0,
        ),
      );
      const isFirstOccurrenceDay = baseDay.getTime() === startOfDay.getTime();
      if (
        isFirstOccurrenceDay &&
        evt.recurrenceType &&
        evt.recurrenceType !== 'none'
      ) {
        let nextStart = baseDay;
        const pattern = evt.recurrencePattern || {};

        const advanceToNext = (current: Date): Date => {
          if (evt.recurrenceType === 'daily') {
            const interval = Number(pattern.interval) || 1;
            return new Date(
              Date.UTC(
                current.getUTCFullYear(),
                current.getUTCMonth(),
                current.getUTCDate() + interval,
              ),
            );
          } else if (evt.recurrenceType === 'weekly') {
            const interval = Number(pattern.interval) || 1;
            const days: number[] =
              Array.isArray(pattern.daysOfWeek) && pattern.daysOfWeek.length
                ? pattern.daysOfWeek.map((d: any) => Number(d))
                : [baseDay.getUTCDay()];
            let probe = new Date(
              Date.UTC(
                current.getUTCFullYear(),
                current.getUTCMonth(),
                current.getUTCDate() + 1,
              ),
            );
            for (let i = 1; i <= 28; i++) {
              const weeksFromBase = Math.floor(
                (probe.getTime() - baseDay.getTime()) / (7 * 24 * 3600 * 1000),
              );
              const withinInterval = weeksFromBase % interval === 0;
              if (withinInterval && days.includes(probe.getUTCDay()))
                return probe;
              probe = new Date(
                Date.UTC(
                  probe.getUTCFullYear(),
                  probe.getUTCMonth(),
                  probe.getUTCDate() + 1,
                ),
              );
            }
            return probe;
          } else {
            const interval = Number(pattern.interval) || 1;
            if (pattern.weekOfMonth != null && pattern.dayOfWeek != null) {
              const weekOfMonth = Number(pattern.weekOfMonth); // 1-5
              const dayOfWeek = Number(pattern.dayOfWeek); // 0-6
              const targetMonthStart = new Date(
                Date.UTC(
                  current.getUTCFullYear(),
                  current.getUTCMonth() + interval,
                  1,
                ),
              );
              const firstDayInMonth = new Date(targetMonthStart);
              const firstDOW = firstDayInMonth.getUTCDay();
              const addDays = (dayOfWeek - firstDOW + 7) % 7;
              firstDayInMonth.setUTCDate(
                firstDayInMonth.getUTCDate() + addDays + (weekOfMonth - 1) * 7,
              );
              if (
                firstDayInMonth.getUTCMonth() === targetMonthStart.getUTCMonth()
              ) {
                return firstDayInMonth;
              }
              return targetMonthStart;
            } else {
              const dayOfMonth =
                Number(pattern.dayOfMonth) || current.getUTCDate();
              const targetMonthStart = new Date(
                Date.UTC(
                  current.getUTCFullYear(),
                  current.getUTCMonth() + interval,
                  1,
                ),
              );
              const lastDay = new Date(
                Date.UTC(
                  targetMonthStart.getUTCFullYear(),
                  targetMonthStart.getUTCMonth() + 1,
                  0,
                ),
              ).getUTCDate();
              const dom = Math.min(dayOfMonth, lastDay);
              return new Date(
                Date.UTC(
                  targetMonthStart.getUTCFullYear(),
                  targetMonthStart.getUTCMonth(),
                  dom,
                ),
              );
            }
          }
        };

        // carregar skips existentes
        const existingSkips = await this.exceptionModel
          .find({
            tenantId,
            eventId: new Types.ObjectId(eventId),
            type: 'skip',
          } as any)
          .select('instanceDate')
          .lean();
        const skipDays = new Set<string>(
          existingSkips.map((s: any) => {
            const d = new Date(s.instanceDate);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
          }),
        );

        const cancelAfter = await this.exceptionModel
          .findOne({
            tenantId,
            eventId: new Types.ObjectId(eventId),
            type: 'cancel_after',
          } as any)
          .lean();
        const cancelAfterDate = cancelAfter?.fromDate
          ? new Date(cancelAfter.fromDate)
          : null;

        // iterar até encontrar uma data não skipada
        nextStart = advanceToNext(baseDay);
        let safety = 0;
        while (safety++ < 120) {
          const key = `${nextStart.getUTCFullYear()}-${String(nextStart.getUTCMonth() + 1).padStart(2, '0')}-${String(nextStart.getUTCDate()).padStart(2, '0')}`;
          if (cancelAfterDate) {
            const ndStart = new Date(
              Date.UTC(
                nextStart.getUTCFullYear(),
                nextStart.getUTCMonth(),
                nextStart.getUTCDate(),
                0,
                0,
                0,
              ),
            );
            if (ndStart >= cancelAfterDate) break; // não mover após corte
          }
          if (!skipDays.has(key)) {
            await this.eventModel.updateOne(
              { _id: new Types.ObjectId(eventId) } as any,
              { $set: { eventDate: nextStart } } as any,
            );
            break;
          }
          nextStart = advanceToNext(nextStart);
        }
      }
    }

    return { success: true };
  }

  /**
   * Cancela a série após (e incluindo) uma data específica
   */
  async cancelSeriesAfter(
    tenantId: string,
    branchId: string | null,
    eventId: string,
    fromIso: string,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    const event = await this.eventModel.findOne({
      _id: eventId,
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    } as any);
    if (!event) throw new NotFoundException('Evento não encontrado');

    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        if (event.isGlobal)
          throw new ForbiddenException(
            'Líder não pode editar eventos globais.',
          );
        const canEdit =
          leaderMinistries.some(
            (m) => m.toString() === event.ministryId?.toString(),
          ) || event.createdBy.toString() === userId.toString();
        if (!canEdit)
          throw new ForbiddenException('Você não pode alterar este evento.');
      }
    }

    const fromDate = new Date(fromIso);
    if (isNaN(fromDate.getTime()))
      throw new BadRequestException('Data inválida');

    await this.exceptionModel.create({
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      eventId: new Types.ObjectId(eventId),
      fromDate,
      type: 'cancel_after',
      createdBy: new Types.ObjectId(userId),
    } as any);

    // Cancelar instâncias futuras já pré-calculadas
    await this.instanceModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
        eventId,
        instanceDate: { $gte: fromDate },
      } as any,
      { $set: { status: 'cancelled' } },
    );

    return { success: true };
  }

  /**
   * Gera instâncias de evento baseado em sua configuração de recorrência
   * Por padrão gera as próximas 12 semanas/6 meses, evitando explosão de dados
   */
  private async generateInstancesForEvent(
    eventId: string,
    opts?: { initialOnly?: boolean },
  ) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Evento não encontrado');

    console.log(
      '🔄 [EventsService] Gerando instâncias para evento:',
      event.name,
    );
    console.log('   - recurrenceType:', event.recurrenceType);
    console.log(
      '   - recurrencePattern:',
      JSON.stringify(event.recurrencePattern, null, 2),
    );
    console.log('   - eventDate:', event.eventDate);
    console.log('   - eventTime:', event.eventTime);

    const maxWeeks = 52; // 1 ano completo
    const maxMonths = 12; // 1 ano completo

    const baseDate = new Date(event.eventDate);
    const instances: { date: Date }[] = [];

    const pushInstance = (d: Date) => {
      // Verificar se a data não excede o limite de recorrência
      if (
        event.recurrencePattern?.endDate &&
        d > event.recurrencePattern.endDate
      ) {
        console.log(
          `   - Data ${d.toISOString()} excede limite ${event.recurrencePattern.endDate.toISOString()}, pulando`,
        );
        return;
      }

      // Normalizar hora do evento
      const [hh, mm] = (event.eventTime || '00:00')
        .split(':')
        .map((v) => parseInt(v, 10));
      const inst = new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          hh,
          mm,
          0,
        ),
      );
      instances.push({ date: inst });
    };

    if (event.recurrenceType === 'none') {
      pushInstance(baseDate);
    } else if (event.recurrenceType === 'daily') {
      const interval = event.recurrencePattern?.interval || 1;
      const limit = opts?.initialOnly ? 1 : Math.min(90, interval * 30); // até ~90 ocorrências
      for (let i = 0; i < limit; i++) {
        const d = new Date(baseDate);
        d.setUTCDate(baseDate.getUTCDate() + i * interval);

        // Verificar se excede a data limite antes de adicionar
        if (
          event.recurrencePattern?.endDate &&
          d > event.recurrencePattern.endDate
        ) {
          console.log(
            `   - Parando geração diária: data ${d.toISOString()} excede limite ${event.recurrencePattern.endDate.toISOString()}`,
          );
          break;
        }

        pushInstance(d);
      }
    } else if (event.recurrenceType === 'weekly') {
      const interval = event.recurrencePattern?.interval || 1; // a cada X semanas
      const days = event.recurrencePattern?.daysOfWeek?.length
        ? event.recurrencePattern.daysOfWeek
        : [baseDate.getUTCDay()];
      const weeksToGenerate = opts?.initialOnly ? 1 : maxWeeks;

      console.log('📅 [EventsService] Processando evento semanal:');
      console.log('   - interval:', interval);
      console.log('   - daysOfWeek:', days);
      console.log('   - weeksToGenerate:', weeksToGenerate);
      console.log('   - baseDate.getUTCDay():', baseDate.getUTCDay());

      // Partindo da semana base, gerar para semanas futuras
      for (let w = 0; w < weeksToGenerate; w += interval) {
        for (const dow of days) {
          const d = new Date(baseDate);
          const diffToDow = dow - d.getUTCDay();
          d.setUTCDate(d.getUTCDate() + w * 7 + diffToDow);
          if (d < baseDate) continue; // evitar datas antes da base

          // Verificar se excede a data limite antes de adicionar
          if (
            event.recurrencePattern?.endDate &&
            d > event.recurrencePattern.endDate
          ) {
            console.log(
              `   - Parando geração semanal: data ${d.toISOString()} excede limite ${event.recurrencePattern.endDate.toISOString()}`,
            );
            return; // Sair do loop principal
          }

          console.log(
            `   - Gerando instância para dia ${dow} (${d.toISOString()})`,
          );
          pushInstance(d);
        }
      }
    } else if (event.recurrenceType === 'monthly') {
      const interval = event.recurrencePattern?.interval || 1; // a cada X meses
      const monthsToGenerate = opts?.initialOnly ? 1 : maxMonths;

      console.log('📅 [EventsService] Processando evento mensal:');
      console.log('   - interval:', interval);
      console.log('   - monthsToGenerate:', monthsToGenerate);
      console.log(
        '   - recurrencePattern:',
        JSON.stringify(event.recurrencePattern, null, 2),
      );

      // Verificar se é recorrência por semana do mês (ex: primeira sexta-feira)
      if (
        event.recurrencePattern?.weekOfMonth &&
        event.recurrencePattern?.dayOfWeek !== undefined
      ) {
        const weekOfMonth = event.recurrencePattern.weekOfMonth; // 1-5
        const dayOfWeek = event.recurrencePattern.dayOfWeek; // 0-6

        console.log('📅 [EventsService] Recorrência mensal por semana:');
        console.log('   - weekOfMonth:', weekOfMonth);
        console.log('   - dayOfWeek:', dayOfWeek);

        for (let m = 0; m < monthsToGenerate; m += interval) {
          const targetMonthStart = new Date(
            Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + m, 1),
          );

          // Encontrar a primeira ocorrência do dia da semana no mês
          const firstDayOfWeek = new Date(targetMonthStart);
          const firstDayOfWeekInMonth = firstDayOfWeek.getUTCDay();
          const daysToAdd = (dayOfWeek - firstDayOfWeekInMonth + 7) % 7;
          firstDayOfWeek.setUTCDate(firstDayOfWeek.getUTCDate() + daysToAdd);

          // Calcular a semana específica (ex: primeira sexta-feira)
          const targetDate = new Date(firstDayOfWeek);
          targetDate.setUTCDate(
            targetDate.getUTCDate() + (weekOfMonth - 1) * 7,
          );

          // Verificar se excede a data limite antes de adicionar
          if (
            event.recurrencePattern?.endDate &&
            targetDate > event.recurrencePattern.endDate
          ) {
            console.log(
              `   - Parando geração mensal: data ${targetDate.toISOString()} excede limite ${event.recurrencePattern.endDate.toISOString()}`,
            );
            break;
          }

          // Verificar se a data está dentro do mês e não é antes da data base
          if (
            targetDate.getUTCMonth() === targetMonthStart.getUTCMonth() &&
            targetDate >= baseDate
          ) {
            console.log(
              `   - Gerando instância para ${weekOfMonth}ª semana, dia ${dayOfWeek} (${targetDate.toISOString()})`,
            );
            pushInstance(targetDate);
          }
        }
      } else {
        // Recorrência mensal tradicional por dia do mês
        const dayOfMonth =
          event.recurrencePattern?.dayOfMonth || baseDate.getUTCDate();

        console.log('📅 [EventsService] Recorrência mensal tradicional:');
        console.log('   - dayOfMonth:', dayOfMonth);

        for (let m = 0; m < monthsToGenerate; m += interval) {
          const d = new Date(
            Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + m, 1),
          );
          const lastDay = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
          ).getUTCDate();
          const day = Math.min(dayOfMonth, lastDay);
          d.setUTCDate(day);
          if (d < baseDate) continue;

          // Verificar se excede a data limite antes de adicionar
          if (
            event.recurrencePattern?.endDate &&
            d > event.recurrencePattern.endDate
          ) {
            console.log(
              `   - Parando geração mensal tradicional: data ${d.toISOString()} excede limite ${event.recurrencePattern.endDate.toISOString()}`,
            );
            break;
          }

          console.log(
            `   - Gerando instância para dia ${day} (${d.toISOString()})`,
          );
          pushInstance(d);
        }
      }
    }

    // Criar instâncias
    if (instances.length > 0) {
      const docs = instances.map((i) => ({
        eventId: event._id,
        tenantId: event.tenantId,
        branchId: event.branchId ?? null,
        instanceDate: i.date,
        ministryScales: [],
        status: 'scheduled',
      }));
      await this.instanceModel.insertMany(docs);
    }
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
    // Se branchId foi fornecido explicitamente, filtrar por ela; caso contrário, não restringir por branch
    if (branchId) {
      query.branch = new Types.ObjectId(branchId);
    }

    const memberships = await this.membershipModel
      .find(query)
      .select('ministry')
      .lean();

    return memberships
      .map((m: any) => m.ministry?.toString())
      .filter((id: any) => !!id);
  }

  /**
   * Busca recorrências de eventos para um mês específico usando lógica híbrida
   * - Para próximos 6 meses: retorna instâncias pré-calculadas do banco
   * - Para meses distantes: calcula on-demand baseado nas regras de recorrência
   */
  async getRecurrences(
    tenantId: string,
    branchId: string | null,
    query: GetRecurrencesDto,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    console.log('🔄 [EventsService] Buscando recorrências:', {
      tenantId,
      branchId,
      query,
    });

    // Determinar o mês/ano alvo
    let targetMonth: number;
    let targetYear: number;

    if (query.month) {
      // Formato YYYY-MM
      const [yearStr, monthStr] = query.month.split('-');
      targetYear = parseInt(yearStr, 10);
      targetMonth = parseInt(monthStr, 10);
    } else if (query.monthNumber && query.year) {
      targetMonth = query.monthNumber;
      targetYear = query.year;
    } else {
      // Usar mês atual se não especificado
      const now = new Date();
      targetMonth = now.getMonth() + 1;
      targetYear = now.getFullYear();
    }

    console.log('📅 [EventsService] Mês alvo:', { targetMonth, targetYear });

    // Calcular limites do mês
    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endOfMonth = new Date(
      Date.UTC(targetYear, targetMonth, 0, 23, 59, 59),
    );

    console.log('📅 [EventsService] Período:', { startOfMonth, endOfMonth });

    // Determinar se deve usar instâncias pré-calculadas ou calcular on-demand
    const now = new Date();
    const monthsFromNow =
      (targetYear - now.getFullYear()) * 12 +
      (targetMonth - now.getMonth() - 1);
    const usePreCalculated = monthsFromNow >= 0 && monthsFromNow <= 6;

    console.log('🔍 [EventsService] Estratégia:', {
      monthsFromNow,
      usePreCalculated,
    });

    if (usePreCalculated) {
      // Usar instâncias pré-calculadas do banco
      return this.getPreCalculatedRecurrences(
        tenantId,
        branchId,
        startOfMonth,
        endOfMonth,
        query,
        userId,
        userRoles,
        userMinistryId,
      );
    } else {
      // Calcular on-demand para meses distantes
      return this.calculateRecurrencesOnDemand(
        tenantId,
        branchId,
        startOfMonth,
        endOfMonth,
        query,
        userId,
        userRoles,
        userMinistryId,
      );
    }
  }

  /**
   * Busca instâncias pré-calculadas do banco de dados
   */
  private async getPreCalculatedRecurrences(
    tenantId: string,
    branchId: string | null,
    startOfMonth: Date,
    endOfMonth: Date,
    query: GetRecurrencesDto,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    console.log('📊 [EventsService] Buscando instâncias pré-calculadas');

    const filter: FilterQuery<EventInstance> = {
      tenantId: new Types.ObjectId(tenantId),
      instanceDate: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    } as any;

    if (branchId) {
      filter.branchId = new Types.ObjectId(branchId) as any;
    } else {
      filter.branchId = null as any;
    }

    if (query.status) {
      filter.status = query.status;
    }

    // Buscar instâncias
    let instances = await this.instanceModel
      .find(filter)
      .populate(
        'eventId',
        'name eventTime recurrenceType recurrencePattern ministryId isGlobal eventType',
      )
      .sort({ instanceDate: 1 })
      .lean();

    console.log(
      `📊 [EventsService] Encontradas ${instances.length} instâncias pré-calculadas`,
    );

    // Remover instâncias canceladas sempre
    instances = instances.filter((i: any) => i.status !== 'cancelled');

    // Aplicar exceções: remover instâncias com skip (comparando por dia) e após cancel_after
    const eventIds = Array.from(
      new Set(
        instances.map(
          (i: any) => i.eventId?._id?.toString() || i.eventId?.toString(),
        ),
      ),
    ).filter(Boolean);
    const exceptions =
      eventIds.length > 0
        ? await this.exceptionModel
            .find({ tenantId: new Types.ObjectId(tenantId), eventId: { $in: eventIds as any } } as any)
            .lean()
        : [];
    const cancelAfterMap = new Map<string, Date>();
    const skipSet = new Set<string>();
    for (const ex of exceptions) {
      const eId = (ex.eventId as any).toString();
      if (ex.type === 'skip' && ex.instanceDate) {
        const d = new Date(ex.instanceDate);
        const key = `${eId}|${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        skipSet.add(key);
      }
      if (ex.type === 'cancel_after' && ex.fromDate) {
        const current = cancelAfterMap.get(eId);
        const d = new Date(ex.fromDate);
        if (!current || d < current) cancelAfterMap.set(eId, d);
      }
    }
    instances = instances.filter((inst: any) => {
      const eId = inst.eventId?._id?.toString() || inst.eventId?.toString();
      const d = new Date(inst.instanceDate);
      const key = `${eId}|${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (skipSet.has(key)) return false;
      const cutoff = cancelAfterMap.get(eId);
      if (cutoff) {
        const instDayStart = new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            0,
            0,
            0,
          ),
        );
        if (instDayStart >= cutoff) return false;
      }
      return true;
    });

    // Reaplicar filtros de ministério e permissão sobre o conjunto final
    let filteredInstances = instances;
    if (query.ministryId) {
      filteredInstances = filteredInstances.filter(
        (instance: any) =>
          instance.eventId?.ministryId?.toString() === query.ministryId,
      );
    }

    // Aplicar filtros de permissão para líderes
    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        filteredInstances = filteredInstances.filter((instance: any) => {
          const event = instance.eventId;
          return (
            event?.isGlobal ||
            leaderMinistries.some(
              (m) => m.toString() === event?.ministryId?.toString(),
            ) ||
            event?.createdBy?.toString() === userId
          );
        });
      }
    }

    return {
      instances: filteredInstances,
      source: 'pre_calculated',
      month: `${startOfMonth.getUTCFullYear()}-${(startOfMonth.getUTCMonth() + 1).toString().padStart(2, '0')}`,
      total: filteredInstances.length,
    };
  }

  /**
   * Calcula recorrências on-demand para meses distantes
   */
  private async calculateRecurrencesOnDemand(
    tenantId: string,
    branchId: string | null,
    startOfMonth: Date,
    endOfMonth: Date,
    query: GetRecurrencesDto,
    userId?: string,
    userRoles?: string[],
    userMinistryId?: string,
  ) {
    console.log('⚡ [EventsService] Calculando recorrências on-demand');

    // Buscar eventos que podem ter recorrências no período
    const eventFilter: FilterQuery<Event> = {
      tenantId: new Types.ObjectId(tenantId),
      recurrenceType: { $ne: 'none' },
      status: { $in: ['draft', 'published'] },
    } as any;

    if (branchId) {
      eventFilter.branchId = new Types.ObjectId(branchId) as any;
    } else {
      eventFilter.branchId = null as any;
    }

    if (query.ministryId) {
      eventFilter.ministryId = query.ministryId as any;
    }

    const events = await this.eventModel.find(eventFilter).lean();
    console.log(
      `⚡ [EventsService] Encontrados ${events.length} eventos recorrentes`,
    );

    let calculatedInstances: any[] = [];

    for (const event of events) {
      const instances = this.calculateEventRecurrencesForMonth(
        event,
        startOfMonth,
        endOfMonth,
      );
      calculatedInstances.push(...instances);
    }

    // Aplicar exceções (skip e cancel_after)
    const eventIds = Array.from(
      new Set(calculatedInstances.map((i: any) => i.event?._id?.toString())),
    ).filter(Boolean);
    if (eventIds.length > 0) {
      const exceptions = await this.exceptionModel
        .find({ tenantId: new Types.ObjectId(tenantId), eventId: { $in: eventIds as any } } as any)
        .lean();
      const skipSet = new Set<string>();
      const cancelAfterMap = new Map<string, Date>();

      for (const ex of exceptions) {
        const eId = (ex.eventId as any).toString();
        if (ex.type === 'skip' && ex.instanceDate) {
          skipSet.add(`${eId}|${new Date(ex.instanceDate).toISOString()}`);
        }
        if (ex.type === 'cancel_after' && ex.fromDate) {
          const d = new Date(ex.fromDate);
          const current = cancelAfterMap.get(eId);
          if (!current || d < current) cancelAfterMap.set(eId, d);
        }
      }

      calculatedInstances = calculatedInstances.filter((inst: any) => {
        const eId = inst.event?._id?.toString();
        const key = `${eId}|${new Date(inst.instanceDate).toISOString()}`;
        if (skipSet.has(key)) return false;
        const cutoff = cancelAfterMap.get(eId);
        if (cutoff && new Date(inst.instanceDate) >= cutoff) return false;
        return true;
      });
    }

    // Aplicar filtros de permissão para líderes
    let filteredInstances = calculatedInstances;
    if (userId) {
      const leaderMinistries = await this.getLeaderMinistryIds(
        userId,
        tenantId,
        branchId,
      );
      if (leaderMinistries.length > 0) {
        filteredInstances = calculatedInstances.filter((instance) => {
          const event = instance.event;
          return (
            event?.isGlobal ||
            leaderMinistries.some(
              (m) => m.toString() === event?.ministryId?.toString(),
            ) ||
            event?.createdBy?.toString() === userId
          );
        });
      }
    }

    // Filtrar por status se especificado
    if (query.status) {
      filteredInstances = filteredInstances.filter(
        (instance) => instance.status === query.status,
      );
    }

    return {
      instances: filteredInstances,
      source: 'on_demand',
      month: `${startOfMonth.getUTCFullYear()}-${(startOfMonth.getUTCMonth() + 1).toString().padStart(2, '0')}`,
      total: filteredInstances.length,
    };
  }

  /**
   * Calcula recorrências de um evento específico para um mês
   */
  private calculateEventRecurrencesForMonth(
    event: any,
    startOfMonth: Date,
    endOfMonth: Date,
  ): any[] {
    const instances: any[] = [];
    const baseDate = new Date(event.eventDate);
    const [hh, mm] = (event.eventTime || '00:00')
      .split(':')
      .map((v: string) => parseInt(v, 10));

    const pushInstance = (date: Date) => {
      if (date >= startOfMonth && date <= endOfMonth) {
        instances.push({
          eventId: event._id,
          tenantId: event.tenantId,
          branchId: event.branchId,
          instanceDate: new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
              hh,
              mm,
              0,
            ),
          ),
          ministryScales: [],
          status: 'scheduled',
          event: {
            _id: event._id,
            name: event.name,
            eventTime: event.eventTime,
            recurrenceType: event.recurrenceType,
            recurrencePattern: event.recurrencePattern,
            ministryId: event.ministryId,
            isGlobal: event.isGlobal,
            eventType: event.eventType,
            createdBy: event.createdBy,
          },
        });
      }
    };

    if (event.recurrenceType === 'daily') {
      const interval = event.recurrencePattern?.interval || 1;
      const currentDate = new Date(
        Math.max(baseDate.getTime(), startOfMonth.getTime()),
      );

      while (currentDate <= endOfMonth) {
        pushInstance(new Date(currentDate));
        currentDate.setUTCDate(currentDate.getUTCDate() + interval);
      }
    } else if (event.recurrenceType === 'weekly') {
      const interval = event.recurrencePattern?.interval || 1;
      const days = event.recurrencePattern?.daysOfWeek?.length
        ? event.recurrencePattern.daysOfWeek
        : [baseDate.getUTCDay()];

      // Encontrar a primeira semana que contém o mês alvo
      const firstWeekStart = new Date(startOfMonth);
      firstWeekStart.setUTCDate(
        firstWeekStart.getUTCDate() - firstWeekStart.getUTCDay(),
      );

      for (let weekOffset = 0; weekOffset < 6; weekOffset += interval) {
        const weekDate = new Date(firstWeekStart);
        weekDate.setUTCDate(weekDate.getUTCDate() + weekOffset * 7);

        for (const dayOfWeek of days) {
          const instanceDate = new Date(weekDate);
          instanceDate.setUTCDate(instanceDate.getUTCDate() + dayOfWeek);
          pushInstance(instanceDate);
        }
      }
    } else if (event.recurrenceType === 'monthly') {
      const interval = event.recurrencePattern?.interval || 1;

      // Verificar se é recorrência por semana do mês (ex: primeira sexta-feira)
      if (
        event.recurrencePattern?.weekOfMonth &&
        event.recurrencePattern?.dayOfWeek !== undefined
      ) {
        const weekOfMonth = event.recurrencePattern.weekOfMonth; // 1-5
        const dayOfWeek = event.recurrencePattern.dayOfWeek; // 0-6

        console.log('📅 [EventsService] Processando evento mensal por semana:');
        console.log('   - weekOfMonth:', weekOfMonth);
        console.log('   - dayOfWeek:', dayOfWeek);

        // Calcular quantos meses desde a data base até o mês alvo
        const monthsDiff =
          (startOfMonth.getUTCFullYear() - baseDate.getUTCFullYear()) * 12 +
          (startOfMonth.getUTCMonth() - baseDate.getUTCMonth());

        const startMonthOffset = Math.ceil(monthsDiff / interval) * interval;
        const targetMonthStart = new Date(
          Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth() + startMonthOffset,
            1,
          ),
        );

        // Encontrar a primeira ocorrência do dia da semana no mês
        const firstDayOfWeek = new Date(targetMonthStart);
        const firstDayOfWeekInMonth = firstDayOfWeek.getUTCDay();
        const daysToAdd = (dayOfWeek - firstDayOfWeekInMonth + 7) % 7;
        firstDayOfWeek.setUTCDate(firstDayOfWeek.getUTCDate() + daysToAdd);

        // Calcular a semana específica (ex: primeira sexta-feira)
        const targetDate = new Date(firstDayOfWeek);
        targetDate.setUTCDate(targetDate.getUTCDate() + (weekOfMonth - 1) * 7);

        // Verificar se a data está dentro do mês
        if (targetDate.getUTCMonth() === targetMonthStart.getUTCMonth()) {
          console.log(
            `   - Gerando instância para ${weekOfMonth}ª semana, dia ${dayOfWeek} (${targetDate.toISOString()})`,
          );
          pushInstance(targetDate);
        }
      } else {
        // Recorrência mensal tradicional por dia do mês
        const dayOfMonth =
          event.recurrencePattern?.dayOfMonth || baseDate.getUTCDate();

        // Calcular quantos meses desde a data base até o mês alvo
        const monthsDiff =
          (startOfMonth.getUTCFullYear() - baseDate.getUTCFullYear()) * 12 +
          (startOfMonth.getUTCMonth() - baseDate.getUTCMonth());

        const startMonthOffset = Math.ceil(monthsDiff / interval) * interval;
        const targetMonthStart = new Date(
          Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth() + startMonthOffset,
            1,
          ),
        );

        const lastDay = new Date(
          Date.UTC(
            targetMonthStart.getUTCFullYear(),
            targetMonthStart.getUTCMonth() + 1,
            0,
          ),
        ).getUTCDate();
        const day = Math.min(dayOfMonth, lastDay);

        const instanceDate = new Date(
          Date.UTC(
            targetMonthStart.getUTCFullYear(),
            targetMonthStart.getUTCMonth(),
            day,
          ),
        );
        pushInstance(instanceDate);
      }
    }

    return instances;
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
