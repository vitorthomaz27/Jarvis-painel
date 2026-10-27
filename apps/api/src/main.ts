import 'reflect-metadata';

// Carrega .env se existir (Node 20.12+). Em produção as variáveis vêm do ambiente.
try { process.loadEnvFile(); } catch { /* sem .env */ }
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApp(app);
  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
  console.log(`API do Painel Jarvis em http://localhost:${port}`);
}
void bootstrap();
