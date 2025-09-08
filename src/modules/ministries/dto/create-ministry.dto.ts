import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContextValidationDto } from 'src/common/dto/context-validation.dto';

export class CreateMinistryDto extends ContextValidationDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ministryFunctions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
