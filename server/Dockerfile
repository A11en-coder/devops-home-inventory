FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./

ENV HOST=0.0.0.0
EXPOSE 3000
USER node

CMD ["./node_modules/.bin/tsx", "src/index.ts"]
