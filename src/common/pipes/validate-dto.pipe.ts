import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidateDtoPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    // Logs removidos por segurança - não expor dados sensíveis

    // Se não for um DTO (classe), não precisa validar
    if (!metadata.metatype || !this.isClass(metadata.metatype)) {
      return value;
    }

    // Só valida se for do tipo 'body'
    if (metadata.type !== 'body') {
      return value;
    }

    // Se o value for undefined, retorna um objeto vazio para validação
    if (value === undefined || value === null) {
      value = {};
    }

    try {
      // Converte para instância da classe (para o class-validator funcionar)
      const object = plainToInstance(metadata.metatype, value);

      // Valida
      const errors = await validate(object, {
        whitelist: true, // Remove propriedades não declaradas no DTO
        forbidNonWhitelisted: true, // Lança erro se vier propriedade não declarada
        forbidUnknownValues: true,
      });

      if (errors.length > 0) {
        throw new BadRequestException(this.formatErrors(errors));
      }

      return object;
    } catch (error) {
      throw error;
    }
  }

  private isClass(metatype: any): boolean {
    return (
      typeof metatype === 'function' &&
      metatype !== String &&
      metatype !== Boolean &&
      metatype !== Number &&
      metatype !== Array &&
      metatype !== Object
    );
  }

  private formatErrors(errors: any[]) {
    return errors.map((err) => ({
      field: err.property,
      constraints: err.constraints,
    }));
  }
}
