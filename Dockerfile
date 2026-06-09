# syntax=docker/dockerfile:1
# CapRover 用 Dockerfile (BE+FE を1コンテナに統合)
# - build stage: 依存インストール → Prisma Client 生成 → FE(vite) ビルド
# - runtime stage: 同一OS(debian)で実行。起動時に migrate deploy + seed してから Hono を起動
#   ※ DB(SQLite)はコンテナ揮発。再デプロイのたびに初期化され seed し直される方針。

# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma の Client 生成に openssl が必要
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build:fe

# ---- runtime stage ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# 依存と生成済み Prisma Client / FE ビルド成果物 / 実行に必要なソースをコピー
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# CapRover は既定でコンテナの 80 番を見る (管理画面の Container HTTP Port と一致させる)
ENV PORT=80
EXPOSE 80

# 起動時: マイグレーション適用 → seed → サーバ起動
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npx tsx src/index.ts"]
