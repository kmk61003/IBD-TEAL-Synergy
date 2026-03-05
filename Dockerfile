# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /app

# Install dependencies separately for better layer caching
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npx prisma generate

FROM base AS final
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy Prisma client
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Copy source
COPY prisma ./prisma
COPY src ./src
COPY server.js ./

# Create non-root user
RUN groupadd -r teal && useradd -r -g teal teal \
  && chown -R teal:teal /app
USER teal

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
