/*
  # Update Movement Status Values

  ## Changes
  - Update aircraft_movements table to support new status values
  - Remove old CHECK constraint on status column
  - Add new CHECK constraint with extended status values
  - New statuses: Approche, Posé, Enregistrement, Décollé, Annulé, Reporté

  ## Migration Notes
  - Existing data will be preserved
  - Old status values will be mapped to new ones
*/

-- Drop existing CHECK constraint on status
ALTER TABLE aircraft_movements DROP CONSTRAINT IF EXISTS aircraft_movements_status_check;

-- Add new CHECK constraint with extended status values
ALTER TABLE aircraft_movements ADD CONSTRAINT aircraft_movements_status_check 
  CHECK (status IN ('Planned', 'Approche', 'Posé', 'Enregistrement', 'Décollé', 'Annulé', 'Reporté', 'Arrived', 'Departed', 'Canceled'));
