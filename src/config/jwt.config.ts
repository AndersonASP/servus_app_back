import { ConfigService } from '@nestjs/config';

export const JwtConfig = (configService: ConfigService) => ({
  access: {
    secret: configService.get<string>('environment.jwt.accessSecret'),
    expiresIn: configService.get<number>('environment.jwt.accessExpiresIn'),
  },
  refresh: {
    secret: configService.get<string>('environment.jwt.refreshSecret'),
    expiresIn: configService.get<number>('environment.jwt.refreshExpiresIn'),
  },
});
