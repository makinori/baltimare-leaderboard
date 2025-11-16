FROM docker.io/node:lts-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

ADD . .

# in compose build with
# args: CLOUDSDALE: 1
ARG CLOUDSDALE
ENV CLOUDSDALE $CLOUDSDALE

RUN pnpm build

CMD pnpm serve

