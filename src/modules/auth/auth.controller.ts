import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRequest, LoginRequest } from './models/auth.request';
import { UserResponse, AuthTokens } from './models/auth.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() request: RegisterRequest): Promise<UserResponse> {
    return this.authService.register(request);
  }

  @Post('login')
  login(@Body() request: LoginRequest): Promise<AuthTokens> {
    return this.authService.login(request);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserData): Promise<UserResponse | null> {
    return this.authService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(): { message: string } {
    return { message: 'Çıkış yapıldı' };
  }
}
