import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InviteCode } from '../schemas/invite-code.schema';
import { Ministry } from '../schemas/ministry.schema';
import { Branch } from '../../branches/schemas/branch.schema';
import { Tenant } from '../../tenants/schemas/tenant.schema';
import { User } from '../../users/schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import {
  CreateInviteCodeDto,
  ValidateInviteCodeDto,
  RegisterWithInviteDto,
  InviteCodeResponseDto,
  InviteCodeValidationDto,
} from '../dto/invite-code.dto';
import { MembershipRole } from 'src/common/enums/role.enum';
import { FunctionsService } from '../../functions/services/functions.service';
import {
  MemberFunctionService,
  CreateMemberFunctionDto,
} from '../../functions/services/member-function.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InviteCodeService {
  constructor(
    @InjectModel('InviteCode') private inviteCodeModel: Model<InviteCode>,
    @InjectModel('Ministry') private ministryModel: Model<Ministry>,
    @InjectModel('Branch') private branchModel: Model<Branch>,
    @InjectModel('Tenant') private tenantModel: Model<Tenant>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Membership') private membershipModel: Model<Membership>,
    private readonly functionsService: FunctionsService,
    private readonly memberFunctionService: MemberFunctionService,
  ) {}

  /**
   * Gera um código de convite único de 4 caracteres
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem 0, O, I, 1
    let code = '';

    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Verifica se um código já existe
   */
  private async codeExists(code: string): Promise<boolean> {
    const existingCode = await this.inviteCodeModel.findOne({ code });
    return !!existingCode;
  }

  /**
   * Gera um código único que não existe no banco
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = this.generateInviteCode();
      attempts++;

      if (attempts > maxAttempts) {
        throw new BadRequestException(
          'Não foi possível gerar um código único. Tente novamente.',
        );
      }
    } while (await this.codeExists(code));

    return code;
  }

  /**
   * Cria ou regenera um código de convite para um ministério
   */
  async createOrRegenerateInviteCode(
    ministryId: string,
    tenantId: string,
    branchId: string | null,
    createdBy: string,
    createInviteCodeDto: CreateInviteCodeDto,
  ): Promise<InviteCodeResponseDto> {
    console.log('🎫 Criando/regenerando código de convite...');
    console.log(
      '   - Ministry ID:',
      ministryId,
      '(tipo:',
      typeof ministryId,
      ')',
    );
    console.log('   - Tenant ID:', tenantId, '(tipo:', typeof tenantId, ')');
    console.log('   - Branch ID:', branchId, '(tipo:', typeof branchId, ')');
    console.log('   - Created By:', createdBy, '(tipo:', typeof createdBy, ')');

    // Verificar se os IDs são válidos
    try {
      new Types.ObjectId(ministryId);
      new Types.ObjectId(tenantId);
      if (branchId) new Types.ObjectId(branchId);
      new Types.ObjectId(createdBy);
      console.log('✅ Todos os IDs são válidos');
    } catch (error) {
      console.error('❌ ID inválido:', error);
      throw new BadRequestException('ID inválido fornecido');
    }

    // Verificar se o ministério existe
    const ministry = await this.ministryModel.findById(ministryId);
    console.log('🔍 Ministério encontrado na criação do código:');
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Ministry encontrado:', !!ministry);
    console.log('   - Ministry name:', ministry?.name);
    console.log('   - Ministry isActive:', ministry?.isActive);

    if (!ministry) {
      throw new NotFoundException('Ministério não encontrado');
    }

    // Verificar se já existe um código ativo para este ministério
    const existingCode = await this.inviteCodeModel.findOne({
      ministryId: new Types.ObjectId(ministryId),
      isActive: true,
    });

    let inviteCode: InviteCode;

    if (existingCode && !createInviteCodeDto.regenerate) {
      // Usar código existente
      inviteCode = existingCode;
      console.log('✅ Usando código existente:', inviteCode.code);
    } else {
      // Desativar código existente se regenerando
      if (existingCode) {
        await this.inviteCodeModel.findByIdAndUpdate(existingCode._id, {
          isActive: false,
          updatedBy: new Types.ObjectId(createdBy),
        });
        console.log('🔄 Código anterior desativado');
      }

      // Gerar novo código
      const newCode = await this.generateUniqueCode();

      const inviteCodeData = {
        code: newCode,
        ministryId: new Types.ObjectId(ministryId),
        tenantId: new Types.ObjectId(tenantId),
        branchId: branchId ? new Types.ObjectId(branchId) : null,
        createdBy: new Types.ObjectId(createdBy),
        isActive: true,
        usageCount: 0,
        expiresAt: createInviteCodeDto.expiresAt
          ? new Date(createInviteCodeDto.expiresAt)
          : null,
      };

      inviteCode = new this.inviteCodeModel(inviteCodeData);
      await inviteCode.save();
      console.log('✅ Novo código criado:', inviteCode.code);
    }

    // Buscar informações do ministério, tenant e branch
    const [ministryData, tenantData, branchData] = await Promise.all([
      this.ministryModel.findById(ministryId).select('name'),
      this.tenantModel.findById(tenantId).select('name'),
      branchId ? this.branchModel.findById(branchId).select('name') : null,
    ]);

    return {
      code: inviteCode.code,
      ministryId: ministryId,
      ministryName: ministryData?.name || 'Ministério',
      tenantId: tenantId,
      branchId: branchId || undefined,
      branchName: branchData?.name,
      createdBy: createdBy,
      createdAt: inviteCode.createdAt,
      expiresAt: inviteCode.expiresAt,
      usageCount: inviteCode.usageCount,
      isActive: inviteCode.isActive,
    };
  }

  /**
   * Valida um código de convite
   */
  async validateInviteCode(
    validateDto: ValidateInviteCodeDto,
  ): Promise<InviteCodeValidationDto> {
    console.log('🔍 Validando código de convite:', validateDto.code);

    const inviteCode = await this.inviteCodeModel.findOne({
      code: validateDto.code.toUpperCase(),
      isActive: true,
    });

    console.log('🔍 InviteCode encontrado (raw):', inviteCode);

    if (!inviteCode) {
      return {
        isValid: false,
        message: 'Código de convite inválido ou expirado',
      };
    }

    // Buscar dados relacionados separadamente
    const [ministry, tenant, branch] = await Promise.all([
      this.ministryModel
        .findById(inviteCode.ministryId)
        .select('name isActive'),
      this.tenantModel.findById(inviteCode.tenantId).select('name'),
      inviteCode.branchId
        ? this.branchModel.findById(inviteCode.branchId).select('name')
        : null,
    ]);

    console.log('🔍 Dados relacionados encontrados:');
    console.log('   - Ministry:', ministry);
    console.log('   - Tenant:', tenant);
    console.log('   - Branch:', branch);

    console.log('🔍 Dados do inviteCode encontrado:');
    console.log(
      '   - ministryId:',
      inviteCode.ministryId,
      '(tipo:',
      typeof inviteCode.ministryId,
      ')',
    );
    console.log(
      '   - tenantId:',
      inviteCode.tenantId,
      '(tipo:',
      typeof inviteCode.tenantId,
      ')',
    );
    console.log(
      '   - branchId:',
      inviteCode.branchId,
      '(tipo:',
      typeof inviteCode.branchId,
      ')',
    );

    // Verificar se o código expirou
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return {
        isValid: false,
        message: 'Código de convite expirado',
      };
    }

    // Verificar se o ministério ainda está ativo
    console.log('🔍 Verificando status do ministério:');
    console.log('   - Ministry encontrado:', !!ministry);
    console.log('   - Ministry isActive:', ministry?.isActive);
    console.log('   - Ministry name:', ministry?.name);

    if (!ministry) {
      console.log('❌ Ministério não encontrado no banco');
      return {
        isValid: false,
        message: 'Ministério não encontrado',
      };
    }

    if (!ministry.isActive) {
      console.log('❌ Ministério está inativo');
      return {
        isValid: false,
        message: 'Ministério não está mais ativo',
      };
    }

    console.log('✅ Ministério está ativo');

    return {
      isValid: true,
      ministryId: inviteCode.ministryId.toString(),
      ministryName: ministry.name,
      tenantId: inviteCode.tenantId.toString(),
      branchId: inviteCode.branchId?.toString(),
      branchName: branch?.name,
      expiresAt: inviteCode.expiresAt,
    };
  }

  /**
   * Registra um novo usuário usando código de convite
   */
  async registerWithInviteCode(
    registerDto: RegisterWithInviteDto,
  ): Promise<any> {
    console.log('👤 Registrando usuário com código de convite...');
    console.log('   - Code:', registerDto.code);
    console.log('   - Name:', registerDto.name);
    console.log('   - Email:', registerDto.email);
    console.log('   - Phone:', registerDto.phone);

    // Validar código
    const validation = await this.validateInviteCode({
      code: registerDto.code,
    });
    if (!validation.isValid) {
      console.log('❌ Código inválido:', validation.message);
      throw new BadRequestException(validation.message);
    }

    console.log('✅ Código válido:', validation);

    // Verificar se email já existe
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      console.log('❌ Email já existe:', registerDto.email);
      throw new BadRequestException('Email já está em uso');
    }

    console.log('✅ Email disponível');

    // Hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);
    console.log('✅ Senha hashada');

    // Criar usuário (INATIVO até aprovação de função)
    const userData = {
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      password: hashedPassword,
      role: 'volunteer', // Sempre volunteer para convites
      profileCompleted: false,
      isActive: false, // INATIVO até aprovação
      tenantId: new Types.ObjectId(validation.tenantId), // ✅ Adicionar tenantId no registro
    };

    console.log('📝 Criando usuário INATIVO com dados:', userData);

    const newUser = new this.userModel(userData);
    await newUser.save();
    console.log('✅ Usuário criado (INATIVO):', newUser._id);

    // Criar membership (INATIVO até aprovação de função)
    console.log('🔍 Dados de validação para membership:');
    console.log(
      '   - tenantId:',
      validation.tenantId,
      '(tipo:',
      typeof validation.tenantId,
      ')',
    );
    console.log(
      '   - branchId:',
      validation.branchId,
      '(tipo:',
      typeof validation.branchId,
      ')',
    );
    console.log(
      '   - ministryId:',
      validation.ministryId,
      '(tipo:',
      typeof validation.ministryId,
      ')',
    );

    // Verificar se os IDs são válidos antes de converter
    try {
      const tenantObjectId = new Types.ObjectId(validation.tenantId!);
      const ministryObjectId = new Types.ObjectId(validation.ministryId!);
      const branchObjectId = validation.branchId
        ? new Types.ObjectId(validation.branchId)
        : null;

      console.log('✅ IDs convertidos com sucesso:');
      console.log('   - tenantObjectId:', tenantObjectId);
      console.log('   - ministryObjectId:', ministryObjectId);
      console.log('   - branchObjectId:', branchObjectId);

      const membershipData = {
        user: newUser._id,
        tenant: tenantObjectId,
        branch: branchObjectId,
        ministry: ministryObjectId,
        role: MembershipRole.Volunteer,
        isActive: false, // INATIVO até aprovação
        needsApproval: true, // Precisa de aprovação do líder
        source: 'invite', // Origem: código de convite
        sourceData: {
          inviteCode: registerDto.code.toUpperCase(),
        },
        createdBy: newUser._id, // Auto-criado
      };

      console.log('📝 Criando membership INATIVO com dados:', membershipData);

      const membership = new this.membershipModel(membershipData);
      await membership.save();
      console.log('✅ Membership criado (INATIVO):', membership._id);
      console.log('✅ Membership role:', membership.role);
      console.log('✅ Membership isActive:', membership.isActive);

      // Incrementar contador de uso do código
      await this.inviteCodeModel.findOneAndUpdate(
        { code: registerDto.code.toUpperCase() },
        { $inc: { usageCount: 1 } },
      );

      console.log('✅ Contador de uso incrementado');

      // ✅ NÃO criar MemberFunctions automaticamente para invites
      // As funções serão criadas apenas quando o líder aprovar e escolher as funções
      console.log(
        'ℹ️ MemberFunctions não serão criadas automaticamente para invites',
      );
      console.log(
        'ℹ️ As funções serão atribuídas quando o líder aprovar o voluntário',
      );

      console.log('✅ Usuário registrado e vinculado ao ministério (PENDENTE)');

      return {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          isActive: false, // Usuário inativo
        },
        membership: {
          id: membership._id,
          ministryId: validation.ministryId,
          ministryName: validation.ministryName,
          role: MembershipRole.Volunteer,
          isActive: false, // Membership inativo
        },
        status: 'pending_approval', // Status de pendência
        message: 'Aguardando aprovação do líder do ministério',
      };
    } catch (error) {
      console.error('❌ Erro ao converter IDs para ObjectId:', error);
      throw new BadRequestException('IDs inválidos para criação do membership');
    }
  }

  /**
   * Busca códigos de convite de um ministério
   */
  async getMinistryInviteCodes(
    ministryId: string,
  ): Promise<InviteCodeResponseDto[]> {
    const inviteCodes = await this.inviteCodeModel
      .find({ ministryId: new Types.ObjectId(ministryId) })
      .populate('ministryId', 'name')
      .populate('tenantId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return inviteCodes.map((code) => ({
      code: code.code,
      ministryId: code.ministryId.toString(),
      ministryName: (code.ministryId as any).name,
      tenantId: code.tenantId.toString(),
      branchId: code.branchId?.toString(),
      branchName: code.branchId ? (code.branchId as any).name : undefined,
      createdBy: code.createdBy.toString(),
      createdAt: code.createdAt,
      expiresAt: code.expiresAt,
      usageCount: code.usageCount,
      isActive: code.isActive,
    }));
  }
}
