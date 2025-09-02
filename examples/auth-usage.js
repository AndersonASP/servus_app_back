// Exemplo de uso do novo fluxo de autenticação otimizado (v2.0)
// Este arquivo demonstra como usar a API melhorada com login leve e contexto separado
const { LocalStorage } = require('node-localstorage');
global.localStorage = new LocalStorage('./scratch'); 
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
// 1. Login leve (apenas dados essenciais)
async function lightLogin() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'device-id': 'device-123'
    },
    body: JSON.stringify({
      email: 'usuario@exemplo.com',
      password: 'senha123'
    })
  });

  const authData = await response.json();
  
  console.log('=== Login Leve ===');
  console.log('Access Token:', authData.access_token);
  console.log('Expires in:', authData.tokenMetadata.expiresIn, 'seconds');
  console.log('User:', authData.user.name);
  
  // tenant, branches, memberships estarão undefined
  console.log('Contexto específico:', authData.tenant || 'Nenhum');
  
  return authData;
}

// 2. Login com contexto específico (dados essenciais + contexto)
async function loginWithContext(tenantSlug) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'device-id': 'device-123',
      'x-tenant-id': tenantSlug
    },
    body: JSON.stringify({
      email: 'usuario@exemplo.com',
      password: 'senha123'
    })
  });

  const authData = await response.json();
  
  console.log('=== Login com Contexto ===');
  console.log('Tenant:', authData.tenant?.name);
  console.log('Branches:', authData.branches?.length || 0);
  console.log('Permissions:', authData.memberships?.[0]?.permissions || []);
  
  return authData;
}

// 3. Carregar contexto completo (quando necessário)
async function loadFullContext(accessToken) {
  const response = await fetch(`${BASE_URL}/auth/me/context`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const contextData = await response.json();
  
  console.log('=== Contexto Completo ===');
  console.log('Total de tenants:', contextData.tenants.length);
  
  contextData.tenants.forEach(tenant => {
    console.log(`- ${tenant.name}: ${tenant.memberships.length} memberships`);
  });
  
  return contextData;
}

// 4. Verificação de permissões
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission) || 
         userPermissions.includes('manage_all_tenants'); // ServusAdmin bypass
}

// 5. Fluxo completo otimizado
async function optimizedAuthFlow() {
  try {
    // Passo 1: Login leve
    const authData = await lightLogin();
    
    // Salvar tokens
    localStorage.setItem('accessToken', authData.access_token);
    localStorage.setItem('refreshToken', authData.refresh_token);
    localStorage.setItem('tokenExpiry', 
      Date.now() + (authData.tokenMetadata.expiresIn * 1000)
    );
    
    // Passo 2: Se precisar de contexto específico
    if (needsTenantContext()) {
      const tenantSlug = getTenantFromURL(); // ex: igreja001.app.com
      if (tenantSlug) {
        const contextData = await loginWithContext(tenantSlug);
        setupTenantUI(contextData);
      }
    }
    
    // Passo 3: Carregar contexto completo apenas quando necessário
    // (ex: tela de troca de igreja, relatórios globais)
    if (isOnTenantSwitchPage() || isOnGlobalReportsPage()) {
      const fullContext = await loadFullContext(authData.accessToken);
      setupGlobalUI(fullContext);
    }
    
  } catch (error) {
    console.error('Erro no fluxo de auth:', error);
  }
}

// 6. Renovação inteligente de token
async function smartTokenRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  const currentTenantId = getCurrentTenantId(); // Se estiver em contexto específico
  
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'device-id': 'device-123',
      // Manter contexto atual se existir
      ...(currentTenantId && { 'x-tenant-id': currentTenantId })
    },
    body: JSON.stringify({ refreshToken })
  });

  const newAuthData = await response.json();
  
  // Atualizar tokens
  localStorage.setItem('accessToken', newAuthData.access_token);
  localStorage.setItem('refreshToken', newAuthData.refresh_token);
  localStorage.setItem('tokenExpiry', 
    Date.now() + (newAuthData.tokenMetadata.expiresIn * 1000)
  );
  
  return newAuthData;
}

