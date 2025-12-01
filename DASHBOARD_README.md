# Dashboard Interactif - Guide d'utilisation

## ✨ Nouvelles fonctionnalités

Le Dashboard a été entièrement repensé avec des graphiques interactifs et des filtres par dates.

### 🎯 Fonctionnalités principales

#### 1. **Filtres dynamiques**
- **Date de début / Date de fin** : Sélectionnez la période à analyser
  - Par défaut : mois en cours (du 1er au dernier jour)
  - Fuseau horaire : Africa/Abidjan (UTC+0)
- **Sélecteur d'aéroport** : Visible uniquement pour les administrateurs
  - Les autres utilisateurs voient uniquement leur aéroport assigné
- **Boutons** :
  - **Appliquer** : Recalcule les statistiques avec les nouveaux filtres
  - **Réinitialiser** : Retour aux valeurs par défaut (mois courant)
  - **Exporter CSV** : Télécharge toutes les données filtrées

#### 2. **KPI Cards (4 indicateurs)**

✈️ **Movements**
- Nombre total de mouvements (ARR + DEP) sur la période
- Mise à jour en temps réel selon les filtres

💰 **Revenue**
- Somme des factures sur la période
- Affichage en XOF (format français)
- **Toggle "Payées uniquement"** : Filtre les factures avec status='PAID'

🧾 **Paid Invoices**
- Nombre de factures payées sur la période

🅿️ **Stand Occupancy**
- Taux d'occupation moyen des stands (%)
- Calcul basé sur les mouvements avec status Planned ou Arrived

#### 3. **5 Graphiques interactifs**

📊 **A. Mouvements par jour (Barres empilées)**
- Arrivées (bleu) et Départs (orange)
- Visualisation jour par jour
- Tooltip interactif au survol

📈 **B. Revenus par jour (Courbe)**
- Évolution des revenus quotidiens
- Montant en XOF formaté
- Sensible au filtre "Payées uniquement"

🛫 **C. Top 10 Types d'Aéronefs (Barres horizontales)**
- Les 10 types d'avions les plus fréquents
- Exemples : B738, A320, A359, B773, etc.

🌍 **D. Top 10 Routes (Barres horizontales)**
- Les 10 routes les plus fréquentées
- Format : `Origine → Aéroport` ou `Aéroport → Destination`

📉 **E. Tendance d'occupation des stands (Courbe)**
- Évolution du taux d'occupation (%) jour par jour
- Permet d'identifier les pics et creux d'activité

### 📥 Export CSV

Le bouton **"Exporter CSV"** génère un fichier contenant :
- Série temporelle des mouvements (arrivées/départs par jour)
- Série temporelle des revenus (montant par jour)
- Tendance d'occupation des stands
- Top types d'aéronefs
- Top routes

**Format du fichier** : `dashboard-export-YYYY-MM-DD.csv`

### 🔒 Sécurité et permissions (RLS)

#### Rôles et accès

**ADMIN**
- Accès à tous les aéroports
- Peut filtrer par aéroport spécifique
- Voit toutes les données

**ATS / AIM / OPS / FIN**
- Accès uniquement à leur aéroport assigné
- Pas de sélecteur d'aéroport (fixé automatiquement)
- Données filtrées par `airport_id` via RLS

### 🔍 Requêtes et performances

Toutes les requêtes sont définies dans `/src/lib/dashboardQueries.ts` :

```typescript
getMovementsCount(filters)           // Compte total mouvements
getMovementsDailySeries(filters)     // Série quotidienne mouvements
getRevenueSum(filters, paidOnly)     // Revenus totaux
getRevenueDailySeries(filters, paid) // Série quotidienne revenus
getPaidInvoicesCount(filters)        // Nombre factures payées
getStandOccupancyAvg(filters)        // Occupation moyenne
getTopAircraftTypes(filters, limit)  // Top N types avions
getTopRoutes(filters, limit)         // Top N routes
getStandOccupancyDailySeries(filters)// Série occupation
```

#### Optimisations

- **Requêtes parallèles** : Toutes les données sont chargées en même temps avec `Promise.all()`
- **Filtrage côté serveur** : Seules les données nécessaires sont récupérées
- **RLS automatique** : Les filtres `airport_id` sont appliqués au niveau de la base de données

### 🎨 Design et UX

#### États visuels

**Chargement**
- Message "Chargement des données..." pendant les requêtes

**Aucune donnée**
- Message "Aucune donnée disponible pour cette période" dans les graphiques vides

**Erreurs**
- Validation des dates (fin > début)
- Messages d'erreur clairs en rouge

#### Responsive

- Grilles adaptatives avec `repeat(auto-fit, minmax(...))`
- Graphiques qui s'ajustent à la largeur de l'écran
- Minimum 600px par graphique pour la lisibilité

### 📊 Exemples de données

#### Août 2025 (Données importées)

**San-Pedro (SPY)**
- 13 arrivées + 9 départs le 06/08/2025
- Vols Air France (AF520, AF702)
- Vols Ethiopian (ET935)
- Vols domestiques Héli France (HF)

**Bouaké (BYK)**
- 1 départ TK557 le 06/08/2025

### 🚀 Utilisation

1. **Sélectionnez vos filtres**
   - Dates : Par défaut, mois en cours
   - Aéroport (ADMIN uniquement) : Choisissez ou laissez "Tous"

2. **Cliquez sur "Appliquer"**
   - Les 4 KPI sont recalculées
   - Les 5 graphiques sont actualisés

3. **Explorez les données**
   - Survolez les graphiques pour voir les détails
   - Activez "Payées uniquement" pour filtrer les revenus

4. **Exportez si nécessaire**
   - Cliquez sur "📥 Exporter CSV"
   - Le fichier se télécharge automatiquement

### 🛠️ Technologies utilisées

- **React** : Interface utilisateur
- **Recharts** : Bibliothèque de graphiques
- **date-fns** : Manipulation des dates
- **Supabase** : Base de données avec RLS
- **TypeScript** : Typage fort

### 📝 Notes importantes

#### Fuseau horaire
- Les dates sont stockées en **UTC** dans la base
- Affichage en **Africa/Abidjan** (UTC+0)
- Les filtres couvrent toute la journée (00:00:00 à 23:59:59)

#### Données manquantes
- Si `origin_iata` ou `destination_iata` est NULL, la route n'apparaît pas dans le graphique
- Les mouvements sans stand assigné ne comptent pas dans l'occupation

#### Performance
- Limite recommandée : 365 jours maximum
- Au-delà, envisager une pagination ou des vues matérialisées

### 🔄 Prochaines améliorations (optionnelles)

- **Vues matérialisées** pour des calculs pré-agrégés
- **Cache côté client** avec memoization
- **Filtres avancés** : par compagnie, type de trafic, etc.
- **Comparaison de périodes** : mois actuel vs mois précédent
- **Alertes** : notifications si occupation > 90%

---

## 🎉 Dashboard opérationnel !

Le Dashboard est maintenant prêt à afficher vos données en temps réel avec des graphiques interactifs et des filtres flexibles.

**Bon pilotage de votre aéroport !** ✈️
