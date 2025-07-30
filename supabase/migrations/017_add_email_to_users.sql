-- Add email field to users table
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Create index for email
CREATE INDEX idx_users_email ON users(email);