/**
 * Billing scope resolution - determines whether to bill single movement or rotation
 */

import { supabase } from './supabase';
import { logger } from './logger';

export type AircraftMovement = {
  id: string;
  scheduled_time: string;
  movement_type: 'ARR' | 'DEP';
  registration: string;
  flight_number_arr?: string | null;
  flight_number_dep?: string | null;
  origin?: string | null;
  destination?: string | null;
  mtow_kg?: number | null;
  rotation_id?: string | null;
  airline_code?: string | null;
  airline_name?: string | null;
  aircraft_type?: string | null;
  is_invoiced?: boolean;
  passenger_count?: number | null;
  connecting_pax?: number | null;
  traffic_type?: string | null;
  stand_id?: string | null;
};

export type BillingScope = {
  kind: 'SINGLE' | 'ROTATION';
  movements: AircraftMovement[];
  rotation_id?: string;
};

/**
 * Resolves the billing scope for a given movement
 * If rotation_id exists and has >= 2 movements, scope is ROTATION
 * Otherwise, scope is SINGLE
 */
export async function resolveBillingScope(
  selectedMovement: AircraftMovement
): Promise<BillingScope> {
  if (!selectedMovement.rotation_id) {
    return {
      kind: 'SINGLE',
      movements: [selectedMovement]
    };
  }

  const { data: rotationMovements, error } = await supabase
    .from('aircraft_movements')
    .select('*')
    .eq('rotation_id', selectedMovement.rotation_id)
    .order('scheduled_time', { ascending: true });

  if (error) {
    logger.error('Error fetching rotation movements', { error });
    return {
      kind: 'SINGLE',
      movements: [selectedMovement]
    };
  }

  if (!rotationMovements || rotationMovements.length < 2) {
    return {
      kind: 'SINGLE',
      movements: [selectedMovement]
    };
  }

  return {
    kind: 'ROTATION',
    movements: rotationMovements as AircraftMovement[],
    rotation_id: selectedMovement.rotation_id
  };
}

/**
 * Get display label for scope
 */
export function getScopeLabel(scope: BillingScope): string {
  if (scope.kind === 'ROTATION') {
    return `Facturation : Rotation (${scope.movements.length} mouvements)`;
  }
  return 'Facturation : Mouvement seul';
}

/**
 * Get summary of movements in scope
 */
export function getMovementsSummary(scope: BillingScope): string[] {
  return scope.movements.map(m => {
    const type = m.movement_type === 'ARR' ? '🛬 ARR' : '🛫 DEP';
    const flight = m.movement_type === 'ARR'
      ? m.flight_number_arr || '-'
      : m.flight_number_dep || '-';
    const route = m.movement_type === 'ARR'
      ? `${m.origin || '?'} → ${m.destination || '?'}`
      : `${m.origin || '?'} → ${m.destination || '?'}`;
    const time = new Date(m.scheduled_time).toLocaleString('fr-FR');

    return `${type} ${flight} | ${m.registration} | ${route} | ${time}`;
  });
}
