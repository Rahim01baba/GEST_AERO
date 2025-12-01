# Débogage Auto-complétion Aéronef 🔧

## ✅ Vérifications effectuées

La fonction RPC fonctionne correctement côté serveur. Les tests montrent que :
- ✅ La fonction `lookup_aircraft_by_registration` est accessible
- ✅ Elle retourne les bonnes données (CNROH → B738, 79000kg, Royal Air Maroc)
- ✅ Elle est insensible à la casse
- ✅ Les permissions sont correctes

## 🔍 Comment vérifier si ça fonctionne dans le navigateur

### 1. Ouvrir la Console du navigateur

**Chrome/Edge/Firefox :**
- Appuyez sur `F12` ou `Ctrl+Shift+I`
- Onglet **Console**

### 2. Créer un nouveau mouvement

1. Aller sur la page **Movements**
2. Cliquer sur **"+ Nouveau Mouvement"**
3. Saisir une immatriculation (ex: `CNROH`)
4. **Appuyer sur Tab** ou cliquer en dehors du champ

### 3. Observer les logs dans la console

Vous devriez voir :

```
🔍 Looking up aircraft: CNROH
📊 RPC Response: Array(1)
✅ Aircraft found: {mtow_kg: 79000, aircraft_type: "B738", ...}
```

## 📊 Scénarios possibles

### ✅ Scénario 1 : Tout fonctionne

**Console :**
```javascript
🔍 Looking up aircraft: CNROH
📊 RPC Response: [{mtow_kg: 79000, airline_name: "Royal Air Maroc", aircraft_type: "B738"}]
✅ Aircraft found: {mtow_kg: 79000, ...}
```

**Formulaire :**
- Type : `B738` ✅
- MTOW : `79000` ✅
- Opérateur : `Royal Air Maroc` ✅
- Toast : "Données aéronef pré-remplies depuis le registre" ✅

### ❌ Scénario 2 : Erreur RPC

**Console :**
```javascript
🔍 Looking up aircraft: CNROH
❌ RPC Error: {message: "...", ...}
```

**Solution :**
- Vérifier la connexion Supabase
- Vérifier les variables d'environnement
- Vérifier les permissions RLS

### ℹ️ Scénario 3 : Avion non trouvé

**Console :**
```javascript
🔍 Looking up aircraft: XXXXXX
📊 RPC Response: []
ℹ️ No aircraft found for: XXXXXX
```

**Solution :**
- L'avion n'existe pas dans la base
- Ajouter l'avion dans la table `aircrafts`

### 🚫 Scénario 4 : Aucun log

**Problème :** Le handler `onBlur` n'est pas déclenché

**Solutions possibles :**
1. Vider le cache du navigateur (`Ctrl+Shift+Delete`)
2. Recharger l'application (`Ctrl+F5`)
3. Vérifier que vous avez bien quitté le champ (Tab ou clic ailleurs)

## 🧪 Tests rapides dans la console

Vous pouvez tester directement dans la console du navigateur :

```javascript
// Importer le client Supabase (si disponible dans window)
const { data, error } = await window.supabase?.rpc('lookup_aircraft_by_registration', {
  p_registration: 'CNROH'
})
console.log('Data:', data)
console.log('Error:', error)
```

Ou depuis le terminal :

```bash
node test-rpc.js
```

## 🔧 Solutions courantes

### Problème : Champs ne se remplissent pas

**Vérifier :**
1. Les logs apparaissent-ils dans la console ?
2. Y a-t-il une erreur rouge dans la console ?
3. Le toast de succès apparaît-il ?
4. Les données sont-elles retournées par le RPC ?

**Actions :**
```javascript
// Test manuel dans la console
const response = await fetch('YOUR_SUPABASE_URL/rest/v1/rpc/lookup_aircraft_by_registration', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ p_registration: 'CNROH' })
})
const result = await response.json()
console.log(result)
```

### Problème : Erreur de permission

Si vous voyez `permission denied for function lookup_aircraft_by_registration` :

```sql
-- Dans Supabase SQL Editor
GRANT EXECUTE ON FUNCTION lookup_aircraft_by_registration TO anon;
GRANT EXECUTE ON FUNCTION lookup_aircraft_by_registration TO authenticated;
```

### Problème : Table aircrafts vide

```sql
-- Vérifier le nombre d'avions
SELECT COUNT(*) FROM aircrafts;

-- Si 0, les réinsérer depuis movements
INSERT INTO aircrafts (registration, type, mtow_kg, operator)
SELECT DISTINCT
  registration,
  aircraft_type as type,
  CASE
    WHEN aircraft_type = 'B738' THEN 79000
    WHEN aircraft_type = 'A320' THEN 78000
    WHEN aircraft_type = 'A359' THEN 280000
    -- etc.
  END as mtow_kg,
  CASE
    WHEN registration LIKE 'TUT%' THEN 'Tunisair'
    WHEN registration LIKE 'CN%' THEN 'Royal Air Maroc'
    -- etc.
  END as operator
FROM aircraft_movements
WHERE registration NOT IN (SELECT registration FROM aircrafts)
ON CONFLICT (registration) DO NOTHING;
```

## 📝 Immatriculations de test

Utilisez ces immatriculations pour tester :

| Immatriculation | Type attendu | MTOW | Opérateur |
|-----------------|--------------|------|-----------|
| CNROH | B738 | 79000 | Royal Air Maroc |
| TUTSV | A320 | 78000 | Tunisair |
| FHTYE | A359 | 280000 | Air France |
| 5YKYF | B738 | 79000 | Kenya Airways |
| XTABZ | E195 | 52300 | Air Senegal |
| ETAVD | A359 | 280000 | Ethiopian Airlines |

## 🆘 Support

Si après toutes ces vérifications ça ne fonctionne toujours pas :

1. **Copier les logs de la console** (tout le contenu)
2. **Faire une capture d'écran** du formulaire
3. **Vérifier** :
   ```bash
   # Test RPC depuis terminal
   node test-rpc.js
   ```
4. **Noter** :
   - Navigateur et version
   - Message d'erreur exact
   - Immatriculation testée

## ✅ Checklist de débogage

- [ ] Console ouverte (F12)
- [ ] Logs visibles (🔍, 📊, ✅)
- [ ] Pas d'erreur rouge
- [ ] Toast de succès apparaît
- [ ] Champs Type/MTOW/Opérateur remplis
- [ ] Test avec plusieurs immatriculations
- [ ] Cache navigateur vidé
- [ ] Page rechargée (Ctrl+F5)

## 🎯 Prochaine étape

Une fois que vous voyez les logs dans la console, partagez-les pour qu'on puisse identifier le problème exact !
