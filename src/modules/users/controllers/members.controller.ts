import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MembersService } from '../services/members.service';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { MemberResponseDto } from '../dto/member-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
import { PERMS } from 'src/common/enums/role.enum';
import { Authorize } from 'src/common/decorators/authorize/authorize.decorator';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar novo membro com vínculos organizacionais',
    description: 'Cria um novo usuário e atribui vínculos organizacionais de forma atômica. Operação transacional que garante consistência dos dados.'
  })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Membro criado com sucesso',
    type: MemberResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou validação falhou' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Usuário não tem permissão para criar este tipo de membro' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email ou telefone já está em uso no tenant' 
  })
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async createMember(
    @Body() createMemberDto: CreateMemberDto,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user, {
      dtoBranchId: createMemberDto.memberships?.[0]?.branchId,
    });
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole = req.user.memberships?.find(m => m.tenant === tenantId)?.role || 'volunteer';
    const createdBy = req.user.sub;
    
    return this.membersService.createMember(createMemberDto, tenantId, userRole, createdBy);
  }

  @Get()
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async getMembers(
    @Query() filters: MemberFilterDto,
    @Req() req: any,
  ): Promise<{ members: MemberResponseDto[], total: number }> {
    const { tenantId } = resolveTenantAndBranchScope(req.user, {
      dtoBranchId: filters.branchId,
    });
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole = req.user.memberships?.find(m => m.tenant === tenantId)?.role || 'volunteer';
    
    return this.membersService.getMembers(filters, tenantId, userRole);
  }

  @Get(':id')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async getMemberById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    
    return this.membersService.getMemberById(id, tenantId);
  }

  @Put(':id')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async updateMember(
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user, {
      dtoBranchId: updateMemberDto.branchId,
    });
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole = req.user.memberships?.find(m => m.tenant === tenantId)?.role || 'volunteer';
    
    return this.membersService.updateMember(id, updateMemberDto, tenantId, userRole);
  }

  @Delete(':id')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async deleteMember(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole = req.user.memberships?.find(m => m.tenant === tenantId)?.role || 'volunteer';
    
    return this.membersService.deleteMember(id, tenantId, userRole);
  }

  @Patch(':id/toggle-status')
  @RequiresPerm(PERMS.MANAGE_USERS)
  @Authorize({ anyOf: [] })
  async toggleMemberStatus(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<MemberResponseDto> {
    const { tenantId } = resolveTenantAndBranchScope(req.user);
    if (!tenantId) throw new BadRequestException('Tenant ID não encontrado');
    const userRole = req.user.memberships?.find(m => m.tenant === tenantId)?.role || 'volunteer';
    
    return this.membersService.toggleMemberStatus(id, tenantId, userRole);
  }
}