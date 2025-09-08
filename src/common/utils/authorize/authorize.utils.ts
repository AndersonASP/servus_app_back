import { Types } from 'mongoose';

export function toObjectId(id?: string | null) {
  if (!id) return null;
  try {
    return new Types.ObjectId(id);
  } catch {
    return null;
  }
}

export function getTenantSlug(
  req: any,
  source: 'param' | 'header' | 'user',
  param = 'tenantId',
  header = 'x-tenant-id',
) {
  if (source === 'param') return req.params?.[param];
  if (source === 'header')
    return req.headers?.[header] || req.headers?.[header.toLowerCase()];
  return req.user?.tenantId; // fallback
}

export function getParam(req: any, name?: string) {
  if (!name) return undefined;
  return req.params?.[name];
}
