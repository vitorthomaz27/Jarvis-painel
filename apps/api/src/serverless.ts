import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'http';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

/**
 * Entrada para a Vercel (função serverless). A instância do Nest é criada uma vez
 * por contêiner e reaproveitada entre requisições.
 */
type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let ready: Promise<Handler> | null = null;

async function boot(): Promise<Handler> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

export async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  ready ??= boot().catch((err: unknown) => { ready = null; throw err; });
  const app = await ready;
  app(req, res);
}
