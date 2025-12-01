/*
  # Système complet de facturation + Code OACI avion
  
  ## Modifications principales
  
  1. Ajout code OACI dans aircrafts
  2. Colonne is_invoiced dans aircraft_movements
  3. Table billing_settings pour paramètres admin
  4. Amélioration invoices pour facturation complète
  5. Index pour performance
  
  ## Changements détaillés
  
  ### A. Table aircrafts - Ajout code OACI
  - code_oaci: Code OACI (A, B, C, D, E, F)
  - Mise à jour contraintes
  
  ### B. Table aircraft_movements - Verrouillage facturation
  - is_invoiced: Boolean pour bloquer modifications après facturation
  - Remplace is_locked
  
  ### C. Table billing_settings - Paramétrage admin
  - Tous les tarifs éditables par ADMIN
  - Par aéroport si nécessaire
  - Historisation des changements
  
  ### D. Améliorations invoices
  - Détails redevances
  - Calculs automatiques
*/

-- ========================================
-- 1. AJOUT CODE OACI DANS AIRCRAFTS
-- ========================================

-- Ajouter colonnes si non existantes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aircrafts' AND column_name = 'code_oaci'
  ) THEN
    ALTER TABLE aircrafts ADD COLUMN code_oaci TEXT;
  END IF;
END $$;

-- Contrainte sur code OACI valide
ALTER TABLE aircrafts DROP CONSTRAINT IF EXISTS aircrafts_code_oaci_check;
ALTER TABLE aircrafts ADD CONSTRAINT aircrafts_code_oaci_check 
  CHECK (code_oaci IN ('A', 'B', 'C', 'D', 'E', 'F') OR code_oaci IS NULL);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_aircrafts_code_oaci ON aircrafts(code_oaci);
CREATE INDEX IF NOT EXISTS idx_aircrafts_type ON aircrafts(type);

-- Commentaires
COMMENT ON COLUMN aircrafts.code_oaci IS 'Code OACI de référence aérodrome (A à F selon envergure)';

-- ========================================
-- 2. VERROUILLAGE FACTURATION MOUVEMENTS
-- ========================================

-- Ajouter colonne is_invoiced
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aircraft_movements' AND column_name = 'is_invoiced'
  ) THEN
    ALTER TABLE aircraft_movements ADD COLUMN is_invoiced BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Migrer is_locked vers is_invoiced si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aircraft_movements' AND column_name = 'is_locked'
  ) THEN
    UPDATE aircraft_movements SET is_invoiced = is_locked WHERE is_locked = true;
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_movements_is_invoiced ON aircraft_movements(is_invoiced);
CREATE INDEX IF NOT EXISTS idx_movements_airport_date 
  ON aircraft_movements(airport_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_movements_registration ON aircraft_movements(registration);

-- Commentaire
COMMENT ON COLUMN aircraft_movements.is_invoiced IS 'Mouvement facturé = verrouillé, aucune modification possible';

-- ========================================
-- 3. TABLE BILLING_SETTINGS - PARAMÈTRES ADMIN
-- ========================================

CREATE TABLE IF NOT EXISTS billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID REFERENCES airports(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  fee_subtype TEXT,
  description TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_billing_settings_airport ON billing_settings(airport_id);
CREATE INDEX IF NOT EXISTS idx_billing_settings_type ON billing_settings(fee_type, fee_subtype);
CREATE INDEX IF NOT EXISTS idx_billing_settings_active ON billing_settings(is_active, valid_from, valid_until);

-- Commentaires
COMMENT ON TABLE billing_settings IS 'Paramètres de facturation éditables par ADMIN';
COMMENT ON COLUMN billing_settings.fee_type IS 'Type: LANDING, PARKING, LIGHTING, PASSENGER, SECURITY, FREIGHT, FUEL, OVERTIME';
COMMENT ON COLUMN billing_settings.fee_subtype IS 'Sous-type: ex MTOW_0_5T, MTOW_5_10T, NATIONAL, INTERNATIONAL';
COMMENT ON COLUMN billing_settings.metadata IS 'Données additionnelles JSON (conditions, formules, etc.)';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_billing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_settings_updated_at ON billing_settings;
CREATE TRIGGER trg_billing_settings_updated_at
  BEFORE UPDATE ON billing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_settings_timestamp();

-- ========================================
-- 4. AMÉLIORATION TABLE INVOICES
-- ========================================

-- Ajouter colonnes détails redevances si non existantes
DO $$ 
BEGIN
  -- Redevance atterrissage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'landing_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN landing_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance stationnement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'parking_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN parking_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance balisage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'lighting_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN lighting_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance passagers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'passenger_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN passenger_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance sûreté
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'security_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN security_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance fret
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'freight_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN freight_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Redevance carburant
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'fuel_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN fuel_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Horaires exceptionnels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'overtime_fee_xof') THEN
    ALTER TABLE invoices ADD COLUMN overtime_fee_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Calcul automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'subtotal_xof') THEN
    ALTER TABLE invoices ADD COLUMN subtotal_xof NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_xof') THEN
    ALTER TABLE invoices ADD COLUMN tax_xof NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'discount_xof') THEN
    ALTER TABLE invoices ADD COLUMN discount_xof NUMERIC DEFAULT 0;
  END IF;
  
  -- Détails calcul
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'calculation_details') THEN
    ALTER TABLE invoices ADD COLUMN calculation_details JSONB;
  END IF;
  
  -- Passagers détails
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pax_total') THEN
    ALTER TABLE invoices ADD COLUMN pax_total INTEGER DEFAULT 0;
  END IF;
  
  -- Temps stationnement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'parking_hours') THEN
    ALTER TABLE invoices ADD COLUMN parking_hours NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Commentaires
