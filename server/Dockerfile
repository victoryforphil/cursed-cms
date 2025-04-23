FROM oven/bun:1.0.30 as builder

WORKDIR /app

# Copy package files and dependencies and workspace
COPY server/ ./server
COPY web/ ./web
COPY package.json ./package.json
COPY core_types ./core_types

# Install dependencies
RUN bun install

# Generate Prisma client
RUN cd server && bunx prisma generate

# Build final image
FROM oven/bun:1.0.30 as runner

# Install PostgreSQL client tools
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/core_types ./core_types
COPY --from=builder /app/web ./web

# Expose the port your app runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production

# Copy entrypoint script
COPY server/entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# Start the application
CMD ["/usr/src/app/entrypoint.sh"] 