// src/modules/volunteers/volunteers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Branch } from 'src/modules/branches/schemas/branch.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { User } from 'src/modules/users/schema/user.schema';
import {
  FormSubmission,
  FormSubmissionStatus,
} from 'src/modules/forms/schemas/form-submission.schema';
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
    @InjectModel(FormSubmission.name)
    private readonly formSubmissionModel: Model<FormSubmission>,
  ) {}

  async list(tenantId: string, user: any, q: GetVolunteersDto) {
    console.log('🔍 [VolunteersService] Iniciando busca de voluntários');
    console.log('🔍 [VolunteersService] tenantId:', tenantId);
    console.log('🔍 [VolunteersService] user:', {
      _id: user._id,
      role: user.role,
      email: user.email,
    });
    console.log('🔍 [VolunteersService] query:', q);

    const tenantOid = await resolveTenantObjectId(this.tenantModel, tenantId);
    console.log('🔍 [VolunteersService] tenantOid:', tenantOid);

    const scope = await resolveScope(user, tenantOid, this.memModel);
    console.log('🔍 [VolunteersService] scope:', scope);

    // Valida filtros com base no escopo
    ensureFiltersWithinScope(scope, q);

    // Buscar apenas voluntários de memberships (aprovados e em operação)
    const membershipVolunteers = await this.getVolunteersFromMemberships(
      tenantOid,
      scope,
      q,
    );

    console.log(
      '🔍 [VolunteersService] membershipVolunteers encontrados:',
      membershipVolunteers.length,
    );

    // Aplicar paginação
    const total = membershipVolunteers.length;
    const startIndex = (q.page - 1) * q.pageSize;
    const endIndex = startIndex + q.pageSize;
    const paginatedData = membershipVolunteers.slice(startIndex, endIndex);

    console.log(
      '🔍 [VolunteersService] dados paginados:',
      paginatedData.length,
    );

    return {
      data: paginatedData,
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  private async getVolunteersFromMemberships(
    tenantOid: Types.ObjectId,
    scope: any,
    q: GetVolunteersDto,
  ) {
    console.log(
      '🔍 [VolunteersService] Iniciando getVolunteersFromMemberships',
    );
    console.log('🔍 [VolunteersService] scope:', scope);

    // Simplificar drasticamente para evitar problemas com MongoDB Atlas
    const matchQuery: any = {
      tenant: tenantOid,
      isActive: true,
      role: 'volunteer',
    };

    // Aplicar filtros RBAC de forma simples
    if (scope.leaderPairs && scope.leaderPairs.length > 0) {
      // Para líderes, filtrar apenas pelos ministérios que lidera
      const ministryIds = scope.leaderPairs.map((p) => p.ministry);
      matchQuery.ministry = { $in: ministryIds };
    }

    if (q.branchId) matchQuery.branch = new Types.ObjectId(q.branchId);
    if (q.ministryId) matchQuery.ministry = new Types.ObjectId(q.ministryId);

    console.log(
      '🔍 [VolunteersService] matchQuery:',
      JSON.stringify(matchQuery, null, 2),
    );

    // Pipeline simplificado sem $or complexo
    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
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
        $lookup: {
          from: 'memberfunctions',
          let: { userId: '$user._id', ministryId: '$ministry._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$memberId', '$$userId'] }, // ✅ Usar memberId conforme schema
                    { $eq: ['$ministryId', '$$ministryId'] },
                    { $eq: ['$isActive', true] },
                    { $eq: ['$status', 'aprovado'] }, // ✅ Buscar apenas funções aprovadas
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'functions', // ✅ Nome da coleção correto
                localField: 'functionId',
                foreignField: '_id',
                as: 'functionData',
              },
            },
            {
              $unwind: {
                path: '$functionData',
                preserveNullAndEmptyArrays: false,
              },
            }, // ❌ NÃO preservar se função não existir
            {
              $project: {
                _id: 0,
                id: '$functionData._id',
                name: '$functionData.name',
                description: '$functionData.description',
                level: '$level',
                status: '$status',
                approvedAt: '$approvedAt',
                // Debug fields
                functionId: '$functionId',
                functionDataExists: { $ifNull: ['$functionData', null] },
                functionDataRaw: '$functionData',
              },
            },
          ],
          as: 'functions',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id', // ID do membership para exclusão
          userId: '$user._id', // ID do usuário
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phone',
          pictureThumb: '$user.picture',
          branch: { id: '$branch._id', name: '$branch.name' },
          ministry: { id: '$ministry._id', name: '$ministry.name' },
          role: '$role',
          source: 'membership',
          createdAt: '$createdAt',
          approvedAt: '$createdAt',
          functions: '$functions',
        },
      },
    ];

    console.log(
      '🔍 [VolunteersService] Pipeline simplificado:',
      JSON.stringify(pipeline, null, 2),
    );

    const results = await this.memModel.aggregate(pipeline).allowDiskUse(true);
    console.log(
      '🔍 [VolunteersService] Resultados encontrados:',
      results.length,
    );

    // Debug: verificar funções encontradas
    results.forEach((volunteer, index) => {
      console.log(
        `🔍 [VolunteersService] Voluntário ${index + 1}: ${volunteer.name}`,
      );
      console.log(`   - User ID: ${volunteer.userId}`);
      console.log(`   - Ministry: ${volunteer.ministry?.name}`);
      console.log(`   - Functions: ${volunteer.functions?.length || 0}`);
      if (volunteer.functions && volunteer.functions.length > 0) {
        volunteer.functions.forEach((func, funcIndex) => {
          console.log(`     - Função ${funcIndex + 1}:`, func);
          console.log(`       - ID: ${func.id}`);
          console.log(`       - Name: ${func.name}`);
          console.log(`       - Status: ${func.status}`);
          console.log(`       - Level: ${func.level}`);
          console.log(`       - FunctionId: ${func.functionId}`);
          console.log(
            `       - FunctionDataExists: ${func.functionDataExists ? 'SIM' : 'NÃO'}`,
          );
          console.log(`       - FunctionDataRaw: ${func.functionDataRaw}`);
        });
      } else {
        console.log(`   - ⚠️ Nenhuma função encontrada para ${volunteer.name}`);
      }
    });

    return results;
  }

  private async getVolunteersFromForms(
    tenantOid: Types.ObjectId,
    scope: any,
    q: GetVolunteersDto,
    pendingOnly: boolean = false,
  ) {
    let statusFilter: any;

    if (pendingOnly) {
      // Para pendentes: buscar apenas submissões que ainda não foram aprovadas
      statusFilter = {
        $in: [FormSubmissionStatus.PENDING],
      };
    } else {
      // Para aprovados: buscar submissões já aprovadas
      statusFilter = {
        $in: [FormSubmissionStatus.APPROVED, FormSubmissionStatus.PROCESSED],
      };
    }

    const matchBase: any = {
      tenantId: tenantOid,
      status: statusFilter,
    };
    if (q.ministryId)
      matchBase.preferredMinistry = new Types.ObjectId(q.ministryId);

    const userSearch: any[] = [];
    if (q.search?.trim()) {
      const re = new RegExp(q.search.trim(), 'i');
      userSearch.push(
        { volunteerName: re },
        { email: re },
        { 'customFields.volunteerName': re },
        { 'customFields.email': re },
      );
    }

    const pipeline: any[] = [
      { $match: matchBase },
      ...(userSearch.length ? [{ $match: { $or: userSearch } }] : []),
      {
        $lookup: {
          from: 'ministries',
          localField: 'preferredMinistry',
          foreignField: '_id',
          as: 'ministry',
        },
      },
      { $unwind: '$ministry' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: {
            $ifNull: [
              '$volunteerName',
              '$customFields.volunteerName',
              '$customFields.name',
              'Nome não informado',
            ],
          },
          email: { $ifNull: ['$email', '$customFields.email', ''] },
          phone: { $ifNull: ['$phone', '$customFields.phone', ''] },
          pictureThumb: null,
          branch: null,
          ministry: { id: '$ministry._id', name: '$ministry.name' },
          role: 'volunteer',
          source: 'form',
          createdAt: '$createdAt',
          approvedAt: '$leaderApprovedAt',
          functions: '$selectedFunctions',
          status: '$status',
        },
      },
    ];

    const results = await this.formSubmissionModel
      .aggregate(pipeline)
      .allowDiskUse(true);
    return results;
  }

  private removeDuplicates(volunteers: any[]): any[] {
    const uniqueMap = new Map();

    for (const volunteer of volunteers) {
      const key = volunteer.email || volunteer.userId?.toString();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, volunteer);
      }
    }

    return Array.from(uniqueMap.values());
  }

  async deleteVolunteer(tenantId: string, volunteerId: string, user: any) {
    console.log('🔍 [DeleteVolunteer] Iniciando exclusão');
    console.log('🔍 [DeleteVolunteer] tenantId:', tenantId);
    console.log('🔍 [DeleteVolunteer] volunteerId:', volunteerId);
    console.log('🔍 [DeleteVolunteer] user:', {
      _id: user._id,
      role: user.role,
      email: user.email,
    });

    const tenantOid = await resolveTenantObjectId(this.tenantModel, tenantId);
    const scope = await resolveScope(user, tenantOid, this.memModel);

    console.log('🔍 [DeleteVolunteer] tenantOid:', tenantOid);
    console.log('🔍 [DeleteVolunteer] scope:', scope);

    // Verificar se o voluntário existe e se o usuário tem permissão para excluí-lo
    // O volunteerId pode ser o _id do membership ou o userId
    let volunteer;
    let membershipId;

    // Converter volunteerId para ObjectId se necessário
    let volunteerObjectId;
    let userObjectId;

    try {
      volunteerObjectId = new Types.ObjectId(volunteerId);
      userObjectId = new Types.ObjectId(volunteerId);
    } catch (error) {
      console.log(
        '🔍 [DeleteVolunteer] Erro ao converter volunteerId para ObjectId:',
        error,
      );
      // Se não conseguir converter, usar como string
      volunteerObjectId = volunteerId;
      userObjectId = volunteerId;
    }

    if (scope.isServusAdmin) {
      // ServusAdmin pode excluir qualquer voluntário
      console.log('🔍 [DeleteVolunteer] Buscando como ServusAdmin');
      const query = {
        $or: [
          { _id: volunteerObjectId, tenant: tenantOid },
          { user: userObjectId, tenant: tenantOid },
        ],
      };
      console.log(
        '🔍 [DeleteVolunteer] Query:',
        JSON.stringify(query, null, 2),
      );
      volunteer = await this.memModel.findOne(query);
    } else if (scope.isTenantAdmin) {
      // TenantAdmin pode excluir voluntários do tenant
      console.log('🔍 [DeleteVolunteer] Buscando como TenantAdmin');
      const query = {
        $or: [
          { _id: volunteerObjectId, tenant: tenantOid },
          { user: userObjectId, tenant: tenantOid },
        ],
      };
      console.log(
        '🔍 [DeleteVolunteer] Query:',
        JSON.stringify(query, null, 2),
      );
      volunteer = await this.memModel.findOne(query);
    } else {
      // BranchAdmin e Leader só podem excluir voluntários dos seus ministérios
      const ministryIds = scope.leaderPairs.map((pair) => pair.ministry);
      console.log('🔍 [DeleteVolunteer] Buscando como Leader/BranchAdmin');
      console.log('🔍 [DeleteVolunteer] ministryIds:', ministryIds);
      const query = {
        $or: [
          {
            _id: volunteerObjectId,
            tenant: tenantOid,
            ministry: { $in: ministryIds },
          },
          {
            user: userObjectId,
            tenant: tenantOid,
            ministry: { $in: ministryIds },
          },
        ],
      };
      console.log(
        '🔍 [DeleteVolunteer] Query:',
        JSON.stringify(query, null, 2),
      );
      volunteer = await this.memModel.findOne(query);
    }

    console.log('🔍 [DeleteVolunteer] Volunteer encontrado:', volunteer);

    if (!volunteer) {
      // Vamos tentar encontrar o membership de outra forma para debug
      console.log('🔍 [DeleteVolunteer] Tentando busca alternativa...');
      const alternativeSearch = await this.memModel
        .findOne({
          tenant: tenantOid,
          $or: [{ _id: volunteerObjectId }, { user: userObjectId }],
        })
        .lean();
      console.log(
        '🔍 [DeleteVolunteer] Busca alternativa resultou em:',
        alternativeSearch,
      );

      // Vamos também listar alguns memberships para debug
      const sampleMemberships = await this.memModel
        .find({
          tenant: tenantOid,
        })
        .limit(3)
        .lean();
      console.log(
        '🔍 [DeleteVolunteer] Sample memberships:',
        sampleMemberships,
      );

      // Vamos procurar especificamente por memberships de voluntários
      const volunteerMemberships = await this.memModel
        .find({
          tenant: tenantOid,
          role: 'volunteer',
        })
        .lean();
      console.log(
        '🔍 [DeleteVolunteer] Volunteer memberships:',
        volunteerMemberships,
      );

      throw new Error(
        'Voluntário não encontrado ou sem permissão para excluir',
      );
    }

    // Usar o _id do membership encontrado para exclusão
    membershipId = volunteer._id;
    const userId = volunteer.user;

    console.log('🗑️ [DeleteVolunteer] Iniciando exclusão completa...');
    console.log('   - Membership ID:', membershipId);
    console.log('   - User ID:', userId);

    // 🗑️ EXCLUSÃO COMPLETA: Remover todos os vínculos relacionados ao usuário
    console.log('🗑️ [DeleteVolunteer] Removendo MemberFunctions do usuário...');

    // 1. Remover todas as MemberFunctions do usuário
    const { MemberFunctionSchema } = await import(
      '../../functions/schemas/member-function.schema'
    );
    const memberFunctionModel = this.memModel.db.model(
      'MemberFunction',
      MemberFunctionSchema,
    );

    const deletedFunctionsCount = await memberFunctionModel.deleteMany({
      memberId: userId,
      tenantId: tenantOid,
    });
    console.log(
      `✅ [DeleteVolunteer] ${deletedFunctionsCount.deletedCount} MemberFunctions removidas`,
    );

    // 2. Remover todos os memberships do usuário no tenant
    console.log('🗑️ [DeleteVolunteer] Removendo memberships do usuário...');
    const deletedMembershipsCount = await this.memModel.deleteMany({
      user: userId,
      tenant: tenantOid,
    });
    console.log(
      `✅ [DeleteVolunteer] ${deletedMembershipsCount.deletedCount} memberships removidos`,
    );

    // 3. Remover o usuário da base de dados
    console.log('🗑️ [DeleteVolunteer] Removendo usuário da base...');
    const { UserSchema } = await import('../../users/schema/user.schema');
    const userModel = this.memModel.db.model('User', UserSchema);

    const deletedUser = await userModel.findByIdAndDelete(userId);
    if (deletedUser) {
      console.log(
        `✅ [DeleteVolunteer] Usuário ${deletedUser.name} removido da base`,
      );
    } else {
      console.log('⚠️ [DeleteVolunteer] Usuário não encontrado para exclusão');
    }

    console.log(
      '🎉 [DeleteVolunteer] Exclusão completa realizada com sucesso!',
    );

    return {
      message: 'Voluntário excluído com sucesso',
      deletedMemberships: deletedMembershipsCount.deletedCount,
      deletedFunctions: deletedFunctionsCount.deletedCount,
      deletedUser: deletedUser ? true : false,
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

  async getPendingSubmissions(
    tenantId: string,
    user: any,
    q: GetVolunteersDto,
  ) {
    console.log('🔍 [VolunteersService] Buscando submissões pendentes');
    console.log('🔍 [VolunteersService] tenantId:', tenantId);
    console.log('🔍 [VolunteersService] user:', {
      _id: user._id,
      role: user.role,
      email: user.email,
    });

    const tenantOid = await resolveTenantObjectId(this.tenantModel, tenantId);
    const scope = await resolveScope(user, tenantOid, this.memModel);

    // Valida filtros com base no escopo
    ensureFiltersWithinScope(scope, q);

    // Buscar apenas submissões pendentes de formsubmissions
    const pendingSubmissions = await this.getVolunteersFromForms(
      tenantOid,
      scope,
      q,
      true,
    );

    console.log(
      '🔍 [VolunteersService] submissões pendentes encontradas:',
      pendingSubmissions.length,
    );

    // Aplicar paginação
    const total = pendingSubmissions.length;
    const startIndex = (q.page - 1) * q.pageSize;
    const endIndex = startIndex + q.pageSize;
    const paginatedData = pendingSubmissions.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }
}
