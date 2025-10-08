import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomFormService } from '../services/custom-form.service';
import {
  CreateCustomFormDto,
  UpdateCustomFormDto,
  SubmitFormDto,
  ReviewSubmissionDto,
  BulkReviewDto,
} from '../dto/custom-form.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('forms')
export class CustomFormController {
  private readonly logger = new Logger(CustomFormController.name);

  constructor(private readonly customFormService: CustomFormService) {
    this.logger.log('CustomFormController inicializado');
  }

  /**
   * Cria um novo formulário personalizado (autenticado)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createCustomForm(
    @Body() createDto: CreateCustomFormDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const tenantId = req.user?.tenantId;
      const branchId = req.user?.branchId;

      if (!userId || !tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado ou tenant não encontrado',
        });
      }

      const result = await this.customFormService.createCustomForm(
        createDto,
        tenantId,
        branchId,
        userId,
      );

      return res.status(HttpStatus.CREATED).json({
        message: 'Formulário criado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Busca formulários do tenant (autenticado)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getTenantForms(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getTenantForms] Iniciando listagem de formulários`);
      this.logger.log(
        `[getTenantForms] Parâmetros - page: ${page}, limit: ${limit}`,
      );

      const tenantId = req.user?.tenantId;
      const branchId = req.user?.branchId;
      const userId = req.user?.sub;

      this.logger.log(
        `[getTenantForms] Dados do usuário - tenantId: ${tenantId}, branchId: ${branchId}, userId: ${userId}`,
      );

      if (!tenantId) {
        this.logger.warn(`[getTenantForms] Tenant não encontrado no token`);
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      this.logger.log(
        `[getTenantForms] Buscando formulários para tenant ${tenantId}, branch ${branchId || 'null'}`,
      );
      const result = await this.customFormService.getTenantForms(
        tenantId,
        branchId,
        parseInt(page),
        parseInt(limit),
      );

      this.logger.log(
        `[getTenantForms] Resultado encontrado - ${result.forms.length} formulários, total: ${result.pagination.total}`,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Formulários encontrados',
        data: result.forms,
        pagination: result.pagination,
      });
    } catch (error) {
      this.logger.error(
        `[getTenantForms] Erro ao listar formulários: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Busca todas as submissões do tenant (autenticado)
   */
  @Get('submissions')
  @UseGuards(JwtAuthGuard)
  async getAllSubmissions(
    @Query('status') status: string,
    @Query('tenantId') tenantIdParam: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `[getAllSubmissions] Buscando submissões - status: ${status}, tenantId: ${tenantIdParam}`,
      );

      const tenantId = tenantIdParam || req.user?.tenantId;

