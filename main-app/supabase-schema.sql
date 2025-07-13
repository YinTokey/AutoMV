-- Create music_generation_tasks table
CREATE TABLE IF NOT EXISTS music_generation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  audio_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on task_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_music_tasks_task_id ON music_generation_tasks(task_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_music_tasks_status ON music_generation_tasks(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_music_tasks_created_at ON music_generation_tasks(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE music_generation_tasks ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (you can customize this based on your auth needs)
CREATE POLICY "Allow all operations on music_generation_tasks" 
ON music_generation_tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_music_generation_tasks_updated_at
    BEFORE UPDATE ON music_generation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 