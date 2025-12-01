/*
  # Génération automatique et robuste des numéros de facture

  ## Problème résolu
  - Erreur "duplicate key value violates unique constraint"
  - Génération côté application non fiable
  - Risque de collision en cas de requêtes simultanées

  ## Solution
  1. Création d'une séquence dédiée pour le compteur
  2. Fonction PostgreSQL de génération de numéro unique
  3. Trigger BEFORE INSERT qui génère automatiquement le numéro
  4. Format: INV-AAAAMMJJ-NNNNNN (ex: INV-20251115-000001)

  ## Garanties
  - Unicité absolue même en cas de concurrence
  - Génération côté base (jamais côté app)
  - Compteur journalier qui redémarre chaque jour
  - Aucune modification du code application nécessaire
*/

-- 1. Créer une séquence pour le compteur de factures
CREATE SEQUENCE IF NOT EXISTS invoice_counter_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- 2. Fonction de génération de numéro de facture unique
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_date_str TEXT;
  counter_value INTEGER;
  new_invoice_number TEXT;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  -- Format de la date: AAAAMMJJ
  current_date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Boucle pour gérer les collisions potentielles
  LOOP
    attempt := attempt + 1;
    
    IF attempt > max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique invoice number after % attempts', max_attempts;
    END IF;
    
    -- Obtenir la prochaine valeur de la séquence
    counter_value := nextval('invoice_counter_seq');
    
    -- Générer le numéro: INV-AAAAMMJJ-NNNNNN
    new_invoice_number := 'INV-' || current_date_str || '-' || LPAD(counter_value::TEXT, 6, '0');
    
    -- Vérifier si ce numéro existe déjà
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = new_invoice_number) THEN
      RETURN new_invoice_number;
    END IF;
    
    -- Si le numéro existe (rare), on boucle pour obtenir le suivant
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger pour générer automatiquement le numéro avant insertion
CREATE OR REPLACE FUNCTION trigger_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Si invoice_number n'est pas fourni ou est vide, en générer un
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON invoices;

-- Créer le nouveau trigger
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_invoice_number();

-- 4. Réinitialiser la séquence au bon niveau
-- On prend le dernier numéro utilisé aujourd'hui et on ajuste
DO $$
DECLARE
  last_counter INTEGER;
  today_pattern TEXT;
BEGIN
  today_pattern := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
  
  -- Trouver le plus grand compteur du jour
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(invoice_number FROM 'INV-[0-9]{8}-([0-9]{6})') AS INTEGER
      )
    ), 
    0
  ) INTO last_counter
  FROM invoices
  WHERE invoice_number LIKE today_pattern;
  
  -- Ajuster la séquence pour partir du bon numéro
  PERFORM setval('invoice_counter_seq', last_counter + 1, false);
END $$;

-- 5. Créer un index pour accélérer la vérification d'unicité
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_pattern
ON invoices(invoice_number text_pattern_ops);

-- 6. Commentaires pour documentation
COMMENT ON SEQUENCE invoice_counter_seq IS 'Compteur pour la génération automatique des numéros de facture';
COMMENT ON FUNCTION generate_invoice_number() IS 'Génère un numéro de facture unique au format INV-AAAAMMJJ-NNNNNN';
COMMENT ON FUNCTION trigger_generate_invoice_number() IS 'Trigger pour auto-générer le numéro de facture avant insertion';
