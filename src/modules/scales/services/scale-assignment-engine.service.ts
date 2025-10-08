import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Scale } from '../schemas/scale.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { MemberFunction } from '../../functions/schemas/member-function.schema';
import { MinistryFunction } from '../../functions/schemas/ministry-function.schema';
import { ServiceHistory } from '../schemas/service-history.schema';
import { AvailabilityValidator } from './availability-validator.service';

export interface ScaleAssignmentSuggestion {
  functionId: string;
  functionName: string;
  requiredSlots: number;
  optionalSlots: number;
  isRequired: boolean;
  suggestedVolunteers: {
    userId: string;
    userName: string;
    userEmail: string;
    priority: number;
    level: string;
    lastServiceDate?: Date;
    serviceCount: number;
  }[];
  assignedVolunteers: string[];
}

export interface ScaleGenerationResult {
  suggestions: ScaleAssignmentSuggestion[];
  requiresApproval: boolean;
  totalVolunteersNeeded: number;
  totalVolunteersAvailable: number;
  coverage: number; // Percentual de cobertura
}

@Injectable()
export class ScaleAssignmentEngine {
  constructor(
    @InjectModel(Scale.name)
    private scaleModel: Model<Scale>,
    @InjectModel(Membership.name)
    private membershipModel: Model<Membership>,
    @InjectModel(MemberFunction.name)
    private memberFunctionModel: Model<MemberFunction>,
    @InjectModel(MinistryFunction.name)
    private ministryFunctionModel: Model<MinistryFunction>,
    @InjectModel(ServiceHistory.name)
    private serviceHistoryModel: Model<ServiceHistory>,
    private availabilityValidator: AvailabilityValidator,
  ) {}

  /**
   * Gera sugestões de escalação para uma escala
   */
  async generateScaleAssignments(
    scaleId: string,
    tenantId: string,
  ): Promise<ScaleGenerationResult> {
    const scale = await this.scaleModel
      .findById(scaleId)
      .populate('templateId')
      .populate('ministryId')
      .exec();

    if (!scale) {
      throw new Error('Escala não encontrada');
    }

    // Buscar configurações do ministério
    const ministrySettings = await this.getMinistrySettings(
      scale.ministryId.toString(),
      tenantId,
    );

    // Buscar voluntários elegíveis do ministério
    const eligibleVolunteers = await this.getEligibleVolunteers(
      scale.ministryId.toString(),
      tenantId,
    );

    // Filtrar por disponibilidade
    const availableVolunteers = await this.filterByAvailability(
      eligibleVolunteers,
      scale.eventDate,
      scale.ministryId.toString(),
      tenantId,
    );

    // Gerar sugestões para cada função
    const suggestions: ScaleAssignmentSuggestion[] = [];
    let totalVolunteersNeeded = 0;
    let totalVolunteersAvailable = 0;

    for (const assignment of scale.assignments) {
      const functionId = assignment.functionId.toString();

      // Buscar voluntários com esta função
      const volunteersWithFunction = await this.getVolunteersWithFunction(
        availableVolunteers,
        functionId,
      );

      // Calcular histórico de serviços para balanceamento
      const volunteersWithHistory = await this.enrichWithServiceHistory(
        volunteersWithFunction,
        functionId,
        tenantId,
      );

      // Ordenar por prioridade e histórico
      const sortedVolunteers = this.sortVolunteersByPriority(
        volunteersWithHistory,
      );

      const requiredSlots = assignment.requiredSlots || 1;
      const optionalSlots = 0; // Não existe no schema atual
      const totalSlots = requiredSlots + optionalSlots;

      totalVolunteersNeeded += totalSlots;
      totalVolunteersAvailable += sortedVolunteers.length;

      suggestions.push({
        functionId,
        functionName: assignment.functionName || 'Função não especificada',
        requiredSlots,
        optionalSlots,
        isRequired: assignment.isRequired || false,
        suggestedVolunteers: sortedVolunteers.slice(0, totalSlots * 2), // Sugerir mais que o necessário
        assignedVolunteers: assignment.assignedMembers.map((m) => m.toString()),
      });
    }

    const coverage =
      totalVolunteersNeeded > 0
        ? Math.min(
            100,
            (totalVolunteersAvailable / totalVolunteersNeeded) * 100,
          )
        : 100;

    return {
      suggestions,
      requiresApproval: ministrySettings?.requireLeaderApproval || true,
      totalVolunteersNeeded,
      totalVolunteersAvailable,
      coverage,
    };
  }

