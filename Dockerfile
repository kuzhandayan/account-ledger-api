FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install packages first so Docker can cache this step
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src
COPY --chown=node:node db ./db

# Run as a non-root user
USER node

EXPOSE 4000

# Create the tables, then start the server
CMD ["sh", "-c", "node src/setupDb.js && exec node src/server.js"]
