FROM node:20-alpine AS builder

WORKDIR /workspace

COPY apps/web/package.json apps/web/package-lock.json* apps/web/
WORKDIR /workspace/apps/web
RUN npm ci

# Source only — host node_modules/dist are excluded via .dockerignore so the
# Linux-correct dependencies installed above are never overwritten.
COPY apps/web/ .
RUN node scripts/copy-pdf-worker.cjs
RUN npx vite build --outDir /dist

FROM nginx:alpine
COPY --from=builder /dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
