# Production image for the DevMentor app, used by Railway (see railway.json).
# A single stage on purpose: the pre-deploy step runs `npm run db:migrate` and
# `npm run db:seed` through the MikroORM CLI and tsx, which are dev dependencies and
# read the TypeScript migrations and seeders from source.
FROM node:24-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install from the lockfile first so the dependency layer is cached across source edits.
COPY package.json package-lock.json ./
COPY packages/app/package.json packages/app/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
RUN npm ci --no-audit --no-fund

COPY . .
# `next build` needs no secrets and no database (packages/app/AGENTS.md).
RUN npm run build

ENV NODE_ENV=production
# Railway injects PORT; `next start` listens on it.
EXPOSE 3000
CMD ["npm", "run", "start"]
