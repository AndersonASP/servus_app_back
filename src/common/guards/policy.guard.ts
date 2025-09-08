// src/common/guards/policy.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// 👇 para liberar rotas com @Public()
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Role, ROLE_PERMISSIONS } from '../enums/role.enum';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';

import {
  AuthorizePolicy,
  AUTHZ_KEY,
  GlobalRule,
  MembershipRule,
} from '../decorators/authorize/authorize.decorator';
import {
  getParam,
  getTenantSlug,
  toObjectId,
} from '../utils/authorize/authorize.utils';
import {
  REQUIRES_PERM_KEY,
  RequiresPermMetadata,
} from '../decorators/requires-perm.decorator';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Membership.name) private readonly memModel: Model<Membership>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 🔓 rota pública? libera sem RBAC
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    // console.log('🔍 PolicyGuard.canActivate - req.user completo:', user);
    // console.log('🔍 PolicyGuard.canActivate - user._id:', user?._id);
    // console.log('🔍 PolicyGuard.canActivate - user.sub:', user?.sub);
    // console.log('🔍 PolicyGuard.canActivate - user.role:', user?.role);

    if (!user) throw new ForbiddenException('Usuário não autenticado.');

    // 🚀 Bypass para ServusAdmin
    if (user.role === Role.ServusAdmin) return true;

    // Verifica permissões específicas primeiro
    const requiresPerm = this.reflector.getAllAndOverride<RequiresPermMetadata>(
      REQUIRES_PERM_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requiresPerm) {
      // Tenta usar user._id primeiro, depois user.sub como fallback
      const userId = user._id || user.sub;
      // console.log('🔍 PolicyGuard.canActivate - userId para getUserPermissions:', userId);
      // console.log('🔍 PolicyGuard.canActivate - user._id:', user._id);
      // console.log('🔍 PolicyGuard.canActivate - user.sub:', user.sub);

      if (!userId) {
        // console.log('❌ PolicyGuard.canActivate - userId é undefined/null!');
        // console.log('❌ PolicyGuard.canActivate - user completo:', JSON.stringify(user, null, 2));
        throw new ForbiddenException('ID do usuário não encontrado no token.');
      }

      const userPermissions = await this.getUserPermissions(userId, req);
      const hasPermission = this.checkPermissions(
        userPermissions,
        requiresPerm,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este recurso.',
        );
      }

      return true;
    }

    // Fallback para o sistema antigo de authorize
    const policy = this.reflector.getAllAndOverride<AuthorizePolicy>(
      AUTHZ_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!policy) return true;

    for (const rule of policy.anyOf) {
      // 1) regra global
      if ((rule as GlobalRule).global) {
        const { global } = rule as GlobalRule;
        if (global.includes(user.role as Role)) return true;
        continue;
      }

      // 2) regra de membership
      const m = (rule as MembershipRule).membership;
      if (!m) continue;

      const tenantFrom = m.tenantFrom ?? 'param';
      const tenantParam = m.tenantParam ?? 'tenantId';
      const tenantHeader = m.tenantHeader ?? 'x-tenant-id';

      const tenantSlug = getTenantSlug(
        req,
        tenantFrom,
        tenantParam,
        tenantHeader,
      );
      if (!tenantSlug) throw new NotFoundException('tenantId é obrigatório.');

      // resolve tenant uma vez
      const tenant = await this.tenantModel
        .findOne({ tenantId: tenantSlug })
        .select('_id')
        .lean();
      if (!tenant) throw new NotFoundException('Tenant não encontrado.');

      // parâmetros opcionais de escopo
      const branchIdStr = getParam(req, m.branchParam);
      const ministryIdStr = getParam(req, m.ministryParam);
      const branchOid = toObjectId(branchIdStr);
      const ministryOid = toObjectId(ministryIdStr);

      // garante que a branch (se passada) pertence ao tenant
      if (branchOid) {
        const belongs = await this.branchModel.exists({
          _id: branchOid,
          tenant: tenant._id,
        });
        if (!belongs) continue; // branch de outro tenant → falha esta regra
      }

      // monta $or de memberships aceitos
      const or: any[] = [];
      for (const role of m.roles) {
        const cond: any = {
          user: user._id as Types.ObjectId,
          tenant: tenant._id as Types.ObjectId,
          role,
          isActive: true,
        };

        if (branchOid) cond.branch = branchOid;
        else if (m.allowNullBranch) cond.branch = null;

        if (ministryOid) cond.ministry = ministryOid;
        else if (m.allowNullMinistry) cond.ministry = null;

        or.push(cond);
      }

      if (!or.length) continue;

      const has = await this.memModel.exists({ $or: or });
      if (has) return true;
    }

    throw new ForbiddenException(
      'Você não tem permissão para acessar este recurso.',
    );
  }

  private async getUserPermissions(
    userId: string,
    req: any,
  ): Promise<string[]> {
    const permissions: string[] = [];

    // Converte userId para ObjectId
    const userIdObjectId = new Types.ObjectId(userId);

    // Busca memberships ativos do usuário
    const memberships = await this.memModel
      .find({
        user: userIdObjectId,
        isActive: true,
      })
      .populate('tenant branch ministry')
      .lean();

    for (const membership of memberships) {
      const rolePermissions = ROLE_PERMISSIONS[membership.role] || [];
      permissions.push(...rolePermissions);
    }

    // Remove duplicatas
    return [...new Set(permissions)];
  }

  private checkPermissions(
    userPermissions: string[],
    requiresPerm: RequiresPermMetadata,
  ): boolean {
    const { permissions, requireAll } = requiresPerm;

    if (requireAll) {
      // Precisa ter TODAS as permissões
      return permissions.every((perm) => userPermissions.includes(perm));
    } else {
      // Precisa ter pelo menos UMA permissão
      return permissions.some((perm) => userPermissions.includes(perm));
    }
  }
}
