// src/modules/volunteers/volunteers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { User } from 'src/modules/users/schema/user.schema';
import { GetVolunteersDto } from '../dto/get-volunteers.dto';
import {
  buildRbacMatch,
  ensureFiltersWithinScope,
  resolveScope,
  resolveTenantObjectId,
} from 'src/common/utils/rbac/rbac.helpers';
import { Ministry } from 'src/modules/ministries/schemas/ministry.schema';

@Injectable()
export class VolunteersService {
  constructor(
    @InjectModel(Membership.name) private readonly memModel: Model<Membership>,
    @InjectModel('Ministry') private ministryModel: Model<Ministry>,
    @InjectModel(Branch.name) private readonly brModel: Model<Branch>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async list(tenantId: string, user: any, q: GetVolunteersDto) {
    const tenantOid = await resolveTenantObjectId(this.tenantModel, tenantId);
    const scope = await resolveScope(user, tenantOid, this.memModel);

    // Valida filtros com base no escopo
    ensureFiltersWithinScope(scope, q);

    const matchBase: any = { tenant: tenantOid, isActive: true };
    if (q.branchId) matchBase.branch = new Types.ObjectId(q.branchId);
    if (q.ministryId) matchBase.ministry = new Types.ObjectId(q.ministryId);

    const rbacStages = buildRbacMatch(scope);

    const userSearch: any[] = [];
    if (q.search?.trim()) {
      const re = new RegExp(q.search.trim(), 'i');
      userSearch.push({ 'user.name': re }, { 'user.email': re });
    }

    const [sortField = 'name', sortDir = 'asc'] = (q.sort || 'name:asc').split(
      ':',
    );
    const sortStage = {
      [sortField === 'name' ? 'user.name' : sortField]:
        sortDir === 'desc' ? -1 : 1,
    };

    const pipeline: any[] = [
      { $match: matchBase },
      ...rbacStages,
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      ...(userSearch.length ? [{ $match: { $or: userSearch } }] : []),
      {
        $lookup: {
          from: 'branches',
          localField: 'branch',
          foreignField: '_id',
          as: 'branch',
        },
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'ministries',
          localField: 'ministry',
          foreignField: '_id',
          as: 'ministry',
        },
      },
      { $unwind: '$ministry' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          pictureThumb: '$user.picture',
          branch: { id: '$branch._id', name: '$branch.name' },
          ministry: { id: '$ministry._id', name: '$ministry.name' },
          role: '$role',
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          data: [{ $skip: (q.page - 1) * q.pageSize }, { $limit: q.pageSize }],
          total: [{ $count: 'count' }],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
        },
      },
    ];

    const [res] = await this.memModel.aggregate(pipeline).allowDiskUse(true);
    return {
      data: res?.data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: res?.total ?? 0,
    };
  }

  async facets(tenantId: string, user: any, branchId?: string) {
    const tenantOid = await resolveTenantObjectId(this.tenantModel, tenantId);
    const scope = await resolveScope(user, tenantOid, this.memModel);

    if (branchId) {
      ensureFiltersWithinScope(scope, { branchId });
    }

    const matchBase: any = { tenant: tenantOid, isActive: true };
    if (branchId) matchBase.branch = new Types.ObjectId(branchId);

    const rbacStages = buildRbacMatch(scope);

    const pipeline: any[] = [
      { $match: matchBase },
      ...rbacStages,
      {
        $facet: {
          branches: [
            { $group: { _id: '$branch', count: { $sum: 1 } } },
            {
              $lookup: {
                from: 'branches',
                localField: '_id',
                foreignField: '_id',
                as: 'b',
              },
            },
            { $unwind: { path: '$b', preserveNullAndEmptyArrays: true } },
            { $project: { id: '$_id', name: '$b.name', count: 1 } },
            { $sort: { name: 1 } },
          ],
          ministries: [
            { $group: { _id: '$ministry', count: { $sum: 1 } } },
            {
              $lookup: {
                from: 'ministries',
                localField: '_id',
                foreignField: '_id',
                as: 'm',
              },
            },
            { $unwind: '$m' },
            {
              $project: {
                id: '$_id',
                name: '$m.name',
                count: 1,
                branch: '$m.branch',
              },
            },
            { $sort: { name: 1 } },
          ],
        },
      },
    ];

    const [res] = await this.memModel.aggregate(pipeline);
    return { branches: res?.branches ?? [], ministries: res?.ministries ?? [] };
  }
}
