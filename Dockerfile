# syntax=docker.io/docker/dockerfile:1.7-labs

FROM node:lts-alpine AS core
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml .

# build frontend

FROM core AS builder

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# server

FROM core

RUN pnpm install --prod --frozen-lockfile

COPY --exclude=frontend . .
COPY --from=builder /app/dist /app/dist

CMD ["pnpm", "serve"]