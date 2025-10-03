# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app/webapp

# Install OpenSSL and required libraries for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy webapp directory (which includes shared-src)
COPY webapp .

# Configure npm for better network stability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install dependencies - postinstall will copy shared-src to shared
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/webapp
ENV NODE_ENV=production
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV OPENSSL_CONF=/dev/null

# Install OpenSSL and required libraries for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy all necessary files from builder stage (no subdirectory needed)
COPY --from=builder /app/webapp/node_modules ./node_modules
COPY --from=builder /app/webapp/.next ./.next
COPY --from=builder /app/webapp/public ./public
COPY --from=builder /app/webapp/prisma ./prisma
COPY --from=builder /app/webapp/shared ./shared
COPY --from=builder /app/webapp/package.json ./package.json
COPY --from=builder /app/webapp/package-lock.json ./package-lock.json

EXPOSE 3000
CMD ["npm", "run", "start"]
