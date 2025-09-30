import { PartialType } from '@nestjs/mapped-types';
import { CreateScaleTemplateDto } from './create-scale-template.dto';

export class UpdateScaleTemplateDto extends PartialType(CreateScaleTemplateDto) {}


