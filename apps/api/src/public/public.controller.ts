import { Body, Controller, Get, Header, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators';
import { CaptureService } from './capture.service';
import { EMBED_JS } from './embed';

/** O script envia text/plain (sem preflight); formulários comuns podem mandar JSON. */
function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const v: unknown = JSON.parse(body);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    } catch { /* cai no erro abaixo */ }
    throw new BadRequestException('Corpo inválido');
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  throw new BadRequestException('Corpo inválido');
}

@Public()
@UseGuards(ThrottlerGuard)
@Controller('public')
export class PublicController {
  constructor(private readonly capture: CaptureService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('v1/leads')
  @HttpCode(200)
  lead(@Body() body: unknown, @Req() req: Request) {
    return this.capture.lead(parseBody(body), { origin: req.headers.origin });
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('v1/events')
  @HttpCode(200)
  event(@Body() body: unknown, @Req() req: Request) {
    return this.capture.event(parseBody(body), { origin: req.headers.origin });
  }

  @Get('embed.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  embed() {
    return EMBED_JS;
  }
}
