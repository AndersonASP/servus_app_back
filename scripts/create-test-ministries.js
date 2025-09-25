const { MongoClient } = require('mongodb');

async function createTestMinistries() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/servus');
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    
    const db = client.db();
    const ministriesCollection = db.collection('ministries');
    
    // Verificar se já existem ministérios
    const existingCount = await ministriesCollection.countDocuments();
    console.log(`📊 Ministérios existentes: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('ℹ️  Ministérios já existem no banco');
      const ministries = await ministriesCollection.find({ isActive: true }).toArray();
      console.log('📋 Ministérios ativos:');
      ministries.forEach(ministry => {
        console.log(`  - ${ministry.name} (${ministry._id})`);
      });
      return;
    }
    
    // Criar ministérios de teste
    const testMinistries = [
      {
        name: 'Louvor e Adoração',
        slug: 'louvor-e-adoracao',
        description: 'Ministério responsável pela música e adoração',
        ministryFunctions: ['Vocalista', 'Instrumentista', 'Técnico de Som', 'Líder de Louvor'],
        isActive: true,
        tenantId: null, // Será preenchido se necessário
        branchId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Evangelismo',
        slug: 'evangelismo',
        description: 'Ministério de evangelização e missões',
        ministryFunctions: ['Evangelista', 'Missionário', 'Visitador', 'Coordenador de Eventos'],
        isActive: true,
        tenantId: null,
        branchId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Crianças',
        slug: 'criancas',
        description: 'Ministério infantil e educação cristã',
        ministryFunctions: ['Professor', 'Auxiliar', 'Coordenador', 'Recreador'],
        isActive: true,
        tenantId: null,
        branchId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jovens',
        slug: 'jovens',
        description: 'Ministério jovem e adolescentes',
        ministryFunctions: ['Líder', 'Auxiliar', 'Coordenador de Eventos', 'Mentor'],
        isActive: true,
        tenantId: null,
        branchId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Recepção',
        slug: 'recepcao',
        description: 'Ministério de recepção e acolhimento',
        ministryFunctions: ['Recepcionista', 'Acolhedor', 'Coordenador', 'Auxiliar'],
        isActive: true,
        tenantId: null,
        branchId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('🚀 Criando ministérios de teste...');
    const result = await ministriesCollection.insertMany(testMinistries);
    console.log(`✅ ${result.insertedCount} ministérios criados com sucesso!`);
    
    // Listar ministérios criados
    const createdMinistries = await ministriesCollection.find({}).toArray();
    console.log('📋 Ministérios criados:');
    createdMinistries.forEach(ministry => {
      console.log(`  - ${ministry.name} (${ministry._id})`);
      console.log(`    Funções: ${ministry.ministryFunctions.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexão fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestMinistries();
}

module.exports = { createTestMinistries };
