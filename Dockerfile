# =============================================================================
# EduFunds Production Dockerfile
# =============================================================================
# Multi-Stage Build für optimierte Production-Images
#
# Features:
# - Separater Build-Stage mit allen Dev-Dependencies
# - Production-Stage nur mit notwendigen Dateien
# - Standalone Output für optimiertes Deployment
# - Nicht-root User für Sicherheit
#
# Build:
#   docker build -t edufunds:latest .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.production edufunds:latest
# =============================================================================

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Installiere notwendige System-Pakete
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Kopiere Package Files
COPY package.json package-lock.json* ./

# Installiere Dependencies (inkl. Dev für Build)
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiere Dependencies von deps Stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Kopiere Source Code
COPY . .

# Build Argumente
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1

# Paywall-Dev-Mock: NEXT_PUBLIC_* wird zur BUILD-Zeit in das Client-Bundle
# eingebacken (PaywallGate.tsx ist "use client"). Default 0 — Production-Builds
# reichen den Build-Arg nicht durch und bekommen den Mock daher nie.
# Nur deploy-staging.sh setzt --build-arg NEXT_PUBLIC_PAYWALL_DEV_MOCK=1.
ARG NEXT_PUBLIC_PAYWALL_DEV_MOCK=0
ENV NEXT_PUBLIC_PAYWALL_DEV_MOCK=${NEXT_PUBLIC_PAYWALL_DEV_MOCK}

# Öffentliche Basis-URL: ebenfalls NEXT_PUBLIC_* und damit zur BUILD-Zeit ins
# Client-Bundle eingebacken. Ohne diesen Build-Arg kennt der Client-Code nur den
# Fallback aus lib/app-url.ts — der Laufzeit-Wert aus --env-file erreicht ihn nicht.
# Die Deploy-Skripte reichen die Domain der jeweiligen Umgebung durch.
ARG NEXT_PUBLIC_APP_URL=https://edufunds.org
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Build
RUN npm run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Installiere wget für Healthcheck
RUN apk add --no-cache wget

# Erstelle nicht-root User
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Kopiere standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Kopiere package.json (für npm start)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Kopiere node_modules (nur Production-Dependencies)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Wechsle zu nicht-root User
USER nextjs

# Port exponieren
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Starte Next.js
CMD ["node", "server.js"]
