import { Controller, Post, Body, Headers, Get, Req } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginUserDto } from './DTO/login-user.dto';
import { GoogleLoginDto } from './DTO/google-login.dto';
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
  ) {
    return this.authService.login(loginDto, deviceId);
  }

  @Public()
  @Post('google')
  async googleLogin(
    @Body() googleDto: GoogleLoginDto,
    @Headers('device-id') deviceId: string,
  ) {
    return this.authService.googleLogin(
      googleDto.idToken,
      deviceId || 'unknown',
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
  ) {
    return this.authService.refreshToken(refreshDto.refreshToken, deviceId);
  }

  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
}
