# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY webapp/package*.json ./webapp/
RUN npm ci --prefix webapp

COPY webapp ./webapp
COPY shared ./shared

WORKDIR /app/webapp
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/webapp/node_modules ./webapp/node_modules
COPY --from=builder /app/webapp/.next ./webapp/.next
COPY --from=builder /app/webapp/public ./webapp/public
COPY --from=builder /app/webapp/prisma ./webapp/prisma
COPY --from=builder /app/shared ./shared
COPY webapp/package.json webapp/package-lock.json ./webapp/

WORKDIR /app/webapp
EXPOSE 3000
CMD ["npm", "run", "start"]
