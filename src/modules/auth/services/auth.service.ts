import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from '../DTO/login-user.dto';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Role } from 'src/common/enums/role.enum';
import { TenantService } from 'src/modules/tenants/services/tenants.service';
import { BranchService } from 'src/modules/branches/services/branches.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tenantService: TenantService,
    private readonly branchService: BranchService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID?.trim());
  }

  async login(loginDto: LoginUserDto, deviceId: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta');

    return this.generateTokens(user, deviceId, true);
  }

  async googleLogin(idToken: string, deviceId = 'google-default') {
    if (!idToken) throw new UnauthorizedException('Token Google ausente');

    // DEBUG: Exibir dados do token
    const decoded: any = jwt.decode(idToken);
    console.log('🔹 Token AUD:', decoded?.aud);
    console.log('🔹 ENV GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID?.trim() as string,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Token Google inválido');

      const email = payload.email ?? '';
      const name = payload.name ?? '';
      const picture = payload.picture ?? '';
      const googleId = payload.sub ?? '';

      if (!email) {
        throw new UnauthorizedException(
          'E-mail não encontrado no token Google',
        );
      }

      // Busca ou cria o usuário
      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.create(
          {
            name,
            email,
            password: null,
            role: Role.Volunteer,
            googleId,
            picture,
          },
          'defaultTenant',
        );
      }

      return this.generateTokens(user, deviceId); // ✅ Passando deviceId
    } catch (error) {
      console.error('❌ Erro Google Login:', error.message);
      throw new InternalServerErrorException(
        `Falha na validação do token Google: ${error.message}`,
      );
    }
  }

  private async generateTokens(
    user: any,
    deviceId: string,
    isNewSession = false,
    absoluteExpiry?: Date,
  ) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId ?? null,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(40).toString('hex');
    await this.usersService.addRefreshToken(
      user._id,
      refreshToken,
      deviceId,
      isNewSession,
      absoluteExpiry,
    );

    const tenant = await this.tenantService.findById(user.tenantId);

    let branch;
    if (user.branchId) {
      branch = await this.branchService.findById(user.branchId);
    }
    console.log(user)
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture
      },
      tenant: {
        id: tenant._id,
        tenantId: tenant.tenantId,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        description: tenant.description,
      },
      branch: branch
        ? {
            id: branch._id,
            branchId: branch.branchId,
            name: branch.name,
          }
        : null,
    };
  }

  async refreshToken(token: string, deviceId: string) {
    const user = await this.usersService.findByRefreshToken(token);
    if (!user)
      throw new UnauthorizedException('Refresh token inválido ou expirado');

    const session = user.refreshTokens.find((rt) => rt.token === token);
    if (!session) throw new UnauthorizedException('Sessão não encontrada');

    // Verifica expiração absoluta
    if (
      session.absoluteExpiry &&
      new Date() > new Date(session.absoluteExpiry)
    ) {
      await this.usersService.removeRefreshToken(user._id.toString(), token);
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    // ✅ Captura absoluteExpiry ANTES de apagar
    const preservedAbsoluteExpiry = session.absoluteExpiry;

    // Apaga token antigo
    await this.usersService.removeRefreshToken(user._id.toString(), token);

    // Gera novos tokens usando a mesma absoluteExpiry
    return this.generateTokens(user, deviceId, false, preservedAbsoluteExpiry);
  }

  async logout(userId: string, deviceId: string) {
    await this.usersService.removeRefreshToken(userId, deviceId);
  }
}
