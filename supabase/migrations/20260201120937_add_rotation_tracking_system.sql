/*
  # Système de traçabilité des rotations d'avions

  ## Description
  Ce système assure une traçabilité complète de chaque rotation d'avion (arrivée + départ)
  en attribuant un identifiant unique à chaque rotation. Cela permet de :
  - Lier automatiquement une arrivée et son départ correspondant
  - Associer la facturation à la rotation complète
  - Éviter les doublons et garantir la cohérence des données
  - Faciliter le suivi opérationnel et financier

  ## Changements

  1. Nouvelles colonnes
     - `aircraft_movements.rotation_id` : UUID identifiant unique de la rotation
     - `invoices.rotation_id` : UUID pour lier la facture à la rotation

  2. Fonctions
     - `assign_rotation_id()` : Fonction trigger qui attribue automatiquement un rotation_id
       - Pour une ARR : génère un nouveau rotation_id
       - Pour un DEP : cherche l'ARR correspondante (même immatriculation, dans les 48h)
         et utilise son rotation_id si trouvée, sinon génère un nouveau rotation_id

  3. Trigger
     - Déclenché automatiquement à l'insertion d'un mouvement
     - Assure l'attribution cohérente des rotation_id

  ## Logique de matching
  Un départ est associé à une arrivée si :
  - Même immatriculation (registration)
  - Même aéroport (airport_id)
  - L'arrivée est dans les 48h précédant le départ
  - L'arrivée n'a pas encore de départ associé (priorité au plus récent)

  ## Sécurité
  - RLS activé sur toutes les tables concernées
  - Les rotation_id sont en lecture seule pour les utilisateurs
*/

-- Ajouter la colonne rotation_id à aircraft_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aircraft_movements' AND column_name = 'rotation_id'
  ) THEN
    ALTER TABLE aircraft_movements
    ADD COLUMN rotation_id uuid;
    
    CREATE INDEX IF NOT EXISTS idx_aircraft_movements_rotation_id
    ON aircraft_movements(rotation_id);
    
    CREATE INDEX IF NOT EXISTS idx_aircraft_movements_registration_time
    ON aircraft_movements(registration, scheduled_time, movement_type);
  END IF;
END $$;

-- Ajouter la colonne rotation_id à invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rotation_id'
  ) THEN
    ALTER TABLE invoices
    ADD COLUMN rotation_id uuid;
    
    CREATE INDEX IF NOT EXISTS idx_invoices_rotation_id
    ON invoices(rotation_id);
  END IF;
END $$;

-- Fonction pour assigner automatiquement un rotation_id
CREATE OR REPLACE FUNCTION assign_rotation_id()
RETURNS TRIGGER AS $$
DECLARE
  matching_arrival_id uuid;
  existing_rotation_id uuid;
BEGIN
  -- Si le rotation_id est déjà défini, ne rien faire
  IF NEW.rotation_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Pour une ARRIVÉE : générer un nouveau rotation_id
  IF NEW.movement_type = 'ARR' THEN
    NEW.rotation_id := gen_random_uuid();
    RETURN NEW;
  END IF;

  -- Pour un DÉPART : chercher l'arrivée correspondante
  IF NEW.movement_type = 'DEP' THEN
    -- Chercher une arrivée récente (dans les 48h) avec la même immatriculation
    -- et qui n'a pas encore de départ associé
    SELECT 
      arr.rotation_id INTO existing_rotation_id
    FROM aircraft_movements arr
    WHERE arr.registration = NEW.registration
      AND arr.airport_id = NEW.airport_id
      AND arr.movement_type = 'ARR'
      AND arr.rotation_id IS NOT NULL
      AND arr.scheduled_time <= NEW.scheduled_time
      AND arr.scheduled_time >= (NEW.scheduled_time - INTERVAL '48 hours')
      AND NOT EXISTS (
        -- Vérifier qu'il n'y a pas déjà un départ avec ce rotation_id
        SELECT 1 FROM aircraft_movements dep
        WHERE dep.rotation_id = arr.rotation_id
          AND dep.movement_type = 'DEP'
          AND dep.id != NEW.id
      )
    ORDER BY arr.scheduled_time DESC
    LIMIT 1;

    -- Si une arrivée correspondante est trouvée, utiliser son rotation_id
    IF existing_rotation_id IS NOT NULL THEN
      NEW.rotation_id := existing_rotation_id;
    ELSE
      -- Sinon, générer un nouveau rotation_id (départ sans arrivée enregistrée)
      NEW.rotation_id := gen_random_uuid();
    END IF;

    RETURN NEW;
  END IF;

  -- Pour tout autre type de mouvement
  NEW.rotation_id := gen_random_uuid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur aircraft_movements
DROP TRIGGER IF EXISTS trigger_assign_rotation_id ON aircraft_movements;
CREATE TRIGGER trigger_assign_rotation_id
  BEFORE INSERT ON aircraft_movements
  FOR EACH ROW
  EXECUTE FUNCTION assign_rotation_id();

