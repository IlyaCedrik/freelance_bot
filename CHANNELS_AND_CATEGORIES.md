# Система категорий и каналов парсинга

## Описание изменений

Система была дополнена поддержкой slug для категорий и переведена на управление каналами парсинга через базу данных вместо конфигурационных файлов.

## Новая архитектура

### 📂 **Категории с slug**

**Зачем нужны slug:**
- URL-friendly идентификаторы (`web-development` вместо UUID)
- Удобная работа с API и роутингом
- Человекочитаемые ссылки
- Стабильные идентификаторы при переименовании

**Структура таблицы `categories`:**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,           -- "Веб-разработка"
  slug VARCHAR(50) NOT NULL UNIQUE,            -- "web-development"
  description TEXT,
  price INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 📡 **Каналы парсинга в базе данных**

**Преимущества:**
- ✅ Динамическое управление каналами без перезапуска
- ✅ Привязка каналов к конкретным категориям
- ✅ Отслеживание активности парсинга
- ✅ Индивидуальные ключевые слова для каждого канала
- ✅ История последнего парсинга

**Структура таблицы `parsing_channels`:**
```sql
CREATE TABLE parsing_channels (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),  -- Привязка к категории
  name VARCHAR(100) NOT NULL,                  -- "Freelance Web Dev"
  username VARCHAR(100) NOT NULL UNIQUE,       -- "freelancewebdev" (без @)
  keywords TEXT[] NOT NULL DEFAULT '{}',       -- ["сайт", "веб", "javascript"]
  is_active BOOLEAN DEFAULT true,
  last_parsed_at TIMESTAMP WITH TIME ZONE,     -- Время последнего парсинга
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Примеры данных

### Категории:
```
         name         |        slug        | price | is_active 
----------------------+--------------------+-------+-----------
 Веб-разработка       | web-development    |   500 | t
 Дизайн               | design             |   500 | t
 Мобильная разработка | mobile-development |   500 | t
```

### Каналы парсинга:
```
       name        |    username     |    category_name     | keywords_count 
-------------------+-----------------+----------------------+----------------
 Design Jobs       | designjobs      | Дизайн               |             10
 Freelance Web Dev | freelancewebdev | Веб-разработка       |             13
 Mobile Dev Jobs   | mobiledevjobs   | Мобильная разработка |              9
```

## Новые модели данных

### 🔧 `ParsingChannel.js` - Модель каналов

**Основные методы:**
```javascript
// Получить все активные каналы
await ParsingChannel.getAll()

// Каналы по категории
await ParsingChannel.getByCategory(categoryId)
await ParsingChannel.getByCategorySlug('web-development')

// Каналы, сгруппированные по категориям
await ParsingChannel.getGroupedByCategory()

// Обновить время парсинга
await ParsingChannel.updateLastParsed(channelId)

// Управление каналами
await ParsingChannel.create(channelData)
await ParsingChannel.update(id, updates)
await ParsingChannel.deactivate(id)
```

### 📂 `Category.js` - Обновленная модель категорий

**Новые методы:**
```javascript
// Поиск по slug
await Category.findBySlug('web-development')

// Категории с каналами
await Category.getAllWithChannels()

// Обновление категории
await Category.update(id, updates)
```

## Изменения в парсере

### 🔄 **TelegramParser** теперь:

1. **Загружает каналы из БД** вместо конфига:
```javascript
async loadChannelsFromDatabase() {
  this.channels = await databaseService.getParsingChannels();
  // Создает мапу категорий по slug
}
```

2. **Использует категорию канала** напрямую:
```javascript
// Раньше: detectCategory(text) - определение по ключевым словам
// Теперь: channel.categories - категория из БД
const category = channel.categories;
```

3. **Обновляет время парсинга**:
```javascript
await databaseService.updateChannelLastParsed(channel.id);
```

### 🎯 **Планировщик** использует slug:

```javascript
// Раньше: ручной маппинг названий
const categoryMapping = {
  'Веб-разработка': 'web',
  // ...
};

// Теперь: прямое использование slug
const categorySlug = subscription.categories.slug;
```

## Управление каналами

### Добавление нового канала:

```javascript
import ParsingChannel from './src/database/models/ParsingChannel.js';
import Category from './src/database/models/Category.js';

// Найти категорию
const category = await Category.findBySlug('web-development');

// Создать канал
await ParsingChannel.create({
  category_id: category.id,
  name: 'React Jobs',
  username: 'reactjobs',
  keywords: ['react', 'javascript', 'frontend', 'веб'],
  is_active: true
});
```

### Обновление ключевых слов:

```sql
UPDATE parsing_channels 
SET keywords = ARRAY['новое', 'ключевое', 'слово'] 
WHERE username = 'freelancewebdev';
```

### Деактивация канала:

```javascript
await ParsingChannel.deactivate(channelId);
```

## Миграция конфигурации

**Старый способ** (`src/config/telegram.js`):
```javascript
channels: [
  {
    name: "Freelance Jobs",
    username: "freelancejobs", 
    keywords: ["заказ", "нужен"]
  }
]
```

**Новый способ** (база данных):
```sql
INSERT INTO parsing_channels (category_id, name, username, keywords) 
VALUES (
  (SELECT id FROM categories WHERE slug = 'web-development'),
  'Freelance Jobs',
  'freelancejobs',
  ARRAY['заказ', 'нужен', 'ищу']
);
```

## API для работы с каналами

### Получение каналов по категории:
```javascript
const webChannels = await ParsingChannel.getByCategorySlug('web-development');
```

### Группировка по категориям:
```javascript
const grouped = await ParsingChannel.getGroupedByCategory();
// {
//   'web-development': {
//     category: { name: 'Веб-разработка', slug: 'web-development' },
//     channels: [...]
//   }
// }
```

### Статистика парсинга:
```sql
SELECT 
  c.name as category,
  pc.name as channel,
  pc.last_parsed_at,
  EXTRACT(EPOCH FROM (NOW() - pc.last_parsed_at))/3600 as hours_since_last_parse
FROM parsing_channels pc
JOIN categories c ON pc.category_id = c.id
ORDER BY pc.last_parsed_at DESC;
```

## Преимущества новой системы

### 🚀 **Масштабируемость**
- Неограниченное количество каналов на категорию
- Легкое добавление новых категорий и каналов
- Динамическое управление без перезапуска

### 🔧 **Гибкость**
- Индивидуальные ключевые слова для каждого канала
- Возможность отключения каналов без удаления
- История активности парсинга

### 📊 **Мониторинг**
- Отслеживание времени последнего парсинга
- Статистика по каналам и категориям
- Простая диагностика проблем

### 🛠️ **Администрирование**
- Управление через SQL или API
- Простая настройка новых каналов
- Централизованная конфигурация

**Система готова к продакшену и легко расширяется!** 🎉 