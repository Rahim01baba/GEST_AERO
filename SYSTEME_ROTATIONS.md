# Système de Traçabilité des Rotations d'Avions

## Vue d'ensemble

Le système de rotation assure une traçabilité complète de chaque rotation d'avion (arrivée + départ) en attribuant un **identifiant unique (UUID)** à chaque rotation. Ce système permet de :

✅ **Lier automatiquement** une arrivée et son départ correspondant
✅ **Associer la facturation** à la rotation complète
✅ **Éviter les doublons** et garantir la cohérence des données
✅ **Faciliter le suivi** opérationnel et financier
✅ **Tracer l'historique** complet de chaque avion

---

## Concept de Rotation

Une **rotation** est définie comme :
- **Une ARRIVÉE (ARR)** + **Un DÉPART (DEP)** du même avion
- Même immatriculation (registration)
- Même aéroport (airport_id)
- Dans une fenêtre de temps de **48 heures**

**Exemple de rotation :**
```
Rotation ID: a1b2c3d4
├─ ARR: AF123 | 2024-01-31 08:00 | F-HBNA | A320
└─ DEP: AF124 | 2024-01-31 14:30 | F-HBNA | A320
```

---

## Architecture Base de Données

### 1. Nouvelles colonnes ajoutées

#### Table `aircraft_movements`
```sql
ALTER TABLE aircraft_movements ADD COLUMN rotation_id uuid;
CREATE INDEX idx_aircraft_movements_rotation_id ON aircraft_movements(rotation_id);
CREATE INDEX idx_aircraft_movements_registration_time ON aircraft_movements(registration, scheduled_time, movement_type);
```

#### Table `invoices`
```sql
ALTER TABLE invoices ADD COLUMN rotation_id uuid;
CREATE INDEX idx_invoices_rotation_id ON invoices(rotation_id);
```

### 2. Fonctions PostgreSQL

#### `assign_rotation_id()` - Trigger automatique
Cette fonction est déclenchée **automatiquement à chaque insertion** d'un mouvement :

**Pour une ARRIVÉE (ARR) :**
1. Génère un nouveau `rotation_id` (UUID)
2. L'attribue au mouvement

**Pour un DÉPART (DEP) :**
1. Cherche une arrivée correspondante dans les **48h précédentes**
   - Même immatriculation
   - Même aéroport
   - Pas déjà associée à un autre départ
2. Si trouvée : utilise le même `rotation_id`
3. Si non trouvée : génère un nouveau `rotation_id` (départ sans arrivée)

**Code simplifié :**
```sql
IF movement_type = 'ARR' THEN
  NEW.rotation_id := gen_random_uuid();

ELSIF movement_type = 'DEP' THEN
  SELECT rotation_id INTO existing_rotation_id
  FROM aircraft_movements
  WHERE registration = NEW.registration
    AND airport_id = NEW.airport_id
    AND movement_type = 'ARR'
    AND scheduled_time >= (NEW.scheduled_time - INTERVAL '48 hours')
    AND scheduled_time <= NEW.scheduled_time
    AND NOT EXISTS (SELECT 1 FROM aircraft_movements WHERE rotation_id = arr.rotation_id AND movement_type = 'DEP')
  ORDER BY scheduled_time DESC
  LIMIT 1;

  IF existing_rotation_id IS NOT NULL THEN
    NEW.rotation_id := existing_rotation_id;
  ELSE
    NEW.rotation_id := gen_random_uuid();
  END IF;
END IF;
```

#### `reassign_existing_rotations(airport_filter)` - Migration des données
Cette fonction permet d'assigner les `rotation_id` aux mouvements existants :

```sql
SELECT * FROM reassign_existing_rotations(airport_id);
-- Retourne: (movements_updated, rotations_created)
```

**Algorithme :**
1. Pour chaque ARRIVÉE sans `rotation_id` :
   - Génère un nouveau `rotation_id`
   - Cherche le DÉPART correspondant (dans les 48h)
   - Associe le même `rotation_id` au départ
