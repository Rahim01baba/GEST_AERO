import { SupabaseClient, supabase } from '../lib/supabaseClient';
import type { Stand } from '../types';
import { logger } from '../lib/logger';

export class StandsService {
  static async getStands(airportId?: string): Promise<Stand[]> {
    logger.debug('Fetching stands', { airportId });

    let query = supabase
      .from('stands')
      .select('*')
      .order('name', { ascending: true });

    if (airportId) {
      query = query.eq('airport_id', airportId);
    }

    return SupabaseClient.query<Stand>(query, 'Fetching stands');
  }

  static async getStandById(id: string): Promise<Stand> {
    logger.debug('Fetching stand by ID', { id });

    const query = supabase
      .from('stands')
      .select('*')
      .eq('id', id);

    return SupabaseClient.querySingle<Stand>(query, 'Fetching stand');
  }

  static async createStand(stand: Partial<Stand>): Promise<Stand> {
    logger.debug('Creating stand', { stand });

    return SupabaseClient.insert<Stand>(
      'stands',
      stand,
      'Creating stand'
    ).then(data => data[0]);
  }

  static async updateStand(id: string, stand: Partial<Stand>): Promise<Stand> {
    logger.debug('Updating stand', { id, stand });

    return SupabaseClient.update<Stand>(
      'stands',
      id,
      stand,
      'Updating stand'
    );
  }

  static async deleteStand(id: string): Promise<void> {
    logger.debug('Deleting stand', { id });

    await SupabaseClient.delete(
      'stands',
      id,
      'Deleting stand'
    );
  }

  static async getAvailableStands(
    airportId: string,
    mtow_kg: number,
    scheduledTime: string
  ): Promise<Stand[]> {
    logger.debug('Fetching available stands', { airportId, mtow_kg, scheduledTime });

    const query = supabase
      .from('stands')
      .select('*')
      .eq('airport_id', airportId)
      .eq('is_blocked', false)
      .gte('max_mtow_kg', mtow_kg)
      .order('name', { ascending: true });

    return SupabaseClient.query<Stand>(query, 'Fetching available stands');
  }
}
