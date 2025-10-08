import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Scale } from '../schemas/scale.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { MemberFunction } from '../../functions/schemas/member-function.schema';
import { SubstitutionRequest } from '../schemas/substitution-request.schema';
import { AvailabilityValidator } from './availability-validator.service';

export interface SwapCandidate {
  userId: string;
  userName: string;
  userEmail: string;
  functionLevel: string;
  priority: number;
  lastServiceDate?: Date;
  serviceCount: number;
  isAvailable: boolean;
  availabilityReason?: string;
}

export interface SwapRequestResult {
  success: boolean;
  message: string;
  swapRequestId?: string;
  candidates?: SwapCandidate[];
}

@Injectable()
export class SubstitutionEngine {
  constructor(
    @InjectModel(Scale.name)
    private scaleModel: Model<Scale>,
    @InjectModel(Membership.name)
    private membershipModel: Model<Membership>,
    @InjectModel(MemberFunction.name)
    private memberFunctionModel: Model<MemberFunction>,
    @InjectModel(SubstitutionRequest.name)
    private substitutionRequestModel: Model<SubstitutionRequest>,
    private availabilityValidator: AvailabilityValidator,
  ) {}

  /**
   * Busca candidatos para troca com um voluntário específico
   */
  async findSwapCandidates(
    scaleId: string,
    requesterId: string,
    tenantId: string,
  ): Promise<SwapCandidate[]> {
    const scale = await this.scaleModel
      .findById(scaleId)
      .populate('ministryId')
      .exec();

    if (!scale) {
      throw new Error('Escala não encontrada');
    }

    // Encontrar a função do voluntário solicitante
    const requesterAssignment = scale.assignments.find((assignment) =>
      assignment.assignedMembers.some(
        (member) => member.toString() === requesterId,
      ),
    );

    if (!requesterAssignment) {
      throw new Error('Voluntário não encontrado nesta escala');
    }

    const functionId = requesterAssignment.functionId.toString();

    // Buscar voluntários com a mesma função no mesmo ministério
    const candidates = await this.memberFunctionModel
      .find({
        functionId: new Types.ObjectId(functionId),
        memberId: { $ne: new Types.ObjectId(requesterId) },
        status: 'approved',
        isActive: true,
      })
      .populate('memberId', 'name email')
      .exec();

    const swapCandidates: SwapCandidate[] = [];

    for (const candidate of candidates) {
      // Verificar se está no mesmo ministério
      const membership = await this.membershipModel.findOne({
        user: candidate.memberId._id,
        ministry: scale.ministryId,
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
      });

      if (!membership) {
        continue;
      }

      // Verificar disponibilidade
      const availabilityCheck =
        await this.availabilityValidator.checkAvailability(
          candidate.memberId._id.toString(),
          scale.ministryId.toString(),
          scale.eventDate,
          tenantId,
        );

      // Verificar se não tem escala conflitante
      const hasConflict = await this.checkScaleConflict(
        candidate.memberId._id.toString(),
        scale.eventDate,
        scale.eventTime,
      );

      swapCandidates.push({
        userId: candidate.memberId._id.toString(),
        userName: (candidate.memberId as any).name,
        userEmail: (candidate.memberId as any).email,
        functionLevel: candidate.level || 'iniciante',
        priority: candidate.priority || 1,
        lastServiceDate: undefined, // Será preenchido se necessário
        serviceCount: 0, // Será preenchido se necessário
        isAvailable: availabilityCheck.isAvailable && !hasConflict,
        availabilityReason: availabilityCheck.isAvailable
          ? hasConflict
            ? 'Possui escala conflitante'
            : 'Disponível'
          : availabilityCheck.reason,
      });
    }

    // Ordenar por disponibilidade e prioridade
    return swapCandidates.sort((a, b) => {
      // Primeiro: disponíveis
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;

      // Segundo: por prioridade
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Terceiro: por nível
      const aLevelWeight = this.getLevelWeight(a.functionLevel);
      const bLevelWeight = this.getLevelWeight(b.functionLevel);
      if (aLevelWeight !== bLevelWeight) {
        return bLevelWeight - aLevelWeight;
      }

      // Quarto: alfabético
      return a.userName.localeCompare(b.userName);
    });
  }

