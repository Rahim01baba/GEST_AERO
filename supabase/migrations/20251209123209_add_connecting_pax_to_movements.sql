/*
  # Ajout passagers en correspondance

  1. Nouvelle colonne
    - `pax_connecting` : integer - nombre de passagers en correspondance (pour les DEP)

  2. Notes importantes
    - La colonne stand_id existe déjà dans aircraft_movements
    - pax_connecting est principalement utilisé pour les mouvements DEP
    - Valeur par défaut 0 pour compatibilité avec les données existantes
*/

-- Ajouter passagers en correspondance
ALTER TABLE aircraft_movements
  ADD COLUMN IF NOT EXISTS pax_connecting integer DEFAULT 0 CHECK (pax_connecting >= 0);

COMMENT ON COLUMN aircraft_movements.pax_connecting IS 'Passagers en correspondance (utilisé pour les départs)';
