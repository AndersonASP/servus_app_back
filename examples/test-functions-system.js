const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0";

async function testFunctionsSystem() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    
    const db = client.db('servus');
    
    // 1. Verificar se existe um tenant
    const tenantsCollection = db.collection('tenants');
    const tenant = await tenantsCollection.findOne({});
    
    if (!tenant) {
      console.log('❌ Nenhum tenant encontrado. Criando tenant de teste...');
      
      const testTenant = {
        tenantId: 'test',
        name: 'Tenant de Teste',
        features: {
          functionsByMinistry: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await tenantsCollection.insertOne(testTenant);
      console.log('✅ Tenant de teste criado');
    } else {
      console.log('✅ Tenant encontrado:', tenant.tenantId);
      
      // Ativar feature flag se não estiver ativa
      if (!tenant.features?.functionsByMinistry) {
        await tenantsCollection.updateOne(
          { _id: tenant._id },
          { $set: { 'features.functionsByMinistry': true } }
        );
        console.log('✅ Feature flag ativada');
      } else {
        console.log('✅ Feature flag já está ativa');
      }
    }
    
    // 2. Verificar se existe um ministério
    const ministriesCollection = db.collection('ministries');
    const ministry = await ministriesCollection.findOne({});
    
    if (!ministry) {
      console.log('❌ Nenhum ministério encontrado. Criando ministério de teste...');
      
      const testMinistry = {
        name: 'Ministério de Teste',
        tenant: tenant?._id || 'test',
        branch: 'test-branch',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await ministriesCollection.insertOne(testMinistry);
      console.log('✅ Ministério de teste criado');
    } else {
      console.log('✅ Ministério encontrado:', ministry.name);
    }
    
    // 3. Verificar collections de funções
    const functionsCollection = db.collection('functions');
    const ministryFunctionsCollection = db.collection('ministryfunctions');
    const memberFunctionsCollection = db.collection('memberfunctions');
    
    console.log('\n📊 Status das Collections:');
    console.log(`- functions: ${await functionsCollection.countDocuments()} documentos`);
    console.log(`- ministryfunctions: ${await ministryFunctionsCollection.countDocuments()} documentos`);
    console.log(`- memberfunctions: ${await memberFunctionsCollection.countDocuments()} documentos`);
    
    // 4. Testar API endpoints
    console.log('\n🧪 Testando APIs...');
    
    const baseUrl = 'http://localhost:3000';
    const testMinistryId = ministry?._id?.toString() || 'test-ministry';
    
    // Teste 1: Listar funções do tenant
    try {
      const response = await fetch(`${baseUrl}/functions?scope=tenant`, {
        headers: {
          'X-Tenant-ID': 'test',
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (response.status === 401) {
        console.log('⚠️  API retornou 401 - Token necessário para testes completos');
      } else if (response.status === 200) {
        const data = await response.json();
        console.log('✅ GET /functions?scope=tenant:', data);
      } else {
        console.log(`❌ GET /functions?scope=tenant: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    // Teste 2: Listar funções do ministério
    try {
      const response = await fetch(`${baseUrl}/ministries/${testMinistryId}/functions`, {
        headers: {
          'X-Tenant-ID': 'test',
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (response.status === 401) {
        console.log('⚠️  API retornou 401 - Token necessário para testes completos');
      } else if (response.status === 200) {
        const data = await response.json();
        console.log('✅ GET /ministries/{id}/functions:', data);
      } else {
        console.log(`❌ GET /ministries/{id}/functions: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Faça login no app Flutter');
    console.log('2. Navegue para um ministério');
    console.log('3. Acesse a aba "Funções"');
    console.log('4. Teste adicionar funções');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

testFunctionsSystem();
