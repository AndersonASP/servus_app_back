import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FormSubmission, FormSubmissionStatus } from '../schemas/form-submission.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import { User } from '../../users/schema/user.schema';
import { MembershipRole, Role } from 'src/common/enums/role.enum';
import { LeaderApprovalDto } from '../dto/custom-form.dto';
import { NotificationService } from '../../notifications/services/notification.service';
import { MemberFunctionService, CreateMemberFunctionDto } from '../../functions/services/member-function.service';
import { MemberFunctionStatus, MemberFunctionLevel } from '../../functions/schemas/member-function.schema';
import * as bcrypt from 'bcrypt';

/**
 * 🎯 Serviço específico para aprovações de voluntários por líderes de ministério
 * Responsabilidade única: Gerenciar todo o fluxo de aprovação de voluntários
 */
@Injectable()
export class MinistryApprovalService {
  private readonly logger = new Logger(MinistryApprovalService.name);

  constructor(
    @InjectModel('FormSubmission') private formSubmissionModel: Model<FormSubmission>,
    @InjectModel('Membership') private membershipModel: Model<Membership>,
    @InjectModel('User') private userModel: Model<User>,
    private readonly notificationService: NotificationService,
    private readonly memberFunctionService: MemberFunctionService,
  ) {}

  /**
   * 🔍 Busca submissões pendentes para um ministério específico
   * Apenas líderes do ministério podem acessar
   */
  async getMinistryPendingSubmissions(
    ministryId: string,
    tenantId: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ submissions: FormSubmission[]; pagination: any }> {
    this.logger.log(`[getMinistryPendingSubmissions] Buscando submissões pendentes para ministério ${ministryId}`);

    // 1. Validar se o usuário é líder deste ministério
    await this.validateMinistryLeaderAccess(currentUserId, ministryId, tenantId);

    // 2. Construir query para submissões pendentes do ministério
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      preferredMinistry: new Types.ObjectId(ministryId),
      status: FormSubmissionStatus.PENDING,
    };

    this.logger.log(`[getMinistryPendingSubmissions] Query: ${JSON.stringify(query)}`);

    const skip = (page - 1) * limit;
    
