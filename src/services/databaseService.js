import { supabase, supabaseAdmin } from '../config/supabase.js';
import Category from '../database/models/Category.js';
import ParsingChannel from '../database/models/ParsingChannel.js';

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