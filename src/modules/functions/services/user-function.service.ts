import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserFunction, UserFunctionStatus } from '../schemas/user-function.schema';
import { CreateUserFunctionDto, UpdateUserFunctionStatusDto, UserFunctionResponseDto } from '../dto/user-function.dto';
import { Tenant } from '../../tenants/schemas/tenant.schema';

@Injectable()
export class UserFunctionService {
  constructor(
    @InjectModel(UserFunction.name) private userFunctionModel: Model<UserFunction>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  async createUserFunction(
    tenantId: string,
    branchId: string | null,
    dto: CreateUserFunctionDto,
    currentUserId: string
  ): Promise<UserFunctionResponseDto> {
    // Validar se os IDs são ObjectIds válidos
    console.log('🔍 Validando IDs para UserFunction:');
    console.log('   - dto.userId:', dto.userId, '(length:', dto.userId?.length, ')');
    console.log('   - dto.ministryId:', dto.ministryId, '(length:', dto.ministryId?.length, ')');
    console.log('   - dto.functionId:', dto.functionId, '(length:', dto.functionId?.length, ')');
    console.log('   - tenantId:', tenantId, '(length:', tenantId?.length, ')');
    console.log('   - branchId:', branchId, '(length:', branchId?.length, ')');
    
    try {
      new Types.ObjectId(dto.userId);
      console.log('✅ userId válido');
      new Types.ObjectId(dto.ministryId);
      console.log('✅ ministryId válido');
      new Types.ObjectId(dto.functionId);
      console.log('✅ functionId válido');
      // tenantId é uma string UUID, não ObjectId
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('tenantId deve ser uma string válida');
      }
      console.log('✅ tenantId válido');
      if (branchId) {
        new Types.ObjectId(branchId);
        console.log('✅ branchId válido');
      }
    } catch (error) {
      console.log('❌ Erro na validação de ID:', error);
      throw new BadRequestException('ID inválido fornecido. Verifique se os IDs são válidos.');
    }

    // Buscar o tenant pelo ObjectId
    const tenant = await this.tenantModel.findById(tenantId).select('_id');
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    // Verificar se já existe
    const existing = await this.userFunctionModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      functionId: new Types.ObjectId(dto.functionId),
    });

    if (existing) {
      throw new BadRequestException('Usuário já possui vínculo com esta função');
    }

    const userFunction = new this.userFunctionModel({
      userId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      functionId: new Types.ObjectId(dto.functionId),
      status: dto.status || UserFunctionStatus.PENDING, // Usar status fornecido ou PENDING por padrão
      notes: dto.notes,
      tenantId: tenant._id, // UserFunction usa ObjectId do tenant
      branchId: branchId ? new Types.ObjectId(branchId) : null,
    });

    const saved = await userFunction.save();
    return this.mapToResponseDto(saved);
  }

  async updateUserFunctionStatus(
    userFunctionId: string,
    dto: UpdateUserFunctionStatusDto,
    currentUserId: string
  ): Promise<UserFunctionResponseDto> {
    const userFunction = await this.userFunctionModel.findById(userFunctionId);
    
    if (!userFunction) {
      throw new NotFoundException('Vínculo usuário-função não encontrado');
    }

    userFunction.status = dto.status;
    userFunction.notes = dto.notes;
    
    if (dto.status === UserFunctionStatus.APPROVED) {
      userFunction.approvedBy = new Types.ObjectId(currentUserId);
      userFunction.approvedAt = new Date();
    }

    const saved = await userFunction.save();
    return this.mapToResponseDto(saved);
  }

  async getUserFunctionsByUser(
    userId: string,
    status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const userFunctions = await this.userFunctionModel
      .find(query)
      .populate('ministryId', 'name')
      .populate('functionId', 'name description')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return userFunctions.map(uf => this.mapToResponseDto(uf));
  }

  async getUserFunctionsByMinistry(
    ministryId: string,
    status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    const query: any = { ministryId: new Types.ObjectId(ministryId) };
    if (status) {
      query.status = status;
    }

    const userFunctions = await this.userFunctionModel
      .find(query)
      .populate('userId', 'name email')
      .populate('functionId', 'name description')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return userFunctions.map(uf => this.mapToResponseDto(uf));
  }

  async deleteUserFunction(userFunctionId: string): Promise<void> {
    const result = await this.userFunctionModel.findByIdAndDelete(userFunctionId);
    if (!result) {
      throw new NotFoundException('Vínculo usuário-função não encontrado');
    }
  }

  /**
   * Remove todas as funções de um usuário em um ministério específico
   * Usado quando um membro é removido de um ministério
   */
  async deleteUserFunctionsByUserAndMinistry(
    userId: string,
    ministryId: string,
    tenantId: string,
    branchId?: string
  ): Promise<number> {
    console.log('🗑️ Removendo todas as funções do usuário no ministério...');
    console.log('   - User ID:', userId);
    console.log('   - Ministry ID:', ministryId);
    console.log('   - Tenant ID:', tenantId);
    console.log('   - Branch ID:', branchId);

    const query: any = {
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
      tenantId: new Types.ObjectId(tenantId), // Converter para ObjectId
    };

    // Se branchId for fornecido, incluir na query
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }

    const result = await this.userFunctionModel.deleteMany(query);
    console.log(`✅ ${result.deletedCount} funções removidas do usuário no ministério`);
    
    return result.deletedCount;
  }

  async getUserFunctionsByUserAndMinistry(
    userId: string,
    ministryId: string,
    status?: UserFunctionStatus
  ): Promise<UserFunctionResponseDto[]> {
    console.log('🔍 [UserFunctionService] getUserFunctionsByUserAndMinistry iniciado');
    console.log('   - userId:', userId);
    console.log('   - ministryId:', ministryId);
    console.log('   - status:', status);

    const query: any = {
      userId: new Types.ObjectId(userId),
      ministryId: new Types.ObjectId(ministryId),
    };

    if (status) {
      query.status = status;
    }

    console.log('🔍 [UserFunctionService] Query construída:', JSON.stringify(query, null, 2));

    try {
      const userFunctions = await this.userFunctionModel
        .find(query)
        .populate('userId', 'name email')
        .populate('functionId', 'name description')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 });

      console.log(`✅ [UserFunctionService] Encontradas ${userFunctions.length} funções do usuário no ministério`);
      
      if (userFunctions.length > 0) {
        console.log('🔍 [UserFunctionService] Primeira UserFunction encontrada:');
        console.log('   - ID:', userFunctions[0]._id);
        console.log('   - userId:', userFunctions[0].userId);
        console.log('   - ministryId:', userFunctions[0].ministryId);
        console.log('   - functionId:', userFunctions[0].functionId);
        console.log('   - status:', userFunctions[0].status);
        console.log('   - userId populado:', userFunctions[0].userId);
        console.log('   - functionId populado:', userFunctions[0].functionId);
        console.log('   - approvedBy populado:', userFunctions[0].approvedBy);
      }

      const result = userFunctions.map(uf => {
        console.log('🔄 [UserFunctionService] Mapeando UserFunction:', uf._id);
        const mapped = this.mapToResponseDto(uf);
        console.log('   - Resultado mapeado:', JSON.stringify(mapped, null, 2));
        return mapped;
      });

      console.log(`✅ [UserFunctionService] Retornando ${result.length} funções mapeadas`);
      return result;

    } catch (error) {
      console.error('❌ [UserFunctionService] Erro ao buscar funções:', error);
      throw error;
    }
  }

  async getApprovedFunctionsForUser(userId: string): Promise<UserFunctionResponseDto[]> {
    return this.getUserFunctionsByUser(userId, UserFunctionStatus.APPROVED);
  }

  private mapToResponseDto(userFunction: any): UserFunctionResponseDto {
    console.log('🔄 [UserFunctionService] mapToResponseDto iniciado');
    console.log('   - userFunction._id:', userFunction._id);
    console.log('   - userFunction.userId:', userFunction.userId);
    console.log('   - userFunction.functionId:', userFunction.functionId);
    console.log('   - userFunction.status:', userFunction.status);
    console.log('   - userId é objeto:', userFunction.userId && typeof userFunction.userId === 'object');
    console.log('   - functionId é objeto:', userFunction.functionId && typeof userFunction.functionId === 'object');
    
    const result = {
      id: userFunction._id.toString(),
      userId: userFunction.userId?.toString() || null,
      ministryId: userFunction.ministryId?.toString() || null,
      functionId: userFunction.functionId?.toString() || null,
      status: userFunction.status,
      approvedBy: userFunction.approvedBy?.toString(),
      approvedAt: userFunction.approvedAt,
      notes: userFunction.notes,
      tenantId: userFunction.tenantId?.toString() || null,
      branchId: userFunction.branchId?.toString(),
      createdAt: userFunction.createdAt,
      updatedAt: userFunction.updatedAt,
      user: userFunction.userId && typeof userFunction.userId === 'object' ? {
        id: userFunction.userId._id.toString(),
        name: userFunction.userId.name,
        email: userFunction.userId.email,
      } : undefined,
      ministry: userFunction.ministryId && typeof userFunction.ministryId === 'object' ? {
        id: userFunction.ministryId._id.toString(),
        name: userFunction.ministryId.name,
      } : undefined,
      function: userFunction.functionId && typeof userFunction.functionId === 'object' ? {
        id: userFunction.functionId._id.toString(),
        name: userFunction.functionId.name,
        description: userFunction.functionId.description,
      } : undefined,
      approvedByUser: userFunction.approvedBy && typeof userFunction.approvedBy === 'object' ? {
        id: userFunction.approvedBy._id.toString(),
        name: userFunction.approvedBy.name,
      } : undefined,
    };
    
    console.log('✅ [UserFunctionService] mapToResponseDto resultado:', JSON.stringify(result, null, 2));
    return result;
  }
}