    const [submissions, total] = await Promise.all([
      this.formSubmissionModel
        .find(query)
        .populate('preferredMinistry', 'name')
        .populate('formId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.formSubmissionModel.countDocuments(query),
    ]);

    this.logger.log(`[getMinistryPendingSubmissions] Encontradas ${submissions.length} submissões de ${total} total`);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ✅ Aprova uma submissão de voluntário pelo líder do ministério
   */
  async approveVolunteerSubmission(
    submissionId: string,
    approvalDto: LeaderApprovalDto,
    tenantId: string,
    currentUserId: string,
  ): Promise<FormSubmission> {
    this.logger.log(`[approveVolunteerSubmission] Aprovando submissão ${submissionId} pelo usuário ${currentUserId}`);

    // 1. Buscar a submissão
    const submission = await this.formSubmissionModel.findOne({
      _id: new Types.ObjectId(submissionId),
      tenantId: new Types.ObjectId(tenantId),
      status: FormSubmissionStatus.PENDING,
    }).populate('preferredMinistry', 'name');

    if (!submission) {
      throw new NotFoundException('Submissão não encontrada ou já processada');
    }

    // 2. Validar se o usuário é líder do ministério da submissão
    if (!submission.preferredMinistry) {
      throw new BadRequestException('Submissão não possui ministério preferido');
    }
    
    await this.validateMinistryLeaderAccess(
      currentUserId, 
      submission.preferredMinistry._id.toString(), 
      tenantId
    );

    // 3. Se aprovado, criar usuário e membership automaticamente
    let createdUserId: string | null = null;
    let createdMembershipId: string | null = null;

    if (approvalDto.status === 'approved') {
      this.logger.log(`[approveVolunteerSubmission] Criando usuário e membership para submissão aprovada`);
      
      try {
        const { userId, membershipId } = await this.createUserAndMembershipFromSubmission(
          submission,
          tenantId,
          currentUserId
        );
        
        createdUserId = userId;
        createdMembershipId = membershipId;
        
        this.logger.log(`[approveVolunteerSubmission] Usuário ${userId} e membership ${membershipId} criados com sucesso`);
      } catch (createError) {
        this.logger.error(`[approveVolunteerSubmission] Erro ao criar usuário/membership: ${createError.message}`);
        throw new BadRequestException(`Erro ao criar usuário: ${createError.message}`);
      }
    }

    // 4. Atualizar a submissão com a decisão do líder
    const updateData = {
      status: approvalDto.status === 'approved' ? FormSubmissionStatus.APPROVED : FormSubmissionStatus.REJECTED,
      approvedByLeader: new Types.ObjectId(currentUserId),
      leaderApprovalNotes: approvalDto.leaderApprovalNotes,
      leaderApprovedAt: new Date(),
      createdUserId: createdUserId ? new Types.ObjectId(createdUserId) : null,
      createdMembershipId: createdMembershipId ? new Types.ObjectId(createdMembershipId) : null,
    };

    const updatedSubmission = await this.formSubmissionModel.findByIdAndUpdate(
      submissionId,
      updateData,
      { new: true }
    ).populate('preferredMinistry', 'name')
     .populate('approvedByLeader', 'name email');

    if (!updatedSubmission) {
      throw new NotFoundException('Submissão não encontrada após atualização');
    }

    this.logger.log(`[approveVolunteerSubmission] Submissão ${submissionId} ${approvalDto.status} com sucesso`);

    // 🆕 Notificar voluntário sobre a decisão
    try {
      const leaderName = (updatedSubmission.approvedByLeader as any)?.name || 'Líder do Ministério';
      await this.notificationService.notifyVolunteerAboutDecision(
        updatedSubmission,
        approvalDto.status,
        leaderName,
        approvalDto.leaderApprovalNotes,
      );
    } catch (notificationError) {
      this.logger.error(`[approveVolunteerSubmission] Erro ao enviar notificação: ${notificationError.message}`);
      // Não falhar a operação por erro de notificação
    }

    return updatedSubmission;
  }

  /**
   * 🔒 Valida se o usuário é líder do ministério especificado
   */
  private async validateMinistryLeaderAccess(
    userId: string,
    ministryId: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log(`[validateMinistryLeaderAccess] Validando acesso do usuário ${userId} ao ministério ${ministryId}`);

    const membership = await this.membershipModel.findOne({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      ministry: new Types.ObjectId(ministryId),
      role: MembershipRole.Leader,
      isActive: true,
    });

    if (!membership) {
      this.logger.warn(`[validateMinistryLeaderAccess] Usuário ${userId} não é líder do ministério ${ministryId}`);
      throw new ForbiddenException('Você não é líder deste ministério');
    }

    this.logger.log(`[validateMinistryLeaderAccess] Acesso validado para usuário ${userId}`);
  }

  /**
   * 📊 Busca estatísticas de aprovações para um ministério
   */
  async getMinistryApprovalStats(
    ministryId: string,
    tenantId: string,
    currentUserId: string,
  ): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    this.logger.log(`[getMinistryApprovalStats] Buscando estatísticas para ministério ${ministryId}`);

    // Validar acesso
    await this.validateMinistryLeaderAccess(currentUserId, ministryId, tenantId);

    const query = {
      tenantId: new Types.ObjectId(tenantId),
      preferredMinistry: new Types.ObjectId(ministryId),
    };

    const [pending, approved, rejected, total] = await Promise.all([
      this.formSubmissionModel.countDocuments({ ...query, status: FormSubmissionStatus.PENDING }),
      this.formSubmissionModel.countDocuments({ ...query, status: FormSubmissionStatus.APPROVED }),
      this.formSubmissionModel.countDocuments({ ...query, status: FormSubmissionStatus.REJECTED }),
      this.formSubmissionModel.countDocuments(query),
    ]);

    return { pending, approved, rejected, total };
  }

