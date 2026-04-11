import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterRequest, LoginRequest } from './models/auth.request';
import { UserResponse, AuthTokens } from './models/auth.response';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(request: RegisterRequest): Promise<UserResponse> {
    const exists = await this.prisma.user.findUnique({
      where: { email: request.email },
    });
    if (exists) throw new ConflictException('Bu email zaten kullanılıyor');

    const hashed = await bcrypt.hash(request.password, 10);
    return this.prisma.user.create({
      data: { name: request.name, email: request.email, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async login(request: LoginRequest): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: request.email },
    });
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    const valid = await bcrypt.compare(request.password, user.password);
    if (!valid) throw new UnauthorizedException('Geçersiz kimlik bilgileri');

    return this.generateTokens(user.id, user.email);
  }

  async me(userId: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  private generateTokens(userId: string, email: string): AuthTokens {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });
    return { accessToken, refreshToken };
  }
}
