import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubstitutionRequest } from '../schemas/substitution-request.schema';
import { Scale } from '../schemas/scale.schema';
import { SubstitutionEngine } from './substitution-engine.service';
import {
  CreateSubstitutionRequestDto,
  RespondToSubstitutionRequestDto,
  ListSubstitutionRequestDto,
  SubstitutionRequestStatus,
} from '../dto/substitution-request.dto';

@Injectable()
export class SubstitutionService {
  constructor(
    @InjectModel(SubstitutionRequest.name)
    private substitutionRequestModel: Model<SubstitutionRequest>,
    @InjectModel(Scale.name)
    private scaleModel: Model<Scale>,
    private substitutionEngine: SubstitutionEngine,
  ) {}

  /**
   * Buscar candidatos para troca
   */
  async findSwapCandidates(
    tenantId: string,
    scaleId: string,
    requesterId: string,
  ) {
    return await this.substitutionEngine.findSwapCandidates(
      scaleId,
      requesterId,
      tenantId,
    );
  }

  /**
   * Criar solicitação de troca
   */
  async createSwapRequest(
    tenantId: string,
    requesterId: string,
    dto: CreateSubstitutionRequestDto,
  ) {
    return await this.substitutionEngine.createSwapRequest(
      dto.scaleId,
      requesterId,
      dto.targetId,
      dto.reason,
      tenantId,
    );
  }

  /**
   * Responder a uma solicitação de troca
   */
  async respondToSwapRequest(
    tenantId: string,
    swapRequestId: string,
    targetId: string,
    dto: RespondToSubstitutionRequestDto,
  ) {
    const swapRequest =
      await this.substitutionRequestModel.findById(swapRequestId);

    if (!swapRequest) {
      throw new NotFoundException('Solicitação de troca não encontrada');
    }

    if (swapRequest.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    if (swapRequest.targetId.toString() !== targetId) {
      throw new BadRequestException('Você não pode responder esta solicitação');
    }

    if (swapRequest.status !== 'pending') {
      throw new BadRequestException('Solicitação já foi respondida');
    }

    if (swapRequest.expiresAt < new Date()) {
      throw new BadRequestException('Solicitação expirou');
    }

    if (dto.response === SubstitutionRequestStatus.ACCEPTED) {
      // Executar a troca
      const result = await this.substitutionEngine.executeSwap(swapRequestId);

      if (result.success) {
        // Atualizar status da solicitação
        swapRequest.status = 'accepted';
        swapRequest.respondedBy = new Types.ObjectId(targetId);
        swapRequest.respondedAt = new Date();
        await swapRequest.save();

        return {
          success: true,
          message: 'Troca aceita e executada com sucesso',
          swapRequest,
        };
      } else {
        return {
          success: false,
          message: result.message,
        };
      }
    } else {
      // Rejeitar a troca
      swapRequest.status = 'rejected';
      swapRequest.rejectionReason = dto.rejectionReason;
      swapRequest.respondedBy = new Types.ObjectId(targetId);
      swapRequest.respondedAt = new Date();
      await swapRequest.save();

      return {
        success: true,
        message: 'Solicitação de troca rejeitada',
        swapRequest,
      };
    }
  }

  /**
   * Cancelar uma solicitação de troca
   */
  async cancelSwapRequest(
    tenantId: string,
    swapRequestId: string,
    requesterId: string,
  ) {
    const swapRequest =
      await this.substitutionRequestModel.findById(swapRequestId);

    if (!swapRequest) {
      throw new NotFoundException('Solicitação de troca não encontrada');
    }

    if (swapRequest.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    if (swapRequest.requesterId.toString() !== requesterId) {
      throw new BadRequestException('Você não pode cancelar esta solicitação');
    }

    if (swapRequest.status !== 'pending') {
      throw new BadRequestException('Solicitação não pode ser cancelada');
    }

    swapRequest.status = 'cancelled';
    await swapRequest.save();

    return {
      success: true,
      message: 'Solicitação de troca cancelada',
      swapRequest,
    };
  }

  /**
   * Listar solicitações de troca
   */
  async listSwapRequests(tenantId: string, query: ListSubstitutionRequestDto) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.scaleId) {
      filter.scaleId = new Types.ObjectId(query.scaleId);
    }

    if (query.requesterId) {
      filter.requesterId = new Types.ObjectId(query.requesterId);
    }

    if (query.targetId) {
      filter.targetId = new Types.ObjectId(query.targetId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.ministryId) {
      filter.ministryId = new Types.ObjectId(query.ministryId);
    }

    return await this.substitutionRequestModel
      .find(filter)
      .populate('requesterId', 'name email')
      .populate('targetId', 'name email')
      .populate('functionId', 'name description')
      .populate('scaleId', 'name eventDate eventTime')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obter solicitação de troca por ID
   */
  async getSwapRequestById(tenantId: string, swapRequestId: string) {
    const swapRequest = await this.substitutionRequestModel
      .findById(swapRequestId)
      .populate('requesterId', 'name email')
      .populate('targetId', 'name email')
      .populate('functionId', 'name description')
      .populate('scaleId', 'name eventDate eventTime')
      .exec();

    if (!swapRequest) {
      throw new NotFoundException('Solicitação de troca não encontrada');
    }

    if (swapRequest.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    return swapRequest;
  }

  /**
   * Listar solicitações pendentes para um voluntário
   */
  async getPendingRequestsForUser(tenantId: string, userId: string) {
    return await this.substitutionRequestModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId(userId),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .populate('requesterId', 'name email')
      .populate('functionId', 'name description')
      .populate('scaleId', 'name eventDate eventTime')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Listar solicitações enviadas por um voluntário
   */
  async getSentRequestsByUser(tenantId: string, userId: string) {
    return await this.substitutionRequestModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        requesterId: new Types.ObjectId(userId),
      })
      .populate('targetId', 'name email')
      .populate('functionId', 'name description')
      .populate('scaleId', 'name eventDate eventTime')
      .sort({ createdAt: -1 })
      .exec();
  }
}
