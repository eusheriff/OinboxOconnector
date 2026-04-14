FROM node:20.12-alpine

WORKDIR /app

# Instalar dependências básicas para suporte a compilação (se necessário por algumas libs)
RUN apk add --no-cache libc6-compat python3 make g++

# Copiar arquivos de definição de dependências
COPY package*.json ./
COPY docs/package*.json ./docs/

# Instalar dependências (incluindo as de docs)
RUN npm install
RUN cd docs && npm install

# Copiar o restante do código
COPY . .

# Expor portas padrões
EXPOSE 8787 5173 3001

# Comando padrão (será sobrescrito pelo docker-compose)
CMD ["npm", "run", "dev"]
