# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app/webapp

# Copy webapp directory (which includes shared-src)
COPY webapp .

# Install dependencies - postinstall will copy shared-src to shared
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/webapp
ENV NODE_ENV=production

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
