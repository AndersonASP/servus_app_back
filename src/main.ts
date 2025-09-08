import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ⬇️ importe o pipe customizado
import { ValidateDtoPipe } from './common/pipes/validate-dto.pipe';

async function bootstrap() {
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

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
