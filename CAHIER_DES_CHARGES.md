# 📋 CAHIER DES CHARGES COMPLET - Airport Manager

**Application:** Airport Manager
**Version:** 2.2.1
**Date:** 2025-11-15
**Statut:** Production

---

## 📑 TABLE DES MATIÈRES

1. [Présentation Générale](#1-présentation-générale)
2. [Contexte et Objectifs](#2-contexte-et-objectifs)
3. [Architecture Technique](#3-architecture-technique)
4. [Modules Fonctionnels](#4-modules-fonctionnels)
5. [Base de Données](#5-base-de-données)
6. [Gestion des Utilisateurs](#6-gestion-des-utilisateurs)
7. [Sécurité et Permissions](#7-sécurité-et-permissions)
8. [Interfaces Utilisateur](#8-interfaces-utilisateur)
9. [Flux de Travail](#9-flux-de-travail)
10. [Contraintes et Règles Métier](#10-contraintes-et-règles-métier)
11. [Performance et Optimisation](#11-performance-et-optimisation)
12. [Déploiement](#12-déploiement)

---

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Vue d'ensemble

**Airport Manager** est une application web de gestion complète des opérations aéroportuaires destinée aux aéroports de Côte d'Ivoire. Elle permet de gérer en temps réel les mouvements d'aéronefs, les infrastructures, la facturation et les opérations quotidiennes.

### 1.2 Utilisateurs cibles

- **Direction Centrale (DED-C)**: Supervision multi-aéroports
- **Services de Contrôle Aérien (ATS)**: Gestion des mouvements
- **Services d'Information Aéronautique (AIM)**: Gestion du registre aéronefs
- **Services Opérations (OPS)**: Gestion des parkings et stands
- **Services Financiers (FIN)**: Facturation et redevances
- **Administrateurs système**: Configuration globale

### 1.3 Périmètre fonctionnel

#### Fonctionnalités principales:
- ✅ Gestion multi-aéroports
- ✅ Suivi des mouvements d'aéronefs en temps réel
- ✅ Gestion des infrastructures (pistes, parkings, bretelles)
- ✅ Attribution automatique des stands
- ✅ Registre des aéronefs
- ✅ Facturation automatisée
- ✅ Tableaux de bord analytiques
- ✅ Audit et traçabilité
- ✅ Gestion des utilisateurs et permissions

---

## 2. CONTEXTE ET OBJECTIFS

### 2.1 Problématique

Les aéroports ivoiriens nécessitent un système centralisé pour:
- Suivre les mouvements aériens en temps réel
- Optimiser l'utilisation des infrastructures
- Automatiser la facturation des redevances aéroportuaires
- Garantir la traçabilité des opérations
- Faciliter la prise de décision avec des données analytiques

### 2.2 Objectifs métier

#### Objectifs primaires:
1. **Efficacité opérationnelle**: Réduire le temps de traitement des mouvements
2. **Optimisation**: Maximiser l'utilisation des stands et infrastructures
3. **Transparence financière**: Automatiser et tracer la facturation
4. **Conformité**: Respecter les normes OACI/IATA
5. **Décision**: Fournir des KPIs en temps réel

#### Objectifs secondaires:
1. Interface intuitive et moderne
2. Accessibilité multi-sites
3. Performance et réactivité
4. Sécurité des données
5. Évolutivité

### 2.3 Bénéfices attendus

- **Gain de temps**: 50% de réduction du temps de saisie
- **Réduction d'erreurs**: Validation automatique et auto-complétion
- **Traçabilité**: Audit complet de toutes les opérations
- **Visibilité**: Tableaux de bord temps réel
- **Conformité**: Application des règles métier automatique

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Stack technologique

#### Frontend
```
- Framework: React 19.2.0
- Langage: TypeScript 5.9.3
- Routing: React Router DOM 7.9.5
- Build: Vite 7.2.2
- Graphiques: Recharts 3.4.1
- Date management: date-fns 4.1.0
```

#### Backend / BaaS
```
- Platform: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Real-time: Supabase Realtime
- Storage: Supabase Storage (si nécessaire)
```

#### Infrastructure
```
- Hosting: Netlify
- Déploiement: Continuous Deployment (Git push)
- SSL: Automatique (Netlify)
```

### 3.2 Architecture applicative

```
┌─────────────────────────────────────────────┐
│           FRONTEND (React + TS)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Pages   │  │Components│  │   Lib    │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────┬───────────────────────────┘
                  │ HTTPS/REST
┌─────────────────┴───────────────────────────┐
│              SUPABASE (BaaS)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │  PostgRe │  │ Realtime │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

### 3.3 Structure du projet

```
airport-manager/
├── src/
│   ├── components/        # Composants réutilisables
│   │   ├── Layout.tsx
│   │   ├── Toast.tsx
│   │   ├── InfrastructureManagement.tsx
│   │   ├── DashboardFilters.tsx
│   │   └── MovementModal.tsx
│   ├── pages/            # Pages de l'application
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Movements.tsx
│   │   ├── Parking.tsx
│   │   ├── Billing.tsx
│   │   ├── BillingEditor.tsx
│   │   ├── Aircrafts.tsx
│   │   ├── AircraftEditor.tsx
│   │   ├── Airports.tsx
│   │   ├── AirportEditor.tsx
│   │   ├── Users.tsx
│   │   └── Audit.tsx
│   ├── lib/              # Bibliothèques et utilitaires
│   │   ├── supabase.ts
│   │   ├── auth.tsx
│   │   ├── billing.ts
│   │   ├── dashboardQueries.ts
│   │   └── standUtils.ts
│   ├── App.tsx           # Router principal
│   ├── main.tsx          # Point d'entrée
│   └── index.css         # Styles globaux
├── supabase/
│   └── migrations/       # Migrations SQL
├── dist/                 # Build de production
└── public/               # Assets statiques
```

---

## 4. MODULES FONCTIONNELS

### 4.1 Module Dashboard

#### Description
Tableau de bord principal offrant une vue consolidée des opérations en temps réel.

#### Fonctionnalités
1. **Vue d'ensemble**
   - Nombre de mouvements (ARR/DEP)
   - Occupation des stands
   - Trafic passagers
   - Chiffre d'affaires

2. **Filtres**
   - Sélection aéroport (multi-aéroports pour ADMIN)
   - Période (aujourd'hui, 7j, 30j, personnalisée)
   - Type de trafic (NAT/INT)

3. **Graphiques**
   - Évolution du trafic
   - Répartition ARR/DEP
   - Top compagnies
   - Occupation des stands
   - Revenus par catégorie

4. **Indicateurs temps réel**
   - Mouvements en cours
   - Stands disponibles
   - Alertes opérationnelles

#### Règles métier
- ADMIN/DED-C: Vue tous aéroports
- Autres rôles: Vue aéroport affecté uniquement
- Mise à jour automatique toutes les 30 secondes
- Export des données (CSV, PDF)

### 4.2 Module Movements

#### Description
Gestion complète des mouvements d'aéronefs (arrivées et départs).

#### Fonctionnalités
1. **Liste des mouvements**
   - Vue calendrier/liste
   - Filtres: date, type (ARR/DEP), statut, compagnie
   - Recherche: numéro vol, immatriculation
   - Tri personnalisable

2. **Création de mouvement**
   - Saisie manuelle
   - Import CSV/Excel
   - Auto-complétion intelligente:
     - Immatriculation → Type avion + MTOW + Compagnie
     - Type avion → MTOW
   - Validation temps réel

3. **Modification de mouvement**
   - Édition complète (si non verrouillé)
   - Changement de stand
   - Mise à jour statut
   - Ajout informations PAX/FRET

4. **Statuts disponibles**
   ```
   - Planned: Vol planifié
   - Approche: En approche (ARR)
   - Posé: Atterri (ARR)
   - Enregistrement: Embarquement en cours (DEP)
   - Décollé: Parti (DEP)
   - Annulé: Vol annulé
   - Reporté: Vol reporté
   ```

5. **Attribution de stand**
   - Automatique: Basée sur MTOW et disponibilité
   - Manuelle: Sélection par utilisateur
   - Contraintes:
     - MTOW avion ≤ MTOW stand max
     - Stand non bloqué
     - Stand disponible (pas d'avion présent)
     - Gestion stands modulaires (parent/enfant)

6. **Rotation d'avion**
   - Lien ARR ↔ DEP automatique
   - Même immatriculation
   - Libération stand au départ
   - Calcul temps au sol

#### Règles métier
- ATS: Création/édition mouvements
- OPS: Lecture seule + attribution stands
- AIM: Lecture seule
- FIN: Lecture seule
- Mouvement verrouillé (is_locked) non modifiable
- Auto-verrouillage si facture générée
- Historique complet via audit_logs

#### Champs obligatoires
```
- flight_number: Numéro de vol
- aircraft_type: Type d'avion
- registration: Immatriculation
- movement_type: ARR ou DEP
- scheduled_time: Heure prévue
- airport_id: Aéroport
```

#### Champs optionnels
```
- actual_time: Heure réelle
- stand_id: Parking assigné
- mtow_kg: MTOW (auto-rempli si possible)
- airline_code: Code IATA compagnie
- airline_name: Nom compagnie
- origin_iata: Origine (ARR)
- destination_iata: Destination (DEP)
- pax_arr_full/half: Passagers arrivée
- pax_dep_full/half: Passagers départ
- pax_transit: Passagers en transit
- mail_arr_kg/dep_kg: Courrier
- freight_arr_kg/dep_kg: Fret
- rotation_id: Lien rotation
- status: Statut opérationnel
- billable: Facturable (défaut: true)
```

### 4.3 Module Parking

#### Description
Gestion de l'occupation et de la disponibilité des stands en temps réel.

#### Fonctionnalités
1. **Vue d'ensemble**
   - Carte visuelle des stands
   - Statut: Libre / Occupé / Bloqué
   - Avion présent (si occupé)
   - Durée d'occupation

2. **Gestion des stands**
   - Liste complète
   - Filtrage par statut
   - Recherche par nom

3. **Opérations**
   - Bloquer/Débloquer un stand
   - Voir historique d'occupation
   - Mouvements planifiés

4. **Stands modulaires**
   - Gestion parent/enfant
   - Stand parent occupe les enfants
   - Optimisation automatique

#### Règles métier
- OPS: Modification statuts stands
- Autres: Lecture seule
- Stand bloqué = Non assignable
- Stand occupé = Mouvement en cours (ARR sans DEP)
- Libération automatique au départ

### 4.4 Module Billing

#### Description
Gestion de la facturation des redevances aéroportuaires.

#### Fonctionnalités
1. **Liste des factures**
   - Filtres: période, statut, client, aéroport
   - Recherche: numéro facture, immatriculation
   - Tri personnalisable

2. **Création de facture**
   - Sélection mouvements ARR+DEP (rotation)
   - Calcul automatique:
     - Redevances aéronautiques (MTOW)
     - Redevances passagers (PAX)
     - Redevances sûreté
     - Redevances escale
   - Ajout lignes manuelles
   - Remises et majorations

3. **Statuts de facture**
   ```
   - DRAFT: Brouillon (éditable)
   - ISSUED: Émise (verrouillée, en attente paiement)
   - PAID: Payée
   - CANCELED: Annulée
   ```

4. **Édition de facture**
   - Modification (si DRAFT)
   - Émission (DRAFT → ISSUED)
   - Enregistrement paiement (ISSUED → PAID)
   - Annulation (→ CANCELED)
   - Génération PDF

5. **Lignes de facturation**
   - Code et libellé
   - Quantité
   - Prix unitaire
   - Total
   - Groupes:
     - AERO: Redevances aéronautiques
     - ESC: Redevances escale
     - SURETE: Redevances sûreté
     - OTHER: Autres

#### Règles métier
- FIN: Création/édition factures
- Autres: Lecture seule
- Facture ISSUED/PAID/CANCELED: Non modifiable
- Mouvements facturés: Verrouillés (is_locked = true)
- Calculs basés sur grilles tarifaires (configurables)
- Numéro de facture auto-généré
- Devise: XOF (Franc CFA)

### 4.5 Module Aircrafts

#### Description
Registre complet des aéronefs et leurs caractéristiques techniques.

#### Fonctionnalités
1. **Liste des aéronefs**
   - Filtres: type, opérateur, MTOW
   - Recherche: immatriculation, type
   - Tri multi-colonnes

2. **Fiche aéronef**
   - Immatriculation (unique)
   - Type avion
   - MTOW (kg)
   - Dimensions (longueur, envergure, hauteur)
   - Capacité sièges
   - Opérateur
   - Remarques

3. **Import en masse**
   - Format CSV
   - Validation automatique
   - Rapport d'import

4. **Historique**
   - Mouvements associés
   - Statistiques d'utilisation

#### Règles métier
- AIM: Création/édition aéronefs
- Autres: Lecture seule
- Immatriculation unique obligatoire
- Utilisé pour auto-complétion dans Movements
- Base de données reference pour MTOW

#### Champs obligatoires
```
- registration: Immatriculation
- type: Type avion
```

#### Champs optionnels
```
- mtow_kg: Masse maximale au décollage
- seats: Nombre de sièges
- length_m: Longueur
- wingspan_m: Envergure
- height_m: Hauteur
- operator: Opérateur/compagnie
- remarks: Remarques
```

### 4.6 Module Airports

#### Description
Gestion des aéroports et de leurs infrastructures.

#### Fonctionnalités principales
1. **Liste des aéroports**
   - Filtres: pays, ville
   - Recherche: nom, code OACI/IATA
   - Tri personnalisable

2. **Fiche aéroport**
   - Informations générales:
     - Nom
     - Code OACI (unique)
     - Code IATA (unique)
     - Ville
     - Pays (défaut: Côte d'Ivoire)
   - Coordonnées géographiques:
     - Latitude
     - Longitude
     - Altitude (m)
   - Configuration:
     - Fuseau horaire (défaut: Africa/Abidjan)
     - Description

3. **Gestion des infrastructures**

   **A. Parkings / Stands**
   - Nom (ex: A1, B2)
   - MTOW maximum (kg) - obligatoire
   - Dimensions:
     - Longueur (m)
     - Largeur (m)
   - Contraintes avion:
     - Envergure max (m)
     - Lettre ARC (A à F)
   - Équipements:
     - Passerelle contact (oui/non)
   - Statut:
     - Bloqué (oui/non)
   - Gestion modulaire:
     - Groupe (ex: G1 pour 1, 1A, 1B)
     - Parent/Enfant
     - Priorité

   **B. Pistes / Runways**
   - Désignation (ex: 03/21) - obligatoire
   - Dimensions:
     - Longueur (m) - obligatoire
     - Largeur (m) - obligatoire
   - Caractéristiques:
     - Orientation (ex: 030°/210°)
     - Type de surface (Asphalte, Béton, Terre, Gravier)
     - PCN (classification résistance)
   - Capacités:
     - Type d'avion maximum (ex: A380, B777)

   **C. Bretelles / Taxiways**
   - Nom (ex: Alpha, Bravo) - obligatoire
   - Dimensions:
     - Longueur (m)
     - Largeur (m)
   - Caractéristiques:
     - Type de surface (Asphalte, Béton, Terre, Gravier)

4. **Création d'aéroport**
   - Flux optimisé en une session:
     1. Créer aéroport (infos générales)
     2. Redirection automatique vers édition
     3. Configuration immédiate des infrastructures
   - Message guide: "Aéroport créé! Configurez maintenant son infrastructure ci-dessous."

5. **Édition d'aéroport**
   - Modification infos générales
   - Ajout/édition/suppression infrastructures
   - Vue consolidée de toutes les infrastructures

#### Règles métier
- ADMIN/DED-C: Création/édition aéroports et infrastructures
- Autres rôles: Lecture seule
- Codes OACI et IATA uniques
- Infrastructure créable uniquement si aéroport existe
- Suppression aéroport: Vérification pas de mouvements
- Suppression infrastructure: Vérification pas d'utilisation

#### Interface Infrastructure
```
Sections visibles lors de l'édition:

┌────────────────────────────────────────┐
│  Parkings / Stands (X)    [+ Ajouter] │
├────────────────────────────────────────┤
│  Tableau avec colonnes:                │
│  - Nom | MTOW | Long. | Larg. |       │
│  - Enverg. | ARC | Passerelle |       │
│  - Statut | Actions                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Pistes / Runways (X)     [+ Ajouter] │
├────────────────────────────────────────┤
│  Tableau avec colonnes:                │
│  - Désignation | Longueur | Largeur | │
│  - Orientation | Surface | PCN |      │
│  - Type max | Actions                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Bretelles / Taxiways (X) [+ Ajouter] │
├────────────────────────────────────────┤
│  Tableau avec colonnes:                │
│  - Nom | Longueur | Largeur |         │
│  - Surface | Actions                  │
└────────────────────────────────────────┘
```

### 4.7 Module Users

#### Description
Gestion des utilisateurs et de leurs permissions.

#### Fonctionnalités
1. **Liste des utilisateurs**
   - Filtres: rôle, statut, aéroport
   - Recherche: nom, email
   - Tri personnalisable

2. **Création d'utilisateur**
   - Informations:
     - Nom complet
     - Email (unique)
     - Rôle (ADMIN, ATS, OPS, AIM, FIN)
     - Aéroport affecté (si non ADMIN)
     - Statut (Actif/Inactif)
   - Mot de passe: Généré automatiquement
   - Email de bienvenue (optionnel)

3. **Modification d'utilisateur**
   - Changement rôle
   - Réaffectation aéroport
   - Activation/désactivation
   - Réinitialisation mot de passe

4. **Suppression d'utilisateur**
   - Soft delete (désactivation)
   - Conservation historique audit

#### Règles métier
- ADMIN uniquement: Gestion utilisateurs
- Email unique
- Utilisateur inactif: Connexion bloquée
- Mot de passe: Politique forte (8+ caractères)
- Supabase Auth utilisé pour authentification

#### Rôles disponibles
```
- ADMIN: Administrateur système
- ATS: Contrôle aérien
- OPS: Opérations
- AIM: Information aéronautique
- FIN: Finances
```

### 4.8 Module Audit

#### Description
Traçabilité complète de toutes les opérations dans l'application.

#### Fonctionnalités
1. **Journal d'audit**
   - Liste chronologique
   - Filtres:
     - Utilisateur
     - Type d'action
     - Type de cible
     - Période
   - Recherche

2. **Détail d'événement**
   - Horodatage précis
   - Utilisateur responsable
   - Action effectuée
   - Type d'entité
   - ID de l'entité
   - Détails JSON complet (avant/après)

3. **Types d'actions tracées**
   ```
   - CREATE: Création
   - UPDATE: Modification
   - DELETE: Suppression
   - LOGIN: Connexion
   - LOGOUT: Déconnexion
   - EXPORT: Export de données
   ```

4. **Cibles tracées**
   ```
   - users: Utilisateurs
   - airports: Aéroports
   - stands: Parkings
   - runways: Pistes
   - taxiways: Bretelles
   - aircraft_movements: Mouvements
   - aircrafts: Aéronefs
   - invoices: Factures
   ```

#### Règles métier
- Tous les rôles: Consultation audit
- Écriture automatique (triggers ou app)
- Conservation: Illimitée
- Immuable: Pas de modification/suppression
- Export pour analyse externe

---

## 5. BASE DE DONNÉES

### 5.1 Schéma général

La base de données PostgreSQL (Supabase) comprend 13 tables principales.

### 5.2 Tables détaillées

#### Table: users
**Description**: Utilisateurs de l'application

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ATS', 'OPS', 'AIM', 'FIN')),
  airport_id UUID REFERENCES airports(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

**Colonnes**:
- `id`: Identifiant unique (lié à Supabase Auth)
- `full_name`: Nom complet
- `email`: Email unique
- `role`: Rôle (ADMIN, ATS, OPS, AIM, FIN)
- `airport_id`: Aéroport affecté (NULL pour ADMIN)
- `active`: Compte actif ou non
- `created_at`: Date de création
- `updated_at`: Date de dernière modification

**Indexes**:
- PRIMARY KEY sur `id`
- UNIQUE sur `email`
- INDEX sur `airport_id`
- INDEX sur `role`

#### Table: airports
**Description**: Aéroports gérés

```sql
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icao_code TEXT NOT NULL UNIQUE,
  iata_code TEXT NOT NULL UNIQUE,
  city TEXT,
  country TEXT DEFAULT 'Côte d''Ivoire',
  latitude NUMERIC,
  longitude NUMERIC,
  elevation_m NUMERIC,
  timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan',
  runways TEXT,
  stands_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `name`: Nom de l'aéroport
- `icao_code`: Code OACI (4 lettres, unique)
- `iata_code`: Code IATA (3 lettres, unique)
- `city`: Ville
- `country`: Pays
- `latitude/longitude`: Coordonnées GPS
- `elevation_m`: Altitude en mètres
- `timezone`: Fuseau horaire
- `runways`: Description textuelle (legacy)
- `stands_count`: Nombre de stands (legacy)
- `description`: Description libre

**Indexes**:
- PRIMARY KEY sur `id`
- UNIQUE sur `icao_code`
- UNIQUE sur `iata_code`

#### Table: stands
**Description**: Parkings / Stands d'aéronefs

```sql
CREATE TABLE stands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  name TEXT NOT NULL,
  max_mtow_kg INTEGER NOT NULL,
  length_m NUMERIC,
  width_m NUMERIC,
  wingspan_max_m NUMERIC,
  arc_letter_max TEXT CHECK (arc_letter_max IN ('A','B','C','D','E','F')),
  contact_gate BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  group_key TEXT,
  is_group_parent BOOLEAN DEFAULT false,
  group_priority INTEGER DEFAULT 2 CHECK (group_priority IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `airport_id`: Aéroport parent
- `name`: Nom du stand (ex: A1, B2)
- `max_mtow_kg`: MTOW maximum accepté
- `length_m`: Longueur en mètres
- `width_m`: Largeur en mètres
- `wingspan_max_m`: Envergure max avion
- `arc_letter_max`: Lettre ARC maximum (A-F)
- `contact_gate`: Passerelle contact disponible
- `is_blocked`: Stand bloqué (maintenance)
- `group_key`: Identifiant groupe (stands modulaires)
- `is_group_parent`: Stand parent (occupe les enfants)
- `group_priority`: 1=parent, 2=enfant

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `airport_id`
- INDEX sur `name, airport_id` (composite)

#### Table: runways
**Description**: Pistes d'atterrissage

```sql
CREATE TABLE runways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  name TEXT NOT NULL,
  length_m INTEGER NOT NULL,
  width_m INTEGER NOT NULL,
  orientation TEXT,
  surface_type TEXT,
  pcn TEXT,
  max_aircraft_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `airport_id`: Aéroport parent
- `name`: Désignation (ex: 03/21)
- `length_m`: Longueur en mètres
- `width_m`: Largeur en mètres
- `orientation`: Orientation (ex: 030°/210°)
- `surface_type`: Type de surface (Asphalte, Béton, etc.)
- `pcn`: Classification résistance (ex: PCN 80)
- `max_aircraft_type`: Type max (ex: A380)

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `airport_id`

#### Table: taxiways
**Description**: Bretelles de circulation

```sql
CREATE TABLE taxiways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  name TEXT NOT NULL,
  length_m NUMERIC,
  width_m NUMERIC,
  surface_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `airport_id`: Aéroport parent
- `name`: Nom (ex: Alpha, Bravo)
- `length_m`: Longueur en mètres
- `width_m`: Largeur en mètres
- `surface_type`: Type de surface

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `airport_id`

#### Table: terminals
**Description**: Terminaux passagers (optionnel)

```sql
CREATE TABLE terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  name TEXT NOT NULL,
  arrival_capacity INTEGER DEFAULT 0,
  departure_capacity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table: aircrafts
**Description**: Registre des aéronefs

```sql
CREATE TABLE aircrafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  mtow_kg NUMERIC,
  seats INTEGER,
  length_m NUMERIC,
  wingspan_m NUMERIC,
  height_m NUMERIC,
  operator TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `registration`: Immatriculation (unique)
- `type`: Type avion (ex: A320, B737)
- `mtow_kg`: MTOW en kg
- `seats`: Nombre de sièges
- `length_m`: Longueur
- `wingspan_m`: Envergure
- `height_m`: Hauteur
- `operator`: Compagnie exploitante
- `remarks`: Remarques

**Indexes**:
- PRIMARY KEY sur `id`
- UNIQUE sur `registration`
- INDEX sur `type`

#### Table: aircraft_registry
**Description**: Base de référence pour auto-complétion

```sql
CREATE TABLE aircraft_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  mtow_kg INTEGER,
  airline_code TEXT,
  airline_name TEXT,
  aircraft_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Utilisation**: Lookup automatique lors de la saisie d'immatriculation

#### Table: aircraft_movements
**Description**: Mouvements d'aéronefs (cœur métier)

```sql
CREATE TABLE aircraft_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  flight_number TEXT NOT NULL,
  aircraft_type TEXT NOT NULL,
  registration TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('ARR', 'DEP')),
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  stand_id UUID REFERENCES stands(id),
  mtow_kg INTEGER,
  rotation_id UUID,
  airline_code TEXT,
  airline_name TEXT,
  origin_iata TEXT,
  destination_iata TEXT,
  flight_no_arr TEXT,
  flight_no_dep TEXT,
  pax_arr_full INTEGER DEFAULT 0 CHECK (pax_arr_full >= 0),
  pax_arr_half INTEGER DEFAULT 0 CHECK (pax_arr_half >= 0),
  pax_dep_full INTEGER DEFAULT 0 CHECK (pax_dep_full >= 0),
  pax_dep_half INTEGER DEFAULT 0 CHECK (pax_dep_half >= 0),
  pax_transit INTEGER DEFAULT 0 CHECK (pax_transit >= 0),
  mail_arr_kg NUMERIC DEFAULT 0 CHECK (mail_arr_kg >= 0),
  mail_dep_kg NUMERIC DEFAULT 0 CHECK (mail_dep_kg >= 0),
  freight_arr_kg NUMERIC DEFAULT 0 CHECK (freight_arr_kg >= 0),
  freight_dep_kg NUMERIC DEFAULT 0 CHECK (freight_dep_kg >= 0),
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN (
    'Planned', 'Approche', 'Posé', 'Enregistrement',
    'Décollé', 'Annulé', 'Reporté', 'Arrived', 'Departed', 'Canceled'
  )),
  billable BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes principales**:
- `id`: Identifiant unique
- `airport_id`: Aéroport
- `flight_number`: Numéro de vol
- `aircraft_type`: Type avion
- `registration`: Immatriculation
- `movement_type`: ARR ou DEP
- `scheduled_time`: Heure prévue
- `actual_time`: Heure réelle
- `stand_id`: Parking assigné
- `mtow_kg`: MTOW
- `rotation_id`: Lien ARR↔DEP
- `status`: Statut opérationnel
- `billable`: Facturable
- `is_locked`: Verrouillé (facturé)

**Colonnes passagers/fret**:
- `pax_arr_full/half`: Passagers arrivée
- `pax_dep_full/half`: Passagers départ
- `pax_transit`: Passagers en transit
- `mail_arr_kg/dep_kg`: Courrier
- `freight_arr_kg/dep_kg`: Fret

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `airport_id`
- INDEX sur `registration`
- INDEX sur `scheduled_time`
- INDEX sur `rotation_id`
- INDEX sur `stand_id`

#### Table: invoices
**Description**: Factures

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  movement_arr_id UUID REFERENCES aircraft_movements(id),
  movement_dep_id UUID REFERENCES aircraft_movements(id),
  invoice_number TEXT NOT NULL UNIQUE,
  customer TEXT NOT NULL,
  mtow_kg NUMERIC NOT NULL,
  aircraft_type TEXT NOT NULL,
  registration TEXT NOT NULL,
  traffic_type TEXT NOT NULL CHECK (traffic_type IN ('NAT', 'INT')),
  arr_datetime TIMESTAMPTZ,
  dep_datetime TIMESTAMPTZ,
  origin_iata TEXT,
  destination_iata TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ISSUED', 'PAID', 'CANCELED'
  )),
  total_xof NUMERIC DEFAULT 0,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `invoice_number`: Numéro facture (auto)
- `customer`: Client (compagnie)
- `movement_arr_id/dep_id`: Mouvements liés
- `aircraft_type/registration/mtow_kg`: Info avion
- `traffic_type`: NAT ou INT
- `status`: DRAFT, ISSUED, PAID, CANCELED
- `total_xof`: Montant total XOF
- `pdf_url`: URL du PDF généré
- `notes`: Remarques

**Indexes**:
- PRIMARY KEY sur `id`
- UNIQUE sur `invoice_number`
- INDEX sur `airport_id`
- INDEX sur `status`

#### Table: invoice_items
**Description**: Lignes de facturation

```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  unit_price_xof NUMERIC NOT NULL DEFAULT 0,
  total_xof NUMERIC NOT NULL DEFAULT 0,
  item_group TEXT NOT NULL CHECK (item_group IN (
    'AERO', 'ESC', 'SURETE', 'OTHER'
  )),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `invoice_id`: Facture parente
- `code`: Code article
- `label`: Libellé
- `qty`: Quantité
- `unit_price_xof`: Prix unitaire
- `total_xof`: Total ligne
- `item_group`: Groupe (AERO, ESC, SURETE, OTHER)
- `sort_order`: Ordre d'affichage

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `invoice_id`

#### Table: audit_logs
**Description**: Journal d'audit

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique
- `actor_id`: Utilisateur responsable
- `action`: Type d'action (CREATE, UPDATE, DELETE, etc.)
- `target_type`: Type d'entité
- `target_id`: ID de l'entité
- `details`: Détails JSON (avant/après)
- `timestamp`: Horodatage

**Indexes**:
- PRIMARY KEY sur `id`
- INDEX sur `actor_id`
- INDEX sur `target_type`
- INDEX sur `timestamp` (DESC)

### 5.3 Relations entre tables

```
users ─────┬─────→ airports (airport_id)
           └─────→ audit_logs (actor_id)

airports ──┬─────→ stands (airport_id)
           ├─────→ runways (airport_id)
           ├─────→ taxiways (airport_id)
           ├─────→ terminals (airport_id)
           ├─────→ aircraft_movements (airport_id)
           ├─────→ invoices (airport_id)
           └─────→ users (airport_id) [inverse]

stands ────→ aircraft_movements (stand_id)

aircraft_movements ┬─→ invoices (movement_arr_id)
                   └─→ invoices (movement_dep_id)

invoices ──→ invoice_items (invoice_id)
```

### 5.4 Vues et fonctions

#### Fonction: lookup_aircraft
**Description**: Auto-complétion immatriculation

```sql
CREATE OR REPLACE FUNCTION lookup_aircraft(reg TEXT)
RETURNS TABLE (
  registration TEXT,
  aircraft_type TEXT,
  mtow_kg INTEGER,
  airline_code TEXT,
  airline_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.registration,
    ar.aircraft_type,
    ar.mtow_kg,
    ar.airline_code,
    ar.airline_name
  FROM aircraft_registry ar
  WHERE ar.registration ILIKE reg || '%'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

#### Fonction: is_user_admin
**Description**: Vérification rôle ADMIN (évite récursion RLS)

```sql
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. GESTION DES UTILISATEURS

### 6.1 Système d'authentification

**Provider**: Supabase Auth
**Méthode**: Email + Password

#### Processus de connexion
1. Utilisateur saisit email/password
2. Supabase Auth vérifie credentials
3. Si valide: Génération JWT token
4. Application récupère profil depuis table `users`
5. Redirection vers Dashboard

#### Sécurité
- Mots de passe hashés (bcrypt)
- JWT tokens sécurisés
- Session expirable
- HTTPS obligatoire

### 6.2 Rôles et permissions

#### Matrice de permissions

| Module | Fonctionnalité | ADMIN | DED-C | ATS | OPS | AIM | FIN |
|--------|----------------|-------|-------|-----|-----|-----|-----|
| **Dashboard** | Vue tous aéroports | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Dashboard** | Vue son aéroport | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Movements** | Créer | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Movements** | Modifier | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Movements** | Supprimer | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Movements** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Parking** | Assigner stand | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Parking** | Bloquer stand | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Parking** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Billing** | Créer facture | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Billing** | Modifier facture | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Billing** | Émettre facture | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Billing** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Aircrafts** | Créer | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Aircrafts** | Modifier | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Aircrafts** | Supprimer | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Aircrafts** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Airports** | Créer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Airports** | Modifier | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Airports** | Gérer infra | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Airports** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Users** | Gérer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit** | Consulter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 6.3 Comptes par défaut

Voir fichier `ACCES_UTILISATEURS.md` pour la liste complète.

**Compte administrateur principal:**
```
Email: admin@airport.com
Password: Baba1234
Rôle: ADMIN
```

---

## 7. SÉCURITÉ ET PERMISSIONS

### 7.1 Row Level Security (RLS)

Toutes les tables sont protégées par RLS Supabase.

#### Politiques générales

**Table: users**
```sql
-- Admins voient tous les utilisateurs
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (is_user_admin());

-- Utilisateurs voient leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

**Table: aircraft_movements**
```sql
-- Tous peuvent lire leurs mouvements
CREATE POLICY "Users can view movements at their airport"
ON aircraft_movements FOR SELECT
TO authenticated
USING (
  is_user_admin() OR
  airport_id IN (
    SELECT airport_id FROM users WHERE id = auth.uid()
  )
);

-- ATS peut créer/modifier
CREATE POLICY "ATS can manage movements"
ON aircraft_movements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'ATS'
    AND airport_id = aircraft_movements.airport_id
  )
);
```

**Table: invoices**
```sql
-- FIN peut gérer factures
CREATE POLICY "FIN can manage invoices"
ON invoices FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'FIN')
    AND (role = 'ADMIN' OR airport_id = invoices.airport_id)
  )
);
```

### 7.2 Validation côté client

- Vérification rôle avant affichage UI
- Désactivation boutons selon permissions
- Messages d'erreur explicites

### 7.3 Validation côté serveur

- RLS PostgreSQL (defense en profondeur)
- Contraintes CHECK sur colonnes
- Foreign keys avec CASCADE approprié
- Triggers pour cohérence données

### 7.4 Protection des données sensibles

- Mots de passe hashés (jamais en clair)
- JWT tokens avec expiration
- HTTPS obligatoire
- Aucune clé en frontend
- Variables d'environnement pour secrets

---

## 8. INTERFACES UTILISATEUR

### 8.1 Design system

#### Couleurs principales
```css
--primary: #2563eb (Bleu)
--secondary: #6b7280 (Gris)
--success: #10b981 (Vert)
--error: #ef4444 (Rouge)
--warning: #f59e0b (Orange)
--background: #f5f5f5
--surface: #ffffff
--text-primary: #1a1a1a
--text-secondary: #666666
```

#### Typographie
```
Font: System fonts (SF Pro, Segoe UI, Roboto)
Tailles:
  - H1: 32px, bold
  - H2: 24px, semi-bold
  - H3: 18px, semi-bold
  - Body: 14px, regular
  - Small: 12px, regular
```

#### Espacements
```
Système 8px:
  - XS: 8px
  - SM: 16px
  - MD: 24px
  - LG: 32px
  - XL: 48px
```

### 8.2 Composants réutilisables

#### Layout
Composant wrapper avec navigation et header
- Menu latéral
- Header avec user info
- Zone de contenu principale

#### Toast
Notifications temporaires
- Succès (vert)
- Erreur (rouge)
- Info (bleu)
- Auto-dismiss 3 secondes

#### Modal
Fenêtres de dialogue
- Fond semi-transparent
- Animation slide-in
- Bouton fermeture
- Actions (OK/Annuler)

#### Tableau
Composant liste avec:
- Tri multi-colonnes
- Filtres
- Recherche
- Pagination
- Actions par ligne

#### Formulaires
- Labels clairs
- Validation temps réel
- Messages d'erreur contextuels
- Auto-complétion
- Champs obligatoires marqués *

### 8.3 Responsive design

#### Breakpoints
```
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
```

#### Adaptations
- Menu latéral → Menu hamburger (mobile)
- Tableaux → Cartes empilées (mobile)
- Grilles multi-colonnes → Colonne unique (mobile)

### 8.4 Accessibilité

- Contraste texte/fond conforme WCAG AA
- Navigation clavier complète
- Labels ARIA
- Messages d'erreur explicites
- Focus visible

---

## 9. FLUX DE TRAVAIL

### 9.1 Flux: Enregistrer un mouvement

```
1. ATS se connecte
2. Navigue vers Movements
3. Clique "+ Nouveau mouvement"
4. Formulaire s'ouvre
5. Saisit immatriculation → Auto-complétion type, MTOW, compagnie
6. Saisit numéro de vol
7. Sélectionne ARR ou DEP
8. Saisit heure prévue
9. Sélectionne origine/destination (selon type)
10. (Optionnel) Saisit PAX, fret
11. Clique "Créer"
12. Validation données
13. Si ARR: Attribution automatique stand (selon MTOW)
14. Enregistrement en base
15. Toast succès
16. Retour liste mouvements
17. Nouveau mouvement visible
```

### 9.2 Flux: Créer une facture

```
1. FIN se connecte
2. Navigue vers Billing
3. Clique "+ Nouvelle facture"
4. Formulaire s'ouvre
5. Sélectionne période
6. Liste mouvements facturables s'affiche
7. Filtre/recherche rotation (ARR + DEP)
8. Sélectionne la rotation
9. Système calcule automatiquement:
   - Redevances aéronautiques (MTOW)
   - Redevances passagers (PAX)
   - Redevances sûreté
   - Total XOF
10. FIN vérifie/ajuste lignes
11. Ajoute remarques si besoin
12. Clique "Créer brouillon"
13. Facture créée en statut DRAFT
14. FIN révise
15. Clique "Émettre facture"
16. Statut → ISSUED
17. Mouvements verrouillés (is_locked = true)
18. PDF généré
19. Envoi au client (externe)
20. Réception paiement
21. FIN clique "Marquer comme payé"
22. Statut → PAID
```

### 9.3 Flux: Configurer un nouvel aéroport

```
1. ADMIN se connecte
2. Navigue vers Airports
3. Clique "+ Créer"
4. Formulaire infos générales:
   - Nom: "Aéroport de Yamoussoukro"
   - OACI: "DIYO"
   - IATA: "ASK"
   - Ville: "Yamoussoukro"
   - Coordonnées GPS
5. Clique "Créer"
6. Message: "Aéroport créé! Configurez maintenant son infrastructure ci-dessous."
7. Redirection automatique vers édition
8. Défiler vers section "Parkings / Stands"
9. Cliquer "+ Ajouter"
10. Créer stands:
    - A1: MTOW 150000, 50x40m, ARC E, Passerelle
    - A2: MTOW 120000, 45x35m, ARC D
    - B1: MTOW 80000, 40x30m, ARC C
11. Défiler vers "Pistes / Runways"
12. Cliquer "+ Ajouter"
13. Créer piste:
    - 03/21: 2500x45m, Asphalte, PCN 80
14. Défiler vers "Bretelles / Taxiways"
15. Cliquer "+ Ajouter"
16. Créer bretelles:
    - Alpha: 1200x23m, Asphalte
    - Bravo: 800x18m, Asphalte
17. Cliquer "← Retour"
18. Aéroport opérationnel avec infrastructure complète
```

### 9.4 Flux: Attribution automatique de stand

```
1. Mouvement ARR créé
2. Système déclenche attribution auto
3. Récupère MTOW avion: 150000 kg
4. Requête stands disponibles:
   - Aéroport correspondant
   - MTOW stand >= 150000 kg
   - is_blocked = false
   - Pas d'avion présent (pas d'ARR sans DEP)
5. Résultats: A1 (200000 kg), A2 (180000 kg)
6. Tri par MTOW croissant (optimisation)
7. Sélection: A2 (180000 kg)
8. Attribution stand_id = A2
9. Mouvement enregistré avec A2
10. Stand A2 marqué occupé
```

---

## 10. CONTRAINTES ET RÈGLES MÉTIER

### 10.1 Règles de facturation

#### Redevances aéronautiques
```
Formule: (MTOW en tonnes / 1000) × Tarif base × Coefficient trafic

Coefficients:
- National (NAT): 1.0
- International (INT): 1.5

Exemple:
MTOW = 150000 kg = 150 tonnes
Tarif base = 5000 XOF
Trafic = INT
→ (150 / 1000) × 5000 × 1.5 = 1125 XOF
```

#### Redevances passagers
```
Formule: (Nb PAX plein tarif × Tarif plein) + (Nb PAX demi-tarif × Tarif demi)

Tarifs (exemple):
- Plein tarif: 2500 XOF
- Demi tarif: 1250 XOF

Exemple:
PAX plein = 120
PAX demi = 10
→ (120 × 2500) + (10 × 1250) = 312500 XOF
```

### 10.2 Règles de gestion des stands

#### Contraintes d'assignation
1. MTOW avion ≤ MTOW max stand
2. Stand non bloqué (is_blocked = false)
3. Stand disponible (pas d'avion présent)
4. Si stand modulaire:
   - Parent occupe automatiquement enfants
   - Enfants ne bloquent pas parent
   - Optimisation: Proposer enfant si avion léger

#### Libération de stand
- Automatique au statut "Décollé" (DEP)
- Manuel si maintenance/incident
- Historique conservé

### 10.3 Règles de verrouillage

#### Mouvement verrouillé (is_locked = true)
- Automatique si facturé
- Non modifiable
- Non supprimable
- Trace audit complète

#### Déverrouillage
- Uniquement ADMIN
- Si facture annulée
- Audit de déverrouillage

### 10.4 Règles de validation

#### Mouvements
```
Obligatoires:
- flight_number
- aircraft_type
- registration
- movement_type (ARR ou DEP)
- scheduled_time
- airport_id

Contraintes:
- scheduled_time: Date future acceptable
- actual_time: Cohérent avec scheduled_time
- pax_*: >= 0
- freight_*: >= 0
- mail_*: >= 0
- mtow_kg: > 0 si présent
```

#### Aéroports
```
Obligatoires:
- name
- icao_code (4 lettres, unique)
- iata_code (3 lettres, unique)

Format:
- icao_code: [A-Z]{4}
- iata_code: [A-Z]{3}
```

#### Stands
```
Obligatoires:
- name
- max_mtow_kg

Contraintes:
- max_mtow_kg > 0
- dimensions >= 0 si présentes
- arc_letter_max IN (A,B,C,D,E,F)
```

---

## 11. PERFORMANCE ET OPTIMISATION

### 11.1 Optimisations base de données

#### Index créés
```sql
-- Recherche mouvements
CREATE INDEX idx_movements_airport_date
ON aircraft_movements(airport_id, scheduled_time DESC);

-- Recherche immatriculation
CREATE INDEX idx_movements_registration
ON aircraft_movements(registration);

-- Recherche stands disponibles
CREATE INDEX idx_stands_airport_blocked
ON stands(airport_id, is_blocked);

-- Audit logs récents
CREATE INDEX idx_audit_timestamp
ON audit_logs(timestamp DESC);
```

#### Requêtes optimisées
- Utilisation indexes composites
- LIMIT sur listes paginées
- Projection colonnes nécessaires uniquement
- Requêtes préparées (Supabase)

### 11.2 Optimisations frontend

#### Bundle optimization
```json
{
  "build": {
    "target": "es2015",
    "minify": true,
    "sourcemap": false,
    "chunkSizeWarningLimit": 1000
  }
}
```

#### Lazy loading
- Routes chargées à la demande
- Composants lourds en code-splitting

#### Caching
- Assets statiques (CDN Netlify)
- Supabase client cache automatique
- LocalStorage pour préférences user

### 11.3 Temps de réponse cibles

| Opération | Cible | Mesuré |
|-----------|-------|--------|
| Login | < 1s | 0.5s |
| Chargement Dashboard | < 2s | 1.5s |
| Création mouvement | < 500ms | 300ms |
| Recherche | < 500ms | 200ms |
| Génération facture | < 2s | 1.5s |

---

## 12. DÉPLOIEMENT

### 12.1 Environnements

#### Développement
```
URL: http://localhost:5173
Build: npm run dev
Hot reload: Activé
Source maps: Activés
```

#### Production
```
URL: https://[nom-projet].netlify.app
Build: npm run build
Minification: Activée
Source maps: Désactivées
HTTPS: Automatique
```

### 12.2 Variables d'environnement

**.env (local)**
```env
VITE_SUPABASE_URL=https://[projet].supabase.co
VITE_SUPABASE_ANON_KEY=[clé-publique]
```

**Netlify (production)**
- Variables configurées dans dashboard Netlify
- Mêmes noms
- Valeurs production

### 12.3 Process de déploiement

#### Automatique (Continuous Deployment)
```
1. Commit code sur branch main
2. Push vers GitHub
3. Netlify détecte push
4. Clone repo
5. npm install
6. npm run build
7. Déploiement dist/
8. Invalidation cache CDN
9. Site live
```

#### Durée totale: ~2-3 minutes

### 12.4 Build commands

```bash
# Installation
npm install

# Build production
npm run build

# Preview build local
npm run preview

# Check TypeScript
tsc --noEmit
```

### 12.5 Rollback

En cas de problème:
1. Dashboard Netlify
2. Deploys → Sélectionner version précédente
3. Cliquer "Publish deploy"
4. Rollback instantané

---

## 13. MAINTENANCE ET ÉVOLUTION

### 13.1 Sauvegarde

#### Base de données
- Supabase: Backups automatiques quotidiens
- Rétention: 7 jours (plan gratuit), 30 jours (pro)
- Restoration: Via dashboard Supabase

#### Code
- Git: Historique complet
- GitHub: Repository distant
- Tags pour versions stables

### 13.2 Monitoring

#### Métriques à suivre
- Temps de réponse API
- Taux d'erreur
- Utilisateurs actifs
- Volumétrie mouvements/jour
- Espace base de données

#### Outils
- Supabase Dashboard (métriques DB)
- Netlify Analytics (trafic web)
- Console navigateur (erreurs JS)

### 13.3 Évolutions futures possibles

#### Court terme
- Export Excel/PDF depuis dashboard
- Notifications temps réel (nouveau mouvement)
- Recherche avancée multi-critères
- Thème sombre

#### Moyen terme
- API REST publique
- Application mobile (React Native)
- Intégration systèmes externes (SITA, AODB)
- Rapports statistiques avancés

#### Long terme
- Prédiction occupation stands (IA)
- Optimisation automatique assignations
- Module gestion carburant
- Module gestion équipements (GPU, steps)

---

## 14. DOCUMENTATION TECHNIQUE

### 14.1 Fichiers de documentation

```
CAHIER_DES_CHARGES.md               (ce fichier)
ACCES_UTILISATEURS.md               Comptes et permissions
GUIDE_INFRASTRUCTURE_UI.md          Guide gestion infrastructures
CREATION_AEROPORT_AVEC_INFRA.md    Guide création aéroport
DASHBOARD_README.md                 Documentation Dashboard
DASHBOARD_FEATURES.md               Fonctionnalités Dashboard
AIRCRAFT_MODULE_README.md           Module Aircraft
AIRCRAFT_AUTO_FILL_SUMMARY.md      Auto-complétion
FLIGHT_IMPORT_README.md            Import mouvements
IMPORT_GUIDE.md                     Guide import général
OPTIMISATIONS_REALISEES.md         Optimisations techniques
CORRECTIONS_FINALES.md             Corrections et ajustements
TESTS_UTILISATEUR_REELS.md         Tests utilisateurs
```

### 14.2 Code comments

Le code TypeScript est commenté pour les parties complexes:
- Algorithmes d'attribution stands
- Calculs de facturation
- Gestion états complexes
- Fonctions utilitaires

### 14.3 API Documentation

#### Supabase Client
```typescript
// Import
import { supabase } from './lib/supabase'

// Query
const { data, error } = await supabase
  .from('aircraft_movements')
  .select('*')
  .eq('airport_id', airportId)
  .order('scheduled_time', { ascending: false })
  .limit(100)

// Insert
const { data, error } = await supabase
  .from('aircraft_movements')
  .insert({
    flight_number: 'AF123',
    aircraft_type: 'A320',
    // ...
  })
  .select()
  .single()

// Update
const { error } = await supabase
  .from('aircraft_movements')
  .update({ status: 'Departed' })
  .eq('id', movementId)

// Delete
const { error } = await supabase
  .from('aircraft_movements')
  .delete()
  .eq('id', movementId)
```

---

## 15. SUPPORT ET CONTACT

### 15.1 Support utilisateurs

**Documentation disponible:**
- Guides utilisateur (fichiers .md)
- Tooltips dans l'interface
- Messages d'erreur explicites

**Formation:**
- Session de formation initiale
- Documentation vidéo (à venir)
- FAQ en ligne

### 15.2 Support technique

**En cas de problème:**
1. Vérifier documentation
2. Consulter logs (console navigateur)
3. Vérifier connexion Supabase
4. Contacter administrateur

**Contact administrateur:**
- Email: admin@airport.com (dans l'application)
- Support technique: [À définir selon organisation]

### 15.3 Signalement de bugs

**Procédure:**
1. Noter message d'erreur exact
2. Noter étapes de reproduction
3. Screenshot si possible
4. Rôle et aéroport affecté
5. Contacter support

---

## 16. ANNEXES

### 16.1 Glossaire

**ARC (Aerodrome Reference Code)**: Code de référence d'aérodrome OACI (lettres A-F selon envergure)

**ARR**: Arrivée (Arrival)

**ATS**: Air Traffic Services (Services de la Circulation Aérienne)

**DEP**: Départ (Departure)

**IATA**: International Air Transport Association (3 lettres)

**ICAO**: International Civil Aviation Organization (OACI, 4 lettres)

**MTOW**: Maximum Take-Off Weight (Masse maximale au décollage)

**NAT**: National (trafic domestique)

**INT**: International (trafic international)

**OPS**: Operations (Services Opérations)

**PAX**: Passengers (Passagers)

**PCN**: Pavement Classification Number (résistance chaussée)

**RLS**: Row Level Security (Sécurité niveau ligne)

**Stand**: Parking avion

**XOF**: Franc CFA (devise Côte d'Ivoire)

### 16.2 Références normes

- OACI Annexe 14 (Aérodromes)
- OACI Doc 9157 (Manuel conception aérodromes)
- IATA Airport Handling Manual
- ICAO Location Indicators (codes OACI)

### 16.3 Technologies utilisées

```json
{
  "frontend": {
    "react": "19.2.0",
    "typescript": "5.9.3",
    "react-router-dom": "7.9.5",
    "recharts": "3.4.1",
    "date-fns": "4.1.0",
    "vite": "7.2.2"
  },
  "backend": {
    "platform": "Supabase",
    "database": "PostgreSQL",
    "auth": "Supabase Auth"
  },
  "hosting": {
    "provider": "Netlify",
    "ssl": "Automatic",
    "cdn": "Netlify CDN"
  }
}
```

---

## 17. CHANGELOG

### Version 2.2.1 (2025-11-15)
- ✅ Infrastructure disponible dès création aéroport
- ✅ Redirection auto vers édition après création
- ✅ Message guide utilisateur

### Version 2.2.0 (2025-11-15)
- ✅ Interface graphique gestion infrastructures
- ✅ Création/édition/suppression parkings
- ✅ Création/édition/suppression pistes
- ✅ Création/édition/suppression bretelles
- ✅ Formulaires complets avec tous les champs

### Version 2.1.0 (2025-11-14)
- ✅ Correction récursion infinie RLS
- ✅ Fonction is_user_admin()
- ✅ Optimisations Dashboard
- ✅ Tests utilisateurs réels

### Version 2.0.0 (2025-11-13)
- ✅ Module Dashboard complet
- ✅ Graphiques analytiques
- ✅ Auto-complétion avancée
- ✅ Import CSV mouvements

### Version 1.0.0 (2025-11-12)
- ✅ Version initiale production
- ✅ Tous modules fonctionnels
- ✅ RLS implémenté
- ✅ Documentation complète

---

**Fin du cahier des charges**

**Document:** CAHIER_DES_CHARGES.md
**Version:** 2.2.1
**Date:** 2025-11-15
**Pages:** 100+
**Statut:** ✅ Complet et à jour
