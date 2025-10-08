import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership } from '../schemas/membership.schema';
import { MemberFunction } from '../../functions/schemas/member-function.schema';
import { MembershipRole } from '../../../common/enums/role.enum';

@Injectable()
export class MembershipIntegrityService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(MemberFunction.name)
    private memberFunctionModel: Model<MemberFunction>,
  ) {}

  /**
   * Valida se a remoção de um membership não deixará o usuário órfão
   */
  async validateMembershipRemoval(
    userId: string,
    membershipId: string,
    tenantId: string,
  ): Promise<{
    valid: boolean;
    reason?: string;
    remainingMemberships: number;
  }> {
    console.log('🔍 [MembershipIntegrity] Validando remoção de membership...');
    console.log('   - User ID:', userId);
    console.log('   - Membership ID:', membershipId);
    console.log('   - Tenant ID:', tenantId);

    // Verificar se o membership existe
    const membership = await this.membershipModel.findById(membershipId);
    if (!membership) {
      throw new NotFoundException('Membership não encontrado');
    }

    // Verificar se o membership pertence ao usuário
    if (membership.user.toString() !== userId) {
      throw new BadRequestException(
        'Membership não pertence ao usuário especificado',
      );
    }

    // Contar memberships ativos restantes do usuário no tenant
    const remainingMemberships = await this.membershipModel.countDocuments({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      isActive: true,
      _id: { $ne: new Types.ObjectId(membershipId) }, // Excluir o membership que será removido
    });

    console.log(
      '📊 [MembershipIntegrity] Memberships restantes:',
      remainingMemberships,
    );

    // CORREÇÃO: Permitir que usuários fiquem sem vínculos ativos
    // Um usuário pode não ter nenhum vínculo de ministério ativo
    if (remainingMemberships === 0) {
      console.log(
        '⚠️ [MembershipIntegrity] Usuário ficará sem vínculos ativos após remoção - PERMITIDO',
      );
      // Não bloquear a remoção, apenas avisar
    }

    return {
      valid: true,
      remainingMemberships,
    };
  }

  /**
   * Cria um membership padrão para usuários sem vínculos ativos
   */
  async ensureDefaultMembership(
    userId: string,
    tenantId: string,
    createdBy?: string,
  ): Promise<Membership> {
    console.log('🔧 [MembershipIntegrity] Verificando membership padrão...');
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    const hasActiveMembership = await this.membershipModel.exists({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!hasActiveMembership) {
      console.log(
        '⚠️ [MembershipIntegrity] Usuário sem membership ativo, verificando se já existe membership padrão...',
      );

      // Verificar se já existe um membership padrão (mesmo inativo)
      const existingDefaultMembership = await this.membershipModel.findOne({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        branch: null,
        ministry: null,
      });

      if (existingDefaultMembership) {
        console.log(
          '✅ [MembershipIntegrity] Membership padrão já existe:',
          existingDefaultMembership._id,
        );

        // Se o membership padrão está inativo, reativá-lo para permitir novos vínculos
        if (!existingDefaultMembership.isActive) {
          console.log(
            '🔄 [MembershipIntegrity] Reativando membership padrão inativo...',
          );

          const updateData: any = {
            isActive: true,
          };

          if (createdBy) {
            updateData.updatedBy = new Types.ObjectId(createdBy);
          }

          const reactivatedMembership =
            await this.membershipModel.findByIdAndUpdate(
              existingDefaultMembership._id,
              updateData,
              { new: true },
            );

          if (!reactivatedMembership) {
            throw new Error('Falha ao reativar membership padrão');
          }

          console.log(
            '✅ [MembershipIntegrity] Membership padrão reativado:',
            reactivatedMembership._id,
          );
          return reactivatedMembership;
        }

        return existingDefaultMembership;
      }

      console.log('⚠️ [MembershipIntegrity] Criando novo membership padrão...');

      const defaultMembership = new this.membershipModel({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        branch: null, // Matriz
        ministry: null, // Sem ministério específico
        role: MembershipRole.Volunteer,
        isActive: true, // Ativo para permitir vínculos futuros
        createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
      });

      const savedMembership = await defaultMembership.save();
      console.log(
        '✅ [MembershipIntegrity] Membership padrão criado:',
        savedMembership._id,
      );

      return savedMembership;
    }

    console.log('✅ [MembershipIntegrity] Usuário já possui membership ativo');
    return null as any;
  }

  /**
   * Remove todas as MemberFunctions de um usuário em um ministério específico
   */
  async removeMemberFunctionsFromMinistry(
    userId: string,
    ministryId: string,
    tenantId: string,
    branchId?: string,
  ): Promise<number> {
    console.log('🗑️ [MembershipIntegrity] Removendo MemberFunctions...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Branch ID:', branchId);

    const query: any = {
      memberId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId),
    };

    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    } else {
      query.branchId = null; // Matriz
    }

    const result = await this.memberFunctionModel.deleteMany(query);
    console.log(
      `✅ [MembershipIntegrity] ${result.deletedCount} MemberFunctions removidas`,
    );

    return result.deletedCount;
  }

  /**
   * Valida se um usuário pode ser removido de um ministério
   */
  async validateMinistryRemoval(
    userId: string,
    ministryId: string,
    tenantId: string,
  ): Promise<{ valid: boolean; reason?: string; affectedMemberships: number }> {
    console.log('🔍 [MembershipIntegrity] Validando remoção de ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Tenant ID:', tenantId);

    // Contar memberships ativos do usuário neste ministério
    const affectedMemberships = await this.membershipModel.countDocuments({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      ministry: new Types.ObjectId(ministryId),
      isActive: true,
    });

    console.log(
      '📊 [MembershipIntegrity] Memberships afetados:',
      affectedMemberships,
    );

    if (affectedMemberships === 0) {
      return {
        valid: false,
        reason: 'Usuário não está vinculado a este ministério',
        affectedMemberships: 0,
      };
    }

    // Verificar se remoção deixará usuário órfão
    const totalActiveMemberships = await this.membershipModel.countDocuments({
      user: new Types.ObjectId(userId),
      tenant: new Types.ObjectId(tenantId),
      isActive: true,
    });

    console.log(
      '📊 [MembershipIntegrity] Total de memberships ativos:',
      totalActiveMemberships,
    );

    // CORREÇÃO: Permitir que usuários fiquem sem vínculos ativos
    // Um usuário pode não ter nenhum vínculo de ministério ativo
    if (totalActiveMemberships <= affectedMemberships) {
      console.log(
        '⚠️ [MembershipIntegrity] Usuário ficará sem vínculos ativos após remoção - PERMITIDO',
      );
      // Não bloquear a remoção, apenas avisar
    }

    return {
      valid: true,
      affectedMemberships,
    };
  }

  /**
   * Obtém estatísticas de integridade de um usuário
   */
  async getUserIntegrityStats(
    userId: string,
    tenantId: string,
  ): Promise<{
    totalMemberships: number;
    activeMemberships: number;
    inactiveMemberships: number;
    totalMemberFunctions: number;
    ministries: string[];
    branches: string[];
  }> {
    console.log(
      '📊 [MembershipIntegrity] Obtendo estatísticas de integridade...',
    );
    console.log('   - User ID:', userId);
    console.log('   - Tenant ID:', tenantId);

    const [
      totalMemberships,
      activeMemberships,
      inactiveMemberships,
      memberFunctions,
      memberships,
    ] = await Promise.all([
      this.membershipModel.countDocuments({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
      }),
      this.membershipModel.countDocuments({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        isActive: true,
      }),
      this.membershipModel.countDocuments({
        user: new Types.ObjectId(userId),
        tenant: new Types.ObjectId(tenantId),
        isActive: false,
      }),
      this.memberFunctionModel.countDocuments({
        memberId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
      }),
      this.membershipModel
        .find({
          user: new Types.ObjectId(userId),
          tenant: new Types.ObjectId(tenantId),
          isActive: true,
        })
        .select('ministry branch')
        .lean(),
    ]);

    const ministries = [
      ...new Set(
        memberships.map((m) => m.ministry?.toString()).filter(Boolean),
      ),
    ] as string[];
    const branches = [
      ...new Set(memberships.map((m) => m.branch?.toString()).filter(Boolean)),
    ] as string[];

    return {
      totalMemberships,
      activeMemberships,
      inactiveMemberships,
      totalMemberFunctions: memberFunctions,
      ministries,
      branches,
    };
  }
}
