/*
  # Create aircrafts table

  1. New Tables
    - `aircrafts`
      - `id` (uuid, primary key) - Unique identifier
      - `registration` (text, unique, not null) - Aircraft registration (e.g., F-HBNA)
      - `type` (text, not null) - Aircraft type (e.g., ATR72, A320, C208B)
      - `mtow_kg` (numeric) - Maximum takeoff weight in kg
      - `seats` (integer) - Number of passenger seats
      - `length_m` (numeric) - Aircraft length in meters
      - `wingspan_m` (numeric) - Wingspan in meters
      - `height_m` (numeric) - Height in meters
      - `operator` (text) - Operating airline or company
      - `remarks` (text) - Additional notes or remarks
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `aircrafts` table
    - Add policies:
      - ADMIN, AIM, OPS can read, insert, update, delete
      - ATS can read only
      - All policies require active users
*/

-- Create aircrafts table
CREATE TABLE IF NOT EXISTS public.aircrafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text UNIQUE NOT NULL,
  type text NOT NULL,
  mtow_kg numeric,
  seats integer,
  length_m numeric,
  wingspan_m numeric,
  height_m numeric,
  operator text,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aircrafts ENABLE ROW LEVEL SECURITY;

-- Policy: ADMIN, AIM, OPS can read all aircrafts
CREATE POLICY "aircrafts_read_policy"
ON public.aircrafts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('ADMIN', 'AIM', 'OPS', 'ATS')
    AND users.active = true
  )
);

-- Policy: ADMIN, AIM, OPS can insert aircrafts
CREATE POLICY "aircrafts_insert_policy"
ON public.aircrafts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('ADMIN', 'AIM', 'OPS')
    AND users.active = true
  )
);

-- Policy: ADMIN, AIM, OPS can update aircrafts
CREATE POLICY "aircrafts_update_policy"
ON public.aircrafts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('ADMIN', 'AIM', 'OPS')
    AND users.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('ADMIN', 'AIM', 'OPS')
    AND users.active = true
  )
);

-- Policy: ADMIN can delete aircrafts
CREATE POLICY "aircrafts_delete_policy"
ON public.aircrafts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
    AND users.active = true
  )
);

-- Create index on registration for faster lookups
CREATE INDEX IF NOT EXISTS idx_aircrafts_registration ON public.aircrafts(registration);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_aircrafts_type ON public.aircrafts(type);

-- Create index on operator for filtering
CREATE INDEX IF NOT EXISTS idx_aircrafts_operator ON public.aircrafts(operator);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aircrafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aircrafts_updated_at
  BEFORE UPDATE ON public.aircrafts
  FOR EACH ROW
  EXECUTE FUNCTION update_aircrafts_updated_at();
