import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middlewares/tenant.middleware';

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenantId;
  },
);