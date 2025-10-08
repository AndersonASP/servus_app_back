import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { ScalesAdvancedController } from '../controllers/scales-advanced.controller';
import { VolunteerAvailabilityService } from '../services/volunteer-availability.service';
import { SubstitutionService } from '../services/substitution.service';
import { ServiceHistoryService } from '../services/service-history.service';
import { ScaleAssignmentEngine } from '../services/scale-assignment-engine.service';

describe('ScalesAdvancedController (Simple Integration)', () => {
  let app: INestApplication;

  const mockVolunteerAvailabilityService = {
    createOrUpdateAvailability: jest.fn(),
    blockDate: jest.fn(),
    checkVolunteerAvailability: jest.fn(),
    getMonthlyBlockedDaysInfo: jest.fn(),
  };

  const mockSubstitutionService = {
    findSwapCandidates: jest.fn(),
    createSwapRequest: jest.fn(),
    respondToSwapRequest: jest.fn(),
    getPendingRequestsForUser: jest.fn(),
  };

  const mockServiceHistoryService = {
    createServiceHistory: jest.fn(),
    getVolunteerServiceStats: jest.fn(),
  };

  const mockScaleAssignmentEngine = {
    generateScaleAssignments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScalesAdvancedController],
      providers: [
        {
          provide: VolunteerAvailabilityService,
          useValue: mockVolunteerAvailabilityService,
        },
        {
          provide: SubstitutionService,
          useValue: mockSubstitutionService,
        },
        {
          provide: ServiceHistoryService,
          useValue: mockServiceHistoryService,
        },
        {
          provide: ScaleAssignmentEngine,
          useValue: mockScaleAssignmentEngine,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('Availability Endpoints', () => {
    it('should create volunteer availability', async () => {
      const mockResult = {
        _id: '507f1f77bcf86cd799439014',
        userId: '507f1f77bcf86cd799439012',
        ministryId: '507f1f77bcf86cd799439013',
        blockedDates: [],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
      };

      mockVolunteerAvailabilityService.createOrUpdateAvailability.mockResolvedValue(
        mockResult,
      );

      const dto = {
        userId: '507f1f77bcf86cd799439012',
        ministryId: '507f1f77bcf86cd799439013',
        blockedDates: [],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/scales/availability')
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Disponibilidade atualizada com sucesso',
      );
      expect(response.body.data).toBeDefined();
    });

    it('should block a date', async () => {
      const mockResult = {
        _id: '507f1f77bcf86cd799439014',
        blockedDates: [
          {
            date: '2024-01-15',
            reason: 'Viagem',
            isBlocked: true,
          },
        ],
      };

      mockVolunteerAvailabilityService.blockDate.mockResolvedValue(mockResult);

      const body = {
        userId: '507f1f77bcf86cd799439012',
        ministryId: '507f1f77bcf86cd799439013',
        date: '2024-01-15',
        reason: 'Viagem',
      };

      const response = await request(app.getHttpServer())
        .post('/scales/availability/block-date')
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data bloqueada com sucesso');
    });

    it('should check availability', async () => {
      const mockResult = {
        isAvailable: true,
        reason: 'Disponível para escalação',
      };

      mockVolunteerAvailabilityService.checkVolunteerAvailability.mockResolvedValue(
        mockResult,
      );

      const response = await request(app.getHttpServer())
        .get(
          '/scales/availability/check/507f1f77bcf86cd799439012/507f1f77bcf86cd799439013/2024-01-15',
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });

  describe('Substitution Endpoints', () => {
    it('should find swap candidates', async () => {
      const mockCandidates = [
        {
          userId: '507f1f77bcf86cd799439014',
          userName: 'João Silva',
          userEmail: 'joao@example.com',
          isAvailable: true,
        },
      ];

      mockSubstitutionService.findSwapCandidates.mockResolvedValue(
        mockCandidates,
      );

      const response = await request(app.getHttpServer())
        .get(
          '/scales/swap/candidates/507f1f77bcf86cd799439012/507f1f77bcf86cd799439013',
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCandidates);
    });

    it('should create swap request', async () => {
      const mockResult = {
        success: true,
        message: 'Solicitação de troca criada com sucesso',
        swapRequestId: '507f1f77bcf86cd799439015',
      };

      mockSubstitutionService.createSwapRequest.mockResolvedValue(mockResult);

      const dto = {
        scaleId: '507f1f77bcf86cd799439012',
        targetId: '507f1f77bcf86cd799439013',
        reason: 'Não posso comparecer',
      };

      const response = await request(app.getHttpServer())
        .post('/scales/swap/request')
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should get pending requests', async () => {
      const mockRequests = [
        {
          _id: '507f1f77bcf86cd799439012',
          requesterId: '507f1f77bcf86cd799439013',
          status: 'pending',
          reason: 'Não posso comparecer',
        },
      ];

      mockSubstitutionService.getPendingRequestsForUser.mockResolvedValue(
        mockRequests,
      );

      const response = await request(app.getHttpServer())
        .get('/scales/swap/requests/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRequests);
    });
  });

  describe('Service History Endpoints', () => {
    it('should create service history', async () => {
      const mockHistory = {
        _id: '507f1f77bcf86cd799439016',
        userId: '507f1f77bcf86cd799439012',
        scaleId: '507f1f77bcf86cd799439013',
        status: 'completed',
        serviceDate: '2024-01-15',
      };

      mockServiceHistoryService.createServiceHistory.mockResolvedValue(
        mockHistory,
      );

      const dto = {
        userId: '507f1f77bcf86cd799439012',
        scaleId: '507f1f77bcf86cd799439013',
        functionId: '507f1f77bcf86cd799439014',
        ministryId: '507f1f77bcf86cd799439015',
        serviceDate: '2024-01-15',
        status: 'completed',
      };

      const response = await request(app.getHttpServer())
        .post('/scales/service-history')
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Histórico de serviço criado');
    });

    it('should get volunteer service stats', async () => {
      const mockStats = {
        totalServices: 10,
        completedServices: 8,
        missedServices: 1,
        cancelledServices: 1,
        attendanceRate: 80,
      };

      mockServiceHistoryService.getVolunteerServiceStats.mockResolvedValue(
        mockStats,
      );

      const response = await request(app.getHttpServer())
        .get('/scales/service-history/stats/volunteer/507f1f77bcf86cd799439012')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('Scale Assignment Endpoints', () => {
    it('should generate scale assignments', async () => {
      const mockResult = {
        suggestions: [
          {
            functionId: '507f1f77bcf86cd799439013',
            functionName: 'Vocalista',
            requiredSlots: 2,
            suggestedVolunteers: [
              {
                userId: '507f1f77bcf86cd799439014',
                userName: 'João Silva',
                priority: 1,
              },
            ],
          },
        ],
        requiresApproval: true,
        totalVolunteersNeeded: 2,
        totalVolunteersAvailable: 3,
        coverage: 100,
      };

      mockScaleAssignmentEngine.generateScaleAssignments.mockResolvedValue(
        mockResult,
      );

      const response = await request(app.getHttpServer())
        .post('/scales/generate-assignments/507f1f77bcf86cd799439012')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
  });
});
