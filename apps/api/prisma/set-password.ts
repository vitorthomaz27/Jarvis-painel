/**
 * Define a senha de um usuário. Se o e-mail não existir, cria como administrador da Jarvis.
 * Uso: pnpm --filter api admin:password <email> <nova-senha>
 */
import { PrismaClient } from './generated';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

try { process.loadEnvFile(); } catch { /* sem .env */ }

async function main() {
  const [emailArg, password] = process.argv.slice(2);
  if (!emailArg || !password) {
    console.error('Uso: pnpm --filter api admin:password <email> <nova-senha>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('A senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { email }, data: { passwordHash } });
      console.log(`Senha atualizada para ${email}. Já pode entrar no painel.`);
    } else {
      await prisma.user.create({ data: { email, name: process.env.SEED_ADMIN_NAME || 'Vitor', passwordHash, isSuperAdmin: true } });
      console.log(`Administrador criado: ${email}. Rode "pnpm db:seed" se quiser o negócio de exemplo.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
