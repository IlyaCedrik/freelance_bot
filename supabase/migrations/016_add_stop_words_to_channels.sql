-- Add stop_words field to parsing_channels table
-- Stop words are used to filter out unwanted messages

-- Add stop_words column to parsing_channels
ALTER TABLE parsing_channels 
  ADD COLUMN IF NOT EXISTS stop_words TEXT[] NOT NULL DEFAULT '{}';

-- Add comment to explain the purpose
COMMENT ON COLUMN parsing_channels.stop_words IS 'Array of stop words to filter out unwanted messages';

-- Create index for stop_words for better performance if needed
CREATE INDEX IF NOT EXISTS idx_parsing_channels_stop_words ON parsing_channels USING GIN (stop_words);