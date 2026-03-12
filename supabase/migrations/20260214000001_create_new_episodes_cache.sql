-- Create cache table for pre-computed new episodes
CREATE TABLE IF NOT EXISTS new_episodes_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  episodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_new_episodes_cache_updated 
ON new_episodes_cache(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE new_episodes_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own cached episodes
CREATE POLICY "Users can read own episode cache"
ON new_episodes_cache
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert/update (for background job)
CREATE POLICY "Service role can manage cache"
ON new_episodes_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE new_episodes_cache IS 
'Caches pre-computed new episodes for users. Updated daily by background job.';
