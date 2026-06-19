FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3333
CMD ["sh", "-c", "pnpm prisma:deploy && pnpm start"]
