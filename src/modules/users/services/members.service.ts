import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { Branch } from '../../branches/schemas/branch.schema';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { Tenant } from '../../tenants/schemas/tenant.schema';
import { UserFunction } from '../../functions/schemas/user-function.schema';
import { CreateMemberDto, MembershipAssignmentDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { MemberResponseDto } from '../dto/member-response.dto';
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
    @InjectModel(UserFunction.name) private userFunctionModel: Model<UserFunction>,
    private emailService: EmailService,
  ) {}

  async createMember(
    createMemberDto: CreateMemberDto,
    tenantId: string, // ObjectId como string
    userRole: string,
    createdBy: string,
  ): Promise<MemberResponseDto> {
    console.log('🚀 [MembersService] Iniciando criação de membro...');
    console.log('📋 [MembersService] Dados recebidos:', {
      name: createMemberDto.name,
      email: createMemberDto.email,
      phone: createMemberDto.phone,
      memberships: createMemberDto.memberships,
      tenantId,
      userRole,
      createdBy
    });

    // Validações básicas
    if (!createMemberDto.email && !createMemberDto.phone) {
      console.log('❌ [MembersService] Erro: Email ou telefone é obrigatório');
      throw new BadRequestException('Email ou telefone é obrigatório');
    }

    if (createMemberDto.memberships.length === 0) {
      console.log('❌ [MembersService] Erro: Pelo menos um vínculo organizacional é obrigatório');
      throw new BadRequestException('Pelo menos um vínculo organizacional é obrigatório');
    }

    // Gerar senha temporária se não fornecida
    const provisionalPassword = createMemberDto.password || this.generateProvisionalPassword();
    const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

    console.log('👤 [MembersService] Criando usuário...');
    const user = new this.userModel({
      ...createMemberDto,
      password: hashedPassword,
      tenantId: new Types.ObjectId(tenantId), // Converter string para ObjectId
      isActive: true,
    });

    console.log('💾 [MembersService] Salvando usuário no banco...');
    const savedUser = await user.save();
    console.log('✅ [MembersService] Usuário criado com sucesso:', savedUser._id);

    // Buscar informações do tenant pelo ObjectId
    const tenant = await this.tenantModel.findById(tenantId).select('name _id');
    const tenantName = tenant?.name || 'Igreja';

    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // Criar memberships e coletar informações para o email
    let branchName: string | undefined;
    let ministryName: string | undefined;
    let primaryRole: string = 'volunteer'; // Será atualizado com a role do primeiro membership

    console.log('🔗 [MembersService] Criando memberships...');
    for (const membershipData of createMemberDto.memberships) {
      console.log('📝 [MembersService] Criando membership:', {
        role: membershipData.role,
        branchId: membershipData.branchId,
        ministryId: membershipData.ministryId,
        functionIds: membershipData.functionIds
      });

      const membership = new this.membershipModel({
        user: savedUser._id,
        tenant: new Types.ObjectId(tenantId), // ObjectId do tenant
        role: membershipData.role,
        branch: membershipData.branchId ? new Types.ObjectId(membershipData.branchId) : null,
        ministry: membershipData.ministryId ? new Types.ObjectId(membershipData.ministryId) : null,
        isActive: membershipData.isActive ?? true,
        createdBy,
      });

      console.log('💾 [MembersService] Salvando membership no banco...');
      await membership.save();
      console.log('✅ [MembersService] Membership criado com sucesso:', membership._id);

      // Criar vínculos UserFunction se houver funções selecionadas
      if (membershipData.functionIds && membershipData.functionIds.length > 0 && membershipData.ministryId) {
        console.log('⚙️ [MembersService] Criando UserFunctions:', membershipData.functionIds);
        for (const functionId of membershipData.functionIds) {
          console.log('🔧 [MembersService] Criando UserFunction:', {
            userId: savedUser._id,
            ministryId: membershipData.ministryId,
            functionId: functionId,
            tenantId: tenantId,
            branchId: membershipData.branchId
          });

          const userFunction = new this.userFunctionModel({
            userId: savedUser._id,
            ministryId: membershipData.ministryId,
            functionId: functionId,
            status: 'approved', // Aprovado automaticamente quando criado pelo líder
            tenantId: new Types.ObjectId(tenantId), // ObjectId do tenant
            branchId: membershipData.branchId,
            approvedBy: createdBy,
            approvedAt: new Date(),
          });

          console.log('💾 [MembersService] Salvando UserFunction no banco...');
          await userFunction.save();
          console.log('✅ [MembersService] UserFunction criada com sucesso:', userFunction._id);
        }
      }

      // Coletar informações do primeiro membership para o email
      if (!branchName && membershipData.branchId) {
        const branch = await this.branchModel.findById(membershipData.branchId).select('name');
        branchName = branch?.name;
      }

      if (!ministryName && membershipData.ministryId) {
        const ministry = await this.ministryModel.findById(membershipData.ministryId).select('name');
        ministryName = ministry?.name;
      }

      // Definir primaryRole com a role do primeiro membership
      if (primaryRole === 'volunteer') {
        primaryRole = membershipData.role;
      }
    }

    // Atualizar a role do usuário com a primaryRole
    console.log('🔄 [MembersService] Atualizando role do usuário para:', primaryRole);
    await this.userModel.findByIdAndUpdate(savedUser._id, { role: primaryRole });
    console.log('✅ [MembersService] Role do usuário atualizada com sucesso');

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

    console.log('🎯 [MembersService] Buscando dados do membro criado...');
    const result = await this.getMemberById(savedUser._id.toString(), tenantId);
    console.log('🎉 [MembersService] Membro criado com sucesso!');
    console.log('📊 [MembersService] Resultado final:', {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      memberships: result.memberships?.length || 0
    });
    return result;
  }

  async getMembers(
    filters: MemberFilterDto,
    tenantId: string, // ObjectId como string
    userRole: string,
  ): Promise<{ members: MemberResponseDto[], total: number }> {
    console.log('🔍 [MembersService] getMembers iniciado');
    console.log('📋 [MembersService] Filtros recebidos:', filters);
    console.log('🏢 [MembersService] TenantId:', tenantId);
    console.log('👤 [MembersService] UserRole:', userRole);

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      console.log('❌ [MembersService] Tenant não encontrado:', tenantId);
      throw new BadRequestException('Tenant não encontrado');
    }

    // Buscar usuários que têm memberships neste tenant
    const membershipsQuery: any = { tenant: new Types.ObjectId(tenantId) }; // ObjectId do tenant
    
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

    console.log('🔍 [MembersService] Query de memberships:', membershipsQuery);

    // Buscar memberships com filtros
    const memberships = await this.membershipModel
      .find(membershipsQuery)
      .populate('user')
      .populate('branch', 'name address')
      .populate('ministry', 'name description');

    console.log('📊 [MembersService] Memberships encontrados:', memberships.length);
    console.log('📋 [MembersService] Primeiro membership:', memberships[0] ? {
      id: memberships[0]._id,
      user: memberships[0].user ? 'populated' : 'not populated',
      role: memberships[0].role
    } : 'nenhum');

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

    console.log('📄 [MembersService] Paginação:', { page, limit, skip, total, paginatedCount: paginatedMemberships.length });

    // Mapear para resposta
    const members = paginatedMemberships.map(membership => {
      const user = membership.user as any;
      console.log('👤 [MembersService] Mapeando user:', {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        role: user?.role
      });
      return this.mapUserToMemberResponse(user, [membership]);
    });

    console.log('✅ [MembersService] Resposta final:', {
      membersCount: members.length,
      total,
      firstMember: members[0] ? {
        id: members[0].id,
        name: members[0].name,
        email: members[0].email
      } : 'nenhum'
    });

    return { members, total };
  }

  async getMemberById(id: string, tenantId: string): Promise<MemberResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    const memberships = await this.membershipModel
      .find({ user: user._id, tenant: new Types.ObjectId(tenantId) }) // ObjectId do tenant
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

    // Verificar se o tenant existe
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // Deletar memberships
    await this.membershipModel.deleteMany({ user: user._id, tenant: new Types.ObjectId(tenantId) }); // ObjectId do tenant

    // Deletar usuário
    await this.userModel.findByIdAndDelete(id);
  }

  /**
   * Gera uma senha provisória segura
   */
  private generateProvisionalPassword(): string {
    const crypto = require('crypto');
    
    // Caracteres seguros para senha
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Garantir pelo menos um de cada tipo (mais seguro)
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // Preencher o resto com caracteres aleatórios criptograficamente seguros
    for (let i = 4; i < 16; i++) { // Senha de 16 caracteres
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Embaralhar a senha usando crypto.randomBytes para maior segurança
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
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

  async toggleMemberStatus(
    memberId: string,
    tenantId: string,
    userRole: string,
  ): Promise<MemberResponseDto> {
    // Buscar o usuário
    const user = await this.userModel.findById(memberId);
    if (!user) {
      throw new Error('Membro não encontrado');
    }

    // Verificar se o usuário pertence ao tenant
    if (user.tenantId?.toString() !== tenantId) {
      throw new Error('Membro não pertence a este tenant');
    }

    // Toggle do status
    user.isActive = !user.isActive;
    await user.save();

    // Buscar memberships ativos do usuário
    const memberships = await this.membershipModel
      .find({ user: memberId, isActive: true })
      .populate('tenant branch ministry')
      .lean();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      bio: user.bio,
      skills: user.skills,
      availability: user.availability,
      address: user.address,
      picture: user.picture,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      role: user.role,
      tenantId: user.tenantId?.toString(),
      branchId: user.branchId?.toString(),
      memberships: memberships.map((membership) => ({
        id: membership._id.toString(),
        role: membership.role,
        tenant: membership.tenant ? {
          id: (membership.tenant as any)._id.toString(),
          tenantId: (membership.tenant as any).tenantId,
          name: (membership.tenant as any).name,
        } : undefined,
        branch: membership.branch ? {
          id: (membership.branch as any)._id.toString(),
          branchId: (membership.branch as any).branchId,
          name: (membership.branch as any).name,
        } : undefined,
        ministry: membership.ministry ? {
          id: (membership.ministry as any)._id.toString(),
          name: (membership.ministry as any).name,
        } : undefined,
        isActive: membership.isActive,
        createdAt: (membership as any).createdAt || new Date(),
        updatedAt: (membership as any).updatedAt || new Date(),
      })),
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }
}