import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { Event } from './schemas/event.schema';
import { EventInstance } from './schemas/event-instance.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';

describe('EventsService permissions (leader)', () => {
  let service: EventsService;

  const eventModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };

  const instanceModel = {
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
  };

  const membershipModel = {
    find: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getModelToken(Event.name), useValue: eventModel },
        { provide: getModelToken(EventInstance.name), useValue: instanceModel },
        { provide: getModelToken(Membership.name), useValue: membershipModel },
      ],
    }).compile();

    service = moduleRef.get(EventsService);
  });

  it('leader cannot create event for another ministry', async () => {
    membershipModel.lean.mockResolvedValueOnce([{ ministry: 'AAA' }]);

    await expect(
      service.create('TEN', 'BR', 'USER', {
        tenantId: 'TEN',
        branchId: 'BR',
        ministryId: 'BBB',
        name: 'X',
        eventDate: new Date().toISOString(),
        eventTime: '09:00',
        recurrenceType: 'none',
        eventType: 'ministry_specific',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('leader cannot update ordinary event', async () => {
    membershipModel.lean.mockResolvedValueOnce([{ ministry: 'AAA' }]);
    eventModel.findOne.mockResolvedValueOnce({
      _id: 'E1',
      tenantId: 'TEN',
      branchId: 'BR',
      ministryId: 'AAA',
      isOrdinary: true,
    });
    await expect(
      service.update('TEN', 'BR', 'E1', 'USER', { name: 'New' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('leader cannot view event from other ministry if not ordinary nor createdBy', async () => {
    membershipModel.lean.mockResolvedValueOnce([{ ministry: 'AAA' }]);
    eventModel.findOne.mockResolvedValueOnce({
      _id: 'E2',
      tenantId: 'TEN',
      branchId: 'BR',
      ministryId: 'BBB',
      isOrdinary: false,
      createdBy: 'OTHER',
      toObject: function () {
        return this;
      },
    });
    await expect(
      service.findOne('TEN', 'BR', 'E2', 'USER'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