  /**
   * 📋 Busca todas as submissões pendentes dos ministérios do líder atual
   * Mostra apenas voluntários dos ministérios onde o usuário é líder
   */
  async getLeaderPendingSubmissions(
    leaderId: string,
    tenantId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ submissions: FormSubmission[]; pagination: any }> {
    this.logger.log(`[getLeaderPendingSubmissions] Buscando submissões pendentes para líder ${leaderId}`);

    // 1. Buscar ministérios onde o usuário é líder
    const leaderMemberships = await this.membershipModel
      .find({
        user: new Types.ObjectId(leaderId),
        tenant: new Types.ObjectId(tenantId),
        role: MembershipRole.Leader,
        isActive: true,
      })
      .populate('ministry', 'name')
      .lean();

    if (leaderMemberships.length === 0) {
      this.logger.warn(`[getLeaderPendingSubmissions] Usuário ${leaderId} não é líder de nenhum ministério`);
      return { submissions: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    const ministryIds = leaderMemberships
      .map(m => m.ministry)
      .filter(Boolean)
      .map(m => (m as any)._id);

    this.logger.log(`[getLeaderPendingSubmissions] Ministérios do líder: ${ministryIds.length}`);

    // 2. Buscar submissões pendentes dos ministérios do líder
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      preferredMinistry: { $in: ministryIds },
      status: FormSubmissionStatus.PENDING,
    };

    this.logger.log(`[getLeaderPendingSubmissions] Query: ${JSON.stringify(query)}`);

    const skip = (page - 1) * limit;
    const [submissions, total] = await Promise.all([
      this.formSubmissionModel
        .find(query)
        .populate('formId', 'title')
        .populate('preferredMinistry', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.formSubmissionModel.countDocuments(query),
    ]);

    this.logger.log(`[getLeaderPendingSubmissions] Encontradas ${submissions.length} submissões pendentes`);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 🔍 Busca histórico de aprovações de um líder
   */
  async getLeaderApprovalHistory(
    leaderId: string,
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ submissions: FormSubmission[]; pagination: any }> {
    this.logger.log(`[getLeaderApprovalHistory] Buscando histórico do líder ${leaderId}`);

    const query = {
      tenantId: new Types.ObjectId(tenantId),
      approvedByLeader: new Types.ObjectId(leaderId),
    };

    const skip = (page - 1) * limit;
    
    const [submissions, total] = await Promise.all([
      this.formSubmissionModel
        .find(query)
        .populate('preferredMinistry', 'name')
        .populate('formId', 'title')
        .sort({ leaderApprovedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.formSubmissionModel.countDocuments(query),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 👤 Cria usuário e membership a partir de uma submissão aprovada
   */
  private async createUserAndMembershipFromSubmission(
    submission: FormSubmission,
    tenantId: string,
    createdBy: string,
  ): Promise<{ userId: string; membershipId: string }> {
    this.logger.log(`[createUserAndMembershipFromSubmission] Criando usuário para submissão ${submission._id}`);

    // 1. Verificar se já existe usuário com este email
    const existingUser = await this.userModel.findOne({
      email: submission.email,
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingUser) {
      this.logger.warn(`[createUserAndMembershipFromSubmission] Usuário já existe com email ${submission.email}`);
      throw new BadRequestException('Já existe um usuário com este email');
    }

    // 2. Gerar senha temporária
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 3. Criar usuário
    const newUser = new this.userModel({
      name: submission.volunteerName,
      email: submission.email,
      phone: submission.phone,
      password: hashedPassword,
      role: Role.Volunteer, // Role padrão para usuários criados via formulário
      tenantId: new Types.ObjectId(tenantId),
      branchId: submission.branchId || null,
      isActive: true,
      picture: '', // Será preenchido posteriormente se necessário
    });

    const savedUser = await newUser.save();
    this.logger.log(`[createUserAndMembershipFromSubmission] Usuário criado: ${savedUser._id}`);

    // 4. Criar membership no ministério
    const membership = new this.membershipModel({
      user: savedUser._id,
      tenant: new Types.ObjectId(tenantId),
      ministry: submission.preferredMinistry,
      branch: submission.branchId || null,
      role: submission.preferredRole === 'leader' ? MembershipRole.Leader : MembershipRole.Volunteer,
      isActive: true,
    });

    const savedMembership = await membership.save();
    this.logger.log(`[createUserAndMembershipFromSubmission] Membership criado: ${savedMembership._id}`);

    // 5. Criar MemberFunctions para as funções selecionadas
    this.logger.log(`[createUserAndMembershipFromSubmission] Verificando funções selecionadas: ${JSON.stringify(submission.selectedFunctions)}`);
    this.logger.log(`[createUserAndMembershipFromSubmission] Ministério preferido: ${submission.preferredMinistry}`);
    this.logger.log(`[createUserAndMembershipFromSubmission] Tipo de selectedFunctions: ${typeof submission.selectedFunctions}`);
    this.logger.log(`[createUserAndMembershipFromSubmission] Length de selectedFunctions: ${submission.selectedFunctions?.length}`);
    this.logger.log(`[createUserAndMembershipFromSubmission] Tipo de preferredMinistry: ${typeof submission.preferredMinistry}`);
    
    if (submission.selectedFunctions && submission.selectedFunctions.length > 0 && submission.preferredMinistry) {
      this.logger.log(`[createUserAndMembershipFromSubmission] ✅ Condições atendidas - Criando ${submission.selectedFunctions.length} funções para o usuário`);
      
      for (const functionName of submission.selectedFunctions) {
        try {
          this.logger.log(`[createUserAndMembershipFromSubmission] Buscando ID da função "${functionName}" para usuário ${savedUser._id}`);
          
          // Buscar o ID da função pelo nome no ministério
          const ministryFunction = await this.memberFunctionService.findFunctionByNameInMinistry(
            functionName,
            submission.preferredMinistry._id.toString(),
            tenantId
          );
          
          if (!ministryFunction) {
            this.logger.warn(`[createUserAndMembershipFromSubmission] Função "${functionName}" não encontrada no ministério ${submission.preferredMinistry._id}`);
            continue;
          }
          
          this.logger.log(`[createUserAndMembershipFromSubmission] Função "${functionName}" encontrada com ID: ${ministryFunction.functionId}`);
          
          const createMemberFunctionDto: CreateMemberFunctionDto = {
            userId: savedUser._id.toString(),
            ministryId: submission.preferredMinistry._id.toString(),
            functionId: ministryFunction.functionId.toString(),
            status: MemberFunctionStatus.APROVADO, // Aprovado automaticamente pelo líder
            level: MemberFunctionLevel.INICIANTE,
            priority: 1,
            notes: 'Aprovado automaticamente pelo líder do ministério',
            isActive: true,
            createdByRole: 'leader', // Role do líder que está aprovando
          };

          this.logger.log(`[createUserAndMembershipFromSubmission] DTO criado: ${JSON.stringify(createMemberFunctionDto)}`);

          const result = await this.memberFunctionService.createMemberFunction(
            tenantId,
            null, // branchId
            createMemberFunctionDto,
            createdBy
          );

          this.logger.log(`[createUserAndMembershipFromSubmission] Função "${functionName}" criada com sucesso: ${JSON.stringify(result)}`);
        } catch (functionError) {
          this.logger.error(`[createUserAndMembershipFromSubmission] Erro ao criar função "${functionName}": ${functionError.message}`);
          this.logger.error(`[createUserAndMembershipFromSubmission] Stack trace: ${functionError.stack}`);
          // Não falhar a operação por erro de função individual
        }
      }
    } else {
      this.logger.warn(`[createUserAndMembershipFromSubmission] Não foi possível criar funções - selectedFunctions: ${submission.selectedFunctions}, preferredMinistry: ${submission.preferredMinistry}`);
    }

    return {
      userId: savedUser._id.toString(),
      membershipId: (savedMembership._id as Types.ObjectId).toString(),
    };
  }

  /**
   * 🔐 Gera senha temporária para novos usuários
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
