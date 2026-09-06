# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# sharp needs the shared libvips at runtime; the alpine build links against it.
RUN apk add --no-cache vips-dev >/dev/null 2>&1 || true

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 farmflow

# Production dependencies only — the build's devDependencies do not ship.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER farmflow
EXPOSE 5002

CMD ["node", "dist/server.js"]
