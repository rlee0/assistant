-- Create checkpoints table for conversation history management
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id, id)
);

-- Index for querying checkpoints by chat_id
CREATE INDEX IF NOT EXISTS idx_checkpoints_chat_id ON checkpoints(chat_id);

-- Index for sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp DESC);
