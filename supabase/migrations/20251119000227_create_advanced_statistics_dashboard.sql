/*
  # Dashboard Statistiques Avancées
  
  ## Vue principale: airport_stats_overview
  
  Intègre toutes les statistiques opérationnelles et financières
  demandées avec filtrage complet.
  
  ## Fonctionnalités
  
  1. Filtres: dates, immat, aéroport, code OACI
  2. Stats opérationnelles complètes
  3. Stats financières détaillées
  4. Segmentation par code OACI
  5. Performance optimisée avec index
*/

-- ========================================
-- 1. VUE ENRICHIE DES MOUVEMENTS
-- ========================================

CREATE OR REPLACE VIEW movements_enriched AS
SELECT 
  am.*,
  a.code_oaci,
  a.mtow_kg as aircraft_mtow,
  a.type as aircraft_type_full,
  a.wingspan_m,
  a.length_m,
  a.operator,
  ap.iata_code as airport_iata,
  ap.name as airport_name,
  ap.timezone as airport_timezone,
  -- Calculer durée au sol (pour rotation complète)
  CASE 
    WHEN am.rotation_id IS NOT NULL THEN
      (SELECT EXTRACT(EPOCH FROM (dep.actual_time - arr.actual_time)) / 3600
       FROM aircraft_movements arr
       JOIN aircraft_movements dep ON dep.rotation_id = arr.rotation_id AND dep.movement_type = 'DEP'
       WHERE arr.id = am.id AND arr.movement_type = 'ARR')
    ELSE NULL
  END as ground_time_hours,
  -- Indicateur route complète
  CASE 
    WHEN am.movement_type = 'ARR' AND am.origin_iata IS NOT NULL THEN am.origin_iata || '-' || ap.iata_code
    WHEN am.movement_type = 'DEP' AND am.destination_iata IS NOT NULL THEN ap.iata_code || '-' || am.destination_iata
    ELSE NULL
  END as route,
  -- Classification MTOW
  CASE 
    WHEN am.mtow_kg < 5000 THEN '0-5T'
    WHEN am.mtow_kg < 10000 THEN '5-10T'
    WHEN am.mtow_kg < 20000 THEN '10-20T'
    WHEN am.mtow_kg < 50000 THEN '20-50T'
    WHEN am.mtow_kg < 100000 THEN '50-100T'
    WHEN am.mtow_kg < 200000 THEN '100-200T'
    ELSE '200T+'
  END as mtow_class,
  -- Classification temporelle
  EXTRACT(HOUR FROM am.scheduled_time) as hour_of_day,
  EXTRACT(DOW FROM am.scheduled_time) as day_of_week,
  DATE_TRUNC('day', am.scheduled_time) as movement_date,
  DATE_TRUNC('week', am.scheduled_time) as movement_week,
  DATE_TRUNC('month', am.scheduled_time) as movement_month,
  DATE_TRUNC('quarter', am.scheduled_time) as movement_quarter,
  -- Total PAX
  COALESCE(am.pax_arr_full, 0) + COALESCE(am.pax_arr_half, 0) + 
  COALESCE(am.pax_dep_full, 0) + COALESCE(am.pax_dep_half, 0) as pax_total_all,
  -- Total FRET
  COALESCE(am.freight_arr_kg, 0) + COALESCE(am.freight_dep_kg, 0) as freight_total_kg
FROM aircraft_movements am
LEFT JOIN aircrafts a ON a.registration = am.registration
LEFT JOIN airports ap ON ap.id = am.airport_id;

COMMENT ON VIEW movements_enriched IS 'Vue enrichie des mouvements avec données avion, aéroport et calculs';

-- ========================================
-- 2. FONCTION RPC: STATISTIQUES DASHBOARD
-- ========================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_airport_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_registration TEXT DEFAULT NULL,
  p_code_oaci TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_operations JSONB;
  v_finances JSONB;
