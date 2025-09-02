import { SetMetadata } from '@nestjs/common';
import { MembershipRole, Role } from 'src/common/enums/role.enum';

export const AUTHZ_KEY = 'authz_policy';

/** Regra global: satisfaz se user.role ∈ global */
export type GlobalRule = { global: Role[] };

/** De onde tirar o tenant */
export type TenantSource = 'param' | 'header' | 'user';

/** Regra de membership: satisfaz se existir um membership compatível */
export type MembershipRule = {
  membership: {
    roles: MembershipRole[];       // ex.: [TenantAdmin]
    tenantFrom?: TenantSource;     // default: 'param'
    tenantParam?: string;          // default: 'tenantId'
    tenantHeader?: string;         // default: 'x-tenant-id'

    // Escopo opcional
    branchParam?: string;          // ex.: 'branchId'
    ministryParam?: string;        // ex.: 'ministryId'

    // Se aceitar vínculo na matriz (branch null) / ministério null
    allowNullBranch?: boolean;     // default: false
    allowNullMinistry?: boolean;   // default: false
  }
};

/** Política: satisfaz se QUALQUER regra (anyOf) for verdadeira */
export type AuthorizePolicy = {
  anyOf: Array<GlobalRule | MembershipRule>;
};

export const Authorize = (policy: AuthorizePolicy) =>
  SetMetadata(AUTHZ_KEY, policy);