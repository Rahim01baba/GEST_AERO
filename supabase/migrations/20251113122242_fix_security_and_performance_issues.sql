/*
  # Fix Security and Performance Issues
  
  1. Add missing indexes on foreign keys
  2. Optimize RLS policies with (SELECT auth.uid())
  3. Remove duplicate constraints
  4. Fix function search paths
  5. Clean up multiple permissive policies
  
  Performance improvements for better scalability.
*/

-- ============================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================

-- Index for aircraft_movements.stand_id
CREATE INDEX IF NOT EXISTS idx_aircraft_movements_stand_id 
ON aircraft_movements(stand_id);

-- Index for invoices.movement_arr_id
CREATE INDEX IF NOT EXISTS idx_invoices_movement_arr_id 
ON invoices(movement_arr_id);

-- Index for invoices.movement_dep_id
CREATE INDEX IF NOT EXISTS idx_invoices_movement_dep_id 
ON invoices(movement_dep_id);

-- ============================================
-- 2. REMOVE DUPLICATE CONSTRAINTS
-- ============================================

-- Keep airports_icao_code_key, drop airports_icao_key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'airports_icao_key'
  ) THEN
    ALTER TABLE airports DROP CONSTRAINT airports_icao_key;
  END IF;
END $$;

-- ============================================
-- 3. OPTIMIZE RLS POLICIES - AIRPORTS
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "ADMIN can view all airports" ON airports;
DROP POLICY IF EXISTS "Users can view their airport" ON airports;
DROP POLICY IF EXISTS "ADMIN can insert airports" ON airports;
DROP POLICY IF EXISTS "ADMIN can update airports" ON airports;
DROP POLICY IF EXISTS "ADMIN can delete airports" ON airports;
DROP POLICY IF EXISTS "airports_write_admin" ON airports;
DROP POLICY IF EXISTS "airports_read_all" ON airports;

-- Create optimized policies with (SELECT auth.uid())
CREATE POLICY "airports_select_policy"
  ON airports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "airports_write_policy"
  ON airports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'DED-C')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'DED-C')
    )
  );

-- ============================================
-- 4. OPTIMIZE RLS POLICIES - RUNWAYS
-- ============================================

DROP POLICY IF EXISTS "Users can view runways at their airport" ON runways;
DROP POLICY IF EXISTS "ADMIN can manage runways" ON runways;

CREATE POLICY "runways_select_policy"
  ON runways
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR users.airport_id = runways.airport_id)
    )
  );

CREATE POLICY "runways_write_policy"
  ON runways
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================
-- 5. OPTIMIZE RLS POLICIES - STANDS
-- ============================================

DROP POLICY IF EXISTS "Users can view stands at their airport" ON stands;
DROP POLICY IF EXISTS "ADMIN can manage stands" ON stands;
DROP POLICY IF EXISTS "OPS can update stands at their airport" ON stands;

CREATE POLICY "stands_select_policy"
  ON stands
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR users.airport_id = stands.airport_id)
    )
  );

CREATE POLICY "stands_insert_policy"
  ON stands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "stands_delete_policy"
  ON stands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "stands_update_policy"
  ON stands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (
        users.role = 'ADMIN' 
        OR (users.role = 'OPS' AND users.airport_id = stands.airport_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (
        users.role = 'ADMIN' 
        OR (users.role = 'OPS' AND users.airport_id = stands.airport_id)
      )
    )
  );

-- ============================================
-- 6. OPTIMIZE RLS POLICIES - TERMINALS
-- ============================================

DROP POLICY IF EXISTS "Users can view terminals at their airport" ON terminals;
DROP POLICY IF EXISTS "ADMIN can manage terminals" ON terminals;

CREATE POLICY "terminals_select_policy"
  ON terminals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR users.airport_id = terminals.airport_id)
    )
  );

CREATE POLICY "terminals_write_policy"
  ON terminals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================
-- 7. OPTIMIZE RLS POLICIES - AIRCRAFT_MOVEMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view movements at their airport" ON aircraft_movements;
DROP POLICY IF EXISTS "ATS can create movements at their airport" ON aircraft_movements;
DROP POLICY IF EXISTS "ATS can update movements at their airport" ON aircraft_movements;
DROP POLICY IF EXISTS "ADMIN can delete movements" ON aircraft_movements;

CREATE POLICY "movements_select_policy"
  ON aircraft_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
    )
  );

CREATE POLICY "movements_insert_policy"
  ON aircraft_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR (users.role IN ('ATS', 'OPS') AND users.airport_id = aircraft_movements.airport_id))
    )
  );

CREATE POLICY "movements_update_policy"
  ON aircraft_movements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR (users.role IN ('ATS', 'OPS') AND users.airport_id = aircraft_movements.airport_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND (users.role = 'ADMIN' OR (users.role IN ('ATS', 'OPS') AND users.airport_id = aircraft_movements.airport_id))
    )
  );

