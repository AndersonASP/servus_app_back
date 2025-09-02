import { Controller, Post, Body, Headers, Get, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginUserDto } from './DTO/login-user.dto';
import { GoogleLoginDto } from './DTO/google-login.dto';
import { LoginResponseDto, UserContextDto } from './DTO/login-response.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { RefreshTokenDto } from './DTO/refresh-token.dto';
import { use } from 'passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginUserDto,
    @Headers('device-id') deviceId: string,
    @Headers('x-tenant-id') tenantSlug?: string,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, deviceId, tenantSlug);
  }

  @Public()
  @Post('google')
  async googleLogin(
    @Body() googleDto: GoogleLoginDto,
    @Headers('device-id') deviceId: string,
    @Headers('x-tenant-id') tenantSlug?: string,
  ): Promise<LoginResponseDto> {
    return this.authService.googleLogin(
      googleDto.idToken,
      deviceId || 'unknown',
      tenantSlug,
    );
  }

  @Post('logout')
  async logout(@Req() req: any) {
    const userId = req.user.sub;
    const deviceId = req.headers['device-id'];

    console.log('USER ID',userId);
    console.log(deviceId);
    await this.authService.logout(userId, deviceId);
    return { success: true };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Headers('device-id') deviceId: string,
    @Headers('x-tenant-id') tenantSlug?: string,
  ): Promise<LoginResponseDto> {
    const token = refreshDto.refresh_token;
    if (!token) {
      throw new BadRequestException('refresh_token is required');
    }
    return this.authService.refreshToken(token, deviceId, tenantSlug);
  }

  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @Get('me/context')
  async getUserContext(@Req() req: any): Promise<UserContextDto> {
    console.log('🔍 Controller getUserContext - req.user:', req.user);
    console.log('🔍 Controller getUserContext - req.user.sub:', req.user?.sub);
    console.log('🔍 Controller getUserContext - tipo do sub:', typeof req.user?.sub);
    console.log('🔍 Controller getUserContext - req.user completo:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user.sub;
    if (!userId) {
      console.log('❌ Controller getUserContext - userId não encontrado em req.user.sub');
      console.log('❌ Controller getUserContext - req.user keys:', Object.keys(req.user || {}));
      throw new BadRequestException('User ID not found in token');
    }
    
    return this.authService.getUserContext(userId);
  }
}
