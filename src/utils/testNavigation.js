import 'dotenv/config';
import navigation from '../bot/utils/navigation.js';

/**
 * Тестирует навигационную систему
 */

function testNavigationSetup() {
  console.log('🧭 Тестирование навигационной системы...\n');

  // Список всех action'ов которые должны быть зарегистрированы
  const expectedActions = [
    // Основные экраны
    'main_menu',
    'back_to_main', 
    'categories',
    'my_subscriptions',
    'settings',
    
    // Дополнительные экраны
    'show_subscriptions',
    'show_privacy',
    'export_data',
    'delete_account_confirm',
    'delete_account_final'
  ];

  console.log('📋 Ожидаемые action\'ы:');
  expectedActions.forEach(action => {
    console.log(`  • ${action}`);
  });

  console.log(`\n📊 Всего ожидается: ${expectedActions.length} action'ов`);

  // Получаем зарегистрированные routes
  const registeredRoutes = navigation.getRoutes();
  console.log(`\n✅ Зарегистрировано: ${registeredRoutes.length} routes`);

  // Проверяем какие action'ы отсутствуют
  const missingActions = expectedActions.filter(action => !registeredRoutes.includes(action));
  
  if (missingActions.length > 0) {
    console.log('\n❌ Отсутствующие action\'ы:');
    missingActions.forEach(action => {
      console.log(`  • ${action}`);
    });
  }

  // Проверяем лишние action'ы
  const extraActions = registeredRoutes.filter(action => !expectedActions.includes(action));
  
  if (extraActions.length > 0) {
    console.log('\n⚠️ Лишние action\'ы:');
    extraActions.forEach(action => {
      console.log(`  • ${action}`);
    });
  }

  // Результат
  if (missingActions.length === 0 && extraActions.length === 0) {
    console.log('\n✅ Все action\'ы правильно зарегистрированы!');
    return true;
  } else {
    console.log('\n❌ Найдены проблемы с регистрацией action\'ов');
    return false;
  }
}

/**
 * Показывает карту навигации
 */
function showNavigationMap() {
  console.log('\n🗺️ Карта навигации:\n');

  const navigationFlow = {
    'Главное меню (/start)': {
      actions: ['categories', 'my_subscriptions', 'settings'],
      description: 'Основные разделы бота'
    },
    'Категории': {
      actions: ['main_menu', 'subscribe_X', 'unsubscribe_X'],
      description: 'Просмотр и управление категориями'
    },
    'Мои подписки': {
      actions: ['main_menu', 'cancel_subscription_X'],
      description: 'Управление активными подписками'
    },
    'Настройки': {
      actions: ['back_to_main', 'show_subscriptions', 'show_privacy', 'export_data', 'delete_account_confirm'],
      description: 'Настройки аккаунта и приватности'
    },
    'Подтверждение удаления': {
      actions: ['delete_account_final', 'settings'],
      description: 'Подтверждение удаления аккаунта'
    }
  };

  Object.entries(navigationFlow).forEach(([screen, info]) => {
    console.log(`📱 ${screen}:`);
    console.log(`   ${info.description}`);
    console.log(`   Actions: ${info.actions.join(', ')}`);
    console.log('');
  });
}

/**
 * Проверяет callback queries которые могут быть не обработаны
 */
function checkPotentialIssues() {
  console.log('🔍 Проверка потенциальных проблем:\n');

  const commonIssues = [
    {
      issue: 'Callback queries не отвечают',
      solution: 'Убедитесь что все action\'ы зарегистрированы в navigation'
    },
    {
      issue: 'Кнопки "Назад" не работают',
      solution: 'Проверьте что action совпадает с зарегистрированным именем'
    },
    {
      issue: 'Сообщения дублируются',
      solution: 'Убрать ctx.answerCbQuery() из обработчиков - это делает navigation'
    },
    {
      issue: 'Ошибка "message to edit not found"',
      solution: 'messageManager должен правильно обрабатывать fallback'
    }
  ];

  commonIssues.forEach((item, index) => {
    console.log(`${index + 1}. ❗ ${item.issue}`);
    console.log(`   💡 ${item.solution}\n`);
  });
}

/**
 * Создает тестовые данные для проверки callback queries
 */
function generateTestCallbacks() {
  console.log('🧪 Тестовые callback queries для проверки:\n');

  const testCallbacks = [
    'main_menu',
    'categories', 
    'my_subscriptions',
    'settings',
    'back_to_main',
    'show_privacy',
    'export_data',
    'subscribe_1',
    'cancel_subscription_1',
    'pay_1',
    'unknown_action' // для тестирования обработки неизвестных action'ов
  ];

  testCallbacks.forEach(callback => {
    const registered = navigation.getRoutes().includes(callback);
    const status = registered ? '✅' : (callback === 'unknown_action' ? '🧪' : '❌');
    console.log(`${status} ${callback} ${registered ? '(зарегистрирован)' : '(не зарегистрирован)'}`);
  });

  console.log('\n💡 Тестируйте эти callback\'ы в боте для проверки навигации');
}

async function main() {
  try {
    console.log('🧭 ДИАГНОСТИКА НАВИГАЦИОННОЙ СИСТЕМЫ\n');
    console.log('='.repeat(50));
    
    const setupOk = testNavigationSetup();
    
    showNavigationMap();
    
    if (!setupOk) {
      checkPotentialIssues();
    }
    
    generateTestCallbacks();
    
    console.log('\n='.repeat(50));
    console.log(setupOk ? '✅ Навигация настроена корректно' : '❌ Найдены проблемы с навигацией');
    
    process.exit(setupOk ? 0 : 1);
  } catch (error) {
    console.error('❌ Ошибка при тестировании навигации:', error);
    process.exit(1);
  }
}

// Запускаем тест если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testNavigationSetup }; 