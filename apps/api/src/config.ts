/** Configuração lida do ambiente. Falha cedo se faltar algo obrigatório. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ${name} não definida (veja .env.example)`);
  return v;
}

export const config = {
  get databaseUrl() { return required('DATABASE_URL'); },
  get jwtSecret() { return required('JWT_SECRET'); },
  get publicApiUrl() { return (process.env.PUBLIC_API_URL ?? 'http://localhost:3333').replace(/\/$/, ''); },
  get isProd() { return process.env.NODE_ENV === 'production'; },
  cookieName: 'pj_token',
  /** Fuso dos negócios atendidos (Brasil sem horário de verão desde 2019). */
  timeZone: 'America/Sao_Paulo',
  utcOffsetMinutes: -180,
};
