# syntax=docker/dockerfile:1

# Four stages, so the image that ships carries none of the tools that built it:
# no compiler, no dev dependencies, no source.
ARG NODE_VERSION=24-alpine

# --- Everything needed to build -------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Compile, and generate the Prisma client ------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` reads the datasource through prisma.config.ts and refuses
# to run without it. Generating opens no connection, so a placeholder is
# enough and no database is needed to build an image.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
RUN npm run db:generate && npm run build

# --- Runtime dependencies only --------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# `--legacy-peer-deps` does the heavy lifting here, and the name undersells it:
# it means "do not install peer dependencies", which npm has done
# automatically since v7. `@prisma/client` peers on the `prisma` CLI and on
# TypeScript, and the CLI drags in Prisma Studio, pglite, mysql2 and tsc —
# 280 MB of tooling that an image running a compiled server never imports.
# `--omit=peer` does not remove them; this does.
#
# The risk is real and is why the image is smoke-tested in CI: if anything
# ever does need a peer at run time, the container stops booting.
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force
# The generated client lives in node_modules and is not a published package,
# so it has to come from the build rather than from the registry.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# --- What actually ships ---------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Signals: Node as PID 1 does not reap children or forward SIGTERM, so a
# container stop would wait out the grace period instead of shutting down.
RUN apk add --no-cache tini

# `node` exists in the official image. Running as root inside a container is
# one escaped process away from being root on the host.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
