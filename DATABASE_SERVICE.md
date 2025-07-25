# Database Service

Сервис для работы с базой данных Supabase в проекте Freelance Bot.

## Описание

`DatabaseService` - это единая точка доступа к базе данных, которая предоставляет методы для работы с заказами и категориями. Сервис использует существующие модели (`Category`, `Job`) и конфигурацию Supabase.

## Основные возможности

### Работа с категориями
```javascript
// Получить все активные категории
const categories = await databaseService.getCategories();

// Получить категорию по ID
const category = await databaseService.getCategoryById(1);
```

### Работа с заказами
```javascript
// Создать новый заказ (с проверкой дубликатов)
const jobData = {
  external_id: 'unique_id',
  title: 'Название заказа',
  description: 'Описание заказа',
  category_id: 1,
  budget_min: 1000,
  budget_max: 5000,
  currency: 'RUB',
  url: 'https://example.com',
  source: 'telegram_channel',
  published_at: new Date().toISOString()
};
const job = await databaseService.createJob(jobData);

// Получить заказ по external_id
const existingJob = await databaseService.getJobByExternalId('unique_id');

// Получить последние заказы
const latestJobs = await databaseService.getLatestJobs(10);

// Получить заказы по категории
const categoryJobs = await databaseService.getJobsByCategory(1, 10);

// Получить заказы для пользователя (исключая уже отправленные)
const userJobs = await databaseService.getJobsForUser('user_id', 10);

// Отметить заказ как отправленный пользователю
await databaseService.markJobAsSent('user_id', 'job_id');
```

### Статистика
```javascript
// Получить общую статистику заказов
const stats = await databaseService.getJobsStats();
console.log(stats);
// Результат:
// {
//   total: 150,
//   bySource: {
//     'telegram_channel1': 75,
//     'telegram_channel2': 50,
//     'website': 25
//   },
//   today: 12
// }
```

### Проверка подключения
```javascript
// Проверить подключение к базе данных
const isConnected = await databaseService.testConnection();
if (isConnected) {
  console.log('База данных доступна');
}
```

## Интеграция с TelegramParser

`TelegramParser` теперь использует `DatabaseService` вместо mock-данных:

```javascript
import databaseService from './services/databaseService.js';

// В конструкторе парсера
this.db = databaseService;

// Использование в методах парсера
const categories = await this.db.getCategories();
const createdJob = await this.db.createJob(jobData);
```

## Обработка ошибок

Все методы `DatabaseService` включают обработку ошибок:
- Методы чтения возвращают пустые массивы/null при ошибках
- Методы записи выбрасывают исключения, которые нужно обрабатывать

```javascript
try {
  const job = await databaseService.createJob(jobData);
  console.log('Заказ создан:', job.id);
} catch (error) {
  console.error('Ошибка создания заказа:', error);
}
```

## Предотвращение дубликатов

`DatabaseService` автоматически проверяет дубликаты при создании заказов по полю `external_id`. Если заказ с таким ID уже существует, возвращается существующий заказ без создания нового.

## Тестирование

Для тестирования сервиса используйте:

```bash
# Полное тестирование парсинга с базой данных
npm run test:parsing

# Запуск парсера с реальными данными
npm run parse
```

## Конфигурация

Убедитесь, что в `.env` файле настроены переменные для Supabase:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
``` 