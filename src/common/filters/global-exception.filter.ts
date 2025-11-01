import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto, ValidationErrorResponseDto, ConflictErrorResponseDto } from '../dto/error-response.dto';

/**
 * Filtro global de exceções para padronizar respostas de erro
 * 
 * Este filtro captura todas as exceções não tratadas e converte
 * para o formato padronizado ErrorResponseDto, garantindo
 * mensagens amigáveis ao usuário e consistência na API.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: ErrorResponseDto;
    let status: number;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = this.handleHttpException(exception, request.url);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.handleUnknownException(exception, request.url);
    }

    // Log do erro para debug (sem expor detalhes sensíveis)
    this.logger.error(
      `Erro ${status} em ${request.method} ${request.url}: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }

  private handleHttpException(exception: HttpException, path: string): ErrorResponseDto {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Se a resposta já é um ErrorResponseDto, retornar como está
    if (exceptionResponse instanceof ErrorResponseDto) {
      return exceptionResponse;
    }

    // Tratar diferentes tipos de exceção HTTP
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return this.handleBadRequest(exception, path);
      
      case HttpStatus.UNAUTHORIZED:
        return new ErrorResponseDto(
          this.extractMessage(exception) || 'Token expirado. Faça login novamente.',
          'UNAUTHORIZED',
          undefined,
          path,
        );
      
      case HttpStatus.FORBIDDEN:
        return new ErrorResponseDto(
          this.extractMessage(exception) || 'Você não tem permissão para realizar esta ação.',
          'FORBIDDEN',
          undefined,
          path,
        );
      
      case HttpStatus.NOT_FOUND:
        return new ErrorResponseDto(
          this.extractMessage(exception) || 'Recurso não encontrado.',
          'NOT_FOUND',
          undefined,
          path,
        );
      
      case HttpStatus.CONFLICT:
        return this.handleConflict(exception, path);
      
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return this.handleValidationError(exception, path);
      
      case HttpStatus.TOO_MANY_REQUESTS:
        return new ErrorResponseDto(
          'Muitas tentativas. Aguarde um momento e tente novamente.',
          'TOO_MANY_REQUESTS',
          undefined,
          path,
        );
      
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return new ErrorResponseDto(
          'Erro interno do servidor. Tente novamente em alguns minutos.',
          'INTERNAL_SERVER_ERROR',
          undefined,
          path,
        );
      
      default:
        return new ErrorResponseDto(
          this.extractMessage(exception) || 'Erro na operação. Tente novamente.',
          'UNKNOWN_ERROR',
          undefined,
          path,
        );
    }
  }

  private handleBadRequest(exception: HttpException, path: string): ErrorResponseDto {
    const message = this.extractMessage(exception);
    
    // Se a mensagem contém informações de validação, tratar como erro de validação
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, path);
    }
    
    return new ErrorResponseDto(
      message || 'Dados inválidos. Verifique as informações fornecidas.',
      'BAD_REQUEST',
      undefined,
      path,
    );
  }

  private handleValidationError(exception: HttpException, path: string): ValidationErrorResponseDto {
    const exceptionResponse = exception.getResponse();
    let validationErrors: Record<string, string[]> = {};
    
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as any;
      
      // Se é um array de erros de validação (formato do class-validator)
      if (Array.isArray(response)) {
        response.forEach((error: any) => {
          if (error.field && error.constraints) {
            validationErrors[error.field] = Object.values(error.constraints);
          }
        });
      }
      // Se é um objeto com propriedade message
      else if (response.message) {
        if (Array.isArray(response.message)) {
          // Se message é um array, assumir que são erros de validação
          response.message.forEach((error: any) => {
            if (error.field && error.constraints) {
              validationErrors[error.field] = Object.values(error.constraints);
            }
          });
        } else {
          // Se message é uma string, criar um erro genérico
          validationErrors['general'] = [response.message];
        }
      }
    }
    
    // Se não conseguiu extrair erros específicos, usar mensagem genérica
    if (Object.keys(validationErrors).length === 0) {
      validationErrors['general'] = [this.extractMessage(exception) || 'Dados inválidos.'];
    }
    
    return new ValidationErrorResponseDto(
      'Dados inválidos. Verifique as informações fornecidas.',
      validationErrors,
      path,
    );
  }

  private handleConflict(exception: HttpException, path: string): ConflictErrorResponseDto {
    const message = this.extractMessage(exception);
    
    // Detectar tipo de conflito baseado na mensagem
    let conflictType = 'CONFLICT';
    let field: string | undefined;
    
    if (message?.toLowerCase().includes('email')) {
      conflictType = 'DUPLICATE_EMAIL';
      field = 'email';
    } else if (message?.toLowerCase().includes('nome') || message?.toLowerCase().includes('name')) {
      conflictType = 'DUPLICATE_NAME';
      field = 'name';
    }
    
    return new ConflictErrorResponseDto(
      message || 'Este item já existe. Verifique os dados e tente novamente.',
      conflictType,
      field,
      path,
    );
  }

  private handleUnknownException(exception: unknown, path: string): ErrorResponseDto {
    const message = exception instanceof Error ? exception.message : 'Erro interno do servidor';
    
    return new ErrorResponseDto(
      'Erro interno do servidor. Tente novamente em alguns minutos.',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { originalError: message } : undefined,
      path,
    );
  }

  private extractMessage(exception: HttpException): string | null {
    const response = exception.getResponse();
    
    if (typeof response === 'string') {
      return response;
    }
    
    if (typeof response === 'object' && response !== null) {
      const obj = response as any;
      if (obj.message) {
        if (Array.isArray(obj.message)) {
          return obj.message.join(', ');
        }
        return obj.message;
      }
    }
    
    return null;
  }

  private isValidationError(exception: HttpException): boolean {
    const response = exception.getResponse();
    
    if (typeof response === 'object' && response !== null) {
      const obj = response as any;
      
      // Verificar se é um array de erros de validação
      if (Array.isArray(obj)) {
        return obj.some((error: any) => error.field && error.constraints);
      }
      
      // Verificar se tem propriedades de validação
      if (obj.message && Array.isArray(obj.message)) {
        return obj.message.some((error: any) => error.field && error.constraints);
      }
    }
    
    return false;
  }
}
