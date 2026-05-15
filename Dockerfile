FROM node:20-bookworm-slim AS build

WORKDIR /fba_ui

COPY . .

RUN npm install -g pnpm@10.28.2 \
    && pnpm install \
    && pnpm --filter "@vben-core/*" --if-present build \
    && pnpm --filter "./apps/web-antdv-next" build

FROM nginx

COPY scripts/deploy/nginx.conf /etc/nginx/nginx.conf

COPY --from=build /fba_ui/apps/web-antdv-next/dist /var/www/fba_ui

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
