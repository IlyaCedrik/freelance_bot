# Система ролей и админ-панель

Этот гайд описывает новую систему ролей в FreelanceBot и как использовать админ-панель для управления ресурсами парсинга.

## 🚨 Быстрое исправление ошибки RLS

Если вы видите ошибку `new row violates row-level security policy for table "users"`, выполните:

```bash
# Вариант 1: Чистая миграция (РЕКОМЕНДУЕТСЯ)
psql -h your-host -d your-db -f supabase/migrations/011_clean_roles_system.sql

# Вариант 2: Через Supabase CLI  
supabase db push
```

Это обеспечит:
- ✅ Систему ролей без лишних компонентов
- ✅ Корректную работу RLS политик
- ✅ Возможность добавления каналов админами
- ✅ Удаление ненужных таблиц jobs и sent_jobs
- ✅ Чистую базу данных только с нужными таблицами

**Экстренное решение:** Если миграции все еще не работают:

**Вариант 1 - Чистая миграция (ЛУЧШИЙ):**
```bash
# Две миграции для чистой системы ролей
psql -h your-host -d your-db -f supabase/migrations/011_clean_roles_system.sql
psql -h your-host -d your-db -f supabase/migrations/012_remove_jobs_tables.sql
```

**Вариант 2 - Отключить RLS временно:**
```sql
-- Временно отключить RLS (НЕ рекомендуется для продакшена)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

## 🎯 Обзор

Система ролей позволяет:
- **Администраторам**: полный доступ к управлению ботом
- **Пользователям**: стандартный доступ к функциям бота


### Роли пользователей:
- `user` - обычный пользователь (по умолчанию)
- `admin` - администратор с полными правами
- `moderator` - модератор (зарезервировано для будущего использования)

## 🚀 Установка и настройка

### 1. Применение миграций

## 🎯 Простой способ (рекомендуется):

```bash
# Применить чистую миграцию без sent_jobs и jobs
psql -h your-host -d your-db -f supabase/migrations/011_clean_roles_system.sql
psql -h your-host -d your-db -f supabase/migrations/012_remove_jobs_tables.sql
```

## 📊 Или через Supabase CLI:

```bash
supabase db push
```

## 🔄 Альтернативный способ (если проблемы с sent_jobs):

```bash
# Применить только нужные миграции вручную
psql -h your-host -d your-db -f supabase/migrations/005_add_roles_system.sql
psql -h your-host -d your-db -f supabase/migrations/007_fix_rls_recursion.sql
psql -h your-host -d your-db -f supabase/migrations/008_fix_channels_rls.sql
```

⚠️ **РЕКОМЕНДАЦИЯ**: 
1. `011_clean_roles_system.sql` - система ролей без лишних компонентов
2. `012_remove_jobs_tables.sql` - удаление ненужных таблиц jobs и sent_jobs

### 2. Назначение первого администратора

После применения миграции назначьте роль админа существующему пользователю:

```sql
-- Назначение роли админа по Telegram ID
UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;

-- Или по username
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

⚠️ **ВАЖНО**: Замените `YOUR_TELEGRAM_ID` на ваш настоящий Telegram ID.

### 3. Получение Telegram ID

