/**
 * API Layer - Unified interface with Edge Functions fallback
 *
 * Controls routing between Edge Functions and direct Supabase client
 * based on USE_EDGE_FUNCTIONS flag
 */

import { isEnabled } from '../config/flags';
import { supabase } from './supabase';
import { AppError } from './errorHandler';
import { logger } from './logger';
import type { ApiResponse } from '../schemas/api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction<T>(
  functionName: string,
  payload: unknown,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw AppError.unauthorized('Session expired');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    const result: ApiResponse<T> = await response.json();

    if (!result.ok) {
      logger.error('Edge function error', {
        function: functionName,
        error: result.error,
      });

      if (result.error?.code === 'RATE_LIMIT') {
        throw AppError.validation(result.error.message);
      }

      throw AppError.network(
        result.error?.message || 'Edge function call failed',
        result.error
      );
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Edge function call failed', {
      function: functionName,
      error,
    });

    throw AppError.network(
      'Failed to call edge function',
      error
    );
  }
}

export interface Movement {
  id?: string;
  scheduled_time: string;
  movement_type: 'ARR' | 'DEP';
  registration: string;
  aircraft_type?: string;
  aircraft_id?: string | null;
  mtow_kg?: number | null;
  airline_code?: string | null;
  airline_name?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  flight_no_arr?: string | null;
  flight_no_dep?: string | null;
  traffic_type?: 'NAT' | 'INT' | null;
  pax_arr?: number | null;
  pax_dep?: number | null;
  connecting_pax?: number | null;
  cargo_kg?: number | null;
  mail_kg?: number | null;
  status?: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  actual_time?: string | null;
  stand_id?: string | null;
  notes?: string | null;
  rotation_id?: string | null;
}

export interface InvoicePreviewRequest {
  movement_ids: string[];
  airport_id: string;
}

export interface InvoicePreviewResponse {
  line_items: Array<{
    movement_id: string;
    registration: string;
    movement_type: string;
    landing_fee: number;
    parking_fee: number;
    passenger_fee: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

export const api = {
  async createMovement(movement: Omit<Movement, 'id'>): Promise<Movement> {
    const useEdgeFunctions = isEnabled('USE_EDGE_FUNCTIONS');

    if (useEdgeFunctions) {
      logger.debug('Using Edge Function for createMovement');
      return callEdgeFunction<Movement>('create-movement', movement, 'POST');
    }

    logger.debug('Using direct Supabase client for createMovement');
    const { data, error } = await supabase
      .from('movements')
      .insert(movement)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create movement', { error });
      throw AppError.database('Failed to create movement', error);
    }

    return data;
  },

  async updateMovement(id: string, updates: Partial<Movement>): Promise<Movement> {
    const useEdgeFunctions = isEnabled('USE_EDGE_FUNCTIONS');

    if (useEdgeFunctions) {
      logger.debug('Using Edge Function for updateMovement');
      return callEdgeFunction<Movement>('update-movement', { id, ...updates }, 'POST');
    }

    logger.debug('Using direct Supabase client for updateMovement');
    const { data, error } = await supabase
      .from('movements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update movement', { error });
      throw AppError.database('Failed to update movement', error);
    }

    return data;
  },

  async invoicePreview(request: InvoicePreviewRequest): Promise<InvoicePreviewResponse> {
    const useEdgeFunctions = isEnabled('USE_EDGE_FUNCTIONS');

    if (useEdgeFunctions) {
      logger.debug('Using Edge Function for invoicePreview');
      return callEdgeFunction<InvoicePreviewResponse>('invoice-preview', request, 'POST');
    }

    logger.debug('Using direct calculation for invoicePreview');

    const { data: movements, error: movementsError } = await supabase
      .from('movements')
      .select('*, aircrafts(*)')
      .in('id', request.movement_ids);

    if (movementsError) {
      logger.error('Failed to fetch movements', { error: movementsError });
      throw AppError.database('Failed to fetch movements', movementsError);
    }

    const { data: billingRates, error: ratesError } = await supabase
      .from('billing_rates')
      .select('*')
      .eq('airport_id', request.airport_id)
      .maybeSingle();

    if (ratesError) {
      logger.error('Failed to fetch billing rates', { error: ratesError });
      throw AppError.database('Failed to fetch billing rates', ratesError);
    }

    if (!billingRates) {
      throw AppError.notFound('Billing rates', { airportId: request.airport_id });
    }

    type MovementWithAircraft = {
      id: string;
      mtow_kg?: number | null;
      movement_type: string;
      registration: string;
      traffic_type?: string | null;
      pax_arr?: number | null;
      connecting_pax?: number | null;
      aircrafts?: { mtow_kg?: number | null } | null;
    };

    const lineItems = (movements as MovementWithAircraft[]).map((movement) => {
      const mtow = movement.mtow_kg || movement.aircrafts?.mtow_kg || 0;
      const mtowTonnes = mtow / 1000;
      const isInternational = movement.traffic_type === 'INT';

      let landingFee = 0;
      let parkingFee = 0;
      let passengerFee = 0;

      if (movement.movement_type === 'ARR') {
        landingFee = mtowTonnes * (isInternational ? billingRates.landing_fee_int : billingRates.landing_fee_nat);

        const pax = (movement.pax_arr || 0) - (movement.connecting_pax || 0);
        passengerFee = pax * (isInternational ? billingRates.pax_fee_int : billingRates.pax_fee_nat);
      }

      return {
        movement_id: movement.id,
        registration: movement.registration,
        movement_type: movement.movement_type,
        landing_fee: landingFee,
        parking_fee: parkingFee,
        passenger_fee: passengerFee,
        total: landingFee + parkingFee + passengerFee,
      };
    });

    const total = lineItems.reduce((sum, item) => sum + item.total, 0);

    return {
      line_items: lineItems,
      subtotal: total,
      tax: 0,
      total: total,
    };
  },
};
