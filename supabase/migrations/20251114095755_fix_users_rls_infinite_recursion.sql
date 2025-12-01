/*
  # Fix Users RLS Infinite Recursion
  
  The users_select_policy was causing infinite recursion by querying
  the users table within its own policy definition.
  
  Solution: Use SECURITY DEFINER function to break the recursion cycle.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- Create a function to check if user is admin (with proper search path)
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN user_role = 'ADMIN';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;

-- Create optimized policies without recursion
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "users_select_all_admin"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_user_admin());

-- Allow ADMIN to manage users
CREATE POLICY "users_insert_admin"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_admin());

CREATE POLICY "users_update_admin"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_user_admin())
  WITH CHECK (is_user_admin());

CREATE POLICY "users_delete_admin"
  ON users
  FOR DELETE
  TO authenticated
  USING (is_user_admin());
