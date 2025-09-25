import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomFormService } from '../services/custom-form.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('forms')
export class FormDynamicController {
  private readonly logger = new Logger(FormDynamicController.name);

  constructor(private readonly customFormService: CustomFormService) {}

  /**
   * Endpoint de teste
   */
  @Public()
  @Get('test')
  async test() {
    return { message: 'Test endpoint working' };
  }

  /**
   * Lista todos os ministérios disponíveis (público)
   */
  @Public()
  @Get('ministries')
  async getAllMinistries(@Res() res: Response) {
    try {
      this.logger.log('[getAllMinistries] Buscando todos os ministérios disponíveis');
      
      const ministries = await this.customFormService.getAllMinistries();
      
      this.logger.log(`[getAllMinistries] ${ministries.length} ministérios encontrados`);
      
      return res.status(HttpStatus.OK).json({
        message: 'Ministérios encontrados',
        data: ministries,
      });
    } catch (error) {
      this.logger.error(`[getAllMinistries] Erro ao buscar ministérios: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  /**
   * Busca ministérios disponíveis para um formulário público (sem autenticação)
   */
  @Public()
  @Get('public/:formId/ministries')
  async getFormMinistries(
    @Param('formId') formId: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getFormMinistries] Buscando ministérios para formulário: ${formId}`);
      
      // Primeiro verificar se o formulário existe e é público
      const form = await this.customFormService.getPublicForm(formId);
      this.logger.log(`[getFormMinistries] Formulário encontrado: ${form._id}, título: ${form.title}`);
      
      // Buscar todos os ministérios ativos (mesma lógica do enrichMinistryFields)
      const ministries = await this.customFormService.getAllMinistries();
      this.logger.log(`[getFormMinistries] ${ministries.length} ministérios encontrados para formulário ${formId}`);
      
      return res.status(HttpStatus.OK).json({
        message: 'Ministérios encontrados',
        data: ministries,
      });
    } catch (error) {
      this.logger.error(`[getFormMinistries] Erro ao buscar ministérios para formulário ${formId}: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  /**
   * Busca funções baseadas nos ministérios selecionados (sem autenticação)
   */
  @Public()
  @Get('public/:formId/functions')
  async getFormFunctions(
    @Param('formId') formId: string,
    @Query('ministries') ministries: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getFormFunctions] Buscando funções para formulário: ${formId}, ministries: ${ministries}`);
      
      if (!ministries) {
        this.logger.warn(`[getFormFunctions] Parâmetro ministries não fornecido para formulário ${formId}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Parâmetro ministries é obrigatório',
        });
      }

      const ministryIds = ministries.split(',').filter(id => id.trim() !== '');
      this.logger.log(`[getFormFunctions] Ministry IDs processados: ${JSON.stringify(ministryIds)}`);
      
      const functionsData = await this.customFormService.getFormFunctions(formId, ministryIds);
      this.logger.log(`[getFormFunctions] Funções encontradas: ${(functionsData as any).totalFunctions} funções de ${(functionsData as any).totalMinistries} ministérios para formulário ${formId}`);
      
      return res.status(HttpStatus.OK).json({
        message: 'Funções encontradas',
        data: functionsData,
      });
    } catch (error) {
      this.logger.error(`[getFormFunctions] Erro ao buscar funções do formulário ${formId}: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }
}
