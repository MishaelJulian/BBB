FROM node:24-alpine
WORKDIR /srv
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs ./
USER node
ENV NODE_ENV=production PORT=3001 AUTH_DB_PATH=/data/auth.db
EXPOSE 3001
CMD ["node", "server.mjs"]
