# Guide Rapide - Système de Rotations

## Installation en 3 Étapes

### 1. Migration appliquée automatiquement ✅

La migration a déjà été appliquée à votre base de données Supabase. Elle a créé :
- Colonne `rotation_id` dans `aircraft_movements`
- Colonne `rotation_id` dans `invoices`
- Trigger automatique d'attribution
- Vue `rotations_view`

### 2. Assigner les rotation_id aux données existantes

Exécutez le script pour attribuer les rotation_id aux mouvements existants :

```bash
node assign-rotation-ids.js
```

**Ce script va :**
- Parcourir tous les aéroports
- Associer automatiquement les arrivées et départs
- Afficher un rapport complet

**Durée estimée :** 1-5 minutes selon le nombre de mouvements

### 3. Vérification

Après l'exécution, vérifiez dans l'interface :

1. **Page Mouvements** : Colonne "Rotation ID" visible
2. **Page Facturation** : Colonne "Rotation" visible
3. Les ARR/DEP du même avion ont le même rotation_id (8 premiers caractères affichés)

---

## Fonctionnement Automatique

Pour tous les **nouveaux mouvements** créés après la migration :

### Arrivée (ARR)
→ Génère automatiquement un nouveau `rotation_id` ✨

### Départ (DEP)
→ Cherche l'arrivée correspondante (même immat, dans les 48h)
→ Si trouvée : utilise le même `rotation_id` ✨
→ Sinon : génère un nouveau `rotation_id`

**Aucune action manuelle requise !**

---

## Vérification Rapide

### Dans l'interface

**Page Mouvements :**
```
Rotation   | Vol    | Type | Immat
-----------|--------|------|--------
a1b2c3d4   | AF123  | ARR  | F-HBNA
a1b2c3d4   | AF124  | DEP  | F-HBNA  ← Même rotation_id ✅
```

### Avec SQL

```sql
-- Voir toutes les rotations
SELECT * FROM rotations_view
ORDER BY arrival_time DESC
LIMIT 10;

-- Rotations incomplètes
SELECT * FROM rotations_view
WHERE has_arrival = true AND has_departure = false;

-- Vérifier un avion spécifique
SELECT * FROM rotations_view
WHERE registration = 'F-HBNA';
```

---

## Cas d'Usage Courants

### Rotation Normale
```
ARR: AF123 @ 08:00 → rotation_id: aaaa
DEP: AF124 @ 14:30 → rotation_id: aaaa ✅ (même rotation)
```

### Avion reste au sol
```
ARR: AF200 @ 22:00 → rotation_id: bbbb
(Pas de départ) → Rotation incomplète visible dans rotations_view
```

### Départ sans arrivée (avion en base)
```
DEP: AF300 @ 06:00 → rotation_id: cccc ✅ (nouveau rotation_id)
```

---

## Export CSV

Les exports CSV incluent maintenant le rotation_id :

```csv
Rotation ID,Vol,Type,Immatriculation,...
a1b2c3d4,AF123,ARR,F-HBNA,...
a1b2c3d4,AF124,DEP,F-HBNA,...
```

---

## Dépannage

### Problème : rotation_id NULL sur anciens mouvements

**Solution :** Exécutez le script d'initialisation
```bash
node assign-rotation-ids.js
```

### Problème : Un départ n'est pas lié à son arrivée

**Vérifiez :**
1. Même immatriculation exacte ?
2. L'arrivée est bien avant le départ ?
3. Moins de 48h entre les deux ?

**Correction manuelle (si nécessaire) :**
```sql
UPDATE aircraft_movements
SET rotation_id = 'xxxx-yyyy-zzzz'
WHERE id = 'movement-id';
```

### Problème : Performance lente

**Vérifiez les index :**
```sql
SELECT * FROM pg_indexes
WHERE tablename = 'aircraft_movements'
  AND indexname LIKE '%rotation%';
```

Les index devraient être présents automatiquement.

---

## Documentation Complète

Pour plus de détails, consultez :
- **SYSTEME_ROTATIONS.md** - Documentation technique complète
- **Supabase Dashboard** - Pour voir les tables et fonctions

---

## Support

En cas de problème :
1. Vérifiez que la migration est bien appliquée
2. Exécutez le script `assign-rotation-ids.js`
3. Consultez les logs de la console
4. Vérifiez les permissions RLS sur les tables

---

## Résumé

✅ **Migration appliquée** - Système en place
✅ **Trigger automatique** - Nouveaux mouvements gérés automatiquement
✅ **Script fourni** - Pour les données existantes
✅ **Interface mise à jour** - Colonnes visibles
✅ **Export CSV** - Inclut rotation_id
✅ **Documentation complète** - Disponible

**Le système est prêt à l'emploi !**
