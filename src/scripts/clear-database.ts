// src/scripts/clear-database.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function clearDatabase() {
  console.log('🧹 Iniciando limpeza da base de dados...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // Lista todas as coleções
    const collections = await connection.db!.listCollections().toArray();
    
    console.log(`📋 Encontradas ${collections.length} coleções:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Remove todas as coleções (exceto system)
    for (const collection of collections) {
      if (!collection.name.startsWith('system.')) {
        console.log(`🗑️  Removendo coleção: ${collection.name}`);
        await connection.db!.dropCollection(collection.name);
      }
    }
    
    console.log('✅ Base de dados limpa com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar base de dados:', error);
  } finally {
    await connection.close();
    await app.close();
    process.exit(0);
  }
}

clearDatabase();
