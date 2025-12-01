# Import des Vols - Instructions

## Préparation des données

1. **Créez le fichier `flights-data.txt`** dans le dossier racine du projet

2. **Copiez-collez toutes vos données de vol** dans ce fichier
   - Format: données tabulaires séparées par des tabulations (TAB)
   - Chaque ligne représente un vol avec arrivée et départ

3. **Format des données attendu:**

```
arr_id  dep_id  stand  registration  aircraft_type  pax  cat  airport  arr_date  arr_flight  arr_term  arr_status  arr_time  dep_date  dep_flight  dep_term  dep_status  dep_time
```

## Codes aéroports

- **Code 1 ou 21** = Bouaké (BYK)
- **Code 2** = Korhogo (HGO)
- **Code 3** = San-Pedro (SPY)

## Codes de statut

- **A** = Arrived (Arrivé)
- **B** = Planned (Planifié)
- **M** = Departed (Parti)
- **C** = Canceled (Annulé)
- **F** = Canceled (Annulé)
- **0** = Planned (Planifié)

## Exécution de l'import

```bash
# 1. Assurez-vous que flights-data.txt existe et contient vos données
node import-movements-bulk.js
```

## Exemple de format de données

```
147320	147321	6A	CNROH	B738	79	C	3	06/08/2025	AT2533	0	0	16:18:00	06/08/2020	AT2533	3	A	17:30:00
147288	147289	6B	XTABZ	E195	41	C	3	06/08/2025	2J507	21	B	14:17:00	06/08/2020	2J508	21	M	15:33:00
```

## Ce que fait le script

1. Lit le fichier `flights-data.txt`
2. Parse chaque ligne et extrait:
   - Les informations de vol d'arrivée (ARR)
   - Les informations de vol de départ (DEP)
3. Assigne automatiquement l'aéroport correct (BYK, HGO, ou SPY)
4. Convertit les statuts en format standard
5. Insère les mouvements dans la base de données Supabase
6. Affiche un résumé de l'import

## Résultat attendu

Le script affichera:
- Nombre total de mouvements parsés
- Répartition par aéroport
- Progression de l'insertion
- Résumé final (succès/erreurs)

## Vérification

Après l'import, accédez au **Dashboard** pour voir:
- Les mouvements du jour
- Les 10 derniers mouvements
- Les statistiques mises à jour

## Dépannage

### Erreur: "Cannot read flights-data.txt"
→ Créez le fichier `flights-data.txt` à la racine du projet

### Erreur: "Skipping line with X parts"
→ Vérifiez que les lignes sont bien séparées par des TAB (pas des espaces)

### Aucun mouvement importé
→ Vérifiez le format des dates (JJ/MM/AAAA et HH:MM:SS)

### Erreurs d'insertion
→ Vérifiez les logs pour voir les messages d'erreur détaillés
