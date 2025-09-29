# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

# copy package manifests for dependency install
COPY webapp/package.json webapp/package-lock.json ./webapp/
RUN cd webapp && npm ci

# build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .

# reuse installed node_modules
COPY --from=deps /app/webapp/node_modules ./webapp/node_modules

WORKDIR /app/webapp
RUN npx prisma generate
RUN npm run build

# production runtime image
FROM node:20-alpine AS runner
WORKDIR /app/webapp
ENV NODE_ENV=production

# copy package manifests
COPY webapp/package.json webapp/package-lock.json ./

# bring in built artifacts and node_modules
COPY --from=deps /app/webapp/node_modules ./node_modules
COPY --from=builder /app/webapp/.next ./.next
COPY --from=builder /app/webapp/public ./public
COPY --from=builder /app/webapp/prisma ./prisma
COPY --from=builder /app/shared ../shared

EXPOSE 3000
CMD ["npm", "run", "start"]