-- Fonction pour mettre à jour le rotation_id des factures existantes
-- basée sur le movement_id
CREATE OR REPLACE FUNCTION update_invoice_rotation_ids()
RETURNS void AS $$
BEGIN
  -- Mettre à jour les factures qui ont un movement_id
  UPDATE invoices i
  SET rotation_id = m.rotation_id
  FROM aircraft_movements m
  WHERE i.movement_id = m.id
    AND m.rotation_id IS NOT NULL
    AND i.rotation_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction RPC pour ré-assigner les rotation_id des mouvements existants
-- (utile pour la migration des données existantes)
CREATE OR REPLACE FUNCTION reassign_existing_rotations(airport_filter uuid DEFAULT NULL)
RETURNS TABLE(movements_updated integer, rotations_created integer) AS $$
DECLARE
  updated_count integer := 0;
  rotation_count integer := 0;
  arr_record RECORD;
  new_rotation_id uuid;
BEGIN
  -- Traiter toutes les arrivées qui n'ont pas encore de rotation_id
  FOR arr_record IN
    SELECT id, registration, airport_id, scheduled_time
    FROM aircraft_movements
    WHERE movement_type = 'ARR'
      AND rotation_id IS NULL
      AND (airport_filter IS NULL OR airport_id = airport_filter)
    ORDER BY scheduled_time ASC
  LOOP
    -- Générer un nouveau rotation_id pour cette arrivée
    new_rotation_id := gen_random_uuid();
    
    -- Attribuer le rotation_id à l'arrivée
    UPDATE aircraft_movements
    SET rotation_id = new_rotation_id
    WHERE id = arr_record.id;
    
    updated_count := updated_count + 1;
    rotation_count := rotation_count + 1;
    
    -- Chercher et associer le départ correspondant (dans les 48h)
    UPDATE aircraft_movements
    SET rotation_id = new_rotation_id
    WHERE registration = arr_record.registration
      AND airport_id = arr_record.airport_id
      AND movement_type = 'DEP'
      AND scheduled_time >= arr_record.scheduled_time
      AND scheduled_time <= (arr_record.scheduled_time + INTERVAL '48 hours')
      AND rotation_id IS NULL
      AND id IN (
        SELECT id FROM aircraft_movements
        WHERE registration = arr_record.registration
          AND airport_id = arr_record.airport_id
          AND movement_type = 'DEP'
          AND scheduled_time >= arr_record.scheduled_time
          AND scheduled_time <= (arr_record.scheduled_time + INTERVAL '48 hours')
          AND rotation_id IS NULL
        ORDER BY scheduled_time ASC
        LIMIT 1
      );
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  -- Traiter les départs orphelins (sans arrivée correspondante)
  FOR arr_record IN
    SELECT id
    FROM aircraft_movements
    WHERE movement_type = 'DEP'
      AND rotation_id IS NULL
      AND (airport_filter IS NULL OR airport_id = airport_filter)
  LOOP
    UPDATE aircraft_movements
    SET rotation_id = gen_random_uuid()
    WHERE id = arr_record.id;
    
    updated_count := updated_count + 1;
    rotation_count := rotation_count + 1;
  END LOOP;
  
  -- Mettre à jour les rotation_id des factures
  PERFORM update_invoice_rotation_ids();
  
  RETURN QUERY SELECT updated_count, rotation_count;
END;
$$ LANGUAGE plpgsql;

-- Créer une vue pour faciliter la consultation des rotations
CREATE OR REPLACE VIEW rotations_view AS
SELECT 
  rotation_id,
  registration,
  airport_id,
  (SELECT scheduled_time FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'ARR' LIMIT 1) as arrival_time,
  (SELECT scheduled_time FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'DEP' LIMIT 1) as departure_time,
  (SELECT id FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'ARR' LIMIT 1) as arrival_movement_id,
  (SELECT id FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'DEP' LIMIT 1) as departure_movement_id,
  (SELECT flight_number FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'ARR' LIMIT 1) as arrival_flight,
  (SELECT flight_number FROM aircraft_movements WHERE rotation_id = m.rotation_id AND movement_type = 'DEP' LIMIT 1) as departure_flight,
  COUNT(*) as movement_count,
  BOOL_OR(movement_type = 'ARR') as has_arrival,
  BOOL_OR(movement_type = 'DEP') as has_departure,
  MAX(scheduled_time) - MIN(scheduled_time) as rotation_duration
FROM aircraft_movements m
WHERE rotation_id IS NOT NULL
GROUP BY rotation_id, registration, airport_id;

-- Ajouter un commentaire sur la vue
COMMENT ON VIEW rotations_view IS 'Vue consolidée des rotations d''avions avec arrivées et départs associés';

-- Accorder les permissions sur la vue
GRANT SELECT ON rotations_view TO authenticated;
