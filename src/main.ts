import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ⬇️ Carrega as variáveis de ambiente antes de tudo
import { loadEnvironmentFile, validateRequiredEnvVars } from './config/dotenv.config';

// ⬇️ importe o pipe customizado
import { ValidateDtoPipe } from './common/pipes/validate-dto.pipe';

async function bootstrap() {
  // ⬇️ Carrega as variáveis de ambiente primeiro
  loadEnvironmentFile();
  validateRequiredEnvVars();
  
  const app = await NestFactory.create(AppModule);

  // Segurança
  app.use(helmet());
  app.enableCors();

  // ✅ Validação global (substitui o ValidationPipe nativo)
  app.useGlobalPipes(new ValidateDtoPipe());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Servus API')
    .setDescription('Documentação da API Servus - Gestão de Voluntariado')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 8080 || 3000);
}
bootstrap();