Для получения своего Telegram ID:
1. Напишите боту [@userinfobot](https://t.me/userinfobot)
2. Используйте полученный ID в миграции

## 🔧 Функции админ-панели

### Доступ к админ-панели

Администраторы видят дополнительную кнопку "🔧 Админ-панель" в главном меню или могут использовать команду `/admin`.

### Управление каналами парсинга

#### Добавление нового канала

1. Перейдите в "📺 Управление каналами"
2. Нажмите "➕ Добавить канал"
3. Отправьте данные в формате:

```
Название канала
@username_канала
категория_slug
ключевые,слова,через,запятую
```

**Пример:**
```
IT Jobs Channel
@itjobschannel
web-development
сайт,веб,website,html,css,javascript,react,nodejs
```

#### Управление существующими каналами

- **Просмотр**: список всех каналов с их статусом
- **Редактирование**: изменение настроек канала
- **Деактивация**: временное отключение парсинга
- **Удаление**: полное удаление канала

### Управление категориями

- Создание новых категорий заказов
- Редактирование существующих категорий
- Настройка цен и описаний
- Деактивация неактуальных категорий

### Управление пользователями

- **Список пользователей**: просмотр всех пользователей с их ролями
- **Поиск пользователя**: найти по username или ID
- **Назначить админа**: назначить существующего пользователя администратором через интерфейс бота
- **Статистика**: просмотр активности пользователей

#### Назначение администратора через бот

1. Перейдите в "👥 Управление пользователями"
2. Нажмите "👑 Назначить админа"
3. Отправьте Telegram ID или @username пользователя

**Примеры:**
- `123456789` (Telegram ID)
- `@username` (с символом @)

## 🔒 Безопасность (RLS)

Система использует Row Level Security (RLS) для защиты данных:

### Правила доступа

**Пользователи (`users`)**:
- Пользователи видят только свои данные
- Админы видят всех пользователей
- Регистрация доступна всем

**Категории (`categories`)**:
- Чтение доступно всем
- Изменение только админам

**Каналы парсинга (`parsing_channels`)**:
- Активные каналы видят все
- Управление только админам

**Подписки (`subscriptions`)**:
- Пользователи видят только свои подписки
- Админы видят все подписки

**Платежи (`payments`)**:
- Пользователи видят только свои платежи
- Создание платежей только для себя
- Изменение статуса только админам

## 📝 API функции

### User модель - новые методы:

```javascript
// Проверка роли администратора
const isAdmin = await User.isAdmin(telegramId);

// Получение роли пользователя
const role = await User.getUserRole(telegramId);

// Назначение роли
await User.setUserRole(telegramId, 'admin');

// Получение всех админов
const admins = await User.getAllAdmins();

// Поиск пользователя по username
const user = await User.findByUsername('username');
```

### Middleware для проверки прав:

```javascript
import { requireAdmin } from './bot/handlers/admin.js';

// Использование в обработчиках
bot.action('admin_action', requireAdmin, adminHandler);
```

## 🚀 Использование

### Для разработчиков

1. **Добавление новых админ-функций**:
   ```javascript
   // В admin.js
   export const newAdminFunction = async (ctx) => {
     // Права уже проверены middleware
     // Ваш код здесь
   };
   
   // В index.js
   bot.action('new_admin_action', requireAdmin, newAdminFunction);
   ```

2. **Добавление проверки прав в существующий код**:
   ```javascript
   import User from '../database/models/User.js';
   
   const someFunction = async (ctx) => {
     const isAdmin = await User.isAdmin(ctx.from.id);
     if (isAdmin) {
       // Дополнительная функциональность для админов
     }
   };
   ```

### Для администраторов

1. **Мониторинг каналов**:
   - Регулярно проверяйте статус каналов
   - Добавляйте новые источники заказов
   - Обновляйте ключевые слова для лучшего парсинга

2. **Управление пользователями**:
   - Назначайте доверенных пользователей модераторами
   - Отслеживайте активность пользователей
   - Реагируйте на обращения в поддержку

## 🔄 Миграция существующих данных

Если у вас уже есть пользователи в системе:

1. Все существующие пользователи автоматически получат роль `user`
2. Назначьте роль админа вручную через SQL или через интерфейс бота (после назначения первого админа)
3. RLS политики применятся автоматически
4. Существующий функционал останется без изменений

### Способы назначения админа:

**1. Через SQL (для первого админа):**
```sql
UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

**2. Через бот (для последующих админов):**
- Используйте админ-панель → Управление пользователями → Назначить админа

## ⚠️ Важные замечания

1. **Backup**: Обязательно сделайте резервную копию базы данных перед применением миграции
2. **Первый админ**: Назначьте первого админа через SQL после применения миграции
3. **Тестирование**: Протестируйте систему на тестовом окружении
4. **Мониторинг**: Следите за логами после внедрения системы

## 🆘 Устранение проблем

### Проблема: Нет доступа к админ-панели
**Решение**: Проверьте роль в базе данных:
```sql
SELECT telegram_id, role FROM users WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Проблема: Ошибки RLS / "new row violates row-level security policy"
**Решение**: Примените исправляющую миграцию `006_fix_rls_policies.sql`:
```bash
supabase db push
```

Или вручную:
```sql
psql -h your-host -d your-db -f supabase/migrations/006_fix_rls_policies.sql
```

Проверьте, что все политики применились:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('users', 'categories', 'parsing_channels');
```

### Проблема: Функции не работают
**Решение**: Проверьте, что функции созданы:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('is_admin', 'get_user_role');
```

### Проблема: Ошибка регистрации пользователей (RLS)
**Симптом**: `new row violates row-level security policy for table "users"`
**Решение**:
1. Примените миграцию `006_fix_rls_policies.sql`
2. Или временно отключите RLS: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`
3. Перезапустите бота

### Проблема: Бесконечная рекурсия в политиках
**Симптом**: `infinite recursion detected in policy for relation "users"`
**Решение**:
1. Примените миграцию `007_fix_rls_recursion.sql`
2. Эта миграция создает `SECURITY DEFINER` функцию для избежания рекурсии
3. Перезапустите бота

### Проблема: Ошибка добавления каналов/категорий
**Симптом**: `new row violates row-level security policy for table "parsing_channels"` или аналогичная для categories
**Решение**:
1. Примените миграцию `008_fix_channels_rls.sql`
2. Эта миграция добавляет недостающие политики INSERT/UPDATE/DELETE для каналов и категорий
3. Перезапустите бота

### Проблема: Ошибка "relation sent_jobs does not exist"
**Симптом**: `ERROR: relation "sent_jobs" does not exist (SQLSTATE 42P01)`
**Решение**: Используйте чистую миграцию без sent_jobs:
```bash
psql -h your-host -d your-db -f supabase/migrations/011_clean_roles_system.sql
```

Эта миграция содержит все необходимое для системы ролей без ссылок на несуществующие таблицы.

## 📞 Поддержка

Если возникают проблемы с системой ролей:
1. Проверьте логи бота
2. Убедитесь в правильности миграции
3. Проверьте настройки Supabase RLS
4. Обратитесь к документации Supabase

---

**Система готова к использованию!** 🎉 