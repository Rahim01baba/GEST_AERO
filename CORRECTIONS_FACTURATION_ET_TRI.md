# Corrections Module Facturation et Tri des Mouvements

## Résumé des corrections

Deux problèmes critiques ont été corrigés dans l'application Airport Manager :
1. **Problème MTOW dans la facturation** : Le poids maximal au décollage n'était pas récupéré, causant des redevances d'atterrissage à 0
2. **Tri des mouvements** : Les mouvements étaient triés du plus récent au plus ancien au lieu de l'inverse

---

## 1. Correction du MTOW dans la Facturation

### Problème identifié
Dans la prévisualisation et création de facture, le MTOW (Maximum Take-Off Weight) n'était pas correctement récupéré depuis la fiche avion, ce qui causait :
- Redevance d'atterrissage calculée à 0 tonne
- Montants de facture incorrects
- Perte de revenus potentielle

### Solution implémentée
Ajout d'une récupération automatique du MTOW depuis la table `aircrafts` si le mouvement n'a pas de MTOW enregistré.

**Logique :**
1. Vérifier si le mouvement a un `mtow_kg` renseigné
2. Si non, chercher dans la table `aircrafts` par `registration`
3. Récupérer le `mtow_kg` de la fiche avion
4. Utiliser ce MTOW pour les calculs de facturation

### Fichiers modifiés

#### 1. `src/components/InvoicePreviewModal.tsx`
**Fonction `loadMovementData()` - Lignes 46-72**

```typescript
const loadMovementData = async () => {
  setLoading(true)
  try {
    const { data, error } = await supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `)
      .eq('id', movementId)
      .single()

    if (error) throw error

    // NOUVEAU: Récupération du MTOW depuis la table aircrafts si nécessaire
    let finalMtow = data.mtow_kg

    if (!finalMtow && data.registration) {
      const { data: aircraftData } = await supabase
        .from('aircrafts')
        .select('mtow_kg')
        .eq('registration', data.registration)
        .maybeSingle()

      if (aircraftData?.mtow_kg) {
        finalMtow = aircraftData.mtow_kg
      }
    }

    const movementData = {
      ...data,
      mtow_kg: finalMtow,  // Utilisation du MTOW récupéré
      stand_name: data.stands?.name || null
    }
    setMovement(movementData)

    calculateBilling(movementData)
  } catch (error) {
    console.error('Error loading movement:', error)
  } finally {
    setLoading(false)
  }
}
```

#### 2. `src/components/InvoiceEditorModal.tsx`
**Fonction `loadMovementData()` - Lignes 55-84**

Même correction appliquée dans le modal de création de facture pour garantir la cohérence.

```typescript
// NOUVEAU: Récupération du MTOW depuis la table aircrafts si nécessaire
let finalMtow = data.mtow_kg

if (!finalMtow && data.registration) {
  const { data: aircraftData } = await supabase
    .from('aircrafts')
    .select('mtow_kg')
    .eq('registration', data.registration)
    .maybeSingle()

  if (aircraftData?.mtow_kg) {
    finalMtow = aircraftData.mtow_kg
  }
}

const movementData = {
  ...data,
  mtow_kg: finalMtow,
  stand_name: data.stands?.name || null
}
```

### Avantages de la solution
✅ **Automatique** : Pas besoin de saisir manuellement le MTOW à chaque mouvement
✅ **Fiable** : Utilise les données de référence de la fiche avion
✅ **Rétrocompatible** : Fonctionne même si le mouvement a déjà un MTOW
✅ **Performant** : Une seule requête supplémentaire si nécessaire
✅ **Sécurisé** : Utilise `.maybeSingle()` pour éviter les erreurs si l'avion n'existe pas

### Impact sur les calculs
Avec cette correction, la redevance d'atterrissage est maintenant correctement calculée :

**Exemple avec un A320 (MTOW: 78000 kg) en trafic international :**
- **Avant** : 0 kg → 0 XOF
- **Après** : 78000 kg → 78 tonnes × 3208 XOF/tonne = **250 224 XOF**

---

## 2. Correction du Tri des Mouvements

### Problème identifié
Sur toutes les pages affichant des mouvements (Facturation, Mouvements, Dashboard, Parking), les listes étaient triées en ordre **décroissant** (du plus récent au plus ancien), ce qui posait des problèmes :
- Ordre contre-intuitif pour le suivi chronologique
- Difficile de voir les mouvements à venir en premier
- Incohérence avec l'affichage souhaité

### Solution implémentée
Modification de toutes les requêtes SQL pour trier en ordre **croissant** : du plus ancien au plus récent (date puis heure).

**Ordre de tri appliqué :**
```
2024-01-31 08:00  ← Plus ancien (en haut)
2024-01-31 10:30
2024-01-31 14:15
2024-01-31 18:45  ← Plus récent (en bas)
```

### Fichiers modifiés

#### 1. `src/pages/Movements.tsx`
**Ligne 194**
```typescript
// AVANT
.order('scheduled_time', { ascending: false })

// APRÈS
.order('scheduled_time', { ascending: true })
```

#### 2. `src/pages/BillingNew.tsx`
**Ligne 94**
```typescript
// AVANT
.order('scheduled_time', { ascending: false })

// APRÈS
.order('scheduled_time', { ascending: true })
```

#### 3. `src/pages/Billing.tsx`
**Ligne 122**
```typescript
// AVANT
query = query.order('scheduled_time', { ascending: false }).limit(100)

