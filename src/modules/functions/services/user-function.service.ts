import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserFunction, UserFunctionStatus } from '../schemas/user-function.schema';
import { CreateUserFunctionDto, UpdateUserFunctionStatusDto, UserFunctionResponseDto } from '../dto/user-function.dto';

@Injectable()
export class UserFunctionService {
  constructor(
    @InjectModel(UserFunction.name) private userFunctionModel: Model<UserFunction>,
  ) {}

  async createUserFunction(
    tenantId: string,
    branchId: string | null,
    dto: CreateUserFunctionDto,
    currentUserId: string
  ): Promise<UserFunctionResponseDto> {
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
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      ministryId: new Types.ObjectId(dto.ministryId),
      functionId: new Types.ObjectId(dto.functionId),
      tenantId: new Types.ObjectId(tenantId),
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

  async getApprovedFunctionsForUser(userId: string): Promise<UserFunctionResponseDto[]> {
    return this.getUserFunctionsByUser(userId, UserFunctionStatus.APPROVED);
  }

  private mapToResponseDto(userFunction: any): UserFunctionResponseDto {
    return {
      id: userFunction._id.toString(),
      userId: userFunction.userId.toString(),
      ministryId: userFunction.ministryId.toString(),
      functionId: userFunction.functionId.toString(),
      status: userFunction.status,
      approvedBy: userFunction.approvedBy?.toString(),
      approvedAt: userFunction.approvedAt,
      notes: userFunction.notes,
      tenantId: userFunction.tenantId.toString(),
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
  }
}
