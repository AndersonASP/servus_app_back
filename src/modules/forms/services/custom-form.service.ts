import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CustomForm } from '../schemas/custom-form.schema';
import {
  FormSubmission,
  FormSubmissionStatus,
} from '../schemas/form-submission.schema';
import { Ministry } from '../../ministries/schemas/ministry.schema';
import { User } from '../../users/schema/user.schema';
import { Membership } from '../../membership/schemas/membership.schema';
import {
  CreateCustomFormDto,
  UpdateCustomFormDto,
  SubmitFormDto,
  ReviewSubmissionDto,
  BulkReviewDto,
} from '../dto/custom-form.dto';
import { MembershipRole } from 'src/common/enums/role.enum';
import { NotificationService } from '../../notifications/services/notification.service';

@Injectable()
export class CustomFormService {
  private readonly logger = new Logger(CustomFormService.name);

  constructor(
    @InjectModel('CustomForm') private customFormModel: Model<CustomForm>,
    @InjectModel('FormSubmission')
    private formSubmissionModel: Model<FormSubmission>,
    @InjectModel('Ministry') private ministryModel: Model<Ministry>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Membership') private membershipModel: Model<Membership>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Cria um novo formulário personalizado
   */
  async createCustomForm(
    createDto: CreateCustomFormDto,
    tenantId: string,
    branchId: string | null,
    createdBy: string,
  ): Promise<CustomForm> {
    // Usar apenas os campos fornecidos pelo frontend
    const fields = createDto.fields || [];

    // Validar ministérios se fornecidos
    if (
      createDto.availableMinistries &&
      createDto.availableMinistries.length > 0
    ) {
      const ministries = await this.ministryModel.find({
        _id: {
          $in: createDto.availableMinistries.map(
            (id) => new Types.ObjectId(id),
          ),
        },
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      });

      if (ministries.length !== createDto.availableMinistries.length) {
        throw new BadRequestException(
          'Alguns ministérios não foram encontrados ou não estão ativos',
        );
      }
    }

    const formData = {
      ...createDto,
      fields: fields, // Usar apenas os campos fornecidos pelo frontend
      tenantId: new Types.ObjectId(tenantId),
      branchId: branchId ? new Types.ObjectId(branchId) : null,
      createdBy: new Types.ObjectId(createdBy),
      availableMinistries:
        createDto.availableMinistries?.map((id) => new Types.ObjectId(id)) ||
        [],
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    };

    const customForm = new this.customFormModel(formData);
    await customForm.save();

    return customForm;
  }

  /**
   * Busca formulários de um tenant
   */
  async getTenantForms(
    tenantId: string,
    branchId: string | null,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ forms: CustomForm[]; pagination: any }> {
    this.logger.log(
      `[getTenantForms] Buscando formulários - tenantId: ${tenantId}, branchId: ${branchId || 'null'}, page: ${page}, limit: ${limit}`,
    );

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    };

    if (branchId) {
      query.$or = [
        { branchId: new Types.ObjectId(branchId) },
        { branchId: null }, // Formulários da matriz
      ];
      this.logger.log(
        `[getTenantForms] Query com branch - incluindo formulários da branch ${branchId} e da matriz`,
      );
    } else {
      query.branchId = null; // Apenas formulários da matriz
      this.logger.log(
        `[getTenantForms] Query sem branch - apenas formulários da matriz`,
      );
    }

    this.logger.log(
      `[getTenantForms] Query executada: ${JSON.stringify(query)}`,
    );

    const skip = (page - 1) * limit;
    this.logger.log(`[getTenantForms] Skip: ${skip}, Limit: ${limit}`);

    const [forms, total] = await Promise.all([
      this.customFormModel
        .find(query)
        .populate('availableMinistries', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.customFormModel.countDocuments(query),
    ]);

    this.logger.log(
      `[getTenantForms] Resultado - ${forms.length} formulários encontrados de ${total} total`,
    );

    // Enriquecer campos de ministérios e funções para cada formulário
    this.logger.log(
      `[getTenantForms] Enriquecendo campos de ${forms.length} formulários`,
    );
    const enrichedForms = await Promise.all(
      forms.map(async (form) => {
        form.fields = await this.enrichMinistryFields(
          form.fields,
          form.availableMinistries,
        );
        return form;
      }),
    );

    // Log detalhado de cada formulário encontrado
    enrichedForms.forEach((form, index) => {
      this.logger.log(
        `[getTenantForms] Formulário ${index + 1}: ${form._id}, título: ${form.title}, isActive: ${form.isActive}, branchId: ${form.branchId || 'null'}`,
      );
    });

    return {
      forms: enrichedForms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Valida se uma string é um ObjectId válido
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * Busca um formulário por ID
   */
  async getFormById(formId: string, tenantId: string): Promise<CustomForm> {
    this.logger.log(
      `[getFormById] Buscando formulário ${formId} para tenant ${tenantId}`,
    );

    try {
      // Validar se os IDs são ObjectIds válidos
      if (!this.isValidObjectId(formId)) {
        this.logger.error(`[getFormById] FormId inválido: ${formId}`);
        throw new BadRequestException('ID do formulário inválido');
      }

      if (!this.isValidObjectId(tenantId)) {
        this.logger.error(`[getFormById] TenantId inválido: ${tenantId}`);
        throw new BadRequestException('ID do tenant inválido');
      }

      const query = {
        _id: new Types.ObjectId(formId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      };

      this.logger.log(
        `[getFormById] Query executada: ${JSON.stringify(query)}`,
      );

      const form = await this.customFormModel
        .findOne(query)
        .populate('availableMinistries', 'name')
        .populate('createdBy', 'name email');

      if (!form) {
        this.logger.warn(
          `[getFormById] Formulário não encontrado - formId: ${formId}, tenantId: ${tenantId}`,
        );
        throw new NotFoundException('Formulário não encontrado');
      }

      this.logger.log(
        `[getFormById] Formulário encontrado: ${form._id}, título: ${form.title}, isActive: ${form.isActive}`,
      );

      // Enriquecer campos de ministérios e funções
      this.logger.log(
        `[getFormById] Enriquecendo campos do formulário ${form._id}`,
      );
      form.fields = await this.enrichMinistryFields(
        form.fields,
        form.availableMinistries,
      );

      return form;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `[getFormById] Erro na consulta do formulário ${formId}: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException('Formulário não encontrado');
    }
  }

  /**
   * Busca um formulário público por ID (para submissão)
   */
  async getPublicForm(formId: string): Promise<CustomForm> {
    this.logger.log(`[getPublicForm] Buscando formulário público: ${formId}`);

    try {
      // Validar se o ID é um ObjectId válido
      if (!this.isValidObjectId(formId)) {
        this.logger.error(`[getPublicForm] FormId inválido: ${formId}`);
        throw new BadRequestException('ID do formulário inválido');
      }

      const query = {
        _id: new Types.ObjectId(formId),
        isPublic: true,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      };

      this.logger.log(
        `[getPublicForm] Query executada: ${JSON.stringify(query)}`,
      );

      const form = await this.customFormModel
        .findOne(query)
        .populate('availableMinistries', 'name');

      if (!form) {
        this.logger.warn(
          `[getPublicForm] Formulário público não encontrado - formId: ${formId}`,
        );
        this.logger.warn(
          `[getPublicForm] Verificando se formulário existe com outros critérios...`,
        );

        // Log adicional para debug - verificar se o formulário existe mas não atende aos critérios
        const formExists = await this.customFormModel.findById(formId);
        if (formExists) {
          this.logger.warn(
            `[getPublicForm] Formulário existe mas não atende critérios públicos:`,
          );
          this.logger.warn(
            `[getPublicForm] - isPublic: ${formExists.isPublic}`,
          );
          this.logger.warn(
            `[getPublicForm] - isActive: ${formExists.isActive}`,
          );
          this.logger.warn(
            `[getPublicForm] - expiresAt: ${formExists.expiresAt}`,
          );
          this.logger.warn(`[getPublicForm] - Data atual: ${new Date()}`);
        } else {
          this.logger.warn(
            `[getPublicForm] Formulário não existe no banco de dados`,
          );
        }

        throw new NotFoundException('Formulário não encontrado ou expirado');
      }

      this.logger.log(
        `[getPublicForm] Formulário público encontrado: ${form._id}, título: ${form.title}, isPublic: ${form.isPublic}, expiresAt: ${form.expiresAt}`,
      );

      // Enriquecer campos de ministérios e funções
      this.logger.log(
        `[getPublicForm] Enriquecendo campos do formulário ${form._id}`,
      );
      form.fields = await this.enrichMinistryFields(
        form.fields,
        form.availableMinistries,
      );

      return form;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `[getPublicForm] Erro na consulta do formulário público ${formId}: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException('Formulário não encontrado ou expirado');
    }
  }

  /**
   * Atualiza um formulário
   */
  async updateForm(
    formId: string,
    updateDto: UpdateCustomFormDto,
    tenantId: string,
    userId: string,
  ): Promise<CustomForm> {
    // Validar se os IDs são ObjectIds válidos
    if (!this.isValidObjectId(formId)) {
      this.logger.error(`[updateForm] FormId inválido: ${formId}`);
      throw new BadRequestException('ID do formulário inválido');
    }

    if (!this.isValidObjectId(tenantId)) {
      this.logger.error(`[updateForm] TenantId inválido: ${tenantId}`);
      throw new BadRequestException('ID do tenant inválido');
    }

    const form = await this.customFormModel.findOne({
      _id: new Types.ObjectId(formId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!form) {
      throw new NotFoundException('Formulário não encontrado');
    }

    // Validar ministérios se fornecidos
    if (
      updateDto.availableMinistries &&
      updateDto.availableMinistries.length > 0
    ) {
      const ministries = await this.ministryModel.find({
        _id: {
          $in: updateDto.availableMinistries.map(
            (id) => new Types.ObjectId(id),
          ),
        },
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      });

      if (ministries.length !== updateDto.availableMinistries.length) {
        throw new BadRequestException(
          'Alguns ministérios não foram encontrados ou não estão ativos',
        );
      }
    }

    const updateData = {
      ...updateDto,
      availableMinistries: updateDto.availableMinistries?.map(
        (id) => new Types.ObjectId(id),
      ),
      expiresAt: updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : undefined,
    };

    const updatedForm = await this.customFormModel
      .findByIdAndUpdate(formId, updateData, { new: true })
      .populate('availableMinistries', 'name');

    if (!updatedForm) {
      throw new NotFoundException('Formulário não encontrado');
    }

    return updatedForm;
  }

  /**
   * Submete um formulário
   */
  async submitForm(
    formId: string,
    submitDto: SubmitFormDto,
  ): Promise<FormSubmission> {
    this.logger.log(
      `[submitForm] Iniciando submissão do formulário: ${formId}`,
    );
    this.logger.log(
      `[submitForm] Dados recebidos - email: ${submitDto.email}, nome: ${submitDto.volunteerName}`,
    );

    const form = await this.getPublicForm(formId);
    this.logger.log(
      `[submitForm] Formulário validado: ${form._id}, allowMultipleSubmissions: ${form.settings.allowMultipleSubmissions}`,
    );

    // Verificar se já existe submissão com este email (se não permitir múltiplas)
    if (!form.settings.allowMultipleSubmissions) {
      this.logger.log(
        `[submitForm] Verificando submissões existentes para email: ${submitDto.email}`,
      );
      const existingSubmission = await this.formSubmissionModel.findOne({
        formId: new Types.ObjectId(formId),
        email: submitDto.email,
      });

      if (existingSubmission) {
        this.logger.warn(
          `[submitForm] Submissão já existe para email ${submitDto.email} no formulário ${formId}`,
        );
        throw new BadRequestException('Você já submeteu este formulário');
      }
    }

    // Verificar se email já está cadastrado como usuário
    this.logger.log(
      `[submitForm] Verificando se email ${submitDto.email} já está cadastrado como usuário`,
    );
    const existingUser = await this.userModel.findOne({
      email: submitDto.email,
    });
    if (existingUser) {
      this.logger.warn(
        `[submitForm] Email ${submitDto.email} já está cadastrado como usuário`,
      );
      throw new BadRequestException('Este email já está cadastrado no sistema');
    }

    // 🆕 Preparar campos essenciais para customFields (formulário sucinto)
    const essentialFields = {
      birthDate: submitDto.birthDate,
      picture: submitDto.picture,
    };

    // Filtrar apenas campos não nulos/undefined
    const filteredEssentialFields = Object.fromEntries(
      Object.entries(essentialFields).filter(
        ([_, value]) => value !== null && value !== undefined && value !== '',
      ),
    );

    const submissionData = {
      formId: new Types.ObjectId(formId),
      tenantId: form.tenantId,
      branchId: form.branchId,
      volunteerName: submitDto.volunteerName,
      email: submitDto.email,
      phone: submitDto.phone,
      preferredMinistry: submitDto.preferredMinistry
        ? new Types.ObjectId(submitDto.preferredMinistry)
        : null,
      preferredRole: submitDto.preferredRole || 'volunteer',
      customFields: {
        ...submitDto.customFields,
        ...filteredEssentialFields,
      },
      selectedFunctions: submitDto.selectedFunctions || [], // 🆕 Funções selecionadas
      status: form.settings.requireApproval
        ? FormSubmissionStatus.PENDING
        : FormSubmissionStatus.APPROVED,
    };

    this.logger.log(
      `[submitForm] Criando submissão com status: ${submissionData.status}`,
    );
    const submission = new this.formSubmissionModel(submissionData);
    await submission.save();
    this.logger.log(
      `[submitForm] Submissão criada com sucesso: ${submission._id}`,
    );

    // 🆕 NOVO FLUXO: Criar User + Membership + MemberFunction imediatamente
    if (submission.preferredMinistry) {
      try {
        this.logger.log(
          `[submitForm] Criando usuário e membership para ministério: ${submission.preferredMinistry}`,
        );

        // 1. Criar usuário com senha temporária
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const userData = {
          name: submitDto.volunteerName,
          email: submitDto.email,
          phone: submitDto.phone,
          password: hashedPassword,
          role: 'volunteer',
          isActive: false, // Pendente até aprovação
          profileCompleted: true,
          tenantId: form.tenantId, // ✅ Adicionar tenantId no registro
        };

        const user = new this.userModel(userData);
        await user.save();
        this.logger.log(`[submitForm] Usuário criado: ${user._id}`);

        // 2. Criar membership
        const membershipData = {
          user: user._id,
          tenant: form.tenantId,
          branch: form.branchId,
          ministry: submission.preferredMinistry,
          role: MembershipRole.Volunteer,
          isActive: false, // Pendente até aprovação
          needsApproval: true,
          source: 'form', // Origem: formulário
          sourceData: {
            formSubmissionId: submission._id,
            formData: submitDto,
          },
        };

        const membership = new this.membershipModel(membershipData);
        await membership.save();
        this.logger.log(`[submitForm] Membership criado: ${membership._id}`);

        // 3. Criar MemberFunction para cada função selecionada
        if (
          submitDto.selectedFunctions &&
          submitDto.selectedFunctions.length > 0
        ) {
          this.logger.log(
            `[submitForm] Criando ${submitDto.selectedFunctions.length} MemberFunctions para funções selecionadas`,
          );
          this.logger.log(
            `[submitForm] Funções selecionadas: ${submitDto.selectedFunctions.join(', ')}`,
          );

          // Buscar IDs das funções pelos nomes no ministério
          const { FunctionSchema } = await import(
            '../../functions/schemas/function.schema'
          );
          const { MinistryFunctionSchema } = await import(
            '../../functions/schemas/ministry-function.schema'
          );
          const functionModel = this.membershipModel.db.model(
            'Function',
            FunctionSchema,
          );
          const ministryFunctionModel = this.membershipModel.db.model(
            'MinistryFunction',
            MinistryFunctionSchema,
          );

          for (const functionName of submitDto.selectedFunctions) {
            this.logger.log(
              `[submitForm] Buscando ID da função: ${functionName}`,
            );

            try {
              // Primeiro buscar a função pelo nome
              const functionDoc = await functionModel.findOne({
                name: functionName,
                tenantId: form.tenantId,
              });

              if (!functionDoc) {
                this.logger.warn(
                  `[submitForm] Função "${functionName}" não encontrada no tenant ${form.tenantId}`,
                );
                continue;
              }

              // Depois buscar se esta função está habilitada no ministério
              const ministryFunction = await ministryFunctionModel.findOne({
                functionId: functionDoc._id,
                ministryId: submission.preferredMinistry,
                tenantId: form.tenantId,
                isActive: true,
              });

              if (!ministryFunction) {
                this.logger.warn(
                  `[submitForm] Função "${functionName}" não está habilitada no ministério ${submission.preferredMinistry}`,
                );
                continue;
              }

              this.logger.log(
                `[submitForm] Função "${functionName}" encontrada com ID: ${functionDoc._id}`,
              );

              const memberFunctionData = {
                memberId: user._id, // ✅ Usar memberId conforme schema
                ministryId: submission.preferredMinistry,
                functionId: functionDoc._id, // ✅ Usar o ID da função, não da ministryFunction
                tenantId: form.tenantId,
                status: 'pending', // Aguarda aprovação
                isActive: true,
              };

              this.logger.log(
                `[submitForm] Dados da MemberFunction:`,
                memberFunctionData,
              );

              // Criar MemberFunction
              const { MemberFunctionSchema } = await import(
                '../../functions/schemas/member-function.schema'
              );
              const memberFunctionModel = this.membershipModel.db.model(
                'MemberFunction',
                MemberFunctionSchema,
              );
              const memberFunction = new memberFunctionModel(
                memberFunctionData,
              );
              await memberFunction.save();
              this.logger.log(
                `[submitForm] MemberFunction criada com sucesso: ${memberFunction._id} para função: ${functionName} (ID: ${ministryFunction._id})`,
              );
            } catch (memberFunctionError) {
              this.logger.error(
                `[submitForm] Erro ao criar MemberFunction para função ${functionName}: ${memberFunctionError.message}`,
              );
              this.logger.error(
                `[submitForm] Stack trace:`,
                memberFunctionError.stack,
              );
              // Não falhar a operação por erro na função
            }
          }
        } else {
          this.logger.warn(
            `[submitForm] Nenhuma função selecionada para criar MemberFunctions`,
          );
        }

        this.logger.log(
          `[submitForm] Usuário, membership e funções criados com sucesso`,
        );
      } catch (userCreationError) {
        this.logger.error(
          `[submitForm] Erro ao criar usuário/membership: ${userCreationError.message}`,
        );
        // Não falhar a operação por erro na criação do usuário
      }
    }

    // Incrementar contador de submissões
    await this.customFormModel.findByIdAndUpdate(formId, {
      $inc: { submissionCount: 1 },
    });
    this.logger.log(
      `[submitForm] Contador de submissões incrementado para formulário ${formId}`,
    );

    // 🆕 Notificar líderes do ministério sobre nova submissão
    if (
      submission.preferredMinistry &&
      submission.status === FormSubmissionStatus.PENDING
    ) {
      try {
        await this.notificationService.notifyMinistryLeadersAboutSubmission(
          submission,
          submission.preferredMinistry.toString(),
          submission.tenantId.toString(),
        );
        this.logger.log(
          `[submitForm] Notificação enviada para líderes do ministério ${submission.preferredMinistry}`,
        );
      } catch (notificationError) {
        this.logger.error(
          `[submitForm] Erro ao enviar notificação: ${notificationError.message}`,
        );
        // Não falhar a operação por erro de notificação
      }
    }

    return submission;
  }

  /**
   * Busca todas as submissões de um tenant
   */
  async getAllSubmissions(
    tenantId: string,
    status?: FormSubmissionStatus | string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ submissions: FormSubmission[]; pagination: any }> {
    this.logger.log(
      `[getAllSubmissions] Buscando submissões - tenantId: ${tenantId}, status: ${status}, page: ${page}, limit: ${limit}`,
    );

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (status) {
      // Suportar múltiplos status separados por vírgula
      if (typeof status === 'string' && status.includes(',')) {
        const statusList = status.split(',').map((s) => s.trim());
        query.status = { $in: statusList };
        this.logger.log(
          `[getAllSubmissions] Buscando múltiplos status: ${statusList}`,
        );
      } else {
        query.status = status;
      }
    }

    const skip = (page - 1) * limit;

    this.logger.log(
      `[getAllSubmissions] Query executada: ${JSON.stringify(query)}`,
    );

    const [submissions, total] = await Promise.all([
      this.formSubmissionModel
        .find(query)
        .populate('formId', 'title')
        .populate('preferredMinistry', 'name')
        .populate('reviewedBy', 'name email')
        .populate('processedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.formSubmissionModel.countDocuments(query),
    ]);

    this.logger.log(
      `[getAllSubmissions] Resultado - ${submissions.length} submissões encontradas de ${total} total`,
    );

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
   * Busca submissões de um formulário
   */
  async getFormSubmissions(
    formId: string,
    tenantId: string,
    status?: FormSubmissionStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ submissions: FormSubmission[]; pagination: any }> {
    const query: any = {
      formId: new Types.ObjectId(formId),
      tenantId: new Types.ObjectId(tenantId),
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.formSubmissionModel
        .find(query)
        .populate('preferredMinistry', 'name')
        .populate('reviewedBy', 'name email')
        .populate('processedBy', 'name email')
        .sort({ createdAt: -1 })
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
   * Revisa uma submissão
   */
  async reviewSubmission(
    submissionId: string,
    reviewDto: ReviewSubmissionDto,
    tenantId: string,
    reviewedBy: string,
  ): Promise<FormSubmission> {
    // Validar se os IDs são ObjectIds válidos
    if (!this.isValidObjectId(submissionId)) {
      this.logger.error(
        `[reviewSubmission] SubmissionId inválido: ${submissionId}`,
      );
      throw new BadRequestException('ID da submissão inválido');
    }

    if (!this.isValidObjectId(tenantId)) {
      this.logger.error(`[reviewSubmission] TenantId inválido: ${tenantId}`);
      throw new BadRequestException('ID do tenant inválido');
    }

    if (!this.isValidObjectId(reviewedBy)) {
      this.logger.error(
        `[reviewSubmission] ReviewedBy inválido: ${reviewedBy}`,
      );
      throw new BadRequestException('ID do revisor inválido');
    }

    const submission = await this.formSubmissionModel.findOne({
      _id: new Types.ObjectId(submissionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!submission) {
      throw new NotFoundException('Submissão não encontrada');
    }

    const updateData = {
      status:
        reviewDto.status === 'approved'
          ? FormSubmissionStatus.APPROVED
          : FormSubmissionStatus.REJECTED,
      reviewedBy: new Types.ObjectId(reviewedBy),
      reviewNotes: reviewDto.reviewNotes,
      reviewedAt: new Date(),
    };

    const updatedSubmission = await this.formSubmissionModel
      .findByIdAndUpdate(submissionId, updateData, { new: true })
      .populate('preferredMinistry', 'name');

    if (!updatedSubmission) {
      throw new NotFoundException('Submissão não encontrada');
    }

    return updatedSubmission;
  }

  /**
   * Revisa múltiplas submissões
   */
  async bulkReviewSubmissions(
    bulkReviewDto: BulkReviewDto,
    tenantId: string,
    reviewedBy: string,
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const submissionId of bulkReviewDto.submissionIds) {
      try {
        await this.reviewSubmission(
          submissionId,
          {
            status: bulkReviewDto.status,
            reviewNotes: bulkReviewDto.reviewNotes,
          },
          tenantId,
          reviewedBy,
        );
        updated++;
      } catch (error) {
        errors.push(`Submissão ${submissionId}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Processa submissões aprovadas (cria usuários e memberships)
   */
  async processApprovedSubmissions(
    formId: string,
    tenantId: string,
    processedBy: string,
  ): Promise<{ processed: number; errors: string[] }> {
    const submissions = await this.formSubmissionModel.find({
      formId: new Types.ObjectId(formId),
      tenantId: new Types.ObjectId(tenantId),
      status: FormSubmissionStatus.APPROVED,
      processedAt: null,
    });

    const errors: string[] = [];
    let processed = 0;

    for (const submission of submissions) {
      try {
        // Gerar senha temporária
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Criar usuário com senha temporária
        const userData = {
          name: submission.volunteerName,
          email: submission.email,
          phone: submission.phone,
          password: hashedPassword,
          role: 'volunteer',
          profileCompleted: false,
          isActive: true,
          tenantId: new Types.ObjectId(tenantId),

          // 🆕 Campos essenciais do formulário (sucinto)
          birthDate: submission.customFields?.birthDate || null,
          picture: submission.customFields?.picture || null,
        };

        const newUser = new this.userModel(userData);
        await newUser.save();

        // Criar membership
        const membershipData = {
          user: newUser._id,
          tenant: submission.tenantId,
          branch: submission.branchId,
          ministry: submission.preferredMinistry,
          role: MembershipRole.Volunteer,
          isActive: true,
          createdBy: new Types.ObjectId(processedBy),
        };

        const membership = new this.membershipModel(membershipData);
        await membership.save();

        // Atualizar submissão
        await this.formSubmissionModel.findByIdAndUpdate(submission._id, {
          status: FormSubmissionStatus.PROCESSED,
          processedBy: new Types.ObjectId(processedBy),
          processedAt: new Date(),
          createdUserId: newUser._id,
          createdMembershipId: membership._id,
        });

        processed++;
      } catch (error) {
        errors.push(`Submissão ${submission._id}: ${error.message}`);
      }
    }

    // Incrementar contador de aprovados
    await this.customFormModel.findByIdAndUpdate(formId, {
      $inc: { approvedCount: processed },
    });

    return { processed, errors };
  }

  /**
   * Deleta um formulário
   */
  async deleteForm(formId: string, tenantId: string): Promise<void> {
    // Validar se os IDs são ObjectIds válidos
    if (!this.isValidObjectId(formId)) {
      this.logger.error(`[deleteForm] FormId inválido: ${formId}`);
      throw new BadRequestException('ID do formulário inválido');
    }

    if (!this.isValidObjectId(tenantId)) {
      this.logger.error(`[deleteForm] TenantId inválido: ${tenantId}`);
      throw new BadRequestException('ID do tenant inválido');
    }

    const form = await this.customFormModel.findOne({
      _id: new Types.ObjectId(formId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!form) {
      throw new NotFoundException('Formulário não encontrado');
    }

    // Soft delete - apenas desativar
    await this.customFormModel.findByIdAndUpdate(formId, {
      isActive: false,
    });
  }

  /**
   * Busca ministérios disponíveis para um formulário público
   */
  async getFormMinistries(formId: string): Promise<any[]> {
    this.logger.log(
      `[getFormMinistries] Buscando ministérios para formulário: ${formId}`,
    );

    const form = await this.customFormModel.findById(formId);
    if (!form) {
      this.logger.warn(
        `[getFormMinistries] Formulário não encontrado: ${formId}`,
      );
      throw new BadRequestException('Formulário não encontrado');
    }

    this.logger.log(
      `[getFormMinistries] Formulário encontrado: ${form._id}, isPublic: ${form.isPublic}, availableMinistries: ${form.availableMinistries?.length || 0}`,
    );

    if (!form.isPublic) {
      this.logger.warn(
        `[getFormMinistries] Formulário não é público: ${formId}`,
      );
      throw new BadRequestException('Formulário não é público');
    }

    if (!form.availableMinistries || form.availableMinistries.length === 0) {
      this.logger.log(
        `[getFormMinistries] Nenhum ministério disponível para formulário: ${formId}`,
      );
      return [];
    }

    this.logger.log(
      `[getFormMinistries] Buscando ${form.availableMinistries.length} ministérios ativos`,
    );
    const ministries = await this.ministryModel
      .find({
        _id: { $in: form.availableMinistries },
        isActive: true,
      })
      .select('_id name description ministryFunctions');

    this.logger.log(
      `[getFormMinistries] Ministérios encontrados: ${ministries.length} para formulário ${formId}`,
    );

    return ministries.map((ministry) => ({
      id: (ministry._id as any).toString(),
      name: ministry.name,
      description: ministry.description,
      functions: ministry.ministryFunctions || [],
    }));
  }

  /**
   * Busca todos os ministérios ativos (público)
   */
  async getAllMinistries(): Promise<any[]> {
    this.logger.log('[getAllMinistries] Buscando todos os ministérios ativos');

    const ministries = await this.ministryModel
      .find({
        isActive: true,
      })
      .select('_id name description ministryFunctions')
      .sort({ name: 1 });

    this.logger.log(
      `[getAllMinistries] ${ministries.length} ministérios encontrados`,
    );

    return ministries.map((ministry) => ({
      id: (ministry._id as any).toString(),
      name: ministry.name,
      description: ministry.description || '',
      functions: ministry.ministryFunctions || [],
    }));
  }

  /**
   * Enriquece campos de ministérios e funções com dados dinâmicos
   */
  private async enrichMinistryFields(
    fields: any[],
    availableMinistries: Types.ObjectId[],
  ): Promise<any[]> {
    this.logger.log(
      `[enrichMinistryFields] Enriquecendo ${fields.length} campos com ${availableMinistries.length} ministérios`,
    );

    const enrichedFields = await Promise.all(
      fields.map(async (field) => {
        // Enriquecer campo de seleção de ministérios
        if (field.type === 'ministry_select') {
          this.logger.log(
            `[enrichMinistryFields] Enriquecendo campo ministry_select: ${field.id}`,
          );

          let ministries;
          if (availableMinistries.length > 0) {
            // Usar ministérios específicos do formulário
            ministries = await this.ministryModel
              .find({
                _id: { $in: availableMinistries },
                isActive: true,
              })
              .select('_id name description');
            this.logger.log(
              `[enrichMinistryFields] Usando ${ministries.length} ministérios específicos do formulário`,
            );
          } else {
            // Se não há ministérios específicos, usar todos os ministérios ativos
            ministries = await this.ministryModel
              .find({
                isActive: true,
              })
              .select('_id name description')
              .sort({ name: 1 });
            this.logger.log(
              `[enrichMinistryFields] Usando todos os ${ministries.length} ministérios ativos`,
            );
          }

          field.options = ministries.map((ministry) => ({
            value: ministry._id.toString(),
            label: ministry.name,
            description: ministry.description || '',
          }));

          this.logger.log(
            `[enrichMinistryFields] Campo ${field.id} enriquecido com ${field.options.length} ministérios`,
          );
        }

        // Enriquecer campo de múltipla seleção de funções (campos dependentes)
        if (field.type === 'function_multiselect') {
          this.logger.log(
            `[enrichMinistryFields] Configurando campo function_multiselect dependente: ${field.id}`,
          );

          // Para campos de função, não preencher options automaticamente
          // Em vez disso, marcar como dependente e deixar vazio para preenchimento dinâmico
          field.options = []; // Sempre vazio inicialmente
          field.dependsOn = 'ministerio'; // Campo que este campo depende
          field.dynamicOptions = true; // Flag para indicar que precisa ser preenchido dinamicamente

          this.logger.log(
            `[enrichMinistryFields] Campo ${field.id} configurado como dependente de 'ministerio'`,
          );
        }

        return field;
      }),
    );

    return enrichedFields;
  }

  /**
   * Busca funções baseadas nos ministérios selecionados (retorna dados estruturados)
   */
  async getFormFunctions(
    formId: string,
    ministryIds: string[],
  ): Promise<any[]> {
    this.logger.log(
      `[getFormFunctions] Buscando funções para formulário: ${formId}, ministryIds: ${JSON.stringify(ministryIds)}`,
    );

    const form = await this.customFormModel.findById(formId);
    if (!form) {
      this.logger.warn(
        `[getFormFunctions] Formulário não encontrado: ${formId}`,
      );
      throw new BadRequestException('Formulário não encontrado');
    }

    this.logger.log(
      `[getFormFunctions] Formulário encontrado: ${form._id}, isPublic: ${form.isPublic}`,
    );

    if (!form.isPublic) {
      this.logger.warn(
        `[getFormFunctions] Formulário não é público: ${formId}`,
      );
      throw new BadRequestException('Formulário não é público');
    }

    if (ministryIds.length === 0) {
      this.logger.log(
        `[getFormFunctions] Nenhum ministry ID fornecido para formulário: ${formId}`,
      );
      return [];
    }

    // Validar se os ministérios estão disponíveis para este formulário
    const validMinistryIds = ministryIds.filter((id) =>
      form.availableMinistries.some(
        (availableId) => availableId.toString() === id,
      ),
    );

    this.logger.log(
      `[getFormFunctions] Ministry IDs válidos: ${validMinistryIds.length}/${ministryIds.length} para formulário ${formId}`,
    );

    if (validMinistryIds.length === 0) {
      this.logger.log(
        `[getFormFunctions] Nenhum ministry ID válido para formulário: ${formId}`,
      );
      return [];
    }

    this.logger.log(
      `[getFormFunctions] Buscando funções de ${validMinistryIds.length} ministérios`,
    );
    const ministries = await this.ministryModel
      .find({
        _id: { $in: validMinistryIds.map((id) => new Types.ObjectId(id)) },
        isActive: true,
      })
      .select('_id name ministryFunctions');

    this.logger.log(
      `[getFormFunctions] Ministérios encontrados: ${ministries.length} para formulário ${formId}`,
    );

    // Retornar dados estruturados por ministério
    const result = ministries.map((ministry) => ({
      ministryId: (ministry._id as any).toString(),
      ministryName: ministry.name,
      functions: ministry.ministryFunctions
        ? ministry.ministryFunctions.map((func) => ({
            value: func,
            label: func,
          }))
        : [],
    }));

    // Também retornar todas as funções únicas para compatibilidade
    const allFunctions = new Set<string>();
    ministries.forEach((ministry) => {
      if (ministry.ministryFunctions) {
        ministry.ministryFunctions.forEach((func) => allFunctions.add(func));
      }
    });

    const allFunctionsArray = Array.from(allFunctions)
      .sort()
      .map((func) => ({
        value: func,
        label: func,
      }));

    this.logger.log(
      `[getFormFunctions] Retornando ${result.length} ministérios com funções e ${allFunctionsArray.length} funções únicas`,
    );

    return {
      byMinistry: result,
      allFunctions: allFunctionsArray,
      totalMinistries: result.length,
      totalFunctions: allFunctionsArray.length,
    } as any;
  }

  /**
   * 🆕 Retorna campos padrão para formulários de voluntários
   */
  private getDefaultFormFields(): any[] {
    return [
      {
        id: 'volunteerName',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Digite seu nome completo',
        helpText: 'Nome completo como aparece no documento',
        order: 1,
      },
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'seu@email.com',
        helpText: 'Email válido para comunicação',
        order: 2,
      },
      {
        id: 'phone',
        label: 'Telefone',
        type: 'phone',
        required: true,
        placeholder: '(11) 99999-9999',
        helpText: 'Telefone com DDD',
        order: 3,
      },
      {
        id: 'birthDate',
        label: 'Data de Nascimento',
        type: 'date',
        required: true,
        placeholder: 'DD/MM/AAAA',
        helpText: 'Data de nascimento completa',
        order: 4,
      },
      {
        id: 'preferredMinistry',
        label: 'Ministério de Interesse',
        type: 'ministry_select',
        required: true,
        placeholder: 'Selecione um ministério',
        helpText: 'Escolha o ministério onde deseja servir',
        order: 5,
      },
      {
        id: 'selectedFunctions',
        label: 'Funções de Interesse',
        type: 'function_multiselect',
        required: true,
        placeholder: 'Selecione as funções',
        helpText: 'Escolha as funções que deseja exercer',
        order: 6,
      },
    ];
  }

  /**
   * 🆕 Mescla campos fornecidos com campos padrão
   */
  private mergeWithDefaultFields(
    providedFields: any[],
    defaultFields: any[],
  ): any[] {
    // Se não há campos fornecidos, usar apenas os padrões
    if (!providedFields || providedFields.length === 0) {
      return defaultFields;
    }

    // Criar mapa dos campos fornecidos por ID
    const providedFieldsMap = new Map();
    providedFields.forEach((field) => {
      providedFieldsMap.set(field.id, field);
    });

    // Mesclar campos padrão com campos fornecidos
    const mergedFields = defaultFields.map((defaultField) => {
      const providedField = providedFieldsMap.get(defaultField.id);
      if (providedField) {
        // Campo foi fornecido, usar configuração personalizada mas manter ordem padrão
        return {
          ...providedField,
          order: defaultField.order, // Manter ordem padrão
        };
      }
      return defaultField; // Usar campo padrão
    });

    // Adicionar campos extras que não estão nos padrões
    providedFields.forEach((field) => {
      if (!defaultFields.some((df) => df.id === field.id)) {
        mergedFields.push(field);
      }
    });

    // Ordenar por order
    return mergedFields.sort((a, b) => a.order - b.order);
  }

  /**
   * Gera senha temporária para usuários criados via formulário
   */
  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