      if (!tenantId) {
        this.logger.warn(`[getAllSubmissions] Tenant não encontrado`);
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      this.logger.log(
        `[getAllSubmissions] Buscando submissões para tenant ${tenantId}`,
      );
      const result = await this.customFormService.getAllSubmissions(
        tenantId,
        status as any,
        parseInt(page),
        parseInt(limit),
      );

      this.logger.log(
        `[getAllSubmissions] Resultado - ${result.submissions.length} submissões encontradas`,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Submissões encontradas',
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      this.logger.error(
        `[getAllSubmissions] Erro ao buscar submissões: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Busca um formulário por ID (autenticado)
   */
  @Get(':formId')
  @UseGuards(JwtAuthGuard)
  async getFormById(
    @Param('formId') formId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getFormById] Iniciando busca do formulário: ${formId}`);

      const tenantId = req.user?.tenantId;
      const userId = req.user?.sub;

      this.logger.log(
        `[getFormById] Dados do usuário - tenantId: ${tenantId}, userId: ${userId}`,
      );

      if (!tenantId) {
        this.logger.warn(
          `[getFormById] Tenant não encontrado para formId: ${formId}`,
        );
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      this.logger.log(
        `[getFormById] Buscando formulário ${formId} para tenant ${tenantId}`,
      );
      const result = await this.customFormService.getFormById(formId, tenantId);

      this.logger.log(
        `[getFormById] Formulário encontrado: ${result._id}, título: ${result.title}`,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Formulário encontrado',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `[getFormById] Erro ao buscar formulário ${formId}: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Serve página bonita para formulário público (endpoint principal)
   * Este é o endpoint que será usado para compartilhamento
   */
  @Public()
  @Get('public/:formId')
  async getPublicForm(@Param('formId') formId: string, @Res() res: Response) {
    try {
      this.logger.log(
        `[getPublicForm] Acessando formulário público: ${formId}`,
      );

      // Verificar se o formulário existe
      const form = await this.customFormService.getPublicForm(formId);
      this.logger.log(
        `[getPublicForm] Formulário encontrado: ${form._id}, título: ${form.title}, isPublic: ${form.isPublic}`,
      );

      // Servir a página Flutter Web com roteamento correto
      const html = this.generateFlutterWebHTML(formId);

      this.logger.log(
        `[getPublicForm] Servindo página HTML para formulário ${formId}`,
      );
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      this.logger.error(
        `[getPublicForm] Erro ao acessar formulário público ${formId}: ${error.message}`,
        error.stack,
      );
      const errorHtml = this.generateErrorHTML(error.message);
      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.NOT_FOUND).send(errorHtml);
    }
  }

  /**
   * Endpoint específico para API - retorna JSON
   */
  @Public()
  @Get('public/:formId/api')
  async getPublicFormApi(
    @Param('formId') formId: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `[getPublicFormApi] API request para formulário: ${formId}`,
      );

      const result = await this.customFormService.getPublicForm(formId);
      this.logger.log(
        `[getPublicFormApi] Formulário encontrado via API: ${result._id}, título: ${result.title}`,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Formulário encontrado',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `[getPublicFormApi] Erro na API do formulário ${formId}: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Serve página Flutter Web para formulário público
   */
  @Public()
  @Get('public/:formId/page')
  async getPublicFormPage(
    @Param('formId') formId: string,
    @Res() res: Response,
  ) {
    try {
      // Verificar se o formulário existe
      await this.customFormService.getPublicForm(formId);

      // Servir a página Flutter Web
      const html = this.generateFlutterWebHTML(formId);

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      const errorHtml = this.generateErrorHTML(error.message);
      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.NOT_FOUND).send(errorHtml);
    }
  }

  /**
   * Endpoint alternativo que sempre serve a página bonita
   * Útil para compartilhamento direto
   */
  @Public()
  @Get('public/:formId/form')
  async getPublicFormPageAlt(
    @Param('formId') formId: string,
    @Res() res: Response,
  ) {
    try {
      // Verificar se o formulário existe
      await this.customFormService.getPublicForm(formId);

      // Servir a página Flutter Web
      const html = this.generateFlutterWebHTML(formId);

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      const errorHtml = this.generateErrorHTML(error.message);
      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.NOT_FOUND).send(errorHtml);
    }
  }

  /**
   * Atualiza um formulário (autenticado)
   */
  @Put(':formId')
  @UseGuards(JwtAuthGuard)
  async updateForm(
    @Param('formId') formId: string,
    @Body() updateDto: UpdateCustomFormDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado ou tenant não encontrado',
        });
      }

