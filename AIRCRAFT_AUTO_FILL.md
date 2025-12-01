# Auto-complétion des Informations d'Aéronef

## ✨ Fonctionnalité

Lorsque vous créez un nouveau mouvement dans la page **Movements**, les informations de l'avion sont **automatiquement renseignées** dès que vous saisissez l'immatriculation.

## 🚀 Comment ça marche

### 1. Créer un nouveau mouvement

1. Cliquez sur le bouton **"+ Nouveau Mouvement"**
2. Dans le formulaire, saisissez l'**immatriculation** de l'avion (ex: `CNROH`, `TUTSV`, `FHTYE`)
3. **Appuyez sur Tab ou cliquez en dehors** du champ immatriculation
4. ✅ Les champs suivants sont automatiquement remplis :
   - **Type d'aéronef** (ex: B738, A320, A359)
   - **MTOW (kg)** (Masse maximale au décollage)
   - **Opérateur** (Compagnie aérienne)

### 2. Notification de succès

Si l'avion est trouvé dans la base de données, vous verrez :
```
✅ Données aéronef pré-remplies depuis le registre
```

### 3. Si l'avion n'existe pas

Si l'immatriculation n'est pas dans la base :
- Aucun message d'erreur
- Les champs restent vides
- Vous pouvez les remplir manuellement

## 🔧 Technique

### Fonction RPC Supabase

La fonction `lookup_aircraft_by_registration` interroge la table `aircrafts` :

```sql
SELECT * FROM lookup_aircraft_by_registration('CNROH');
```

**Résultat :**
```json
{
  "mtow_kg": 79000,
  "airline_code": null,
  "airline_name": "Royal Air Maroc",
  "aircraft_type": "B738"
}
```

### Sensibilité à la casse

La fonction est **insensible à la casse** :
- `CNROH` = `cnroh` = `CnRoH` ✅

### Base de données

**Table : `aircrafts`**
```
- registration (text) : Immatriculation unique
- type (text) : Type d'aéronef (B738, A320, etc.)
- mtow_kg (numeric) : Masse maximale au décollage
- operator (text) : Compagnie aérienne
- seats (integer) : Nombre de sièges
- length_m, wingspan_m, height_m : Dimensions
- remarks : Remarques
```

**Données disponibles :**
- ✅ **269 avions** dans la base
- Immatriculations extraites des mouvements existants
- MTOW calculé selon le type d'avion
- Opérateur déduit du préfixe d'immatriculation

## 📋 Exemples

### Exemple 1 : Royal Air Maroc

**Immatriculation :** `CNROH`

**Auto-rempli :**
- Type : `B738` (Boeing 737-800)
- MTOW : `79000 kg`
- Opérateur : `Royal Air Maroc`

### Exemple 2 : Air France

**Immatriculation :** `FHTYE`

**Auto-rempli :**
- Type : `A359` (Airbus A350-900)
- MTOW : `280000 kg`
- Opérateur : `Air France`

### Exemple 3 : Tunisair

**Immatriculation :** `TUTSV`

**Auto-rempli :**
- Type : `A320` (Airbus A320)
- MTOW : `78000 kg`
- Opérateur : `Tunisair`

### Exemple 4 : Ethiopian Airlines

**Immatriculation :** `ETAVD`

**Auto-rempli :**
- Type : `A359` (Airbus A350-900)
- MTOW : `280000 kg`
- Opérateur : `Ethiopian Airlines`

## 🔍 Préfixes reconnus

| Préfixe | Compagnie |
|---------|-----------|
| `TUT*` | Tunisair |
| `CN*` | Royal Air Maroc |
| `5Y*` | Kenya Airways |
| `ET*` | Ethiopian Airlines |
| `FH*`, `FG*` | Air France |
| `OO*` | Brussels Airlines |
| `XT*` | Air Senegal |

## ➕ Ajouter un nouvel avion

Pour ajouter un avion à la base de données :

### Via l'interface Supabase

```sql
INSERT INTO aircrafts (registration, type, mtow_kg, operator)
VALUES ('N12345', 'B737', 79000, 'American Airlines');
```

### Via le module Aircrafts (si disponible)

Utilisez la page **Aircrafts** pour gérer le registre d'avions.

## 🛡️ Sécurité

- La fonction utilise **SECURITY DEFINER** pour garantir un accès cohérent
- Les données sont en **lecture seule** depuis le formulaire
- Aucune modification de la table `aircrafts` n'est possible via cette fonction

## 📊 Statistiques

**Base actuelle :**
- 269 avions enregistrés
- Types d'avions : B738, A320, A319, A333, A359, B773, E195, DHC8, etc.
- Compagnies : 7+ opérateurs identifiés

## ✅ Avantages

1. **Gain de temps** : Plus besoin de chercher les specs de chaque avion
2. **Précision** : Données cohérentes depuis une source unique
3. **Historique** : Tous les vols d'un même avion ont les mêmes caractéristiques
4. **Facturation** : MTOW correct pour calculer les redevances

## 🔄 Mise à jour

La base d'avions se remplit automatiquement au fur et à mesure des mouvements enregistrés.

Pour re-synchroniser depuis les mouvements existants :

```sql
INSERT INTO aircrafts (registration, type, mtow_kg, operator)
SELECT DISTINCT
  registration,
  aircraft_type as type,
  -- MTOW selon le type
  CASE
    WHEN aircraft_type = 'B738' THEN 79000
    WHEN aircraft_type = 'A320' THEN 78000
    -- etc.
  END as mtow_kg,
  -- Opérateur selon préfixe
  CASE
    WHEN registration LIKE 'TUT%' THEN 'Tunisair'
    WHEN registration LIKE 'CN%' THEN 'Royal Air Maroc'
    -- etc.
  END as operator
FROM aircraft_movements
WHERE registration NOT IN (SELECT registration FROM aircrafts)
ON CONFLICT (registration) DO NOTHING;
```

---

## ✈️ Prêt à l'emploi !

L'auto-complétion fonctionne immédiatement sur tous les formulaires de création de mouvements.

**Testez avec :** CNROH, TUTSV, FHTYE, ETAVD, XTABZ, etc.
