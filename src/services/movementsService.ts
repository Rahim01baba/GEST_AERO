import { supabase, SupabaseClient } from '../lib/supabaseClient';
import type { Movement, MovementWithStand, MovementFilters, PaginatedResponse } from '../types';
import { logger } from '../lib/logger';

export class MovementsService {
  static async getMovements(
    filters?: MovementFilters,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<MovementWithStand>> {
    logger.debug('Fetching movements', { filters, page, pageSize });

    let query = supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `, { count: 'exact' })
      .order('scheduled_time', { ascending: true });

    if (filters?.startDate) {
      query = query.gte('scheduled_time', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('scheduled_time', filters.endDate);
    }

    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.registration) {
      query = query.ilike('registration', `%${filters.registration}%`);
    }

    if (filters?.flightNumber) {
      query = query.ilike('flight_number', `%${filters.flightNumber}%`);
    }

    if (filters?.airlineCode) {
      query = query.ilike('airline_code', `%${filters.airlineCode}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const movements: MovementWithStand[] = (data || []).map(m => ({
      ...m,
      stand_name: m.stands?.name || null,
    }));

    return {
      data: movements,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  static async getMovementById(id: string): Promise<MovementWithStand> {
    logger.debug('Fetching movement by ID', { id });

    const { data, error } = await supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Movement not found');
    }

    return {
      ...data,
      stand_name: data.stands?.name || null,
    };
  }

  static async createMovement(movement: Partial<Movement>): Promise<Movement> {
    logger.debug('Creating movement', { movement });

    return SupabaseClient.insert<Movement>(
      'aircraft_movements',
      movement,
      'Creating movement'
    ).then(data => data[0]);
  }

  static async updateMovement(id: string, movement: Partial<Movement>): Promise<Movement> {
    logger.debug('Updating movement', { id, movement });

    return SupabaseClient.update<Movement>(
      'aircraft_movements',
      id,
      movement,
      'Updating movement'
    );
  }

  static async deleteMovement(id: string): Promise<void> {
    logger.debug('Deleting movement', { id });

    await SupabaseClient.delete(
      'aircraft_movements',
      id,
      'Deleting movement'
    );
  }

  static async lookupAircraftByRegistration(registration: string): Promise<any> {
    logger.debug('Looking up aircraft by registration', { registration });

    return SupabaseClient.rpc(
      'lookup_aircraft_by_registration',
      { reg: registration },
      'Looking up aircraft'
    );
  }
}
