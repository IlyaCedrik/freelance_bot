import { supabase } from '../../config/supabase.js';

class ParsingChannel {
  static async getAll() {
    const { data, error } = await supabase
      .from('parsing_channels')
      .select(`
        *,
        categories(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getByCategory(categoryId) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .select(`
        *,
        categories(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getByCategorySlug(categorySlug) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .select(`
        *,
        categories(*)
      `)
      .eq('categories.slug', categorySlug)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .select(`
        *,
        categories(*)
      `)
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .select(`
        *,
        categories(*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async create(channelData) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .insert([channelData])
      .select(`
        *,
        categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLastParsed(id) {
    const { error } = await supabase
      .from('parsing_channels')
      .update({ 
        last_parsed_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async deactivate(id) {
    const { error } = await supabase
      .from('parsing_channels')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('parsing_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get channels grouped by category
  static async getGroupedByCategory() {
    const channels = await this.getAll();
    const grouped = {};

    for (const channel of channels) {
      const categorySlug = channel.categories.slug;
      if (!grouped[categorySlug]) {
        grouped[categorySlug] = {
          category: channel.categories,
          channels: []
        };
      }
      grouped[categorySlug].channels.push(channel);
    }

    return grouped;
  }

  /**
   * Обновляет стоп-слова для канала
   * @param {string} id - ID канала
   * @param {Array<string>} stopWords - Массив стоп-слов
   * @returns {Promise<Object>} Обновленный канал
   */
  static async updateStopWords(id, stopWords) {
    const { data, error } = await supabase
      .from('parsing_channels')
      .update({ stop_words: stopWords || [] })
      .eq('id', id)
      .select(`
        *,
        categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }
}

export default ParsingChannel; 