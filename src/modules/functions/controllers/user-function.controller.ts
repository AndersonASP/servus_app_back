import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException
} from '@nestjs/common';
import { UserFunctionService } from '../services/user-function.service';
import { MemberFunctionService } from '../services/member-function.service';
import { CreateUserFunctionDto, UpdateUserFunctionStatusDto, UserFunctionResponseDto } from '../dto/user-function.dto';
import { UserFunctionStatus } from '../schemas/user-function.schema';
import { resolveTenantAndBranchScope } from '../../../common/utils/helpers/user-scope.util';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from 'src/common/enums/role.enum';


@Controller('user-functions')
export class UserFunctionController {
  constructor(
    private readonly userFunctionService: UserFunctionService,
    private readonly memberFunctionService: MemberFunctionService
  ) {}

  private async findUserTenantId(req: any): Promise<string | undefined> {
    console.log('🔍 findUserTenantId - req.user:', JSON.stringify(req.user, null, 2));
    
    try {
      const { tenantId } = resolveTenantAndBranchScope(req.user);
      console.log('🔍 findUserTenantId - tenantId resolvido:', tenantId);
      return tenantId;
    } catch (error) {
      console.error('❌ findUserTenantId - Erro ao resolver tenantId:', error);
      return undefined;
    }
  }

  private async findUserBranchId(req: any): Promise<string | null> {
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
    @Req() req: any
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
    @Req() req: any
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
    @Req() req: any,
    @Query('status') status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    console.log('🎯 [UserFunctionController] getUserFunctionsByUserAndMinistry chamado - REDIRECIONANDO PARA MemberFunction');
    console.log('   - userId:', userId);
    console.log('   - ministryId:', ministryId);
    console.log('   - status:', status);
    console.log('   - req.user:', req.user);
    
    const tenantId = await this.findUserTenantId(req);
    console.log('   - tenantId extraído:', tenantId);
    console.log('   - tipo do tenantId:', typeof tenantId);
    console.log('   - tenantId é undefined?', tenantId === undefined);
    console.log('   - tenantId é null?', tenantId === null);
    
    try {
      // Converter status do UserFunction para MemberFunction
      let memberFunctionStatus;
      if (status) {
        switch (status) {
          case UserFunctionStatus.PENDING:
            memberFunctionStatus = 'pending';
            break;
          case UserFunctionStatus.APPROVED:
            memberFunctionStatus = 'aprovado';
            break;
          case UserFunctionStatus.REJECTED:
            memberFunctionStatus = 'rejeitado';
            break;
        }
      }
      
      const result = await this.memberFunctionService.getUserFunctionsByUserAndMinistry(
        userId, 
        ministryId, 
        memberFunctionStatus, 
        tenantId
      );
      
      console.log('✅ [UserFunctionController] Resultado do MemberFunction retornado:', JSON.stringify(result, null, 2));
      
      // Converter MemberFunctionResponseDto para UserFunctionResponseDto
      const convertedResult = result.map(mf => ({
        id: mf.id,
        userId: mf.userId,
        ministryId: mf.ministryId,
        functionId: mf.functionId,
        status: this.convertMemberFunctionStatusToUserFunctionStatus(mf.status),
        approvedBy: mf.approvedBy,
        approvedAt: mf.approvedAt,
        notes: mf.notes,
        tenantId: mf.tenantId,
        branchId: mf.branchId,
        createdAt: mf.createdAt,
        updatedAt: mf.updatedAt,
        // Dados populados da função
        function: mf.function ? {
          id: mf.function.id,
          name: mf.function.name,
          description: mf.function.description,
        } : undefined,
        ministry: mf.ministry ? {
          id: mf.ministry.id,
          name: mf.ministry.name,
        } : undefined,
        user: mf.user ? {
          id: mf.user.id,
          name: mf.user.name,
          email: mf.user.email,
        } : undefined,
        // Campos adicionais do MemberFunction que não existem no UserFunction
        level: mf.level,
        priority: mf.priority,
        isActive: mf.isActive,
        createdBy: mf.createdBy
      }));
      
      console.log('✅ [UserFunctionController] Resultado convertido:', JSON.stringify(convertedResult, null, 2));
      return convertedResult;
    } catch (error) {
      console.error('❌ [UserFunctionController] Erro no controller:', error);
      throw error;
    }
  }

  private convertMemberFunctionStatusToUserFunctionStatus(memberStatus: string): UserFunctionStatus {
    switch (memberStatus) {
      case 'pending':
        return UserFunctionStatus.PENDING;
      case 'aprovado':
        return UserFunctionStatus.APPROVED;
      case 'rejeitado':
        return UserFunctionStatus.REJECTED;
      default:
        return UserFunctionStatus.PENDING;
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
    @Param('userId') userId: string,
    @Req() req: any
  ): Promise<UserFunctionResponseDto[]> {
    console.log('🎯 [UserFunctionController] getApprovedFunctionsForUser chamado - REDIRECIONANDO PARA MemberFunction');
    console.log('   - userId:', userId);
    console.log('   - req.user:', req.user);
    
    const tenantId = await this.findUserTenantId(req);
    console.log('   - tenantId extraído:', tenantId);
    
    // Usar MemberFunctionService em vez de UserFunctionService
    const memberFunctions = await this.memberFunctionService.getApprovedFunctionsForUser(userId, tenantId);
    
    console.log('✅ [UserFunctionController] MemberFunctions encontradas:', memberFunctions.length);
    
    // Converter MemberFunctionResponseDto para UserFunctionResponseDto
    const convertedResult = memberFunctions.map(mf => ({
      id: mf.id,
      userId: mf.userId,
      ministryId: mf.ministryId,
      functionId: mf.functionId,
      status: this.convertMemberFunctionStatusToUserFunctionStatus(mf.status),
      approvedBy: mf.approvedBy,
      approvedAt: mf.approvedAt,
      notes: mf.notes,
      tenantId: mf.tenantId,
      branchId: mf.branchId,
      createdAt: mf.createdAt,
      updatedAt: mf.updatedAt,
      // Dados populados da função
      function: mf.function ? {
        id: mf.function.id,
        name: mf.function.name,
        description: mf.function.description,
      } : undefined,
      ministry: mf.ministry ? {
        id: mf.ministry.id,
        name: mf.ministry.name,
      } : undefined,
      user: mf.user ? {
        id: mf.user.id,
        name: mf.user.name,
        email: mf.user.email,
      } : undefined,
      // Campos adicionais do MemberFunction que não existem no UserFunction
      level: mf.level,
      priority: mf.priority,
      isActive: mf.isActive,
      createdBy: mf.createdBy
    }));
    
    console.log('✅ [UserFunctionController] Resultado convertido:', JSON.stringify(convertedResult, null, 2));
    return convertedResult;
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
