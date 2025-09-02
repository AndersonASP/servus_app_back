import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch } from '../schemas/branch.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { User } from '../../users/schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { CreateBranchDto } from '../DTO/create-branches.dto';
import { CreateBranchWithAdminDto } from '../DTO/create-branch-with-admin.dto';
import { Role, MembershipRole } from 'src/common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
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

    // Gera branchId único
    const baseId = createBranchDto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20);

    const branchId = createBranchDto.branchId || `${baseId}-${Date.now()}`;

    const branch = new this.branchModel({
      ...createBranchDto,
      branchId,
      tenant: new Types.ObjectId(tenantId),
      createdBy,
      isActive: true,
    });

    return branch.save();
  }

  // 🏪 TenantAdmin/ServusAdmin: Criar Branch + BranchAdmin (opcional)
  async createWithAdmin(
    data: CreateBranchWithAdminDto,
    createdBy: string,
    creatorRole: Role,
    creatorMemberships: any[],
    tenantId: string
  ) {
    // Verificar se usuário pode criar branch neste tenant
    const canCreateBranch = creatorRole === Role.ServusAdmin ||
      creatorMemberships.some(m => 
        m.tenant.toString() === tenantId && 
        m.role === MembershipRole.TenantAdmin
      );

    if (!canCreateBranch) {
      throw new ForbiddenException('Apenas ServusAdmin ou TenantAdmin podem criar branches');
    }

    // Verificar se tenant existe
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verificar limite de branches
    const branchCount = await this.branchModel.countDocuments({
      tenant: tenant._id, // Usar o _id do tenant encontrado
      isActive: true,
    });

    if (tenant.maxBranches !== -1 && branchCount >= tenant.maxBranches) {
      throw new ConflictException('Limite máximo de branches atingido');
    }

    // Verificar se branch já existe no tenant
    const existingBranch = await this.branchModel.findOne({
      name: data.branchData.name,
      tenant: tenant._id, // Usar o _id do tenant encontrado
    });

    if (existingBranch) {
      throw new ConflictException('Já existe uma branch com esse nome neste tenant');
    }

    // Verificar se admin já existe (se fornecido)
    if (data.adminData) {
      const existingAdmin = await this.userModel.findOne({
        email: data.adminData.email.toLowerCase().trim()
      });

      if (existingAdmin) {
        throw new ConflictException('Já existe um usuário com esse email');
      }
    }

    const session = await this.branchModel.startSession();
    session.startTransaction();

    try {
      // Criar branch
      const baseId = (data.branchData.branchId || data.branchData.name)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 20);

      const branchId = data.branchData.branchId || `${tenant.tenantId}-${baseId}-${Date.now()}`;

      const branch = new this.branchModel({
        ...data.branchData,
        branchId,
        tenant: tenant._id, // Usar o _id do tenant encontrado
        createdBy,
        isActive: true,
      });

      const savedBranch = await branch.save({ session });

      let adminResult: any = null;
      let membershipResult: any = null;

      // Criar admin da branch se fornecido
      if (data.adminData) {
        const hashedPassword = data.adminData.password
          ? await bcrypt.hash(data.adminData.password, 10)
          : null;

        const admin = new this.userModel({
          ...data.adminData,
          password: hashedPassword,
          role: Role.Volunteer, // Role global sempre volunteer
          tenantId: null,
          isActive: true,
        });

        const savedAdmin = await admin.save({ session });

        // Criar membership como BranchAdmin
        const membership = new this.membershipModel({
          user: savedAdmin._id,
          tenant: tenant._id, // Usar o _id do tenant encontrado
          branch: savedBranch._id,
          role: MembershipRole.BranchAdmin,
          isActive: true,
        });

        await membership.save({ session });

        adminResult = savedAdmin;
        membershipResult = membership;
      }

      await session.commitTransaction();
      session.endSession();

      return {
        branch: savedBranch,
        ...(adminResult && { admin: adminResult }),
        ...(membershipResult && { membership: membershipResult }),
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // 🔍 Buscar memberships ativos do usuário
  async getUserMemberships(userId: string) {
    return this.membershipModel
      .find({ user: userId, isActive: true })
      .populate('tenant', '_id tenantId name')
      .populate('branch', '_id branchId name')
      .populate('ministry', '_id name')
      .lean();
  }

  async findAll(tenantId: string) {
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }
    return this.branchModel.find({ tenant: tenant._id, isActive: true });
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