  /**
   * Busca voluntários elegíveis do ministério
   */
  private async getEligibleVolunteers(
    ministryId: string,
    tenantId: string,
  ): Promise<any[]> {
    return await this.membershipModel
      .find({
        ministry: new Types.ObjectId(ministryId),
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
        role: { $in: ['volunteer', 'leader'] },
      })
      .populate('user', 'name email')
      .exec();
  }

  /**
   * Filtra voluntários por disponibilidade
   */
  private async filterByAvailability(
    volunteers: any[],
    eventDate: Date,
    ministryId: string,
    tenantId: string,
  ): Promise<any[]> {
    const availableVolunteers: any[] = [];

    for (const volunteer of volunteers) {
      const checkResult = await this.availabilityValidator.checkAvailability(
        volunteer.user._id.toString(),
        ministryId,
        eventDate,
        tenantId,
      );

      if (checkResult.isAvailable) {
        availableVolunteers.push(volunteer);
      }
    }

    return availableVolunteers;
  }

  /**
   * Busca voluntários com uma função específica
   */
  private async getVolunteersWithFunction(
    volunteers: any[],
    functionId: string,
  ): Promise<any[]> {
    const volunteersWithFunction: any[] = [];

    for (const volunteer of volunteers) {
      const memberFunction = await this.memberFunctionModel
        .findOne({
          memberId: volunteer.user._id,
          functionId: new Types.ObjectId(functionId),
          status: 'approved',
          isActive: true,
        })
        .populate('functionId', 'name description')
        .exec();

      if (memberFunction) {
        volunteersWithFunction.push({
          ...volunteer,
          memberFunction,
        });
      }
    }

    return volunteersWithFunction;
  }

  /**
   * Enriquece voluntários com histórico de serviços
   */
  private async enrichWithServiceHistory(
    volunteers: any[],
    functionId: string,
    tenantId: string,
  ): Promise<any[]> {
    const enrichedVolunteers: any[] = [];

    for (const volunteer of volunteers) {
      // Buscar histórico de serviços nos últimos 90 dias
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const serviceHistory = await this.serviceHistoryModel
        .find({
          userId: volunteer.user._id,
          functionId: new Types.ObjectId(functionId),
          tenantId: new Types.ObjectId(tenantId),
          serviceDate: { $gte: ninetyDaysAgo },
          status: 'completed',
        })
        .sort({ serviceDate: -1 })
        .exec();

      const lastServiceDate =
        serviceHistory.length > 0 ? serviceHistory[0].serviceDate : null;

      enrichedVolunteers.push({
        ...volunteer,
        serviceCount: serviceHistory.length,
        lastServiceDate,
      });
    }

    return enrichedVolunteers;
  }

  /**
   * Ordena voluntários por prioridade e histórico
   */
  private sortVolunteersByPriority(volunteers: any[]): any[] {
    return volunteers.sort((a, b) => {
      // Prioridade 1: Voluntários com menos serviços recentes
      if (a.serviceCount !== b.serviceCount) {
        return a.serviceCount - b.serviceCount;
      }

      // Prioridade 2: Voluntários com função de maior prioridade
      const aPriority = a.memberFunction?.priority || 1;
      const bPriority = b.memberFunction?.priority || 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Prioridade 3: Voluntários com nível mais alto
      const aLevel = this.getLevelWeight(a.memberFunction?.level);
      const bLevel = this.getLevelWeight(b.memberFunction?.level);
      if (aLevel !== bLevel) {
        return bLevel - aLevel; // Maior nível primeiro
      }

      // Prioridade 4: Ordem alfabética por nome
      return a.user.name.localeCompare(b.user.name);
    });
  }

  /**
   * Converte nível de função para peso numérico
   */
  private getLevelWeight(level?: string): number {
    switch (level) {
      case 'especialista':
        return 3;
      case 'intermediario':
        return 2;
      case 'iniciante':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Busca configurações do ministério
   */
  private async getMinistrySettings(ministryId: string, tenantId: string) {
    // Esta função será implementada quando criarmos o serviço de configurações
    return {
      requireLeaderApproval: true,
      autoGenerateScales: true,
    };
  }
}
