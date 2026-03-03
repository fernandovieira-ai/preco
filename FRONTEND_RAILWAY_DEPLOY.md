# 🚀 Deploy do Frontend TrocaPreco no Railway

## 📋 Pré-requisitos

- Conta no Railway: https://railway.app
- Railway CLI instalado: `npm i -g @railway/cli`
- Backend já deployado no Railway
- Git instalado

---

## 🎯 Arquitetura do Deploy

O frontend é uma aplicação **Angular 16 + Ionic 7** que será servida como arquivos estáticos:

1. **Build:** `ng build --configuration production` → Gera pasta `www/`
2. **Server:** `node server.js` → Express serve os arquivos estáticos da pasta `www/`
3. **Railway:** Detecta automaticamente via `railway.json`

---

## 📦 Arquivos de Configuração (Já Criados)

### ✅ `railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:prod"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### ✅ `server.js`
Servidor Express simples que serve os arquivos da pasta `www/` e redireciona todas as rotas para `index.html` (suporte a SPA).

### ✅ `package.json` (Scripts Atualizados)
```json
{
  "scripts": {
    "build:prod": "ng build --configuration production",
    "start:prod": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

---

## 🚀 Passo a Passo para Deploy

### Opção 1: Via Railway CLI (Recomendado)

```bash
# 1. Ir para a raiz do projeto
cd c:\Linx\cliente\digitalrf\projeto\trocapreco

# 2. Fazer login no Railway
railway login

# 3. Inicializar projeto
railway init
# Selecionar: Create new project
# Nome sugerido: trocapreco-frontend

# 4. Fazer deploy
railway up

# 5. Aguardar build (3-5 minutos)
railway logs

# 6. Pegar URL pública
railway domain
```

### Opção 2: Via GitHub

1. **Criar repositório no GitHub:**
```bash
cd c:\Linx\cliente\digitalrf\projeto\trocapreco

# Inicializar git (se ainda não for um repo)
git init

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: configuracao Railway para frontend"

# Adicionar remote (substitua pelo seu repo)
git remote add origin https://github.com/seu-usuario/trocapreco.git

# Push
git push -u origin main
```

2. **Deploy no Railway:**
   - Acesse https://railway.app
   - Clique em **"New Project"**
   - Selecione **"Deploy from GitHub repo"**
   - Escolha o repositório
   - Railway detectará automaticamente o `railway.json`
   - Aguarde o deploy finalizar

---

## 🔧 Variáveis de Ambiente

⚠️ **O frontend não precisa de variáveis de ambiente no Railway!**

Os endpoints do backend estão configurados em:
- `src/environments/environment.prod.ts` (já atualizado com URL do Railway)

```typescript
export const environment = {
  production: true,
  endPoint: "https://precoback-production.up.railway.app/drfPriceSwap",
  endPointSocket: "https://precoback-production.up.railway.app",
};
```

---

## 🧪 Testar o Frontend

Após o deploy, você receberá uma URL como:
```
https://trocapreco-frontend-production.up.railway.app
```

### Teste 1: Acessar o App
```bash
# Abrir no navegador
railway open
```

**Resultado esperado:**
- ✅ Tela de login carrega
- ✅ Sem erros no console
- ✅ Estilos Ionic carregados

### Teste 2: Login
1. Acesse o app
2. Digite credenciais válidas
3. Clique em **Entrar**

**Resultado esperado:**
- ✅ Requisição vai para `https://precoback-production.up.railway.app/drfPriceSwap/login`
- ✅ Login bem-sucedido
- ✅ Redirecionamento para home

### Teste 3: WebSocket
1. Abra o console do navegador (F12)
2. Verifique conexão Socket.IO

**Resultado esperado:**
```
Socket.IO conectado ao servidor
```

---

## 🔍 Debug e Monitoramento

### Ver Logs em Tempo Real
```bash
railway logs
```

### Ver Status do Deploy
```bash
railway status
```

### Ver URL Pública
```bash
railway domain
```

### Abrir Dashboard
```bash
railway open
```

---

## 🐛 Troubleshooting

### ❌ Erro: "Cannot GET /"
**Causa:** O build não gerou a pasta `www/` ou o `server.js` não encontra os arquivos.

