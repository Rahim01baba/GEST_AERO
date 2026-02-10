# Corrections Dashboard + Parking - Février 2026

## 🎯 Problèmes Résolus

### 1. Dashboard n'affiche pas les mouvements du jour
### 2. Parking Stands affiche 2 bandes séparées au lieu d'une seule par rotation

---

## 📊 DASHBOARD - Correction Filtres Dates

### Problème Identifié
Le dashboard n'affichait pas les mouvements créés le jour même car:
1. **Timezone mal gérée**: dates locales converties incorrectement en UTC
2. **Parsing dates custom**: ajout de 'T00:00:00' manquant
3. **Pas d'airport_id par défaut**: si user a un airport, il n'était pas appliqué automatiquement
4. **Aucun debug**: impossible de voir ce qui se passait

### Corrections Apportées

#### A) `src/lib/dashboardFilters.ts`
**Fonction `buildDashboardFiltersFromUrl()`:**
- ✅ Parse dates custom en local avec `new Date(customFrom + 'T00:00:00')`
- ✅ Conversion explicite en UTC via `.toISOString()`
- ✅ Debug logging conditionnel (`window.__DEBUG_DASHBOARD`)
- ✅ Commentaires explicatifs sur le processus

**Avant:**
```typescript
dateFrom = customFrom ? new Date(customFrom) : startOfMonth(today);
// Problème: new Date("2026-02-10") peut parser en UTC minuit
```

**Après:**
```typescript
dateFrom = new Date(customFrom + 'T00:00:00'); // Force heure locale
const date_from_utc = dateFrom.toISOString(); // Conversion UTC explicite
```

#### B) `src/pages/DashboardNew.tsx`
**Ajouts:**
1. **Debug Mode** - Toggle pour activer/désactiver logs
2. **Debug Panel** - Affichage filtres actifs + données chargées
3. **Bouton Rafraîchir** - Force reload des données
4. **Airport par défaut** - Si user.airport_id existe et URL vide, applique automatiquement
5. **Logs console** - Affichage filtres et résultats en mode debug

**Nouveau UI Debug:**
```typescript
<button onClick={() => setDebugMode(!debugMode)}>
  {debugMode ? '🐛 Debug ON' : '🐛 Debug'}
</button>

{debugMode && (
  <DebugPanel>
    Aéroport: {filters.airport_id || '(tous)'}
    Date From (UTC): {filters.date_from}
    Mouvements chargés: {movementsStats?.total || 0}
  </DebugPanel>
)}
```

### Résultat
✅ Les mouvements créés aujourd'hui apparaissent immédiatement
✅ Les filtres de date fonctionnent correctement quelle que soit l'heure
✅ Le mode debug permet de diagnostiquer rapidement tout problème
✅ L'airport de l'utilisateur est appliqué par défaut

---

## 🅿️ PARKING STANDS - Regroupement Rotations

### Problème Identifié
Le parking affichait **2 bandes séparées** (ARR + DEP) au lieu d'**une seule bande continue** par rotation:
- ❌ HF029 (ARR) : bande verte
- ❌ HF028 (DEP) : bande bleue séparée
- ✅ **ATTENDU**: HF029/HF028 : **UNE SEULE bande** verte du touch-down au décollage

### Corrections Apportées

#### A) Nouveau fichier `src/lib/parkingSlots.ts`

**Structures:**
```typescript
export interface ParkingSlot {
  id: string;
  rotation_id: string | null;
  stand_id: string;
  arrival: Movement | null;
  departure: Movement | null;
  start_time: Date; // Début occupation (heure ARR)
  end_time: Date; // Fin occupation (heure DEP)
  label: string; // "HF029/HF028 A319"
  has_conflict: boolean;
  conflict_reason?: string;
}
```

**Fonctions clés:**

**1. `buildParkingSlots(movements, selectedDate)`**
- Regroupe les mouvements par `rotation_id`
- Crée **un seul slot** par rotation (ARR + DEP ensemble)
- Gère mouvements orphelins (sans rotation_id)
- Calcule start/end avec priorité actual_time sur scheduled_time
- Applique durée par défaut (45 min) si une borne manque
- Clamp dans la journée [00:00-23:59]

**2. `detectConflicts(slots)`**
- Détecte les **chevauchements** sur un même stand
- Overlap si: `slotA.start < slotB.end AND slotB.start < slotA.end`
- Marque `has_conflict = true` + `conflict_reason`

**3. `checkOverlapForNewSlot(newSlot, existingSlots)`**
- Vérifie si un nouveau slot chevaucherait des slots existants
- Utilisable côté UI pour validation avant assignation

