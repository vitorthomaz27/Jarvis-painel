import type { NextConfig } from 'next';

/** O painel fala com a API pelo mesmo domínio (/api/*), então o cookie de sessão é de primeira parte. */
const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
