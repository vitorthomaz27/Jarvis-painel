import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** Configuração compartilhada entre main.ts e os testes. */
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('text', { type: 'text/plain', limit: '20kb' });
  // Rotas públicas são chamadas pelos sites dos clientes. O painel fala com a API
  // pelo mesmo domínio (rewrite do Next), então não precisa de CORS com cookies.
  app.enableCors({ origin: '*', methods: ['GET', 'POST'], credentials: false });
}