**Solução:**
1. Verificar logs: `railway logs`
2. Confirmar que `www/` foi criada durante o build
3. Verificar se o script `build:prod` está correto

### ❌ Erro: "Failed to compile"
**Causa:** Erro de TypeScript ou dependências faltando.

**Solução:**
1. Testar build localmente: `npm run build:prod`
2. Corrigir erros de compilação
3. Fazer commit e push novamente

### ❌ Erro: "CORS policy blocked"
**Causa:** Backend não aceita requisições da URL do Railway.

**Solução:**
O backend já aceita qualquer domínio `.railway.app` (ver `backend/src/app.js`), então isso não deve acontecer. Se acontecer, adicione a URL específica no backend.

### ❌ Erro: "Network Error" ao fazer login
**Causa:** Frontend não consegue conectar ao backend.

**Solução:**
1. Verificar se backend está online: `curl https://precoback-production.up.railway.app/`
2. Verificar se `environment.prod.ts` tem a URL correta
3. Testar endpoint diretamente: `curl -X POST https://precoback-production.up.railway.app/drfPriceSwap/login ...`

### ❌ Página em branco
**Causa:** Erro de roteamento ou base href incorreta.

**Solução:**
1. Verificar console do navegador (F12)
2. Verificar se `index.html` tem `<base href="/">`
3. Verificar logs do Railway

---

## 📊 Estrutura de Build

```
trocapreco/
├── src/                        # Código fonte Angular/Ionic
├── www/                        # Gerado pelo build (não commitar)
│   ├── index.html
│   ├── main.*.js
│   ├── polyfills.*.js
│   ├── styles.*.css
│   └── assets/
├── server.js                   # Servidor Express para produção
├── railway.json                # Configuração Railway
├── angular.json                # Configuração Angular
├── package.json                # Dependências e scripts
└── FRONTEND_RAILWAY_DEPLOY.md  # Esta documentação
```

---

## 🔄 Redeploy após Alterações

### Automático (via GitHub)
1. Fazer commit das alterações
2. Push para o repositório
3. Railway faz deploy automaticamente

### Manual (via CLI)
```bash
railway up
```

---

## 💡 Dicas de Performance

1. **Build Otimizado:** O script `build:prod` já usa `--configuration production` que:
   - Minifica JavaScript e CSS
   - Remove código não usado (tree-shaking)
   - Otimiza imagens
   - Gera source maps de produção

2. **Caching:** O Express server não tem cache configurado. Para melhorar performance, considere adicionar headers de cache.

3. **CDN:** Para melhor performance global, considere usar Railway com CDN.

---

## 🔒 Segurança

✅ **Já configurado:**
- HTTPS automático no Railway
- Variáveis sensíveis no backend (não no frontend)
- CORS configurado no backend
- Service Worker para PWA (se habilitado)

⚠️ **Recomendações:**
- Não exponha chaves de API no código frontend
- Use environment variables apenas para URLs públicas
- Mantenha credenciais sempre no backend

---

## 📱 Testar no Celular

Após o deploy, você pode acessar o app no celular:

1. Abra o navegador no celular
2. Acesse a URL do Railway: `https://trocapreco-frontend-production.up.railway.app`
3. Adicione à tela inicial (PWA)

**Ou use o Ionic Capacitor:**
1. Build o app para mobile: `ionic build --prod`
2. Adicione a plataforma: `ionic capacitor add android` / `ionic capacitor add ios`
3. Configure `capacitor.config.ts` com a URL do backend
4. Build e deploy para lojas de apps

---

## ✅ Checklist Final

- [ ] Railway CLI instalado
- [ ] Arquivos de configuração criados (railway.json, server.js)
- [ ] package.json atualizado com scripts e express
- [ ] environment.prod.ts com URL do backend Railway
- [ ] Build local funciona: `npm run build:prod`
- [ ] Deploy no Railway executado
- [ ] Frontend acessível na URL pública
- [ ] Login funciona
- [ ] WebSocket conecta
- [ ] Sem erros no console do navegador

---

## 🎉 Pronto!

Após seguir esses passos, seu frontend estará rodando no Railway e conectado ao backend!

**Links:**
- **Backend:** https://precoback-production.up.railway.app
- **Frontend:** `<sua-url-railway>` (será gerada após deploy)
- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app

---

**Desenvolvido por Digital RF**
