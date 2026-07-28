FROM node:20-alpine

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm@10.33.2

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY . .

# Build explicite du projet NestJS
RUN pnpm build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Lancement explicite du fichier JS généré
CMD ["node", "dist/main.js"]