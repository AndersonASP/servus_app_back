// src/common/middlewares/tenant.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../../modules/tenants/schemas/tenant.schema';
import { Role } from '../enums/role.enum';

export interface TenantRequest extends Request {
  tenantSlug?: string; // slug da igreja (ex: igreja001)
  branchId?: string; // ID da branch
  ministryId?: string; // ID do ministério
  path: string;
  headers: any;
  params: any;
  hostname: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(@InjectModel(Tenant.name) private tenantModel: Model<Tenant>) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    // 🔓 Rotas de auth não exigem tenant
    const isAuthRoute = req.path.startsWith('/auth/');
    if (isAuthRoute) {
      return next();
    }

    // console.log('🔍 TenantMiddleware - Headers recebidos:', req.headers);
    // console.log('🔍 TenantMiddleware - x-tenant-id:', req.headers['x-tenant-id']);

    // 1) Tenta ler do header padrão (prioridade mais alta)
    let tenantSlug =
      (req.headers['x-tenant-id'] as string | undefined)?.trim() || undefined;

    // 2) Tenta pegar do param (rotas do tipo /tenants/:tenantId/...)
    if (!tenantSlug && typeof req.params?.tenantId === 'string') {
      tenantSlug = req.params.tenantId.trim() || undefined;
    }

    // 3) Tenta do subdomínio (meu-tenant.api.meudominio.com)
    if (!tenantSlug && req.hostname && req.hostname.includes('.')) {
      const sub = req.hostname.split('.')[0];
      if (sub && !['www', 'api'].includes(sub)) {
        tenantSlug = sub;
      }
    }

    // Resolve branch ID
    const branchId =
      (req.headers['x-branch-id'] as string | undefined)?.trim() ||
      req.params?.branchId?.trim() ||
      undefined;

    // Resolve ministry ID
    const ministryId =
      (req.headers['x-ministry-id'] as string | undefined)?.trim() ||
      req.params?.ministryId?.trim() ||
      undefined;

    // 4) Se o JwtAuthGuard já populou user, respeite ServusAdmin
    const user = (req as any).user as { role?: Role } | undefined;
    const isServusAdmin = user?.role === Role.ServusAdmin;

    // 5) Validação opcional do tenant (apenas se foi fornecido)
    //    Não levantamos erro se não veio tenant — as Policies das rotas que exigem vão cobrar.
    if (tenantSlug) {
      // Verifica se é um ObjectId válido antes de fazer a query
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantSlug);
      
      if (!isValidObjectId) {
        return res
          .status(404)
          .json({ message: 'Tenant não encontrado ou inativo.' });
      }

      const exists = await this.tenantModel
        .findById(tenantSlug)
        .lean();

      // Se veio um slug inválido, já informa 404 cedo
      if (!exists && !isServusAdmin) {
        return res
          .status(404)
          .json({ message: 'Tenant não encontrado ou inativo.' });
      }
    }

    // 6) Anexa no request para consumo posterior (guards, services, etc.)
    req.tenantSlug = tenantSlug;
    req.branchId = branchId;
    req.ministryId = ministryId;

    // console.log('🔍 TenantMiddleware - Resultado final:');
    // console.log('   - tenantSlug:', tenantSlug);
    // console.log('   - branchId:', branchId);
    // console.log('   - ministryId:', ministryId);

    return next();
  }
}
