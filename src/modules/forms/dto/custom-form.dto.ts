import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  TEXTAREA = 'textarea',
  DATE = 'date',
  NUMBER = 'number',
  CHECKBOX = 'checkbox',
  MINISTRY_SELECT = 'ministry_select',
  FUNCTION_MULTISELECT = 'function_multiselect',
}

export class FormFieldDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(FormFieldType)
  type: FormFieldType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsString()
  @IsOptional()
  placeholder?: string = '';

  @IsString()
  @IsOptional()
  helpText?: string = '';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[] = [];

  @IsString()
  @IsOptional()
  defaultValue?: string = '';

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number = 0;
}

export class FormSettingsDto {
  @IsBoolean()
  @IsOptional()
  allowMultipleSubmissions?: boolean = true;

  @IsBoolean()
  @IsOptional()
  requireApproval?: boolean = false;

  @IsBoolean()
  @IsOptional()
  showProgress?: boolean = true;

  @IsString()
  @IsOptional()
  successMessage?: string = '';

  @IsString()
  @IsOptional()
  submitButtonText?: string = '';
}

export class CreateCustomFormDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string = '';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableMinistries?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableRoles?: string[] = ['volunteer'];

  @ValidateNested()
  @Type(() => FormSettingsDto)
  @IsOptional()
  settings?: FormSettingsDto;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateCustomFormDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  @IsOptional()
  fields?: FormFieldDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableMinistries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableRoles?: string[];

  @ValidateNested()
  @Type(() => FormSettingsDto)
  @IsOptional()
  settings?: FormSettingsDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class SubmitFormDto {
  @IsString()
  @IsNotEmpty()
  volunteerName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  preferredMinistry?: string;

  @IsString()
  @IsOptional()
  preferredRole?: string = 'volunteer';

  @IsOptional()
  customFields?: Record<string, any>;

  // 🆕 Funções selecionadas pelo voluntário
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedFunctions?: string[] = [];

  // 🆕 Campos essenciais para criação do usuário (formulário sucinto)
  @IsString()
  @IsOptional()
  birthDate?: string; // Data de nascimento (YYYY-MM-DD)

  @IsString()
  @IsOptional()
  picture?: string; // URL da foto do perfil

  // Permitir campos dinâmicos com IDs numéricos
  [key: string]: any;
}

export class ReviewSubmissionDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  finalMinistry?: string;

  @IsString()
  @IsOptional()
  finalRole?: string;
}

export class BulkReviewDto {
  @IsArray()
  @IsString({ each: true })
  submissionIds: string[];

  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}

// 🆕 DTO específico para aprovação por líderes de ministério
export class LeaderApprovalDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  leaderApprovalNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  approvedFunctions?: string[]; // Funções específicas aprovadas pelo líder
}
