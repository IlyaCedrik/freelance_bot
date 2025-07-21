import axios from 'axios';
import * as cheerio from 'cheerio';
import Job from '../database/models/Job.js';
import Category from '../database/models/Category.js';

class JobParser {
  constructor() {
    this.sources = {
      'freelance.ru': this.parseFreelanceRu,
      'fl.ru': this.parseFlRu,
      'upwork': this.parseUpwork
    };
  }

  async parseAll() {
    try {
      console.log('🔄 Starting job parsing from all sources...');
      
      const results = await Promise.allSettled([
        this.parseFreelanceRu(),
        this.parseFlRu(),
        this.parseUpwork()
      ]);

      let totalJobs = 0;
      results.forEach((result, index) => {
        const sourceName = Object.keys(this.sources)[index];
        if (result.status === 'fulfilled') {
          totalJobs += result.value;
          console.log(`✅ ${sourceName}: ${result.value} jobs parsed`);
        } else {
          console.error(`❌ ${sourceName}: ${result.reason}`);
        }
      });

      console.log(`📊 Total jobs parsed: ${totalJobs}`);
      return totalJobs;
    } catch (error) {
      console.error('Job parsing error:', error);
      throw error;
    }
  }

  async parseFreelanceRu() {
    try {
      // This is a placeholder implementation
      // In real project, you would implement actual API calls or web scraping
      
      const categories = await Category.getAll();
      const jobs = [];

      // Example: Mock jobs for demonstration
      for (const category of categories.slice(0, 2)) {
        const mockJobs = [
          {
            external_id: `fl_${Date.now()}_${Math.random()}`,
            title: `Требуется разработка в категории ${category.name}`,
            description: `Подробное описание проекта по ${category.name.toLowerCase()}`,
            category_id: category.id,
            budget_min: 10000,
            budget_max: 50000,
            currency: 'RUB',
            url: `https://freelance.ru/project/example-${Date.now()}`,
            source: 'freelance.ru',
            published_at: new Date().toISOString()
          }
        ];

        for (const jobData of mockJobs) {
          try {
            await Job.create(jobData);
            jobs.push(jobData);
          } catch (error) {
            if (error.code !== '23505') { // Ignore duplicate key errors
              throw error;
            }
          }
        }
      }

      return jobs.length;
    } catch (error) {
      console.error('Freelance.ru parsing error:', error);
      return 0;
    }
  }

  async parseFlRu() {
    try {
      // Placeholder for FL.ru parsing
      // Implementation would be similar to parseFreelanceRu()
      
      const categories = await Category.getAll();
      const jobs = [];

      for (const category of categories.slice(0, 1)) {
        const mockJob = {
          external_id: `flru_${Date.now()}_${Math.random()}`,
          title: `FL.ru: Проект по ${category.name}`,
          description: `Описание проекта с FL.ru`,
          category_id: category.id,
          budget_min: 5000,
          budget_max: 30000,
          currency: 'RUB',
          url: `https://fl.ru/projects/example-${Date.now()}`,
          source: 'fl.ru',
          published_at: new Date().toISOString()
        };

        try {
          await Job.create(mockJob);
          jobs.push(mockJob);
        } catch (error) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }

      return jobs.length;
    } catch (error) {
      console.error('FL.ru parsing error:', error);
      return 0;
    }
  }

  async parseUpwork() {
    try {
      // Placeholder for Upwork RSS parsing
      // In real implementation, you would parse RSS feeds
      
      const categories = await Category.getAll();
      const jobs = [];

      // Find web development category for Upwork jobs
      const webDevCategory = categories.find(cat => 
        cat.name.toLowerCase().includes('веб') || 
        cat.name.toLowerCase().includes('разработ')
      );

      if (webDevCategory) {
        const mockJob = {
          external_id: `upwork_${Date.now()}_${Math.random()}`,
          title: `Upwork: Web Development Project`,
          description: `English project description from Upwork`,
          category_id: webDevCategory.id,
          budget_min: 50000,
          budget_max: 200000,
          currency: 'RUB',
          url: `https://upwork.com/jobs/example-${Date.now()}`,
          source: 'upwork',
          published_at: new Date().toISOString()
        };

        try {
          await Job.create(mockJob);
          jobs.push(mockJob);
        } catch (error) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }

      return jobs.length;
    } catch (error) {
      console.error('Upwork parsing error:', error);
      return 0;
    }
  }

  // Helper method for HTTP requests with retry logic
  async makeRequest(url, options = {}) {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await axios({
          url,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          ...options
        });
        return response;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  // Helper method to clean and validate job data
  validateJobData(jobData) {
    return {
      ...jobData,
      title: this.cleanText(jobData.title),
      description: this.cleanText(jobData.description),
      budget_min: parseInt(jobData.budget_min) || null,
      budget_max: parseInt(jobData.budget_max) || null
    };
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sа-яёА-ЯЁ.,!?():-]/g, '')
      .trim()
      .substring(0, 500); // Limit length
  }
}

export default new JobParser(); 