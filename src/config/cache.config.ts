import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ConfigService } from '@nestjs/config';

export const cacheConfig = (configService: ConfigService): CacheModuleOptions => ({
  store: redisStore as any,
  host: configService.get<string>('environment.redis.host'),
  port: configService.get<number>('environment.redis.port'),
  password: configService.get<string>('environment.redis.password'),
  db: configService.get<number>('environment.redis.db'),
  ttl: 300, // 5 minutos por padrão
  max: 1000, // máximo de 1000 chaves em cache
});
