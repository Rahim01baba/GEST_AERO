/*
  # Enhance Airports Table
  
  1. Changes
    - Add missing columns to airports table:
      - city (text)
      - country (text, default 'Côte d'Ivoire')
      - elevation_m (numeric)
      - runways (text)
      - stands_count (integer, default 0)
      - description (text)
    - Rename icao → icao_code, iata → iata_code for consistency
    - Update timezone default to 'Africa/Abidjan'
    - Add unique constraint on icao_code
  
  2. Security
    - Enable RLS on airports table
    - Add read policy for all authenticated users
    - Add write policy for ADMIN and DED-C roles only
*/

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'city') THEN
    ALTER TABLE airports ADD COLUMN city text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'country') THEN
    ALTER TABLE airports ADD COLUMN country text DEFAULT 'Côte d''Ivoire';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'elevation_m') THEN
    ALTER TABLE airports ADD COLUMN elevation_m numeric(6,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'runways') THEN
    ALTER TABLE airports ADD COLUMN runways text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'stands_count') THEN
    ALTER TABLE airports ADD COLUMN stands_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'description') THEN
    ALTER TABLE airports ADD COLUMN description text;
  END IF;
END $$;

-- Rename columns for consistency (only if old names exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'icao') THEN
    ALTER TABLE airports RENAME COLUMN icao TO icao_code;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airports' AND column_name = 'iata') THEN
    ALTER TABLE airports RENAME COLUMN iata TO iata_code;
  END IF;
END $$;

-- Update timezone default
ALTER TABLE airports ALTER COLUMN timezone SET DEFAULT 'Africa/Abidjan';

-- Update existing NULL timezones
UPDATE airports SET timezone = 'Africa/Abidjan' WHERE timezone IS NULL OR timezone = 'UTC';

-- Add unique constraint on icao_code if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'airports_icao_code_key'
  ) THEN
    ALTER TABLE airports ADD CONSTRAINT airports_icao_code_key UNIQUE (icao_code);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "airports_read_all" ON airports;
DROP POLICY IF EXISTS "airports_write_admin" ON airports;

-- Read policy: all authenticated users can read
CREATE POLICY "airports_read_all"
  ON airports
  FOR SELECT
  TO authenticated
  USING (true);

-- Write policy: only ADMIN and DED-C can write
CREATE POLICY "airports_write_admin"
  ON airports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'DED-C')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'DED-C')
    )
  );

-- Update stands_count based on actual stands
UPDATE airports 
SET stands_count = (
  SELECT COUNT(*) 
  FROM stands 
  WHERE stands.airport_id = airports.id
)
WHERE stands_count = 0 OR stands_count IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_airports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS airports_updated_at ON airports;

CREATE TRIGGER airports_updated_at
  BEFORE UPDATE ON airports
  FOR EACH ROW
  EXECUTE FUNCTION update_airports_updated_at();
