FROM node:22-alpine

ENV CI=true

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/console/package.json ./apps/console/
COPY apps/console-api/package.json ./apps/console-api/

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @zonatic/console-api build

EXPOSE 8000

CMD ["node", "apps/console-api/dist/server.js"]
