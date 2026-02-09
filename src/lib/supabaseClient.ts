import { supabase } from './supabase';
import { handleSupabaseError } from './errors';
import { logger } from './logger';

export class SupabaseClient {
  static async query<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    context?: string
  ): Promise<T[]> {
    logger.debug('Executing Supabase query', { context });

    const { data, error } = await builder;

    if (error) {
      handleSupabaseError(error, context);
    }

    return (data as T[]) || [];
  }

  static async querySingle<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    context?: string
  ): Promise<T> {
    logger.debug('Executing Supabase single query', { context });

    const { data, error } = await builder.maybeSingle();

    if (error) {
      handleSupabaseError(error, context);
    }

    if (!data) {
      throw new Error(context ? `${context}: Not found` : 'Not found');
    }

    return data as T;
  }

  static async insert<T>(
    table: string,
    values: Partial<T> | Partial<T>[],
    context?: string
  ): Promise<T[]> {
    logger.debug('Executing Supabase insert', { table, context });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from(table)
      .insert(values as any)
      .select();

    if (error) {
      handleSupabaseError(error, context);
    }

    return (data as T[]) || [];
  }

  static async update<T>(
    table: string,
    id: string,
    values: Partial<T>,
    context?: string
  ): Promise<T> {
    logger.debug('Executing Supabase update', { table, id, context });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from(table)
      .update(values as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, context);
    }

    return data as T;
  }

  static async delete(
    table: string,
    id: string,
    context?: string
  ): Promise<void> {
    logger.debug('Executing Supabase delete', { table, id, context });

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, context);
    }
  }

  static async rpc<T>(
    functionName: string,
    params?: Record<string, unknown>,
    context?: string
  ): Promise<T> {
    logger.debug('Executing Supabase RPC', { functionName, params, context });

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      handleSupabaseError(error, context);
    }

    return data as T;
  }
}

export { supabase };

