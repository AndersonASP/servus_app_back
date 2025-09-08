import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch } from '../schemas/branch.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { User } from '../../users/schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { CreateBranchDto } from '../DTO/create-branches.dto';
import { CreateBranchWithAdminDto } from '../DTO/create-branch-with-admin.dto';
import { UpdateBranchDto } from '../DTO/update-branch.dto';
import { BranchFilterDto } from '../DTO/branch-filter.dto';
import { BranchResponseDto, BranchListResponseDto } from '../DTO/branch-response.dto';
import { AssignAdminDto } from '../DTO/assign-admin.dto';
import { Role, MembershipRole } from 'src/common/enums/role.enum';
import { EmailService } from '../../notifications/services/email.service';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createBranchDto: CreateBranchDto,
    createdBy: string,
    tenantId: string,
  ): Promise<BranchResponseDto> {
    // Buscar tenant pelo tenantId (UUID string)
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant (igreja matriz) não encontrado.');
    }

    // Verificar limite de filiais do plano
    await this.validateBranchLimit(tenant);

    // Verificar duplicidade pelo nome no mesmo tenant
    const exists = await this.branchModel.findOne({
      name: createBranchDto.name,
      tenant: tenant._id,
    });

    if (exists) {
      throw new ConflictException(
        `Já existe uma filial com o nome "${createBranchDto.name}" neste tenant.`,
      );
    }

    // Gerar branchId único usando UUID v7
    const branchId = createBranchDto.branchId || uuidv7();

    const branch = new this.branchModel({
      ...createBranchDto,
      branchId,
      tenant: tenant._id, // Usar ObjectId do tenant
      createdBy,
      isActive: true,
    });

    const savedBranch = await branch.save();
    return this.mapBranchToResponse(savedBranch);
  }

  // 🏪 TenantAdmin/ServusAdmin: Criar Branch + BranchAdmin (opcional)
  async createWithAdmin(
    data: CreateBranchWithAdminDto,
    createdBy: string,
    creatorRole: Role,
    creatorMemberships: any[],
    tenantId: string,
  ) {
    // Buscar tenant primeiro para obter o ObjectId
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verificar se usuário pode criar branch neste tenant
    const canCreateBranch =
      creatorRole === Role.ServusAdmin ||
      creatorMemberships.some(
        (m) =>
          m.tenant.toString() === (tenant._id as Types.ObjectId).toString() &&
          m.role === MembershipRole.TenantAdmin,
      );

    if (!canCreateBranch) {
      throw new ForbiddenException(
        'Apenas ServusAdmin ou TenantAdmin podem criar branches',
      );
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
      throw new ConflictException(
        'Já existe uma branch com esse nome neste tenant',
      );
    }

    // Verificar se admin já existe (se fornecido)
    if (data.adminData) {
      const existingAdmin = await this.userModel.findOne({
        email: data.adminData.email.toLowerCase().trim(),
      });

      if (existingAdmin) {
        throw new ConflictException('Já existe um usuário com esse email');
      }
    }

    const session = await this.branchModel.startSession();
    session.startTransaction();

    try {
      // Criar branch
      const branchId = data.branchData.branchId || uuidv7();

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
      let provisionalPassword: string | null = null;

      // Criar admin da branch se fornecido
      if (data.adminData) {
        // Gerar senha provisória se não fornecida
        provisionalPassword = data.adminData.password || this.generateProvisionalPassword();
        const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

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

      // Enviar email com credenciais se admin foi criado
      if (adminResult && provisionalPassword) {
        try {
          await this.emailService.sendUserCredentials(
            adminResult.email,
            adminResult.name,
            tenant.name,
            provisionalPassword,
            'Branch Admin',
            savedBranch.name,
          );
        } catch (emailError) {
          console.error('Erro ao enviar email de credenciais:', emailError);
          // Não falhar a criação por erro de email
        }
      }

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



  async findAll(tenantId: string, filters?: BranchFilterDto): Promise<BranchListResponseDto> {
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Construir query de filtros
    const query: any = { tenant: tenant._id };
    
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters?.cidade) {
      query['endereco.cidade'] = { $regex: filters.cidade, $options: 'i' };
    }

    if (filters?.estado) {
      query['endereco.estado'] = { $regex: filters.estado, $options: 'i' };
    }

    // Paginação
    const page = parseInt(filters?.page || '1') || 1;
    const limit = parseInt(filters?.limit || '10') || 10;
    const skip = (page - 1) * limit;

    // Ordenação
    const sortBy = filters?.sortBy || 'name';
    const sortOrder = filters?.sortOrder === 'desc' ? -1 : 1;
    const sort: any = { [sortBy]: sortOrder };

    // Buscar branches
    const branches = await this.branchModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await this.branchModel.countDocuments(query);

    return {
      branches: branches.map(branch => this.mapBranchToResponse(branch)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(branchId: string, tenantId?: string): Promise<BranchResponseDto> {
    const query: any = { branchId };
    
    if (tenantId) {
      const tenant = await this.tenantModel.findOne({ tenantId });
      if (!tenant) {
        throw new NotFoundException('Tenant não encontrado');
      }
      query.tenant = tenant._id;
    }

    const branch = await this.branchModel.findOne(query);
    if (!branch) {
      throw new NotFoundException('Filial não encontrada.');
    }
    
    return this.mapBranchToResponse(branch);
  }

  async update(branchId: string, updateBranchDto: UpdateBranchDto, updatedBy: string): Promise<BranchResponseDto> {
    const branch = await this.branchModel.findOne({ branchId });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada.');
    }

    // Verificar se o nome não conflita com outras filiais do mesmo tenant
    if (updateBranchDto.name && updateBranchDto.name !== branch.name) {
      const exists = await this.branchModel.findOne({
        name: updateBranchDto.name,
        tenant: branch.tenant,
        _id: { $ne: branch._id },
      });

      if (exists) {
        throw new ConflictException(
          `Já existe uma filial com o nome "${updateBranchDto.name}" neste tenant.`,
        );
      }
    }

    // Atualizar branch
    Object.assign(branch, updateBranchDto);
    const updatedBranch = await branch.save();
    
    return this.mapBranchToResponse(updatedBranch);
  }

  async assignAdmin(branchId: string, assignAdminDto: AssignAdminDto, assignedBy: string): Promise<any> {
    const branch = await this.branchModel.findOne({ branchId });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada.');
    }

    const tenant = await this.tenantModel.findById(branch.tenant);
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado.');
    }

    const session = await this.branchModel.startSession();
    session.startTransaction();

    try {
      let user: any;
      let provisionalPassword: string | null = null;

      // Verificar se é para vincular usuário existente
      if (assignAdminDto.userId) {
        user = await this.userModel.findById(assignAdminDto.userId);
        if (!user) {
          throw new NotFoundException('Usuário não encontrado.');
        }
      } else if (assignAdminDto.userEmail) {
        user = await this.userModel.findOne({ email: assignAdminDto.userEmail.toLowerCase().trim() });
        if (!user) {
          throw new NotFoundException('Usuário não encontrado com este email.');
        }
      } else if (assignAdminDto.email) {
        // Criar novo usuário
        const existingUser = await this.userModel.findOne({ 
          email: assignAdminDto.email.toLowerCase().trim() 
        });
        
        if (existingUser) {
          throw new ConflictException('Já existe um usuário com este email.');
        }

        provisionalPassword = assignAdminDto.password || this.generateProvisionalPassword();
        const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

        user = new this.userModel({
          name: assignAdminDto.name,
          email: assignAdminDto.email.toLowerCase().trim(),
          password: hashedPassword,
          role: Role.Volunteer,
          tenantId: null,
          isActive: true,
        });

        await user.save({ session });
      } else {
        throw new BadRequestException('É necessário fornecer userId, userEmail ou email para vincular o administrador.');
      }

      // Verificar se já existe membership para este usuário nesta filial
      const existingMembership = await this.membershipModel.findOne({
        user: user._id,
        branch: branch._id,
      });

      if (existingMembership) {
        throw new ConflictException('Este usuário já é administrador desta filial.');
      }

      // Criar membership como BranchAdmin
      const membership = new this.membershipModel({
        user: user._id,
        tenant: branch.tenant,
        branch: branch._id,
        role: MembershipRole.BranchAdmin,
        isActive: true,
        createdBy: assignedBy,
      });

      await membership.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Enviar email com credenciais se foi criado novo usuário
      if (provisionalPassword) {
        try {
          await this.emailService.sendUserCredentials(
            user.email,
            user.name,
            tenant.name,
            provisionalPassword,
            'Branch Admin',
            branch.name,
          );
        } catch (emailError) {
          console.error('Erro ao enviar email de credenciais:', emailError);
          // Não falhar a operação por erro de email
        }
      }

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        membership: {
          id: membership._id,
          role: membership.role,
          isActive: membership.isActive,
        },
        branch: {
          id: branch._id,
          name: branch.name,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async deactivate(branchId: string, deactivatedBy: string): Promise<BranchResponseDto> {
    const updated = await this.branchModel.findOneAndUpdate(
      { branchId },
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Filial não encontrada para desativar.');
    }
    
    return this.mapBranchToResponse(updated);
  }

  async remove(branchId: string, removedBy: string): Promise<void> {
    const branch = await this.branchModel.findOne({ branchId });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada para remover.');
    }

    // Verificar se há memberships ativos nesta branch
    const activeMemberships = await this.membershipModel.countDocuments({
      branch: branch._id,
      isActive: true,
    });

    if (activeMemberships > 0) {
      throw new ConflictException(
        'Não é possível remover uma filial que possui membros ativos. Desative a filial primeiro.',
      );
    }

    // Remover branch permanentemente
    await this.branchModel.findByIdAndDelete(branch._id);
  }

  /**
   * Valida se o tenant pode criar mais branches baseado no plano
   */
  private async validateBranchLimit(tenant: any): Promise<void> {
    if (tenant.maxBranches === -1) {
      return; // Ilimitado
    }

    const branchCount = await this.branchModel.countDocuments({
      tenant: tenant._id,
      isActive: true,
    });

    if (branchCount >= tenant.maxBranches) {
      throw new ConflictException(
        `Limite máximo de ${tenant.maxBranches} filiais atingido para o plano ${tenant.plan}.`,
      );
    }
  }

  /**
   * Gera uma senha provisória segura
   */
  private generateProvisionalPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Mapeia um documento Branch para BranchResponseDto
   */
  private mapBranchToResponse(branch: any): BranchResponseDto {
    return {
      id: branch._id.toString(),
      branchId: branch.branchId,
      name: branch.name,
      description: branch.description,
      endereco: branch.endereco,
      telefone: branch.telefone,
      email: branch.email,
      whatsappOficial: branch.whatsappOficial,
      diasCulto: branch.diasCulto,
      eventosPadrao: branch.eventosPadrao,
      modulosAtivos: branch.modulosAtivos,
      logoUrl: branch.logoUrl,
      corTema: branch.corTema,
      idioma: branch.idioma,
      timezone: branch.timezone,
      isActive: branch.isActive,
      createdBy: branch.createdBy,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }
}