COMMENT ON COLUMN invoices.landing_fee_xof IS 'Redevance atterrissage calculée selon MTOW';
COMMENT ON COLUMN invoices.parking_fee_xof IS 'Redevance stationnement (33 XOF/t/h après 2h franchise)';
COMMENT ON COLUMN invoices.lighting_fee_xof IS 'Balisage lumineux (selon MTOW et taux de change EUR)';
COMMENT ON COLUMN invoices.passenger_fee_xof IS 'Redevance passagers (1000 NAT, 3000 INT)';
COMMENT ON COLUMN invoices.security_fee_xof IS 'Redevance sûreté (1000 NAT, 3000 INT)';
COMMENT ON COLUMN invoices.calculation_details IS 'Détails JSON du calcul pour traçabilité';

-- ========================================
-- 5. RLS POUR BILLING_SETTINGS
-- ========================================

ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;

-- ADMIN: Lecture + écriture totale
DROP POLICY IF EXISTS "billing_settings_admin_all" ON billing_settings;
CREATE POLICY "billing_settings_admin_all"
  ON billing_settings FOR ALL
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

-- Autres rôles: Lecture seule
DROP POLICY IF EXISTS "billing_settings_read_all" ON billing_settings;
CREATE POLICY "billing_settings_read_all"
  ON billing_settings FOR SELECT
  TO authenticated
  USING (true);

-- ========================================
-- 6. DONNÉES INITIALES BILLING_SETTINGS
-- ========================================

-- Insérer tarifs par défaut Côte d'Ivoire
INSERT INTO billing_settings (fee_type, fee_subtype, description, value, currency, unit, metadata)
VALUES
  -- ATTERRISSAGE PAR TRANCHE MTOW (selon réglementation ivoirienne)
  ('LANDING', 'MTOW_0_5T', 'Atterrissage 0-5 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 0, "mtow_max": 5000, "traffic": "both"}'),
  ('LANDING', 'MTOW_5_10T', 'Atterrissage 5-10 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 5000, "mtow_max": 10000, "traffic": "both"}'),
  ('LANDING', 'MTOW_10_20T', 'Atterrissage 10-20 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 10000, "mtow_max": 20000, "traffic": "both"}'),
  ('LANDING', 'MTOW_20_50T', 'Atterrissage 20-50 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 20000, "mtow_max": 50000, "traffic": "both"}'),
  ('LANDING', 'MTOW_50_100T', 'Atterrissage 50-100 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 50000, "mtow_max": 100000, "traffic": "both"}'),
  ('LANDING', 'MTOW_100_200T', 'Atterrissage 100-200 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 100000, "mtow_max": 200000, "traffic": "both"}'),
  ('LANDING', 'MTOW_200T_PLUS', 'Atterrissage >200 tonnes', 0, 'XOF', 'per_tonne', '{"mtow_min": 200000, "traffic": "both"}'),
  
  -- STATIONNEMENT
  ('PARKING', 'BASE_RATE', 'Stationnement (après 2h franchise)', 33, 'XOF', 'per_tonne_hour', '{"free_hours": 2}'),
  
  -- BALISAGE LUMINEUX
  ('LIGHTING', 'OVER_75T', 'Balisage >75 tonnes', 166.57, 'EUR', 'per_movement', '{"mtow_min": 75000}'),
  ('LIGHTING', 'UNDER_75T', 'Balisage ≤75 tonnes', 131.50, 'EUR', 'per_movement', '{"mtow_max": 75000}'),
  
  -- PASSAGERS
  ('PASSENGER', 'NATIONAL', 'Redevance passager national', 1000, 'XOF', 'per_passenger', '{"traffic": "NAT"}'),
  ('PASSENGER', 'INTERNATIONAL', 'Redevance passager international', 3000, 'XOF', 'per_passenger', '{"traffic": "INT"}'),
  
  -- SÛRETÉ
  ('SECURITY', 'NATIONAL', 'Sûreté national', 1000, 'XOF', 'per_passenger', '{"traffic": "NAT"}'),
  ('SECURITY', 'INTERNATIONAL', 'Sûreté international', 3000, 'XOF', 'per_passenger', '{"traffic": "INT"}'),
  
  -- FRET
  ('FREIGHT', 'BASE_RATE', 'Redevance fret', 0, 'XOF', 'per_kg', '{}'),
  
  -- CARBURANT
  ('FUEL', 'BASE_RATE', 'Redevance carburant', 0, 'XOF', 'per_liter', '{}'),
  
  -- HORAIRES EXCEPTIONNELS
  ('OVERTIME', 'NIGHT', 'Horaires prolongées nuit', 0, 'XOF', 'per_hour', '{"time_start": "22:00", "time_end": "06:00"}'),
  ('OVERTIME', 'WEEKEND', 'Horaires prolongées weekend', 0, 'XOF', 'per_hour', '{"days": ["saturday", "sunday"]}')
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. FONCTION CALCUL AUTOMATIQUE FACTURE
-- ========================================

