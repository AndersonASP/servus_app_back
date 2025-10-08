import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InviteCodeService } from '../services/invite-code.service';
import {
  CreateInviteCodeDto,
  ValidateInviteCodeDto,
  RegisterWithInviteDto,
} from '../dto/invite-code.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';

@Controller('invite-codes')
export class InviteCodeController {
  constructor(private readonly inviteCodeService: InviteCodeService) {}

  /**
   * Valida um código de convite (público)
   */
  @Public()
  @Post('validate')
  async validateInviteCode(
    @Body() validateDto: ValidateInviteCodeDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.inviteCodeService.validateInviteCode(validateDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Registra um novo usuário usando código de convite (público)
   */
  @Public()
  @Post('register')
  async registerWithInviteCode(
    @Body() registerDto: RegisterWithInviteDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.inviteCodeService.registerWithInviteCode(registerDto);
      return res.status(HttpStatus.CREATED).json({
        message: 'Usuário registrado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Cria ou regenera código de convite para um ministério (autenticado)
   */
  @Post('ministries/:ministryId')
  @UseGuards(JwtAuthGuard)
  async createMinistryInviteCode(
    @Param('ministryId') ministryId: string,
    @Body() createDto: CreateInviteCodeDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado',
        });
      }

      // TODO: Verificar permissões do usuário para este ministério
      // Por enquanto, assumindo que o usuário tem permissão

      const { tenantId, branchId } = resolveTenantAndBranchScope(req.user);

      if (!tenantId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Tenant ID não encontrado',
        });
      }

      const result = await this.inviteCodeService.createOrRegenerateInviteCode(
        ministryId,
        tenantId,
        branchId || null,
        userId,
        createDto,
      );

      return res.status(HttpStatus.CREATED).json({
        message: 'Código de convite criado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Busca códigos de convite de um ministério (autenticado)
   */
  @Get('ministries/:ministryId')
  @UseGuards(JwtAuthGuard)
  async getMinistryInviteCodes(
    @Param('ministryId') ministryId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado',
        });
      }

      // TODO: Verificar permissões do usuário para este ministério

      const result =
        await this.inviteCodeService.getMinistryInviteCodes(ministryId);

      return res.status(HttpStatus.OK).json({
        message: 'Códigos de convite encontrados',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }

  /**
   * Regenera código de convite de um ministério (autenticado)
   */
  @Put('ministries/:ministryId/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateMinistryInviteCode(
    @Param('ministryId') ministryId: string,
    @Body() createDto: CreateInviteCodeDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Usuário não autenticado',
        });
      }

      const { tenantId, branchId } = resolveTenantAndBranchScope(req.user);

      if (!tenantId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Tenant ID não encontrado',
        });
      }

      const result = await this.inviteCodeService.createOrRegenerateInviteCode(
        ministryId,
        tenantId,
        branchId || null,
        userId,
        { ...createDto, regenerate: true },
      );

      return res.status(HttpStatus.OK).json({
        message: 'Código de convite regenerado com sucesso',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message,
      });
    }
  }
}
