# Configuração de E-mail - Servus App

## Variáveis de Ambiente Necessárias

Para que o sistema de e-mail funcione corretamente, configure as seguintes variáveis de ambiente:

```bash
# Configuração SMTP
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=5d2004bfae2b7b
SMTP_PASS=3d3218b6a50ec0
SMTP_FROM=Servus App <ampeg39@gmail.com>
```

## Configuração para Gmail

1. **Ative a verificação em duas etapas** na sua conta Google
2. **Gere uma senha de app**:
   - Vá para: https://myaccount.google.com/apppasswords
   - Selecione "Mail" e "Other (Custom name)"
   - Digite "Servus App" como nome
   - Use a senha gerada na variável `SMTP_PASS`

## Configuração para Outros Provedores

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

## Teste da Configuração

Para testar se o e-mail está funcionando, você pode usar o endpoint de teste (se implementado) ou verificar os logs do servidor.

## Segurança

- **Nunca** commite as credenciais de e-mail no código
- Use variáveis de ambiente para todas as configurações sensíveis
- Considere usar serviços como SendGrid ou AWS SES para produção
- Configure SPF, DKIM e DMARC para melhor deliverability

## Funcionalidades Implementadas

✅ Envio automático de credenciais para administradores de tenant
✅ Template HTML responsivo para e-mails
✅ Geração automática de UUIDv7 para tenants
✅ Geração automática de senhas provisórias
✅ Logs de erro para debugging
✅ Configuração flexível via variáveis de ambiente
