# Упрощение схемы базы данных

## Описание изменений

База данных была упрощена в соответствии с новой архитектурой автономного парсера. Теперь в базе хранятся только категории для подписок и платежей.

## Удаленные таблицы

### ❌ `jobs` - заявки
**Причина удаления:** Парсер теперь работает автономно и напрямую отправляет заявки пользователям без сохранения в базу данных.

**Что было:**
- Хранение всех спаршенных заявок
- Связь с категориями по `category_id`
- Отслеживание статуса публикации

### ❌ `sent_jobs` - отправленные заявки
**Причина удаления:** Нет необходимости отслеживать отправленные заявки, так как они не сохраняются в базе.

**Что было:**
- Предотвращение дублирования отправок
- Связь пользователей с заявками
- История отправок

## Оставшиеся таблицы

### ✅ `categories` - категории
**Зачем нужна:** Для работы системы подписок и платежей в боте.

**Структура:**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 500, -- Price in kopecks
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ `users` - пользователи
**Зачем нужна:** Хранение информации о пользователях бота.

### ✅ `subscriptions` - подписки
**Зачем нужна:** Связь пользователей с категориями для получения уведомлений.

**Связь с категориями:** `category_id → categories.id`

### ✅ `payments` - платежи
**Зачем нужна:** История платежей пользователей за подписки.

**Связь с категориями:** `category_id → categories.id`

## Миграция

Файл: `supabase/migrations/002_remove_jobs_tables.sql`

```sql
-- Drop sent_jobs table first (has foreign key to jobs)
DROP TABLE IF EXISTS sent_jobs;

-- Drop jobs table
DROP TABLE IF EXISTS jobs;

-- Remove related indexes
DROP INDEX IF EXISTS idx_jobs_category_id;
DROP INDEX IF EXISTS idx_jobs_published_at;
DROP INDEX IF EXISTS idx_jobs_source;
DROP INDEX IF EXISTS idx_sent_jobs_user_id;
```

## Изменения в коде

### Удаленные файлы
- `src/database/models/Job.js` - модель заявок

### Обновленные файлы

#### `src/services/databaseService.js`
**Удалены методы:**
- `createJob()` - создание заявки
- `getJobByExternalId()` - поиск по внешнему ID
- `getLatestJobs()` - последние заявки
- `getJobsByCategory()` - заявки по категории
- `markJobAsSent()` - отметка об отправке
- `getJobsForUser()` - заявки для пользователя
- `getJobsStats()` - статистика заявок

**Оставлены методы:**
- `getCategories()` - получение категорий
- `getCategoryById()` - поиск категории по ID
- `testConnection()` - проверка подключения

#### `src/utils/testScheduler.js`
- Удален `testJobQuery()` - тест запросов заявок
- Добавлен `testCategoriesQuery()` - тест запросов категорий

## Архитектурные преимущества

### 🚀 Производительность
- Нет записи/чтения заявок из базы данных
- Уменьшена нагрузка на Supabase
- Быстрая обработка и отправка заявок

### 🔧 Простота
- Меньше таблиц для обслуживания
- Упрощенные модели данных
- Меньше точек отказа

### 💰 Экономия
- Меньше операций с базой данных
- Снижение расходов на Supabase
- Оптимизация хранилища

## Маппинг категорий

Парсер использует встроенные категории и маппит их на категории из базы данных:

```javascript
// В планировщике (scheduler.js)
const categoryMapping = {
  'Веб-разработка': 'web',
  'Мобильная разработка': 'mobile', 
  'Дизайн': 'design',
  'Копирайтинг': 'copywriting',
  'Маркетинг': 'marketing',
  'Переводы': 'translation'
};

// В парсере (telegramParser.js)
this.categories = [
  { id: 'web', name: 'Веб-разработка' },
  { id: 'mobile', name: 'Мобильная разработка' },
  { id: 'design', name: 'Дизайн' },
  { id: 'copywriting', name: 'Копирайтинг' },
  { id: 'marketing', name: 'Маркетинг' },
  { id: 'translation', name: 'Переводы' }
];
```

## Команды для применения

### Применить миграцию
```bash
# В локальной разработке
supabase db reset

# В продакшене
supabase db push
```

### Проверить изменения
```bash
# Тест категорий
node src/utils/testScheduler.js

# Тест парсера с уведомлениями
node src/runParser.js test-notifications
```

**Результат:** Упрощенная, быстрая и экономичная система без потери функциональности! 🎉 