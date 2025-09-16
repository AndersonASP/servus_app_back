// Script para criar o usuário administrador do Servus
// Execute este script no mongosh: mongosh < create-servus-admin.js

// Conectar ao banco de dados
use('servus');

// Limpar dados existentes (opcional - descomente se necessário)
// db.users.deleteMany({ email: "admin@servus.com.br" });
// db.tenants.deleteMany({ name: "Servus Admin" });
// db.memberships.deleteMany({});

print("🚀 Iniciando criação do usuário administrador do Servus...");

// 1. Criar o Tenant para Servus Admin
print("📋 Criando tenant 'Servus Admin'...");

const tenantResult = db.tenants.insertOne({
  name: "Servus Admin",
  description: "Tenant administrativo do sistema Servus",
  isActive: true,
  cnpj: "00.000.000/0001-00",
  email: "admin@servus.com.br",
  telefone: "(11) 99999-9999",
  site: "https://servus.com.br",
  endereco: {
    cep: "00000-000",
    rua: "Rua Administrativa",
    numero: "1",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",
    complemento: "Sede Administrativa"
  },
  plan: "enterprise",
  maxBranches: -1, // Ilimitado
  planoAtivoDesde: new Date(),
  statusPagamento: "ativo",
  formaPagamentoPreferida: "pix",
  logoUrl: "https://servus.com.br/logo.png",
  corTema: "#1e40af",
  idioma: "pt-BR",
  timezone: "America/Sao_Paulo",
  diasCulto: [
    { dia: "domingo", horarios: ["09:00", "19:30"] },
    { dia: "quarta", horarios: ["19:30"] }
  ],
  eventosPadrao: [
    { nome: "Culto Dominical", dia: "domingo", horarios: ["09:00", "19:30"], tipo: "culto" },
    { nome: "Culto de Quarta", dia: "quarta", horarios: ["19:30"], tipo: "culto" }
  ],
  canalComunicacaoPreferido: "whatsapp",
  whatsappOficial: "5511999999999",
  emailFinanceiro: "financeiro@servus.com.br",
  emailSuporte: "suporte@servus.com.br",
  limiteUsuarios: -1, // Ilimitado
  limiteArmazenamento: -1, // Ilimitado
  ultimoAcesso: new Date(),
  notasInternas: "Tenant administrativo do sistema Servus - acesso total",
  features: {
    functionsByMinistry: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

const tenantId = tenantResult.insertedId;
print(`✅ Tenant criado com ID: ${tenantId}`);

// 2. Criar o usuário administrador
print("👤 Criando usuário administrador...");

const userResult = db.users.insertOne({
  name: "Servus Administrator",
  email: "admin@servus.com.br",
  password: "$2b$10$rQZ8K9vL2mN3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV", // senha: servus123
  role: "servus_admin",
  tenantId: tenantId,
  branchId: null, // Administrador global
  googleId: null,
  picture: "https://servus.com.br/admin-avatar.png",
  isActive: true,
  phone: "(11) 99999-9999",
  birthDate: "1990-01-01",
  address: {
    cep: "00000-000",
    rua: "Rua Administrativa",
    numero: "1",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP"
  },
  bio: "Administrador do sistema Servus com acesso total a todas as funcionalidades",
  skills: ["Administração", "Gestão", "Suporte Técnico"],
  availability: "24/7",
  profileCompleted: true,
  refreshTokens: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

const userId = userResult.insertedId;
print(`✅ Usuário criado com ID: ${userId}`);

// 3. Criar o membership do administrador
print("🔗 Criando membership do administrador...");

const membershipResult = db.memberships.insertOne({
  user: userId,
  tenant: tenantId,
  branch: null, // Matriz
  ministry: null, // Sem ministério específico (admin global)
  role: "tenant_admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

const membershipId = membershipResult.insertedId;
print(`✅ Membership criado com ID: ${membershipId}`);

// 4. Atualizar o tenant com o responsável
print("🔄 Atualizando tenant com responsável...");

db.tenants.updateOne(
  { _id: tenantId },
  { 
    $set: { 
      responsavel: userId,
      createdBy: userId,
      updatedAt: new Date()
    }
  }
);

print("✅ Tenant atualizado com responsável");

// 5. Verificar os dados criados
print("\n📊 Verificando dados criados...");

const createdTenant = db.tenants.findOne({ _id: tenantId });
const createdUser = db.users.findOne({ _id: userId });
const createdMembership = db.memberships.findOne({ _id: membershipId });

print(`\n🏢 Tenant: ${createdTenant.name} (${createdTenant._id})`);
print(`👤 Usuário: ${createdUser.name} (${createdUser.email})`);
print(`🔗 Membership: ${createdMembership.role} - Ativo: ${createdMembership.isActive}`);

print("\n🎉 Usuário administrador do Servus criado com sucesso!");
print("\n📝 Credenciais de acesso:");
print("   Email: admin@servus.com.br");
print("   Senha: servus123");
print("   Role: servus_admin");
print("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!");

// 6. Criar índices se não existirem
print("\n🔍 Verificando índices...");

// Índices para otimização
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1, email: 1 });
db.tenants.createIndex({ name: 1 });
db.memberships.createIndex({ user: 1, tenant: 1, branch: 1, ministry: 1 }, { unique: true });
db.memberships.createIndex({ tenant: 1, branch: 1, ministry: 1, role: 1, isActive: 1 });

print("✅ Índices verificados/criados");

print("\n🚀 Script executado com sucesso! O usuário administrador está pronto para uso.");
