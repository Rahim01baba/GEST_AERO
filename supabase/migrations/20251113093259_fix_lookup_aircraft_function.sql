/*
  # Fix lookup_aircraft_by_registration function
  
  1. Updates
    - Change function to query from `aircrafts` table instead of `aircraft_registry`
    - Map columns correctly: type → aircraft_type, operator → airline_name
    - Return proper structure matching MovementModal expectations
  
  2. Security
    - Keep SECURITY DEFINER for consistent access
*/

CREATE OR REPLACE FUNCTION lookup_aircraft_by_registration(p_registration text)
RETURNS TABLE(
  mtow_kg integer,
  airline_code text,
  airline_name text,
  aircraft_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
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
