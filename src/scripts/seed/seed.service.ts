// src/scripts/seed/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { Tenant } from '../../modules/tenants/schemas/tenant.schema';
import { Branch } from '../../modules/branches/schemas/branch.schema';
import { User } from '../../modules/users/schema/user.schema';
import { Membership } from '../../modules/membership/schemas/membership.schema';
import { MembershipRole, Role } from '../../common/enums/role.enum';
import { Ministry } from '../../modules/ministries/schemas/ministry.schema';

@Injectable()
export class SeedService {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Ministry.name) private ministryModel: Model<Ministry>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Membership.name) private memModel: Model<Membership>,
  ) {}

  private async upsertUser(email: string, data: Partial<User>): Promise<User> {
    const existing = await this.userModel.findOne({ email }).lean();
    if (existing) {
      const update: any = {
        name: data.name ?? existing['name'],
        password: data['password'] ?? existing['password'],
        isActive: true,
      };
      const result = await this.userModel.findOneAndUpdate(
        { email },
        { $set: update },
        { new: true },
      );
      if (!result) {
        throw new Error(`Failed to update user ${email}`);
      }
      return result;
    }
    const result = await this.userModel.findOneAndUpdate(
      { email },
      { ...data, email, isActive: true },
      { new: true, upsert: true },
    );
    if (!result) {
      throw new Error(`Failed to create user ${email}`);
    }
    return result;
  }

  private async upsertMembership(where: any): Promise<any> {
    return this.memModel.updateOne(
      where,
      {
        $setOnInsert: {
          user: where.user,
          tenant: where.tenant,
          role: where.role,
          branch: where.branch ?? null,
          ministry: where.ministry ?? null,
        },
        $set: { isActive: true },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  async run() {
    this.log.log('Iniciando seed completo...');

    const devHash = await bcrypt.hash('123456', 10);

    // ========= 1) SUPER ADMIN =========
    this.log.log('Criando Super Admin...');
    const superAdmin = await this.upsertUser('servus@admin.com', {
      name: 'Servus Super Admin',
      password: devHash,
      role: Role.ServusAdmin,
    });

    // ========= 2) TENANT =========
    this.log.log('Criando Tenant...');
    const tenant = await this.tenantModel.findOneAndUpdate(
      { tenantId: 'igreja001' },
      {
        $setOnInsert: {
          tenantId: 'igreja001',
          name: 'Igreja Matriz Exemplo',
          description: 'Igreja matriz com múltiplas filiais',
          plan: 'pro',
          maxBranches: 10,
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // ========= 3) BRANCHES =========
    this.log.log('Criando Branches...');
    const b1 = await this.branchModel.findOneAndUpdate(
      { branchId: 'igreja001-filial01' },
      {
        $setOnInsert: {
          branchId: 'igreja001-filial01',
          name: 'Filial 01',
          description: 'Primeira filial da igreja matriz',
          tenant: tenant._id,
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const b2 = await this.branchModel.findOneAndUpdate(
      { branchId: 'igreja001-filial02' },
      {
        $setOnInsert: {
          branchId: 'igreja001-filial02',
          name: 'Filial 02',
          description: 'Segunda filial da igreja matriz',
          tenant: tenant._id,
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // ========= 4) MINISTRIES =========
    this.log.log('Criando Ministérios...');
    
    // Ministério da matriz (sem branch)
    const louvorMatriz = await this.ministryModel.findOneAndUpdate(
      { 
        name: 'Louvor', 
        tenantId: tenant.tenantId, 
        branchId: null 
      },
      {
        $setOnInsert: {
          name: 'Louvor',
          slug: 'louvor-matriz',
          tenantId: tenant.tenantId,
          branchId: null,
          description: 'Ministério de louvor da matriz',
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Ministério da filial 1
    const kidsB1 = await this.ministryModel.findOneAndUpdate(
      { 
        name: 'Kids', 
        tenantId: tenant.tenantId, 
        branchId: b1.branchId 
      },
      {
        $setOnInsert: {
          name: 'Kids',
          slug: 'kids-filial01',
          tenantId: tenant.tenantId,
          branchId: b1.branchId,
          description: 'Ministério infantil da filial 01',
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Ministério da filial 2
    const louvorB2 = await this.ministryModel.findOneAndUpdate(
      { 
        name: 'Louvor', 
        tenantId: tenant.tenantId, 
        branchId: b2.branchId 
      },
      {
        $setOnInsert: {
          name: 'Louvor',
          slug: 'louvor-filial02',
          tenantId: tenant.tenantId,
          branchId: b2.branchId,
          description: 'Ministério de louvor da filial 02',
          isActive: true,
          createdBy: (superAdmin as any)._id.toString(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // ========= 5) USUÁRIOS =========
    this.log.log('Criando Usuários...');
    
    const tenantAdmin = await this.upsertUser('admin@matriz.com', {
      name: 'Admin Matriz',
      password: devHash,
      role: Role.Volunteer,
    });

    const branchAdminB1 = await this.upsertUser('admin@filial1.com', {
      name: 'Admin Filial 1',
      password: devHash,
      role: Role.Volunteer,
    });

    const branchAdminB2 = await this.upsertUser('admin@filial2.com', {
      name: 'Admin Filial 2',
      password: devHash,
      role: Role.Volunteer,
    });

    const leaderMatrizLouvor = await this.upsertUser('lider@matriz.com', {
      name: 'Líder Matriz Louvor',
      password: devHash,
      role: Role.Volunteer,
    });

    const leaderB1Kids = await this.upsertUser('lider@filial1.com', {
      name: 'Líder Filial 1 Kids',
      password: devHash,
      role: Role.Volunteer,
    });

    const leaderB2Louvor = await this.upsertUser('lider@filial2.com', {
      name: 'Líder Filial 2 Louvor',
      password: devHash,
      role: Role.Volunteer,
    });

    const volunteerB1 = await this.upsertUser('vol@filial1.com', {
      name: 'Voluntário Filial 1',
      password: devHash,
      role: Role.Volunteer,
    });

    const volunteerB2 = await this.upsertUser('vol@filial2.com', {
      name: 'Voluntário Filial 2',
      password: devHash,
      role: Role.Volunteer,
    });

    // ========= 6) MEMBERSHIPS =========
    this.log.log('Criando Memberships...');
    
    await Promise.all([
      // Super Admin (sem membership específico, é global)
      
      // Tenant Admin
      this.upsertMembership({
        user: (tenantAdmin as any)._id,
        tenant: tenant._id,
        role: MembershipRole.TenantAdmin,
        branch: null,
        ministry: null,
      }),

      // Branch Admin Filial 1
      this.upsertMembership({
        user: (branchAdminB1 as any)._id,
        tenant: tenant._id,
        role: MembershipRole.BranchAdmin,
        branch: b1._id,
        ministry: null,
      }),

      // Branch Admin Filial 2
      this.upsertMembership({
        user: (branchAdminB2 as any)._id,
        tenant: tenant._id,
        role: MembershipRole.BranchAdmin,
        branch: b2._id,
        ministry: null,
      }),

      // Leader Matriz Louvor
      this.upsertMembership({
        user: (leaderMatrizLouvor as any)._id,
        tenant: tenant._id,
        role: MembershipRole.Leader,
        branch: null,
        ministry: louvorMatriz._id,
      }),

      // Leader Filial 1 Kids
      this.upsertMembership({
        user: (leaderB1Kids as any)._id,
        tenant: tenant._id,
        role: MembershipRole.Leader,
        branch: b1._id,
        ministry: kidsB1._id,
      }),

      // Leader Filial 2 Louvor
      this.upsertMembership({
        user: (leaderB2Louvor as any)._id,
        tenant: tenant._id,
        role: MembershipRole.Leader,
        branch: b2._id,
        ministry: louvorB2._id,
      }),

      // Volunteer Filial 1
      this.upsertMembership({
        user: (volunteerB1 as any)._id,
        tenant: tenant._id,
        role: MembershipRole.Volunteer,
        branch: b1._id,
        ministry: kidsB1._id,
      }),

      // Volunteer Filial 2
      this.upsertMembership({
        user: (volunteerB2 as any)._id,
        tenant: tenant._id,
        role: MembershipRole.Volunteer,
        branch: b2._id,
        ministry: louvorB2._id,
      }),
    ]);

    // ========= 7) LOGS E VERIFICAÇÃO =========
    const ministries = await this.ministryModel
      .find({ tenantId: tenant.tenantId })
      .select('_id name branchId slug')
      .lean();

    const memberships = await this.memModel
      .find({ tenant: tenant._id })
      .select('_id user role branch ministry isActive')
      .populate('user', 'name email')
      .lean();

    const users = await this.userModel
      .find({})
      .select('_id name email role isActive')
      .lean();

    this.log.log('Seed finalizado com sucesso!');
    this.log.log('Resumo:');
    this.log.log(`   Tenant: ${tenant.tenantId} - ${tenant.name}`);
    this.log.log(`   Branches: ${b1.branchId}, ${b2.branchId}`);
    this.log.log(`   Ministérios: ${ministries.length}`);
    this.log.log(`   Usuários: ${users.length}`);
    this.log.log(`   Memberships: ${memberships.length}`);
    
    this.log.log('Credenciais de teste:');
    this.log.log(`   Super Admin: servus@admin.com / 123456`);
    this.log.log(`   Tenant Admin: admin@matriz.com / 123456`);
    this.log.log(`   Branch Admin 1: admin@filial1.com / 123456`);
    this.log.log(`   Branch Admin 2: admin@filial2.com / 123456`);
    this.log.log(`   Leader Matriz: lider@matriz.com / 123456`);
    this.log.log(`   Leader Filial 1: lider@filial1.com / 123456`);
    this.log.log(`   Leader Filial 2: lider@filial2.com / 123456`);
    this.log.log(`   Volunteer 1: vol@filial1.com / 123456`);
    this.log.log(`   Volunteer 2: vol@filial2.com / 123456`);
  }
}
