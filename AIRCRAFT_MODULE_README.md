# Module Aircraft - Airport Manager

## Vue d'ensemble

Le module Aircraft permet de gérer une base de données d'aéronefs avec leurs caractéristiques techniques. Ce module est accessible à tous les utilisateurs authentifiés avec des permissions selon leur rôle.

## Permissions RLS

- **ADMIN, AIM, OPS** : Lecture, création, modification, suppression
- **ATS** : Lecture seule
- **FIN** : Accès indirect via le module Facturation

## Structure de la table `aircrafts`

| Colonne | Type | Description | Obligatoire |
|---------|------|-------------|-------------|
| id | uuid | Identifiant unique | ✓ (auto) |
| registration | text | Immatriculation (ex: F-HBNA) | ✓ |
| type | text | Type d'aéronef (ex: ATR72, A320) | ✓ |
| mtow_kg | numeric | Poids maximal au décollage (kg) | - |
| seats | integer | Nombre de places passagers | - |
| length_m | numeric | Longueur en mètres | - |
| wingspan_m | numeric | Envergure en mètres | - |
| height_m | numeric | Hauteur en mètres | - |
| operator | text | Compagnie opératrice | - |
| remarks | text | Remarques libres | - |
| created_at | timestamp | Date de création | ✓ (auto) |
| updated_at | timestamp | Dernière modification | ✓ (auto) |

## Routes disponibles

- `/aircrafts` - Liste des aéronefs
- `/aircrafts/new` - Création d'un nouvel avion
- `/aircrafts/:id` - Édition d'un avion existant

## Import de données existantes

### Méthode 1 : Fichier CSV

Créez un fichier CSV avec les colonnes suivantes (respectez l'ordre) :

```csv
registration,type,mtow_kg,seats,length_m,wingspan_m,height_m,operator,remarks
F-HBNA,ATR72-600,22800,72,27.2,27.0,7.7,Air Côte d'Ivoire,Configuration 72 sièges
TU-TSK,A320-214,78000,180,37.6,35.8,11.8,Air Côte d'Ivoire,Configuration 180 sièges
```

**Exécution :**
```bash
node import-aircrafts.js votre-fichier.csv
```

### Méthode 2 : Fichier JSON

Créez un fichier JSON avec un tableau d'objets :

```json
[
  {
    "registration": "F-HBNA",
    "type": "ATR72-600",
    "mtow_kg": 22800,
    "seats": 72,
    "length_m": 27.2,
    "wingspan_m": 27.0,
    "height_m": 7.7,
    "operator": "Air Côte d'Ivoire",
    "remarks": "Configuration 72 sièges"
  }
]
```

**Exécution :**
```bash
node import-aircrafts.js votre-fichier.json
```

### Méthode 3 : Import direct dans Supabase

1. Connectez-vous au Dashboard Supabase
2. Allez dans **Table Editor** > `aircrafts`
3. Cliquez sur **Insert** > **Import data from CSV**
4. Sélectionnez votre fichier CSV
5. Mappez les colonnes
6. Cliquez sur **Import**

### Méthode 4 : SQL direct

```sql
INSERT INTO aircrafts (registration, type, mtow_kg, seats, operator)
VALUES
  ('F-HBNA', 'ATR72-600', 22800, 72, 'Air Côte d''Ivoire'),
  ('TU-TSK', 'A320-214', 78000, 180, 'Air Côte d''Ivoire');
```

## Exemples de données fournis

Le projet inclut deux fichiers d'exemple :

- `aircrafts-example.csv` - Exemple au format CSV
- `aircrafts-example.json` - Exemple au format JSON

Ces fichiers contiennent 8 aéronefs de démonstration que vous pouvez importer directement :

```bash
node import-aircrafts.js aircrafts-example.csv
```

ou

```bash
node import-aircrafts.js aircrafts-example.json
```

## Fonctionnalités de l'interface

### Page liste (`/aircrafts`)

- **Filtres** : Immatriculation, Type, Opérateur
- **Tri** : Par immatriculation (ordre alphabétique)
- **Actions** :
  - Bouton "+ Nouvel avion"
  - Éditer un avion (bouton ✏️)
  - Supprimer un avion (bouton 🗑️ avec confirmation)

### Page création/édition

- **Formulaire structuré en 3 sections** :
  1. Informations principales (immatriculation, type, MTOW, places)
  2. Dimensions (longueur, envergure, hauteur)
  3. Opérateur et remarques

- **Validation** :
  - Immatriculation obligatoire et unique
  - Type d'aéronef obligatoire
  - Immatriculation convertie automatiquement en majuscules

- **Actions** :
  - Enregistrer
  - Supprimer (mode édition uniquement)
  - Annuler (retour à la liste)

## Intégration avec les autres modules

Le module Aircraft peut être utilisé pour :

1. **Pré-remplir les informations** dans le module Movements
2. **Auto-complétion** des champs MTOW et type d'avion
3. **Base de référence** pour la facturation
4. **Statistiques** sur la flotte desservant l'aéroport

## Notes techniques

- **Indexes créés** : `registration`, `type`, `operator` pour des recherches rapides
- **Trigger** : Mise à jour automatique de `updated_at` à chaque modification
- **Unicité** : L'immatriculation est unique dans la base
- **Normalisation** : Les immatriculations sont toujours en majuscules

## Support

Pour toute question ou problème :
1. Vérifiez que les variables d'environnement sont correctes dans `.env`
2. Vérifiez vos permissions RLS selon votre rôle
3. Consultez les logs d'erreur dans la console du navigateur
