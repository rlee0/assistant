-- Fix the update_chat_modified_at trigger function
-- It should update the parent chat record, not the message record

DROP TRIGGER IF EXISTS update_chat_modified_on_message_insert ON messages;
DROP FUNCTION IF EXISTS update_chat_modified_at();

-- Create correct function that updates the chat table
CREATE OR REPLACE FUNCTION update_chat_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET updated_at = NOW() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_chat_modified_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_modified_at();
