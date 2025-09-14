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
    console.log('🔍 findUserTenantId - req.user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 findUserTenantId - req.user.tenantId:', req.user?.tenantId);
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
    console.log('🔍 Controller - createUserFunction chamado');
    console.log('   - dto:', JSON.stringify(dto, null, 2));
    console.log('   - req.user.id:', req.user.id);
    
    const tenantId = await this.findUserTenantId(req);
    const branchId = await this.findUserBranchId(req);
    
    console.log('   - tenantId:', tenantId);
    console.log('   - branchId:', branchId);
    
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
   * GET /user-functions/user/:userId/ministry/:ministryId
   * Listar funções de um usuário em um ministério específico
   */
  @Get('user/:userId/ministry/:ministryId')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async getUserFunctionsByUserAndMinistry(
    @Param('userId') userId: string,
    @Param('ministryId') ministryId: string,
    @Query('status') status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    console.log('🎯 [UserFunctionController] getUserFunctionsByUserAndMinistry chamado');
    console.log('   - userId:', userId);
    console.log('   - ministryId:', ministryId);
    console.log('   - status:', status);
    
    try {
      const result = await this.userFunctionService.getUserFunctionsByUserAndMinistry(userId, ministryId, status);
      console.log('✅ [UserFunctionController] Resultado retornado:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ [UserFunctionController] Erro no controller:', error);
      throw error;
    }
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
