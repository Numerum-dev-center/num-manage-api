# num-manage

Mono-repo pour le projet `num-manage` avec deux applications séparées :

- `num-manage-api` : backend NestJS
- `num-manage-web` : frontend Next.js

## Prérequis

- Node.js 18 ou supérieur
- pnpm 9 ou supérieur
- Docker et Docker Compose (optionnel pour les conteneurs)

## Installation

À la racine du repo :

```bash
cd d:\IT\NUMERUM DEV CENTER\projets\num-manage
pnpm install
```

## Développement

### Backend uniquement

```bash
cd num-manage-api
pnpm install
pnpm run start:dev
```

L’API sera disponible sur `http://localhost:3000`.

### Frontend uniquement

```bash
cd num-manage-web
pnpm install
pnpm run dev
```

Le site sera disponible sur `http://localhost:3000` (ou sur un autre port si configuré).

## Scripts utiles depuis la racine

```bash
pnpm run start:api   # démarre le backend en dev
pnpm run start:web   # démarre le frontend en dev
pnpm run build:api   # build backend
pnpm run build:web   # build frontend
pnpm run lint        # lint backend et frontend
pnpm run test:api    # tests backend
```

## Docker

### Lancer avec Docker Compose

```bash
docker compose up --build
```

- `api` sera exposé sur `http://localhost:3000`
- `web` sera exposé sur `http://localhost:3001`

### Arrêter

```bash
docker compose down
```

## Notes

- Chaque service a son propre `package.json` pour garder le backend et le frontend indépendants.
- Le workspace `pnpm` est configuré à la racine afin de centraliser l’installation des dépendances.
