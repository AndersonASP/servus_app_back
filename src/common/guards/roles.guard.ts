import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { hasPermission } from '../utils/permissions.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 🔓 Se a rota não exige role, libera
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 🔒 Bloqueia caso não tenha user no request
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    // 🎯 Pega o tenant e branch da request (params ou body)
    const targetTenantId =
      request.params?.tenantId || request.body?.tenantId || user.tenantId;

    const targetBranchId =
      request.params?.branchId || request.body?.branchId || user.branchId;

    const isAllowed = hasPermission(user, requiredRoles, targetTenantId, targetBranchId);

    if (!isAllowed) {
      throw new ForbiddenException(
        `Acesso negado: esta rota requer as roles [${requiredRoles.join(', ')}], mas sua role é "${user.role}".`,
      );
    }

    return true;
  }
}