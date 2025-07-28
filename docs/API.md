# 📡 API Documentation - FreelanceBot

## 🌐 HTTP API

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "bot": "freelance_bot",
  "database": "ok", 
  "timestamp": "2024-01-01T00:00:00.000Z",
  "scheduler_running": true
}
```

**Status Codes:**
- `200` - Сервис работает нормально
- `500` - Ошибка в работе сервиса

#### 2. Telegram Webhook
```http
POST /webhook
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "John",
      "username": "john_doe"
    },
    "chat": {
      "id": 123456789,
      "first_name": "John",
      "username": "john_doe",
      "type": "private"
    },
    "date": 1640995200,
    "text": "/start"
  }
}
```

**Response:**
```http
200 OK
```

## 🤖 Bot Commands API

### Основные команды

#### `/start [referral_code]`
Запуск бота и регистрация пользователя

**Параметры:**
- `referral_code` (optional) - Реферальный или промо код

**Примеры:**
```
/start
/start REF123456
/start SAVE20
```

#### `/categories`
Показать список доступных категорий заказов

#### `/profile`
Открыть личный кабинет пользователя

#### `/settings`
Открыть настройки бота

#### `/admin` (только для админов)
Открыть административную панель

### Inline Keyboard Actions

#### Подписки
- `subscribe_{category_id}` - Подписаться на категорию
- `unsubscribe_{category_id}` - Отписаться от категории
- `trial_{category_id}` - Активировать пробный период

#### Платежи
- `pay_{plan_id}` - Создать счет для оплаты
- `cancel_subscription_{subscription_id}` - Отменить подписку
- `confirm_cancel_{subscription_id}` - Подтвердить отмену

#### Навигация
- `main_menu` - Главное меню
- `back_to_main` - Вернуться в главное меню
- `categories` - Список категорий
- `my_subscriptions` - Мои подписки
- `settings` - Настройки
- `profile` - Профиль

#### Реферальная система
- `referral_program` - Реферальная программа
- `referral_refresh` - Обновить статистику
- `referral_details` - Детали реферальной программы
- `referral_withdraw` - Вывод средств
- `create_promo_code` - Создать промокод
- `show_user_promo_codes` - Мои промокоды
- `show_user_promo_requests` - Мои запросы

#### Админ панель
- `admin_main` - Главная админ панель
- `admin_channels` - Управление каналами
- `admin_categories` - Управление категориями
- `admin_users` - Управление пользователями
- `admin_list_channels` - Список каналов
- `admin_list_categories` - Список категорий
- `admin_list_users` - Список пользователей

## 🗄️ Database Models API

### User Model

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - UUID пользователя
 * @property {number} telegramId - Telegram ID
 * @property {string} [username] - Username в Telegram
 * @property {string} [firstName] - Имя пользователя
 * @property {string} [lastName] - Фамилия пользователя
 * @property {Date} createdAt - Дата создания
 * @property {Date} [subscriptionEnd] - Дата окончания подписки
 * @property {boolean} trialUsed - Использован ли пробный период
 * @property {string} role - Роль пользователя (user/admin/super_admin)
 */
```

**Methods:**
- `User.findByTelegramId(telegramId)` - Найти по Telegram ID
- `User.create(userData)` - Создать пользователя
- `User.updateSubscription(userId, endDate)` - Обновить подписку
- `User.hasActiveSubscription(telegramId)` - Проверить активную подписку

### Category Model

```javascript
/**
 * @typedef {Object} Category
 * @property {string} id - UUID категории
 * @property {string} name - Название категории
 * @property {string[]} keywords - Ключевые слова для фильтрации
 * @property {boolean} enabled - Активна ли категория
 * @property {Date} createdAt - Дата создания
 */
```

**Methods:**
- `Category.getAll()` - Получить все категории
- `Category.getEnabled()` - Получить активные категории
- `Category.create(categoryData)` - Создать категорию
- `Category.updateKeywords(id, keywords)` - Обновить ключевые слова

### Subscription Model

```javascript
/**
 * @typedef {Object} Subscription
 * @property {string} id - UUID подписки
 * @property {string} userId - ID пользователя
 * @property {string} categoryId - ID категории
 * @property {Date} createdAt - Дата создания
 */
```

**Methods:**
- `Subscription.getUserSubscriptions(userId)` - Подписки пользователя
- `Subscription.getCategorySubscribers(categoryId)` - Подписчики категории
- `Subscription.create(subscriptionData)` - Создать подписку
- `Subscription.delete(userId, categoryId)` - Удалить подписку

### Referral Model

```javascript
/**
 * @typedef {Object} Referral
 * @property {string} id - UUID реферала
 * @property {string} referrerId - ID реферера
 * @property {string} referredId - ID приглашенного
 * @property {Date} createdAt - Дата создания
 * @property {boolean} bonusPaid - Выплачен ли бонус
 */
```

