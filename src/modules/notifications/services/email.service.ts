import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuração básica para desenvolvimento
    // Em produção, usar variáveis de ambiente
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525'),
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER || '5d2004bfae2b7b',
        pass: process.env.SMTP_PASS || '3d3218b6a50ec0',
      },
    });
  }

  /**
   * Envia e-mail com credenciais de acesso para o administrador do tenant
   */
  async sendTenantAdminCredentials(
    adminEmail: string,
    adminName: string,
    tenantName: string,
    tenantId: string,
    provisionalPassword: string,
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'Servus App <servus.app.dev@gmail.com>',
        to: adminEmail,
        subject: `Bem-vindo ao Servus App - ${tenantName}`,
        html: this.generateCredentialsEmailTemplate(
          adminName,
          tenantName,
          tenantId,
          adminEmail,
          provisionalPassword,
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `E-mail enviado com sucesso para ${adminEmail}: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail para ${adminEmail}:`, error);
      return false;
    }
  }

  /**
   * Gera o template HTML do e-mail de credenciais
   */
  private generateCredentialsEmailTemplate(
    adminName: string,
    tenantName: string,
    tenantId: string,
    adminEmail: string,
    provisionalPassword: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Servus App</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: bold; color: #555; }
          .value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ Bem-vindo ao Servus App</h1>
            <p>Sistema de Gestão para Igrejas</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${adminName}!</h2>
            
            <p>Sua igreja <strong>${tenantName}</strong> foi criada com sucesso no Servus App!</p>
            
            <p>Você foi designado como administrador da igreja e já pode começar a usar o sistema.</p>
            
            <div class="credentials">
              <h3>🔐 Suas Credenciais de Acesso</h3>
              <div class="credential-item">
                <span class="label">E-mail:</span><br>
                <span class="value">${adminEmail}</span>
              </div>
              <div class="credential-item">
                <span class="label">Senha Provisória:</span><br>
                <span class="value">${provisionalPassword}</span>
              </div>
              <div class="credential-item">
                <span class="label">ID da Igreja:</span><br>
                <span class="value">${tenantId}</span>
              </div>
            </div>
            
            <div class="warning">
              <h4>⚠️ Importante</h4>
              <ul>
                <li>Esta é uma senha provisória que deve ser alterada no primeiro login</li>
                <li>Guarde essas informações em local seguro</li>
                <li>Você terá acesso total para gerenciar sua igreja</li>
              </ul>
            </div>
            
            <h3>🚀 Próximos Passos</h3>
            <ol>
              <li>Acesse o sistema com suas credenciais</li>
              <li>Altere sua senha provisória</li>
              <li>Configure as informações da sua igreja</li>
              <li>Crie seus primeiros ministérios e branches</li>
              <li>Convide membros para participar</li>
            </ol>
            
            <p>Se precisar de ajuda, entre em contato conosco através do suporte.</p>
          </div>
          
          <div class="footer">
            <p>Servus App - Sistema de Gestão para Igrejas</p>
            <p>Este é um e-mail automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envia e-mail com credenciais de acesso para um novo usuário
   */
  async sendUserCredentials(
    userEmail: string,
    userName: string,
    tenantName: string,
    provisionalPassword: string,
    role: string,
    branchName?: string,
    ministryName?: string,
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'Servus App <servus.app.dev@gmail.com>',
        to: userEmail,
        subject: `Bem-vindo ao Servus App - ${tenantName}`,
        html: this.generateUserCredentialsEmailTemplate(
          userName,
          tenantName,
          userEmail,
          provisionalPassword,
          role,
          branchName,
          ministryName,
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `E-mail de credenciais enviado com sucesso para ${userEmail}: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail para ${userEmail}:`, error);
      return false;
    }
  }

  /**
   * Gera o template HTML do e-mail de credenciais para usuários
   */
  private generateUserCredentialsEmailTemplate(
    userName: string,
    tenantName: string,
    userEmail: string,
    provisionalPassword: string,
    role: string,
    branchName?: string,
    ministryName?: string,
  ): string {
    const roleTranslation = this.translateRole(role);
    const branchInfo = branchName ? `<p><strong>Filial:</strong> ${branchName}</p>` : '';
    const ministryInfo = ministryName ? `<p><strong>Ministério:</strong> ${ministryName}</p>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Servus App</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: bold; color: #555; }
          .value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .role-info { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ Bem-vindo ao Servus App</h1>
            <p>Sistema de Gestão para Igrejas</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            
            <p>Você foi adicionado como membro da igreja <strong>${tenantName}</strong> no Servus App!</p>
            
            <div class="role-info">
              <h3>👤 Seu Perfil</h3>
              <p><strong>Função:</strong> ${roleTranslation}</p>
              ${branchInfo}
              ${ministryInfo}
            </div>
            
            <div class="credentials">
              <h3>🔐 Suas Credenciais de Acesso</h3>
              <div class="credential-item">
                <span class="label">E-mail:</span><br>
                <span class="value">${userEmail}</span>
              </div>
              <div class="credential-item">
                <span class="label">Senha Provisória:</span><br>
                <span class="value">${provisionalPassword}</span>
              </div>
            </div>
            
            <div class="warning">
              <h4>⚠️ Importante</h4>
              <ul>
                <li>Esta é uma senha provisória que deve ser alterada no primeiro login</li>
                <li>Guarde essas informações em local seguro</li>
                <li>Você terá acesso às funcionalidades baseadas no seu perfil</li>
              </ul>
            </div>
            
            <h3>🚀 Próximos Passos</h3>
            <ol>
              <li>Acesse o sistema com suas credenciais</li>
              <li>Altere sua senha provisória</li>
              <li>Complete seu perfil pessoal</li>
              <li>Explore as funcionalidades disponíveis</li>
            </ol>
            
            <p>Se precisar de ajuda, entre em contato com o administrador da sua igreja.</p>
          </div>
          
          <div class="footer">
            <p>Servus App - Sistema de Gestão para Igrejas</p>
            <p>Este é um e-mail automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Traduz roles para português
   */
  private translateRole(role: string): string {
    const translations: { [key: string]: string } = {
      volunteer: 'Voluntário',
      leader: 'Líder',
      branch_admin: 'Administrador de Filial',
      tenant_admin: 'Administrador da Igreja',
      servus_admin: 'Administrador do Sistema',
    };
    return translations[role] || role;
  }

  /**
   * Testa a conexão com o servidor de e-mail
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexão com servidor de e-mail verificada com sucesso');
      return true;
    } catch (error) {
      this.logger.error(
        'Erro ao verificar conexão com servidor de e-mail:',
        error,
      );
      return false;
    }
  }
}
