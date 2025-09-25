import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

// ⬇️ Carrega as variáveis de ambiente antes de tudo
import { loadEnvironmentFile, validateRequiredEnvVars } from './config/dotenv.config';

// ⬇️ importe o pipe customizado
import { ValidateDtoPipe } from './common/pipes/validate-dto.pipe';

async function bootstrap() {
  // ⬇️ Carrega as variáveis de ambiente primeiro
  loadEnvironmentFile();
  validateRequiredEnvVars();
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Segurança
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "'unsafe-inline'",
          "https://www.gstatic.com",
          "https://fonts.gstatic.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        connectSrc: [
          "'self'",
          "https://www.gstatic.com",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));
  app.enableCors();

  // Servir arquivos estáticos do Flutter Web
  app.useStaticAssets(join(__dirname, '..', '..', 'servus_app/build/web'), {
    prefix: '/',
    index: false, // Não servir index.html automaticamente
  });

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