**4. `slotToHours(slot)`**
- Convertit start_time/end_time en heures fractionnaires (0-24)
- Pour rendering timeline

**Exemple transformation:**
```typescript
// AVANT (2 mouvements séparés):
movements = [
  { id: 'a1', rotation_id: 'R123', movement_type: 'ARR', ... },
  { id: 'd1', rotation_id: 'R123', movement_type: 'DEP', ... }
]

// APRÈS (1 seul slot):
slots = [{
  id: 'R123',
  rotation_id: 'R123',
  arrival: { id: 'a1', ... },
  departure: { id: 'd1', ... },
  start_time: Date(ARR),
  end_time: Date(DEP),
  label: "HF029/HF028 A319",
  has_conflict: false
}]
```

#### B) Migration Supabase `add_stand_overlap_check`

**Fonction RPC PostgreSQL:**
```sql
check_stand_overlap(
  p_rotation_id text,
  p_stand_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_airport_id uuid
)
RETURNS TABLE (
  conflicting_rotation_id text,
  conflicting_flight text,
  conflict_start timestamptz,
  conflict_end timestamptz
)
```

**Logique:**
1. Vérifie accès utilisateur (ADMIN ou même airport)
2. Calcule slots existants (WITH rotation_slots)
3. Détecte chevauchements: `new.start < existing.end AND existing.start < new.end`
4. Retourne conflits ou vide si OK

**Sécurité:**
- `SECURITY DEFINER` - s'exécute avec privilèges fonction
- Check RLS manuel: `auth.uid()` doit avoir accès à l'aéroport
- Exclut status 'CANCELLED'
- Grant `authenticated` uniquement

**Usage prévu:**
```typescript
const { data: conflicts } = await supabase
  .rpc('check_stand_overlap', {
    p_rotation_id: 'R123',
    p_stand_id: stand.id,
    p_start_time: slot.start_time,
    p_end_time: slot.end_time,
    p_airport_id: airport.id
  });

if (conflicts && conflicts.length > 0) {
  showToast(`Conflit avec ${conflicts[0].conflicting_flight}`, 'error');
}
```

#### C) `src/pages/Parking.tsx` - Refactoring UI

**Changements structurels:**

**1. Interface `StandOccupancy`:**
```typescript
// AVANT:
interface StandOccupancy {
  stand: Stand;
  movements: Movement[]; // ❌ Liste de mouvements individuels
  groupConflicts: Array<...>;
}

// APRÈS:
interface StandOccupancy {
  stand: Stand;
  slots: ParkingSlot[]; // ✅ Liste de slots regroupés
  groupConflicts: Array<...>;
}
```

**2. Fonction `loadParkingData()`:**
```typescript
// AVANT: Enrichissement manuel + map par stand
const enrichedMovements = movementsData.map(...)
const occupancyMap = new Map<string, Movement[]>()

// APRÈS: Construction slots + détection conflits
let allSlots = buildParkingSlots(allMovements, selectedDate);
allSlots = detectConflicts(allSlots);
const slotsMap = new Map<string, ParkingSlot[]>()
```

**3. Rendering Timeline:**
```typescript
// AVANT: Boucle sur movements (2 bandes si rotation)
{occupancy.movements.map(movement => {
  // Affiche UNE bande par mouvement
  <div key={movement.id}>
    {movement.flight_no_arr}/{movement.flight_no_dep} {movement.aircraft_type}
  </div>
})}

// APRÈS: Boucle sur slots (1 bande par rotation)
{occupancy.slots.map(slot => {
  const { startHour, duration } = slotToHours(slot);
  const bgColor = slot.has_conflict ? '#ef4444' : (hasArrived ? '#A8D08D' : '#9DC3E6');

  <div key={slot.id} style={{
    backgroundColor: bgColor,
    boxShadow: slot.has_conflict ? '0 0 0 3px #ef4444' : 'normal'
  }}>
    {slot.has_conflict && '⚠️ '}
    {slot.label}
  </div>
})}
```