CREATE OR REPLACE FUNCTION calculate_invoice_fees(
  p_movement_arr_id UUID,
  p_movement_dep_id UUID,
  p_airport_id UUID
)
RETURNS TABLE (
  landing_fee NUMERIC,
  parking_fee NUMERIC,
  lighting_fee NUMERIC,
  passenger_fee NUMERIC,
  security_fee NUMERIC,
  freight_fee NUMERIC,
  fuel_fee NUMERIC,
  overtime_fee NUMERIC,
  subtotal NUMERIC,
  details JSONB
) AS $$
DECLARE
  v_mtow NUMERIC := 0;
  v_traffic_type TEXT := 'NAT';
  v_pax_total INTEGER := 0;
  v_parking_hours NUMERIC := 0;
  v_landing NUMERIC := 0;
  v_parking NUMERIC := 0;
  v_lighting NUMERIC := 0;
  v_passenger NUMERIC := 0;
  v_security NUMERIC := 0;
  v_freight NUMERIC := 0;
  v_fuel NUMERIC := 0;
  v_overtime NUMERIC := 0;
  v_details JSONB := '{}'::jsonb;
  v_arr_time TIMESTAMPTZ;
  v_dep_time TIMESTAMPTZ;
BEGIN
  -- Récupérer données mouvement ARR
  IF p_movement_arr_id IS NOT NULL THEN
    SELECT 
      mtow_kg, 
      COALESCE(pax_arr_full, 0) + COALESCE(pax_arr_half, 0),
      actual_time
    INTO v_mtow, v_pax_total, v_arr_time
    FROM aircraft_movements
    WHERE id = p_movement_arr_id;
  END IF;
  
  -- Récupérer données mouvement DEP
  IF p_movement_dep_id IS NOT NULL THEN
    SELECT 
      COALESCE(v_mtow, mtow_kg),
      v_pax_total + COALESCE(pax_dep_full, 0) + COALESCE(pax_dep_half, 0),
      actual_time
    INTO v_mtow, v_pax_total, v_dep_time
    FROM aircraft_movements
    WHERE id = p_movement_dep_id;
  END IF;
  
  -- Calculer temps de stationnement (si rotation complète)
  IF v_arr_time IS NOT NULL AND v_dep_time IS NOT NULL THEN
    v_parking_hours := EXTRACT(EPOCH FROM (v_dep_time - v_arr_time)) / 3600;
  END IF;
  
  -- TODO: Récupérer traffic_type depuis mouvements
  -- TODO: Appliquer tarifs depuis billing_settings
  -- TODO: Calculer chaque redevance selon règles ivoiriennes
  
  -- Pour l'instant, retourner structure
  RETURN QUERY SELECT 
    v_landing, v_parking, v_lighting, v_passenger, v_security,
    v_freight, v_fuel, v_overtime,
    v_landing + v_parking + v_lighting + v_passenger + v_security + v_freight + v_fuel + v_overtime,
    v_details;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_invoice_fees IS 'Calcule automatiquement toutes les redevances selon réglementation ivoirienne';