BEGIN
  -- Construction filtres WHERE
  WITH filtered_movements AS (
    SELECT * FROM movements_enriched
    WHERE 
      (p_airport_id IS NULL OR airport_id = p_airport_id)
      AND (p_start_date IS NULL OR scheduled_time >= p_start_date)
      AND (p_end_date IS NULL OR scheduled_time <= p_end_date)
      AND (p_registration IS NULL OR registration = p_registration)
      AND (p_code_oaci IS NULL OR code_oaci = p_code_oaci)
  ),
  
  -- ========================================
  -- STATISTIQUES OPÉRATIONNELLES
  -- ========================================
  
  stats_volume AS (
    SELECT 
      COUNT(*) as total_movements,
      COUNT(*) FILTER (WHERE movement_type = 'ARR') as total_arrivals,
      COUNT(*) FILTER (WHERE movement_type = 'DEP') as total_departures,
      COUNT(DISTINCT registration) as unique_aircraft,
      COUNT(DISTINCT airline_code) FILTER (WHERE airline_code IS NOT NULL) as unique_airlines,
      COUNT(DISTINCT route) FILTER (WHERE route IS NOT NULL) as unique_routes
    FROM filtered_movements
  ),
  
  stats_by_aircraft_type AS (
    SELECT 
      jsonb_object_agg(
        COALESCE(aircraft_type, 'Unknown'),
        count
      ) as by_type
    FROM (
      SELECT aircraft_type, COUNT(*) as count
      FROM filtered_movements
      GROUP BY aircraft_type
      ORDER BY count DESC
      LIMIT 20
    ) t
  ),
  
  stats_by_code_oaci AS (
    SELECT 
      jsonb_object_agg(
        COALESCE(code_oaci, 'Unknown'),
        jsonb_build_object(
          'count', count,
          'percentage', ROUND(count::numeric * 100 / NULLIF(SUM(count) OVER (), 0), 2)
        )
      ) as by_code
    FROM (
      SELECT code_oaci, COUNT(*) as count
      FROM filtered_movements
      GROUP BY code_oaci
      ORDER BY count DESC
    ) t
  ),
  
  stats_by_mtow_class AS (
    SELECT 
      jsonb_object_agg(mtow_class, count) as by_mtow
    FROM (
      SELECT mtow_class, COUNT(*) as count
      FROM filtered_movements
      WHERE mtow_class IS NOT NULL
      GROUP BY mtow_class
      ORDER BY 
        CASE mtow_class
          WHEN '0-5T' THEN 1
          WHEN '5-10T' THEN 2
          WHEN '10-20T' THEN 3
          WHEN '20-50T' THEN 4
          WHEN '50-100T' THEN 5
          WHEN '100-200T' THEN 6
          WHEN '200T+' THEN 7
        END
    ) t
  ),
  
  stats_hourly AS (
    SELECT 
      jsonb_object_agg(
        hour_of_day::text,
        jsonb_build_object(
          'arr', arr_count,
          'dep', dep_count,
          'total', arr_count + dep_count
        )
      ) as by_hour
    FROM (
      SELECT 
        hour_of_day,
        COUNT(*) FILTER (WHERE movement_type = 'ARR') as arr_count,
        COUNT(*) FILTER (WHERE movement_type = 'DEP') as dep_count
      FROM filtered_movements
      GROUP BY hour_of_day
      ORDER BY hour_of_day
    ) t
  ),
  
  stats_turnaround AS (
    SELECT 
      ROUND(AVG(ground_time_hours)::numeric, 2) as avg_turnaround_hours,
      ROUND(MIN(ground_time_hours)::numeric, 2) as min_turnaround_hours,
      ROUND(MAX(ground_time_hours)::numeric, 2) as max_turnaround_hours
    FROM filtered_movements
    WHERE ground_time_hours IS NOT NULL AND ground_time_hours > 0
  ),
  
  top_routes AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'route', route,
          'count', count,
          'avg_pax', avg_pax
        )
        ORDER BY count DESC
      ) as routes
    FROM (
      SELECT 
        route,
        COUNT(*) as count,
        ROUND(AVG(pax_total_all)) as avg_pax
      FROM filtered_movements
      WHERE route IS NOT NULL
      GROUP BY route
      ORDER BY count DESC
      LIMIT 10
    ) t
  ),
  
  top_airlines AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'airline', airline_name,
          'code', airline_code,
          'count', count
        )
        ORDER BY count DESC
      ) as airlines
    FROM (
      SELECT 
        airline_name,
        airline_code,
        COUNT(*) as count
      FROM filtered_movements
      WHERE airline_code IS NOT NULL
      GROUP BY airline_name, airline_code
      ORDER BY count DESC
      LIMIT 10
    ) t
  ),
  
  -- ========================================
  -- STATISTIQUES FINANCIÈRES
  -- ========================================
  
  stats_revenue_global AS (
    SELECT 
      COALESCE(SUM(i.total_xof), 0) as total_revenue,
      COUNT(i.id) as total_invoices,
      COUNT(i.id) FILTER (WHERE i.status = 'PAID') as paid_invoices,
      COALESCE(SUM(i.total_xof) FILTER (WHERE i.status = 'PAID'), 0) as paid_revenue
    FROM invoices i
    WHERE 
      (p_airport_id IS NULL OR i.airport_id = p_airport_id)
      AND (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date)
  ),
  
  stats_revenue_by_type AS (
    SELECT 
      jsonb_build_object(
        'landing', COALESCE(SUM(landing_fee_xof), 0),
        'parking', COALESCE(SUM(parking_fee_xof), 0),
        'lighting', COALESCE(SUM(lighting_fee_xof), 0),
        'passenger', COALESCE(SUM(passenger_fee_xof), 0),
        'security', COALESCE(SUM(security_fee_xof), 0),
        'freight', COALESCE(SUM(freight_fee_xof), 0),
        'fuel', COALESCE(SUM(fuel_fee_xof), 0),
        'overtime', COALESCE(SUM(overtime_fee_xof), 0)
      ) as by_fee_type
    FROM invoices
    WHERE 
      (p_airport_id IS NULL OR airport_id = p_airport_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  
  stats_revenue_by_traffic AS (
    SELECT 
      jsonb_object_agg(traffic_type, total) as by_traffic
    FROM (
      SELECT 
        traffic_type,
        SUM(total_xof) as total
      FROM invoices
      WHERE 
        (p_airport_id IS NULL OR airport_id = p_airport_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
      GROUP BY traffic_type
    ) t
  )
  
  -- ========================================
  -- ASSEMBLAGE FINAL
  -- ========================================
  
  SELECT 
    jsonb_build_object(
      'operations', jsonb_build_object(
        'volume', (SELECT row_to_json(stats_volume.*) FROM stats_volume),
        'by_aircraft_type', (SELECT by_type FROM stats_by_aircraft_type),
        'by_code_oaci', (SELECT by_code FROM stats_by_code_oaci),
        'by_mtow_class', (SELECT by_mtow FROM stats_by_mtow_class),
        'by_hour', (SELECT by_hour FROM stats_hourly),
        'turnaround', (SELECT row_to_json(stats_turnaround.*) FROM stats_turnaround),
        'top_routes', (SELECT routes FROM top_routes),
        'top_airlines', (SELECT airlines FROM top_airlines)
      ),
      'finances', jsonb_build_object(
        'global', (SELECT row_to_json(stats_revenue_global.*) FROM stats_revenue_global),
        'by_fee_type', (SELECT by_fee_type FROM stats_revenue_by_type),
        'by_traffic', (SELECT by_traffic FROM stats_revenue_by_traffic)
      ),
      'filters', jsonb_build_object(
        'airport_id', p_airport_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'registration', p_registration,
        'code_oaci', p_code_oaci
      )
    )
  INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats IS 'Retourne toutes les statistiques dashboard en un seul appel avec filtres';

-- ========================================
-- 3. INDEX POUR PERFORMANCE
-- ========================================

-- Index composites pour filtres dashboard
CREATE INDEX IF NOT EXISTS idx_movements_dashboard_filters
  ON aircraft_movements(airport_id, scheduled_time, registration, movement_type);

CREATE INDEX IF NOT EXISTS idx_invoices_dashboard_filters
  ON invoices(airport_id, created_at, status, traffic_type);

-- Index pour jointures
CREATE INDEX IF NOT EXISTS idx_movements_rotation ON aircraft_movements(rotation_id) WHERE rotation_id IS NOT NULL;

-- ========================================
-- 4. PERMISSIONS RLS
-- ========================================

-- La vue movements_enriched hérite des RLS de aircraft_movements
-- Les utilisateurs voient uniquement leurs données autorisées

-- Test de la fonction (à exécuter manuellement pour vérifier)
-- SELECT get_dashboard_stats(NULL, now() - interval '30 days', now(), NULL, NULL);
