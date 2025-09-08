# Configuração de Ambientes - Servus Backend

Este documento explica como configurar e gerenciar diferentes ambientes (desenvolvimento, homologação e produção) no backend do Servus.

## 📁 Estrutura de Arquivos

```
servus-backend/
├── .env.dev          # Configurações de desenvolvimento
├── .env.hom          # Configurações de homologação  
├── .env.prod         # Configurações de produção
├── .env.example      # Exemplo de configuração
├── render.yaml       # Configuração para deploy no Render
└── src/config/
    └── environment.config.ts  # Configuração centralizada
```

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
# Iniciar em modo desenvolvimento
npm run start:dev

# Build para desenvolvimento
npm run build:dev
```

### Homologação
```bash
# Build para homologação
npm run build:hom

# Iniciar em modo homologação
npm run start:hom
```

### Produção
```bash
# Build para produção
npm run build:prod

# Iniciar em modo produção
npm run start:prod

# Iniciar para Render (sem NODE_ENV)
npm run start:prod:render
```

## 🔧 Configuração de Variáveis de Ambiente

### 1. Crie os arquivos de ambiente

Crie os seguintes arquivos na raiz do projeto:

#### `.env.dev` (Desenvolvimento)
```env
NODE_ENV=development
PORT=3000
API_PREFIX=api
MONGO_URI=mongodb://localhost:27017/servus_dev
JWT_ACCESS_SECRET=dev-access-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
GOOGLE_CLIENT_ID=your-google-client-id-dev
GOOGLE_CLIENT_SECRET=your-google-client-secret-dev
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email-dev@gmail.com
MAIL_PASS=your-app-password-dev
MAIL_FROM=noreply-dev@servusapp.com
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
```

#### `.env.hom` (Homologação)
```env
NODE_ENV=staging
PORT=3000
API_PREFIX=api
MONGO_URI=mongodb+srv://username:password@cluster-hom.mongodb.net/servus_hom
JWT_ACCESS_SECRET=hom-access-secret-key-very-secure
JWT_REFRESH_SECRET=hom-refresh-secret-key-very-secure
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
REDIS_HOST=redis-hom.redis.com
REDIS_PORT=6379
REDIS_PASSWORD=hom-redis-password
REDIS_DB=0
GOOGLE_CLIENT_ID=your-google-client-id-hom
GOOGLE_CLIENT_SECRET=your-google-client-secret-hom
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email-hom@gmail.com
MAIL_PASS=your-app-password-hom
MAIL_FROM=noreply-hom@servusapp.com
CORS_ORIGIN=https://servus-hom.vercel.app,https://hom.servusapp.com
LOG_LEVEL=info
```

#### `.env.prod` (Produção)
```env
NODE_ENV=production
PORT=3000
API_PREFIX=api
MONGO_URI=mongodb+srv://username:password@cluster-prod.mongodb.net/servus_prod
JWT_ACCESS_SECRET=prod-access-secret-key-ultra-secure-random-string
JWT_REFRESH_SECRET=prod-refresh-secret-key-ultra-secure-random-string
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
REDIS_HOST=redis-prod.redis.com
REDIS_PORT=6379
REDIS_PASSWORD=prod-redis-password-very-secure
REDIS_DB=0
GOOGLE_CLIENT_ID=your-google-client-id-prod
GOOGLE_CLIENT_SECRET=your-google-client-secret-prod
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email-prod@gmail.com
MAIL_PASS=your-app-password-prod
MAIL_FROM=noreply@servusapp.com
CORS_ORIGIN=https://servusapp.com,https://www.servusapp.com
LOG_LEVEL=warn
```

### 2. Configure o .gitignore

Adicione os seguintes arquivos ao `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.dev
.env.hom
.env.prod
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

## 🚀 Deploy no Render

### 1. Configuração Manual no Render

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Crie um novo **Web Service**
3. Conecte seu repositório GitHub
4. Configure as seguintes variáveis de ambiente:

