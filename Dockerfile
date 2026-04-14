# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia só os arquivos de dependências primeiro (aproveita cache do Docker)
COPY package*.json ./
RUN npm ci

# Copia o restante e faz o build
COPY . .
RUN npm run build:prod

# Stage 2: Produção
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/www ./www
COPY server.js .

EXPOSE 8080
CMD ["node", "server.js"]
