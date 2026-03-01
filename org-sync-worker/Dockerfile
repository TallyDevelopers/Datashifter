FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

# Install dev deps for build then prune
RUN npm ci && npm run build && npm prune --production

EXPOSE 8080

CMD ["node", "dist/index.js"]
