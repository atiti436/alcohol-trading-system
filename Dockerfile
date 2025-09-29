# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app

# Copy entire repository to handle build context properly
COPY . .

# Install dependencies - using npm install to handle any lock file sync issues
WORKDIR /app/webapp
RUN npm install

# Generate Prisma client with explicit schema path
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy shared directory into webapp for reliable path resolution
RUN cp -r /app/shared /app/webapp/shared && \
    echo "✅ Copied shared directory to webapp/" && \
    ls -la /app/webapp/shared/

# Build the application
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/webapp/node_modules ./webapp/node_modules
COPY --from=builder /app/webapp/.next ./webapp/.next
COPY --from=builder /app/webapp/public ./webapp/public
COPY --from=builder /app/webapp/prisma ./webapp/prisma
COPY --from=builder /app/webapp/shared ./webapp/shared
COPY webapp/package.json webapp/package-lock.json ./webapp/

WORKDIR /app/webapp
EXPOSE 3000
CMD ["npm", "run", "start"]