2. Pour chaque DÉPART orphelin :
   - Génère un nouveau `rotation_id`

#### `update_invoice_rotation_ids()` - Sync facturation
Met à jour les `rotation_id` des factures basé sur les mouvements :

```sql
UPDATE invoices i
SET rotation_id = m.rotation_id
FROM aircraft_movements m
WHERE i.movement_id = m.id
  AND m.rotation_id IS NOT NULL
  AND i.rotation_id IS NULL;
```

### 3. Vue `rotations_view` - Vue consolidée

Cette vue facilite la consultation des rotations complètes :

```sql
SELECT * FROM rotations_view
WHERE airport_id = '...'
  AND arrival_time >= '2024-01-01'
ORDER BY arrival_time DESC;
```

**Colonnes disponibles :**
- `rotation_id` : UUID de la rotation
- `registration` : Immatriculation de l'avion
- `airport_id` : Aéroport de la rotation
- `arrival_time` : Heure d'arrivée
- `departure_time` : Heure de départ
- `arrival_movement_id` : ID du mouvement d'arrivée
- `departure_movement_id` : ID du mouvement de départ
- `arrival_flight` : Numéro de vol ARR
- `departure_flight` : Numéro de vol DEP
- `movement_count` : Nombre de mouvements (1 ou 2)
- `has_arrival` : Booléen - a une arrivée
- `has_departure` : Booléen - a un départ
- `rotation_duration` : Durée de la rotation (interval)

**Exemple de requête :**
```sql
-- Rotations incomplètes (sans départ)
SELECT * FROM rotations_view
WHERE has_arrival = true AND has_departure = false;

-- Rotations complètes du jour
SELECT * FROM rotations_view
WHERE DATE(arrival_time) = CURRENT_DATE
  AND has_arrival = true
  AND has_departure = true;

-- Durée moyenne des rotations
SELECT AVG(EXTRACT(EPOCH FROM rotation_duration) / 3600) as avg_hours
FROM rotations_view
WHERE has_arrival = true AND has_departure = true;
```

---

## Utilisation dans l'Application

### 1. Affichage dans l'interface

Les `rotation_id` sont maintenant visibles dans :

#### Page Mouvements (`/movements`)
- Colonne "Rotation ID" ajoutée (affiche les 8 premiers caractères)
- Permet d'identifier visuellement les mouvements liés
- Tri et filtrage disponibles

#### Page Facturation (`/billing`)
- Colonne "Rotation" ajoutée
- Facilite le rapprochement mouvement ↔ facture
- Export CSV inclut le `rotation_id`

**Exemple d'affichage :**
```
Rotation   | Vol    | Type | Immat   | Date       | Heure
-----------|--------|------|---------|------------|-------
a1b2c3d4   | AF123  | ARR  | F-HBNA  | 31/01/2024 | 08:00
a1b2c3d4   | AF124  | DEP  | F-HBNA  | 31/01/2024 | 14:30
```

### 2. Export CSV

Les exports CSV incluent maintenant le `rotation_id` :

```csv
Rotation ID,Vol,Type,Immatriculation,Type Avion,Date,Heure,Stand,Compagnie,Statut,Facturé
a1b2c3d4,AF123,ARR,F-HBNA,A320,31/01/2024,08:00,A12,Air France,Posé,Oui
a1b2c3d4,AF124,DEP,F-HBNA,A320,31/01/2024,14:30,A12,Air France,Décollé,Oui
```

### 3. Facturation

Lors de la création d'une facture, le `rotation_id` du mouvement est automatiquement copié dans la facture, permettant de :
- Retrouver facilement tous les mouvements facturés ensemble
- Générer des rapports par rotation
- Analyser la rentabilité par rotation

---

## Migration des Données Existantes

### Script d'attribution automatique

Un script Node.js est fourni pour assigner les `rotation_id` aux mouvements existants :

```bash
node assign-rotation-ids.js
```

**Ce script :**
1. Parcourt tous les aéroports
2. Identifie les mouvements sans `rotation_id`
3. Appelle la fonction RPC `reassign_existing_rotations()`
4. Affiche un rapport détaillé

