FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY server ./server
COPY data-seed ./data-seed
COPY dist ./dist
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server.mjs"]
