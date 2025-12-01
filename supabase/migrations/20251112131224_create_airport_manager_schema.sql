/*
  # Airport Manager Schema

  ## Overview
  Complete database schema for multi-airport management system with role-based access control.

  ## New Tables
  
  ### 1. airports
  - `id` (uuid, primary key)
  - `name` (text) - Airport name (e.g., "Bouaké")
  - `icao` (text, unique) - ICAO code (e.g., "DIBK")
  - `iata` (text, unique) - IATA code (e.g., "BYK")
  - `timezone` (text) - Timezone identifier
  - `latitude` (numeric) - GPS latitude
  - `longitude` (numeric) - GPS longitude
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. runways
  - `id` (uuid, primary key)
  - `airport_id` (uuid, foreign key to airports)
  - `name` (text) - Runway identifier (e.g., "03/21")
  - `length_m` (integer) - Length in meters
  - `width_m` (integer) - Width in meters
  - `max_aircraft_type` (text) - Maximum aircraft category
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. stands
  - `id` (uuid, primary key)
  - `airport_id` (uuid, foreign key to airports)
  - `name` (text) - Stand identifier (e.g., "A1")
  - `max_mtow_kg` (integer) - Maximum takeoff weight in kg
  - `contact_gate` (boolean) - Has contact gate
  - `is_blocked` (boolean) - Stand blocked status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. terminals
  - `id` (uuid, primary key)
  - `airport_id` (uuid, foreign key to airports)
  - `name` (text) - Terminal name
  - `arrival_capacity` (integer) - Hourly arrival capacity
  - `departure_capacity` (integer) - Hourly departure capacity
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. users
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text) - User full name
  - `email` (text, unique) - Email address
  - `role` (text) - Role: ADMIN, ATS, OPS, AIM, FIN
  - `airport_id` (uuid, foreign key to airports, nullable for ADMIN)
  - `active` (boolean) - Account active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. aircraft_movements
  - `id` (uuid, primary key)
  - `airport_id` (uuid, foreign key to airports)
  - `flight_number` (text) - Flight number
  - `aircraft_type` (text) - Aircraft type (e.g., "Boeing 737")
  - `registration` (text) - Aircraft registration
  - `movement_type` (text) - ARR or DEP
  - `scheduled_time` (timestamptz) - Scheduled time
  - `actual_time` (timestamptz, nullable) - Actual time
  - `stand_id` (uuid, foreign key to stands, nullable)
  - `status` (text) - Planned, Arrived, Departed, Canceled
  - `billable` (boolean) - Is billable
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. invoices
  - `id` (uuid, primary key)
  - `movement_id` (uuid, foreign key to aircraft_movements)
  - `customer` (text) - Customer name
  - `amount_xof` (numeric) - Amount in XOF
  - `status` (text) - Draft, Issued, Paid, Canceled
  - `pdf_url` (text, nullable) - PDF document URL
  - `issued_at` (timestamptz, nullable) - Issue timestamp
  - `paid_at` (timestamptz, nullable) - Payment timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. audit_logs
  - `id` (uuid, primary key)
  - `actor_id` (uuid, foreign key to users)
  - `action` (text) - Action performed
  - `target_type` (text) - Type of target entity
  - `target_id` (uuid, nullable) - Target entity ID
  - `details` (jsonb, nullable) - Additional details
  - `timestamp` (timestamptz) - Action timestamp

  ## Security
  - Enable RLS on all tables
  - ADMIN role: full access to all data
  - Other roles: access restricted to their assigned airport
  - audit_logs: read-only for all authenticated users

  ## Important Notes
  1. All foreign key constraints ensure referential integrity
  2. Timestamps are automatically maintained with triggers
  3. RLS policies enforce multi-tenancy per airport
  4. Audit logs track all significant actions
*/

-- Create airports table
CREATE TABLE IF NOT EXISTS airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icao text UNIQUE NOT NULL,
  iata text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create runways table
CREATE TABLE IF NOT EXISTS runways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  name text NOT NULL,
  length_m integer NOT NULL,
  width_m integer NOT NULL,
  max_aircraft_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stands table
CREATE TABLE IF NOT EXISTS stands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_mtow_kg integer NOT NULL,
  contact_gate boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create terminals table