**Exemple de sortie :**
```
╔════════════════════════════════════════════════════════╗
║   Attribution des Rotation IDs - Airport Manager      ║
╚════════════════════════════════════════════════════════╝

🔄 Attribution des rotation_id aux mouvements existants...

📍 3 aéroport(s) trouvé(s)

🏢 Traitement de l'aéroport: BYK - Bouaké
   📊 245 mouvement(s) sans rotation_id
   ✅ 245 mouvement(s) mis à jour
   🔗 127 rotation(s) créée(s)

🏢 Traitement de l'aéroport: ABJ - Abidjan
   📊 1523 mouvement(s) sans rotation_id
   ✅ 1523 mouvement(s) mis à jour
   🔗 789 rotation(s) créée(s)

============================================================
📊 RÉSUMÉ GLOBAL
============================================================
✅ Total mouvements mis à jour: 1768
🔗 Total rotations créées: 916
============================================================

🔍 Vérification finale...
✅ Tous les mouvements ont un rotation_id assigné!

✨ Attribution terminée avec succès!
```

---

## Cas d'Usage

### 1. Rotation Complète (Cas Normal)

**Scénario :** Un avion arrive puis repart

```
Mouvement 1 (ARR):
  - Flight: AF123
  - Registration: F-HBNA
  - Time: 2024-01-31 08:00
  → rotation_id: a1b2c3d4-5678-90ab-cdef-1234567890ab (généré)

Mouvement 2 (DEP):
  - Flight: AF124
  - Registration: F-HBNA
  - Time: 2024-01-31 14:30
  → rotation_id: a1b2c3d4-5678-90ab-cdef-1234567890ab (récupéré de l'ARR)
```

**Résultat :** Les deux mouvements ont le même `rotation_id` ✅

### 2. Départ sans Arrivée (Avion en base)

**Scénario :** Un avion décolle sans arrivée enregistrée (avion en stationnement de nuit)

```
Mouvement 1 (DEP):
  - Flight: AF200
  - Registration: F-HXYZ
  - Time: 2024-01-31 06:00
  - Pas d'ARR dans les 48h précédentes
  → rotation_id: b2c3d4e5-6789-01bc-defg-234567890abc (nouveau)
```

**Résultat :** Rotation incomplète (seulement DEP) avec son propre `rotation_id` ✅

### 3. Arrivée sans Départ (Avion reste au sol)

**Scénario :** Un avion arrive mais ne repart pas immédiatement

```
Mouvement 1 (ARR):
  - Flight: AF300
  - Registration: F-HABC
  - Time: 2024-01-31 22:00
  → rotation_id: c3d4e5f6-7890-12cd-efgh-34567890abcd (généré)

(Pas de DEP dans les 48h suivantes)
```

**Résultat :** Rotation incomplète (seulement ARR) visible dans `rotations_view` avec `has_departure = false` ✅

### 4. Multiples Rotations le Même Jour

**Scénario :** Un avion effectue plusieurs rotations

```
Rotation 1:
  ARR: AF100 @ 08:00 → rotation_id: aaaa
  DEP: AF101 @ 10:00 → rotation_id: aaaa

Rotation 2:
  ARR: AF102 @ 14:00 → rotation_id: bbbb
  DEP: AF103 @ 16:00 → rotation_id: bbbb

Rotation 3:
  ARR: AF104 @ 20:00 → rotation_id: cccc
  (Pas encore de départ)
```

**Résultat :** 3 rotations distinctes avec des `rotation_id` différents ✅

---

## Requêtes Utiles

### 1. Trouver toutes les rotations d'un avion

```sql
SELECT * FROM rotations_view
WHERE registration = 'F-HBNA'
ORDER BY arrival_time DESC;
```

### 2. Rotations incomplètes (sans départ)

```sql
SELECT
  rotation_id,
  registration,
  arrival_time,
  arrival_flight,
  EXTRACT(EPOCH FROM (NOW() - arrival_time)) / 3600 as hours_on_ground
FROM rotations_view
WHERE has_arrival = true
  AND has_departure = false
ORDER BY arrival_time DESC;
```

