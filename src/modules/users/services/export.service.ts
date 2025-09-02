import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

export interface ExportUserData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  branchName?: string;
  ministryName?: string;
  profileCompleted: boolean;
  skills?: string[];
  availability?: string;
  createdAt: Date;
  isActive: boolean;
}

@Injectable()
export class ExportService {
  
  // 📊 Exportar usuários para CSV
  async exportUsersToCSV(users: ExportUserData[], filename: string, res: Response): Promise<void> {
    try {
      // Definir campos para exportação
      const fields = [
        { label: 'ID', value: '_id' },
        { label: 'Nome', value: 'name' },
        { label: 'Email', value: 'email' },
        { label: 'Telefone', value: 'phone' },
        { label: 'Função', value: 'role' },
        { label: 'Filial', value: 'branchName' },
        { label: 'Ministério', value: 'ministryName' },
        { label: 'Perfil Completo', value: 'profileCompleted' },
        { label: 'Habilidades', value: (row: ExportUserData) => row.skills?.join(', ') || '' },
        { label: 'Disponibilidade', value: 'availability' },
        { label: 'Data de Criação', value: (row: ExportUserData) => row.createdAt.toISOString().split('T')[0] },
        { label: 'Ativo', value: 'isActive' }
      ];

      // Gerar CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(users);

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));

      // Enviar CSV
      res.send(csv);
      
    } catch (error) {
      console.error('❌ Erro ao exportar CSV:', error.message);
      throw new Error('Erro ao gerar exportação CSV');
    }
  }

  // 📊 Exportar usuários para Excel
  async exportUsersToExcel(users: ExportUserData[], filename: string, res: Response): Promise<void> {
    try {
      // Criar workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Usuários');

      // Definir colunas
      worksheet.columns = [
        { header: 'ID', key: '_id', width: 25 },
        { header: 'Nome', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Telefone', key: 'phone', width: 15 },
        { header: 'Função', key: 'role', width: 15 },
        { header: 'Filial', key: 'branchName', width: 20 },
        { header: 'Ministério', key: 'ministryName', width: 20 },
        { header: 'Perfil Completo', key: 'profileCompleted', width: 15 },
        { header: 'Habilidades', key: 'skills', width: 30 },
        { header: 'Disponibilidade', key: 'availability', width: 25 },
        { header: 'Data de Criação', key: 'createdAt', width: 15 },
        { header: 'Ativo', key: 'isActive', width: 10 }
      ];

      // Estilizar header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Adicionar dados
      users.forEach(user => {
        worksheet.addRow({
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: this.translateRole(user.role),
          branchName: user.branchName || '',
          ministryName: user.ministryName || '',
          profileCompleted: user.profileCompleted ? 'Sim' : 'Não',
          skills: user.skills?.join(', ') || '',
          availability: user.availability || '',
          createdAt: user.createdAt.toISOString().split('T')[0],
          isActive: user.isActive ? 'Sim' : 'Não'
        });
      });

      // Adicionar filtros
      worksheet.autoFilter = {
        from: 'A1',
        to: `L${users.length + 1}`
      };

      // Adicionar estatísticas no final
      const lastRow = users.length + 3;
      worksheet.addRow([]);
      worksheet.addRow(['ESTATÍSTICAS']);
      worksheet.getRow(lastRow + 1).font = { bold: true };
      
      const roleStats = this.calculateRoleStats(users);
      roleStats.forEach(stat => {
        worksheet.addRow([stat.role, stat.count]);
      });

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      // Escrever para response
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('❌ Erro ao exportar Excel:', error.message);
      throw new Error('Erro ao gerar exportação Excel');
    }
  }

  // 📊 Exportar dashboard para Excel (com gráficos e estatísticas)
  async exportDashboardToExcel(
    dashboardData: any,
    filename: string,
    res: Response
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Worksheet 1: Estatísticas Gerais
      const statsSheet = workbook.addWorksheet('Estatísticas');
      
      // Título
      statsSheet.mergeCells('A1:D1');
      statsSheet.getCell('A1').value = 'Dashboard de Usuários';
      statsSheet.getCell('A1').font = { size: 16, bold: true };
      statsSheet.getCell('A1').alignment = { horizontal: 'center' };

      // Estatísticas por Role
      statsSheet.addRow([]);
      statsSheet.addRow(['Estatísticas por Função']);
      statsSheet.getRow(3).font = { bold: true };
      
      statsSheet.addRow(['Função', 'Quantidade']);
      statsSheet.getRow(4).font = { bold: true };
      
      dashboardData.stats.byRole.forEach((stat: any) => {
        statsSheet.addRow([this.translateRole(stat._id), stat.count]);
      });

      // Estatísticas por Branch (se houver)
      if (dashboardData.stats.byBranch?.length > 0) {
        statsSheet.addRow([]);
        statsSheet.addRow(['Estatísticas por Filial']);
        statsSheet.getRow(statsSheet.rowCount).font = { bold: true };
        
        statsSheet.addRow(['Filial', 'Total de Usuários', 'Funções']);
        statsSheet.getRow(statsSheet.rowCount).font = { bold: true };
        
        dashboardData.stats.byBranch.forEach((stat: any) => {
          statsSheet.addRow([
            stat._id,
            stat.totalUsers,
            stat.roles.map((r: string) => this.translateRole(r)).join(', ')
          ]);
        });
      }

      // Worksheet 2: Usuários Recentes
      const recentSheet = workbook.addWorksheet('Usuários Recentes');
      
      recentSheet.addRow(['Nome', 'Email', 'Função', 'Data de Criação']);
      recentSheet.getRow(1).font = { bold: true };
      
      dashboardData.recentUsers.forEach((user: any) => {
        recentSheet.addRow([
          user.name,
          user.email,
          this.translateRole(user.role),
          new Date(user.createdAt).toLocaleDateString('pt-BR')
        ]);
      });

      // Configurar larguras
      statsSheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 30 },
        { width: 15 }
      ];

      recentSheet.columns = [
        { width: 25 },
        { width: 30 },
        { width: 15 },
        { width: 15 }
      ];

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      // Escrever para response
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('❌ Erro ao exportar dashboard Excel:', error.message);
      throw new Error('Erro ao gerar exportação do dashboard');
    }
  }

  // 🔄 Traduzir roles para português
  private translateRole(role: string): string {
    const translations: { [key: string]: string } = {
      'servus_admin': 'Administrador do Sistema',
      'tenant_admin': 'Administrador da Igreja',
      'branch_admin': 'Administrador da Filial',
      'leader': 'Líder',
      'volunteer': 'Voluntário'
    };
    return translations[role] || role;
  }

  // 📊 Calcular estatísticas por role
  private calculateRoleStats(users: ExportUserData[]) {
    const roleCount: { [key: string]: number } = {};
    
    users.forEach(user => {
      const translatedRole = this.translateRole(user.role);
      roleCount[translatedRole] = (roleCount[translatedRole] || 0) + 1;
    });

    return Object.entries(roleCount).map(([role, count]) => ({
      role,
      count
    }));
  }

  // 📅 Gerar nome de arquivo com timestamp
  generateFilename(prefix: string, tenantId?: string, format: 'csv' | 'xlsx' = 'xlsx'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const tenantSuffix = tenantId ? `_${tenantId}` : '';
    return `${prefix}${tenantSuffix}_${timestamp}.${format}`;
  }
} 