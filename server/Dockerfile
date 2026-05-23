# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev


FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates sqlite3 tini \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data \
 && chown -R node:node /data

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 4000

ENTRYPOINT ["/usr/bin/tini", "-s", "--"]
CMD ["node", "dist/index.js"]
