// Função da Vercel: repassa todas as rotas para a API Nest compilada em dist/.
const { handler } = require('../dist/serverless');

module.exports = (req, res) => handler(req, res);
