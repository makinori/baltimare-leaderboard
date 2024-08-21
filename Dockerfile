FROM node:lts-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml .

ADD package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

ADD . .
RUN pnpm build

CMD pnpm serve

