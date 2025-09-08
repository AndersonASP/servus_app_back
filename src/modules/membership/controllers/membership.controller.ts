import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MembershipService } from '../services/membership.service';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UpdateMembershipDto } from '../dto/update-membership.dto';
// import { RequiresPerm } from 'src/common/decorators/requires-perm.decorator';
// import { PERMS } from 'src/common/enums/role.enum';

@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  // 🧪 Rota de teste simples
  @Get('test')
  async test() {
    return {
      message: 'Membership controller está funcionando!',
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================
  // 🔗 VÍNCULO DE MEMBROS EM MINISTÉRIOS
  // ========================================

  // 👥 Adicionar voluntário ao ministério (Leader, BranchAdmin, TenantAdmin, ServusAdmin)
  @Post('tenants/:tenantId/ministries/:ministryId/volunteers')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async addVolunteerToMinistry(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Body() createMembershipDto: CreateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.addVolunteerToMinistry(
      tenantId.trim(),
      ministryId.trim(),
      createMembershipDto,
      userId,
    );

    return res.status(HttpStatus.CREATED).json(result);
  }

  // 👥 Adicionar voluntário ao ministério de filial específica
  @Post('tenants/:tenantId/branches/:branchId/ministries/:ministryId/volunteers')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async addVolunteerToBranchMinistry(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('ministryId') ministryId: string,
    @Body() createMembershipDto: CreateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.addVolunteerToMinistry(
      tenantId.trim(),
      ministryId.trim(),
      { ...createMembershipDto, branchId: branchId.trim() },
      userId,
    );

    return res.status(HttpStatus.CREATED).json(result);
  }

  // 👥 Adicionar líder ao ministério (BranchAdmin, TenantAdmin, ServusAdmin)
  @Post('tenants/:tenantId/ministries/:ministryId/leaders')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  // ])
  async addLeaderToMinistry(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Body() createMembershipDto: CreateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.addLeaderToMinistry(
      tenantId.trim(),
      ministryId.trim(),
      createMembershipDto,
      userId,
    );

    return res.status(HttpStatus.CREATED).json(result);
  }

  // 👥 Adicionar líder ao ministério de filial específica
  @Post('tenants/:tenantId/branches/:branchId/ministries/:ministryId/leaders')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  // ])
  async addLeaderToBranchMinistry(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('ministryId') ministryId: string,
    @Body() createMembershipDto: CreateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.addLeaderToMinistry(
      tenantId.trim(),
      ministryId.trim(),
      { ...createMembershipDto, branchId: branchId.trim() },
      userId,
    );

    return res.status(HttpStatus.CREATED).json(result);
  }

  // ========================================
  // 🔍 CONSULTAS DE MEMBROS
  // ========================================

  // 📋 Listar todos os membros de um ministério
  @Get('tenants/:tenantId/ministries/:ministryId/members')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async getMinistryMembers(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Query() query: { page?: string; limit?: string; role?: string; search?: string },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.membershipService.getMinistryMembers(
      tenantId.trim(),
      ministryId.trim(),
      { page, limit, role: query.role, search: query.search },
      req.user,
    );
  }

  // 📋 Listar membros de ministério de filial específica
  @Get('tenants/:tenantId/branches/:branchId/ministries/:ministryId/members')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async getBranchMinistryMembers(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('ministryId') ministryId: string,
    @Query() query: { page?: string; limit?: string; role?: string; search?: string },
    @Req() req: any,
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.membershipService.getMinistryMembers(
      tenantId.trim(),
      ministryId.trim(),
      { page, limit, role: query.role, search: query.search, branchId: branchId.trim() },
      req.user,
    );
  }

  // ========================================
  // 🗑️ REMOÇÃO DE MEMBROS
  // ========================================

  // ❌ Remover membro do ministério (Leader pode remover voluntários, Admin pode remover todos)
  @Delete('tenants/:tenantId/ministries/:ministryId/members/:membershipId')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async removeMinistryMember(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    await this.membershipService.removeMinistryMember(
      tenantId.trim(),
      ministryId.trim(),
      membershipId.trim(),
      userId,
    );

    return res.status(HttpStatus.NO_CONTENT).send();
  }

  // ❌ Remover membro do ministério de filial específica
  @Delete('tenants/:tenantId/branches/:branchId/ministries/:ministryId/members/:membershipId')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  //   PERMS.MANAGE_MINISTRY_VOLUNTEERS,
  // ])
  async removeBranchMinistryMember(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('ministryId') ministryId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    await this.membershipService.removeMinistryMember(
      tenantId.trim(),
      ministryId.trim(),
      membershipId.trim(),
      userId,
      branchId.trim(),
    );

    return res.status(HttpStatus.NO_CONTENT).send();
  }

  // ========================================
  // 🔄 ATUALIZAÇÃO DE MEMBROS
  // ========================================

  // ✏️ Atualizar role de membro (apenas Admin)
  @Post('tenants/:tenantId/ministries/:ministryId/members/:membershipId/update-role')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  // ])
  async updateMemberRole(
    @Param('tenantId') tenantId: string,
    @Param('ministryId') ministryId: string,
    @Param('membershipId') membershipId: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.updateMemberRole(
      tenantId.trim(),
      ministryId.trim(),
      membershipId.trim(),
      updateMembershipDto,
      userId,
    );

    return res.status(HttpStatus.OK).json(result);
  }

  // ✏️ Atualizar role de membro em filial específica
  @Post('tenants/:tenantId/branches/:branchId/ministries/:ministryId/members/:membershipId/update-role')
  // @RequiresPerm([
  //   PERMS.MANAGE_ALL_TENANTS,
  //   PERMS.MANAGE_TENANT_MINISTRIES,
  //   PERMS.MANAGE_BRANCH_MINISTRIES,
  // ])
  async updateBranchMemberRole(
    @Param('tenantId') tenantId: string,
    @Param('branchId') branchId: string,
    @Param('ministryId') ministryId: string,
    @Param('membershipId') membershipId: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('userId ausente');

    const result = await this.membershipService.updateMemberRole(
      tenantId.trim(),
      ministryId.trim(),
      membershipId.trim(),
      updateMembershipDto,
      userId,
      branchId.trim(),
    );

    return res.status(HttpStatus.OK).json(result);
  }
}
