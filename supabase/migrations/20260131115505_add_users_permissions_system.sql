/*
  # Add Users Permissions System

  1. New Table
    - `users_permissions`: Store granular permissions for each user and module
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `module` (text): dashboard, movements, parking, billing, aircrafts, airports, users, audit, billing_settings
      - `can_view` (boolean): Can access the module
      - `can_create` (boolean): Can create new records
      - `can_edit` (boolean): Can edit existing records
      - `can_delete` (boolean): Can delete records
      - `created_at`, `updated_at`

  2. Security
    - Enable RLS on `users_permissions` table
    - ADMIN can view/manage all permissions
    - Users can view their own permissions

  3. Indexes
    - Index on user_id for fast lookups
    - Unique constraint on (user_id, module)
*/

-- Create users_permissions table
CREATE TABLE IF NOT EXISTS users_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT chk_module_valid CHECK (module IN (
    'dashboard',
    'movements',
    'parking',
    'billing',
    'aircrafts',
    'airports',
    'users',
    'audit',
    'billing_settings'
  ))
);

-- Add unique constraint on user_id + module
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_module'
  ) THEN
    ALTER TABLE users_permissions
    ADD CONSTRAINT unique_user_module UNIQUE (user_id, module);
  END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_permissions_user_id ON users_permissions(user_id);

-- Enable RLS
ALTER TABLE users_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all permissions" ON users_permissions;
DROP POLICY IF EXISTS "Admin can insert permissions" ON users_permissions;
DROP POLICY IF EXISTS "Admin can update permissions" ON users_permissions;
DROP POLICY IF EXISTS "Admin can delete permissions" ON users_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON users_permissions;

-- ADMIN can manage all permissions
CREATE POLICY "Admin can view all permissions"
  ON users_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admin can insert permissions"
  ON users_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admin can update permissions"
  ON users_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admin can delete permissions"
  ON users_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON users_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE users_permissions IS 'Granular permissions for each user and module';
COMMENT ON COLUMN users_permissions.module IS 'Module name: dashboard, movements, parking, billing, aircrafts, airports, users, audit, billing_settings';
COMMENT ON COLUMN users_permissions.can_view IS 'User can access and view the module';
COMMENT ON COLUMN users_permissions.can_create IS 'User can create new records in the module';
COMMENT ON COLUMN users_permissions.can_edit IS 'User can edit existing records in the module';
COMMENT ON COLUMN users_permissions.can_delete IS 'User can delete records in the module';
