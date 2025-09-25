import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Query, 
  Body, 
  Req, 
  Res, 
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MinistryApprovalService } from '../services/ministry-approval.service';
import { LeaderApprovalDto } from '../dto/custom-form.dto';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { MembershipRole } from 'src/common/enums/role.enum';

/**
 * 🎯 Controller específico para aprovações de voluntários por líderes de ministério
 * Responsabilidade única: Expor endpoints para aprovações de ministério
 */
@Controller('ministry-approvals')
export class MinistryApprovalController {
  private readonly logger = new Logger(MinistryApprovalController.name);

  constructor(
    private readonly ministryApprovalService: MinistryApprovalService,
  ) {}

  /**
   * 📋 Lista submissões pendentes para um ministério específico
   * Apenas líderes do ministério podem acessar
   */
  @Get('ministries/:ministryId/pending')
  @Authorize({
    anyOf: [{
      membership: {
        roles: [MembershipRole.Leader],
        ministryParam: 'ministryId',
        tenantFrom: 'user',
      }
    }]
  })
  async getMinistryPendingSubmissions(
    @Param('ministryId') ministryId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getMinistryPendingSubmissions] Buscando submissões pendentes para ministério ${ministryId}`);

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const result = await this.ministryApprovalService.getMinistryPendingSubmissions(
        ministryId,
        tenantId,
        req.user._id,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(HttpStatus.OK).json({
        message: 'Submissões pendentes encontradas',
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      this.logger.error(`[getMinistryPendingSubmissions] Erro: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * ✅ Aprova uma submissão de voluntário
   * Apenas líderes do ministério da submissão podem aprovar
   */
  @Put('submissions/:submissionId/approve')
  @Authorize({
    anyOf: [{
      membership: {
        roles: [MembershipRole.Leader],
        tenantFrom: 'user',
      }
    }]
  })
  async approveVolunteerSubmission(
    @Param('submissionId') submissionId: string,
    @Body() approvalDto: LeaderApprovalDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[approveVolunteerSubmission] Aprovando submissão ${submissionId}`);

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const result = await this.ministryApprovalService.approveVolunteerSubmission(
        submissionId,
        approvalDto,
        tenantId,
        req.user._id,
      );

      return res.status(HttpStatus.OK).json({
        message: `Submissão ${approvalDto.status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso`,
        data: result,
      });
    } catch (error) {
      this.logger.error(`[approveVolunteerSubmission] Erro: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * 📊 Busca estatísticas de aprovações para um ministério
   */
  @Get('ministries/:ministryId/stats')
  @Authorize({
    anyOf: [{
      membership: {
        roles: [MembershipRole.Leader],
        ministryParam: 'ministryId',
        tenantFrom: 'user',
      }
    }]
  })
  async getMinistryApprovalStats(
    @Param('ministryId') ministryId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getMinistryApprovalStats] Buscando estatísticas para ministério ${ministryId}`);

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const stats = await this.ministryApprovalService.getMinistryApprovalStats(
        ministryId,
        tenantId,
        req.user._id,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Estatísticas encontradas',
        data: stats,
      });
    } catch (error) {
      this.logger.error(`[getMinistryApprovalStats] Erro: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * 📋 Lista todas as submissões pendentes dos ministérios do líder atual
   * Mostra apenas voluntários dos ministérios onde o usuário é líder
   */
  @Get('leader/pending')
  @Authorize({
    anyOf: [{
      membership: {
        roles: [MembershipRole.Leader],
        tenantFrom: 'user',
      }
    }]
  })
  async getLeaderPendingSubmissions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getLeaderPendingSubmissions] Buscando submissões pendentes para líder ${req.user._id}`);

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const result = await this.ministryApprovalService.getLeaderPendingSubmissions(
        req.user._id,
        tenantId,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(HttpStatus.OK).json({
        message: 'Submissões pendentes encontradas',
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      this.logger.error(`[getLeaderPendingSubmissions] Erro: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * 🔍 Busca histórico de aprovações de um líder
   */
  @Get('leader/history')
  @Authorize({
    anyOf: [{
      membership: {
        roles: [MembershipRole.Leader],
        tenantFrom: 'user',
      }
    }]
  })
  async getLeaderApprovalHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`[getLeaderApprovalHistory] Buscando histórico do líder ${req.user._id}`);

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Tenant não encontrado',
        });
      }

      const result = await this.ministryApprovalService.getLeaderApprovalHistory(
        req.user._id,
        tenantId,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(HttpStatus.OK).json({
        message: 'Histórico de aprovações encontrado',
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      this.logger.error(`[getLeaderApprovalHistory] Erro: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }
}
