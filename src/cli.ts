import { NestFactory } from '@nestjs/core';
import { SeedsModule } from './scripts/seed/seed.module'; // <-- SeedsModule
import { SeedService } from './scripts/seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedsModule);
  const seeder = app.get(SeedService);

  try {
    await seeder.run();
    console.log('✅ Seed finalizado com sucesso.');
  } catch (e) {
    console.error('❌ Seed falhou:', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();