const mongoose = require('mongoose');

// Schema do Membership
const membershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: false },
  ministry: { type: mongoose.Schema.Types.ObjectId, ref: 'Ministry', required: false },
  role: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Membership = mongoose.model('Membership', membershipSchema);

async function testMongooseQuery() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  try {
    await mongoose.connect(uri);
    console.log('🚀 Conectado ao MongoDB via Mongoose');
    
    const ministryId = '68c5b81fbd9cd3a1aaaf87bd';
    
    console.log(`\n🔍 Testando query com Mongoose para ministério ${ministryId}`);
    
    // Teste 1: Query com string
    console.log('\n📋 Teste 1: Query com string');
    const query1 = {
      ministry: ministryId,
      isActive: true
    };
    
    console.log('   - Query:', JSON.stringify(query1, null, 2));
    
    const result1 = await Membership.find(query1).exec();
    console.log(`   - Resultado: ${result1.length} membros encontrados`);
    
    if (result1.length > 0) {
      console.log('   - Primeiro membro:', JSON.stringify(result1[0], null, 2));
    }
    
    // Teste 2: Query com ObjectId
    console.log('\n📋 Teste 2: Query com ObjectId');
    const query2 = {
      ministry: new mongoose.Types.ObjectId(ministryId),
      isActive: true
    };
    
    console.log('   - Query:', JSON.stringify(query2, null, 2));
    
    const result2 = await Membership.find(query2).exec();
    console.log(`   - Resultado: ${result2.length} membros encontrados`);
    
    if (result2.length > 0) {
      console.log('   - Primeiro membro:', JSON.stringify(result2[0], null, 2));
    }
    
    // Teste 3: Query sem filtro de ministry
    console.log('\n📋 Teste 3: Query sem filtro de ministry');
    const query3 = {
      isActive: true
    };
    
    console.log('   - Query:', JSON.stringify(query3, null, 2));
    
    const result3 = await Membership.find(query3).exec();
    console.log(`   - Resultado: ${result3.length} membros encontrados`);
    
    if (result3.length > 0) {
      console.log('   - Primeiro membro:', JSON.stringify(result3[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testMongooseQuery();
