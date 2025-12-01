/*
  # Fix Users RLS Policies - Remove Infinite Recursion

  ## Changes
  - Drop existing users RLS policies that cause infinite recursion
  - Create new simplified policies that don't query the users table within user queries
  - Allow users to read their own profile directly
  - Allow service role to manage all users (for admin operations via backend)

  ## Security
  - Users can only read their own profile
  - All modifications require service role key (backend operations)
*/

-- Drop all existing users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "ADMIN can view all users" ON users;
DROP POLICY IF EXISTS "ADMIN can manage users" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
