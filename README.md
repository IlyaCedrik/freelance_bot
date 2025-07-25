# Freelance Telegram Bot

Telegram бот для уведомлений о новых фриланс заказах с системой подписок и платежей.

## 🚀 Функции

- 📂 Подписка на категории заказов
- 💰 Система платежей через Telegram Payments
- 📱 Ежедневные уведомления о новых заказах
- 🔄 Автоматический парсинг заказов из Telegram каналов
- 📊 Отслеживание подписок и платежей

## 🛠 Технологии

- **Node.js** - Runtime
- **Telegraf.js** - Telegram Bot Framework
- **Supabase** - База данных и бэкенд
- **Express.js** - Веб-сервер для webhook'ов
- **node-cron** - Планировщик задач

## 📦 Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd freelance_bot
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
```bash
cp .env.example .env
# Отредактируйте .env файл
```

4. Настройте Supabase:
- Создайте проект в [Supabase](https://supabase.com)
- Выполните миграции из `supabase/migrations/`
- Заполните базу тестовыми данными:
```bash
npm run db:seed
```

5. Настройте платежи:
- Следуйте инструкциям в [PAYMENT_SETUP.md](PAYMENT_SETUP.md)
- Получите тестовый токен в @BotFather
- Обновите TELEGRAM_PAYMENT_TOKEN в .env

6. Настройте Telegram парсер:
- Отредактируйте `src/config/telegram.js`
- Добавьте session string после авторизации

7. Проверьте настройки:
```bash
npm run check:payments
```

8. Запустите бота:
```bash
# Development
npm run dev

# Production
npm start
```

## ⚙️ Настройка

### Telegram Bot
1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен и добавьте в `.env`
3. Настройте платежи через [@BotFather](https://t.me/BotFather)

### Supabase
1. Создайте проект в Supabase
2. Скопируйте URL и ключи в `.env`
3. Выполните SQL миграции
4. Настройте RLS политики (если нужно)

### Webhook (Production)
```bash
# Установите webhook URL
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/webhook"}'
```

## 📁 Структура проекта

```
src/
├── bot/                 # Telegram bot логика
│   ├── handlers/        # Обработчики команд
│   ├── keyboards/       # Клавиатуры
│   ├── middleware/      # Мидлвари
│   └── scenes/         # Сцены диалогов
├── database/           # Модели и миграции
│   └── models/         # Модели данных
├── services/           # Бизнес-логика
└── config/            # Конфигурация
```

## 🔄 Планировщик

Бот автоматически:
- Отправляет уведомления каждый день в 9:00
- Парсит новые заказы каждый час
- Проверяет истекающие подписки

## 💳 Платежи

Поддерживается:
- Telegram Payments API
- Оплата банковскими картами
- Автоматическая активация подписок

## 🚀 Деплой

### Railway
1. Подключите GitHub репозиторий
2. Добавьте переменные окружения
3. Деплой произойдет автоматически

### Render
1. Создайте новый веб-сервис
2. Подключите репозиторий
3. Настройте переменные окружения

## 📝 API

### Основные команды
- `/start` - Начало работы
- `/categories` - Просмотр категорий
- `/settings` - Настройки
- `/help` - Справка

### Callback действия
- `subscribe_{categoryId}` - Подписка на категорию
- `pay_{categoryId}` - Оплата подписки
- `unsubscribe_{categoryId}` - Отписка

## 🔍 Парсинг заказов

Система автоматически парсит заказы из телеграм каналов.

### Быстрый старт
```bash
# 1. Тест без подключения к Telegram
npm run test:mocks

# 2. Настройка API данных в src/config/telegram.js
# Получите на https://my.telegram.org/apps

# 3. Авторизация в Telegram
npm run auth

# 4. Тест подключения
npm run test:connection

# 5. Запуск парсера
npm run parse
```

### Настройка для продакшена
- Замените моки на реальные модели Job/Category
- Настройте планировщик в scheduler.js

### Конфигурация каналов
```javascript
channels: [
  {
    username: 'channel_name',
    name: 'Display Name',
    keywords: ['keyword1', 'keyword2']
  }
]
```

## 🔧 Разработка

### Запуск в режиме разработки
```bash
npm run dev
```

### Тестирование
```bash
npm test
```

### Линтинг
```bash
npm run lint
```

## 📊 Мониторинг

Логи доступны:
- В консоли (development)
- В файлах (production)
- В Supabase Dashboard

## 🔧 Диагностика проблем

### Платежи не работают

1. **Проверьте настройки:**
```bash
npm run check:payments
```

2. **Частые ошибки:**
- `PAYMENT_PROVIDER_INVALID` - неверный токен в .env
- `CURRENCY_TOTAL_AMOUNT_INVALID` - проблема с суммой
- `PROVIDER_DATA_INVALID` - неверные данные провайдера

3. **Проверьте токен:**
- Убедитесь что TELEGRAM_PAYMENT_TOKEN установлен в .env
- Используйте тестовый провайдер для разработки
- Токен должен содержать `:TEST:` для тестирования

4. **Тестовые карты:**
```
Номер: 4242 4242 4242 4242
MM/YY: 12/34
CVC: 123
```

### Логирование
Включите подробное логирование в payment.js для отладки:
- Проверьте консоль на наличие ошибок
- Убедитесь что категории созданы: `npm run seed`
- Проверьте подключение к Supabase

### База данных
```bash
# Проверка подключения
npm run db:migrate

# Заполнение тестовыми данными
npm run seed
```

## 🤝 Поддержка

Для вопросов и поддержки:
- Создайте Issue в GitHub
- Напишите в Telegram: @your_support_username

## 📄 Лицензия

MIT License 