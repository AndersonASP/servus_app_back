import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
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
import { FeedbackService } from '../../notifications/services/feedback.service';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';
import { Types } from 'mongoose';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    private emailService: EmailService,
    private feedbackService: FeedbackService,
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
    try {
      const exists = await this.tenantModel.findOne({
        name: createTenantDto.name,
      });

      if (exists) {
        // Criar feedback de erro
        await this.feedbackService.createTenantError(
          createdBy,
          createTenantDto.name,
          'Já existe um tenant com esse nome'
        );
        throw new ConflictException(
          'Já existe um tenant com esse nome.',
        );
      }

      const tenant = new this.tenantModel({
        ...createTenantDto,
        createdBy,
        isActive: true,
      });

      const savedTenant = await tenant.save();

      // Criar feedback de sucesso
      await this.feedbackService.createTenantSuccess(
        createdBy,
        createTenantDto.name,
        (savedTenant._id as any).toString(),
        false // admin não foi criado
      );

      console.log(`✅ [TenantService] Tenant "${createTenantDto.name}" criado com sucesso`);
      return savedTenant;
    } catch (error) {
      // Se não for ConflictException, criar feedback de erro genérico
      if (!(error instanceof ConflictException)) {
        await this.feedbackService.createTenantError(
          createdBy,
          createTenantDto.name,
          error.message || 'Erro interno do servidor'
        );
      }
      throw error;
    }
  }

  // 🏢 ServusAdmin: Criar Tenant + TenantAdmin (opcional)
  async createWithAdmin(
    data: CreateTenantWithAdminDto,
    createdBy: string,
    creatorRole: Role,
  ) {
    try {
      // Verificar permissão
      if (creatorRole !== Role.ServusAdmin) {
        await this.feedbackService.createErrorFeedback(
          createdBy,
          'Permissão Negada',
          'Apenas administradores do Servus podem criar novas igrejas'
        );
        throw new ForbiddenException('Apenas ServusAdmin pode criar tenants');
      }

      // Verificar se tenant já existe
      const existingTenant = await this.tenantModel.findOne({
        name: data.tenantData.name,
      });

      if (existingTenant) {
        await this.feedbackService.createTenantError(
          createdBy,
          data.tenantData.name,
          'Já existe um tenant com esse nome'
        );
        throw new ConflictException('Já existe um tenant com esse nome');
      }

      // Verificar se admin já existe (se fornecido)
      if (data.adminData) {
        const existingAdmin = await this.userModel.findOne({
          email: data.adminData.email.toLowerCase().trim(),
        });

        if (existingAdmin) {
          await this.feedbackService.createErrorFeedback(
            createdBy,
            'Email Já Cadastrado',
            `Já existe um usuário com o email ${data.adminData.email}`
          );
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

      // Criar feedback de sucesso
      await this.feedbackService.createTenantSuccess(
        createdBy,
        data.tenantData.name,
        (savedTenant._id as any).toString(),
        !!adminResult // admin foi criado
      );

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
          
          // Feedback adicional sobre envio de email
          await this.feedbackService.createInfoFeedback(
            createdBy,
            'Email Enviado',
            `Credenciais de acesso foram enviadas para ${adminResult.email}`,
            (savedTenant._id as any).toString()
          );
        } catch (emailError) {
          // Log do erro mas não falha a operação
          console.error('Erro ao enviar e-mail de credenciais:', emailError);
          
          // Feedback sobre erro no email
          await this.feedbackService.createWarningFeedback(
            createdBy,
            'Email Não Enviado',
            `Tenant criado com sucesso, mas houve erro ao enviar credenciais por email: ${emailError.message}`,
            (savedTenant._id as any).toString()
          );
        }
      }

      console.log(`✅ [TenantService] Tenant "${data.tenantData.name}" criado com sucesso${adminResult ? ' com administrador' : ''}`);
      
      return {
        tenant: savedTenant,
        ...(adminResult && { admin: adminResult }),
        ...(membershipResult && { membership: membershipResult }),
        ...(provisionalPassword && { provisionalPassword }),
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      // Criar feedback de erro genérico se não foi criado antes
      if (!(error instanceof ConflictException) && !(error instanceof ForbiddenException)) {
        await this.feedbackService.createTenantError(
          createdBy,
          data.tenantData.name,
          error.message || 'Erro interno do servidor'
        );
      }
      
      throw error;
    }
    } catch (error) {
      // Criar feedback de erro genérico se não foi criado antes
      if (!(error instanceof ConflictException) && !(error instanceof ForbiddenException)) {
        await this.feedbackService.createTenantError(
          createdBy,
          data.tenantData.name,
          error.message || 'Erro interno do servidor'
        );
      }
      
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

  /**
   * 🔍 DEBUG: Testar lookup de funções diretamente
   */
  async debugFunctionLookup(tenantId: string, userId: string) {
    console.log('🔍 [TenantService] Debug Function Lookup');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);

    try {
      // Buscar membership do usuário
      const membership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
      }).populate('ministry', 'name');

      if (!membership) {
        return { error: 'Membership não encontrado' };
      }

      // Buscar MemberFunctions
      const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
      const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
      
      const memberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        ministryId: membership.ministry,
        status: 'aprovado',
        isActive: true
      });

      console.log(`🔍 Encontradas ${memberFunctions.length} MemberFunctions aprovadas`);

      // Testar lookup manual
      const testPipeline = [
        {
          $match: {
            memberId: new Types.ObjectId(userId),
            ministryId: membership.ministry,
            status: 'aprovado',
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'functions',
            localField: 'functionId',
            foreignField: '_id',
            as: 'functionData'
          }
        },
        { $unwind: { path: '$functionData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            functionId: 1,
            status: 1,
            functionData: 1,
            functionName: '$functionData.name',
            functionDescription: '$functionData.description'
          }
        }
      ];

      const lookupResults = await memberFunctionModel.aggregate(testPipeline);
      console.log(`🔍 Lookup results: ${lookupResults.length}`);

      return {
        userId,
        tenantId,
        membership: {
          id: membership._id,
          ministry: membership.ministry,
        },
        memberFunctions: memberFunctions.map(mf => ({
          id: mf._id,
          functionId: mf.functionId,
          status: mf.status,
        })),
        lookupResults: lookupResults,
        totalFunctions: memberFunctions.length,
        lookupSuccess: lookupResults.length,
      };

    } catch (error) {
      console.error('❌ Erro no debug lookup:', error);
      return {
        error: error.message,
        userId,
        tenantId,
      };
    }
  }

  /**
   * 🔍 DEBUG: Verificar se MemberFunctions foram criadas após aprovação
   */
  async debugMemberFunctionsAfterApproval(tenantId: string, userId: string) {
    console.log('🔍 [TenantService] Debug MemberFunctions After Approval');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);

    try {
      // Buscar membership do usuário
      const membership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
      }).populate('ministry', 'name').populate('user', 'name email');

      if (!membership) {
        return {
          error: 'Membership não encontrado',
          userId,
          tenantId,
        };
      }

      console.log('✅ Membership encontrado:', membership._id);
      console.log('   - Source:', membership.source);
      console.log('   - Ministry:', membership.ministry);
      console.log('   - User:', membership.user);
      console.log('   - IsActive:', membership.isActive);
      console.log('   - NeedsApproval:', membership.needsApproval);

      // Buscar MemberFunctions
      const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
      const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
      
      const memberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        ministryId: membership.ministry,
      }).populate('functionId', 'name description');

      console.log(`🔍 Encontradas ${memberFunctions.length} MemberFunctions`);

      return {
        userId,
        tenantId,
        membership: {
          id: membership._id,
          source: membership.source,
          ministry: membership.ministry,
          user: membership.user,
          isActive: membership.isActive,
          needsApproval: membership.needsApproval,
          approvedAt: membership.approvedAt,
        },
        memberFunctions: memberFunctions.map(mf => ({
          id: mf._id,
          memberId: mf.memberId,
          ministryId: mf.ministryId,
          functionId: mf.functionId,
          function: mf.functionId,
          status: mf.status,
          isActive: mf.isActive,
          approvedBy: mf.approvedBy,
          approvedAt: mf.approvedAt,
        })),
        totalFunctions: memberFunctions.length,
        approvedFunctions: memberFunctions.filter(mf => mf.status === 'aprovado').length,
        pendingFunctions: memberFunctions.filter(mf => mf.status === 'pending').length,
      };

    } catch (error) {
      console.error('❌ Erro no debug:', error);
      return {
        error: error.message,
        userId,
        tenantId,
      };
    }
  }

  /**
   * 🔍 DEBUG: Verificar MemberFunctions de um usuário
   */
  async debugUserFunctions(tenantId: string, userId: string) {
    console.log('🔍 [TenantService] Debug User Functions');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);

    try {
      // Buscar membership do usuário
      const membership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
      }).populate('ministry', 'name').populate('user', 'name email');

      if (!membership) {
        return {
          error: 'Membership não encontrado',
          userId,
          tenantId,
        };
      }

      console.log('✅ Membership encontrado:', membership._id);
      console.log('   - Source:', membership.source);
      console.log('   - Ministry:', membership.ministry);
      console.log('   - User:', membership.user);

      // Buscar MemberFunctions
      const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
      const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
      
      const memberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        ministryId: membership.ministry,
      }).populate('functionId', 'name description');

      console.log(`🔍 Encontradas ${memberFunctions.length} MemberFunctions`);

      return {
        userId,
        tenantId,
        membership: {
          id: membership._id,
          source: membership.source,
          ministry: membership.ministry,
          user: membership.user,
          isActive: membership.isActive,
          needsApproval: membership.needsApproval,
        },
        memberFunctions: memberFunctions.map(mf => ({
          id: mf._id,
          memberId: mf.memberId,
          ministryId: mf.ministryId,
          functionId: mf.functionId,
          function: mf.functionId,
          status: mf.status,
          isActive: mf.isActive,
          approvedBy: mf.approvedBy,
          approvedAt: mf.approvedAt,
        })),
        totalFunctions: memberFunctions.length,
        approvedFunctions: memberFunctions.filter(mf => mf.status === 'aprovado').length,
        pendingFunctions: memberFunctions.filter(mf => mf.status === 'pending').length,
      };

    } catch (error) {
      console.error('❌ Erro no debug:', error);
      return {
        error: error.message,
        userId,
        tenantId,
      };
    }
  }

  /**
   * Busca voluntários pendentes de aprovação no tenant
   * Se ministryId for fornecido, filtra apenas voluntários desse ministério
   */
  async getPendingVolunteers(tenantId: string, ministryId?: string) {
    console.log('🔍 [TenantService] Buscando voluntários pendentes...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Ministry ID type:', typeof ministryId);
    console.log('   - Ministry ID is undefined:', ministryId === undefined);
    console.log('   - Ministry ID is null:', ministryId === null);

    try {
      // Construir query base
      const baseQuery: any = {
        tenant: new Types.ObjectId(tenantId),
        $or: [
          { isActive: false }, // Membros inativos (fluxo antigo)
          { needsApproval: true } // Membros que precisam aprovação (fluxo novo)
        ],
        ministry: { $exists: true, $ne: null } // Apenas membros com ministério
      };

      // Se ministryId foi fornecido, filtrar por ministério específico
      if (ministryId && ministryId.trim() !== '') {
        baseQuery.ministry = new Types.ObjectId(ministryId);
        console.log('🔍 [TenantService] Filtrando por ministério específico:', ministryId);
        console.log('🔍 [TenantService] Query final com filtro:', JSON.stringify(baseQuery, null, 2));
      } else {
        console.log('🔍 [TenantService] Nenhum ministryId fornecido ou vazio, retornando todos os ministérios');
        console.log('🔍 [TenantService] Query final sem filtro:', JSON.stringify(baseQuery, null, 2));
      }

      // Buscar memberships que precisam de aprovação do líder
      const memberships = await this.membershipModel
        .find(baseQuery)
        .populate('user', '_id name email phone role isActive createdAt profileCompleted')
        .populate('ministry', 'name')
        .populate('branch', 'name')
        .populate('tenant', 'name')
        .sort({ createdAt: -1 }); // Mais recentes primeiro

      console.log(`✅ Encontrados ${memberships.length} voluntários pendentes de aprovação`);

      // Converter para formato esperado pelo frontend
      const pendingVolunteers = memberships.map(membership => {
        const user = membership.user as any;
        
        console.log('🔍 [TenantService] Processando membership:', membership._id);
        console.log('🔍 [TenantService] User populado:', user);
        console.log('🔍 [TenantService] User._id:', user?._id);
        console.log('🔍 [TenantService] User._id tipo:', typeof user?._id);
        
        // Verificar se o usuário existe e tem ID válido
        if (!user || !user._id) {
          console.warn('⚠️ Usuário sem ID válido encontrado:', user);
          return null;
        }
        
        const volunteerData = {
          id: user._id.toString(), // ✅ ID do usuário como string
          userId: user._id.toString(), // ✅ ID adicional para compatibilidade
          _id: user._id.toString(), // ✅ ID adicional para compatibilidade
          name: user.name || 'Nome não informado',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'volunteer',
          isActive: user.isActive || false,
          profileCompleted: user.profileCompleted || false,
          status: 'pending',
          source: membership.source || 'manual', // Origem do voluntário
          sourceData: membership.sourceData || {}, // Dados específicos da origem
          ministry: {
            id: (membership.ministry as any)?._id?.toString() || '',
            name: (membership.ministry as any)?.name || 'Ministério não informado',
          },
          branch: membership.branch ? {
            id: (membership.branch as any)._id.toString(),
            name: (membership.branch as any).name,
          } : null,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        };
        
        console.log('🔍 [TenantService] Volunteer data criado:', volunteerData);
        return volunteerData;
      }).filter(volunteer => volunteer !== null); // Filtrar voluntários nulos

      console.log('✅ Voluntários pendentes convertidos para formato do frontend');
      return pendingVolunteers;

    } catch (error) {
      console.error('❌ Erro ao buscar voluntários pendentes:', error);
      throw new NotFoundException('Erro ao buscar voluntários pendentes');
    }
  }

  /**
   * Busca funções disponíveis de um ministério
   */
  async getMinistryFunctions(tenantId: string, ministryId: string) {
    console.log('🔍 [TenantService] Buscando funções do ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);

    try {
      const { MinistryFunctionSchema } = await import('../../functions/schemas/ministry-function.schema');
      const ministryFunctionModel = this.membershipModel.db.model('MinistryFunction', MinistryFunctionSchema);

      console.log('🔍 [TenantService] Modelo criado:', ministryFunctionModel.modelName);
      console.log('🔍 [TenantService] Collection name:', ministryFunctionModel.collection.name);

      const ministryObjectId = new Types.ObjectId(ministryId);
      const query = {
        ministryId: ministryObjectId,
        isActive: true,
      };
      console.log('🔍 [TenantService] Query:', JSON.stringify(query, null, 2));
      console.log('🔍 [TenantService] Ministry ObjectId:', ministryObjectId);
      console.log('🔍 [TenantService] Ministry ObjectId string:', ministryObjectId.toString());

      // Primeiro, vamos ver todas as funções da collection
      const allFunctions = await ministryFunctionModel.find({}).select('name description level ministryId isActive').sort({ name: 1 });
      console.log('🔍 [TenantService] TODAS as funções na collection:', allFunctions.length);
      console.log('🔍 [TenantService] Exemplos de funções:', allFunctions.slice(0, 3));
      
      // Vamos ver a estrutura completa de uma função
      if (allFunctions.length > 0) {
        console.log('🔍 [TenantService] ESTRUTURA COMPLETA da primeira função:');
        console.log('   - _id:', allFunctions[0]._id);
        console.log('   - name:', (allFunctions[0] as any).name);
        console.log('   - description:', (allFunctions[0] as any).description);
        console.log('   - level:', (allFunctions[0] as any).level);
        console.log('   - ministryId:', (allFunctions[0] as any).ministryId);
        console.log('   - ministryId type:', typeof (allFunctions[0] as any).ministryId);
        console.log('   - isActive:', (allFunctions[0] as any).isActive);
      }

      // Vamos tentar diferentes queries para encontrar as funções
      console.log('🔍 [TenantService] Tentando query 1: ministryId como ObjectId com populate');
      const functions1 = await ministryFunctionModel.find({
        ministryId: ministryObjectId,
        isActive: true
      }).populate('functionId', 'name description level').sort({ 'functionId.name': 1 });
      console.log('🔍 [TenantService] Resultado query 1:', functions1.length);
      if (functions1.length > 0) {
        console.log('🔍 [TenantService] Primeira função query 1:', functions1[0]);
        console.log('🔍 [TenantService] - functionId:', (functions1[0] as any).functionId);
        console.log('🔍 [TenantService] - functionId type:', typeof (functions1[0] as any).functionId);
      }

      console.log('🔍 [TenantService] Tentando query 2: ministryId como string');
      const functions2 = await ministryFunctionModel.find({
        ministryId: ministryId,
        isActive: true
      }).select('name description level').sort({ name: 1 });
      console.log('🔍 [TenantService] Resultado query 2:', functions2.length);

      console.log('🔍 [TenantService] Tentando query 3: ministryId como ObjectId sem isActive');
      const functions3 = await ministryFunctionModel.find({
        ministryId: ministryObjectId
      }).select('name description level').sort({ name: 1 });
      console.log('🔍 [TenantService] Resultado query 3:', functions3.length);

      // Vamos ver se o problema é que o campo ministryId está vazio
      console.log('🔍 [TenantService] Tentando query 4: sem filtro de ministryId');
      const functions4 = await ministryFunctionModel.find({}).select('name description level ministryId').sort({ name: 1 });
      console.log('🔍 [TenantService] Resultado query 4:', functions4.length);
      if (functions4.length > 0) {
        console.log('🔍 [TenantService] Primeira função sem filtro:');
        console.log('   - name:', (functions4[0] as any).name);
        console.log('   - ministryId:', (functions4[0] as any).ministryId);
        console.log('   - ministryId type:', typeof (functions4[0] as any).ministryId);
      }

      // Usar a query que funcionou
      const functions = functions1.length > 0 ? functions1 : 
                       functions2.length > 0 ? functions2 : 
                       functions3.length > 0 ? functions3 :
                       functions4;

      console.log(`✅ Encontradas ${functions.length} funções do ministério`);
      console.log('🔍 [TenantService] Funções encontradas:', functions);

      const formattedFunctions = functions.map((func: any) => {
        const functionData = func.functionId;
        return {
          id: functionData?._id?.toString() || func._id.toString(), // Usar ID da Function real, não da MinistryFunction
          name: functionData?.name || 'Nome não encontrado',
          description: functionData?.description ? functionData.description : null,
          level: functionData?.level || 1,
        };
      });

      console.log('🔍 [TenantService] Funções formatadas:', formattedFunctions);
      return formattedFunctions;

    } catch (error) {
      console.error('❌ Erro ao buscar funções do ministério:', error);
      throw new NotFoundException('Erro ao buscar funções do ministério');
    }
  }

  /**
   * Aprova um voluntário pendente
   */
  async approveVolunteer(
    tenantId: string, 
    userId: string, 
    approvedBy: string, 
    functionId?: string, 
    functionIds?: string[], 
    notes?: string
  ) {
    console.log('🎉 [TenantService] Aprovando voluntário...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);
    console.log('   - Approved By:', approvedBy);
    console.log('   - Function ID:', functionId);
    console.log('   - Function IDs:', functionIds);
    console.log('   - Function IDs type:', typeof functionIds);
    console.log('   - Function IDs length:', functionIds?.length);
    console.log('   - Notes:', notes);

    try {
      // 1. Buscar membership pendente
      const membership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        $or: [
          { isActive: false },
          { needsApproval: true }
        ]
      });

      if (!membership) {
        throw new NotFoundException('Membership pendente não encontrado');
      }

      console.log('✅ Membership encontrado:', membership._id);
      console.log('✅ Origem do voluntário:', membership.source);

      // 2. Verificar se precisa de função baseado na origem
      const finalFunctionIds = functionIds || (functionId ? [functionId] : []);
      console.log('🔍 [TenantService] Final Function IDs:', finalFunctionIds);
      console.log('🔍 [TenantService] Final Function IDs length:', finalFunctionIds.length);
      console.log('🔍 [TenantService] Membership source:', membership.source);
      
      if (membership.source === 'invite' && finalFunctionIds.length === 0) {
        console.log('❌ [TenantService] ERRO: Voluntário de invite sem funções selecionadas');
        throw new BadRequestException('Para voluntários vindos de código de convite, é obrigatório atribuir pelo menos uma função');
      }

      // 3. Ativar membership
      await this.membershipModel.findByIdAndUpdate(membership._id, {
        isActive: true,
        needsApproval: false,
        approvedBy: new Types.ObjectId(approvedBy),
        approvedAt: new Date(),
      });

      console.log('✅ Membership ativado');

      // 4. Ativar usuário e definir tenantId
      await this.userModel.findByIdAndUpdate(userId, {
        isActive: true,
        tenantId: new Types.ObjectId(tenantId), // ✅ Adicionar tenantId na aprovação
      });

      console.log('✅ Usuário ativado e tenantId definido');

      // 5. Gerenciar MemberFunctions baseado na origem
      try {
        const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
        const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
        
        if (membership.source === 'invite' && finalFunctionIds.length > 0) {
          // Para invites: criar novas MemberFunctions com funções escolhidas
          console.log('🎯 Criando MemberFunctions para voluntário de invite');
          console.log('   - User ID:', userId);
          console.log('   - Ministry ID:', membership.ministry);
          console.log('   - Funções selecionadas:', finalFunctionIds);
          console.log('   - Total de funções a criar:', finalFunctionIds.length);
          
          let successCount = 0;
          let errorCount = 0;
          
          for (const funcId of finalFunctionIds) {
            try {
              console.log(`🔧 Processando função ${funcId}...`);
              
              const memberFunctionData = {
                memberId: new Types.ObjectId(userId), // ✅ Usar memberId conforme schema
                ministryId: membership.ministry,
                functionId: new Types.ObjectId(funcId),
                tenantId: new Types.ObjectId(tenantId),
                status: 'aprovado', // Aprovado diretamente
                approvedBy: approvedBy, // ✅ Manter como string conforme schema
                approvedAt: new Date(),
                isActive: true,
                notes: notes,
                level: 'iniciante', // ✅ Adicionar level padrão
                priority: 1, // ✅ Adicionar priority padrão
              };
              
              console.log('🔧 Criando MemberFunction com dados:', memberFunctionData);
              
              const memberFunction = new memberFunctionModel(memberFunctionData);
              const savedMemberFunction = await memberFunction.save();
              console.log('✅ MemberFunction criada e aprovada:', savedMemberFunction._id, 'para função:', funcId);
              successCount++;
            } catch (error) {
              console.error('❌ Erro ao criar MemberFunction para função', funcId, ':', error.message);
              console.error('❌ Stack trace:', error.stack);
              errorCount++;
              // Continuar com outras funções mesmo se uma falhar
            }
          }
          
          console.log(`📊 Resultado da criação de MemberFunctions:`);
          console.log(`   - Sucessos: ${successCount}`);
          console.log(`   - Erros: ${errorCount}`);
          console.log(`   - Total processado: ${finalFunctionIds.length}`);
          
        } else if (membership.source === 'form') {
          // Para formulários: aprovar MemberFunctions existentes que foram criadas durante a submissão
          console.log('🎯 Aprovando MemberFunctions existentes do formulário');
          console.log('   - User ID:', userId);
          console.log('   - Ministry ID:', membership.ministry);
          
          // Buscar MemberFunctions existentes com status pending
          const existingMemberFunctions = await memberFunctionModel.find({
            memberId: new Types.ObjectId(userId), // ✅ Usar memberId conforme schema
            ministryId: membership.ministry,
            status: 'pending'
          });
          
          console.log(`🔍 Encontradas ${existingMemberFunctions.length} MemberFunctions pendentes`);
          existingMemberFunctions.forEach((mf, index) => {
            console.log(`   - ${index + 1}: ${mf._id} - Function: ${mf.functionId} - Status: ${mf.status}`);
          });
          
          if (existingMemberFunctions.length > 0) {
            // Aprovar todas as MemberFunctions pendentes
            const updateResult = await memberFunctionModel.updateMany(
              {
                memberId: new Types.ObjectId(userId), // ✅ Usar memberId conforme schema
                ministryId: membership.ministry,
                status: 'pending'
              },
              {
                status: 'aprovado',
                approvedBy: approvedBy, // ✅ Manter como string conforme schema
                approvedAt: new Date(),
                notes: notes,
                isActive: true, // ✅ Ativar as funções
              }
            );

            console.log(`✅ MemberFunctions do formulário aprovadas: ${updateResult.modifiedCount} atualizadas`);
          } else {
            console.warn('⚠️ Nenhuma MemberFunction pendente encontrada para voluntário de formulário');
            console.log('🔍 Tentando buscar MemberFunctions com outros status...');
            
            // Buscar todas as MemberFunctions do usuário para debug
            const allMemberFunctions = await memberFunctionModel.find({
              memberId: new Types.ObjectId(userId),
              ministryId: membership.ministry
            });
            
            console.log(`🔍 Total de MemberFunctions encontradas: ${allMemberFunctions.length}`);
            allMemberFunctions.forEach((mf, index) => {
              console.log(`   - ${index + 1}: ${mf._id} - Function: ${mf.functionId} - Status: ${mf.status} - Active: ${mf.isActive}`);
            });
          }
        }

      } catch (memberFunctionError) {
        console.warn('⚠️ Erro ao gerenciar MemberFunctions:', memberFunctionError.message);
        // Não falhar a operação por erro nas funções
      }

      console.log('🎉 Voluntário aprovado com sucesso!');

      return {
        userId: userId,
        membershipId: membership._id,
        source: membership.source,
        functionId: functionId,
        functionIds: finalFunctionIds,
        approvedAt: new Date(),
        approvedBy: approvedBy,
      };

    } catch (error) {
      console.error('❌ Erro ao aprovar voluntário:', error);
      throw error;
    }
  }

  /**
   * Rejeita um voluntário pendente
   */
  async rejectVolunteer(
    tenantId: string, 
    userId: string, 
    rejectedBy: string, 
    notes?: string
  ) {
    console.log('❌ [TenantService] Rejeitando voluntário...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);
    console.log('   - Rejected By:', rejectedBy);

    try {
      // 1. Buscar membership pendente
      const membership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        $or: [
          { isActive: false },
          { needsApproval: true }
        ]
      });

      if (!membership) {
        throw new NotFoundException('Membership pendente não encontrado');
      }

      console.log('✅ Membership encontrado:', membership._id);

      // 2. Marcar membership como rejeitado
      await this.membershipModel.findByIdAndUpdate(membership._id, {
        isActive: false,
        needsApproval: false,
        rejectedBy: new Types.ObjectId(rejectedBy),
        rejectedAt: new Date(),
        rejectionNotes: notes,
      });

      console.log('✅ Membership marcado como rejeitado');

      // 3. Desativar usuário
      await this.userModel.findByIdAndUpdate(userId, {
        isActive: false,
      });

      console.log('✅ Usuário desativado');

      // 4. Rejeitar MemberFunctions existentes
      try {
        const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
        const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
        
        const updateResult = await memberFunctionModel.updateMany(
          {
            memberId: new Types.ObjectId(userId),
            ministryId: membership.ministry,
            status: 'pending'
          },
          {
            status: 'rejeitado',
            approvedBy: rejectedBy,
            approvedAt: new Date(),
            notes: notes,
            isActive: false,
          }
        );

        console.log(`✅ MemberFunctions rejeitadas: ${updateResult.modifiedCount} atualizadas`);
      } catch (memberFunctionError) {
        console.warn('⚠️ Erro ao rejeitar MemberFunctions:', memberFunctionError.message);
      }

      console.log('❌ Voluntário rejeitado com sucesso!');

      return {
        userId: userId,
        membershipId: membership._id,
        rejectedAt: new Date(),
        rejectedBy: rejectedBy,
      };

    } catch (error) {
      console.error('❌ Erro ao rejeitar voluntário:', error);
      throw error;
    }
  }

  /**
   * 🔍 DEBUG: Método para verificar dados brutos dos voluntários
   */
  async debugVolunteers(tenantId: string) {
    console.log('🔍 [DEBUG] Verificando dados brutos dos voluntários...');
    console.log('   - Tenant ID:', tenantId);

    try {
      // 1. Buscar memberships brutos
      const memberships = await this.membershipModel
        .find({
          tenant: new Types.ObjectId(tenantId),
          $or: [
            { isActive: false },
            { needsApproval: true }
          ],
          ministry: { $exists: true, $ne: null }
        })
        .sort({ createdAt: -1 });

      console.log(`🔍 [DEBUG] Encontrados ${memberships.length} memberships brutos`);

      // 2. Para cada membership, buscar o user separadamente
      const debugData: any[] = [];
      for (const membership of memberships) {
        console.log('🔍 [DEBUG] Membership ID:', membership._id);
        console.log('🔍 [DEBUG] User ID:', membership.user);
        
        const user = await this.userModel.findById(membership.user).select('_id name email phone role isActive createdAt profileCompleted');
        console.log('🔍 [DEBUG] User encontrado:', user);
        
        debugData.push({
          membershipId: membership._id,
          membershipUser: membership.user,
          membershipSource: membership.source,
          membershipIsActive: membership.isActive,
          membershipNeedsApproval: membership.needsApproval,
          user: user,
          userHasId: !!user?._id,
          userIdType: typeof user?._id,
        });
      }

      return {
        tenantId,
        totalMemberships: memberships.length,
        debugData,
        rawMemberships: memberships.map(m => ({
          _id: m._id,
          user: m.user,
          source: m.source,
          isActive: m.isActive,
          needsApproval: m.needsApproval,
        }))
      };

    } catch (error) {
      console.error('❌ [DEBUG] Erro ao verificar dados:', error);
      throw error;
    }
  }

  /**
   * 🔍 DEBUG: Método para verificar funções de um ministério
   */
  async debugMinistryFunctions(tenantId: string, ministryId: string) {
    console.log('🔍 [DEBUG] Verificando funções do ministério...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Ministry ID:', ministryId);

    try {
      // 1. Verificar se o ministério existe
      const { MinistrySchema } = await import('../../ministries/schemas/ministry.schema');
      const ministryModel = this.membershipModel.db.model('Ministry', MinistrySchema);
      const ministry = await ministryModel.findById(ministryId);
      console.log('🔍 [DEBUG] Ministério encontrado:', ministry);

      // 2. Verificar todas as funções na collection
      const { MinistryFunctionSchema } = await import('../../functions/schemas/ministry-function.schema');
      const ministryFunctionModel = this.membershipModel.db.model('MinistryFunction', MinistryFunctionSchema);
      
      const allFunctions = await ministryFunctionModel.find({}).select('name description level ministry isActive').sort({ name: 1 });
      console.log('🔍 [DEBUG] TODAS as funções na collection:', allFunctions.length);
      console.log('🔍 [DEBUG] Exemplos de funções:', allFunctions.slice(0, 5));

      // 3. Verificar funções específicas do ministério
      const ministryFunctions = await ministryFunctionModel.find({
        ministry: new Types.ObjectId(ministryId)
      }).select('name description level ministry isActive').sort({ name: 1 });
      console.log('🔍 [DEBUG] Funções do ministério específico:', ministryFunctions.length);
      console.log('🔍 [DEBUG] Funções encontradas:', ministryFunctions);

      // 4. Verificar funções ativas do ministério
      const activeFunctions = await ministryFunctionModel.find({
        ministry: new Types.ObjectId(ministryId),
        isActive: true
      }).select('name description level ministry isActive').sort({ name: 1 });
      console.log('🔍 [DEBUG] Funções ativas do ministério:', activeFunctions.length);
      console.log('🔍 [DEBUG] Funções ativas encontradas:', activeFunctions);

      return {
        tenantId,
        ministryId,
        ministry: ministry,
        totalFunctions: allFunctions.length,
        ministryFunctions: ministryFunctions.length,
        activeFunctions: activeFunctions.length,
        allFunctions: allFunctions.slice(0, 10), // Primeiras 10
        ministryFunctionsList: ministryFunctions,
        activeFunctionsList: activeFunctions,
      };

    } catch (error) {
      console.error('❌ [DEBUG] Erro ao verificar funções:', error);
      throw error;
    }
  }

  /**
   * 🔍 DEBUG: Método para verificar MemberFunctions de um usuário
   */
  async debugMemberFunctions(tenantId: string, userId: string) {
    console.log('🔍 [DEBUG] Verificando MemberFunctions do usuário...');
    console.log('   - Tenant ID:', tenantId);
    console.log('   - User ID:', userId);

    try {
      // 1. Verificar se o usuário existe
      const user = await this.userModel.findById(userId).select('_id name email phone role isActive createdAt profileCompleted');
      console.log('🔍 [DEBUG] Usuário encontrado:', user);

      // 2. Verificar todas as MemberFunctions do usuário
      const { MemberFunctionSchema } = await import('../../functions/schemas/member-function.schema');
      const memberFunctionModel = this.membershipModel.db.model('MemberFunction', MemberFunctionSchema);
      
      const allMemberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId)
      }).populate('ministryId', 'name').populate('functionId', 'name').sort({ createdAt: -1 });
      
      console.log('🔍 [DEBUG] MemberFunctions encontradas:', allMemberFunctions.length);
      console.log('🔍 [DEBUG] MemberFunctions:', allMemberFunctions);

      // 3. Verificar MemberFunctions pendentes
      const pendingMemberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        status: 'pending'
      }).populate('ministryId', 'name').populate('functionId', 'name');
      
      console.log('🔍 [DEBUG] MemberFunctions pendentes:', pendingMemberFunctions.length);

      // 4. Verificar MemberFunctions aprovadas
      const approvedMemberFunctions = await memberFunctionModel.find({
        memberId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        status: 'aprovado'
      }).populate('ministryId', 'name').populate('functionId', 'name');
      
      console.log('🔍 [DEBUG] MemberFunctions aprovadas:', approvedMemberFunctions.length);

      return {
        tenantId,
        userId,
        user: user,
        totalMemberFunctions: allMemberFunctions.length,
        pendingMemberFunctions: pendingMemberFunctions.length,
        approvedMemberFunctions: approvedMemberFunctions.length,
        allMemberFunctions: allMemberFunctions,
        pendingMemberFunctionsList: pendingMemberFunctions,
        approvedMemberFunctionsList: approvedMemberFunctions,
      };

    } catch (error) {
      console.error('❌ [DEBUG] Erro ao verificar MemberFunctions:', error);
      throw error;
    }
  }
}
