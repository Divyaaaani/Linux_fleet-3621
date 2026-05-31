# FleetOps control-plane (Bun + Hono + Vite/React)
FROM oven/bun:1.3.5 AS build
WORKDIR /app

# Install deps (workspace-aware)
COPY package.json bun.lock ./
COPY packages/web/package.json packages/web/package.json
RUN bun install --frozen-lockfile || bun install

# Copy source and build the web bundle
COPY . .
RUN cd packages/web && bunx vite build

FROM oven/bun:1.3.5 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200

COPY --from=build /app /app

EXPOSE 4200
WORKDIR /app/packages/web
CMD ["bun", "src/server.ts"]
