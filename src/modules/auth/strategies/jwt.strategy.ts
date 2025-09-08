import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ||
        'default-access-secret-change-in-production',
    });
  }

  async validate(payload: any) {
    // payload contém o que foi assinado no token
    return {
      sub: payload.sub, // ID do usuário (MongoDB ObjectId como string)
      email: payload.email,
      role: payload.role,
      name: payload.name,
      picture: payload.picture,
      // Incluir tenantId e branchId do token
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      membershipRole: payload.membershipRole,
      permissions: payload.permissions,
    };
  }
}
