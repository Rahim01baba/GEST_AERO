/*
  # Add Aircraft Registry and Rotation Support

  ## New Table: aircraft_registry
  - Stores aircraft reference data for auto-fill functionality
  - registration: Unique aircraft registration (e.g., N12345)
  - mtow_kg: Maximum takeoff weight in kilograms
  - airline_code: IATA airline code (e.g., UA, AF)
  - airline_name: Full airline name
  - aircraft_type: Aircraft type code (e.g., B737, A320)

  ## Modifications to aircraft_movements
  - Add rotation_id: Links ARR and DEP movements together
  - Add airline_code and airline_name fields
  - Add origin and destination IATA codes
  - Update MTOW field to be properly indexed

  ## Security
  - Enable RLS on aircraft_registry
  - Allow all authenticated users to read registry data
  - Only ADMIN and AIM can modify registry
*/

-- Create aircraft_registry table
CREATE TABLE IF NOT EXISTS aircraft_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT UNIQUE NOT NULL,
  mtow_kg INTEGER,
  airline_code TEXT,
  airline_name TEXT,
  aircraft_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index on registration for fast lookups
CREATE INDEX IF NOT EXISTS idx_aircraft_registry_registration ON aircraft_registry(registration);

-- Enable RLS on aircraft_registry
ALTER TABLE aircraft_registry ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read
CREATE POLICY "Authenticated users can read aircraft registry"
  ON aircraft_registry FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only ADMIN and AIM can insert
CREATE POLICY "ADMIN and AIM can insert aircraft registry"
  ON aircraft_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'AIM')
    )
  );

-- Policy: Only ADMIN and AIM can update
CREATE POLICY "ADMIN and AIM can update aircraft registry"
  ON aircraft_registry FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'AIM')
    )
  );

-- Policy: Only ADMIN can delete
CREATE POLICY "ADMIN can delete aircraft registry"
  ON aircraft_registry FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Add new fields to aircraft_movements
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS rotation_id UUID;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS airline_code TEXT;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS airline_name TEXT;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS origin_iata TEXT;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS destination_iata TEXT;

-- Add index on rotation_id for linking ARR/DEP
CREATE INDEX IF NOT EXISTS idx_aircraft_movements_rotation_id ON aircraft_movements(rotation_id) WHERE rotation_id IS NOT NULL;

-- Function to lookup aircraft data from registry
CREATE OR REPLACE FUNCTION lookup_aircraft_by_registration(p_registration TEXT)
RETURNS TABLE(
  mtow_kg INTEGER,
  airline_code TEXT,
  airline_name TEXT,
  aircraft_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.mtow_kg,
    ar.airline_code,
    ar.airline_name,
    ar.aircraft_type
  FROM aircraft_registry ar
  WHERE UPPER(ar.registration) = UPPER(p_registration)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate ARR/DEP datetime order
CREATE OR REPLACE FUNCTION validate_arr_dep_order()
RETURNS TRIGGER AS $$
DECLARE
  v_arr_time TIMESTAMPTZ;
  v_dep_time TIMESTAMPTZ;
BEGIN
  -- Only check if rotation_id is set (linked ARR/DEP)
  IF NEW.rotation_id IS NOT NULL THEN
    -- Get the paired movement
    IF NEW.movement_type = 'ARR' THEN
      SELECT scheduled_time INTO v_dep_time
      FROM aircraft_movements
      WHERE rotation_id = NEW.rotation_id
        AND movement_type = 'DEP'
        AND id != NEW.id
      LIMIT 1;
      
      IF v_dep_time IS NOT NULL AND NEW.scheduled_time >= v_dep_time THEN
        RAISE EXCEPTION 'Arrival time must be before departure time';
      END IF;
    ELSIF NEW.movement_type = 'DEP' THEN
      SELECT scheduled_time INTO v_arr_time
      FROM aircraft_movements
      WHERE rotation_id = NEW.rotation_id
        AND movement_type = 'ARR'
        AND id != NEW.id
      LIMIT 1;
      
      IF v_arr_time IS NOT NULL AND NEW.scheduled_time <= v_arr_time THEN
        RAISE EXCEPTION 'Departure time must be after arrival time';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ARR/DEP validation
DROP TRIGGER IF EXISTS trg_validate_arr_dep_order ON aircraft_movements;
CREATE TRIGGER trg_validate_arr_dep_order
  BEFORE INSERT OR UPDATE OF scheduled_time, rotation_id
  ON aircraft_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_arr_dep_order();

-- Add some sample aircraft registry data
INSERT INTO aircraft_registry (registration, mtow_kg, airline_code, airline_name, aircraft_type)
VALUES
  ('N12345', 79015, 'UA', 'United Airlines', 'B737'),
  ('F-HBNA', 73500, 'AF', 'Air France', 'A320'),
  ('G-EUUU', 77800, 'BA', 'British Airways', 'A320'),
  ('D-AIZZ', 79000, 'LH', 'Lufthansa', 'A320')
ON CONFLICT (registration) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE aircraft_registry IS 'Reference data for aircraft registrations with auto-fill information';
COMMENT ON COLUMN aircraft_movements.rotation_id IS 'Links ARR and DEP movements for the same aircraft rotation';
COMMENT ON COLUMN aircraft_movements.airline_code IS 'IATA airline code (e.g., UA, AF)';
COMMENT ON COLUMN aircraft_movements.airline_name IS 'Full airline name';
COMMENT ON COLUMN aircraft_movements.origin_iata IS 'Origin airport IATA code for arrivals';
COMMENT ON COLUMN aircraft_movements.destination_iata IS 'Destination airport IATA code for departures';
