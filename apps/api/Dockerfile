FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY tsconfig.base.json ./
COPY prisma prisma
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run prisma:generate \
  && npm run build --workspace @school-scheduler/shared \
  && npm run build --workspace @school-scheduler/api

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema /app/prisma/schema.prisma && npm run start --workspace @school-scheduler/api"]
