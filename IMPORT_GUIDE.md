# Guide d'Import des Vols - Airport Manager

## ✅ Import Réussi (Exemple)

**22 mouvements** ont été importés avec succès :
- **BYK (Bouaké)** : 1 départ
- **SPY (San-Pedro)** : 13 arrivées + 8 départs

## 📋 Pour importer vos données complètes

### Option 1 : Via l'interface Supabase (Recommandé)

1. **Accédez au dashboard Supabase**
   - URL: https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Menu latéral → "SQL Editor"
   - Cliquez "New query"

3. **Préparez vos données**
   - Utilisez le format SQL suivant :

```sql
INSERT INTO aircraft_movements (
  airport_id, flight_number, aircraft_type, registration,
  movement_type, scheduled_time, status,
  pax_arr_full, pax_dep_full, billable
) VALUES
  ('AIRPORT_ID', 'FLIGHT', 'TYPE', 'REG', 'ARR/DEP', 'TIMESTAMP', 'STATUS', PAX, PAX, true);
```

4. **IDs des aéroports** :
   - **Bouaké (BYK)** : `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - **Korhogo (HGO)** : `a11edcd7-a078-4112-8b26-2c924778c40d`
   - **San-Pedro (SPY)** : `b91e1fb1-9144-4ebe-967a-63b85cebc373`

5. **Codes de statut** :
   - **A** → `Arrived`
   - **B** → `Planned`
   - **M** → `Departed`
   - **C** ou **F** → `Canceled`
   - **0** → `Planned`

6. **Format des dates** :
   - Convertir `06/08/2025 16:18:00` → `2025-08-06T16:18:00.000Z`

### Option 2 : Script automatique (À compléter)

Le fichier `import-movements-sql.js` peut générer le SQL pour vous.

**Étapes** :

1. Créez le fichier `flights-data.txt` avec vos données (séparées par TAB)
2. Exécutez : `node import-movements-sql.js > all-inserts.sql`
3. Copiez le contenu de `all-inserts.sql`
4. Collez dans le SQL Editor de Supabase
5. Exécutez la requête

## 📊 Colonnes de la base de données

### Colonnes principales
- `airport_id` (uuid) - ID de l'aéroport
- `flight_number` (text) - Numéro de vol
- `aircraft_type` (text) - Type d'avion (B738, A320, etc.)
- `registration` (text) - Immatriculation
- `movement_type` (text) - 'ARR' ou 'DEP'
- `scheduled_time` (timestamptz) - Heure prévue (ISO 8601)
- `status` (text) - Planned, Arrived, Departed, Canceled
- `billable` (boolean) - Facturable (true/false)

### Colonnes passagers (optionnelles)
- `pax_arr_full` (integer) - Passagers arrivée plein tarif
- `pax_arr_half` (integer) - Passagers arrivée demi-tarif
- `pax_dep_full` (integer) - Passagers départ plein tarif
- `pax_dep_half` (integer) - Passagers départ demi-tarif
- `pax_transit` (integer) - Passagers en transit

### Colonnes fret (optionnelles)
- `mail_arr_kg` (numeric) - Courrier arrivée (kg)
- `mail_dep_kg` (numeric) - Courrier départ (kg)
- `freight_arr_kg` (numeric) - Fret arrivée (kg)
- `freight_dep_kg` (numeric) - Fret départ (kg)

### Autres colonnes (optionnelles)
- `origin_iata` (text) - Code IATA origine
- `destination_iata` (text) - Code IATA destination
- `airline_code` (text) - Code compagnie
- `airline_name` (text) - Nom compagnie
- `mtow_kg` (integer) - Masse maximale au décollage

## 🎯 Exemple d'import complet

```sql
INSERT INTO aircraft_movements (
  airport_id, flight_number, aircraft_type, registration,
  movement_type, scheduled_time, status,
  pax_arr_full, pax_dep_full,
  origin_iata, destination_iata,
  billable
) VALUES
  -- Vol arrivée Air France à San-Pedro
  ('b91e1fb1-9144-4ebe-967a-63b85cebc373', 'AF520', 'A359', 'FHTYE',
   'ARR', '2025-08-06T19:01:00.000Z', 'Planned',
   272, 0,
   'CDG', 'SPY',
   true),

  -- Vol départ Air France depuis San-Pedro
  ('b91e1fb1-9144-4ebe-967a-63b85cebc373', 'AF521', 'A359', 'FHTYE',
   'DEP', '2025-08-06T21:18:00.000Z', 'Departed',
   0, 272,
   'SPY', 'CDG',
   true);
```

## ✅ Vérification

Après l'import, vérifiez dans le **Dashboard** :
1. Nombre de mouvements du jour
2. Liste des 10 derniers mouvements
3. Taux d'occupation des stands

## 🔧 Dépannage

### Erreur : "column does not exist"
→ Vérifiez le nom des colonnes (utilisez `pax_arr_full` et non `pax_count`)

### Erreur : "invalid input syntax for type uuid"
→ Vérifiez que l'ID de l'aéroport est correct

### Erreur : "invalid input syntax for type timestamp"
→ Format de date requis : `YYYY-MM-DDTHH:MM:SS.000Z`

### Dates incorrectes (année 2020 au lieu de 2025)
→ Vérifiez le format de vos données source (certaines dates de départ sont en 2020)

## 📝 Notes importantes

1. **Dates** : Certaines lignes ont des dates en 2020 (probablement des erreurs dans les données source)
2. **Code aéroport** : Le code "3" dans vos données correspond à San-Pedro
3. **Statuts** : Les statuts sont automatiquement mappés (A=Arrived, B=Planned, etc.)
4. **Passagers** : Pour les arrivées, utilisez `pax_arr_full`. Pour les départs, `pax_dep_full`

## 🚀 Prochaines étapes

Après l'import des vols, vous pouvez :
1. Créer des factures via le module **Billing**
2. Assigner des stands via le module **Parking**
3. Générer des rapports via le module **Audit**
4. Visualiser les statistiques dans le **Dashboard**
