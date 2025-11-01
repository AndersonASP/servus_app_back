import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO padronizado para respostas de erro
 * 
 * Este DTO garante que todas as respostas de erro sigam o mesmo formato,
 * facilitando o tratamento no frontend e proporcionando mensagens
 * amigáveis ao usuário.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Mensagem de erro amigável ao usuário',
    example: 'Email já está em uso. Use um email diferente.',
  })
  message: string;

  @ApiProperty({
    description: 'Código do erro para tratamento específico no frontend',
    example: 'DUPLICATE_EMAIL',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Detalhes técnicos do erro (apenas em ambiente de desenvolvimento)',
    required: false,
  })
  details?: any;

  @ApiProperty({
    description: 'Timestamp do erro',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição que causou o erro',
    example: '/api/users',
  })
  path: string;

  constructor(
    message: string,
    code?: string,
    details?: any,
    path?: string,
  ) {
    this.message = message;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.path = path || '';
  }
}

/**
 * DTO para erros de validação
 * 
 * Especialização do ErrorResponseDto para erros de validação,
 * incluindo detalhes sobre quais campos falharam na validação.
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Detalhes dos erros de validação por campo',
    example: {
      email: ['Email deve ser um endereço válido'],
      password: ['Senha deve ter pelo menos 8 caracteres'],
    },
  })
  validationErrors: Record<string, string[]>;

  constructor(
    message: string,
    validationErrors: Record<string, string[]>,
    path?: string,
  ) {
    super(message, 'VALIDATION_ERROR', validationErrors, path);
    this.validationErrors = validationErrors;
  }
}

/**
 * DTO para erros de conflito (409)
 * 
 * Especialização do ErrorResponseDto para erros de conflito,
 * como recursos duplicados.
 */
export class ConflictErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Tipo do conflito',
    example: 'DUPLICATE_EMAIL',
  })
  conflictType: string;

  @ApiProperty({
    description: 'Campo que causou o conflito',
    example: 'email',
  })
  field?: string;

  constructor(
    message: string,
    conflictType: string,
    field?: string,
    path?: string,
  ) {
    super(message, conflictType, undefined, path);
    this.conflictType = conflictType;
    this.field = field;
  }
}
