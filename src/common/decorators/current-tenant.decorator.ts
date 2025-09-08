import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middlewares/tenant.middleware';

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<TenantRequest>();
    return req.tenantSlug ?? (req as any).user?.tenantId ?? undefined;
  },
);
