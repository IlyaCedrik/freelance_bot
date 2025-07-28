# ⚙️ Руководство по настройке FreelanceBot

## 🚀 Быстрый старт

### 1. Предварительные требования

- **Node.js** 18 или выше
- **npm** или **yarn**
- **Git** для клонирования репозитория
- Аккаунт **Telegram** для создания бота
- Аккаунт **Supabase** для базы данных

### 2. Клонирование репозитория

```bash
git clone <your-repository-url>
cd freelance_bot
npm install
```

### 3. Создание Telegram бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный **Bot Token**

### 4. Настройка Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения инициализации
4. Перейдите в **Settings** → **API**
5. Скопируйте:
   - **Project URL**
   - **anon public key**
   - **service_role key**

### 5. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Основные настройки
BOT_TOKEN=your_bot_token_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Настройки сервера
NODE_ENV=development
PORT=3000

# Для production добавьте:
# WEBHOOK_URL=https://your-domain.com
```

### 6. Настройка базы данных

#### Через Supabase Dashboard:

1. Перейдите в **SQL Editor** в Supabase Dashboard
2. Выполните миграции из папки `supabase/migrations/` в порядке номеров:
   - `001_initial_schema.sql`
   - `002_remove_jobs_tables.sql`
   - и т.д.

#### Через Supabase CLI (альтернативный способ):

```bash
# Установка Supabase CLI
npm install -g supabase

# Логин в Supabase
supabase login

# Связывание с проектом
supabase link --project-ref your-project-id

# Применение миграций
supabase db reset
```

### 7. Запуск в режиме разработки

```bash
npm run dev
```

Если все настроено правильно, вы увидите:
```
🤖 Bot started in polling mode
✅ Bot commands menu configured successfully
🧭 Navigation routes registered: X
🚀 Dev server running on port 3000
```

### 8. Проверка работы

1. Найдите вашего бота в Telegram
2. Отправьте команду `/start`
3. Бот должен ответить приветственным сообщением

## 🔧 Детальная настройка

### Настройка платежей (опционально)

Для работы с платежами добавьте в `.env`:

```env
PAYMENT_PROVIDER_TOKEN=your_payment_token
PAYMENT_CURRENCY=RUB
```

### Настройка логирования

```env
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Настройка парсинга

```env
PARSING_INTERVAL_MINUTES=5
MAX_NOTIFICATIONS_PER_MINUTE=100
MESSAGE_DELAY_MS=50
```

### Feature Flags

```env
ENABLE_REFERRAL_SYSTEM=true
ENABLE_PROMO_CODES=true
ENABLE_TRIAL_PERIOD=true
TRIAL_PERIOD_DAYS=7
```

## 🗄️ Настройка базы данных

### Основные таблицы

После выполнения миграций должны быть созданы следующие таблицы:

- `users` - Пользователи бота
- `categories` - Категории заказов
- `subscriptions` - Подписки пользователей
- `parsing_channels` - Каналы для парсинга
- `referrals` - Реферальная система
- `promo_codes` - Промокоды
- `promo_requests` - Запросы на промокоды

### Настройка RLS (Row Level Security)

Убедитесь, что включены политики RLS для защиты данных:

```sql
-- Пример политики для таблицы users
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (telegram_id = get_current_user_telegram_id());

CREATE POLICY "Admins can view all data" ON users
  FOR ALL USING (is_admin(get_current_user_telegram_id()));
```

## 👨‍💼 Настройка администраторов

### Создание первого админа

1. Запустите бота и зарегистрируйтесь через `/start`
2. В Supabase Dashboard перейдите в **Table Editor** → **users**
3. Найдите свою запись и измените поле `role` на `'admin'` или `'super_admin'`
4. Перезапустите бота
5. Теперь у вас есть доступ к команде `/admin`

### Добавление других админов

Через админ-панель бота:
1. `/admin` → **Управление пользователями**
2. **Назначить администратора**
3. Введите Telegram ID пользователя

## 📱 Настройка каналов для парсинга

### Добавление каналов

1. Добавьте бота в целевые каналы как администратора
2. Через админ-панель: `/admin` → **Управление каналами**
3. **Добавить канал** → введите ID канала (например: `-1001234567890`)

### Настройка категорий

1. `/admin` → **Управление категориями**
2. **Добавить категорию** → введите название и ключевые слова
3. Ключевые слова разделяйте запятыми (например: `react, javascript, frontend`)

## 🚨 Troubleshooting

### Частые проблемы

#### 1. Бот не отвечает
```bash
# Проверьте статус
curl http://localhost:3000/health

# Проверьте логи
npm run dev
```

#### 2. Ошибки базы данных
- Убедитесь, что выполнены все миграции
- Проверьте правильность ключей Supabase
- Убедитесь, что RLS политики настроены

#### 3. Не работает парсинг
- Проверьте, что бот добавлен в каналы как админ
- Убедитесь, что каналы активны в админ-панели
- Проверьте настройки категорий и ключевых слов

#### 4. Не работают платежи
- Убедитесь, что `PAYMENT_PROVIDER_TOKEN` корректный
- Проверьте настройки провайдера платежей
- Для тестов используйте тестовые токены

### Полезные команды

```bash
# Проверка подключения к базе данных
node -e "
const { supabase } = require('./src/config/supabase.js');
supabase.from('users').select('count').then(console.log);
"

# Проверка webhook (для production)
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"

# Сброс webhook
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"
```

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:3000/health
```

Ответ должен быть:
```json
{
  "status": "ok",
  "bot": "your_bot_username",
  "database": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "scheduler_running": true
}
```

### Логирование

Все важные события логируются в консоль:
- ✅ Успешные операции
- ❌ Ошибки и исключения
- 📊 Статистика отправки уведомлений
- 🔧 Изменения конфигурации

## 🔄 Обновление

### Обновление кода

```bash
git pull origin main
npm install
npm run dev
```

### Обновление базы данных

При добавлении новых миграций:

```bash
# Через Supabase CLI
supabase db reset

# Или выполните новые миграции вручную в Dashboard
```

## 🤝 Получение помощи

### Документация
- [README.md](README.md) - Общая информация
- [ARCHITECTURE.md](ARCHITECTURE.md) - Архитектура системы
- [API.md](API.md) - API документация
- [DEPLOYMENT.md](DEPLOYMENT.md) - Руководство по деплою

### Поддержка
- GitHub Issues для багов и предложений
- Telegram канал для обсуждений
- Email поддержка

---

🎉 **Поздравляем!** Ваш FreelanceBot готов к работе! 