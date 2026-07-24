# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# The whole workspace is needed: artifacts/api-server depends on lib/db,
# lib/api-zod and lib/integrations-openai-ai-server via pnpm workspace links.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
# esbuild (see build.mjs) bundles most deps into dist/index.mjs, but a few
# (e.g. googleapis, used by src/lib/gmail.ts) are deliberately externalized —
# `pnpm deploy` produces a pruned, production-only node_modules for just this
# package (resolving workspace:* links too) so those still resolve at runtime.
RUN pnpm --filter @workspace/api-server deploy --prod --legacy /deploy/api-server

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /deploy/api-server ./
EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
