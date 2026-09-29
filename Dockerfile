# Stage 1: Base & Dependencies
FROM node:22-alpine AS base
WORKDIR /app

# Copy root and package manifests
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY eval/package.json eval/

RUN npm install

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY . .

# Build shared, server, and web
RUN npm run build --workspace=@vd/shared
RUN npm run build --workspace=@vd/server
RUN npm run build --workspace=@vd/web

# Stage 3: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/apps/web/dist apps/web/dist
COPY semantic semantic
COPY db db

RUN npm install --omit=dev

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
