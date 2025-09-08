import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty({ message: 'O token do Google é obrigatório' })
  @IsString()
  idToken: string;
}
