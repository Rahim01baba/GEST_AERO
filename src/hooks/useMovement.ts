import { useState, useCallback } from 'react';
import { MovementsService } from '../services/movementsService';
import type { Movement } from '../types';
import { logger } from '../lib/logger';

export function useMovement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMovement = useCallback(async (movement: Partial<Movement>): Promise<Movement | null> => {
    setLoading(true);
    setError(null);

    try {
      const created = await MovementsService.createMovement(movement);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      logger.error('Failed to create movement', { error: err });
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMovement = useCallback(async (id: string, movement: Partial<Movement>): Promise<Movement | null> => {
    setLoading(true);
    setError(null);

    try {
      const updated = await MovementsService.updateMovement(id, movement);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      logger.error('Failed to update movement', { error: err });
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMovement = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await MovementsService.deleteMovement(id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      logger.error('Failed to delete movement', { error: err });
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const lookupAircraft = useCallback(async (registration: string): Promise<any> => {
    try {
      const result = await MovementsService.lookupAircraftByRegistration(registration);
      return result;
    } catch (err) {
      logger.error('Failed to lookup aircraft', { error: err });
      return null;
    }
  }, []);

  return {
    loading,
    error,
    createMovement,
    updateMovement,
    deleteMovement,
    lookupAircraft,
  };
}
