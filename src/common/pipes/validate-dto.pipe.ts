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
    console.log('🔍 ValidateDtoPipe - value:', value);
    console.log('🔍 ValidateDtoPipe - metadata:', metadata);
    console.log('🔍 ValidateDtoPipe - metatype:', metadata.metatype);
    console.log('🔍 ValidateDtoPipe - metatype name:', metadata.metatype?.name);
    console.log('🔍 ValidateDtoPipe - type:', metadata.type);

    // Se não for um DTO (classe), não precisa validar
    if (!metadata.metatype || !this.isClass(metadata.metatype)) {
      console.log('🔍 ValidateDtoPipe - não é uma classe, retornando value');
      return value;
    }

    // Só valida se for do tipo 'body'
    if (metadata.type !== 'body') {
      console.log('🔍 ValidateDtoPipe - não é body, retornando value');
      return value;
    }

    // Se o value for undefined, retorna um objeto vazio para validação
    if (value === undefined || value === null) {
      console.log(
        '🔍 ValidateDtoPipe - value é undefined/null, criando objeto vazio',
      );
      value = {};
    }

    try {
      // Converte para instância da classe (para o class-validator funcionar)
      console.log('🔍 ValidateDtoPipe - convertendo para instância...');
      const object = plainToInstance(metadata.metatype, value);
      console.log('🔍 ValidateDtoPipe - object criado:', object);

      // Valida
      console.log('🔍 ValidateDtoPipe - iniciando validação...');
      const errors = await validate(object, {
        whitelist: true, // Remove propriedades não declaradas no DTO
        forbidNonWhitelisted: true, // Lança erro se vier propriedade não declarada
        forbidUnknownValues: true,
      });

      console.log('🔍 ValidateDtoPipe - erros encontrados:', errors.length);
      if (errors.length > 0) {
        console.log('🔍 ValidateDtoPipe - erros:', errors);
        throw new BadRequestException(this.formatErrors(errors));
      }

      console.log('🔍 ValidateDtoPipe - validação passou!');
      return object;
    } catch (error) {
      console.log('❌ ValidateDtoPipe - erro na validação:', error);
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
