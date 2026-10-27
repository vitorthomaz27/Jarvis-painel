import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { CurrentUser, Public } from '../common/decorators';
import type { AuthUser } from '../common/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';

const LoginSchema = z.object({ email: z.string().email('E-mail inválido'), password: z.string().min(1, 'Informe a senha') });
const PasswordSchema = z.object({ current: z.string().min(1), next: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres') });

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodPipe(LoginSchema)) body: z.infer<typeof LoginSchema>, @Res({ passthrough: true }) res: Response) {
    const { token, me } = await this.auth.login(body.email, body.password);
    res.cookie(config.cookieName, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: THIRTY_DAYS, path: '/' });
    return me;
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(config.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Post('password')
  @HttpCode(200)
  password(@CurrentUser() user: AuthUser, @Body(new ZodPipe(PasswordSchema)) body: z.infer<typeof PasswordSchema>) {
    return this.auth.changePassword(user.id, body.current, body.next);
  }
}
