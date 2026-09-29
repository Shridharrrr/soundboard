# Stage 1: Base & Dependencies
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy manifest files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY eval/package.json eval/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY . .

# Build shared, server, and web
RUN pnpm --filter @vd/shared build
RUN pnpm --filter @vd/server build
RUN pnpm --filter @vd/web build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/apps/web/dist apps/web/dist
COPY semantic semantic
COPY db db

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
