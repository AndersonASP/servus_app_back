import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch } from '../schemas/branch.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { CreateBranchDto } from '../DTO/create-branches.dto';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  async create(
    createBranchDto: CreateBranchDto,
    createdBy: string,
    tenantId: string,
  ) {
    // Valida se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant (igreja matriz) não encontrado.');
    }

    // Verifica limite de filiais do plano
    const filialCount = await this.branchModel.countDocuments({
      tenant: tenantId,
    });
    if (tenant.maxBranches !== -1 && filialCount >= tenant.maxBranches) {
      throw new ConflictException(
        'Limite máximo de filiais atingido para este tenant.',
      );
    }

    // Verifica duplicidade pelo nome no mesmo tenant
    const exists = await this.branchModel.findOne({
      name: createBranchDto.name,
      tenant: tenantId,
    });

    if (exists) {
      throw new ConflictException(
        `Já existe uma filial com o nome "${exists.name}" neste tenant.`,
      );
    }

    // Gera branchId automático
    const baseId = (createBranchDto.branchId || createBranchDto.name)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20);

    const branchId = createBranchDto.branchId || `${baseId}-${Date.now()}`;

    const branch = new this.branchModel({
      ...createBranchDto,
      branchId,
      tenant: new Types.ObjectId(tenantId), // usa tenantId do token
      createdBy,
      isActive: true,
    });

    return branch.save();
  }

  async findAll(tenantId: string) {
    return this.branchModel.find({ tenant: tenantId, isActive: true });
  }

  async findById(branchId: string) {
    const branch = await this.branchModel.findOne({ branchId });
    if (!branch) throw new NotFoundException('Filial não encontrada.');
    return branch;
  }

  async deactivate(branchId: string) {
    const updated = await this.branchModel.findOneAndUpdate(
      { branchId },
      { isActive: false },
      { new: true },
    );

    if (!updated)
      throw new NotFoundException('Filial não encontrada para desativar.');
    return updated;
  }
}