#### Variáveis Obrigatórias:
- `NODE_ENV`: `production`
- `MONGO_URI`: Sua string de conexão do MongoDB Atlas
- `JWT_ACCESS_SECRET`: Secret JWT para access tokens
- `JWT_REFRESH_SECRET`: Secret JWT para refresh tokens
- `REDIS_HOST`: Host do seu Redis
- `REDIS_PASSWORD`: Senha do Redis
- `GOOGLE_CLIENT_ID`: Client ID do Google OAuth
- `GOOGLE_CLIENT_SECRET`: Client Secret do Google OAuth
- `MAIL_USER`: Email para envio de notificações
- `MAIL_PASS`: Senha do email

#### Variáveis Opcionais:
- `PORT`: `3000` (padrão)
- `API_PREFIX`: `api` (padrão)
- `REDIS_PORT`: `6379` (padrão)
- `REDIS_DB`: `0` (padrão)
- `MAIL_HOST`: `smtp.gmail.com` (padrão)
- `MAIL_PORT`: `587` (padrão)
- `MAIL_FROM`: `noreply@servusapp.com` (padrão)
- `CORS_ORIGIN`: Domínios permitidos para CORS
- `LOG_LEVEL`: `warn` (padrão)

### 2. Configuração de Build e Start

No Render, configure:
- **Build Command**: `npm ci && npm run build:prod`
- **Start Command**: `npm run start:prod:render`

### 3. Usando o arquivo render.yaml

Alternativamente, você pode usar o arquivo `render.yaml` incluído:

1. Certifique-se de que o arquivo `render.yaml` está na raiz do repositório
2. No Render, selecione "Infrastructure as Code" ao criar o serviço
3. O Render irá ler automaticamente as configurações do arquivo

## 🔒 Segurança

### Variáveis Sensíveis
Nunca commite as seguintes variáveis:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MONGO_URI`
- `REDIS_PASSWORD`
- `GOOGLE_CLIENT_SECRET`
- `MAIL_PASS`

### Validação de Ambiente
O sistema inclui validação automática que verifica:
- Variáveis obrigatórias por ambiente
- Secrets JWT não podem ser os valores padrão em produção
- MongoDB URI não pode ser localhost em produção

## 🐛 Troubleshooting

### Erro de Variável de Ambiente
```
Error: Variável de ambiente obrigatória não encontrada: MONGO_URI
```
**Solução**: Verifique se todas as variáveis obrigatórias estão configuradas.

### Erro de Secret JWT
```
Error: Secrets JWT devem ser alterados em produção
```
**Solução**: Configure secrets JWT únicos e seguros para produção.

### Erro de MongoDB
```
Error: MongoDB URI não pode ser localhost em produção
```
**Solução**: Use uma string de conexão do MongoDB Atlas ou outro serviço de nuvem.

## 📝 Exemplo de Uso no Código

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    const mongoUri = this.configService.get<string>('environment.mongoUri');
    const jwtSecret = this.configService.get<string>('environment.jwt.accessSecret');
    const redisHost = this.configService.get<string>('environment.redis.host');
  }
}
```

## 🔄 Migração de Configuração Existente

Se você já tem configurações existentes, siga estes passos:

1. **Backup**: Faça backup das suas configurações atuais
2. **Crie os arquivos .env**: Crie os arquivos `.env.dev`, `.env.hom`, `.env.prod`
3. **Atualize o código**: O código já foi atualizado para usar a nova estrutura
4. **Teste**: Teste cada ambiente localmente
5. **Deploy**: Configure as variáveis no Render

## 📞 Suporte

Para dúvidas ou problemas com a configuração de ambientes, consulte:
- [Documentação do NestJS Config](https://docs.nestjs.com/techniques/configuration)
- [Documentação do Render](https://render.com/docs)
- [Documentação do MongoDB Atlas](https://docs.atlas.mongodb.com/)