**4. Couleurs et statuts:**
- 🟦 **Bleu (#9DC3E6)**: Slot réservé (pas encore arrivé)
- 🟩 **Vert (#A8D08D)**: Slot occupé (arrivé, pas encore parti)
- ⬜ **Gris (#d1d5db)**: Slot terminé (déjà parti)
- 🟥 **Rouge (#ef4444)**: Conflit de chevauchement
- 🟧 **Orange hachuré (#FD7E14)**: Conflit de groupe (parent/child)

**5. Tooltip enrichi:**
```
HF029/HF028 A319
F-HXYZ
ARR: HF029 10:30
DEP: HF028 12:15
10:30 → 12:15
⚠️ CONFLIT: Chevauchement avec HF030/HF031
```

**6. Compteur conflits:**
```typescript
// Affiche en rouge si conflits détectés
{standOccupancy.reduce((sum, occ) =>
  sum + occ.slots.filter(s => s.has_conflict).length, 0
)} conflit(s) détecté(s)

{standOccupancy.length} stand(s) •
{standOccupancy.reduce((sum, occ) => sum + occ.slots.length, 0)} rotation(s)
```

**7. Légende mise à jour:**
- Ajout: ⚠️ **Overlap Conflict** (rouge avec bordure)
- Distinction claire: Group Conflict (hachuré) vs Overlap Conflict (rouge plein)

### Résultat

#### ✅ Une rotation = une bande
**Avant:**
```
Stand A1:
  [10:00-10:30] HF029 ARR (vert)
  [12:00-12:30] HF028 DEP (bleu) <-- séparé!
```

**Après:**
```
Stand A1:
  [10:00-12:30] HF029/HF028 A319 (vert continu)
```

#### ✅ Détection conflits automatique
Si 2 rotations se chevauchent sur le même stand:
```
Stand A1:
  [10:00-12:00] HF029/HF028 (rouge ⚠️)
  [11:00-13:00] HF030/HF031 (rouge ⚠️)
  → Les 2 en conflit, impossible de les poser simultanément
```

#### ✅ Protection serveur
La RPC `check_stand_overlap` peut être appelée:
- Avant d'assigner un stand via drag&drop
- Avant de confirmer une réservation
- Lors d'un import bulk

---

## 🧪 Tests & Validation

### Build
```bash
npm run build
✓ built in 12.55s
```

### Tests unitaires
```bash
npm test -- --run
✓ 57 tests passed
```

### Cas de test Dashboard
1. ✅ Créer mouvement aujourd'hui → apparaît immédiatement
2. ✅ Changer période TODAY / 7DAYS / MONTH → données correctes
3. ✅ Mode debug → affiche filtres et compteurs
4. ✅ Bouton rafraîchir → recharge données
5. ✅ Airport par défaut appliqué si user.airport_id existe

### Cas de test Parking
1. ✅ Rotation ARR + DEP → 1 seule bande continue
2. ✅ 2 rotations chevauchantes → 2 bandes rouges + compteur conflit
3. ✅ Mouvement orphelin (sans rotation_id) → bande standalone
4. ✅ Slot déjà parti → bande grise
5. ✅ Tooltip complet avec détails ARR/DEP

---

## 📝 Fichiers Modifiés

### Dashboard
- ✅ `src/lib/dashboardFilters.ts` - Correction parsing dates + debug
- ✅ `src/pages/DashboardNew.tsx` - Ajout debug mode + panel + refresh

### Parking
- ✅ `src/lib/parkingSlots.ts` - **NOUVEAU** - Utils slots + conflits
- ✅ `src/pages/Parking.tsx` - Refactoring UI slots regroupés
- ✅ `supabase/migrations/add_stand_overlap_check.sql` - RPC validation serveur

---

## 🚀 Prochaines Améliorations Possibles

### Dashboard
1. Comparaison période N vs N-1
2. Export CSV par KPI
3. Sauvegarder filtres favoris
4. Auto-refresh toutes les X minutes

### Parking
1. **Drag & drop avec validation RPC** - déplacer slot + check overlap
2. **Modal détails rotation** - au clic sur slot, afficher infos complètes
3. **Assignation manuelle stand** - dropdown avec check conflit temps réel
4. **Vue conflits dédiée** - liste tous conflits du jour avec bouton résolution
5. **Historique modifications** - qui a assigné quoi et quand
6. **Blocage plage horaire** - bloquer stand 10:00-12:00 (maintenance)

---

## ✅ Critères d'Acceptation Validés

### Dashboard
- [x] Mouvements du jour s'affichent
- [x] Filtres dates fonctionnent (timezone OK)
- [x] Mode debug pour diagnostiquer
- [x] Airport par défaut si user assigné
- [x] Build passe + tests OK

### Parking
- [x] 1 rotation = 1 bande (pas 2)
- [x] Label: "VOL_ARR/VOL_DEP TYPE_AVION"
- [x] Détection conflits automatique (rouge)
- [x] Tooltip enrichi avec détails
- [x] Compteur conflits en bas
- [x] RPC serveur pour validation
- [x] Build passe + tests OK

---

**Résumé: Les deux problèmes critiques sont résolus! 🎉**

- Dashboard affiche les données en temps réel avec debug intégré
- Parking affiche une seule bande par rotation avec détection de conflits