**Methods:**
- `Referral.generateReferralCode(userId)` - Создать реферальный код
- `Referral.applyReferralCode(code, userId)` - Применить код
- `Referral.getUserStats(userId)` - Статистика пользователя

## 🔄 Events & Webhooks

### Telegram Events

#### Message Events
```javascript
bot.on('message', (ctx) => {
  // ctx.message - объект сообщения
  // ctx.from - информация о пользователе
  // ctx.chat - информация о чате
});
```

#### Callback Query Events
```javascript
bot.on('callback_query', (ctx) => {
  // ctx.callbackQuery.data - данные кнопки
  // ctx.callbackQuery.from - пользователь
});
```

#### Payment Events
```javascript
// Предварительная проверка платежа
bot.on('pre_checkout_query', (ctx) => {
  // ctx.preCheckoutQuery - данные о платеже
});

// Успешный платеж
bot.on('successful_payment', (ctx) => {
  // ctx.message.successful_payment - данные о платеже
});
```

### Custom Events

#### Job Parsing Events
```javascript
// Новый заказ найден
scheduler.on('job_found', (jobData) => {
  // jobData.message - сообщение
  // jobData.category - категория
  // jobData.channel - канал источник
});

// Уведомления отправлены
scheduler.on('notifications_sent', (stats) => {
  // stats.sent - количество отправленных
  // stats.failed - количество неудачных
});
```

## 🔐 Authentication & Authorization

### Middleware Authentication

```javascript
// Аутентификация пользователя
authMiddleware(ctx, next) => {
  // Автоматическая регистрация/обновление пользователя
  // ctx.user - объект пользователя
  // ctx.session - сессия пользователя
}

// Проверка подписки
subscriptionMiddleware(ctx, next) => {
  // ctx.hasActiveSubscription - статус подписки
}

// Проверка прав админа
requireAdmin(ctx, next) => {
  // Проверка роли пользователя
}
```

### Role-Based Access Control

```javascript
// Роли пользователей
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin', 
  SUPER_ADMIN: 'super_admin'
};

// Проверка прав
function hasPermission(userRole, requiredRole) {
  const roleHierarchy = {
    'user': 0,
    'admin': 1,
    'super_admin': 2
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

## 🚀 Usage Examples

### Создание нового обработчика

```javascript
/**
 * Пример создания обработчика команды
 */
const newCommandHandler = async (ctx) => {
  try {
    // Получение данных пользователя
    const user = ctx.user;
    
    // Проверка подписки
    if (!ctx.hasActiveSubscription) {
      return await messageManager.sendMessage(
        ctx, 
        'Для использования этой функции нужна активная подписка'
      );
    }
    
    // Логика обработчика
    const result = await someBusinessLogic();
    
    // Отправка ответа
    await messageManager.sendMessage(ctx, `Результат: ${result}`);
    
  } catch (error) {
    console.error('Error in newCommandHandler:', error);
    await messageManager.sendMessage(ctx, 'Произошла ошибка');
  }
};

// Регистрация обработчика
bot.command('newcommand', newCommandHandler);
```

### Создание inline keyboard

```javascript
/**
 * Пример создания inline клавиатуры
 */
import { Markup } from 'telegraf';

const createCustomKeyboard = (options) => {
  const buttons = options.map(option => 
    Markup.button.callback(option.text, option.callback_data)
  );
  
  return Markup.inlineKeyboard([
    buttons,
    [Markup.button.callback('🏠 Главное меню', 'main_menu')]
  ]);
};
```

### Работа с базой данных

```javascript
/**
 * Пример работы с моделями
 */
const getUserSubscriptions = async (telegramId) => {
  try {
    // Получение пользователя
    const user = await User.findByTelegramId(telegramId);
    if (!user) throw new Error('User not found');
    
    // Получение подписок
    const subscriptions = await Subscription.getUserSubscriptions(user.id);
    
    // Получение категорий
    const categories = await Promise.all(
      subscriptions.map(sub => Category.findById(sub.categoryId))
    );
    
    return categories;
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    throw error;
  }
};
```

## 📊 Error Handling

### Стандартные коды ошибок

```javascript
const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  INVALID_PROMO_CODE: 'INVALID_PROMO_CODE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};
```

### Обработка ошибок

```javascript
const handleError = (error, ctx) => {
  console.error('Bot error:', error);
  
  switch (error.code) {
    case ERROR_CODES.USER_NOT_FOUND:
      return messageManager.sendMessage(ctx, 'Пользователь не найден');
    
    case ERROR_CODES.SUBSCRIPTION_EXPIRED:
      return messageManager.sendMessage(ctx, 'Подписка истекла');
    
    default:
      return messageManager.sendMessage(ctx, 'Произошла неизвестная ошибка');
  }
};
``` 