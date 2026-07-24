# syntax=docker/dockerfile:1
#
# Build context for this Dockerfile is the Chiguru/ repo root (it needs both
# farm/ and mana/, which are separate pnpm workspaces) — see ../docker-compose.yml.

# node:*-slim (glibc/Debian), not -alpine: the workspaces' pnpm-workspace.yaml
# pins overrides that exclude the musl (Alpine) rollup native binary, since
# the project was authored assuming a glibc host.
FROM node:22-slim AS farm-build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY farm/ .
RUN pnpm install --frozen-lockfile
# vite.config.ts throws if PORT/BASE_PATH are unset, even though PORT is unused
# by `vite build` itself — only BASE_PATH actually affects the build output.
ENV PORT=5173
ENV BASE_PATH=/
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
RUN pnpm --filter @workspace/farm-app run build

FROM node:22-slim AS manager-build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY mana/ .
RUN pnpm install --frozen-lockfile
ENV PORT=5174
ENV BASE_PATH=/manager/
RUN pnpm --filter @workspace/manager-app run build

FROM nginx:1.27-alpine AS runtime
# openssl is used by entrypoint.sh to mint a throwaway cert on first boot, so
# nginx can start (and serve the ACME http-01 challenge) before certbot has
# ever run — see entrypoint.sh for why.
RUN apk add --no-cache openssl
COPY --from=farm-build /app/artifacts/farm-app/dist/public /usr/share/nginx/html
COPY --from=manager-build /app/artifacts/manager-app/dist/public /usr/share/nginx/html/manager
COPY nginx/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
