import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, MembershipAssignmentDto } from '../dto/create-member.dto';
import { MembershipRole } from 'src/common/enums/role.enum';

describe('MembersService', () => {
  let service: MembersService;
  let mockUserModel: any;
  let mockMembershipModel: any;
  let mockBranchModel: any;
  let mockMinistryModel: any;
  let mockTenantModel: any;

  beforeEach(async () => {
    const mockUserModelValue = {
      findOne: jest.fn(),
      save: jest.fn(),
      db: {
        startSession: jest.fn(() => ({
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          abortTransaction: jest.fn(),
          endSession: jest.fn(),
        })),
      },
    };

    const mockMembershipModelValue = {
      findOneAndUpdate: jest.fn(),
    };

    const mockBranchModelValue = {
      findOne: jest.fn(),
    };

    const mockMinistryModelValue = {
      findOne: jest.fn(),
    };

    const mockTenantModelValue = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModelValue,
        },
        {
          provide: getModelToken('Membership'),
          useValue: mockMembershipModelValue,
        },
        {
          provide: getModelToken('Branch'),
          useValue: mockBranchModelValue,
        },
        {
          provide: getModelToken('Ministry'),
          useValue: mockMinistryModelValue,
        },
        {
          provide: getModelToken('Tenant'),
          useValue: mockTenantModelValue,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    mockUserModel = module.get(getModelToken('User'));
    mockMembershipModel = module.get(getModelToken('Membership'));
    mockBranchModel = module.get(getModelToken('Branch'));
    mockMinistryModel = module.get(getModelToken('Ministry'));
    mockTenantModel = module.get(getModelToken('Tenant'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMember', () => {
    const validCreateMemberDto: CreateMemberDto = {
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      memberships: [
        {
          role: MembershipRole.Volunteer,
          ministryId: 'ministry123',
          isActive: true,
        },
      ],
    };

    const tenantId = 'tenant123';
    const userRole = 'tenant_admin';
    const createdBy = 'user123';

    beforeEach(() => {
      // Mock successful validations
      mockUserModel.findOne.mockResolvedValue(null); // No existing user
      mockTenantModel.findOne.mockResolvedValue({ _id: 'tenant123' });
      mockMinistryModel.findOne.mockResolvedValue({ _id: 'ministry123' });
      mockUserModel.save.mockResolvedValue({ _id: 'user123' });
      mockMembershipModel.findOneAndUpdate.mockResolvedValue({ _id: 'membership123' });
    });

    it('should create a member successfully', async () => {
      const result = await service.createMember(validCreateMemberDto, tenantId, userRole, createdBy);
      
      expect(result).toBeDefined();
      expect(mockUserModel.save).toHaveBeenCalled();
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is empty', async () => {
      const invalidDto = { ...validCreateMemberDto, name: '' };
      
      await expect(
        service.createMember(invalidDto, tenantId, userRole, createdBy)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no email or phone provided', async () => {
      const invalidDto = { ...validCreateMemberDto, email: undefined, phone: undefined };
      
      await expect(
        service.createMember(invalidDto, tenantId, userRole, createdBy)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no memberships provided', async () => {
      const invalidDto = { ...validCreateMemberDto, memberships: [] };
      
      await expect(
        service.createMember(invalidDto, tenantId, userRole, createdBy)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: 'existingUser' });
      
      await expect(
        service.createMember(validCreateMemberDto, tenantId, userRole, createdBy)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when leader tries to create tenant_admin', async () => {
      const invalidDto = {
        ...validCreateMemberDto,
        memberships: [{ role: MembershipRole.TenantAdmin, isActive: true }],
      };
      
      await expect(
        service.createMember(invalidDto, tenantId, 'leader', createdBy)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create volunteer successfully without ministryId', async () => {
      const validDtoWithoutMinistry = {
        ...validCreateMemberDto,
        memberships: [{ role: MembershipRole.Volunteer, isActive: true }],
      };
      
      const result = await service.createMember(validDtoWithoutMinistry, tenantId, userRole, createdBy);
      
      expect(result).toBeDefined();
      expect(mockUserModel.save).toHaveBeenCalled();
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