### 3. Statistiques par rotation

```sql
SELECT
  DATE(arrival_time) as date,
  COUNT(*) as rotations_count,
  AVG(EXTRACT(EPOCH FROM rotation_duration) / 3600) as avg_duration_hours,
  SUM(CASE WHEN has_departure THEN 1 ELSE 0 END) as complete_rotations,
  SUM(CASE WHEN NOT has_departure THEN 1 ELSE 0 END) as incomplete_rotations
FROM rotations_view
WHERE arrival_time >= '2024-01-01'
GROUP BY DATE(arrival_time)
ORDER BY date DESC;
```

### 4. Factures par rotation

```sql
SELECT
  r.rotation_id,
  r.registration,
  r.arrival_flight,
  r.departure_flight,
  i.invoice_number,
  i.total_xof,
  i.status
FROM rotations_view r
LEFT JOIN invoices i ON i.rotation_id = r.rotation_id
WHERE r.arrival_time >= '2024-01-01'
ORDER BY r.arrival_time DESC;
```

### 5. Avions actuellement au sol

```sql
SELECT
  registration,
  arrival_flight,
  arrival_time,
  EXTRACT(EPOCH FROM (NOW() - arrival_time)) / 3600 as hours_on_ground
FROM rotations_view
WHERE has_arrival = true
  AND has_departure = false
  AND arrival_time >= (NOW() - INTERVAL '7 days')
ORDER BY hours_on_ground DESC;
```

---

## Maintenance et Optimisation

### Index créés

Les index suivants ont été créés pour optimiser les performances :

```sql
-- Sur aircraft_movements
CREATE INDEX idx_aircraft_movements_rotation_id ON aircraft_movements(rotation_id);
CREATE INDEX idx_aircraft_movements_registration_time ON aircraft_movements(registration, scheduled_time, movement_type);

-- Sur invoices
CREATE INDEX idx_invoices_rotation_id ON invoices(rotation_id);
```

### Performance

Le système est optimisé pour :
- ✅ **Insertion rapide** : Le trigger utilise des index pour trouver rapidement les arrivées correspondantes
- ✅ **Requêtes efficaces** : La vue `rotations_view` utilise des agrégations optimisées
- ✅ **Pas de locks** : Le trigger n'utilise pas de transactions bloquantes

### Limites et Considérations

**Fenêtre de 48 heures :**
- Les départs sont associés aux arrivées dans les 48h précédentes
- Ajustable en modifiant la fonction `assign_rotation_id()`
- Pour des rotations plus longues, modifier `INTERVAL '48 hours'`

**Cas particuliers :**
1. **Avions en maintenance longue durée** : Rotation incomplète (ARR sans DEP)
2. **Erreurs de saisie** : Si une arrivée est enregistrée après le départ, ils auront des `rotation_id` différents
3. **Modification de l'immatriculation** : Changement d'immatriculation cassera la liaison ARR/DEP

**Solutions recommandées :**
- Toujours enregistrer les mouvements dans l'ordre chronologique
- Utiliser la fonctionnalité de modification pour corriger les erreurs
- Pour re-synchroniser : supprimer le `rotation_id` et relancer le script

---

## Évolutions Futures Possibles

### 1. Interface de gestion des rotations

Créer une page dédiée `/rotations` pour :
- Visualiser toutes les rotations
- Filtrer par date, avion, compagnie
- Identifier les rotations incomplètes
- Associer manuellement ARR/DEP si nécessaire

### 2. Alertes automatiques

- ⚠️ Rotation incomplète > 24h
- ⚠️ Départ sans arrivée correspondante
- ⚠️ Avion au sol > durée normale

### 3. Statistiques avancées

- Durée moyenne des rotations par type d'avion
- Taux d'utilisation des avions
- Analyse de rentabilité par rotation
- Prévisions basées sur l'historique

### 4. Facturation par rotation

