import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DatabaseConfig = [
  ConfigModule.forRoot({ isGlobal: true }),
  MongooseModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      uri: config.get<string>('MONGO_URI'),
    }),
  }),
];