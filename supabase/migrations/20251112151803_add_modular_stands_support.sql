/*
  # Add Modular Stands Support

  ## Changes
  - Add modular stand fields to stands table
  - Add capacity fields (wingspan, ARC letter)
  - Add group management fields (group_key, is_group_parent, group_priority)
  - Create function to check stand availability with group conflicts
  - Add trigger to prevent conflicting stand assignments

  ## New Fields
  - wingspan_max_m: Maximum wingspan in meters
  - arc_letter_max: Maximum ARC letter (A, B, C, D, E, F)
  - group_key: Group identifier for related stands (e.g., "G1" for 1/1A/1B)
  - is_group_parent: True for parent stand (e.g., "1"), false for children (1A, 1B)
  - group_priority: 1 for parent, 2 for children

  ## Group Rules
  - If parent is occupied, all children are blocked
  - If any child is occupied, parent is blocked
  - Conflicts are detected based on time overlap
*/

-- Add new fields to stands table
ALTER TABLE stands ADD COLUMN IF NOT EXISTS wingspan_max_m NUMERIC(5,2);
ALTER TABLE stands ADD COLUMN IF NOT EXISTS arc_letter_max TEXT CHECK (arc_letter_max IN ('A', 'B', 'C', 'D', 'E', 'F'));
ALTER TABLE stands ADD COLUMN IF NOT EXISTS group_key TEXT;
ALTER TABLE stands ADD COLUMN IF NOT EXISTS is_group_parent BOOLEAN DEFAULT false;
ALTER TABLE stands ADD COLUMN IF NOT EXISTS group_priority INTEGER DEFAULT 2 CHECK (group_priority IN (1, 2));

-- Add index for group queries
CREATE INDEX IF NOT EXISTS idx_stands_group_key ON stands(group_key) WHERE group_key IS NOT NULL;

-- Add MTOW field to aircraft_movements if not exists
ALTER TABLE aircraft_movements ADD COLUMN IF NOT EXISTS mtow_kg INTEGER;

-- Create function to check if a stand is available (considering group conflicts)
CREATE OR REPLACE FUNCTION check_stand_availability(
  p_stand_id UUID,
  p_arr_time TIMESTAMPTZ,
  p_dep_time TIMESTAMPTZ,
  p_movement_id UUID DEFAULT NULL
)
RETURNS TABLE(
  available BOOLEAN,
  conflict_reason TEXT
) AS $$
DECLARE
  v_group_key TEXT;
  v_is_parent BOOLEAN;
  v_direct_conflict INTEGER;
  v_group_conflict INTEGER;
BEGIN
  -- Get stand group info
  SELECT group_key, is_group_parent
  INTO v_group_key, v_is_parent
  FROM stands
  WHERE id = p_stand_id;

  -- Check direct conflict on same stand
  SELECT COUNT(*)
  INTO v_direct_conflict
  FROM aircraft_movements m
  WHERE m.stand_id = p_stand_id
    AND (p_movement_id IS NULL OR m.id != p_movement_id)
    AND m.scheduled_time < p_dep_time
    AND COALESCE(m.actual_time, m.scheduled_time + INTERVAL '2 hours') > p_arr_time;

  IF v_direct_conflict > 0 THEN
    RETURN QUERY SELECT false, 'Direct time conflict on same stand';
    RETURN;
  END IF;

  -- Check group conflicts if stand is part of a group
  IF v_group_key IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_group_conflict
    FROM aircraft_movements m
    JOIN stands s ON s.id = m.stand_id
    WHERE s.group_key = v_group_key
      AND s.id != p_stand_id
      AND (p_movement_id IS NULL OR m.id != p_movement_id)
      AND (
        (v_is_parent = TRUE AND s.is_group_parent = FALSE) OR
        (v_is_parent = FALSE AND s.is_group_parent = TRUE)
      )
      AND m.scheduled_time < p_dep_time
      AND COALESCE(m.actual_time, m.scheduled_time + INTERVAL '2 hours') > p_arr_time;

    IF v_group_conflict > 0 THEN
      IF v_is_parent THEN
        RETURN QUERY SELECT false, 'Child stands in group are occupied';
      ELSE
        RETURN QUERY SELECT false, 'Parent stand in group is occupied';
      END IF;
      RETURN;
    END IF;
  END IF;

  -- No conflicts found
  RETURN QUERY SELECT true, 'Available'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to validate stand assignments
CREATE OR REPLACE FUNCTION validate_stand_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_availability RECORD;
  v_dep_time TIMESTAMPTZ;
BEGIN
  -- Skip if no stand assigned
  IF NEW.stand_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate departure time (actual if exists, else scheduled + 2 hours)
  v_dep_time := COALESCE(NEW.actual_time, NEW.scheduled_time + INTERVAL '2 hours');

  -- Check availability
  SELECT *
  INTO v_availability
  FROM check_stand_availability(
    NEW.stand_id,
    NEW.scheduled_time,
    v_dep_time,
    NEW.id
  );

  -- Raise error if not available
  IF NOT v_availability.available THEN
    RAISE EXCEPTION 'Stand assignment conflict: %', v_availability.conflict_reason;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_validate_stand_assignment ON aircraft_movements;
CREATE TRIGGER trg_validate_stand_assignment
  BEFORE INSERT OR UPDATE OF stand_id, scheduled_time, actual_time
  ON aircraft_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_stand_assignment();

-- Add comments for documentation
COMMENT ON COLUMN stands.group_key IS 'Group identifier for modular stands (e.g., G1 for stands 1, 1A, 1B)';
COMMENT ON COLUMN stands.is_group_parent IS 'True if this is a parent stand that blocks children when occupied';
COMMENT ON COLUMN stands.group_priority IS '1 for parent stands, 2 for child stands';
COMMENT ON COLUMN stands.wingspan_max_m IS 'Maximum aircraft wingspan in meters';
COMMENT ON COLUMN stands.arc_letter_max IS 'Maximum Aerodrome Reference Code letter (A-F)';
