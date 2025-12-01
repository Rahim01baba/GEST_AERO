/*
  # Add PAX and Traffic Fields to Aircraft Movements

  ## New Columns Added to aircraft_movements
  
  ### Flight Numbers
  - flight_no_arr: Flight number for arrival (nullable)
  - flight_no_dep: Flight number for departure (nullable)
  
  ### PAX Counters
  - pax_arr_full: Full-fare passengers on arrival (default 0)
  - pax_arr_half: Half-fare passengers on arrival (default 0)
  - pax_dep_full: Full-fare passengers on departure (default 0)
  - pax_dep_half: Half-fare passengers on departure (default 0)
  - pax_transit: Transit passengers (default 0)
  
  ### Traffic Data (in kg)
  - mail_arr_kg: Mail weight on arrival (default 0)
  - mail_dep_kg: Mail weight on departure (default 0)
  - freight_arr_kg: Freight weight on arrival (default 0)
  - freight_dep_kg: Freight weight on departure (default 0)
  
  ## Constraints
  - All PAX and traffic values must be >= 0
  - Check constraints enforce non-negative values
*/

-- Add flight number columns
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS flight_no_arr TEXT;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS flight_no_dep TEXT;

-- Add PAX counter columns
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS pax_arr_full INTEGER DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS pax_arr_half INTEGER DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS pax_dep_full INTEGER DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS pax_dep_half INTEGER DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS pax_transit INTEGER DEFAULT 0;

-- Add traffic data columns (weights in kg)
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS mail_arr_kg NUMERIC(10,2) DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS mail_dep_kg NUMERIC(10,2) DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS freight_arr_kg NUMERIC(10,2) DEFAULT 0;
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS freight_dep_kg NUMERIC(10,2) DEFAULT 0;

-- Add check constraints for non-negative values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pax_arr_full_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_pax_arr_full_positive CHECK (pax_arr_full >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pax_arr_half_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_pax_arr_half_positive CHECK (pax_arr_half >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pax_dep_full_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_pax_dep_full_positive CHECK (pax_dep_full >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pax_dep_half_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_pax_dep_half_positive CHECK (pax_dep_half >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pax_transit_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_pax_transit_positive CHECK (pax_transit >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mail_arr_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_mail_arr_positive CHECK (mail_arr_kg >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mail_dep_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_mail_dep_positive CHECK (mail_dep_kg >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_freight_arr_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_freight_arr_positive CHECK (freight_arr_kg >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_freight_dep_positive'
  ) THEN
    ALTER TABLE aircraft_movements ADD CONSTRAINT chk_freight_dep_positive CHECK (freight_dep_kg >= 0);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN aircraft_movements.flight_no_arr IS 'Flight number for arrival movement';
COMMENT ON COLUMN aircraft_movements.flight_no_dep IS 'Flight number for departure movement';
COMMENT ON COLUMN aircraft_movements.pax_arr_full IS 'Full-fare passengers on arrival';
COMMENT ON COLUMN aircraft_movements.pax_arr_half IS 'Half-fare passengers (children) on arrival';
COMMENT ON COLUMN aircraft_movements.pax_dep_full IS 'Full-fare passengers on departure';
COMMENT ON COLUMN aircraft_movements.pax_dep_half IS 'Half-fare passengers (children) on departure';
COMMENT ON COLUMN aircraft_movements.pax_transit IS 'Transit passengers not disembarking';
COMMENT ON COLUMN aircraft_movements.mail_arr_kg IS 'Mail weight in kg on arrival';
COMMENT ON COLUMN aircraft_movements.mail_dep_kg IS 'Mail weight in kg on departure';
COMMENT ON COLUMN aircraft_movements.freight_arr_kg IS 'Freight weight in kg on arrival';
COMMENT ON COLUMN aircraft_movements.freight_dep_kg IS 'Freight weight in kg on departure';
