FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/console/package.json ./apps/console/
COPY apps/console-api/package.json ./apps/console-api/

ENV CI=true
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "--filter", "@zonatic/console", "dev"]
