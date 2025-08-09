import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      console.warn('Erro no JWT:', err || info);

      // 🔒 Trate erro de token expirado
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado. Faça login novamente.');
      }

      // 🔒 Trate erro de token inválido
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('Token ausente ou inválido.');
      }

      throw new UnauthorizedException('Acesso não autorizado.');
    }

    return user;
  }
}