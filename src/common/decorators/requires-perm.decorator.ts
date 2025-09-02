import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PERM_KEY = 'requires_perm';

export interface RequiresPermMetadata {
  permissions: string[];
  requireAll?: boolean; // se true, precisa ter TODAS as permissões
}

export const RequiresPerm = (
  permissions: string | string[],
  requireAll: boolean = false
) => {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  
  return SetMetadata(REQUIRES_PERM_KEY, {
    permissions: perms,
    requireAll,
  } as RequiresPermMetadata);
}; 