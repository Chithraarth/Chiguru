# syntax=docker/dockerfile:1
#
# Pure reverse proxy — the Owner web app, Manager web app, and api-server
# are each built and pushed as their own images from their own standalone
# repos (chiguru-owner-web, chiguru-manager-web, chiguru-backend); this
# image just terminates TLS and routes to them by container name.

FROM nginx:1.27-alpine AS runtime
# openssl is used by entrypoint.sh to mint a throwaway cert on first boot, so
# nginx can start (and serve the ACME http-01 challenge) before certbot has
# ever run — see entrypoint.sh for why.
RUN apk add --no-cache openssl
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