CREATE TABLE IF NOT EXISTS terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  name text NOT NULL,
  arrival_capacity integer DEFAULT 0,
  departure_capacity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'ATS', 'OPS', 'AIM', 'FIN')),
  airport_id uuid REFERENCES airports(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create aircraft_movements table
CREATE TABLE IF NOT EXISTS aircraft_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  flight_number text NOT NULL,
  aircraft_type text NOT NULL,
  registration text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('ARR', 'DEP')),
  scheduled_time timestamptz NOT NULL,
  actual_time timestamptz,
  stand_id uuid REFERENCES stands(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Arrived', 'Departed', 'Canceled')),
  billable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES aircraft_movements(id) ON DELETE CASCADE,
  customer text NOT NULL,
  amount_xof numeric NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Paid', 'Canceled')),
  pdf_url text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_runways_airport ON runways(airport_id);
CREATE INDEX IF NOT EXISTS idx_stands_airport ON stands(airport_id);
CREATE INDEX IF NOT EXISTS idx_terminals_airport ON terminals(airport_id);
CREATE INDEX IF NOT EXISTS idx_users_airport ON users(airport_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_movements_airport ON aircraft_movements(airport_id);
CREATE INDEX IF NOT EXISTS idx_movements_scheduled ON aircraft_movements(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_movements_status ON aircraft_movements(status);
CREATE INDEX IF NOT EXISTS idx_invoices_movement ON invoices(movement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_airports_updated_at ON airports;
CREATE TRIGGER update_airports_updated_at BEFORE UPDATE ON airports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_runways_updated_at ON runways;
CREATE TRIGGER update_runways_updated_at BEFORE UPDATE ON runways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stands_updated_at ON stands;
CREATE TRIGGER update_stands_updated_at BEFORE UPDATE ON stands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_terminals_updated_at ON terminals;
CREATE TRIGGER update_terminals_updated_at BEFORE UPDATE ON terminals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_movements_updated_at ON aircraft_movements;
CREATE TRIGGER update_movements_updated_at BEFORE UPDATE ON aircraft_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE runways ENABLE ROW LEVEL SECURITY;
ALTER TABLE stands ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for airports
CREATE POLICY "ADMIN can view all airports"
  ON airports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

CREATE POLICY "Users can view their airport"
  ON airports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.airport_id = airports.id
      AND users.active = true
    )
  );

CREATE POLICY "ADMIN can insert airports"
  ON airports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

CREATE POLICY "ADMIN can update airports"
  ON airports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

CREATE POLICY "ADMIN can delete airports"
  ON airports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

-- RLS Policies for runways
CREATE POLICY "Users can view runways at their airport"
  ON runways FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND (users.role = 'ADMIN' OR users.airport_id = runways.airport_id)
    )
  );

CREATE POLICY "ADMIN can manage runways"
  ON runways FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

-- RLS Policies for stands
CREATE POLICY "Users can view stands at their airport"
  ON stands FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND (users.role = 'ADMIN' OR users.airport_id = stands.airport_id)
    )
  );

CREATE POLICY "ADMIN can manage stands"
  ON stands FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

CREATE POLICY "OPS can update stands at their airport"
  ON stands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OPS'
      AND users.airport_id = stands.airport_id
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OPS'
      AND users.airport_id = stands.airport_id
      AND users.active = true
    )
  );

-- RLS Policies for terminals
CREATE POLICY "Users can view terminals at their airport"
  ON terminals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND (users.role = 'ADMIN' OR users.airport_id = terminals.airport_id)
    )
  );

CREATE POLICY "ADMIN can manage terminals"
  ON terminals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (users.id = auth.uid());

CREATE POLICY "ADMIN can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
      AND u.active = true
    )
  );

CREATE POLICY "ADMIN can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
      AND u.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
      AND u.active = true
    )
  );

-- RLS Policies for aircraft_movements
CREATE POLICY "Users can view movements at their airport"
  ON aircraft_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
    )
  );

CREATE POLICY "ATS can create movements at their airport"
  ON aircraft_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'ATS')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  );

CREATE POLICY "ATS can update movements at their airport"
  ON aircraft_movements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'ATS')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'ATS')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  );

CREATE POLICY "ADMIN can delete movements"
  ON aircraft_movements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices for movements at their airport"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN aircraft_movements ON aircraft_movements.id = invoices.movement_id
      WHERE users.id = auth.uid()
      AND users.active = true
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
    )
  );

CREATE POLICY "AIM can create invoices at their airport"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN aircraft_movements ON aircraft_movements.id = invoices.movement_id
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'AIM')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  );

CREATE POLICY "AIM and FIN can update invoices at their airport"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN aircraft_movements ON aircraft_movements.id = invoices.movement_id
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'AIM', 'FIN')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN aircraft_movements ON aircraft_movements.id = invoices.movement_id
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'AIM', 'FIN')
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
      AND users.active = true
    )
  );

CREATE POLICY "ADMIN can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for their airport"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
  );