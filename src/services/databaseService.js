import { supabase, supabaseAdmin } from '../config/supabase.js';
import Category from '../database/models/Category.js';
import ParsingChannel from '../database/models/ParsingChannel.js';
import crypto from 'crypto';

class DatabaseService {
  constructor() {
    this.db = supabase;
    this.adminDb = supabaseAdmin;
  }

  // Методы для работы с категориями
  async getCategories() {
    try {
      return await Category.getAll();
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getCategoryById(id) {
    try {
      return await Category.findById(id);
    } catch (error) {
      console.error('Error getting category by id:', error);
      return null;
    }
  }

  async getCategoryBySlug(slug) {
    try {
      return await Category.findBySlug(slug);
    } catch (error) {
      console.error('Error getting category by slug:', error);
      return null;
    }
  }

  // Методы для работы с каналами парсинга
  async getParsingChannels() {
    try {
      return await ParsingChannel.getAll();
    } catch (error) {
      console.error('Error getting parsing channels:', error);
      return [];
    }
  }

  async getChannelsByCategory(categoryId) {
    try {
      return await ParsingChannel.getByCategory(categoryId);
    } catch (error) {
      console.error('Error getting channels by category:', error);
      return [];
    }
  }

  async getChannelsGroupedByCategory() {
    try {
      return await ParsingChannel.getGroupedByCategory();
    } catch (error) {
      console.error('Error getting channels grouped by category:', error);
      return {};
    }
  }

  async updateChannelLastParsed(channelId) {
    try {
      return await ParsingChannel.updateLastParsed(channelId);
    } catch (error) {
      console.error('Error updating channel last parsed:', error);
    }
  }

  // Методы для дедупликации сообщений
  
  /**
   * Создает хеш для сообщения на основе нормализованного текста
   * @param {string} messageText - Текст сообщения
   * @returns {string} SHA-256 хеш
   */
  createMessageHash(messageText) {
    // Нормализация текста: убираем лишние пробелы, переводим в нижний регистр
    const normalized = messageText
      .toLowerCase()
      .replace(/\s+/g, ' ') // множественные пробелы заменяем одним
      .replace(/[^\w\s\u0400-\u04FF]/g, '') // убираем спецсимволы, оставляем кириллицу и латиницу
      .trim();
    
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Проверяет, было ли сообщение уже обработано
   * @param {string} messageText - Текст сообщения
   * @returns {Promise<boolean>} true если сообщение уже обработано
   */
  async isMessageAlreadyProcessed(messageText) {
    try {
      const messageHash = this.createMessageHash(messageText);
      
      const { data, error } = await this.db
        .from('parsed_messages')
        .select('id, seen_count')
        .eq('message_hash', messageHash)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking message duplication:', error);
        return false; // В случае ошибки пропускаем проверку
      }

      if (data) {
        // Обновляем счетчик просмотров и время последнего обнаружения
        await this.updateMessageSeenCount(messageHash);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in isMessageAlreadyProcessed:', error);
      return false; // В случае ошибки не блокируем сообщение
    }
  }

  /**
   * Записывает сообщение как обработанное
   * @param {string} messageText - Текст сообщения
   * @param {string} sourceChannel - Источник канала
   * @param {string} categoryId - ID категории
   * @param {number} sentToUsers - Количество пользователей, которым отправлено
   * @returns {Promise<boolean>} Успешность записи
   */
  async markMessageAsProcessed(messageText, sourceChannel, categoryId = null, sentToUsers = 0) {
    try {
      const messageHash = this.createMessageHash(messageText);
      
      const { error } = await this.db
        .from('parsed_messages')
        .insert({
          message_hash: messageHash,
          original_text: messageText.substring(0, 1000), // Ограничиваем длину для экономии места
          source_channel: sourceChannel,
          category_id: categoryId,
          sent_to_users: sentToUsers
        });

      if (error) {
        // Если сообщение уже существует (дубль хеша), обновляем статистику
        if (error.code === '23505') { // unique violation
          await this.updateMessageSeenCount(messageHash);
          return true;
        }
        
        console.error('Error marking message as processed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markMessageAsProcessed:', error);
      return false;
    }
  }

  /**
   * Обновляет счетчик просмотров сообщения
   * @param {string} messageHash - Хеш сообщения
   * @returns {Promise<void>}
   * @private
   */
  async updateMessageSeenCount(messageHash) {
    try {
      await this.db
        .from('parsed_messages')
        .update({
          seen_count: this.db.raw('seen_count + 1'),
          last_seen_at: new Date().toISOString()
        })
        .eq('message_hash', messageHash);
    } catch (error) {
      console.error('Error updating message seen count:', error);
    }
  }

  /**
   * Очищает старые записи о сообщениях (старше 7 дней)
   * @returns {Promise<number>} Количество удаленных записей
   */
  async cleanupOldMessages() {
    try {
      const { data, error } = await this.db
        .rpc('cleanup_old_parsed_messages');

      if (error) {
        console.error('Error cleaning up old messages:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in cleanupOldMessages:', error);
      return 0;
    }
  }

  /**
   * Получает статистику дедупликации
   * @returns {Promise<Object>} Статистика
   */
  async getDeduplicationStats() {
    try {
      const { data, error } = await this.db
        .from('parsed_messages')
        .select('seen_count, source_channel, category_id')
        .gte('first_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // последние 24 часа

      if (error) {
        console.error('Error getting deduplication stats:', error);
        return {
          total_messages: 0,
          duplicate_messages: 0,
          channels: {},
          categories: {}
        };
      }

      const stats = {
        total_messages: data.length,
        duplicate_messages: data.filter(msg => msg.seen_count > 1).length,
        channels: {},
        categories: {}
      };

      // Группируем по каналам и категориям
      data.forEach(msg => {
        stats.channels[msg.source_channel] = (stats.channels[msg.source_channel] || 0) + 1;
        if (msg.category_id) {
          stats.categories[msg.category_id] = (stats.categories[msg.category_id] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getDeduplicationStats:', error);
      return {
        total_messages: 0,
        duplicate_messages: 0,
        channels: {},
        categories: {}
      };
    }
  }

  // Проверка подключения к базе данных
  async testConnection() {
    try {
      const { data, error } = await this.db
        .from('categories')
        .select('count(*)')
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default new DatabaseService(); 