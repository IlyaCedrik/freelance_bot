import { supabase } from '../../config/supabase.js';

class Category {
  static async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async findBySlug(slug) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findBySlug(slug) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async create(categoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get categories with their parsing channels
  static async getAllWithChannels() {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        parsing_channels(*)
      `)
      .eq('is_active', true)
      .eq('parsing_channels.is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }
}

export default Category; 