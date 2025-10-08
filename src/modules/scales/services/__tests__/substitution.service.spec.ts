import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubstitutionService } from '../services/substitution.service';
import { SubstitutionEngine } from '../services/substitution-engine.service';
import { SubstitutionRequest } from '../schemas/substitution-request.schema';
import { Scale } from '../schemas/scale.schema';

describe('SubstitutionService', () => {
  let service: SubstitutionService;
  let substitutionRequestModel: Model<SubstitutionRequest>;
  let scaleModel: Model<Scale>;
  let substitutionEngine: SubstitutionEngine;

  const mockSubstitutionRequestModel = {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockScaleModel = {
    findById: jest.fn(),
  };

  const mockSubstitutionEngine = {
    findSwapCandidates: jest.fn(),
    createSwapRequest: jest.fn(),
    executeSwap: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstitutionService,
        {
          provide: getModelToken(SubstitutionRequest.name),
          useValue: mockSubstitutionRequestModel,
        },
        {
          provide: getModelToken(Scale.name),
          useValue: mockScaleModel,
        },
        {
          provide: SubstitutionEngine,
          useValue: mockSubstitutionEngine,
        },
      ],
    }).compile();

    service = module.get<SubstitutionService>(SubstitutionService);
    substitutionRequestModel = module.get<Model<SubstitutionRequest>>(
      getModelToken(SubstitutionRequest.name),
    );
    scaleModel = module.get<Model<Scale>>(getModelToken(Scale.name));
    substitutionEngine = module.get<SubstitutionEngine>(SubstitutionEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findSwapCandidates', () => {
    it('should find swap candidates', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const scaleId = '507f1f77bcf86cd799439012';
      const requesterId = '507f1f77bcf86cd799439013';

      const mockCandidates = [
        {
          userId: '507f1f77bcf86cd799439014',
          userName: 'João Silva',
          userEmail: 'joao@example.com',
          functionLevel: 'intermediario',
          priority: 1,
          isAvailable: true,
          availabilityReason: 'Disponível',
        },
        {
          userId: '507f1f77bcf86cd799439015',
          userName: 'Maria Santos',
          userEmail: 'maria@example.com',
          functionLevel: 'especialista',
          priority: 2,
          isAvailable: false,
          availabilityReason: 'Data bloqueada',
        },
      ];

      mockSubstitutionEngine.findSwapCandidates.mockResolvedValue(
        mockCandidates,
      );

      const result = await service.findSwapCandidates(
        tenantId,
        scaleId,
        requesterId,
      );

      expect(mockSubstitutionEngine.findSwapCandidates).toHaveBeenCalledWith(
        scaleId,
        requesterId,
        tenantId,
      );

      expect(result).toBe(mockCandidates);
    });
  });

  describe('createSwapRequest', () => {
    it('should create swap request successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const requesterId = '507f1f77bcf86cd799439012';
      const dto = {
        scaleId: '507f1f77bcf86cd799439013',
        targetId: '507f1f77bcf86cd799439014',
        reason: 'Não posso comparecer',
      };

      const mockResult = {
        success: true,
        message: 'Solicitação de troca criada com sucesso',
        swapRequestId: '507f1f77bcf86cd799439015',
      };

      mockSubstitutionEngine.createSwapRequest.mockResolvedValue(mockResult);

      const result = await service.createSwapRequest(
        tenantId,
        requesterId,
        dto,
      );

      expect(mockSubstitutionEngine.createSwapRequest).toHaveBeenCalledWith(
        dto.scaleId,
        requesterId,
        dto.targetId,
        dto.reason,
        tenantId,
      );

      expect(result).toBe(mockResult);
    });

    it('should handle swap request creation failure', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const requesterId = '507f1f77bcf86cd799439012';
      const dto = {
        scaleId: '507f1f77bcf86cd799439013',
        targetId: '507f1f77bcf86cd799439014',
        reason: 'Não posso comparecer',
      };

      const mockResult = {
        success: false,
        message: 'Voluntário alvo não está disponível nesta data',
      };

      mockSubstitutionEngine.createSwapRequest.mockResolvedValue(mockResult);

      const result = await service.createSwapRequest(
        tenantId,
        requesterId,
        dto,
      );

      expect(result).toBe(mockResult);
      expect(result.success).toBe(false);
    });
  });

  describe('respondToSwapRequest', () => {
    it('should accept swap request successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'accepted' as any,
      };

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId(targetId),
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(this),
      };

      const mockExecuteResult = {
        success: true,
        message: 'Troca executada com sucesso',
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);
      mockSubstitutionEngine.executeSwap.mockResolvedValue(mockExecuteResult);

      const result = await service.respondToSwapRequest(
        tenantId,
        swapRequestId,
        targetId,
        dto,
      );

      expect(mockSubstitutionRequestModel.findById).toHaveBeenCalledWith(
        swapRequestId,
      );
      expect(mockSubstitutionEngine.executeSwap).toHaveBeenCalledWith(
        swapRequestId,
      );
      expect(mockSwapRequest.status).toBe('accepted');
      expect(mockSwapRequest.save).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Troca aceita e executada com sucesso');
    });

    it('should reject swap request', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'rejected' as any,
        rejectionReason: 'Não posso ajudar desta vez',
      };

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId(targetId),
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(this),
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);

      const result = await service.respondToSwapRequest(
        tenantId,
        swapRequestId,
        targetId,
        dto,
      );

      expect(mockSwapRequest.status).toBe('rejected');
      expect(mockSwapRequest.rejectionReason).toBe(dto.rejectionReason);
      expect(mockSwapRequest.save).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Solicitação de troca rejeitada');
    });

    it('should throw error when swap request not found', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'accepted' as any,
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(null);

      await expect(
        service.respondToSwapRequest(tenantId, swapRequestId, targetId, dto),
      ).rejects.toThrow('Solicitação de troca não encontrada');
    });

    it('should throw error when user cannot respond to request', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'accepted' as any,
      };

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId('507f1f77bcf86cd799439999'), // Different user
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);

      await expect(
        service.respondToSwapRequest(tenantId, swapRequestId, targetId, dto),
      ).rejects.toThrow('Você não pode responder esta solicitação');
    });

    it('should throw error when request already responded', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'accepted' as any,
      };

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId(targetId),
        status: 'accepted', // Already responded
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);

      await expect(
        service.respondToSwapRequest(tenantId, swapRequestId, targetId, dto),
      ).rejects.toThrow('Solicitação já foi respondida');
    });

    it('should throw error when request expired', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const targetId = '507f1f77bcf86cd799439013';
      const dto = {
        response: 'accepted' as any,
      };

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        targetId: new Types.ObjectId(targetId),
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);

      await expect(
        service.respondToSwapRequest(tenantId, swapRequestId, targetId, dto),
      ).rejects.toThrow('Solicitação expirou');
    });
  });

  describe('cancelSwapRequest', () => {
    it('should cancel swap request successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const requesterId = '507f1f77bcf86cd799439013';

      const mockSwapRequest = {
        _id: swapRequestId,
        tenantId: new Types.ObjectId(tenantId),
        requesterId: new Types.ObjectId(requesterId),
        status: 'pending',
        save: jest.fn().mockResolvedValue(this),
      };

      mockSubstitutionRequestModel.findById.mockResolvedValue(mockSwapRequest);

      const result = await service.cancelSwapRequest(
        tenantId,
        swapRequestId,
        requesterId,
      );

      expect(mockSwapRequest.status).toBe('cancelled');
      expect(mockSwapRequest.save).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Solicitação de troca cancelada');
    });
  });
});
