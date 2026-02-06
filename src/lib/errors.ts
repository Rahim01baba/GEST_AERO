import { PostgrestError } from '@supabase/supabase-js';
import { DatabaseError, NotFoundError, ValidationError } from '../types/errors';
import { logger } from './logger';

export function handleSupabaseError(error: PostgrestError | null, context?: string): never {
  logger.error('Supabase error', { error, context });

  if (!error) {
    throw new DatabaseError('Une erreur inconnue est survenue');
  }

  const message = context ? `${context}: ${error.message}` : error.message;

  switch (error.code) {
    case 'PGRST116':
      throw new NotFoundError(message, error);
    case '23505':
      throw new ValidationError('Cette entrée existe déjà', error);
    case '23503':
      throw new ValidationError('Référence invalide', error);
    case '23502':
      throw new ValidationError('Champ requis manquant', error);
    default:
      throw new DatabaseError(message, error);
  }
}

export function handleError(error: unknown, context?: string): never {
  logger.error('Error occurred', { error, context });

  if (error instanceof Error) {
    throw error;
  }

  throw new DatabaseError(
    context ? `${context}: Erreur inconnue` : 'Une erreur inconnue est survenue',
    error
  );
}
