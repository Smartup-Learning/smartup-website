# Build stage: Debian, so every dev dependency (including miniflare's workerd) installs.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY astro.config.mjs ./
COPY src ./src
COPY public ./public
COPY server ./server
COPY data-seed ./data-seed
RUN npx astro build

# Runtime: production dependencies, the server, Quest's files and the built site.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.mjs ./
COPY server ./server
COPY data-seed ./data-seed
COPY dist ./dist
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["node", "server.mjs"]
