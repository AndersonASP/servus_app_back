import { Command, CommandRunner } from 'nest-commander';
import { SeedService } from './seed.service';

@Command({
  name: 'seed',
  description: 'Popula o banco com dados iniciais para desenvolvimento/testes',
})
export class SeedCommand extends CommandRunner {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    console.log('🚀 Iniciando seed...');
    await this.seedService.run();
    console.log('✅ Seed finalizado com sucesso.');
  }
}