import { IsEnum, IsOptional, IsString, IsMongoId } from 'class-validator';
import { UserFunctionStatus } from '../schemas/user-function.schema';

export class CreateUserFunctionDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  ministryId: string;

  @IsMongoId()
  functionId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateUserFunctionStatusDto {
  @IsEnum(UserFunctionStatus)
  status: UserFunctionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserFunctionResponseDto {
  id: string;
  userId: string;
  ministryId: string;
  functionId: string;
  status: UserFunctionStatus;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  tenantId: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Dados populados
  user?: {
    id: string;
    name: string;
    email: string;
  };
  ministry?: {
    id: string;
    name: string;
  };
  function?: {
    id: string;
    name: string;
    description?: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
  };
}
