import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberFunctionStatus } from '../schemas/member-function.schema';

export class LinkMemberToFunctionsDto {
  @IsArray()
  @IsMongoId({ each: true })
  functionIds: string[];

  @IsOptional()
  @IsEnum(MemberFunctionStatus)
  status?: MemberFunctionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
