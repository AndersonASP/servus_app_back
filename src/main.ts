import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Segurança
  app.use(helmet());
  app.enableCors();

  // Validações globais
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Guards globais
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // 📌 Configuração Swagger
  const config = new DocumentBuilder()
    .setTitle('Servus API')
    .setDescription('Documentação da API Servus - Gestão de Voluntariado')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-tenant-id',
        in: 'header',
      },
      'tenant',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
