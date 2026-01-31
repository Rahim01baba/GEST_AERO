/*
  # Create User Preferences Table

  1. New Table
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users, unique)
      - `movements_column_order` (jsonb): Array of column IDs for drag & drop order
      - `filter_start_date` (text): Last selected start date filter
      - `filter_end_date` (text): Last selected end date filter
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_preferences` table
    - Users can only view and manage their own preferences

  3. Indexes
    - Index on user_id for fast lookups
    - Unique constraint on user_id
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movements_column_order jsonb DEFAULT '[]'::jsonb,
  filter_start_date text,
  filter_end_date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_preferences_user_id'
  ) THEN
    ALTER TABLE user_preferences
    ADD CONSTRAINT unique_user_preferences_user_id UNIQUE (user_id);
  END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

-- Users can manage their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE user_preferences IS 'User-specific preferences for UI state and filters';
COMMENT ON COLUMN user_preferences.movements_column_order IS 'Array of column IDs defining the order for the movements table';
COMMENT ON COLUMN user_preferences.filter_start_date IS 'Last selected start date filter (stored as ISO date string)';
COMMENT ON COLUMN user_preferences.filter_end_date IS 'Last selected end date filter (stored as ISO date string)';
