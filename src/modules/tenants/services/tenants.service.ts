import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../schemas/tenant.schema';
import { CreateTenantDto } from '../DTO/create-tenant.dto';
import { CreateTenantWithAdminDto } from '../DTO/create-tenant-with-admin.dto';
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

  /**
   * Gera um UUIDv7 único para o tenant
   */
  private async generateUuidTenantId(): Promise<string> {
    let tenantId: string = '';
    let exists = true;

    while (exists) {
      // Gera um UUIDv7 (timestamp-based, ordenável)
      tenantId = uuidv7();

      // Verifica se já existe (extremamente improvável com UUIDv7)
      const existingTenant = await this.tenantModel.findOne({ tenantId });
      exists = !!existingTenant;
    }

    return tenantId;
  }

  /**
   * Gera uma senha provisória segura
   */
  private generateProvisionalPassword(): string {
    // Gera uma senha de 8 caracteres com letras e números
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';

    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  async create(createTenantDto: CreateTenantDto, createdBy: string) {
    const exists = await this.tenantModel.findOne({
      $or: [
        { name: createTenantDto.name },
        { tenantId: createTenantDto.tenantId },
      ],
    });

    if (exists)
      throw new ConflictException(
        'Já existe um tenant com esse nome ou tenantId.',
      );

    const baseId = (createTenantDto.tenantId || createTenantDto.name)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20);

    const tenantId = createTenantDto.tenantId || `${baseId}-${Date.now()}`;

    const tenant = new this.tenantModel({
      ...createTenantDto,
      tenantId,
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
      $or: [
        { name: data.tenantData.name },
        { tenantId: data.tenantData.tenantId },
      ],
    });

    if (existingTenant) {
      throw new ConflictException('Já existe um tenant com esse nome ou ID');
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
      // Gerar UUIDv7 único para o tenant
      const tenantId = await this.generateUuidTenantId();

      const tenant = new this.tenantModel({
        ...data.tenantData,
        tenantId,
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
          role: Role.Volunteer, // Role global sempre volunteer
          tenantId: null, // Usuários não têm tenantId fixo
          isActive: true,
        });

        const savedAdmin = await admin.save({ session });

        // Criar membership como TenantAdmin
        const membership = new this.membershipModel({
          user: savedAdmin._id,
          tenant: savedTenant._id,
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
            savedTenant.tenantId,
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
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    return tenant;
  }

  async deactivate(tenantId: string) {
    const updated = await this.tenantModel.findOneAndUpdate(
      { tenantId },
      { isActive: false },
      { new: true },
    );

    if (!updated)
      throw new NotFoundException('Tenant não encontrado para desativar.');
    return updated;
  }
}
