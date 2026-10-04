# ---- deps: install once, reused by the builder stage ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the client-side bundle at build
# time — Next.js never reads them again at container runtime. Must be
# supplied as a Docker build argument (Dokploy: "Build Args", separate from
# the runtime "Environment Variables" tab) — no default here on purpose, so
# a missing value fails loudly (empty API base URL) instead of silently
# deploying against a stale/wrong domain.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# .next/standalone already contains a minimal server.js + only the
# node_modules it actually needs (requires next.config.ts's output:
# "standalone", already set) — nothing else from the builder stage is copied.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
