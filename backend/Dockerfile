FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY migrations/ ./migrations/

EXPOSE 3000

CMD ["node", "src/server.js"]
