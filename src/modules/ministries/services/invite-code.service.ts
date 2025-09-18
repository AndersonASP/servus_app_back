import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
  InviteCodeValidationDto 
} from '../dto/invite-code.dto';
import { MembershipRole } from 'src/common/enums/role.enum';
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
        throw new BadRequestException('Não foi possível gerar um código único. Tente novamente.');
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
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Branch ID:', branchId);
    console.log('   - Created By:', createdBy);

    // Verificar se o ministério existe
    const ministry = await this.ministryModel.findById(ministryId);
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
        expiresAt: createInviteCodeDto.expiresAt ? new Date(createInviteCodeDto.expiresAt) : null,
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
  async validateInviteCode(validateDto: ValidateInviteCodeDto): Promise<InviteCodeValidationDto> {
    console.log('🔍 Validando código de convite:', validateDto.code);

    const inviteCode = await this.inviteCodeModel.findOne({
      code: validateDto.code.toUpperCase(),
      isActive: true,
    }).populate('ministryId', 'name').populate('tenantId', 'name').populate('branchId', 'name');

    if (!inviteCode) {
      return {
        isValid: false,
        message: 'Código de convite inválido ou expirado',
      };
    }

    // Verificar se o código expirou
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return {
        isValid: false,
        message: 'Código de convite expirado',
      };
    }

    // Verificar se o ministério ainda está ativo
    const ministry = await this.ministryModel.findById(inviteCode.ministryId);
    if (!ministry || !ministry.isActive) {
      return {
        isValid: false,
        message: 'Ministério não está mais ativo',
      };
    }

    return {
      isValid: true,
      ministryId: inviteCode.ministryId.toString(),
      ministryName: ministry.name,
      tenantId: inviteCode.tenantId.toString(),
      branchId: inviteCode.branchId?.toString(),
      branchName: inviteCode.branchId ? (inviteCode.branchId as any).name : undefined,
      expiresAt: inviteCode.expiresAt,
    };
  }

  /**
   * Registra um novo usuário usando código de convite
   */
  async registerWithInviteCode(registerDto: RegisterWithInviteDto): Promise<any> {
    console.log('👤 Registrando usuário com código de convite...');
    console.log('   - Code:', registerDto.code);
    console.log('   - Name:', registerDto.name);
    console.log('   - Email:', registerDto.email);

    // Validar código
    const validation = await this.validateInviteCode({ code: registerDto.code });
    if (!validation.isValid) {
      throw new BadRequestException(validation.message);
    }

    // Verificar se email já existe
    const existingUser = await this.userModel.findOne({ email: registerDto.email });
    if (existingUser) {
      throw new BadRequestException('Email já está em uso');
    }

    // Hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Criar usuário
    const userData = {
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      password: hashedPassword,
      role: 'volunteer', // Sempre volunteer para convites
      profileCompleted: false,
      isActive: true,
    };

    const newUser = new this.userModel(userData);
    await newUser.save();
    console.log('✅ Usuário criado:', newUser._id);

    // Criar membership
    const membershipData = {
      user: newUser._id,
      tenant: new Types.ObjectId(validation.tenantId!),
      branch: validation.branchId ? new Types.ObjectId(validation.branchId) : null,
      ministry: new Types.ObjectId(validation.ministryId!),
      role: MembershipRole.Volunteer,
      isActive: true,
      createdBy: newUser._id, // Auto-criado
    };

    const membership = new this.membershipModel(membershipData);
    await membership.save();
    console.log('✅ Membership criado:', membership._id);

    // Incrementar contador de uso do código
    await this.inviteCodeModel.findOneAndUpdate(
      { code: registerDto.code.toUpperCase() },
      { $inc: { usageCount: 1 } }
    );

    console.log('✅ Usuário registrado e vinculado ao ministério');

    return {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
      membership: {
        id: membership._id,
        ministryId: validation.ministryId,
        ministryName: validation.ministryName,
        role: MembershipRole.Volunteer,
      },
    };
  }

  /**
   * Busca códigos de convite de um ministério
   */
  async getMinistryInviteCodes(ministryId: string): Promise<InviteCodeResponseDto[]> {
    const inviteCodes = await this.inviteCodeModel
      .find({ ministryId: new Types.ObjectId(ministryId) })
      .populate('ministryId', 'name')
      .populate('tenantId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return inviteCodes.map(code => ({
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
