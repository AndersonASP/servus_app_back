import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { MemberFunctionService, CreateMemberFunctionDto, UpdateMemberFunctionStatusDto, MemberFunctionResponseDto } from '../services/member-function.service';
import { MemberFunctionStatus } from '../schemas/member-function.schema';
import { PolicyGuard } from '../../../common/guards/policy.guard';
import { Authorize } from '../../../common/decorators/authorize/authorize.decorator';
import { Role, MembershipRole } from '../../../common/enums/role.enum';
import { resolveTenantAndBranchScope } from '../../../common/utils/helpers/user-scope.util';

@Controller('member-functions')
@UseGuards(PolicyGuard)
export class MemberFunctionController {
  constructor(private readonly memberFunctionService: MemberFunctionService) {}

  /**
   * GET /member-functions/user/:userId
   * Listar todas as funções de um usuário
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
  async getUserFunctions(
    @Param('userId') userId: string,
    @Request() req: any
  ): Promise<MemberFunctionResponseDto[]> {
    const tenantId = await this.findUserTenantId(req);
    return await this.memberFunctionService.getUserFunctionsByUser(userId, tenantId);
  }

  /**
   * GET /member-functions/user/:userId/ministry/:ministryId
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
    @Request() req: any,
    @Query('status') status?: MemberFunctionStatus
  ): Promise<MemberFunctionResponseDto[]> {
    console.log('🎯 [MemberFunctionController] getUserFunctionsByUserAndMinistry chamado');
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
      const result = await this.memberFunctionService.getUserFunctionsByUserAndMinistry(userId, ministryId, status, tenantId);
      console.log('✅ [MemberFunctionController] Resultado retornado:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ [MemberFunctionController] Erro no controller:', error);
      throw error;
    }
  }

  /**
   * GET /member-functions/user/:userId/approved
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
    @Request() req: any
  ): Promise<MemberFunctionResponseDto[]> {
    const tenantId = await this.findUserTenantId(req);
    return await this.memberFunctionService.getApprovedFunctionsForUser(userId, tenantId);
  }

  /**
   * POST /member-functions
   * Criar nova função de membro
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
  async createMemberFunction(
    @Body() createDto: CreateMemberFunctionDto,
    @Request() req: any
  ): Promise<MemberFunctionResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    const currentUserId = req.user?.id || req.user?.sub;
    
    return await this.memberFunctionService.createMemberFunction(
      tenantId || '',
      null, // branchId
      createDto,
      currentUserId
    );
  }

  /**
   * PUT /member-functions/:id/status
   * Atualizar status de uma função de membro
   */
  @Put(':id/status')
  @Authorize({
    anyOf: [
      { global: [Role.ServusAdmin] },
      { membership: { roles: [MembershipRole.TenantAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.BranchAdmin], tenantFrom: 'header' } },
      { membership: { roles: [MembershipRole.Leader], tenantFrom: 'header' } }
    ]
  })
  async updateMemberFunctionStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateMemberFunctionStatusDto,
    @Request() req: any
  ): Promise<MemberFunctionResponseDto> {
    const currentUserId = req.user?.id || req.user?.sub;
    updateDto.approvedBy = currentUserId;
    
    return await this.memberFunctionService.updateMemberFunctionStatus(id, updateDto);
  }

  /**
   * DELETE /member-functions/:id
   * Deletar função de membro
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
  async deleteMemberFunction(
    @Param('id') id: string
  ): Promise<void> {
    return await this.memberFunctionService.deleteMemberFunction(id);
  }

  private async findUserTenantId(req: any): Promise<string | undefined> {
    try {
      const { tenantId } = resolveTenantAndBranchScope(req.user);
      return tenantId;
    } catch (error) {
      console.error('❌ findUserTenantId - Erro ao resolver tenantId:', error);
      return undefined;
    }
  }
}
