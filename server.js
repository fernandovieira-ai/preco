/**
 * Servidor Express para servir o frontend TrocaPreco em produção
 * Serve os arquivos estáticos da pasta www/ gerada pelo build
 */

const express = require('express');
const path = require('path');
const app = express();

// Porta definida pelo Railway ou 8080 como padrão
const PORT = process.env.PORT || 8080;

// Servir arquivos estáticos da pasta www
app.use(express.static(path.join(__dirname, 'www')));

// Redirecionar todas as rotas para index.html (suporte a SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend TrocaPreco rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});
