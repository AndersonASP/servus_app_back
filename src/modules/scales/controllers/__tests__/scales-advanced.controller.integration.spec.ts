import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as request from 'supertest';
import { ScalesAdvancedController } from '../controllers/scales-advanced.controller';
import { VolunteerAvailabilityService } from '../services/volunteer-availability.service';
import { SubstitutionService } from '../services/substitution.service';
import { ServiceHistoryService } from '../services/service-history.service';
import { ScaleAssignmentEngine } from '../services/scale-assignment-engine.service';
import { VolunteerAvailability } from '../schemas/volunteer-availability.schema';
import { SubstitutionRequest } from '../schemas/substitution-request.schema';
import { ServiceHistory } from '../schemas/service-history.schema';
import { Scale } from '../schemas/scale.schema';

describe('ScalesAdvancedController (Integration)', () => {
  let app: INestApplication;
  let volunteerAvailabilityService: VolunteerAvailabilityService;
  let substitutionService: SubstitutionService;
  let serviceHistoryService: ServiceHistoryService;
  let scaleAssignmentEngine: ScaleAssignmentEngine;

  const mockVolunteerAvailabilityModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSubstitutionRequestModel = {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockServiceHistoryModel = {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockScaleModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScalesAdvancedController],
      providers: [
        VolunteerAvailabilityService,
        SubstitutionService,
        ServiceHistoryService,
        ScaleAssignmentEngine,
        {
          provide: getModelToken(VolunteerAvailability.name),
          useValue: mockVolunteerAvailabilityModel,
        },
        {
          provide: getModelToken(SubstitutionRequest.name),
          useValue: mockSubstitutionRequestModel,
        },
        {
          provide: getModelToken(ServiceHistory.name),
          useValue: mockServiceHistoryModel,
        },
        {
          provide: getModelToken(Scale.name),
          useValue: mockScaleModel,
        },
        // Mock other dependencies
        {
          provide: 'AvailabilityValidator',
          useValue: {
            checkAvailability: jest.fn(),
            canBlockDate: jest.fn(),
            getMonthlyBlockedDaysInfo: jest.fn(),
          },
        },
        {
          provide: 'SubstitutionEngine',
          useValue: {
            findSwapCandidates: jest.fn(),
            createSwapRequest: jest.fn(),
            executeSwap: jest.fn(),
          },
        },
        {
          provide: 'MembershipModel',
          useValue: { find: jest.fn() },
        },
        {
          provide: 'MemberFunctionModel',
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: 'MinistryFunctionModel',
          useValue: { find: jest.fn() },
        },
        {
          provide: 'MinistrySettingsModel',
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    volunteerAvailabilityService = module.get<VolunteerAvailabilityService>(
      VolunteerAvailabilityService,
    );
    substitutionService = module.get<SubstitutionService>(SubstitutionService);
    serviceHistoryService = module.get<ServiceHistoryService>(
      ServiceHistoryService,
    );
    scaleAssignmentEngine = module.get<ScaleAssignmentEngine>(
      ScaleAssignmentEngine,
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /scales/availability', () => {
    it('should create volunteer availability', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const dto = {
        userId: '507f1f77bcf86cd799439012',
        ministryId: '507f1f77bcf86cd799439013',
        blockedDates: [
          {
            date: '2024-01-15',
            reason: 'Viagem',
            isBlocked: true,
          },
        ],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
      };

      const mockAvailability = {
        _id: '507f1f77bcf86cd799439014',
        userId: new Types.ObjectId(dto.userId),
        ministryId: new Types.ObjectId(dto.ministryId),
        tenantId: new Types.ObjectId(tenantId),
        blockedDates: dto.blockedDates.map((bd) => ({
          date: new Date(bd.date),
          reason: bd.reason,
          isBlocked: bd.isBlocked,
          createdAt: new Date(),
        })),
        maxBlockedDaysPerMonth: dto.maxBlockedDaysPerMonth,
        isActive: dto.isActive,
        lastUpdated: new Date(),
      };

      jest
        .spyOn(volunteerAvailabilityService, 'createOrUpdateAvailability')
        .mockResolvedValue(mockAvailability as any);

      const response = await request(app.getHttpServer())
        .post(`/scales/availability`)
        .send(dto)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Disponibilidade atualizada com sucesso',
      );
      expect(response.body.data).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const invalidDto = {
        // Missing required fields
        blockedDates: [],
      };

      await request(app.getHttpServer())
        .post(`/scales/availability`)
        .send(invalidDto)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(400);
    });
  });

  describe('POST /scales/availability/block-date', () => {
    it('should block a date successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const body = {
        userId: '507f1f77bcf86cd799439012',
        ministryId: '507f1f77bcf86cd799439013',
        date: '2024-01-15',
        reason: 'Viagem',
      };

      const mockAvailability = {
        _id: '507f1f77bcf86cd799439014',
        userId: new Types.ObjectId(body.userId),
        ministryId: new Types.ObjectId(body.ministryId),
        tenantId: new Types.ObjectId(tenantId),
        blockedDates: [
          {
            date: new Date(body.date),
            reason: body.reason,
            isBlocked: true,
            createdAt: new Date(),
          },
        ],
        lastUpdated: new Date(),
      };

      jest
        .spyOn(volunteerAvailabilityService, 'blockDate')
        .mockResolvedValue(mockAvailability as any);

      const response = await request(app.getHttpServer())
        .post(`/scales/availability/block-date`)
        .send(body)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data bloqueada com sucesso');
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /scales/availability/check/:userId/:ministryId/:date', () => {
    it('should check volunteer availability', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const ministryId = '507f1f77bcf86cd799439013';
      const date = '2024-01-15';

      const mockResult = {
        isAvailable: true,
        reason: 'Disponível para escalação',
      };

      jest
        .spyOn(volunteerAvailabilityService, 'checkVolunteerAvailability')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .get(`/scales/availability/check/${userId}/${ministryId}/${date}`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });

  describe('POST /scales/swap/request', () => {
    it('should create swap request successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const dto = {
        scaleId: '507f1f77bcf86cd799439012',
        targetId: '507f1f77bcf86cd799439013',
        reason: 'Não posso comparecer',
      };

      const mockResult = {
        success: true,
        message: 'Solicitação de troca criada com sucesso',
        swapRequestId: '507f1f77bcf86cd799439014',
      };

      jest
        .spyOn(substitutionService, 'createSwapRequest')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/scales/swap/request`)
        .send(dto)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });

  describe('PATCH /scales/swap/request/:swapRequestId/respond', () => {
    it('should respond to swap request', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const swapRequestId = '507f1f77bcf86cd799439012';
      const dto = {
        response: 'accepted',
      };

      const mockResult = {
        success: true,
        message: 'Troca aceita e executada com sucesso',
        swapRequest: {
          _id: swapRequestId,
          status: 'accepted',
        },
      };

      jest
        .spyOn(substitutionService, 'respondToSwapRequest')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .patch(`/scales/swap/request/${swapRequestId}/respond`)
        .send(dto)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });

  describe('GET /scales/swap/requests/pending', () => {
    it('should get pending requests for user', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const mockRequests = [
        {
          _id: '507f1f77bcf86cd799439012',
          requesterId: '507f1f77bcf86cd799439013',
          targetId: '507f1f77bcf86cd799439014',
          status: 'pending',
          reason: 'Não posso comparecer',
        },
      ];

      jest
        .spyOn(substitutionService, 'getPendingRequestsForUser')
        .mockResolvedValue(mockRequests as any);

      const response = await request(app.getHttpServer())
        .get(`/scales/swap/requests/pending`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRequests);
    });
  });

  describe('POST /scales/service-history', () => {
    it('should create service history', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const dto = {
        userId: '507f1f77bcf86cd799439012',
        scaleId: '507f1f77bcf86cd799439013',
        functionId: '507f1f77bcf86cd799439014',
        ministryId: '507f1f77bcf86cd799439015',
        serviceDate: '2024-01-15',
        status: 'completed',
        notes: 'Serviço realizado com sucesso',
      };

      const mockHistory = {
        _id: '507f1f77bcf86cd799439016',
        userId: new Types.ObjectId(dto.userId),
        scaleId: new Types.ObjectId(dto.scaleId),
        functionId: new Types.ObjectId(dto.functionId),
        ministryId: new Types.ObjectId(dto.ministryId),
        serviceDate: new Date(dto.serviceDate),
        status: dto.status,
        notes: dto.notes,
        recordedAt: new Date(),
      };

      jest
        .spyOn(serviceHistoryService, 'createServiceHistory')
        .mockResolvedValue(mockHistory as any);

      const response = await request(app.getHttpServer())
        .post(`/scales/service-history`)
        .send(dto)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Histórico de serviço criado');
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /scales/service-history/stats/volunteer/:userId', () => {
    it('should get volunteer service stats', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockStats = {
        totalServices: 10,
        completedServices: 8,
        missedServices: 1,
        cancelledServices: 1,
        attendanceRate: 80,
        stats: [
          { _id: 'completed', count: 8 },
          { _id: 'missed', count: 1 },
          { _id: 'cancelled', count: 1 },
        ],
      };

      jest
        .spyOn(serviceHistoryService, 'getVolunteerServiceStats')
        .mockResolvedValue(mockStats);

      const response = await request(app.getHttpServer())
        .get(`/scales/service-history/stats/volunteer/${userId}`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('POST /scales/generate-assignments/:scaleId', () => {
    it('should generate scale assignments', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const scaleId = '507f1f77bcf86cd799439012';

      const mockResult = {
        suggestions: [
          {
            functionId: '507f1f77bcf86cd799439013',
            functionName: 'Vocalista',
            requiredSlots: 2,
            optionalSlots: 0,
            isRequired: true,
            suggestedVolunteers: [
              {
                userId: '507f1f77bcf86cd799439014',
                userName: 'João Silva',
                userEmail: 'joao@example.com',
                priority: 1,
                level: 'intermediario',
                serviceCount: 5,
              },
            ],
            assignedVolunteers: [],
          },
        ],
        requiresApproval: true,
        totalVolunteersNeeded: 2,
        totalVolunteersAvailable: 3,
        coverage: 100,
      };

      jest
        .spyOn(scaleAssignmentEngine, 'generateScaleAssignments')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/scales/generate-assignments/${scaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });
});
