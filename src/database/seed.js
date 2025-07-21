import 'dotenv/config';
import { supabase } from '../config/supabase.js';

async function seedCategories() {
  const categories = [
    {
      name: 'Веб-разработка',
      description: 'Создание сайтов, веб-приложений, API',
      price: 50000 // 500 рублей
    },
    {
      name: 'Мобильная разработка',
      description: 'iOS, Android приложения',
      price: 50000
    },
    {
      name: 'Дизайн',
      description: 'UI/UX дизайн, графический дизайн',
      price: 30000 // 300 рублей
    },
    {
      name: 'Копирайтинг',
      description: 'Написание текстов, статей, контента',
      price: 25000 // 250 рублей
    },
    {
      name: 'Маркетинг',
      description: 'SMM, контекстная реклама, SEO',
      price: 40000 // 400 рублей
    },
    {
      name: 'Переводы',
      description: 'Переводы текстов на различные языки',
      price: 20000 // 200 рублей
    }
  ];

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(categories)
      .select();

    if (error) throw error;

    console.log('✅ Categories seeded successfully:', data.length);
    return data;
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedCategories();
    console.log('🌱 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Check if file is run directly (ES modules equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedCategories }; 