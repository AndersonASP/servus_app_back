import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('environment.jwt.accessSecret'),
    });
  }

  async validate(payload: any) {
    // payload contém o que foi assinado no token
    console.log('🔍 [JwtStrategy] Validando token:');
    console.log('   - payload.role:', payload.role);
    console.log('   - payload.membershipRole:', payload.membershipRole);

    // Criar array de roles baseado no payload
    const roles: string[] = [];
    if (payload.role) {
      roles.push(payload.role);
    }
    if (payload.membershipRole && payload.membershipRole !== payload.role) {
      roles.push(payload.membershipRole);
    }

    console.log('   - roles array:', roles);

    return {
      sub: payload.sub, // ID do usuário (MongoDB ObjectId como string)
      _id: payload.sub, // Mapear sub para _id para compatibilidade com o PolicyGuard
      email: payload.email,
      role: payload.role,
      roles: roles, // ← ADICIONADO: array de roles
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
