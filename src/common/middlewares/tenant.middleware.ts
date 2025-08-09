import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../../modules/tenants/schemas/tenant.schema';

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: { role?: string; tenantId?: string };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(@InjectModel(Tenant.name) private tenantModel: Model<Tenant>) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    let tenantId: string | undefined;
    let userRole: string | undefined;

    // 1️⃣ Tenta capturar do token JWT
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
          tenantId?: string;
          role?: string;
        };
        tenantId = decoded?.tenantId;
        userRole = decoded?.role;
        (req as any).user = decoded;
      } catch (err) {
        console.warn('Token inválido ou sem tenantId');
      }
    }

    // 2️⃣ Se não veio do token, tenta pegar do header padrão
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = String(req.headers['x-tenant-id']);
    }

    // 3️⃣ Subdomínio
    if (!tenantId && req.hostname && req.hostname.includes('.')) {
      const subdomain = req.hostname.split('.')[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }

    // ✅ Se for superadmin, pode prosseguir sem tenantId
    if (userRole === 'superadmin') {
      req.tenantId = tenantId || undefined;
      return next();
    }

    // ❌ Se não encontrou tenantId e não é superadmin
    if (!tenantId) {
      return res.status(400).json({
        message: 'Tenant ID não informado. Envie no header "X-Tenant-ID" ou no token JWT.',
      });
    }

    // ✅ Valida se tenant existe
    const tenantExists = await this.tenantModel.findOne({ tenantId, isActive: true });
    if (!tenantExists) {
      throw new NotFoundException('Tenant não encontrado ou inativo.');
    }

    req.tenantId = tenantId;
    next();
  }
}