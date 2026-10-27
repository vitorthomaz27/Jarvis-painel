import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { daysAgo, hoursAgo } from '../src/common/dates';

describe('Painel Jarvis API (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const ids = { a: '', b: '', ownerA: '', memberA: '', ownerB: '' };
  const KEY_A = 'pj_test_key_a';
  const KEY_B = 'pj_test_key_b';

  const login = async (email: string, password = 'senha-forte-123') => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    return agent;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe('TRUNCATE "Note", "Event", "Lead", "Membership", "Business", "User" CASCADE');
    const hash = await bcrypt.hash('senha-forte-123', 4);
    await prisma.user.create({ data: { email: 'admin@jarvis.test', name: 'Vitor', passwordHash: hash, isSuperAdmin: true } });
    const ownerA = await prisma.user.create({ data: { email: 'dona@a.test', name: 'Dona A', passwordHash: hash } });
    const memberA = await prisma.user.create({ data: { email: 'recepcao@a.test', name: 'Recepção A', passwordHash: hash } });
    const ownerB = await prisma.user.create({ data: { email: 'dono@b.test', name: 'Dono B', passwordHash: hash } });
    const a = await prisma.business.create({ data: { name: 'Studio A', captureKey: KEY_A, allowedOrigins: ['https://studioa.com.br'] } });
    const b = await prisma.business.create({ data: { name: 'Clínica B', captureKey: KEY_B } });
    await prisma.membership.createMany({ data: [
      { userId: ownerA.id, businessId: a.id, role: 'OWNER' },
      { userId: memberA.id, businessId: a.id, role: 'MEMBER' },
      { userId: ownerB.id, businessId: b.id, role: 'OWNER' },
    ] });
    Object.assign(ids, { a: a.id, b: b.id, ownerA: ownerA.id, memberA: memberA.id, ownerB: ownerB.id });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('autenticação', () => {
    it('recusa rota privada sem login', async () => {
      await request(app.getHttpServer()).get('/businesses').expect(401);
    });

    it('recusa senha errada', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({ email: 'dona@a.test', password: 'errada' }).expect(401);
    });

    it('faz login com cookie httpOnly e devolve os negócios do usuário', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'DONA@a.test', password: 'senha-forte-123' }).expect(200);
      expect(String(res.headers['set-cookie'])).toMatch(/pj_token=.*HttpOnly/);
      expect(res.body.businesses).toEqual([{ id: ids.a, name: 'Studio A', role: 'OWNER' }]);
    });
  });

  describe('isolamento entre negócios', () => {
    it('dono de B não vê leads de A', async () => {
      const agent = await login('dono@b.test');
      await agent.get(`/businesses/${ids.a}/leads`).expect(403);
      await agent.get(`/businesses/${ids.a}/overview`).expect(403);
    });

    it('lista só os negócios de que a pessoa participa; a equipe Jarvis vê todos', async () => {
      const b = await login('dono@b.test');
      expect((await b.get('/businesses').expect(200)).body.map((x: { id: string }) => x.id)).toEqual([ids.b]);
      const admin = await login('admin@jarvis.test');
      expect((await admin.get('/businesses').expect(200)).body).toHaveLength(2);
      await admin.get(`/businesses/${ids.a}/leads`).expect(200);
    });

    it('membro comum não altera configurações nem apaga contatos', async () => {
      const m = await login('recepcao@a.test');
      await m.patch(`/businesses/${ids.a}`).send({ name: 'Outro nome' }).expect(403);
      await m.post(`/businesses/${ids.a}/rotate-key`).expect(403);
    });
  });

  describe('captura pública', () => {
    const lead = (body: Record<string, unknown>, origin = 'https://studioa.com.br') =>
      request(app.getHttpServer()).post('/public/v1/leads').set('Origin', origin).set('Content-Type', 'text/plain').send(JSON.stringify(body));

    it('cria lead a partir do script (text/plain) e normaliza o telefone', async () => {
      await lead({ key: KEY_A, nome: 'Ana Souza', telefone: '(31) 99806-0020', tipo: 'Pilates', mensagem: 'Quero horário', page: '/', utm_source: 'instagram' }).expect(200);
      const l = await prisma.lead.findFirstOrThrow({ where: { businessId: ids.a, name: 'Ana Souza' }, include: { notes: true } });
      expect(l).toMatchObject({ phone: '5531998060020', interest: 'Pilates', status: 'NOVO', source: 'FORMULARIO', utmSource: 'instagram' });
      expect(l.notes[0].body).toBe('Chegou pelo formulário do site');
    });

    it('aceita JSON comum e o campo único "WhatsApp ou e-mail" do site da Jarvis', async () => {
      await request(app.getHttpServer()).post('/public/v1/leads').send({ key: KEY_B, 'f-nome': 'Bruno', 'f-contato': 'bruno@mail.com', 'f-negocio': 'Site' }).expect(200);
      const l = await prisma.lead.findFirstOrThrow({ where: { businessId: ids.b, name: 'Bruno' } });
      expect(l.email).toBe('bruno@mail.com');
      expect(l.phone).toBeNull();
    });

    it('contato repetido vira nota no mesmo lead', async () => {
      await lead({ key: KEY_A, nome: 'Ana S.', whatsapp: '31998060020', mensagem: 'Ainda tem vaga?' }).expect(200);
      expect(await prisma.lead.count({ where: { businessId: ids.a, phone: '5531998060020' } })).toBe(1);
      const notes = await prisma.note.findMany({ where: { lead: { phone: '5531998060020' } }, orderBy: { createdAt: 'desc' } });
      expect(notes[0].body).toContain('Ainda tem vaga?');
    });

    it('recusa site não autorizado, chave errada e dados incompletos', async () => {
      await lead({ key: KEY_A, nome: 'X', telefone: '31999990000' }, 'https://outro-site.com').expect(403);
      await lead({ key: 'pj_nao_existe', nome: 'X', telefone: '31999990000' }).expect(404);
      await lead({ key: KEY_A, nome: 'Sem contato' }).expect(400);
    });

    it('descarta robô em silêncio (campo armadilha)', async () => {
      await lead({ key: KEY_A, nome: 'Robô', telefone: '31911112222', _gotcha: 'http://spam' }).expect(200);
      expect(await prisma.lead.count({ where: { name: 'Robô' } })).toBe(0);
    });

    it('conta cliques no WhatsApp', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer()).post('/public/v1/events').set('Content-Type', 'text/plain')
          .send(JSON.stringify({ key: KEY_A, type: 'whatsapp_click', location: i ? 'hero' : 'floating' })).expect(200);
      }
      expect(await prisma.event.count({ where: { businessId: ids.a } })).toBe(3);
    });

    it('serve o script de instalação', async () => {
      const res = await request(app.getHttpServer()).get('/public/embed.js').expect(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
      expect(res.text).toContain('JarvisPainel');
    });
  });

  describe('funil de leads', () => {
    it('mudar status registra a primeira resposta e uma nota', async () => {
      const agent = await login('recepcao@a.test');
      const ana = await prisma.lead.findFirstOrThrow({ where: { businessId: ids.a, phone: '5531998060020' } });
      const res = await agent.patch(`/businesses/${ids.a}/leads/${ana.id}`).send({ status: 'CONVERSANDO' }).expect(200);
      expect(res.body.status).toBe('CONVERSANDO');
      expect(res.body.firstResponseAt).not.toBeNull();
      expect(res.body.notes[0]).toMatchObject({ kind: 'STATUS', body: 'Novo → Conversando', author: { name: 'Recepção A' } });
    });

    it('cadastro manual, nota e lembrete de retorno', async () => {
      const agent = await login('dona@a.test');
      const created = await agent.post(`/businesses/${ids.a}/leads`).send({ name: 'Carla', phone: '31 98888-7777', interest: 'Avaliação' }).expect(201);
      expect(created.body.source).toBe('MANUAL');
      const id = created.body.id as string;
      const noted = await agent.post(`/businesses/${ids.a}/leads/${id}/notes`).send({ body: 'Prefere de manhã' }).expect(201);
      expect(noted.body.notes[0].body).toBe('Prefere de manhã');
      await agent.patch(`/businesses/${ids.a}/leads/${id}`).send({ followUpAt: new Date().toISOString() }).expect(200);
      const retorno = await agent.get(`/businesses/${ids.a}/leads?view=retorno`).expect(200);
      expect(retorno.body.map((l: { name: string }) => l.name)).toContain('Carla');
    });

    it('listas "sem resposta" e "reativar" seguem as regras de 2 horas e 60 dias', async () => {
      await prisma.lead.create({ data: { businessId: ids.a, name: 'Esquecido', createdAt: hoursAgo(3) } });
      await prisma.lead.create({ data: { businessId: ids.a, name: 'Recente', createdAt: hoursAgo(1) } });
      await prisma.lead.create({ data: { businessId: ids.a, name: 'Cliente antigo', status: 'CLIENTE', lastContactAt: daysAgo(70) } });
      await prisma.lead.create({ data: { businessId: ids.a, name: 'Cliente ativo', status: 'CLIENTE', lastContactAt: daysAgo(10) } });
      const agent = await login('dona@a.test');
      const sem = (await agent.get(`/businesses/${ids.a}/leads?view=sem-resposta`).expect(200)).body.map((l: { name: string }) => l.name);
      expect(sem).toEqual(['Esquecido']);
      const reat = (await agent.get(`/businesses/${ids.a}/leads?view=reativar`).expect(200)).body.map((l: { name: string }) => l.name);
      expect(reat).toEqual(['Cliente antigo']);
    });

    it('registrar contato tira o lead de "sem resposta"', async () => {
      const agent = await login('dona@a.test');
      const l = await prisma.lead.findFirstOrThrow({ where: { name: 'Esquecido' } });
      const res = await agent.post(`/businesses/${ids.a}/leads/${l.id}/contact`).expect(200);
      expect(res.body.status).toBe('CONVERSANDO');
      const sem = (await agent.get(`/businesses/${ids.a}/leads?view=sem-resposta`).expect(200)).body;
      expect(sem).toHaveLength(0);
    });

    it('busca por nome e telefone', async () => {
      const agent = await login('dona@a.test');
      expect((await agent.get(`/businesses/${ids.a}/leads?q=carla`).expect(200)).body).toHaveLength(1);
      expect((await agent.get(`/businesses/${ids.a}/leads?q=98888`).expect(200)).body).toHaveLength(1);
    });

    it('visão geral junta os números', async () => {
      const agent = await login('dona@a.test');
      const o = (await agent.get(`/businesses/${ids.a}/overview?days=30`).expect(200)).body;
      expect(o.cliquesWhatsapp).toBe(3);
      expect(o.cliquesPorLocal[0]).toEqual({ location: 'hero', count: 2 });
      expect(o.reativar).toBe(1);
      expect(o.retornos).toBeGreaterThanOrEqual(1);
      expect(o.serie).toHaveLength(30);
      expect(o.serie.reduce((s: number, d: { leads: number }) => s + d.leads, 0)).toBe(o.leadsNoPeriodo);
    });

    it('não deixa mexer em lead de outro negócio pela URL', async () => {
      const agent = await login('dono@b.test');
      const ana = await prisma.lead.findFirstOrThrow({ where: { businessId: ids.a, phone: '5531998060020' } });
      await agent.get(`/businesses/${ids.b}/leads/${ana.id}`).expect(404);
      await agent.patch(`/businesses/${ids.b}/leads/${ana.id}`).send({ status: 'PERDIDO' }).expect(404);
    });
  });

  describe('administração Jarvis', () => {
    it('só a equipe Jarvis cadastra clientes', async () => {
      const owner = await login('dona@a.test');
      await owner.post('/admin/businesses').send({}).expect(403);
    });

    it('cadastra negócio com responsável, que já consegue entrar', async () => {
      const admin = await login('admin@jarvis.test');
      const res = await admin.post('/admin/businesses').send({
        name: 'Academia C', segment: 'academia', city: 'Caeté', whatsapp: '(31) 3651-0000', allowedOrigins: ['academiac.com.br/'],
        owner: { name: 'Carlos', email: 'carlos@c.test', password: 'senha-inicial-1' },
      }).expect(201);
      expect(res.body.business.captureKey).toMatch(/^pj_/);
      expect(res.body.business.allowedOrigins).toEqual(['https://academiac.com.br']);
      expect(res.body.business.whatsapp).toBe('553136510000');
      const carlos = await login('carlos@c.test', 'senha-inicial-1');
      const me = (await carlos.get('/auth/me').expect(200)).body;
      expect(me.businesses[0]).toMatchObject({ name: 'Academia C', role: 'OWNER' });
    });

    it('responsável adiciona e remove membros, mas não a si mesmo', async () => {
      const owner = await login('dona@a.test');
      const added = await owner.post(`/businesses/${ids.a}/members`).send({ name: 'Nova', email: 'nova@a.test', password: 'senha-nova-123' }).expect(201);
      await owner.post(`/businesses/${ids.a}/members`).send({ name: 'Nova', email: 'nova@a.test', password: 'senha-nova-123' }).expect(409);
      await owner.delete(`/businesses/${ids.a}/members/${ids.ownerA}`).expect(403);
      await owner.delete(`/businesses/${ids.a}/members/${added.body.id}`).expect(200);
    });

    it('troca a chave de captura e a antiga para de funcionar', async () => {
      const owner = await login('dona@a.test');
      const res = await owner.post(`/businesses/${ids.a}/rotate-key`).expect(200);
      expect(res.body.captureKey).not.toBe(KEY_A);
      await request(app.getHttpServer()).post('/public/v1/leads').send({ key: KEY_A, nome: 'Z', telefone: '31977776666' }).expect(404);
    });
  });
});