  /**
   * Cria uma solicitação de troca
   */
  async createSwapRequest(
    scaleId: string,
    requesterId: string,
    targetId: string,
    reason: string,
    tenantId: string,
  ): Promise<SwapRequestResult> {
    const scale = await this.scaleModel.findById(scaleId).exec();

    if (!scale) {
      return {
        success: false,
        message: 'Escala não encontrada',
      };
    }

    // Validar se ambos têm a mesma função na escala
    const requesterAssignment = scale.assignments.find((assignment) =>
      assignment.assignedMembers.some(
        (member) => member.toString() === requesterId,
      ),
    );

    if (!requesterAssignment) {
      return {
        success: false,
        message: 'Voluntário solicitante não encontrado nesta escala',
      };
    }

    // Verificar se o alvo tem a função necessária
    const targetFunction = await this.memberFunctionModel.findOne({
      memberId: new Types.ObjectId(targetId),
      functionId: requesterAssignment.functionId,
      status: 'approved',
      isActive: true,
    });

    if (!targetFunction) {
      return {
        success: false,
        message: 'Voluntário alvo não tem a função necessária',
      };
    }

    // Verificar disponibilidade do alvo
    const availabilityCheck =
      await this.availabilityValidator.checkAvailability(
        targetId,
        scale.ministryId.toString(),
        scale.eventDate,
        tenantId,
      );

    if (!availabilityCheck.isAvailable) {
      return {
        success: false,
        message: `Voluntário alvo não está disponível: ${availabilityCheck.reason}`,
      };
    }

    // Verificar se já existe solicitação pendente
    const existingRequest = await this.substitutionRequestModel.findOne({
      scaleId: new Types.ObjectId(scaleId),
      requesterId: new Types.ObjectId(requesterId),
      targetId: new Types.ObjectId(targetId),
      status: 'pending',
    });

    if (existingRequest) {
      return {
        success: false,
        message:
          'Já existe uma solicitação de troca pendente com este voluntário',
      };
    }

    // Criar solicitação de troca
    const swapRequest = new this.substitutionRequestModel({
      scaleId: new Types.ObjectId(scaleId),
      requesterId: new Types.ObjectId(requesterId),
      targetId: new Types.ObjectId(targetId),
      functionId: requesterAssignment.functionId,
      reason: reason,
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      tenantId: new Types.ObjectId(tenantId),
      ministryId: scale.ministryId,
    });

    await swapRequest.save();

    return {
      success: true,
      message: 'Solicitação de troca criada com sucesso',
      swapRequestId: (swapRequest._id as any).toString(),
    };
  }

  /**
   * Executa uma troca aprovada
   */
  async executeSwap(swapRequestId: string): Promise<SwapRequestResult> {
    const swapRequest =
      await this.substitutionRequestModel.findById(swapRequestId);

    if (!swapRequest) {
      return {
        success: false,
        message: 'Solicitação de troca não encontrada',
      };
    }

    if (swapRequest.status !== 'accepted') {
      return {
        success: false,
        message: 'Solicitação não foi aceita',
      };
    }

    const scale = await this.scaleModel.findById(swapRequest.scaleId);

    if (!scale) {
      return {
        success: false,
        message: 'Escala não encontrada',
      };
    }

    // Encontrar a atribuição do voluntário solicitante
    const requesterAssignment = scale.assignments.find((assignment) =>
      assignment.assignedMembers.some(
        (member) => member.toString() === swapRequest.requesterId.toString(),
      ),
    );

    if (!requesterAssignment) {
      return {
        success: false,
        message: 'Atribuição do voluntário solicitante não encontrada',
      };
    }

    // Executar a troca
    requesterAssignment.assignedMembers =
      requesterAssignment.assignedMembers.map((member) => {
        if (member.toString() === swapRequest.requesterId.toString()) {
          return new Types.ObjectId(swapRequest.targetId);
        }
        return member;
      });

    // Salvar escala atualizada
    await scale.save();

    // Atualizar status da solicitação
    swapRequest.status = 'completed';
    await swapRequest.save();

    return {
      success: true,
      message: 'Troca executada com sucesso',
    };
  }

  /**
   * Verifica se há conflito de escala
   */
  private async checkScaleConflict(
    userId: string,
    eventDate: Date,
    eventTime: string,
  ): Promise<boolean> {
    const conflictScale = await this.scaleModel.findOne({
      'assignments.assignedMembers': new Types.ObjectId(userId),
      eventDate: eventDate,
      eventTime: eventTime,
      status: { $in: ['published', 'completed'] },
    });

    return conflictScale !== null;
  }

  /**
   * Converte nível de função para peso numérico
   */
  private getLevelWeight(level: string): number {
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
}
