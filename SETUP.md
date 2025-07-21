# 🚀 Настройка Telegram бота

## 1. Создание бота

1. **Откройте [@BotFather](https://t.me/BotFather) в Telegram**
2. **Отправьте команду:** `/newbot`
3. **Введите имя бота:** `Freelance Jobs Bot`
4. **Введите username:** `your_freelance_bot` (должен заканчиваться на `bot`)
5. **Скопируйте токен:** `1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOoPPQQ`

## 2. Настройка платежей

1. **В [@BotFather](https://t.me/BotFather) отправьте:** `/mybots`
2. **Выберите своего бота**
3. **Нажмите:** `Payments`
4. **Выберите провайдера:**
   - 🇷🇺 **YooKassa** (для России)
   - 🌍 **Stripe** (международный)
   - 💳 **Другие провайдеры**

## 3. Обновление .env файла

Замените в файле `.env`:

```bash
# ПЕРЕД:
BOT_TOKEN=test_token_for_development
TELEGRAM_PAYMENT_TOKEN=test_payment_token

# ПОСЛЕ:
BOT_TOKEN=1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOoPPQQ
TELEGRAM_PAYMENT_TOKEN=your_real_payment_token
```

## 4. Тестирование

```bash
npm run dev
```

## 5. Настройка продакшена

### Локальный тест:
```bash
# 1. Запустите Supabase
supabase start

# 2. Заполните базу
npm run db:seed

# 3. Запустите бота
npm run dev
```

### Деплой на Render/Railway:
```bash
# Добавьте переменные окружения:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key
NODE_ENV=production
```

## 6. Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню |
| `/categories` | Просмотр категорий |
| `/settings` | Настройки |
| `/help` | Справка |

## 7. Структура проекта

```
📁 ES Modules структура:
├── src/
│   ├── index.js              # 🟢 ES Modules
│   ├── config/supabase.js    # 🟢 ES Modules  
│   ├── bot/handlers/         # 🟢 ES Modules
│   ├── database/models/      # 🟢 ES Modules
│   └── services/             # 🟢 ES Modules
├── package.json              # "type": "module"
└── .env                      # Переменные окружения
```

## 8. Возможные проблемы

| Ошибка | Решение |
|--------|---------|
| `404: Not Found` | Неверный `BOT_TOKEN` |
| `PAYMENT_PROVIDER_INVALID` | Неверный `TELEGRAM_PAYMENT_TOKEN` |
| `supabaseUrl is required` | Не загружен `.env` файл |
| `port already allocated` | `supabase stop` другого проекта | 