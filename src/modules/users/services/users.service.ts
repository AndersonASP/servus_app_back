import {
  ConflictException,
  Injectable,
  NotFoundException,
  HttpException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../schema/user.schema';
import { MembershipRole, Role } from 'src/common/enums/role.enum';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';
import { SelfRegistrationDto } from '../dto/self-registration.dto';
import { CompleteProfileDto } from '../dto/complete-profile.dto';
import { ExportService } from './export.service';
import { NotificationService } from 'src/modules/notifications/services/notification.service';
import { EmailService } from 'src/modules/notifications/services/email.service';
import { Ministry } from 'src/modules/ministries/schemas/ministry.schema';

// Interfaces para resolver problemas de tipagem com populate
interface PopulatedTenant {
  _id: Types.ObjectId;
  tenantId: string;
  name: string;
}

interface PopulatedBranch {
  _id: Types.ObjectId;
  branchId: string;
  name: string;
  tenant: Types.ObjectId;
}

interface PopulatedMembership extends Omit<Membership, 'tenant' | 'branch'> {
  tenant: PopulatedTenant;
  branch?: PopulatedBranch;
}

// Interface simplificada para queries lean
interface LeanTenant {
  _id: Types.ObjectId;
  tenantId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  plan?: string;
  maxBranches?: number;
}

interface LeanBranch {
  _id: Types.ObjectId;
  branchId: string;
  name: string;
  tenant: Types.ObjectId;
}

@Injectable()
export class UsersService {
  // Propriedade pública para acesso do controller
  public exportService: ExportService;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private readonly memModel: Model<Membership>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(Ministry.name) private readonly ministryModel: Model<Ministry>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    exportService: ExportService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {
    this.exportService = exportService;
  }

  async create(
    createUserDto: CreateUserDto,
    createdBy: string,
    tenantId?: string,
    branchId?: string,
  ) {
    try {
      // ✅ Se não for superadmin, obrigar tenantId
      if (createUserDto.role !== Role.ServusAdmin && !tenantId) {
        throw new BadRequestException(
          'Tenant ID é obrigatório para este usuário.',
        );
      }

      // ✅ Evitar duplicação de e-mail por tenant ou globalmente
      const normalizedEmail = createUserDto.email.toLowerCase().trim();
      const query: any = { email: normalizedEmail };
      if (createUserDto.role !== Role.ServusAdmin) {
        query.tenantId = tenantId;
      }

      const existingUser = await this.userModel.findOne(query).exec();
      if (existingUser) {
        throw new ConflictException(
          'Já existe um usuário com este e-mail neste contexto.',
        );
      }

      // ✅ Hash de senha, se existir
      const hashedPassword = createUserDto.password
        ? await bcrypt.hash(createUserDto.password, 10)
        : null;

      const session = await this.userModel.startSession();
      session.startTransaction();

      try {
        // ✅ Criação do usuário
        const createdUser = new this.userModel({
          ...createUserDto,
          picture: createUserDto.picture || '', // deve trazer a url da imagem na AWS
          password: hashedPassword,
          tenantId: createUserDto.role === Role.ServusAdmin ? null : tenantId,
          branchId: branchId || createUserDto.branchId || null,
        });

        const savedUser = await createdUser.save({ session });

        // ✅ CRIAR MEMBERSHIP OBRIGATÓRIO para usuários normais (não ServusAdmin)
        if (createUserDto.role !== Role.ServusAdmin) {
          // Para usuários normais, criar membership no tenant especificado
          const membership = new this.memModel({
            user: savedUser._id,
            tenant: tenantId, // tenantId é UUID string
            branch: branchId || null,
            ministry: null,
            role: MembershipRole.Volunteer, // Role padrão
            isActive: true,
          });
          await membership.save({ session });
        }
        // ✅ ServusAdmin NÃO precisa de membership - tem acesso global

        await session.commitTransaction();
        return savedUser;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error.message);
      if (
        error instanceof ConflictException ||
        error.name === 'MongoServerError'
      ) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException('Erro interno ao criar usuário');
    }
  }

  // 👤 Criar usuário com membership (validação de contexto rigorosa)
  async createWithMembership(
    userData: CreateUserDto,
    membershipData: {
      tenantId: string;
      branchId?: string;
      ministryId?: string;
      role: MembershipRole;
      userId: string;
    },
    createdBy: string,
    creatorRole: Role,
    creatorMemberships: any[],
  ) {
    // Verificar permissões baseado na hierarquia
    const canCreate = this.validateUserCreationPermission(
      creatorRole,
      creatorMemberships,
      membershipData,
    );

    if (!canCreate) {
      throw new ForbiddenException(
        'Você não tem permissão para criar usuários neste contexto',
      );
    }

    // Validar contexto (branch/ministry deve existir e ser coerente)
    await this.validateMembershipContext(membershipData, creatorMemberships);

    // Verificar se usuário já existe
    const existingUser = await this.userModel.findOne({
      email: userData.email.toLowerCase().trim(),
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário com esse email');
    }

    // Verificar se senha existe
    if (!userData.password) {
      throw new BadRequestException('Senha é obrigatória');
    }

    const session = await this.userModel.startSession();
    session.startTransaction();

    try {
      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Criar usuário
      const user = new this.userModel({
        name: userData.name,
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        role: Role.Volunteer, // Sempre volunteer para membership-based
        tenantId: null, // Será definido via membership
        isActive: true,
      });

      const savedUser = await user.save({ session });

      // Criar membership
      membershipData.userId = savedUser._id.toString();
      const membership = new this.memModel({
        user: savedUser._id,
        tenant: membershipData.tenantId, // tenantId é UUID string
        branch: membershipData.branchId ? new Types.ObjectId(membershipData.branchId) : null,
        ministry: membershipData.ministryId ? new Types.ObjectId(membershipData.ministryId) : null,
        role: membershipData.role,
        isActive: true,
      });

      const savedMembership = await membership.save({ session });

      // 🔔 Enviar notificação de novo usuário criado
      try {
        await this.notificationService.notifyNewUser(
          savedUser,
          savedMembership,
          createdBy,
        );
      } catch (notificationError) {
        console.error(
          '❌ Erro ao enviar notificação:',
          notificationError.message,
        );
        // Não falhar a criação do usuário por erro de notificação
      }

      // 📧 Enviar email com credenciais se o usuário tem email
      if (userData.email) {
        try {
          // Buscar informações do tenant
          const tenant = await this.tenantModel.findById(membershipData.tenantId).select('name');
          const tenantName = tenant?.name || 'Igreja';

          // Buscar informações da branch se existir
          let branchName: string | undefined;
          if (membershipData.branchId) {
            const branch = await this.branchModel.findById(membershipData.branchId).select('name');
            branchName = branch?.name;
          }

          // Buscar informações do ministry se existir
          let ministryName: string | undefined;
          if (membershipData.ministryId) {
            const ministry = await this.ministryModel.findById(membershipData.ministryId).select('name');
            ministryName = ministry?.name;
          }

          await this.emailService.sendUserCredentials(
            userData.email,
            userData.name,
            tenantName,
            userData.password || 'temp123', // Senha fornecida ou temporária
            membershipData.role,
            branchName,
            ministryName,
          );
          console.log(`✅ Email de credenciais enviado para ${userData.email}`);
        } catch (emailError) {
          console.error('❌ Erro ao enviar email de credenciais:', emailError);
          // Não falhar a criação do usuário por erro de email
        }
      }

      // 🧹 Limpar cache relacionado
      try {
        await this.clearTenantCache(membershipData.tenantId);
        if (membershipData.branchId) {
          await this.clearBranchCache(
            membershipData.tenantId,
            membershipData.branchId,
          );
        }
      } catch (cacheError) {
        console.error('❌ Erro ao limpar cache:', cacheError.message);
      }

      await session.commitTransaction();
      session.endSession();

      return {
        user: savedUser,
        membership: savedMembership,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ Erro ao criar usuário com membership:', error.message);
      throw error;
    }
  }

  // 🔐 Validar permissões de criação de usuário
  private validateUserCreationPermission(
    creatorRole: Role,
    creatorMemberships: any[],
    membershipData: any,
  ): { allowed: boolean; reason?: string } {
    // ServusAdmin pode criar qualquer um
    if (creatorRole === Role.ServusAdmin) {
      return { allowed: true };
    }

    // TenantAdmin pode criar: BranchAdmin, Leader, Volunteer
    const isTenantAdmin = creatorMemberships.some(
      (m) =>
        m.tenant.toString() === membershipData.tenantId &&
        m.role === MembershipRole.TenantAdmin,
    );

    if (isTenantAdmin) {
      if (
        [
          MembershipRole.BranchAdmin,
          MembershipRole.Leader,
          MembershipRole.Volunteer,
        ].includes(membershipData.role)
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'TenantAdmin não pode criar outros TenantAdmins',
      };
    }

    // BranchAdmin pode criar: Leader, Volunteer (apenas na sua branch)
    const isBranchAdmin = creatorMemberships.some(
      (m) =>
        m.tenant.toString() === membershipData.tenantId &&
        m.branch?.toString() === membershipData.branchId &&
        m.role === MembershipRole.BranchAdmin,
    );

    if (isBranchAdmin) {
      if (
        [MembershipRole.Leader, MembershipRole.Volunteer].includes(
          membershipData.role,
        )
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'BranchAdmin não pode criar BranchAdmins ou TenantAdmins',
      };
    }

    // Leader pode criar: Volunteer (apenas no seu ministry/branch)
    const isLeader = creatorMemberships.some(
      (m) =>
        m.tenant.toString() === membershipData.tenantId &&
        (!membershipData.branchId ||
          m.branch?.toString() === membershipData.branchId) &&
        m.role === MembershipRole.Leader,
    );

    if (isLeader) {
      if (membershipData.role === MembershipRole.Volunteer) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Leader só pode criar Volunteers' };
    }

    return {
      allowed: false,
      reason: 'Sem permissão para criar usuários neste contexto',
    };
  }

  // 🔍 Validar contexto do membership (branch/ministry coerente)
  private async validateMembershipContext(
    membershipData: any,
    creatorMemberships: any[],
  ): Promise<{ valid: boolean; reason?: string }> {
    // Verificar se tenant existe
    const tenant = (await this.tenantModel
      .findById(membershipData.tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      return { valid: false, reason: 'Tenant não encontrado' };
    }

    // Se branchId foi fornecido, validar se pertence ao tenant
    if (membershipData.branchId) {
      const branch = (await this.branchModel
        .findOne({ branchId: membershipData.branchId })
        .lean()) as unknown as LeanBranch;
      if (!branch || branch.tenant.toString() !== tenant._id.toString()) {
        return {
          valid: false,
          reason: 'Branch não encontrada ou não pertence ao tenant',
        };
      }

      // Verificar se o criador tem acesso a essa branch
      const hasBranchAccess = creatorMemberships.some(
        (m) =>
          (m.tenant as PopulatedTenant)._id.toString() ===
            tenant._id.toString() &&
          (m.role === MembershipRole.TenantAdmin ||
            (m.branch &&
              (m.branch as PopulatedBranch)._id.toString() ===
                branch._id.toString())),
      );

      if (!hasBranchAccess) {
        return { valid: false, reason: 'Sem acesso à branch especificada' };
      }
    }

    // Se ministryId foi fornecido, validar se pertence ao tenant/branch
    if (membershipData.ministryId) {
      // TODO: Implementar validação de ministry
      // Por enquanto, vamos assumir que é válido se o ministry existe
    }

    return { valid: true };
  }

  // 🔍 Buscar memberships ativos do usuário
  async getUserMemberships(userId: string) {
    console.log('🔍 [SERVICE] Buscando memberships do usuário...');
    console.log('👤 [SERVICE] User ID:', userId);
    console.log('👤 [SERVICE] User ID tipo:', typeof userId);
    
    // Converte userId para ObjectId se necessário
    let userObjectId;
    try {
      userObjectId = new Types.ObjectId(userId);
      console.log('👤 [SERVICE] User ID convertido para ObjectId:', userObjectId);
    } catch (error) {
      console.log('❌ [SERVICE] Erro ao converter userId para ObjectId:', error);
      return [];
    }
    
    const memberships = await this.memModel
      .find({ user: userObjectId, isActive: true })
      .populate({
        path: 'tenant',
        select: '_id tenantId name'
      })
      .populate({
        path: 'branch',
        select: '_id branchId name'
      })
      .populate({
        path: 'ministry',
        select: '_id name'
      })
      .lean()
      .exec();
    
    // Serializa corretamente os ObjectIds usando JSON.stringify/parse
    const processedMemberships = JSON.parse(JSON.stringify(memberships));
    
    console.log('📋 [SERVICE] Memberships encontrados:', processedMemberships.length);
    processedMemberships.forEach((m, index) => {
      console.log(`   ${index + 1}. Membership:`);
      console.log(`      - ID: ${m._id}`);
      console.log(`      - Role: ${m.role}`);
      console.log(`      - Tenant: ${m.tenant ? 'SIM' : 'NÃO'}`);
      if (m.tenant) {
        console.log(`        * Tenant ID: ${m.tenant}`);
      }
      console.log(`      - Branch: ${m.branch ? 'SIM' : 'NÃO'}`);
      if (m.branch) {
        console.log(`        * Branch ID: ${m.branch}`);
      }
      console.log(`      - Ministry: ${m.ministry ? 'SIM' : 'NÃO'}`);
      if (m.ministry) {
        console.log(`        * Ministry ID: ${m.ministry}`);
      }
      console.log(`      - Ativo: ${m.isActive}`);
    });
    
    return processedMemberships;
  }

  // 🔍 Buscar memberships ativos do usuário (sem populate para debug)
  async getUserMembershipsRaw(userId: string) {
    console.log('🔍 [SERVICE] Buscando memberships brutos do usuário...');
    console.log('👤 [SERVICE] User ID:', userId);
    
    // Converte userId para ObjectId se necessário
    let userObjectId;
    try {
      userObjectId = new Types.ObjectId(userId);
      console.log('👤 [SERVICE] User ID convertido para ObjectId:', userObjectId);
    } catch (error) {
      console.log('❌ [SERVICE] Erro ao converter userId para ObjectId:', error);
      return [];
    }
    
    const memberships = await this.memModel
      .find({ user: userObjectId, isActive: true })
      .lean()
      .exec();
    
    console.log('📋 [SERVICE] Memberships brutos encontrados:', memberships.length);
    memberships.forEach((m, index) => {
      console.log(`   ${index + 1}. Membership:`);
      console.log(`      - ID: ${m._id}`);
      console.log(`      - Role: ${m.role}`);
      console.log(`      - Tenant: ${m.tenant} (tipo: ${typeof m.tenant})`);
      console.log(`      - Branch: ${m.branch} (tipo: ${typeof m.branch})`);
      console.log(`      - Ministry: ${m.ministry} (tipo: ${typeof m.ministry})`);
      console.log(`      - Ativo: ${m.isActive}`);
    });
    
    return memberships;
  }

  // 🔍 Buscar tenant por ID
  async getTenantById(tenantId: string) {
    console.log('🔍 [SERVICE] Buscando tenant por ID:', tenantId);
    
    try {
      const tenant = await this.tenantModel.findById(tenantId).lean().exec();
      if (tenant) {
        console.log('✅ [SERVICE] Tenant encontrado:', tenant.name);
        return tenant;
      } else {
        console.log('❌ [SERVICE] Tenant não encontrado');
        return null;
      }
    } catch (error) {
      console.log('❌ [SERVICE] Erro ao buscar tenant:', error);
      return null;
    }
  }

  // ========================================
  // 🔍 FLUXO 3: LISTAGEM COM FILTROS POR ROLE
  // ========================================

  // 🔎 Listar usuários por role no tenant (TenantAdmin)
  async listUsersByRole(
    tenantId: string,
    role: MembershipRole,
    options: {
      page: number;
      limit: number;
      search?: string;
      branchId?: string;
    },
    currentUser: any,
  ) {
    // Verificar se tenant existe
    const tenant = (await this.tenantModel
      .findById(tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verificar se usuário tem permissão para ver este tenant
    const canViewTenant =
      currentUser.role === Role.ServusAdmin ||
      (await this.hasMembershipInTenant(
        currentUser._id,
        tenant._id.toString(),
        [MembershipRole.TenantAdmin],
      ));

    if (!canViewTenant) {
      throw new ForbiddenException(
        'Sem permissão para visualizar usuários deste tenant',
      );
    }

    // Construir filtros baseados na role e opções
    const filters: any = {
      'memberships.tenant': tenantId, // tenantId é UUID string
      'memberships.role': role,
      'memberships.isActive': true,
    };

    // Filtrar por branch se especificado
    if (options.branchId) {
      const branch = (await this.branchModel
        .findOne({ branchId: options.branchId })
        .lean()) as unknown as LeanBranch;
      if (!branch || branch.tenant.toString() !== tenant._id.toString()) {
        throw new BadRequestException(
          'Branch não encontrada ou não pertence ao tenant',
        );
      }
      filters['memberships.branch'] = branch._id;
    }

    // Buscar usuários via membership
    const query = this.memModel.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      { $unwind: { path: '$ministryData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$userData._id',
          name: '$userData.name',
          email: '$userData.email',
          phone: '$userData.phone',
          picture: '$userData.picture',
          profileCompleted: '$userData.profileCompleted',
          membership: {
            _id: '$_id',
            role: '$role',
            branch: '$branchData',
            ministry: '$ministryData',
            isActive: '$isActive',
          },
        },
      },
    ]);

    // Aplicar busca por texto se especificado
    if (options.search) {
      query.match({
        $or: [
          { name: { $regex: options.search, $options: 'i' } },
          { email: { $regex: options.search, $options: 'i' } },
        ],
      });
    }

    // Contar total para paginação
    const totalQuery = this.memModel.aggregate([
      { $match: filters },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    const users = await query.skip(skip).limit(options.limit);

    return {
      users,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  // 🔎 Listar usuários por role na branch (BranchAdmin)
  async listUsersByRoleInBranch(
    tenantId: string,
    branchId: string,
    role: MembershipRole,
    options: {
      page: number;
      limit: number;
      search?: string;
      ministryId?: string;
    },
    currentUser: any,
  ) {
    // Verificar se tenant e branch existem
    const tenant = (await this.tenantModel
      .findById(tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const branch = (await this.branchModel
      .findOne({ branchId })
      .lean()) as unknown as LeanBranch;
    if (!branch) {
      throw new NotFoundException('Branch não encontrada');
    }

    // Verificar se branch pertence ao tenant
    if (branch.tenant.toString() !== tenant._id.toString()) {
      throw new BadRequestException(
        'Branch não pertence ao tenant especificado',
      );
    }

    // Verificar se usuário tem permissão para ver esta branch
    const canViewBranch =
      currentUser.role === Role.ServusAdmin ||
      (await this.hasMembershipInBranch(
        currentUser._id,
        tenant._id.toString(),
        branch._id.toString(),
        [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin],
      ));

    if (!canViewBranch) {
      throw new ForbiddenException(
        'Sem permissão para visualizar usuários desta branch',
      );
    }

    // Construir filtros
    const filters: any = {
      'memberships.tenant': tenantId, // tenantId é UUID string
      'memberships.branch': branch._id, // Usar o _id da branch encontrada
      'memberships.role': role,
      'memberships.isActive': true,
    };

    // Filtrar por ministry se especificado
    if (options.ministryId) {
      filters['memberships.ministry'] = new Types.ObjectId(options.ministryId);
    }

    // Buscar usuários via membership
    const query = this.memModel.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      { $unwind: { path: '$ministryData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$userData._id',
          name: '$userData.name',
          email: '$userData.email',
          phone: '$userData.phone',
          picture: '$userData.picture',
          profileCompleted: '$userData.profileCompleted',
          membership: {
            _id: '$_id',
            role: '$role',
            ministry: '$ministryData',
            isActive: '$isActive',
          },
        },
      },
    ]);

    // Aplicar busca por texto se especificado
    if (options.search) {
      query.match({
        $or: [
          { name: { $regex: options.search, $options: 'i' } },
          { email: { $regex: options.search, $options: 'i' } },
        ],
      });
    }

    // Contar total para paginação
    const totalQuery = this.memModel.aggregate([
      { $match: filters },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    const users = await query.skip(skip).limit(options.limit);

    return {
      users,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  // 🔎 Listar voluntários por ministry (Leader)
  async listVolunteersByMinistry(
    tenantId: string,
    ministryId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      branchId?: string;
    },
    currentUser: any,
  ) {
    // Verificar se tenant e ministry existem
    const tenant = (await this.tenantModel
      .findById(tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const ministry = await this.ministryModel.findOne({ _id: ministryId });
    if (!ministry) {
      throw new NotFoundException('Ministry não encontrado');
    }

    // Verificar se ministry pertence ao tenant
    if (ministry.tenantId.toString() !== tenant.tenantId.toString()) {
      throw new BadRequestException(
        'Ministry não pertence ao tenant especificado',
      );
    }

    // Verificar se usuário tem permissão para ver este ministry
    console.log('🔍 listVolunteersByMinistry - currentUser:', JSON.stringify(currentUser, null, 2));
    console.log('🔍 listVolunteersByMinistry - currentUser._id:', currentUser._id);
    console.log('🔍 listVolunteersByMinistry - currentUser.role:', currentUser.role);
    console.log('🔍 listVolunteersByMinistry - tenant._id:', tenant._id);
    console.log('🔍 listVolunteersByMinistry - ministryId:', ministryId);
    
    // Verificar se é ServusAdmin (acesso global)
    if (currentUser.role === Role.ServusAdmin) {
      console.log('🔍 ServusAdmin - acesso concedido');
      var canViewMinistry = true;
    } else {
      // Verificar se é TenantAdmin (acesso a todos os ministries do tenant)
      console.log('🔍 Verificando se é TenantAdmin...');
      const isTenantAdmin = await this.hasMembershipInTenant(
        currentUser._id,
        tenant._id.toString(),
        [MembershipRole.TenantAdmin]
      );
      
      console.log('🔍 isTenantAdmin:', isTenantAdmin);
      
      if (isTenantAdmin) {
        console.log('🔍 TenantAdmin - acesso concedido para todos os ministries do tenant');
        var canViewMinistry = true;
      } else {
        // Verificar se é BranchAdmin ou Leader com acesso específico ao ministry
        console.log('🔍 Verificando acesso específico ao ministry...');
        const hasSpecificAccess = await this.hasMembershipInMinistry(
          currentUser._id,
          tenant._id.toString(),
          ministryId,
          [MembershipRole.BranchAdmin, MembershipRole.Leader]
        );
        
        console.log('🔍 hasSpecificAccess:', hasSpecificAccess);
        var canViewMinistry = hasSpecificAccess;
      }
    }

    console.log('🔍 canViewMinistry final:', canViewMinistry);
    if (!canViewMinistry) {
      throw new ForbiddenException(
        'Sem permissão para visualizar voluntários deste ministry',
      );
    }

    // Construir filtros
    const filters: any = {
      'memberships.tenant': tenantId, // tenantId é UUID string
      'memberships.ministry': new Types.ObjectId(ministryId),
      'memberships.role': MembershipRole.Volunteer,
      'memberships.isActive': true,
    };

    // Filtrar por branch se especificado
    if (options.branchId) {
      const branch = (await this.branchModel
        .findOne({ branchId: options.branchId })
        .lean()) as unknown as LeanBranch;
      if (!branch || branch.tenant.toString() !== tenant._id.toString()) {
        throw new BadRequestException(
          'Branch não encontrada ou não pertence ao tenant',
        );
      }
      filters['memberships.branch'] = branch._id;
    }

    // Buscar voluntários via membership
    const query = this.memModel.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$userData._id',
          name: '$userData.name',
          email: '$userData.email',
          phone: '$userData.phone',
          picture: '$userData.picture',
          profileCompleted: '$userData.profileCompleted',
          skills: '$userData.skills',
          availability: '$userData.availability',
          membership: {
            _id: '$_id',
            branch: '$branchData',
            isActive: '$isActive',
          },
        },
      },
    ]);

    // Aplicar busca por texto se especificado
    if (options.search) {
      query.match({
        $or: [
          { name: { $regex: options.search, $options: 'i' } },
          { email: { $regex: options.search, $options: 'i' } },
        ],
      });
    }

    // Contar total para paginação
    const totalQuery = this.memModel.aggregate([
      { $match: filters },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    const users = await query.skip(skip).limit(options.limit);

    return {
      users,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  // 🔎 Dashboard de usuários por tenant (TenantAdmin) - COM CACHE
  async getUsersDashboard(tenantId: string, currentUser: any) {
    // Verificar se tenant existe
    const tenant = (await this.tenantModel
      .findById(tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verificar permissão
    const canViewTenant =
      currentUser.role === Role.ServusAdmin ||
      (await this.hasMembershipInTenant(
        currentUser._id,
        tenant._id.toString(),
        [MembershipRole.TenantAdmin],
      ));

    if (!canViewTenant) {
      throw new ForbiddenException(
        'Sem permissão para visualizar dashboard deste tenant',
      );
    }

    // Chave de cache única para o dashboard
    const cacheKey = `dashboard:tenant:${tenantId}`;

    // Tentar buscar do cache primeiro
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Dashboard cache hit para tenant: ${tenantId}`);
      return cachedData;
    }

    console.log(
      `🔄 Dashboard cache miss para tenant: ${tenantId} - gerando dados...`,
    );

    // Estatísticas por role
    const statsByRole = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Estatísticas por branch
    const statsByBranch = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          isActive: true,
          branch: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: '$branchData' },
      {
        $group: {
          _id: '$branchData.name',
          branchId: { $first: '$branchData._id' },
          totalUsers: { $sum: 1 },
          roles: { $addToSet: '$role' },
        },
      },
    ]);

    // Usuários recentes (últimos 7 dias)
    const recentUsers = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          isActive: true,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $project: {
          name: '$userData.name',
          email: '$userData.email',
          role: '$role',
          createdAt: '$createdAt',
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
    ]);

    const result = {
      tenantId,
      stats: {
        byRole: statsByRole,
        byBranch: statsByBranch,
        totalUsers: statsByRole.reduce((sum, stat) => sum + stat.count, 0),
      },
      recentUsers,
      cachedAt: new Date().toISOString(),
      cacheKey,
    };

    // Salvar no cache por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300);
    console.log(`💾 Dashboard salvo no cache para tenant: ${tenantId}`);

    return result;
  }

  // 🔎 Dashboard de usuários por branch (BranchAdmin) - COM CACHE
  async getBranchUsersDashboard(
    tenantId: string,
    branchId: string,
    currentUser: any,
  ) {
    // Verificar se tenant e branch existem
    const tenant = (await this.tenantModel
      .findById(tenantId)
      .lean()) as unknown as LeanTenant;
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const branch = (await this.branchModel
      .findOne({ branchId })
      .lean()) as unknown as LeanBranch;
    if (!branch) {
      throw new NotFoundException('Branch não encontrada');
    }

    // Verificar se branch pertence ao tenant
    if (branch.tenant.toString() !== tenant._id.toString()) {
      throw new BadRequestException(
        'Branch não pertence ao tenant especificado',
      );
    }

    // Verificar permissão
    const canViewBranch =
      currentUser.role === Role.ServusAdmin ||
      (await this.hasMembershipInBranch(
        currentUser._id,
        tenant._id.toString(),
        branch._id.toString(),
        [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin],
      ));

    if (!canViewBranch) {
      throw new ForbiddenException(
        'Sem permissão para visualizar dashboard desta branch',
      );
    }

    // Chave de cache única para o dashboard da branch
    const cacheKey = `dashboard:branch:${tenantId}:${branchId}`;

    // Tentar buscar do cache primeiro
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(
        `✅ Branch dashboard cache hit para: ${tenantId}/${branchId}`,
      );
      return cachedData;
    }

    console.log(
      `🔄 Branch dashboard cache miss para: ${tenantId}/${branchId} - gerando dados...`,
    );

    // Estatísticas por role na branch
    const statsByRole = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          branch: branch._id, // Usar o _id da branch encontrada
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Estatísticas por ministry na branch
    const statsByMinistry = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          branch: branch._id, // Usar o _id da branch encontrada
          isActive: true,
          ministry: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      { $unwind: '$ministryData' },
      {
        $group: {
          _id: '$ministryData.name',
          ministryId: { $first: '$ministryData._id' },
          totalUsers: { $sum: 1 },
          roles: { $addToSet: '$role' },
        },
      },
    ]);

    // Usuários recentes na branch
    const recentUsers = await this.memModel.aggregate([
      {
        $match: {
          tenant: tenantId, // tenantId é UUID string
          branch: branch._id, // Usar o _id da branch encontrada
          isActive: true,
          createdAt: { $gte: new Date(Date.now() - 7 * 60 * 60 * 1000) },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $project: {
          name: '$userData.name',
          email: '$userData.email',
          role: '$role',
          ministry: '$ministry',
          createdAt: '$createdAt',
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
    ]);

    const result = {
      tenantId,
      branchId,
      stats: {
        byRole: statsByRole,
        byMinistry: statsByMinistry,
        totalUsers: statsByRole.reduce((sum, stat) => sum + stat.count, 0),
      },
      recentUsers,
      cachedAt: new Date().toISOString(),
      cacheKey,
    };

    // Salvar no cache por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300);
    console.log(
      `💾 Branch dashboard salvo no cache para: ${tenantId}/${branchId}`,
    );

    return result;
  }

  // 🔎 Buscar usuários por nome/email (com escopo baseado na role)
  async searchUsers(
    searchTerm: string,
    options: { page: number; limit: number },
    currentUser: any,
  ) {
    // Determinar escopo baseado na role do usuário
    let scopeFilter: any = {};

    if (currentUser.role === Role.ServusAdmin) {
      // ServusAdmin pode buscar em todo o sistema
      scopeFilter = {};
    } else {
      // Outros usuários só podem buscar no seu escopo
      const memberships = await this.getUserMemberships(currentUser._id);

      if (memberships.length > 0) {
        const tenantIds = memberships.map((m) => (m.tenant as any)._id);
        scopeFilter = { 'memberships.tenant': { $in: tenantIds } };
      }
    }

    // Buscar usuários via membership
    const query = this.memModel.aggregate([
      { $match: scopeFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $match: {
          $or: [
            { 'userData.name': { $regex: searchTerm, $options: 'i' } },
            { 'userData.email': { $regex: searchTerm, $options: 'i' } },
          ],
        },
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branchData',
        },
      },
      { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministryData',
        },
      },
      { $unwind: { path: '$ministryData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$userData._id',
          name: '$userData.name',
          email: '$userData.email',
          phone: '$userData.phone',
          picture: '$userData.picture',
          membership: {
            _id: '$_id',
            role: '$role',
            branch: '$branchData',
            ministry: '$ministryData',
            isActive: '$isActive',
          },
        },
      },
    ]);

    // Contar total para paginação
    const totalQuery = this.memModel.aggregate([
      { $match: scopeFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $match: {
          $or: [
            { 'userData.name': { $regex: searchTerm, $options: 'i' } },
            { 'userData.email': { $regex: searchTerm, $options: 'i' } },
          ],
        },
      },
      { $count: 'total' },
    ]);

    const [totalResult] = await totalQuery;
    const total = totalResult?.total || 0;

    // Aplicar paginação
    const skip = (options.page - 1) * options.limit;
    const users = await query.skip(skip).limit(options.limit);

    return {
      users,
      searchTerm,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  // ========================================
  // 🔧 MÉTODOS AUXILIARES PARA VERIFICAÇÃO DE PERMISSÕES
  // ========================================

  // Verificar se usuário tem membership em um tenant
  private async hasMembershipInTenant(
    userId: string,
    tenantId: string,
    roles: MembershipRole[],
  ): Promise<boolean> {
    const query = {
      user: new Types.ObjectId(userId),
      tenant: tenantId, // tenantId é UUID string
      role: { $in: roles },
      isActive: true,
    };
    
    console.log('🔍 hasMembershipInTenant - query:', JSON.stringify(query, null, 2));
    
    const membership = await this.memModel.findOne(query);
    console.log('🔍 hasMembershipInTenant - membership encontrado:', !!membership);
    if (membership) {
      console.log('🔍 hasMembershipInTenant - membership details:', JSON.stringify(membership, null, 2));
    }
    
    return !!membership;
  }

  // Verificar se usuário tem membership em uma branch
  private async hasMembershipInBranch(
    userId: string,
    tenantId: string,
    branchId: string,
    roles: MembershipRole[],
  ): Promise<boolean> {
    const membership = await this.memModel.findOne({
      user: new Types.ObjectId(userId),
      tenant: tenantId, // tenantId é UUID string
      branch: new Types.ObjectId(branchId),
      role: { $in: roles },
      isActive: true,
    });
    return !!membership;
  }

  // Verificar se usuário tem membership em um ministry
  private async hasMembershipInMinistry(
    userId: string,
    tenantId: string,
    ministryId: string,
    roles: MembershipRole[],
  ): Promise<boolean> {
    const query = {
      user: new Types.ObjectId(userId),
      tenant: tenantId, // tenantId é UUID string
      ministry: new Types.ObjectId(ministryId),
      role: { $in: roles },
      isActive: true,
    };
    
    console.log('🔍 hasMembershipInMinistry - query:', JSON.stringify(query, null, 2));
    
    const membership = await this.memModel.findOne(query);
    console.log('🔍 hasMembershipInMinistry - membership encontrado:', !!membership);
    if (membership) {
      console.log('🔍 hasMembershipInMinistry - membership details:', JSON.stringify(membership, null, 2));
    }
    
    return !!membership;
  }

  // 👤 Auto-registro via link de convite (VOLUNTÁRIO)
  async selfRegister(selfRegistrationDto: SelfRegistrationDto) {
    // TODO: Implementar validação do invitationToken
    // Por enquanto, vamos assumir que é válido

    // Verificar se usuário já existe
    const existingUser = await this.userModel.findOne({
      email: selfRegistrationDto.email.toLowerCase().trim(),
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário com esse email');
    }

    // TODO: Validar invitationToken e extrair informações do convite
    // const invitation = await this.invitationService.validateToken(selfRegistrationDto.invitationToken);
    // if (!invitation) {
    //   throw new BadRequestException('Token de convite inválido ou expirado');
    // }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(selfRegistrationDto.password, 10);

    // Criar usuário
    const user = new this.userModel({
      name: selfRegistrationDto.name,
      email: selfRegistrationDto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: Role.Volunteer, // Auto-registro sempre como volunteer
      tenantId: null, // Será definido via membership
      isActive: true,
      phone: selfRegistrationDto.phone,
      birthDate: selfRegistrationDto.birthDate,
      address: selfRegistrationDto.address,
      profileCompleted: false, // Perfil precisa ser completado
    });

    const savedUser = await user.save();

    // TODO: Criar membership baseado no convite
    // const membership = new this.memModel({
    //   user: savedUser._id,
    //   tenant: invitation.tenantId,
    //   branch: invitation.branchId,
    //   ministry: invitation.ministryId,
    //   role: MembershipRole.Volunteer,
    //   isActive: true,
    // });
    // await membership.save();

    return {
      user: savedUser,
      message:
        'Usuário criado com sucesso. Complete seu perfil para continuar.',
      nextStep: 'complete-profile',
    };
  }

  // 👤 Completar perfil após auto-registro - COM NOTIFICAÇÃO
  async completeProfile(userId: string, profileData: CompleteProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualizar dados do perfil
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        ...profileData,
        profileCompleted: true,
        updatedAt: new Date(),
      },
      { new: true },
    );

    // 🔔 Enviar notificação de perfil completado
    try {
      // Buscar tenant e branch do usuário via membership
      const membership = await this.memModel
        .findOne({
          user: userId,
          isActive: true,
        })
        .populate('tenant branch');

      if (membership) {
        await this.notificationService.notifyProfileCompleted(
          updatedUser,
          (membership.tenant as any)._id.toString(),
          membership.branch
            ? (membership.branch as any)._id.toString()
            : undefined,
        );
      }
    } catch (notificationError) {
      console.error(
        '❌ Erro ao enviar notificação de perfil completado:',
        notificationError.message,
      );
      // Não falhar a atualização por erro de notificação
    }

    return {
      user: updatedUser,
      message: 'Perfil atualizado com sucesso!',
    };
  }

  async findAll(tenantId: string) {
    return this.userModel.find({ tenantId }).exec();
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.userModel.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) }).exec();
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId: string) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId: new Types.ObjectId(tenantId) }, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) throw new NotFoundException('Usuário não encontrado');
    return updatedUser;
  }

  async remove(id: string, tenantId: string) {
    const deletedUser = await this.userModel
      .findOneAndDelete({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!deletedUser) throw new NotFoundException('Usuário não encontrado');
    return deletedUser;
  }

  async findByEmail(email: string) {
    console.log('🔍 [USERS] Buscando usuário por email...');
    console.log('📧 [USERS] Email de busca:', email);
    console.log('📧 [USERS] Email tipo:', typeof email);
    console.log('📧 [USERS] Email length:', email.length);
    
    // Normaliza o email para busca
    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 [USERS] Email normalizado:', normalizedEmail);
    
    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();
    
    console.log('👤 [USERS] Resultado da busca:');
    console.log('   - Usuário encontrado:', !!user);
    
    if (user) {
      console.log('👤 [USERS] Dados do usuário encontrado:');
      console.log('   - ID:', user._id);
      console.log('   - Nome:', user.name);
      console.log('   - Email:', user.email);
      console.log('   - Role:', user.role);
      console.log('   - Tem senha:', !!user.password);
      console.log('   - TenantId:', user.tenantId);
      console.log('   - Ativo:', user.isActive);
      console.log('   - GoogleId:', user.googleId || 'NENHUM');
    } else {
      console.log('❌ [USERS] Nenhum usuário encontrado com este email');
    }
    
    return user;
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findWithFilters(
    filters: any,
    options?: { page?: number; limit?: number },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filters)
        .select('-password')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      this.userModel.countDocuments(filters),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addRefreshToken(
    userId: string | Types.ObjectId,
    token: string,
    deviceId: string,
    isNewSession = false,
    absoluteExpiry?: Date,
  ) {
    const now = new Date();

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 dia

    // Se é nova sessão ou absoluteExpiry não existe, cria um novo
    const finalAbsoluteExpiry =
      isNewSession || !absoluteExpiry
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : absoluteExpiry;

    // Remove tokens duplicados ou expirados
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: {
        refreshTokens: {
          $or: [{ deviceId }, { expiresAt: { $lt: new Date() } }],
        },
      },
    });

    // Salva o novo token com absoluteExpiry preservado
    const update = {
      token,
      deviceId,
      expiresAt,
      absoluteExpiry: finalAbsoluteExpiry,
    };

    return this.userModel.findByIdAndUpdate(
      userId,
      { $push: { refreshTokens: update } },
      { new: true },
    );
  }

  async findByRefreshToken(token: string) {
    return this.userModel
      .findOne({
        'refreshTokens.token': token,
        'refreshTokens.expiresAt': { $gt: new Date() },
      })
      .exec();
  }

  async removeRefreshToken(userId: string, token: string) {
    return this.userModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token } },
    });
  }

  /**
   * Retorna true se o usuário NÃO for tenant_admin/branch_admin no tenant atual
   * e tiver ao menos um vínculo como leader (opcionalmente na mesma branch).
   */
  async isLeaderOnly(userId: string, tenantSlug: string, branchId?: string) {
    const tenant = (await this.tenantModel
      .findById(tenantSlug)
      .select('_id')
      .lean()) as unknown as { _id: Types.ObjectId };
    if (!tenant) return false;

    const base = {
      user: new Types.ObjectId(userId),
      tenant: tenantSlug, // tenantSlug é o tenantId (UUID string)
      isActive: true,
    };

    // se tem algum vínculo admin, não é "apenas líder"
    const hasAdmin = await this.memModel.exists({
      ...base,
      role: { $in: [MembershipRole.TenantAdmin, MembershipRole.BranchAdmin] },
    });
    if (hasAdmin) return false;

    // tem vínculo de leader?
    const cond: any = { ...base, role: MembershipRole.Leader };
    if (branchId) {
      const branch = await this.branchModel.findOne({ branchId });
      if (branch && branch.tenant.toString() === tenant._id.toString()) {
        cond.branch = branch._id;
      }
    }
    const hasLeader = await this.memModel.exists(cond);

    return !!hasLeader;
  }

  // 🧹 Método para limpar cache relacionado a um tenant
  async clearTenantCache(tenantId: string): Promise<void> {
    const keys = [`dashboard:tenant:${tenantId}`, `users:tenant:${tenantId}:*`];

    for (const keyPattern of keys) {
      try {
        if (keyPattern.includes('*')) {
          // Para padrões com *, implementar busca manual ou usar Redis diretamente
          const specificKeys = [
            `users:tenant:${tenantId}:leaders`,
            `users:tenant:${tenantId}:volunteers`,
            `users:tenant:${tenantId}:branch_admins`,
          ];

          for (const key of specificKeys) {
            await this.cacheManager.del(key);
          }
        } else {
          await this.cacheManager.del(keyPattern);
        }
        console.log(`🧹 Cache limpo: ${keyPattern}`);
      } catch (error) {
        console.error(`❌ Erro ao limpar cache ${keyPattern}:`, error.message);
      }
    }
  }

  // 🧹 Método para limpar cache relacionado a uma branch
  async clearBranchCache(tenantId: string, branchId: string): Promise<void> {
    const keys = [
      `dashboard:branch:${tenantId}:${branchId}`,
      `users:branch:${tenantId}:${branchId}:*`,
    ];

    for (const keyPattern of keys) {
      try {
        if (keyPattern.includes('*')) {
          // Para padrões com *, implementar busca manual ou usar Redis diretamente
          const specificKeys = [
            `users:branch:${tenantId}:${branchId}:leaders`,
            `users:branch:${tenantId}:${branchId}:volunteers`,
          ];

          for (const key of specificKeys) {
            await this.cacheManager.del(key);
          }
        } else {
          await this.cacheManager.del(keyPattern);
        }
        console.log(`🧹 Branch cache limpo: ${keyPattern}`);
      } catch (error) {
        console.error(
          `❌ Erro ao limpar branch cache ${keyPattern}:`,
          error.message,
        );
      }
    }
  }
}
