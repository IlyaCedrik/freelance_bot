# 🚀 Руководство по развертыванию FreelanceBot

## 📋 Предварительные требования

### Системные требования:
- **Node.js** 18+ 
- **npm** или **yarn**
- **Git** для клонирования репозитория
- Доступ к серверу (VPS/Cloud)

### Внешние сервисы:
- **Telegram Bot Token** от [@BotFather](https://t.me/BotFather)
- **Supabase** аккаунт и проект
- **Домен** с SSL сертификатом (для production)

## 🛠️ Настройка локальной разработки

### 1. Клонирование и установка

```bash
# Клонирование репозитория
git clone <your-repository-url>
cd freelance_bot

# Установка зависимостей
npm install
```

### 2. Настройка переменных окружения

```bash
# Создание файла конфигурации
cp .env.example .env
```

Заполните `.env` файл:

```env
# Telegram Bot
BOT_TOKEN=1234567890:AAE...your_bot_token_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Development settings
NODE_ENV=development
PORT=3000

# Payment (опционально)
PAYMENT_PROVIDER_TOKEN=your_payment_token
```

### 3. Настройка базы данных

1. **Создайте проект в Supabase**
2. **Выполните миграции:**
   ```bash
   # Через Supabase Dashboard или CLI
   supabase db reset
   ```
3. **Проверьте создание таблиц** в Supabase Dashboard

### 4. Запуск в режиме разработки

```bash
npm run dev
```

Бот запустится в режиме polling и будет доступен в Telegram.

## 🌐 Развертывание в Production

### Option 1: Railway (Рекомендуется)

1. **Подготовка:**
   ```bash
   # Установка Railway CLI
   npm install -g @railway/cli
   
   # Логин в Railway
   railway login
   ```

2. **Развертывание:**
   ```bash
   # Инициализация проекта
   railway init
   
   # Добавление переменных окружения
   railway variables set BOT_TOKEN=your_bot_token
   railway variables set SUPABASE_URL=your_supabase_url
   railway variables set SUPABASE_ANON_KEY=your_anon_key
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
   railway variables set NODE_ENV=production
   railway variables set WEBHOOK_URL=https://your-app.railway.app
   
   # Деплой
   railway up
   ```

3. **Настройка домена (опционально):**
   ```bash
   railway domain
   ```

### Option 2: Heroku

1. **Создание приложения:**
   ```bash
   heroku create your-freelance-bot
   ```

2. **Настройка переменных:**
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set SUPABASE_URL=your_supabase_url
   heroku config:set SUPABASE_ANON_KEY=your_anon_key
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_key
   heroku config:set NODE_ENV=production
   heroku config:set WEBHOOK_URL=https://your-freelance-bot.herokuapp.com
   ```

3. **Деплой:**
   ```bash
   git push heroku main
   ```

### Option 3: VPS (Ubuntu)

1. **Подготовка сервера:**
   ```bash
   # Обновление системы
   sudo apt update && sudo apt upgrade -y
   
   # Установка Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Установка PM2
   sudo npm install -g pm2
   
   # Установка Nginx
   sudo apt install nginx -y
   ```

2. **Клонирование и настройка:**
   ```bash
   # Клонирование в домашнюю директорию
   cd ~
   git clone <your-repository-url>
   cd freelance_bot
   
   # Установка зависимостей
   npm install --production
   
   # Создание .env файла
   cp .env.example .env
   # Заполните .env с production настройками
   ```

3. **Настройка PM2:**
   ```bash
   # Создание ecosystem файла
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'freelance-bot',
       script: 'src/index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   EOF
   
   # Запуск приложения
   pm2 start ecosystem.config.js
   
   # Сохранение конфигурации PM2
   pm2 save
   pm2 startup
   ```

4. **Настройка Nginx:**
   ```bash
   # Создание конфигурации Nginx
   sudo cat > /etc/nginx/sites-available/freelance-bot << EOF
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF
   
   # Активация сайта
   sudo ln -s /etc/nginx/sites-available/freelance-bot /etc/nginx/sites-enabled/
   
   # Перезапуск Nginx
   sudo systemctl restart nginx
   ```

5. **SSL сертификат (Let's Encrypt):**
   ```bash
   # Установка Certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # Получение сертификата
   sudo certbot --nginx -d your-domain.com
   ```

## 🔧 Настройка Webhook

После развертывания необходимо настроить webhook:

```bash
# Замените YOUR_BOT_TOKEN и YOUR_WEBHOOK_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://YOUR_WEBHOOK_URL/webhook"}'
```

## 📊 Мониторинг и логи

### Проверка состояния приложения:

```bash
# Health check endpoint
curl https://your-domain.com/health

# Ответ должен быть:
{
  "status": "ok",
  "bot": "your_bot_username",
  "database": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "scheduler_running": true
}
```

### Просмотр логов:

**Railway:**
```bash
railway logs
```

**Heroku:**
```bash
heroku logs --tail
```

**VPS (PM2):**
```bash
pm2 logs freelance-bot
```

## 🔄 Обновление приложения

### Railway/Heroku:
```bash
git push origin main  # Автоматический деплой
```

### VPS:
```bash
cd ~/freelance_bot
git pull origin main
npm install --production
pm2 restart freelance-bot
```

## 🛠️ Обслуживание

### Резервное копирование

1. **База данных:** Используйте автоматические бэкапы Supabase
2. **Конфигурация:** Храните `.env` файлы в безопасном месте
3. **Код:** Регулярные коммиты в Git

### Мониторинг производительности

```bash
# Проверка использования ресурсов (VPS)
htop
df -h
free -h

# PM2 мониторинг
pm2 monit
```

## 🚨 Troubleshooting

### Общие проблемы:

1. **Бот не отвечает:**
   - Проверьте webhook: `GET /health`
   - Проверьте логи на ошибки
   - Убедитесь, что BOT_TOKEN корректный

2. **Ошибки базы данных:**
   - Проверьте подключение к Supabase
   - Убедитесь, что RLS политики настроены
   - Проверьте права доступа

3. **Webhook не работает:**
   - Убедитесь, что WEBHOOK_URL доступен
   - Проверьте SSL сертификат
   - Telegram требует HTTPS для webhook

### Полезные команды:

```bash
# Сброс webhook
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"

# Получение информации о webhook
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"

# Тестирование подключения к базе
node -e "
const { supabase } = require('./src/config/supabase.js');
supabase.from('users').select('count').then(console.log);
"
```

## 📈 Масштабирование

### При росте нагрузки:

1. **Увеличение ресурсов сервера**
2. **Настройка кэширования** (Redis)
3. **Разделение сервисов** (парсер + бот)
4. **Настройка балансировщика нагрузки**

### Оптимизация:

- Используйте CDN для статических ресурсов
- Настройте индексы в базе данных
- Оптимизируйте SQL запросы
- Внедрите систему очередей для уведомлений 