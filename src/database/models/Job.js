import { supabase } from '../../config/supabase.js';

class Job {
  static async create(jobData) {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getLatestByCategory(categoryId, limit = 10) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('category_id', categoryId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getJobsForUser(userId, limit = 10) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        categories(name)
      `)
      .not('id', 'in', `(
        SELECT job_id FROM sent_jobs WHERE user_id = '${userId}'
      )`)
      .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async markAsSent(userId, jobId) {
    const { error } = await supabase
      .from('sent_jobs')
      .insert([{
        user_id: userId,
        job_id: jobId
      }]);

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
  }
}

export default Job; 