      const result = await this.customFormService.updateForm(
        formId,
        updateDto,
        tenantId,
        userId,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Formulário atualizado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Submete um formulário (público)
   */
  @Public()
  @Post(':formId/submit')
  async submitForm(
    @Param('formId') formId: string,
    @Body() submitDto: SubmitFormDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[submitForm] Submissão de formulário: ${formId}`);
      this.logger.log(
        `[submitForm] Dados da submissão - email: ${submitDto.email}, nome: ${submitDto.volunteerName}`,
      );

      const result = await this.customFormService.submitForm(formId, submitDto);
      this.logger.log(
        `[submitForm] Submissão criada com sucesso: ${result._id}, status: ${result.status}`,
      );

      return res.status(HttpStatus.CREATED).json({
        message: 'Formulário submetido com sucesso',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `[submitForm] Erro ao submeter formulário ${formId}: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Busca submissões de um formulário (autenticado)
   */
  @Get(':formId/submissions')
  @UseGuards(JwtAuthGuard)
  async getFormSubmissions(
    @Param('formId') formId: string,
    @Query('status') status: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const result = await this.customFormService.getFormSubmissions(
        formId,
        tenantId,
        status as any,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(HttpStatus.OK).json({
        message: 'Submissões encontradas',
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Revisa uma submissão (autenticado)
   */
  @Put('submissions/:submissionId/review')
  @UseGuards(JwtAuthGuard)
  async reviewSubmission(
    @Param('submissionId') submissionId: string,
    @Body() reviewDto: ReviewSubmissionDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado ou tenant não encontrado',
        });
      }

      const result = await this.customFormService.reviewSubmission(
        submissionId,
        reviewDto,
        tenantId,
        userId,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Submissão revisada com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Revisa múltiplas submissões (autenticado)
   */
  @Put('submissions/bulk-review')
  @UseGuards(JwtAuthGuard)
  async bulkReviewSubmissions(
    @Body() bulkReviewDto: BulkReviewDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado ou tenant não encontrado',
        });
      }

      const result = await this.customFormService.bulkReviewSubmissions(
        bulkReviewDto,
        tenantId,
        userId,
      );

      return res.status(HttpStatus.OK).json({
        message: `Revisão em lote concluída: ${result.updated} atualizadas`,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Processa submissões aprovadas (autenticado)
   */
  @Post(':formId/process')
  @UseGuards(JwtAuthGuard)
  async processApprovedSubmissions(
    @Param('formId') formId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado ou tenant não encontrado',
        });
      }

      const result = await this.customFormService.processApprovedSubmissions(
        formId,
        tenantId,
        userId,
      );

      return res.status(HttpStatus.OK).json({
        message: `Processamento concluído: ${result.processed} processadas`,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Deleta um formulário (autenticado)
   */
  @Delete(':formId')
  @UseGuards(JwtAuthGuard)
  async deleteForm(
    @Param('formId') formId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      await this.customFormService.deleteForm(formId, tenantId);

      return res.status(HttpStatus.OK).json({
        message: 'Formulário deletado com sucesso',
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Gera HTML da página Flutter Web
   */
  private generateFlutterWebHTML(formId: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <base href="/">

  <meta charset="UTF-8">
  <meta content="IE=Edge" http-equiv="X-UA-Compatible">
  <meta name="description" content="Formulário Público - Servus App">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- iOS meta tags & icons -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Servus App">
  <link rel="apple-touch-icon" href="/icons/Icon-192.png">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png"/>

  <title>Formulário Público - Servus App</title>
  <link rel="manifest" href="/manifest.json">
  
  <style>
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: white;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 18px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <div class="loading-text">Carregando formulário...</div>
  </div>
  
  <script>
    // Configurar rota inicial para o formulário público
    window.flutter_web_config = {
      initialRoute: '/forms/public/${formId}'
    };
  </script>
  <script src="/flutter_web_config.js"></script>
  <script src="/flutter_bootstrap.js" async></script>
</body>
</html>`;
  }

  /**
   * Gera HTML da página do formulário (versão HTML estática - mantida para compatibilidade)
   */
  private generateFormHTML(form: any): string {
    const fieldsHTML = form.fields
      .map((field: any) => this.generateFieldHTML(field))
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${form.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4058DB 0%, #667eea 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 16px;
        }
        
        .form-container {
            padding: 40px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #4058DB;
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        .required {
            color: #e74c3c;
        }
        
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        
        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .checkbox-item input[type="checkbox"] {
            width: auto;
            margin: 0;
        }
        
        .submit-btn {
            background: linear-gradient(135deg, #4058DB 0%, #667eea 100%);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s ease;
        }
        
        .submit-btn:hover {
            transform: translateY(-2px);
        }
        
        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4058DB;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
            body {
                padding: 10px;
            }
            
            .form-container {
                padding: 20px;
            }
            
            .header {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${form.title}</h1>
            ${form.description ? `<p>${form.description}</p>` : ''}
        </div>
        
        <div class="form-container">
            <div id="success-message" class="success-message" style="display: none;">
                ${form.settings?.successMessage || 'Obrigado! Sua submissão foi recebida com sucesso.'}
            </div>
            
            <div id="error-message" class="error-message" style="display: none;"></div>
            
            <form id="public-form">
                ${fieldsHTML}
                
                <div class="form-group">
                    <button type="submit" class="submit-btn" id="submit-btn">
                        ${form.settings?.submitButtonText || 'Enviar Formulário'}
                    </button>
                </div>
            </form>
            
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>Enviando formulário...</p>
            </div>
        </div>
    </div>
    
    <script>
        const formId = '${form._id}';
        
        document.getElementById('public-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const submitBtn = document.getElementById('submit-btn');
            const loading = document.getElementById('loading');
            const successMessage = document.getElementById('success-message');
            const errorMessage = document.getElementById('error-message');
            
            // Mostrar loading
            form.style.display = 'none';
            loading.style.display = 'block';
            submitBtn.disabled = true;
            
            // Coletar dados do formulário
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
            
            try {
                const response = await fetch('/forms/' + formId + '/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Sucesso
                    loading.style.display = 'none';
                    successMessage.style.display = 'block';
                    form.reset();
                } else {
                    // Erro
                    loading.style.display = 'none';
                    form.style.display = 'block';
                    errorMessage.textContent = result.message || 'Erro ao enviar formulário';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                // Erro de rede
                loading.style.display = 'none';
                form.style.display = 'block';
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
                errorMessage.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Gera HTML de um campo do formulário
   */
  private generateFieldHTML(field: any): string {
    const required = field.required ? 'required' : '';
    const requiredStar = field.required
      ? '<span class="required">*</span>'
      : '';
    const helpText = field.helpText
      ? `<div class="help-text">${field.helpText}</div>`
      : '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <input type="${field.type}" id="${field.id}" name="${field.id}" 
                   placeholder="${field.placeholder}" ${required}>
            ${helpText}
          </div>`;

      case 'textarea':
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <textarea id="${field.id}" name="${field.id}" 
                      placeholder="${field.placeholder}" ${required}>${field.defaultValue || ''}</textarea>
            ${helpText}
          </div>`;

      case 'select':
        const selectOptions = field.options
          .map(
            (option: string) => `<option value="${option}">${option}</option>`,
          )
          .join('');
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <select id="${field.id}" name="${field.id}" ${required}>
              <option value="">${field.placeholder}</option>
              ${selectOptions}
            </select>
            ${helpText}
          </div>`;

      case 'multiselect':
        const checkboxOptions = field.options
          .map(
            (option: string) =>
              `<div class="checkbox-item">
            <input type="checkbox" id="${field.id}_${option}" name="${field.id}" value="${option}">
            <label for="${field.id}_${option}">${option}</label>
          </div>`,
          )
          .join('');
        return `
          <div class="form-group">
            <label>${field.label} ${requiredStar}</label>
            <div class="checkbox-group">
              ${checkboxOptions}
            </div>
            ${helpText}
          </div>`;

      case 'number':
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <input type="number" id="${field.id}" name="${field.id}" 
                   placeholder="${field.placeholder}" ${required}>
            ${helpText}
          </div>`;

      case 'date':
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <input type="date" id="${field.id}" name="${field.id}" ${required}>
            ${helpText}
          </div>`;

      default:
        return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${requiredStar}</label>
            <input type="text" id="${field.id}" name="${field.id}" 
                   placeholder="${field.placeholder}" ${required}>
            ${helpText}
          </div>`;
    }
  }

  /**
   * Gera HTML de erro
   */
  private generateErrorHTML(message: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulário não encontrado</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        
        .error-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
            max-width: 400px;
        }
        
        .error-icon {
            font-size: 64px;
            color: #e74c3c;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 16px;
            font-size: 24px;
        }
        
        p {
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1>Formulário não encontrado</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
  }
}
