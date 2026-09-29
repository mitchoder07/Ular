# Online multiplayer service image.
# Runs anywhere Docker runs (Render, Fly, a VPS). Bun + socket.io + Prisma.
FROM oven/bun:1

# Set the working directory to the repo root
WORKDIR /app

# Copy the entire repository into the container
COPY . .

# Move into the service folder
WORKDIR /app/mini-services/online

# Install dependencies
RUN bun install

# Generate Prisma client
RUN mkdir -p db && bunx prisma generate

# Render injects PORT; index.ts already honors it
ENV PORT=3005
EXPOSE 3005

CMD ["bun", "index.ts"]