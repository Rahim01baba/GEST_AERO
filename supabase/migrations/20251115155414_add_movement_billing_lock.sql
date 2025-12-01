/*
  # Add Billing Lock for Aircraft Movements
  
  1. Add is_locked field to aircraft_movements
  2. Create function to check if movement is billed
  3. Update RLS policies to prevent editing locked movements
  
  Movements become locked once they are included in an invoice.
  Only ADMIN can edit locked movements.
*/

-- Add is_locked field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aircraft_movements' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE aircraft_movements ADD COLUMN is_locked boolean DEFAULT false;
  END IF;
END $$;

-- Create function to check if movement is in an invoice
CREATE OR REPLACE FUNCTION check_movement_billed(movement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM invoices
    WHERE (movement_arr_id = movement_id OR movement_dep_id = movement_id)
    AND status != 'CANCELLED'
  );
END;
$$;

-- Create trigger to auto-lock movements when added to invoice
CREATE OR REPLACE FUNCTION lock_movement_on_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status != 'CANCELLED' THEN
    IF NEW.movement_arr_id IS NOT NULL THEN
      UPDATE aircraft_movements
      SET is_locked = true
      WHERE id = NEW.movement_arr_id;
    END IF;
    
    IF NEW.movement_dep_id IS NOT NULL THEN
      UPDATE aircraft_movements
      SET is_locked = true
      WHERE id = NEW.movement_dep_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_lock_movement_on_invoice ON invoices;

-- Create trigger
CREATE TRIGGER trigger_lock_movement_on_invoice
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION lock_movement_on_invoice();

-- Update existing movements that are in invoices
UPDATE aircraft_movements
SET is_locked = true
WHERE id IN (
  SELECT DISTINCT unnest(ARRAY[movement_arr_id, movement_dep_id])
  FROM invoices
  WHERE status != 'CANCELLED'
  AND (movement_arr_id IS NOT NULL OR movement_dep_id IS NOT NULL)
);

-- Update RLS policies to respect locking (only ADMIN can edit locked movements)
DROP POLICY IF EXISTS "movements_update_policy" ON aircraft_movements;

CREATE POLICY "movements_update_policy"
  ON aircraft_movements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (
        users.role = 'ADMIN'
        OR (
          users.role IN ('ATS', 'OPS')
          AND users.airport_id = aircraft_movements.airport_id
          AND (aircraft_movements.is_locked = false OR aircraft_movements.is_locked IS NULL)
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (
        users.role = 'ADMIN'
        OR (
          users.role IN ('ATS', 'OPS')
          AND users.airport_id = aircraft_movements.airport_id
          AND (aircraft_movements.is_locked = false OR aircraft_movements.is_locked IS NULL)
        )
      )
    )
  );
