# Online multiplayer service image.
# Runs anywhere Docker runs (Render, Fly, a VPS). Bun + socket.io + Prisma.
FROM oven/bun:1

WORKDIR /app

# Dependencies first so Docker can cache this layer
COPY package.json bun.lock ./
RUN bun install

# App code and database schema
COPY prisma ./prisma
COPY index.ts ./
RUN mkdir -p db && bunx prisma generate

# Render injects PORT; index.ts already honors it
ENV PORT=3005
EXPOSE 3005

CMD ["bun", "index.ts"]
