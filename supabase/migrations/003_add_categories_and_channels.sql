-- Add slug to categories and create channels table
-- Channels will be managed from database instead of config

-- Add slug column to categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE;

-- Update existing categories with slugs
UPDATE categories SET slug = 'web-development' WHERE name = 'Веб-разработка';
UPDATE categories SET slug = 'mobile-development' WHERE name = 'Мобильная разработка';
UPDATE categories SET slug = 'design' WHERE name = 'Дизайн';
UPDATE categories SET slug = 'copywriting' WHERE name = 'Копирайтинг';
UPDATE categories SET slug = 'marketing' WHERE name = 'Маркетинг';
UPDATE categories SET slug = 'translation' WHERE name = 'Переводы';

-- Make slug NOT NULL after setting values
ALTER TABLE categories 
  ALTER COLUMN slug SET NOT NULL;

-- Create parsing channels table
CREATE TABLE parsing_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE, -- @channel_username without @
  keywords TEXT[] NOT NULL DEFAULT '{}', -- Array of keywords to search for
  is_active BOOLEAN DEFAULT true,
  last_parsed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for channels
CREATE INDEX idx_parsing_channels_category_id ON parsing_channels(category_id);
CREATE INDEX idx_parsing_channels_username ON parsing_channels(username);
CREATE INDEX idx_parsing_channels_is_active ON parsing_channels(is_active);

-- Add update trigger for parsing_channels
CREATE TRIGGER update_parsing_channels_updated_at 
  BEFORE UPDATE ON parsing_channels 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert basic categories with slugs
INSERT INTO categories (name, description, price, slug, is_active) VALUES 
('Веб-разработка', 'Создание сайтов, веб-приложений, фронтенд и бэкенд разработка', 500, 'web-development', true),
('Мобильная разработка', 'Разработка мобильных приложений для iOS и Android', 500, 'mobile-development', true),
('Дизайн', 'Графический дизайн, UI/UX дизайн, брендинг', 500, 'design', true)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  slug = EXCLUDED.slug;

-- Insert example parsing channels (you can modify these)
INSERT INTO parsing_channels (category_id, name, username, keywords) VALUES 
(
  (SELECT id FROM categories WHERE slug = 'web-development'), 
  'Freelance Web Dev', 
  'freelancewebdev', 
  ARRAY['сайт', 'веб', 'website', 'web', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'php', 'python', 'nodejs']
),
(
  (SELECT id FROM categories WHERE slug = 'mobile-development'), 
  'Mobile Dev Jobs', 
  'mobiledevjobs', 
  ARRAY['мобильное', 'приложение', 'app', 'android', 'ios', 'react native', 'flutter', 'swift', 'kotlin']
),
(
  (SELECT id FROM categories WHERE slug = 'design'), 
  'Design Jobs', 
  'designjobs', 
  ARRAY['дизайн', 'design', 'logo', 'логотип', 'баннер', 'макет', 'figma', 'photoshop', 'ui', 'ux']
)
ON CONFLICT (username) DO NOTHING; 