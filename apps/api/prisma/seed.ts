/**
 * Cria o acesso de administrador da Jarvis e um negócio de exemplo com leads fictícios.
 * Uso: pnpm db:seed  (lê SEED_ADMIN_* do .env; sem senha definida, gera uma e mostra no terminal)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

try { process.loadEnvFile(); } catch { /* sem .env */ }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const H = 3600_000;
const D = 24 * H;

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'jarvistecnologia01@gmail.com').toLowerCase();
  const name = process.env.SEED_ADMIN_NAME || 'Vitor';
  let password = process.env.SEED_ADMIN_PASSWORD;
  const generated = !password;
  if (!password) password = randomBytes(9).toString('base64url');

  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.user.create({ data: { email, name, isSuperAdmin: true, passwordHash: await bcrypt.hash(password, 10) } });
    console.log(`Administrador criado: ${email}`);
    if (generated) console.log(`Senha gerada (troque no primeiro acesso): ${password}`);
  } else {
    console.log(`Administrador já existe: ${email} (senha mantida)`);
  }

  const demoName = 'Studio Equilíbrio (exemplo)';
  if (await prisma.business.findFirst({ where: { name: demoName } })) {
    console.log('Negócio de exemplo já existe.');
    return;
  }
  const b = await prisma.business.create({
    data: {
      name: demoName, segment: 'pilates', city: 'Sabará', whatsapp: '5531900000000',
      captureKey: 'pj_' + randomBytes(12).toString('base64url'),
      members: { create: { userId: admin.id, role: 'OWNER' } },
    },
  });
  const now = Date.now();
  const leads: Array<{ name: string; phone: string; interest: string; status: 'NOVO' | 'CONVERSANDO' | 'AGENDOU' | 'CLIENTE' | 'PERDIDO'; age: number; last?: number; follow?: number; source?: 'FORMULARIO' | 'MANUAL'; msg?: string }> = [
    { name: 'Mariana Lopes (exemplo)', phone: '5531911110001', interest: 'Aula experimental', status: 'NOVO', age: 3 * H, msg: 'Tem horário à noite?' },
    { name: 'Paulo Henrique (exemplo)', phone: '5531911110002', interest: 'Pilates para dor nas costas', status: 'NOVO', age: 40 * 60_000, msg: 'Quanto custa o plano mensal?' },
    { name: 'Juliana Reis (exemplo)', phone: '5531911110003', interest: 'Plano trimestral', status: 'CONVERSANDO', age: 2 * D, follow: 0 },
    { name: 'Roberta Alves (exemplo)', phone: '5531911110004', interest: 'Aula experimental', status: 'AGENDOU', age: 4 * D, follow: 1 * D },
    { name: 'Fernanda Dias (exemplo)', phone: '5531911110005', interest: 'Plano mensal', status: 'CLIENTE', age: 120 * D, last: 75 * D, source: 'MANUAL' },
    { name: 'Lucas Martins (exemplo)', phone: '5531911110006', interest: 'Plano mensal', status: 'CLIENTE', age: 30 * D, last: 5 * D },
    { name: 'Sérgio Costa (exemplo)', phone: '5531911110007', interest: 'Aula avulsa', status: 'PERDIDO', age: 20 * D, last: 18 * D },
  ];
  for (const l of leads) {
    const createdAt = new Date(now - l.age);
    await prisma.lead.create({
      data: {
        businessId: b.id, name: l.name, phone: l.phone, interest: l.interest, message: l.msg ?? null, status: l.status,
        source: l.source ?? 'FORMULARIO', createdAt,
        lastContactAt: new Date(now - (l.last ?? l.age)),
        firstResponseAt: l.status === 'NOVO' ? null : new Date(createdAt.getTime() + H),
        followUpAt: l.follow === undefined ? null : new Date(now + l.follow),
        notes: { create: { kind: 'SISTEMA', body: 'Contato de exemplo criado pelo seed', createdAt } },
      },
    });
  }
  for (let i = 0; i < 24; i++) {
    await prisma.event.create({ data: { businessId: b.id, type: 'WHATSAPP_CLICK', location: ['floating', 'hero', 'footer'][i % 3], createdAt: new Date(now - (i % 14) * D) } });
  }
  console.log(`Negócio de exemplo criado: ${demoName}`);
}

main().finally(() => prisma.$disconnect());
