FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز
RUN apk add --no-cache make gcc g++ python3 sqlite-dev

COPY package*.json ./
RUN npm install
COPY . .

# بازسازی better-sqlite3
RUN npm rebuild better-sqlite3

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app /app
RUN npm install --only=production
CMD ["node", "bot.js"]
