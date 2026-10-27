// Os testes usam um banco separado (DATABASE_URL_TEST), que é limpo a cada rodada.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.DATABASE_URL_TEST) throw new Error('Defina DATABASE_URL_TEST no .env para rodar os testes');
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.JWT_SECRET ??= 'segredo-de-teste';
process.env.NODE_ENV = 'test';