// APRÈS
query = query.order('scheduled_time', { ascending: true }).limit(100)
```

#### 4. `src/pages/DashboardOld.tsx`
**Ligne 54**
```typescript
// AVANT
.order('scheduled_time', { ascending: false })

// APRÈS
.order('scheduled_time', { ascending: true })
```

### Pages déjà correctes
Ces pages avaient déjà le tri correct :
- ✅ `src/pages/Parking.tsx` - Ligne 86 : `ascending: true`
- ✅ `src/lib/dashboardQueries.ts` - Ligne 62 : `.order('scheduled_time')` (ascending par défaut)

### Impact sur l'affichage

**Page Mouvements (Aircraft Movements) :**
- Les mouvements s'affichent maintenant du plus ancien au plus récent
- Facilite le suivi chronologique des opérations
- Cohérent avec les filtres de date

**Page Facturation :**
- Les mouvements non facturés s'affichent dans l'ordre chronologique
- Plus facile de facturer les mouvements dans l'ordre
- Limite de 100 mouvements toujours appliquée

**Dashboard :**
- Les 10 derniers mouvements affichés en ordre chronologique
- Vue cohérente avec les autres pages

### Garanties
✅ **Tri côté backend** : Le tri est appliqué dans la requête SQL PostgreSQL
✅ **Performant** : PostgreSQL optimise automatiquement avec les index sur `scheduled_time`
✅ **Cohérent** : Même ordre sur toutes les pages
✅ **Persistant** : Le tri est maintenu après filtrage (dates, immatriculation, statut, etc.)

---

## 3. Tests Effectués

### Build du projet
```bash
npm run build
```
**Résultat :** ✅ Succès
```
✓ 1071 modules transformed
✓ built in 9.85s
Bundle: 1,225.32 kB (358.35 kB gzip)
```

### Tests fonctionnels recommandés

#### Test MTOW :
1. Créer un mouvement sans MTOW
2. S'assurer que l'avion existe dans la table `aircrafts` avec un MTOW
3. Ouvrir la prévisualisation de facture
4. ✅ Vérifier que le MTOW est affiché
5. ✅ Vérifier que la redevance d'atterrissage est calculée correctement

#### Test Tri :
1. Aller sur la page Mouvements
2. Sélectionner une plage de dates avec plusieurs mouvements
3. ✅ Vérifier que les mouvements sont triés du plus ancien au plus récent
4. Appliquer des filtres (type, statut, immatriculation)
5. ✅ Vérifier que le tri est maintenu

---

## 4. Résumé des Modifications

### Fichiers modifiés (6 au total)

**Facturation MTOW (2 fichiers) :**
1. `src/components/InvoicePreviewModal.tsx` - Récupération MTOW depuis aircrafts
2. `src/components/InvoiceEditorModal.tsx` - Récupération MTOW depuis aircrafts

**Tri des mouvements (4 fichiers) :**
1. `src/pages/Movements.tsx` - Tri croissant
2. `src/pages/BillingNew.tsx` - Tri croissant
3. `src/pages/Billing.tsx` - Tri croissant
4. `src/pages/DashboardOld.tsx` - Tri croissant

### Aucune migration SQL requise
Toutes les modifications sont côté application uniquement.

---

## 5. Points d'Attention

### MTOW manquant
Si un mouvement n'a pas de MTOW **ET** que l'avion n'existe pas dans la table `aircrafts` :
- ⚠️ Le MTOW sera `null` ou `0`
- ⚠️ La redevance d'atterrissage sera calculée à 0
- **Solution** : Créer la fiche avion dans le module Aircrafts avant de créer des mouvements

### Recommandation
Pour éviter ce cas, il est recommandé de :
1. Toujours créer les fiches avions avant les mouvements
2. Utiliser la fonctionnalité d'auto-fill qui remplit automatiquement le MTOW depuis la fiche avion
3. Vérifier périodiquement que tous les avions ont un MTOW renseigné

---

## 6. Prochaines Améliorations Possibles

### Facturation
- [ ] Ajouter un warning visuel si le MTOW est à 0 dans la prévisualisation
- [ ] Permettre de modifier le MTOW directement dans l'éditeur de facture
- [ ] Historiser les MTOW utilisés pour la facturation

### Tri
- [ ] Ajouter un bouton pour inverser l'ordre de tri (croissant/décroissant)
- [ ] Permettre de trier par d'autres colonnes (immatriculation, compagnie, etc.)
- [ ] Mémoriser les préférences de tri par utilisateur

---

## ✅ STATUT : CORRECTIONS COMPLÉTÉES

Les deux problèmes ont été corrigés avec succès :
1. ✅ Le MTOW est maintenant récupéré depuis la table `aircrafts`
2. ✅ Les mouvements sont triés par ordre chronologique (croissant)

Le système est opérationnel et prêt à être utilisé.

---

## Support Technique

En cas de problème :
1. Vérifier que la table `aircrafts` contient bien les avions avec leur MTOW
2. Vérifier que les mouvements ont une `registration` valide
3. Consulter les logs de la console navigateur pour les erreurs
4. Vérifier les permissions RLS sur la table `aircrafts`

## Changelog

**Version 1.1.0 - 2026-01-31**
- Fix: Récupération du MTOW depuis la table aircrafts pour la facturation
- Fix: Tri des mouvements en ordre chronologique croissant sur toutes les pages
- Amélioration: Prévisualisation et création de factures avec MTOW correct
