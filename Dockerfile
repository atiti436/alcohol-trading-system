# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# Copy entire repository to handle build context properly
COPY . .

# Install dependencies (using npm install instead of npm ci to handle lock file sync issues)
WORKDIR /app/webapp
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Build the application
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
