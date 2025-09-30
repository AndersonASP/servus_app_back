import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TemplatesService } from './templates.service';
import { ScaleTemplate } from './schemas/scale-template.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';

describe('TemplatesService permissions (leader)', () => {
  let service: TemplatesService;

  const templateModel = {
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  } as any;

  const membershipModel = {
    find: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: getModelToken(ScaleTemplate.name), useValue: templateModel },
        { provide: getModelToken(Membership.name), useValue: membershipModel },
      ],
    }).compile();

    service = moduleRef.get(TemplatesService);
  });

  it('leader cannot create template for another ministry', async () => {
    membershipModel.lean.mockResolvedValueOnce([{ ministry: 'AAA' }]);
    templateModel.exists.mockResolvedValueOnce(null);
    await expect(
      service.create('TEN', 'BR', 'USER', {
        tenantId: 'TEN',
        branchId: 'BR',
        name: 'TMP',
        eventType: 'culto',
        ministryRequirements: [
          { ministryId: 'BBB', functions: [{ functionId: 'F1', requiredSlots: 1 }] },
        ],
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});


