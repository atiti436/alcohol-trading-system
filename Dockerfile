# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY webapp/package*.json ./webapp/
COPY shared ./shared
COPY prisma ./prisma
RUN npm ci --prefix webapp

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/shared ./shared
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/webapp/node_modules ./webapp/node_modules
COPY . .
WORKDIR /app/webapp
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/webapp/node_modules ./webapp/node_modules
COPY --from=builder /app/webapp/.next ./webapp/.next
COPY --from=builder /app/webapp/public ./webapp/public
COPY --from=builder /app/webapp/prisma ./webapp/prisma
COPY --from=builder /app/shared ./shared
COPY webapp/package.json webapp/package-lock.json ./webapp/

WORKDIR /app/webapp
EXPOSE 3000
CMD [\"npm\", \"run\", \"start\"]
