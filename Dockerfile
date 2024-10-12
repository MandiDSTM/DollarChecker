# مرحله ساخت
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# بازسازی باینری‌ها
RUN npm rebuild better-sqlite3

# مرحله نهایی
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app /app
RUN npm install --only=production
CMD ["node", "bot.js"]
