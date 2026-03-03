# 📱 Como Testar no Celular

## Pré-requisitos

- ✅ Celular e computador na **MESMA REDE Wi-Fi**
- ✅ Backend rodando na porta 3000
- ✅ Frontend configurado para aceitar conexões de rede

---

## 🚀 Passo a Passo

### 1️⃣ Iniciar o Backend

Abra um terminal e execute:

```bash
cd backend
npm start
```

### 2️⃣ Iniciar o Frontend para Rede

Abra outro terminal (ou use o arquivo `START-MOBILE-TEST.bat`) e execute:

```bash
npm run start:network
```

**OU** simplesmente execute o arquivo:

```
START-MOBILE-TEST.bat
```

### 3️⃣ Descobrir seu IP Local

O script `START-MOBILE-TEST.bat` já mostra automaticamente, mas você também pode verificar com:

```bash
ipconfig
```

Procure por **"Endereço IPv4"** (geralmente algo como `192.168.x.x`)

**Seu IP atual:** `192.168.100.12`

### 4️⃣ Acessar do Celular

No navegador do celular, digite:

```
http://192.168.100.12:4200
```

---

## ⚙️ Configurações Aplicadas

### Backend (CORS)

- ✅ Aceita qualquer IP da rede local `192.168.x.x`
- ✅ Socket.IO configurado para rede local

### Frontend

- ✅ Servidor Angular rodando em `0.0.0.0` (aceita conexões externas)
- ✅ `--disable-host-check` para evitar bloqueios

---

## 🐛 Solução de Problemas

### Celular não conecta

1. Verifique se ambos estão na mesma rede Wi-Fi
2. Desative temporariamente o Firewall do Windows
3. Teste acessar `http://192.168.100.12:3000` primeiro (backend)

### Erro de CORS

- Reinicie o backend após as alterações
- Verifique se o IP está correto

### Página não carrega

- Limpe o cache do navegador do celular
- Tente em modo anônimo/privado

---

## 📝 Comandos Úteis

### Ver IP da Máquina

```bash
ipconfig | findstr IPv4
```

### Iniciar em Modo Network (Manual)

```bash
ng serve --host 0.0.0.0 --proxy-config proxy.conf.js --disable-host-check
```

### Testar Backend

```bash
curl http://localhost:3000
```
