#!/usr/bin/env node

import 'dotenv/config';
import ExistingUsersMigration from '../database/migrations/migrateExistingUsers.js';

/**
 * Скрипт для запуска миграции существующих пользователей
 * 
 * Использование:
 * node src/scripts/runMigration.js [команда]
 * 
 * Команды:
 * migrate        - Миграция всех пользователей (по умолчанию)
 * validate       - Проверка результатов миграции
 * rollback       - Откат миграции
 * single <id>    - Миграция конкретного пользователя по telegram_id
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  console.log('🤖 Freelance Bot - Миграция реферальной системы');
  console.log('================================================\n');

  try {
    switch (command) {
      case 'migrate':
        console.log('📋 Запуск полной миграции...');
        await ExistingUsersMigration.migrateAllUsers();
        break;

      case 'validate':
        console.log('🔍 Проверка результатов миграции...');
        await ExistingUsersMigration.validateMigration();
        break;

      case 'rollback':
        console.log('⚠️ Откат миграции...');
        const confirm = await askConfirmation('Вы уверены, что хотите откатить миграцию? (y/N): ');
        if (confirm) {
          await ExistingUsersMigration.rollbackMigration();
        } else {
          console.log('❌ Откат отменен');
        }
        break;

      case 'single':
        const telegramId = args[1];
        if (!telegramId) {
          console.error('❌ Необходимо указать telegram_id пользователя');
          console.error('Пример: node src/scripts/runMigration.js single 123456789');
          process.exit(1);
        }
        console.log(`👤 Миграция пользователя ${telegramId}...`);
        await ExistingUsersMigration.migrateSingleUser(parseInt(telegramId));
        break;

      default:
        console.error('❌ Неизвестная команда:', command);
        console.error('Доступные команды: migrate, validate, rollback, single <telegram_id>');
        process.exit(1);
    }

    console.log('\n✅ Операция завершена успешно!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Функция для подтверждения действий
function askConfirmation(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding('utf8');
    
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n\n⏹️ Операция прервана пользователем');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️ Получен сигнал завершения');
  process.exit(0);
});

// Запуск
main(); 