- Facturer une rotation complète (ARR + DEP ensemble)
- Tarification différenciée selon la durée de rotation
- Bonus/malus selon l'utilisation optimale

### 5. API REST

```
GET  /api/rotations
GET  /api/rotations/:rotation_id
GET  /api/rotations/aircraft/:registration
POST /api/rotations/:rotation_id/link
```

---

## Résumé des Fichiers Modifiés

### Base de données
- ✅ `supabase/migrations/XXXXXX_add_rotation_tracking_system.sql`
  - Colonnes `rotation_id` ajoutées
  - Fonction `assign_rotation_id()` et trigger
  - Fonction `reassign_existing_rotations()`
  - Vue `rotations_view`

### Frontend
- ✅ `src/pages/Movements.tsx`
  - Colonne "Rotation ID" ajoutée
  - Affichage des 8 premiers caractères

- ✅ `src/pages/BillingNew.tsx`
  - Interface `MovementWithStand` mise à jour
  - Colonne "Rotation" ajoutée
  - Export CSV inclut `rotation_id`

### Scripts
- ✅ `assign-rotation-ids.js`
  - Script de migration des données existantes
  - Attribution automatique des `rotation_id`

### Documentation
- ✅ `SYSTEME_ROTATIONS.md` (ce fichier)
  - Documentation complète du système

---

## Support et Dépannage

### Problème : Un départ n'est pas associé à son arrivée

**Causes possibles :**
1. L'arrivée a été enregistrée **après** le départ
2. L'immatriculation ne correspond pas exactement
3. L'arrivée est > 48h avant le départ
4. L'arrivée est dans un autre aéroport

**Solution :**
```sql
-- Vérifier les mouvements
SELECT * FROM aircraft_movements
WHERE registration = 'F-HBNA'
  AND scheduled_time BETWEEN '2024-01-30' AND '2024-02-01'
ORDER BY scheduled_time;

-- Si nécessaire, corriger manuellement
UPDATE aircraft_movements
SET rotation_id = '...'
WHERE id = '...';
```

### Problème : Rotation_id NULL sur nouveaux mouvements

**Causes possibles :**
1. Le trigger n'est pas actif
2. Erreur dans la fonction `assign_rotation_id()`

**Vérification :**
```sql
-- Vérifier que le trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_assign_rotation_id';

-- Vérifier la fonction
SELECT proname, prosrc FROM pg_proc WHERE proname = 'assign_rotation_id';
```

**Réparation :**
```sql
-- Réappliquer la migration
-- Ou exécuter manuellement les commandes CREATE TRIGGER
```

### Problème : Performance dégradée

**Vérification des index :**
```sql
-- Vérifier que les index existent
SELECT * FROM pg_indexes
WHERE tablename = 'aircraft_movements'
  AND indexname LIKE '%rotation%';
```

**Analyse des requêtes lentes :**
```sql
EXPLAIN ANALYZE
SELECT * FROM rotations_view
WHERE arrival_time >= '2024-01-01';
```

---

## Changelog

### Version 1.0.0 - 2026-02-01

**Ajouté :**
- ✅ Système de `rotation_id` pour tracer les rotations ARR/DEP
- ✅ Trigger automatique d'attribution des `rotation_id`
- ✅ Fonction de migration des données existantes
- ✅ Vue consolidée `rotations_view`
- ✅ Affichage dans l'interface (Mouvements & Facturation)
- ✅ Export CSV avec `rotation_id`
- ✅ Script d'initialisation `assign-rotation-ids.js`
- ✅ Documentation complète

**Améliorations futures :**
- [ ] Page dédiée `/rotations`
- [ ] Alertes automatiques
- [ ] Statistiques avancées
- [ ] API REST

---

## Conclusion

Le système de rotation est maintenant opérationnel et fournit une traçabilité complète de chaque rotation d'avion. Il s'intègre de manière transparente avec le système existant et améliore significativement la cohérence des données opérationnelles et financières.

Pour toute question ou support, consultez cette documentation ou contactez l'équipe de développement.
