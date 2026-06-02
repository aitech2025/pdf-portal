FROM node:22-alpine AS deps
WORKDIR /app
# git  — required by Baileys transitive deps that are installed from GitHub URLs
# python3 / make / g++ — required to compile native Node addons (e.g. libsignal-client)
RUN apk add --no-cache git python3 make g++
COPY package.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# /data/uploads — PDF/file storage
# /app/baileys_auth — WhatsApp session credentials (must persist across restarts)
VOLUME ["/data/uploads", "/app/baileys_auth"]
EXPOSE 8000
CMD ["node", "dist/server.js"]
