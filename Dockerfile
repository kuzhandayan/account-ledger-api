# Small Node.js image (Alpine Linux)
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install packages first. Docker caches this step, so rebuilding after a
# code change doesn't download packages again.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only what the app needs to run
COPY src ./src
COPY db ./db

# Don't run as root (the "node" user comes with the image)
USER node

EXPOSE 4000

# Create the tables (safe to run every time), then start the server.
# "exec" makes Node the main process, so stopping the container stops it right away.
CMD ["sh", "-c", "node src/setupDb.js && exec node src/server.js"]
