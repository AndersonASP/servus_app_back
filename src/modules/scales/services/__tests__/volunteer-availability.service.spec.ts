import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VolunteerAvailabilityService } from '../services/volunteer-availability.service';
import { AvailabilityValidator } from '../services/availability-validator.service';
import { VolunteerAvailability } from '../schemas/volunteer-availability.schema';
import { MinistrySettings } from '../schemas/ministry-settings.schema';
import { Scale } from '../schemas/scale.schema';

describe('VolunteerAvailabilityService', () => {
  let service: VolunteerAvailabilityService;
  let volunteerAvailabilityModel: Model<VolunteerAvailability>;
  let ministrySettingsModel: Model<MinistrySettings>;
  let availabilityValidator: AvailabilityValidator;

  const mockVolunteerAvailabilityModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMinistrySettingsModel = {
    findOne: jest.fn(),
  };

  const mockScaleModel = {
    findOne: jest.fn(),
  };

  const mockAvailabilityValidator = {
    checkAvailability: jest.fn(),
    canBlockDate: jest.fn(),
    getMonthlyBlockedDaysInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolunteerAvailabilityService,
        {
          provide: getModelToken(VolunteerAvailability.name),
          useValue: mockVolunteerAvailabilityModel,
        },
        {
          provide: getModelToken(MinistrySettings.name),
          useValue: mockMinistrySettingsModel,
        },
        {
          provide: getModelToken(Scale.name),
          useValue: mockScaleModel,
        },
        {
          provide: AvailabilityValidator,
          useValue: mockAvailabilityValidator,
        },
      ],
    }).compile();

    service = module.get<VolunteerAvailabilityService>(
      VolunteerAvailabilityService,
    );
    volunteerAvailabilityModel = module.get<Model<VolunteerAvailability>>(
      getModelToken(VolunteerAvailability.name),
    );
    ministrySettingsModel = module.get<Model<MinistrySettings>>(
      getModelToken(MinistrySettings.name),
    );
    availabilityValidator = module.get<AvailabilityValidator>(
      AvailabilityValidator,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateAvailability', () => {
    it('should create new availability when none exists', async () => {
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

      const mockMinistrySettings = {
        maxBlockedDaysPerMonth: 30,
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
        save: jest.fn().mockResolvedValue(this),
      };

      mockMinistrySettingsModel.findOne.mockResolvedValue(mockMinistrySettings);
      mockVolunteerAvailabilityModel.findOne.mockResolvedValue(null);
      mockVolunteerAvailabilityModel.create.mockReturnValue(mockAvailability);

      const result = await service.createOrUpdateAvailability(
        tenantId,
        dto,
        '507f1f77bcf86cd799439015',
      );

      expect(mockMinistrySettingsModel.findOne).toHaveBeenCalledWith({
        ministryId: new Types.ObjectId(dto.ministryId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      });

      expect(mockVolunteerAvailabilityModel.findOne).toHaveBeenCalledWith({
        userId: new Types.ObjectId(dto.userId),
        ministryId: new Types.ObjectId(dto.ministryId),
        tenantId: new Types.ObjectId(tenantId),
      });

      expect(mockVolunteerAvailabilityModel.create).toHaveBeenCalledWith({
        userId: new Types.ObjectId(dto.userId),
        ministryId: new Types.ObjectId(dto.ministryId),
        branchId: null,
        tenantId: new Types.ObjectId(tenantId),
        blockedDates: expect.any(Array),
        maxBlockedDaysPerMonth: dto.maxBlockedDaysPerMonth,
        isActive: dto.isActive,
        lastUpdated: expect.any(Date),
      });

      expect(result).toBe(mockAvailability);
    });

    it('should update existing availability', async () => {
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
      };

      const existingAvailability = {
        _id: '507f1f77bcf86cd799439014',
        userId: new Types.ObjectId(dto.userId),
        ministryId: new Types.ObjectId(dto.ministryId),
        tenantId: new Types.ObjectId(tenantId),
        blockedDates: [],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
        lastUpdated: new Date(),
        save: jest.fn().mockResolvedValue(this),
      };

      mockVolunteerAvailabilityModel.findOne.mockResolvedValue(
        existingAvailability,
      );

      // Mock the updateAvailability method
      jest
        .spyOn(service, 'updateAvailability')
        .mockResolvedValue(existingAvailability as any);

      const result = await service.createOrUpdateAvailability(
        tenantId,
        dto,
        '507f1f77bcf86cd799439015',
      );

      expect(service.updateAvailability).toHaveBeenCalledWith(
        tenantId,
        existingAvailability._id.toString(),
        dto,
        '507f1f77bcf86cd799439015',
      );

      expect(result).toBe(existingAvailability);
    });
  });

  describe('blockDate', () => {
    it('should block a date successfully', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const ministryId = '507f1f77bcf86cd799439013';
      const date = new Date('2024-01-15');
      const reason = 'Viagem';

      const mockAvailability = {
        _id: '507f1f77bcf86cd799439014',
        userId: new Types.ObjectId(userId),
        ministryId: new Types.ObjectId(ministryId),
        tenantId: new Types.ObjectId(tenantId),
        blockedDates: [],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
        lastUpdated: new Date(),
        save: jest.fn().mockResolvedValue(this),
      };

      mockAvailabilityValidator.canBlockDate.mockResolvedValue({
        canBlock: true,
        reason: 'Data pode ser bloqueada',
      });

      mockVolunteerAvailabilityModel.findOne.mockResolvedValue(
        mockAvailability,
      );

      const result = await service.blockDate(
        tenantId,
        userId,
        ministryId,
        date,
        reason,
      );

      expect(mockAvailabilityValidator.canBlockDate).toHaveBeenCalledWith(
        userId,
        ministryId,
        tenantId,
        date,
      );

      expect(mockAvailability.blockedDates).toHaveLength(1);
      expect(mockAvailability.blockedDates[0]).toEqual({
        date: date,
        reason: reason,
        isBlocked: true,
        createdAt: expect.any(Date),
      });

      expect(mockAvailability.save).toHaveBeenCalled();
      expect(result).toBe(mockAvailability);
    });

    it('should throw error when cannot block date', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const ministryId = '507f1f77bcf86cd799439013';
      const date = new Date('2024-01-15');
      const reason = 'Viagem';

      mockAvailabilityValidator.canBlockDate.mockResolvedValue({
        canBlock: false,
        reason: 'Limite mensal atingido',
      });

      await expect(
        service.blockDate(tenantId, userId, ministryId, date, reason),
      ).rejects.toThrow('Limite mensal atingido');

      expect(mockAvailabilityValidator.canBlockDate).toHaveBeenCalledWith(
        userId,
        ministryId,
        tenantId,
        date,
      );
    });
  });

  describe('checkVolunteerAvailability', () => {
    it('should check volunteer availability', async () => {
      const tenantId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const ministryId = '507f1f77bcf86cd799439013';
      const date = new Date('2024-01-15');

      const mockResult = {
        isAvailable: true,
        reason: 'Disponível para escalação',
      };

      mockAvailabilityValidator.checkAvailability.mockResolvedValue(mockResult);

      const result = await service.checkVolunteerAvailability(
        tenantId,
        userId,
        ministryId,
        date,
      );

      expect(mockAvailabilityValidator.checkAvailability).toHaveBeenCalledWith(
        userId,
        ministryId,
        date,
        tenantId,
      );

      expect(result).toBe(mockResult);
    });
  });
});