CREATE POLICY "movements_delete_policy"
  ON aircraft_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================
-- 8. OPTIMIZE RLS POLICIES - AUDIT_LOGS
-- ============================================

DROP POLICY IF EXISTS "Users can view audit logs for their airport" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

CREATE POLICY "audit_logs_select_policy"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "audit_logs_insert_policy"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================
-- 9. OPTIMIZE RLS POLICIES - USERS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "users_select_own_policy" ON users;
DROP POLICY IF EXISTS "users_select_all_admin_policy" ON users;

CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (SELECT auth.uid())
      AND u.role = 'ADMIN'
    )
  );

-- ============================================
-- 10. OPTIMIZE RLS POLICIES - AIRCRAFT_REGISTRY
-- ============================================

DROP POLICY IF EXISTS "ADMIN and AIM can insert aircraft registry" ON aircraft_registry;
DROP POLICY IF EXISTS "ADMIN and AIM can update aircraft registry" ON aircraft_registry;
DROP POLICY IF EXISTS "ADMIN can delete aircraft registry" ON aircraft_registry;

CREATE POLICY "aircraft_registry_insert_policy"
  ON aircraft_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'AIM')
    )
  );

CREATE POLICY "aircraft_registry_update_policy"
  ON aircraft_registry
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'AIM')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'AIM')
    )
  );

CREATE POLICY "aircraft_registry_delete_policy"
  ON aircraft_registry
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- ============================================
-- 11. OPTIMIZE RLS POLICIES - AIRCRAFTS
-- ============================================

DROP POLICY IF EXISTS "aircrafts_read_policy" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_insert_policy" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_update_policy" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_delete_policy" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_select_policy" ON aircrafts;
DROP POLICY IF EXISTS "aircrafts_write_policy" ON aircrafts;

CREATE POLICY "aircrafts_select_optimized"
  ON aircrafts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "aircrafts_write_optimized"
  ON aircrafts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'AIM')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('ADMIN', 'AIM')
    )
  );

-- ============================================
-- 12. FIX FUNCTION SEARCH PATHS
-- ============================================

-- Fix get_user_role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM users
    WHERE id = auth.uid()
  );
END;
$$;

-- Fix update_aircrafts_updated_at
CREATE OR REPLACE FUNCTION update_aircrafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix lookup_aircraft_by_registration
CREATE OR REPLACE FUNCTION lookup_aircraft_by_registration(p_registration text)
RETURNS TABLE(
  mtow_kg integer,
  airline_code text,
  airline_name text,
  aircraft_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CAST(a.mtow_kg AS integer) as mtow_kg,
    NULL::text as airline_code,
    a.operator as airline_name,
    a.type as aircraft_type
  FROM aircrafts a
  WHERE UPPER(a.registration) = UPPER(p_registration)
  LIMIT 1;
END;
$$;

-- Fix check_stand_availability
CREATE OR REPLACE FUNCTION check_stand_availability(
  p_stand_id uuid,
  p_scheduled_time timestamptz,
  p_duration_hours numeric DEFAULT 2
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflicts integer;
BEGIN
  SELECT COUNT(*)
  INTO v_conflicts
  FROM aircraft_movements
  WHERE stand_id = p_stand_id
    AND status NOT IN ('Décollé', 'Annulé')
    AND scheduled_time BETWEEN 
      (p_scheduled_time - (p_duration_hours || ' hours')::interval) AND
      (p_scheduled_time + (p_duration_hours || ' hours')::interval);
  
  RETURN v_conflicts = 0;
END;
$$;

-- Fix validate_stand_assignment
CREATE OR REPLACE FUNCTION validate_stand_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stand_mtow integer;
  v_aircraft_mtow integer;
BEGIN
  IF NEW.stand_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT max_mtow_kg INTO v_stand_mtow
  FROM stands
  WHERE id = NEW.stand_id;
  
  v_aircraft_mtow := NEW.mtow_kg;
  
  IF v_aircraft_mtow > v_stand_mtow THEN
    RAISE EXCEPTION 'Aircraft MTOW (% kg) exceeds stand capacity (% kg)', 
      v_aircraft_mtow, v_stand_mtow;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_arr_dep_order
CREATE OR REPLACE FUNCTION validate_arr_dep_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_arr_time timestamptz;
  v_dep_time timestamptz;
BEGIN
  IF NEW.rotation_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT 
    MAX(CASE WHEN movement_type = 'ARR' THEN scheduled_time END),
    MAX(CASE WHEN movement_type = 'DEP' THEN scheduled_time END)
  INTO v_arr_time, v_dep_time
  FROM aircraft_movements
  WHERE rotation_id = NEW.rotation_id;
  
  IF v_arr_time IS NOT NULL AND v_dep_time IS NOT NULL THEN
    IF v_arr_time >= v_dep_time THEN
      RAISE EXCEPTION 'Arrival time must be before departure time';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix update_airports_updated_at
CREATE OR REPLACE FUNCTION update_airports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
