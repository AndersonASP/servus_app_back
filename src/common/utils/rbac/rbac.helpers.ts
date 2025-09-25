// src/common/rbac/rbac.helpers.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { RbacScope } from './rbac.types';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Role } from 'src/common/enums/role.enum';

// Model types (ajuste seus imports reais)

/** Resolve _id do tenant a partir do tenantId “amigável” */
export async function resolveTenantObjectId(
  tenantModel: Model<Tenant>,
  tenantId: string,
): Promise<Types.ObjectId> {
  const t = await tenantModel.findById(tenantId).select('_id').lean();
  if (!t) throw new NotFoundException('Tenant not found');
  return t._id as Types.ObjectId;
}

/** Monta o escopo RBAC do usuário para um tenant */
export async function resolveScope(
  user: any,
  tenantOid: Types.ObjectId,
  memModel: Model<Membership>,
): Promise<RbacScope> {
  console.log('🔍 resolveScope - user:', { _id: user._id, role: user.role, email: user.email });
  console.log('🔍 resolveScope - tenantOid:', tenantOid);

  // 1) Servus admin: pode tudo (acima de qualquer tenant/branch)
  if (user.role === Role.ServusAdmin) {
    console.log('✅ resolveScope - ServusAdmin detectado');
    return {
      isServusAdmin: true,
      isTenantAdmin: true,
      branchAdminIds: [],
      leaderPairs: [],
    };
  }

  // 2) Escopo via memberships
  const ms = await memModel
    .find({
      user: new Types.ObjectId(user._id),
      tenant: tenantOid,
      isActive: true,
    })
    .select('role branch ministry')
    .lean();

  console.log('🔍 resolveScope - memberships encontrados:', ms.length);
  console.log('🔍 resolveScope - memberships:', ms);

  const isTenantAdmin = ms.some((m) => m.role === 'tenant_admin' && !m.branch);

  const branchAdminIds = ms
    .filter((m) => m.role === 'branch_admin' && m.branch)
    .map((m) => m.branch as Types.ObjectId);

  const leaderPairs = ms
    .filter((m) => m.role === 'leader' && m.ministry)
    .map((m) => ({
      branch: m.branch,
      ministry: m.ministry as Types.ObjectId,
    }));

  const scope = { isServusAdmin: false, isTenantAdmin, branchAdminIds, leaderPairs };
  console.log('🔍 resolveScope - scope final:', scope);

  return scope;
}

/** Retorna stages ($match) de RBAC para usar no aggregation pipeline */
export function buildRbacMatch(scope: RbacScope) {
  // servus_admin: sem restrição
  if (scope.isServusAdmin) return [];

  // tenant_admin: sem restrição além do tenant (já aplicado fora)
  if (scope.isTenantAdmin) return [];

  const blocks: any[] = [];

  // branch_admin: restringe às branches administradas
  if (scope.branchAdminIds.length) {
    blocks.push({ branch: { $in: scope.branchAdminIds } });
  }

  // leader: restringe aos pares (branch,ministry) que lidera
  if (scope.leaderPairs.length) {
    const leaderConditions = scope.leaderPairs.map((p) => {
      const condition: any = { ministry: p.ministry };
      if (p.branch) {
        condition.branch = p.branch;
      } else {
        condition.branch = null;
      }
      return condition;
    });
    
    blocks.push({ $or: leaderConditions });
  }

  // sem papel válido → bloqueia resultados
  if (!blocks.length) return [{ _id: { $exists: false } }];

  return [{ $or: blocks }];
}

/** Valida filtros (branch/ministry) para evitar que líder fuja do próprio escopo */
export function ensureFiltersWithinScope(
  scope: RbacScope,
  q: { branchId?: string; ministryId?: string },
) {
  // Servus & Tenant admin: sem restrição de filtro
  if (scope.isServusAdmin || scope.isTenantAdmin) return;

  // Branch admin: só pode filtrar por suas branches
  if (scope.branchAdminIds.length) {
    if (q.branchId) {
      const want = new Types.ObjectId(q.branchId);
      const ok = scope.branchAdminIds.some((b) => b.equals(want));
      if (!ok) throw new ForbiddenException('Filial fora do seu escopo');
    }
    return;
  }

  // Apenas líder: precisa validar ambos
  if (scope.leaderPairs.length) {
    if (q.ministryId) {
      const want = new Types.ObjectId(q.ministryId);
      const ok = scope.leaderPairs.some((p) => p.ministry.equals(want));
      if (!ok) throw new ForbiddenException('Ministério fora do seu escopo');
    }

    if (q.branchId) {
      const want = new Types.ObjectId(q.branchId);
      const hasBranchLeader = scope.leaderPairs.some((p) => p.branch);
      if (!hasBranchLeader) {
        // líder apenas na matriz não pode “escolher” branch
        throw new ForbiddenException('Filial fora do seu escopo');
      }
      const ok = scope.leaderPairs.some((p) => p.branch?.equals(want));
      if (!ok) throw new ForbiddenException('Filial fora do seu escopo');
    }
    return;
  }

  // Sem papel
  throw new ForbiddenException('Not allowed');
}
