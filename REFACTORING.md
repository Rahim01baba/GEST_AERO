# Guide de refactoring - Airport Manager

## Vue d'ensemble

Ce document décrit l'architecture refactorisée de l'application Airport Manager. Le refactoring améliore la maintenabilité, la robustesse et la performance sans modifier les fonctionnalités métier existantes.

## Nouvelle structure

```
src/
├── components/           # Composants UI
├── hooks/                # Hooks custom React
├── services/             # Services d'accès aux données
├── lib/                  # Utilitaires et helpers
├── types/                # Types TypeScript centralisés
├── constants/            # Constantes de l'application
├── schemas/              # Schémas de validation Zod
└── pages/                # Pages de l'application
```

## Principes d'architecture

### 1. Séparation des responsabilités

- **Components**: Uniquement la logique UI
- **Hooks**: État et logique métier réutilisable
- **Services**: Accès aux données et communication avec Supabase
- **Lib**: Utilitaires (logger, gestion d'erreurs, etc.)

### 2. Typage strict TypeScript

Tous les types sont centralisés dans `src/types/index.ts`:
- `Movement`, `Stand`, `Aircraft`, `User`, etc.
- Plus de `any` dans le code métier
- Types d'erreur personnalisés dans `src/types/errors.ts`

### 3. Gestion d'erreur centralisée

```typescript
import { SupabaseClient } from '../lib/supabaseClient';
import { handleSupabaseError } from '../lib/errors';
```

Toutes les erreurs Supabase sont gérées de manière cohérente via `handleSupabaseError()`.

### 4. Logger centralisé

```typescript
import { logger } from '../lib/logger';

logger.debug('Message de debug'); // Uniquement en dev
logger.info('Information');
logger.warn('Avertissement');
logger.error('Erreur', { context });
```

### 5. Validation avec Zod

Tous les formulaires utilisent des schémas Zod:

```typescript
import { movementSchema } from '../schemas/movement';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(movementSchema),
});
```

## Utilisation des services

### MovementsService

```typescript
import { MovementsService } from '../services/movementsService';

// Récupérer les mouvements paginés
const response = await MovementsService.getMovements(filters, page, pageSize);

// Créer un mouvement
const movement = await MovementsService.createMovement(data);

// Mettre à jour un mouvement
const updated = await MovementsService.updateMovement(id, data);

// Supprimer un mouvement
await MovementsService.deleteMovement(id);
```

### StandsService

```typescript
import { StandsService } from '../services/standsService';

// Récupérer tous les stands
const stands = await StandsService.getStands(airportId);

// Stands disponibles pour un avion
const available = await StandsService.getAvailableStands(
  airportId,
  mtow_kg,
  scheduledTime
);
```

## Utilisation des hooks

### useMovements

Hook pour gérer une liste de mouvements avec pagination et filtres:

```typescript
import { useMovements } from '../hooks/useMovements';

function MovementsPage() {
  const {
    movements,
    loading,
    error,
    page,
    totalPages,
    updateFilters,
    nextPage,
    previousPage,
    refetch,
  } = useMovements({
    autoLoad: true,
    filters: { startDate, endDate },
    pageSize: 50,
  });

  // Utiliser les données...
}
```

### useMovement

Hook pour gérer un mouvement individuel (création, édition, suppression):

```typescript
import { useMovement } from '../hooks/useMovement';

function MovementForm() {
  const {
    loading,
    error,
    createMovement,
    updateMovement,
    deleteMovement,
  } = useMovement();

  const handleSubmit = async (data) => {
    const created = await createMovement(data);
    if (created) {
      // Succès
    }
  };
}
```

## Constantes

Toutes les constantes sont centralisées dans `src/constants/app.ts`:

```typescript
import { PAGINATION, MESSAGES, DEBOUNCE_DELAY } from '../constants/app';

// Utilisation
const pageSize = PAGINATION.DEFAULT_PAGE_SIZE; // 50
const successMsg = MESSAGES.SUCCESS.CREATED;
const delay = DEBOUNCE_DELAY.SEARCH; // 300ms
```

## Patterns recommandés

### 1. Composants avec hooks

```typescript
function MovementsTable() {
  const { movements, loading, error, refetch } = useMovements();

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <table>
      {movements.map(movement => (
        <MovementRow key={movement.id} movement={movement} />
      ))}
    </table>
  );
}
```

### 2. Validation de formulaire

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { movementSchema } from '../schemas/movement';

function MovementForm() {
  const form = useForm({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      billable: true,
      status: 'Planned',
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // data est validé et typé
    await createMovement(data);
  });
}
```

### 3. Gestion d'erreur

```typescript
try {
  const result = await MovementsService.createMovement(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Erreur de validation
  } else if (error instanceof DatabaseError) {
    // Erreur base de données
  }
}
```

## Performance

### Optimisations implémentées

1. **useMemo** pour les calculs coûteux:
```typescript
const filteredMovements = useMemo(
  () => movements.filter(m => m.status === 'Planned'),
  [movements]
);
```

2. **useCallback** pour les handlers:
```typescript
const handleClick = useCallback((id: string) => {
  // handler
}, [dependencies]);
```

3. **Pagination serveur** pour les grandes listes
4. **Debounce** sur les filtres de recherche

## Tests

### Structure des tests

```
src/
├── hooks/
│   ├── useMovements.ts
│   └── useMovements.test.ts
├── services/
│   ├── movementsService.ts
│   └── movementsService.test.ts
```

### Exécution des tests

```bash
npm run test
```

## Migration d'ancien code

### Avant (ancien pattern)

```typescript
// Composant monolithique avec tout mélangé
function Movements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('aircraft_movements')
          .select('*');

        if (error) {
          console.error(error);
          return;
        }

        setMovements(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Logique UI mélangée avec logique métier
}
```

### Après (nouveau pattern)

```typescript
// Service dédié
// src/services/movementsService.ts
export class MovementsService {
  static async getMovements() {
    return SupabaseClient.query(/*...*/);
  }
}

// Hook réutilisable
// src/hooks/useMovements.ts
export function useMovements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Logique métier isolée

  return { movements, loading, error };
}

// Composant UI pur
// src/pages/Movements.tsx
function Movements() {
  const { movements, loading, error } = useMovements();

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return <MovementsTable movements={movements} />;
}
```

## Bonnes pratiques

1. ✅ Toujours typer explicitement (pas de `any`)
2. ✅ Utiliser les services pour l'accès aux données
3. ✅ Valider les formulaires avec Zod
4. ✅ Logger avec le logger centralisé
5. ✅ Utiliser les constantes au lieu de valeurs magiques
6. ✅ Séparer UI / logique / données
7. ✅ Gérer les erreurs de manière cohérente
8. ✅ Tester les hooks et services critiques

## Compatibilité

Le refactoring est **100% compatible** avec l'existant:
- Aucune modification des tables Supabase
- Aucune modification des policies RLS
- Aucune modification des workflows métier
- Les anciennes pages continuent de fonctionner

## Prochaines étapes

Pour migrer progressivement l'ancien code:

1. Identifier un composant prioritaire
2. Extraire la logique dans un hook custom
3. Créer ou utiliser un service existant
4. Remplacer les types `any` par des types stricts
5. Ajouter la validation Zod si formulaire
6. Tester le composant refactorisé
7. Répéter pour le composant suivant

## Support

Pour toute question sur le refactoring, consulter:
- Ce document (REFACTORING.md)
- Les exemples dans `src/hooks/` et `src/services/`
- Les schémas de validation dans `src/schemas/`
