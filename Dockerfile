# Multi-stage build for Job Seeker Toolkit
# 1) Build static client with Vite
# 2) Run Node server that serves build/ and /api endpoints

FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
# Use a non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# The server reads PORT (Render/Railway/Fly set this automatically)
EXPOSE 8787

CMD ["node", "server/server.js"]

