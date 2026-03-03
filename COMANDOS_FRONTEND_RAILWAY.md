# ⚡ Comandos Rápidos - Frontend Railway

## 🚀 Deploy Inicial

```bash
# 1. Instalar Railway CLI (se ainda não tiver)
npm i -g @railway/cli

# 2. Fazer login
railway login

# 3. Ir para a raiz do projeto
cd c:\Linx\cliente\digitalrf\projeto\trocapreco

# 4. Inicializar projeto
railway init
# Selecionar: Create new project
# Nome: trocapreco-frontend

# 5. Fazer deploy
railway up

# 6. Abrir no navegador
railway open
```

---

## 🧪 Teste Local Antes do Deploy

```bash
# 1. Instalar dependências
npm install

# 2. Build de produção
npm run build:prod

# 3. Testar servidor local
npm run start:prod

# 4. Abrir navegador
# http://localhost:8080
```

**Verificar:**
- ✅ Pasta `www/` foi criada
- ✅ `index.html` existe em `www/`
- ✅ Servidor Express rodando na porta 8080
- ✅ Página carrega sem erros

---

## 📊 Monitoramento

```bash
# Ver logs em tempo real
railway logs

# Ver logs com filtro de erro
railway logs --filter="error"

# Ver status do deploy
railway status

# Ver URL pública
railway domain

# Abrir dashboard
railway open
```

---

## 🔄 Redeploy

```bash
# Redeploy completo
railway up

# Redeploy forçado (rebuild)
railway up --force
```

---

## 🐛 Debug

```bash
# Testar build local
npm run build:prod

# Verificar pasta www gerada
dir www

# Testar servidor local
npm run start:prod

# Ver informações do projeto
railway status

# Ver variáveis (frontend não usa, mas para conferir)
railway variables
```

---

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm start                    # Dev server com proxy (localhost:4200)
npm run start:network        # Dev server acessível na rede local

# Produção
npm run build:prod           # Build otimizado para produção
npm run start:prod           # Iniciar servidor Express

# Ionic
npm run ionic:serve          # Ionic serve (localhost:8100)
npm run ionic:build          # Build Ionic
npm run ionic:build:prod     # Build Ionic produção

# Testes
npm test                     # Rodar testes
npm run lint                 # Linter
```

---

## 🔍 Verificar Configuração

### Arquivo: `railway.json`
```bash
# Ver conteúdo
type railway.json

# Deve conter:
# - buildCommand: npm install && npm run build:prod
# - startCommand: node server.js
```

### Arquivo: `server.js`
```bash
# Testar sintaxe
node --check server.js

# Deve iniciar sem erros
node server.js
```

### Arquivo: `package.json`
```bash
# Verificar scripts
type package.json | findstr "build:prod start:prod"

# Verificar express
type package.json | findstr "express"
```

### Arquivo: `environment.prod.ts`
```bash
# Ver endpoint configurado
type src\environments\environment.prod.ts

# Deve apontar para:
# https://precoback-production.up.railway.app
```

---

## 🔗 URLs Importantes

```bash
# Pegar URL do frontend
railway domain

# Exemplos:
# Frontend: https://trocapreco-frontend-production.up.railway.app
# Backend: https://precoback-production.up.railway.app
```

---

## 🧹 Limpeza

```bash
# Limpar build anterior
rmdir /s /q www

# Limpar node_modules (se necessário)
rmdir /s /q node_modules
npm install

# Limpar cache Angular
rmdir /s /q .angular\cache
```

---

## 📝 Exemplo Completo: Deploy do Zero

```bash
# 1. Instalar CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Entrar na pasta
cd c:\Linx\cliente\digitalrf\projeto\trocapreco

# 4. Testar build local
npm run build:prod

# 5. Testar servidor local
npm run start:prod
# Abrir: http://localhost:8080

# 6. Se tudo OK, fazer deploy
railway init
# Nome: trocapreco-frontend

railway up

# 7. Ver logs do build
railway logs

# 8. Pegar URL pública
railway domain

# 9. Testar no navegador
# Exemplo: https://trocapreco-frontend-production.up.railway.app
```

---

## ⚠️ Troubleshooting Rápido

### Build falhou localmente?
```bash
# Limpar cache e rebuildar
rmdir /s /q .angular\cache
rmdir /s /q www
npm run build:prod
```

### Express não inicia?
```bash
# Verificar se express está instalado
npm list express

# Reinstalar se necessário
npm install express --save
```

### Pasta www/ não foi gerada?
```bash
# Verificar angular.json
type angular.json | findstr "outputPath"

# Deve ser: "outputPath": "www"

# Tentar build novamente
npm run build:prod
```

### Railway CLI não funciona?
```bash
# Reinstalar
npm uninstall -g @railway/cli
npm i -g @railway/cli
railway login
```

### Deploy no Railway falhou?
```bash
# Ver logs detalhados
railway logs --verbose

# Verificar railway.json
type railway.json

# Tentar redeploy forçado
railway up --force
```

---

## 🎯 Checklist Pré-Deploy

- [ ] `npm run build:prod` funciona sem erros
- [ ] Pasta `www/` foi gerada com `index.html`
- [ ] `npm run start:prod` inicia servidor na porta 8080
- [ ] `http://localhost:8080` abre o app
- [ ] Login funciona localmente
- [ ] `railway.json` existe na raiz
- [ ] `server.js` existe na raiz
- [ ] `express` está no `package.json` dependencies
- [ ] Backend Railway está online
- [ ] `environment.prod.ts` tem URL do backend Railway

---

## 🆘 Comandos de Emergência

```bash
# Parar deploy em andamento (no dashboard Railway)
# Não há comando CLI para cancelar

# Reverter para deploy anterior (via dashboard)
railway open
# Settings > Deployments > Rollback

# Deslinkar projeto (CUIDADO!)
railway unlink

# Deletar projeto (MUITO CUIDADO!)
railway delete
```

---

## 📞 Suporte

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Angular Docs:** https://angular.io/docs
- **Ionic Docs:** https://ionicframework.com/docs

---

**Desenvolvido por Digital RF**
