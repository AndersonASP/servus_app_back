import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../schemas/tenant.schema';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { CreateTenantWithAdminDto } from '../dto/create-tenant-with-admin.dto';
import { User } from '../../users/schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { Role, MembershipRole } from 'src/common/enums/role.enum';
import { EmailService } from '../../notifications/services/email.service';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    private emailService: EmailService,
  ) {}

  // REMOVIDO: generateUuidTenantId - não precisamos mais de UUID, usamos ObjectId

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
    
    // Garantir pelo menos um de cada tipo
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // Preencher o resto com caracteres aleatórios criptograficamente seguros
    for (let i = 4; i < 16; i++) { // Senha de 16 caracteres
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Embaralhar a senha
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
  }

  async create(createTenantDto: CreateTenantDto, createdBy: string) {
    const exists = await this.tenantModel.findOne({
      name: createTenantDto.name,
    });

    if (exists)
      throw new ConflictException(
        'Já existe um tenant com esse nome.',
      );

    const tenant = new this.tenantModel({
      ...createTenantDto,
      createdBy,
      isActive: true,
    });

    return tenant.save();
  }

  // 🏢 ServusAdmin: Criar Tenant + TenantAdmin (opcional)
  async createWithAdmin(
    data: CreateTenantWithAdminDto,
    createdBy: string,
    creatorRole: Role,
  ) {
    // Verificar permissão
    if (creatorRole !== Role.ServusAdmin) {
      throw new ForbiddenException('Apenas ServusAdmin pode criar tenants');
    }

    // Verificar se tenant já existe
    const existingTenant = await this.tenantModel.findOne({
      name: data.tenantData.name,
    });

    if (existingTenant) {
      throw new ConflictException('Já existe um tenant com esse nome');
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

    const session = await this.tenantModel.startSession();
    session.startTransaction();

    try {
      const tenant = new this.tenantModel({
        ...data.tenantData,
        createdBy,
        isActive: true,
      });

      const savedTenant = await tenant.save({ session });

      let adminResult: any = null;
      let membershipResult: any = null;
      let provisionalPassword: string | null = null;

      // Criar admin do tenant se fornecido
      if (data.adminData) {
        // Gerar senha provisória se não fornecida
        provisionalPassword =
          data.adminData.password || this.generateProvisionalPassword();
        const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

        const admin = new this.userModel({
          ...data.adminData,
          password: hashedPassword,
          role: Role.TenantAdmin, // Role global deve ser TenantAdmin para admin do tenant
          tenantId: savedTenant._id, // ObjectId do tenant
          isActive: true,
        });

        const savedAdmin = await admin.save({ session });

        // Criar membership como TenantAdmin
        const membership = new this.membershipModel({
          user: savedAdmin._id,
          tenant: savedTenant._id, // ObjectId do tenant
          role: MembershipRole.TenantAdmin,
          isActive: true,
        });

        await membership.save({ session });

        adminResult = savedAdmin;
        membershipResult = membership;
      }

      await session.commitTransaction();
      session.endSession();

      // Enviar e-mail com credenciais se admin foi criado
      if (adminResult && provisionalPassword) {
        try {
          await this.emailService.sendTenantAdminCredentials(
            adminResult.email,
            adminResult.name,
            savedTenant.name,
            (savedTenant._id as any).toString(), // ObjectId como string
            provisionalPassword,
          );
        } catch (emailError) {
          // Log do erro mas não falha a operação
          console.error('Erro ao enviar e-mail de credenciais:', emailError);
        }
      }

      return {
        tenant: savedTenant,
        ...(adminResult && { admin: adminResult }),
        ...(membershipResult && { membership: membershipResult }),
        ...(provisionalPassword && { provisionalPassword }),
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async findAll() {
    return this.tenantModel.find();
  }

  async findById(tenantId: string) {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    return tenant;
  }

  async deactivate(tenantId: string) {
    const updated = await this.tenantModel.findByIdAndUpdate(
      tenantId,
      { isActive: false },
      { new: true },
    );

    if (!updated)
      throw new NotFoundException('Tenant não encontrado para desativar.');
    return updated;
  }
}
