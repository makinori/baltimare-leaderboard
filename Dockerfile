FROM node:lts-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

ADD package.json pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile

ADD . .
RUN pnpm build && rm -rf .parcel-cache

CMD ["pnpm", "serve"]