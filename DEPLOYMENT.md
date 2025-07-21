# 🚀 Деплой Telegram бота в продакшен

## 🎯 Варианты хостинга

| Платформа | Цена | Сложность | Рекомендация |
|-----------|------|-----------|--------------|
| **Railway** | $5/мес | ⭐⭐⭐ | 🏆 Лучший выбор |
| **Render** | $7/мес | ⭐⭐⭐ | 👍 Хорошо |
| **DigitalOcean** | $4/мес | ⭐⭐⭐⭐ | Для опытных |
| **Heroku** | $7/мес | ⭐⭐⭐ | Стабильно |

## 🏆 Railway (Рекомендуемый)

### 1. Подготовка проекта

```bash
# 1. Создайте GitHub репозиторий
git init
git add .
git commit -m "Initial commit"

# 2. Создайте репозиторий на GitHub
# 3. Загрузите код
git remote add origin https://github.com/username/freelance-bot.git
git push -u origin main
```

### 2. Создание проекта Supabase

1. **Зайдите на [supabase.com](https://supabase.com)**
2. **Создайте новый проект:**
   ```
   Organization: Your Organization
   Name: freelance-bot-prod
   Database Password: [сгенерируйте сложный пароль]
   Region: Central US (или ближайший к вам)
   ```

3. **Выполните миграцию:**
   ```bash
   # Скопируйте SQL из supabase/migrations/001_initial_schema.sql
   # Вставьте в SQL Editor на supabase.com
   # Выполните запрос
   ```

4. **Получите ключи:**
   ```bash
   Settings → API → 
   URL: https://your-project.supabase.co
   anon key: eyJhbGciOiJIUzI1NiIs...
   service_role key: eyJhbGciOiJIUzI1NiIs...
   ```

### 3. Деплой на Railway

1. **Зайдите на [railway.app](https://railway.app)**
2. **Подключите GitHub репозиторий**
3. **Добавьте переменные окружения:**

```bash
# Variables
BOT_TOKEN=1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOoPPQQ
TELEGRAM_PAYMENT_TOKEN=284685063:TEST:YWY0NGJlMzEwMmI2
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
NODE_ENV=production
PORT=3000
WEBHOOK_URL=https://your-app.up.railway.app/webhook
```

4. **Настройте webhook в Telegram:**

```bash
# После деплоя выполните:
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app.up.railway.app/webhook"}'
```

## 🌐 Render

### 1. Подготовка

```bash
# 1. Добавьте в package.json
{
  "scripts": {
    "start": "node src/index.js",
    "build": "echo 'No build needed'"
  }
}

# 2. Создайте render.yaml
```

### 2. Настройка Render

1. **Зайдите на [render.com](https://render.com)**
2. **New → Web Service**
3. **Подключите GitHub репозиторий**
4. **Настройки:**
   ```
   Name: freelance-bot
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

### 3. Переменные окружения

```bash
BOT_TOKEN=your_bot_token
TELEGRAM_PAYMENT_TOKEN=your_payment_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NODE_ENV=production
```

## 🐋 DigitalOcean (VPS)

### 1. Создание сервера

```bash
# 1. Создайте Droplet на DigitalOcean
# 2. Подключитесь по SSH
ssh root@your-server-ip

# 3. Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 4. Установите PM2
npm install -g pm2
```

### 2. Деплой приложения

```bash
# 1. Клонируйте проект
git clone https://github.com/username/freelance-bot.git
cd freelance-bot

# 2. Установите зависимости
npm install

# 3. Создайте .env файл
nano .env
# Добавьте все переменные

# 4. Запустите с PM2
pm2 start src/index.js --name "freelance-bot"
pm2 startup
pm2 save
```

## 🔧 Настройка домена (опционально)

### 1. Покупка домена

```bash
# Примеры доменов:
freelance-bot.com
myfreelancebot.ru
jobs-notification.bot
```

### 2. Настройка DNS

```bash
# A записи:
@ → your-server-ip
www → your-server-ip

# Или CNAME для хостингов:
@ → your-app.railway.app
```

### 3. SSL сертификат

```bash
# Автоматически на Railway/Render
# Для VPS используйте Let's Encrypt:
sudo apt install certbot
sudo certbot --nginx -d yourdomain.com
```

## 📊 Мониторинг и логи

### Railway:
```bash
# Логи доступны в веб-интерфейсе
railway logs
```

### Render:
```bash
# Логи в реальном времени в dashboard
```

### VPS:
```bash
# Логи PM2
pm2 logs freelance-bot

# Мониторинг
pm2 monit
```

## 🔄 Обновление бота

### Railway/Render:
```bash
# Автоматический деплой при push в main
git add .
git commit -m "Update bot"
git push origin main
```

### VPS:
```bash
# SSH на сервер
git pull origin main
npm install
pm2 restart freelance-bot
```

## 🧪 Тестирование продакшена

```bash
# 1. Проверьте webhook
curl https://your-domain.com/health

# 2. Протестируйте бота в Telegram
/start

# 3. Проверьте платежи
Категории → Выберите → Оплатить
```

## ⚠️ Важные моменты

1. **Webhook vs Polling:** В продакшене используйте только webhook
2. **Переменные окружения:** Никогда не коммитьте .env в Git
3. **Мониторинг:** Настройте алерты на падение сервиса
4. **Бэкапы:** Регулярно делайте бэкапы Supabase
5. **Логи:** Мониторьте ошибки и производительность

## 💰 Примерная стоимость

```bash
Railway: $5/мес
Supabase: $25/мес (при росте)
Домен: $10/год
Итого: ~$35/мес
``` 