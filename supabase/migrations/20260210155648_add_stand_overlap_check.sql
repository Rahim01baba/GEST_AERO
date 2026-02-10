/*
  # Check Stand Overlap RPC

  1. Fonction RPC
    - `check_stand_overlap(p_rotation_id, p_stand_id, p_start_time, p_end_time, p_airport_id)`
    - Vérifie si un slot chevaucherait des slots existants sur le même stand
    - Retourne les conflits trouvés ou vide si OK

  2. Sécurité
    - Accessible aux utilisateurs authentifiés
    - Vérifie que l'utilisateur a accès à l'aéroport
*/

-- Fonction pour vérifier les chevauchements de stands
CREATE OR REPLACE FUNCTION check_stand_overlap(
  p_rotation_id text,
  p_stand_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_airport_id uuid
)
RETURNS TABLE (
  conflicting_rotation_id text,
  conflicting_flight text,
  conflict_start timestamptz,
  conflict_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifie l'accès utilisateur (ADMIN ou même airport)
  IF NOT (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    OR
    (SELECT airport_id FROM users WHERE id = auth.uid()) = p_airport_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Cherche les chevauchements
  -- Un chevauchement existe si: new.start < existing.end ET existing.start < new.end
  RETURN QUERY
  WITH rotation_slots AS (
    -- Pour chaque rotation sur ce stand, calculer start/end
    SELECT
      rotation_id,
      stand_id,
      MIN(
        CASE
          WHEN movement_type = 'ARR' THEN COALESCE(actual_time, scheduled_time)
          ELSE COALESCE(actual_time, scheduled_time) - interval '45 minutes'
        END
      ) AS slot_start,
      MAX(
        CASE
          WHEN movement_type = 'DEP' THEN COALESCE(actual_time, scheduled_time)
          ELSE COALESCE(actual_time, scheduled_time) + interval '45 minutes'
        END
      ) AS slot_end,
      STRING_AGG(flight_number, '/' ORDER BY movement_type) AS flight_numbers
    FROM aircraft_movements
    WHERE
      stand_id = p_stand_id
      AND airport_id = p_airport_id
      AND rotation_id IS NOT NULL
      AND rotation_id != p_rotation_id  -- Exclure la rotation qu'on essaie d'assigner
      AND NOT (status = 'CANCELLED')
    GROUP BY rotation_id, stand_id

    UNION ALL

    -- Mouvements standalone (sans rotation_id)
    SELECT
      id::text AS rotation_id,
      stand_id,
      CASE
        WHEN movement_type = 'ARR' THEN COALESCE(actual_time, scheduled_time)
        ELSE COALESCE(actual_time, scheduled_time) - interval '45 minutes'
      END AS slot_start,
      CASE
        WHEN movement_type = 'DEP' THEN COALESCE(actual_time, scheduled_time)
        ELSE COALESCE(actual_time, scheduled_time) + interval '45 minutes'
      END AS slot_end,
      flight_number AS flight_numbers
    FROM aircraft_movements
    WHERE
      stand_id = p_stand_id
      AND airport_id = p_airport_id
      AND rotation_id IS NULL
      AND id::text != p_rotation_id
      AND NOT (status = 'CANCELLED')
  )
  SELECT
    rotation_id AS conflicting_rotation_id,
    flight_numbers AS conflicting_flight,
    slot_start AS conflict_start,
    slot_end AS conflict_end
  FROM rotation_slots
  WHERE
    -- Détection du chevauchement
    p_start_time < slot_end
    AND slot_start < p_end_time;
END;
$$;

-- Grant execute à authenticated users
GRANT EXECUTE ON FUNCTION check_stand_overlap(text, uuid, timestamptz, timestamptz, uuid) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION check_stand_overlap IS 'Vérifie si un slot (rotation) chevaucherait des slots existants sur un stand donné';
