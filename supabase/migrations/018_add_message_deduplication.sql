-- Add message deduplication system to prevent duplicate messages from different channels

-- Create table for tracking parsed messages to avoid duplicates
CREATE TABLE IF NOT EXISTS parsed_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of normalized message content
  original_text TEXT NOT NULL, -- Original message text for reference
  source_channel VARCHAR(255) NOT NULL, -- Channel where message was first seen
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seen_count INTEGER DEFAULT 1, -- How many times this message was encountered
  
  -- Metadata about the message
  category_id VARCHAR(50),
  sent_to_users INTEGER DEFAULT 0 -- How many users received this message
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_parsed_messages_hash ON parsed_messages(message_hash);
CREATE INDEX IF NOT EXISTS idx_parsed_messages_source ON parsed_messages(source_channel);
CREATE INDEX IF NOT EXISTS idx_parsed_messages_first_seen ON parsed_messages(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_parsed_messages_category ON parsed_messages(category_id);

-- Create function to clean old messages (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_parsed_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM parsed_messages 
  WHERE first_seen_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) if needed
ALTER TABLE parsed_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for service role
CREATE POLICY "Allow all operations for service role" ON parsed_messages
FOR ALL USING (true);

-- Add comment for documentation
COMMENT ON TABLE parsed_messages IS 'Stores hashes of parsed messages to prevent sending duplicates from different channels';
COMMENT ON COLUMN parsed_messages.message_hash IS 'SHA-256 hash of normalized message text (lowercase, trimmed, special chars removed)';
COMMENT ON COLUMN parsed_messages.seen_count IS 'Number of times this message was encountered across different channels';
COMMENT ON FUNCTION cleanup_old_parsed_messages() IS 'Removes parsed message records older than 7 days to prevent table growth';