// 7. Gerenciamento de estado otimizado
class AuthManager {
  constructor() {
    this.user = null;
    this.currentTenant = null;
    this.fullContext = null;
    this.tokens = null;
    this.restoreTokens();
  }

  async login(email, password, tenantSlug = null) {
    const endpoint = `${BASE_URL}/auth/login`;
    const headers = {
      'Content-Type': 'application/json',
      'device-id': this.getDeviceId(),
    };
    
    if (tenantSlug) {
      headers['x-tenant-id'] = tenantSlug;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password })
    });

    const authData = await response.json();
    
    // Armazenar dados essenciais
    this.user = authData.user;
    this.currentTenant = authData.tenant || null;
    this.tokens = {
      access: authData.access_token,
      refresh: authData.refresh_token,
      metadata: authData.tokenMetadata
    };
    
    // Persistir tokens
    this.persistTokens();
    
    return authData;
  }

  async loadFullContext() {
    if (!this.tokens.access) throw new Error('User not authenticated');
    
    const response = await fetch(`${BASE_URL}/auth/me/context`, {
      headers: {
        'Authorization': `Bearer ${this.tokens.access}`
      }
    });

    this.fullContext = await response.json();
    return this.fullContext;
  }

  async refreshWithContext(tenantSlug) {
    // Ensure tokens are available (attempt restore if not)
    if (!this.tokens || !this.tokens.refresh) {
      this.restoreTokens();
    }
    if (!this.tokens || !this.tokens.refresh) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'device-id': this.getDeviceId(),
        ...(tenantSlug && { 'x-tenant-id': tenantSlug })
      },
      body: JSON.stringify({ refreshToken: this.tokens.refresh })
    });

    const data = await response.json();

    // Update in-memory state and persist
    this.tokens = {
      access: data.access_token,
      refresh: data.refresh_token,
      metadata: data.tokenMetadata
    };
    this.persistTokens();

    return data;
  }

  async switchTenant(tenantSlug) {
    if (!tenantSlug) throw new Error('tenantSlug is required');

    // Make sure we have tokens loaded before attempting refresh
    if (!this.tokens || !this.tokens.refresh) {
      this.restoreTokens();
    }
    if (!this.tokens || !this.tokens.refresh) {
      throw new Error('No refresh token');
    }

    const newAuthData = await this.refreshWithContext(tenantSlug);
    this.currentTenant = newAuthData.tenant || null;
    return newAuthData;
  }

  hasPermission(permission) {
    if (!this.currentTenant?.memberships) return false;
    
    const membership = this.currentTenant.memberships[0]; // Primeiro membership
    return hasPermission(membership?.permissions || [], permission);
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  persistTokens() {
    if (!this.tokens) return;
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('authTokens', JSON.stringify(this.tokens));
  }

  restoreTokens() {
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem('authTokens');
    if (stored) {
      try { this.tokens = JSON.parse(stored); } catch (_) { /* ignore */ }
    }
  }
}

// 8. Exemplo de uso da classe (com await para garantir ordem)
(async () => {
  try {
    // Login simples
    const authData = await authManager.login('user@example.com', 'password');
    console.log('Logado:', authData.user.name);

    // Verificar permissões (se já tiver contexto carregado)
    if (authManager.hasPermission && authManager.hasPermission('manage_branch')) {
      if (typeof showAdminButtons === 'function') showAdminButtons();
    }

    // Trocar de tenant (apenas exemplo; garanta que o usuário tenha refresh token)
    const newData = await authManager.switchTenant('igreja002');
    console.log('Trocou para:', newData.tenant?.name || '(sem tenant)');
    if (typeof updateUI === 'function') updateUI(newData);
  } catch (err) {
    console.error('Erro no exemplo de uso:', err);
  }
})();

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    lightLogin,
    loginWithContext,
    loadFullContext,
    hasPermission,
    optimizedAuthFlow,
    smartTokenRefresh,
    AuthManager
  };
} 