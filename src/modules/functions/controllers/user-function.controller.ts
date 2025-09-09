import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  BadRequestException
} from '@nestjs/common';
import { UserFunctionService } from '../services/user-function.service';
import { CreateUserFunctionDto, UpdateUserFunctionStatusDto, UserFunctionResponseDto } from '../dto/user-function.dto';
import { UserFunctionStatus } from '../schemas/user-function.schema';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';

interface TenantRequest extends Request {
  user: {
    id: string;
    tenantId?: string;
    branchId?: string;
  };
}

@Controller('user-functions')
export class UserFunctionController {
  constructor(private readonly userFunctionService: UserFunctionService) {}

  private async findUserTenantId(req: TenantRequest): Promise<string | null> {
    return req.user?.tenantId || null;
  }

  private async findUserBranchId(req: TenantRequest): Promise<string | null> {
    return req.user?.branchId || null;
  }

  /**
   * POST /user-functions
   * Criar vínculo usuário-função
   */
  @Post()
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async createUserFunction(
    @Body() dto: CreateUserFunctionDto,
    @Request() req: TenantRequest
  ): Promise<UserFunctionResponseDto> {
    const tenantId = await this.findUserTenantId(req);
    const branchId = await this.findUserBranchId(req);
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }
    
    return await this.userFunctionService.createUserFunction(
      tenantId,
      branchId,
      dto,
      req.user.id
    );
  }

  /**
   * PATCH /user-functions/:id/status
   * Aprovar/rejeitar vínculo usuário-função
   */
  @Patch(':id/status')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async updateUserFunctionStatus(
    @Param('id') userFunctionId: string,
    @Body() dto: UpdateUserFunctionStatusDto,
    @Request() req: TenantRequest
  ): Promise<UserFunctionResponseDto> {
    return await this.userFunctionService.updateUserFunctionStatus(
      userFunctionId,
      dto,
      req.user.id
    );
  }

  /**
   * GET /user-functions/user/:userId
   * Listar funções de um usuário
   */
  @Get('user/:userId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getUserFunctionsByUser(
    @Param('userId') userId: string,
    @Query('status') status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    return await this.userFunctionService.getUserFunctionsByUser(userId, status);
  }

  /**
   * GET /user-functions/ministry/:ministryId
   * Listar funções de um ministério
   */
  @Get('ministry/:ministryId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getUserFunctionsByMinistry(
    @Param('ministryId') ministryId: string,
    @Query('status') status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    return await this.userFunctionService.getUserFunctionsByMinistry(ministryId, status);
  }

  /**
   * GET /user-functions/user/:userId/approved
   * Listar funções aprovadas de um usuário
   */
  @Get('user/:userId/approved')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getApprovedFunctionsForUser(
    @Param('userId') userId: string
  ): Promise<UserFunctionResponseDto[]> {
    return await this.userFunctionService.getApprovedFunctionsForUser(userId);
  }

  /**
   * DELETE /user-functions/:id
   * Remover vínculo usuário-função
   */
  @Delete(':id')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async deleteUserFunction(@Param('id') userFunctionId: string): Promise<{ message: string }> {
    await this.userFunctionService.deleteUserFunction(userFunctionId);
    return { message: 'Vínculo usuário-função removido com sucesso' };
  }
}
