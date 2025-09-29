# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app

# Copy entire repository to handle build context properly
COPY . .

# Debug: Check if shared directory exists
RUN echo "=== Checking repository structure ===" && \
    ls -la /app/ && \
    echo "=== Checking shared directory ===" && \
    ls -la /app/shared/ || echo "⚠️ shared directory not found in /app/"

# Install dependencies - postinstall will copy shared directory
WORKDIR /app/webapp
RUN npm install

# Generate Prisma client with explicit schema path
RUN npx prisma generate --schema=./prisma/schema.prisma

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
