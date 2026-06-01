# =============================================================================
# BoviTrans MVP — Dockerfile multi-stage para Next.js (App Router, standalone)
# Requiere en next.config:  output: 'standalone'
# =============================================================================

# 1) Dependencias -------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build --------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Genera el Prisma Client (no requiere conexión a la DB, solo el schema).
RUN npx prisma generate
RUN npm run build

# 3) Runner (imagen final, mínima) -------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Artefactos del build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma Client + query engine (asegura que el binario esté en la imagen final).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
