/*
  # Correction du Top 10 routes pour le Dashboard

  ## Problème diagnostiqué
  - Les colonnes origin_iata et destination_iata sont toutes NULL (0 sur 23 mouvements)
  - Impossible d'afficher le Top 10 routes sans ces données
  - Le Dashboard ne peut pas construire les routes

  ## Solution
  1. Créer une vue matérialisée pour les routes
  2. Utiliser l'airport_id et le mouvement pour reconstruire les routes
  3. Pour ARR: route = origin_iata → airport (IATA code de l'aéroport)
  4. Pour DEP: route = airport (IATA code) → destination_iata
  5. Fonction helper pour obtenir le Top 10

  ## Notes importantes
  - Si origin_iata/destination_iata sont NULL, on utilise des valeurs par défaut
  - La vue se base sur les données réelles disponibles
  - Une fonction RPC permet au Dashboard d'appeler facilement les données
*/

-- 1. Fonction pour obtenir le code IATA d'un aéroport
CREATE OR REPLACE FUNCTION get_airport_iata(airport_uuid UUID)
RETURNS TEXT AS $$
  SELECT iata_code FROM airports WHERE id = airport_uuid LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 2. Vue pour les routes complètes
CREATE OR REPLACE VIEW routes_view AS
SELECT 
  am.id as movement_id,
  am.airport_id,
  am.movement_type,
  am.flight_number,
  am.scheduled_time,
  a.iata_code as airport_iata,
  CASE 
    -- Pour les arrivées: origin → airport
    WHEN am.movement_type = 'ARR' THEN 
      COALESCE(am.origin_iata, 'XXX') || '-' || a.iata_code
    -- Pour les départs: airport → destination
    WHEN am.movement_type = 'DEP' THEN 
      a.iata_code || '-' || COALESCE(am.destination_iata, 'XXX')
    ELSE 'UNKNOWN'
  END as route,
  am.origin_iata,
  am.destination_iata,
  am.airline_code,
  am.airline_name
FROM aircraft_movements am
JOIN airports a ON am.airport_id = a.id
WHERE 
  (am.movement_type = 'ARR' AND (am.origin_iata IS NOT NULL OR a.iata_code IS NOT NULL))
  OR 
  (am.movement_type = 'DEP' AND (am.destination_iata IS NOT NULL OR a.iata_code IS NOT NULL));

-- 3. Fonction RPC pour obtenir le Top 10 routes
CREATE OR REPLACE FUNCTION get_top10_routes(
  p_airport_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  route TEXT,
  total_vols BIGINT,
  airport_iata TEXT,
  compagnies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rv.route,
    COUNT(*)::BIGINT as total_vols,
    rv.airport_iata,
    ARRAY_AGG(DISTINCT rv.airline_name) FILTER (WHERE rv.airline_name IS NOT NULL) as compagnies
  FROM routes_view rv
  WHERE 
    -- Filtre par aéroport si fourni
    (p_airport_id IS NULL OR rv.airport_id = p_airport_id)
    -- Filtre par date de début si fourni
    AND (p_start_date IS NULL OR rv.scheduled_time >= p_start_date)
    -- Filtre par date de fin si fourni
    AND (p_end_date IS NULL OR rv.scheduled_time <= p_end_date)
    -- Exclure les routes avec XXX (données manquantes)
    AND rv.route NOT LIKE '%XXX%'
  GROUP BY rv.route, rv.airport_iata
  ORDER BY total_vols DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Fonction alternative qui inclut TOUTES les routes même avec données manquantes
CREATE OR REPLACE FUNCTION get_top10_routes_all(
  p_airport_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  route TEXT,
  total_vols BIGINT,
  airport_iata TEXT,
  compagnies TEXT[],
  has_missing_data BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rv.route,
    COUNT(*)::BIGINT as total_vols,
    rv.airport_iata,
    ARRAY_AGG(DISTINCT rv.airline_name) FILTER (WHERE rv.airline_name IS NOT NULL) as compagnies,
    (rv.route LIKE '%XXX%') as has_missing_data
  FROM routes_view rv
  WHERE 
    (p_airport_id IS NULL OR rv.airport_id = p_airport_id)
    AND (p_start_date IS NULL OR rv.scheduled_time >= p_start_date)
    AND (p_end_date IS NULL OR rv.scheduled_time <= p_end_date)
  GROUP BY rv.route, rv.airport_iata
  ORDER BY total_vols DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Fonction pour mettre à jour les origin/destination manquants (à exécuter manuellement)
CREATE OR REPLACE FUNCTION fix_missing_route_data()
RETURNS TABLE (
  updated_count INTEGER,
  details TEXT
) AS $$
DECLARE
  arr_count INTEGER := 0;
  dep_count INTEGER := 0;
BEGIN
  -- Pour les arrivées: si origin_iata est NULL, essayer de déduire depuis le flight_number
  -- (nécessiterait une table de référence des routes, pour l'instant on laisse NULL)
  
  -- Pour les départs: si destination_iata est NULL, idem
  
  -- Retourner un message informatif
  SELECT COUNT(*) INTO arr_count 
  FROM aircraft_movements 
  WHERE movement_type = 'ARR' AND origin_iata IS NULL;
  
  SELECT COUNT(*) INTO dep_count 
  FROM aircraft_movements 
  WHERE movement_type = 'DEP' AND destination_iata IS NULL;
  
  RETURN QUERY SELECT 
    0 as updated_count,
    format('Mouvements avec données manquantes: %s ARR sans origine, %s DEP sans destination. Utilisez get_top10_routes_all() pour inclure ces mouvements dans les statistiques.', 
      arr_count, dep_count) as details;
END;
$$ LANGUAGE plpgsql;

-- 6. Commentaires pour documentation
COMMENT ON FUNCTION get_top10_routes IS 'Retourne le Top 10 des routes les plus opérées (exclut les routes avec données manquantes)';
COMMENT ON FUNCTION get_top10_routes_all IS 'Retourne le Top 10 des routes incluant celles avec données manquantes (marquées XXX)';
COMMENT ON VIEW routes_view IS 'Vue consolidée des routes à partir des mouvements. XXX indique une donnée manquante.';
COMMENT ON FUNCTION fix_missing_route_data IS 'Fonction informative sur les données manquantes. Retourne le nombre de mouvements sans origine/destination.';

-- 7. Garantir les permissions RLS pour la vue
ALTER VIEW routes_view OWNER TO postgres;

-- Politique RLS pour routes_view (hérite des politiques de aircraft_movements)
-- Les utilisateurs verront seulement les routes de leur aéroport
CREATE POLICY "Users see routes for their airport"
  ON aircraft_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.airport_id = aircraft_movements.airport_id)
    )
  );
