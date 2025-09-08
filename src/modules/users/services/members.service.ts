import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { Branch } from '../../branches/schemas/branch.schema';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { Tenant } from '../../tenants/schemas/tenant.schema';
import { CreateMemberDto, MembershipAssignmentDto } from '../DTO/create-member.dto';
import { UpdateMemberDto } from '../DTO/update-member.dto';
import { MemberFilterDto } from '../DTO/member-filter.dto';
import { MemberResponseDto } from '../DTO/member-response.dto';
import { MembershipRole, Role } from '../../../common/enums/role.enum';
import { EmailService } from '../../notifications/services/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Ministry.name) private ministryModel: Model<Ministry>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    private emailService: EmailService,
  ) {}

  async createMember(
    createMemberDto: CreateMemberDto,
    tenantId: string,
    userRole: string,
    createdBy: string,
  ): Promise<MemberResponseDto> {
    // Validações básicas
    if (!createMemberDto.email && !createMemberDto.phone) {
      throw new Error('Email ou telefone é obrigatório');
    }

    if (createMemberDto.memberships.length === 0) {
      throw new Error('Pelo menos um vínculo organizacional é obrigatório');
    }

    // Gerar senha temporária se não fornecida
    const provisionalPassword = createMemberDto.password || this.generateProvisionalPassword();
    const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

    const user = new this.userModel({
      ...createMemberDto,
      password: hashedPassword,
      tenantId,
      isActive: true,
    });

    const savedUser = await user.save();

    // Buscar informações do tenant pelo tenantId (UUID string)
    const tenant = await this.tenantModel.findOne({ tenantId }).select('name _id');
    const tenantName = tenant?.name || 'Igreja';
    const tenantObjectId = tenant?._id;

    if (!tenantObjectId) {
      throw new Error('Tenant não encontrado');
    }

    // Criar memberships e coletar informações para o email
    let branchName: string | undefined;
    let ministryName: string | undefined;
    let primaryRole: string = 'volunteer';

    for (const membershipData of createMemberDto.memberships) {
      const membership = new this.membershipModel({
        user: savedUser._id,
        tenant: tenantObjectId, // Usar ObjectId do tenant
        role: membershipData.role,
        branch: membershipData.branchId,
        ministry: membershipData.ministryId,
        isActive: membershipData.isActive ?? true,
        createdBy,
      });

      await membership.save();

      // Coletar informações do primeiro membership para o email
      if (!branchName && membershipData.branchId) {
        const branch = await this.branchModel.findById(membershipData.branchId).select('name');
        branchName = branch?.name;
      }

      if (!ministryName && membershipData.ministryId) {
        const ministry = await this.ministryModel.findById(membershipData.ministryId).select('name');
        ministryName = ministry?.name;
      }

      if (primaryRole === 'volunteer') {
        primaryRole = membershipData.role;
      }
    }

    // Enviar email com credenciais se o usuário tem email
    if (createMemberDto.email) {
      try {
        await this.emailService.sendUserCredentials(
          createMemberDto.email,
          createMemberDto.name,
          tenantName,
          provisionalPassword,
          primaryRole,
          branchName,
          ministryName,
        );
        console.log(`✅ Email de credenciais enviado para ${createMemberDto.email}`);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de credenciais:', emailError);
        // Não falhar a criação do usuário por erro de email
      }
    }

    return this.getMemberById(savedUser._id.toString(), tenantId);
  }

  async getMembers(
    filters: MemberFilterDto,
    tenantId: string,
    userRole: string,
  ): Promise<{ members: MemberResponseDto[], total: number }> {
    // Buscar o ObjectId do tenant
    const tenant = await this.tenantModel.findOne({ tenantId }).select('_id');
    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    // Buscar usuários que têm memberships neste tenant
    const membershipsQuery: any = { tenant: tenant._id };
    
    if (filters.branchId) {
      membershipsQuery.branch = filters.branchId;
    }
    
    if (filters.ministryId) {
      membershipsQuery.ministry = filters.ministryId;
    }
    
    if (filters.role) {
      membershipsQuery.role = filters.role;
    }
    
    if (filters.isActive !== undefined) {
      membershipsQuery.isActive = filters.isActive;
    }

    // Buscar memberships com filtros
    const memberships = await this.membershipModel
      .find(membershipsQuery)
      .populate('user')
      .populate('branch', 'name address')
      .populate('ministry', 'name description');

    // Aplicar filtro de busca nos usuários
    let filteredMemberships = memberships;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredMemberships = memberships.filter(membership => {
        const user = membership.user as any;
        return user.name?.toLowerCase().includes(searchTerm) ||
               user.email?.toLowerCase().includes(searchTerm);
      });
    }

    // Paginação
    const page = parseInt(filters.page || '1') || 1;
    const limit = parseInt(filters.limit || '10') || 10;
    const skip = (page - 1) * limit;
    const total = filteredMemberships.length;
    const paginatedMemberships = filteredMemberships.slice(skip, skip + limit);

    // Mapear para resposta
    const members = paginatedMemberships.map(membership => {
      const user = membership.user as any;
      return this.mapUserToMemberResponse(user, [membership]);
    });

    return { members, total };
  }

  async getMemberById(id: string, tenantId: string): Promise<MemberResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar o ObjectId do tenant
    const tenant = await this.tenantModel.findOne({ tenantId }).select('_id');
    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    const memberships = await this.membershipModel
      .find({ user: user._id, tenant: tenant._id })
      .populate('branch', 'name address')
      .populate('ministry', 'name description');

    return this.mapUserToMemberResponse(user, memberships);
  }

  async updateMember(
    id: string,
    updateMemberDto: UpdateMemberDto,
    tenantId: string,
    userRole: string,
  ): Promise<MemberResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Atualizar dados do usuário
    Object.assign(user, updateMemberDto);
    await user.save();

    return this.getMemberById(id, tenantId);
  }

  async deleteMember(id: string, tenantId: string, userRole: string): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar o ObjectId do tenant
    const tenant = await this.tenantModel.findOne({ tenantId }).select('_id');
    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    // Deletar memberships
    await this.membershipModel.deleteMany({ user: user._id, tenant: tenant._id });

    // Deletar usuário
    await this.userModel.findByIdAndDelete(id);
  }

  /**
   * Gera uma senha provisória segura
   */
  private generateProvisionalPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Garantir pelo menos um caractere de cada tipo
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Maiúscula
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Número
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Símbolo
    
    // Completar com caracteres aleatórios
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private mapUserToMemberResponse(user: any, memberships: any[]): MemberResponseDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      bio: user.bio,
      skills: user.skills || [],
      availability: user.availability,
      address: user.address,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted || false,
      role: user.role || 'volunteer',
      memberships: memberships.map(membership => ({
        id: membership._id.toString(),
        role: membership.role,
        branch: membership.branch ? {
          id: membership.branch._id.toString(),
          name: membership.branch.name,
        } : undefined,
        ministry: membership.ministry ? {
          id: membership.ministry._id.toString(),
          name: membership.ministry.name,
        } : undefined,
        isActive: membership.isActive,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}