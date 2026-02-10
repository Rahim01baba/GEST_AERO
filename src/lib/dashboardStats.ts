/**
 * Dashboard Stats - Requêtes pour le nouveau dashboard visuel
 * Toutes les fonctions respectent les DashboardFilters et retournent des types stricts
 */

import { supabase } from './supabase';
import type { DashboardFilters } from './dashboardFilters';

/**
 * Types de retour
 */
export interface MovementsStats {
  total: number;
  arrivals: number;
  departures: number;
  onTimeRate: number; // Pourcentage
  delayAvg: number; // Minutes
  delayMedian: number; // Minutes
  cancellations: number;
  mtowTotal: number; // kg
  mtowAvg: number; // kg
}

export interface BillingStats {
  billedTotal: number;
  collectedTotal: number;
  recoveryRate: number; // Pourcentage
  overdueTotal: number;
  agingBuckets: {
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90_plus: number;
  };
}

export interface ParkingStats {
  occupied: number;
  capacity: number;
  occupancyRate: number; // Pourcentage
}

export interface TrafficDataPoint {
  date: string; // yyyy-MM-dd
  arrivals: number;
  departures: number;
  total: number;
}

export interface RevenueDataPoint {
  date: string; // yyyy-MM-dd
  billed: number;
  collected: number;
}

export interface TopDestination {
  code: string;
  name: string | null;
  value: number;
  share: number; // Pourcentage
}

export interface TopAirline {
  airline: string;
  airline_name: string | null;
  value: number;
  share: number; // Pourcentage
}

export interface OverdueInvoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string | null;
  amount: number;
  due_date: string;
  days_overdue: number;
}

/**
 * Statistiques générales des mouvements
 */
export async function getMovementsStats(filters: DashboardFilters): Promise<MovementsStats> {
  let query = supabase
    .from('aircraft_movements')
    .select('movement_type, actual_time, scheduled_time, mtow_kg, status')
    .gte('scheduled_time', filters.date_from)
    .lte('scheduled_time', filters.date_to);

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  if (filters.ad !== 'ALL') {
    query = query.eq('movement_type', filters.ad);
  }

  if (filters.airline_code) {
    query = query.eq('airline_code', filters.airline_code);
  }

  const { data, error } = await query;

  if (error) throw error;

  type MovementData = {
    movement_type: string;
    actual_time: string | null;
    scheduled_time: string;
    mtow_kg: number | null;
    status: string | null;
  };

  const movements = (data as MovementData[]) || [];
  const total = movements.length;
  const arrivals = movements.filter((m) => m.movement_type === 'ARR').length;
  const departures = movements.filter((m) => m.movement_type === 'DEP').length;

  // Calcul régularité et retards
  const movementsWithTimes = movements.filter((m) => m.actual_time && m.scheduled_time);
  const delays = movementsWithTimes.map((m) => {
    const actual = new Date(m.actual_time!).getTime();
    const scheduled = new Date(m.scheduled_time).getTime();
    return Math.round((actual - scheduled) / 60000); // minutes
  });

  const onTimeCount = delays.filter((d: number) => Math.abs(d) <= 15).length; // +/- 15 min = on time
  const onTimeRate = movementsWithTimes.length > 0 ? (onTimeCount / movementsWithTimes.length) * 100 : 0;

  const delayAvg = delays.length > 0 ? delays.reduce((sum: number, d: number) => sum + d, 0) / delays.length : 0;

  // Médiane
  const sortedDelays = [...delays].sort((a, b) => a - b);
  const delayMedian = sortedDelays.length > 0
    ? sortedDelays.length % 2 === 0
      ? (sortedDelays[sortedDelays.length / 2 - 1] + sortedDelays[sortedDelays.length / 2]) / 2
      : sortedDelays[Math.floor(sortedDelays.length / 2)]
    : 0;

  // Annulations
  const cancellations = movements.filter((m) => m.status === 'CANCELLED').length;

  // MTOW
  const mtowValues = movements.filter((m) => m.mtow_kg).map((m) => m.mtow_kg!);
  const mtowTotal = mtowValues.reduce((sum: number, v: number) => sum + v, 0);
  const mtowAvg = mtowValues.length > 0 ? mtowTotal / mtowValues.length : 0;

  return {
    total,
    arrivals,
    departures,
    onTimeRate,
    delayAvg,
    delayMedian,
    cancellations,
    mtowTotal,
    mtowAvg
  };
}

/**
 * Série temporelle du trafic (par jour)
 */
export async function getTrafficTimeseries(filters: DashboardFilters): Promise<TrafficDataPoint[]> {
  let query = supabase
    .from('aircraft_movements')
    .select('scheduled_time, movement_type')
    .gte('scheduled_time', filters.date_from)
    .lte('scheduled_time', filters.date_to);

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  if (filters.ad !== 'ALL') {
    query = query.eq('movement_type', filters.ad);
  }

  if (filters.airline_code) {
    query = query.eq('airline_code', filters.airline_code);
  }

  const { data, error } = await query;

  if (error) throw error;

  type MovementTimeData = { scheduled_time: string; movement_type: string };
  const dailyMap = new Map<string, { arrivals: number; departures: number }>();

  ((data as MovementTimeData[]) || []).forEach((m: MovementTimeData) => {
    const date = new Date(m.scheduled_time).toISOString().split('T')[0];
    const entry = dailyMap.get(date) || { arrivals: 0, departures: 0 };

    if (m.movement_type === 'ARR') entry.arrivals++;
    else if (m.movement_type === 'DEP') entry.departures++;

    dailyMap.set(date, entry);
  });

  return Array.from(dailyMap.entries())
    .map(([date, counts]) => ({
      date,
      arrivals: counts.arrivals,
      departures: counts.departures,
      total: counts.arrivals + counts.departures
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Statistiques de facturation
 */
export async function getBillingStats(filters: DashboardFilters): Promise<BillingStats> {
  let query = supabase
    .from('invoices')
    .select('total_amount, paid_amount, status, issue_date, due_date');

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  // Filtrer par dates (issue_date dans la période)
  query = query
    .gte('issue_date', filters.date_from)
    .lte('issue_date', filters.date_to);

  if (filters.invoice_status !== 'ALL') {
    query = query.eq('status', filters.invoice_status);
  }

  const { data, error } = await query;

  if (error) throw error;

  const invoices = data || [];

  const billedTotal = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const collectedTotal = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const recoveryRate = billedTotal > 0 ? (collectedTotal / billedTotal) * 100 : 0;

  // Impayés (status OVERDUE ou due_date passée sans paiement complet)
  const now = new Date();
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'OVERDUE') return true;
    if (inv.status === 'ISSUED' && inv.due_date) {
      const dueDate = new Date(inv.due_date);
      const unpaid = (inv.total_amount || 0) - (inv.paid_amount || 0);
      return dueDate < now && unpaid > 0;
    }
    return false;
  });

  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);

  // Aging buckets
  const agingBuckets = {
    bucket_0_30: 0,
    bucket_31_60: 0,
    bucket_61_90: 0,
    bucket_90_plus: 0
  };

  overdueInvoices.forEach((inv) => {
    if (!inv.due_date) return;
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const unpaid = (inv.total_amount || 0) - (inv.paid_amount || 0);

    if (daysOverdue <= 30) agingBuckets.bucket_0_30 += unpaid;
    else if (daysOverdue <= 60) agingBuckets.bucket_31_60 += unpaid;
    else if (daysOverdue <= 90) agingBuckets.bucket_61_90 += unpaid;
    else agingBuckets.bucket_90_plus += unpaid;
  });

  return {
    billedTotal,
    collectedTotal,
    recoveryRate,
    overdueTotal,
    agingBuckets
  };
}

/**
 * Série temporelle du CA (facturé vs encaissé)
 */
export async function getRevenueTimeseries(filters: DashboardFilters): Promise<RevenueDataPoint[]> {
  let query = supabase
    .from('invoices')
    .select('issue_date, total_amount, paid_amount');

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  query = query
    .gte('issue_date', filters.date_from)
    .lte('issue_date', filters.date_to);

  if (filters.invoice_status !== 'ALL') {
    query = query.eq('status', filters.invoice_status);
  }

  const { data, error } = await query;

  if (error) throw error;

  const dailyMap = new Map<string, { billed: number; collected: number }>();

  (data || []).forEach((inv) => {
    const date = new Date(inv.issue_date).toISOString().split('T')[0];
    const entry = dailyMap.get(date) || { billed: 0, collected: 0 };

    entry.billed += inv.total_amount || 0;
    entry.collected += inv.paid_amount || 0;

    dailyMap.set(date, entry);
  });

  return Array.from(dailyMap.entries())
    .map(([date, amounts]) => ({
      date,
      billed: amounts.billed,
      collected: amounts.collected
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Top destinations (code IATA)
 * metric: FLIGHTS | PAX | REVENUE
 * direction: DEPARTURES (destination) | ARRIVALS (origin)
 */
export async function getTopDestinations(
  filters: DashboardFilters,
  metric: 'FLIGHTS' | 'PAX' | 'REVENUE',
  direction: 'DEPARTURES' | 'ARRIVALS',
  limit: number = 5
): Promise<TopDestination[]> {
  const fieldName = direction === 'DEPARTURES' ? 'destination' : 'origin';

  let query = supabase
    .from('aircraft_movements')
    .select(`${fieldName}, pax_arr, pax_dep, mtow_kg`)
    .gte('scheduled_time', filters.date_from)
    .lte('scheduled_time', filters.date_to);

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  if (filters.ad !== 'ALL') {
    query = query.eq('movement_type', filters.ad);
  }

  if (filters.airline_code) {
    query = query.eq('airline_code', filters.airline_code);
  }

  const { data, error } = await query;

  if (error) throw error;

  type DestData = {
    destination?: string | null;
    origin?: string | null;
    pax_arr: number | null;
    pax_dep: number | null;
    mtow_kg: number | null;
  };

  const codeMap = new Map<string, { flights: number; pax: number; revenue: number }>();

  ((data as DestData[]) || []).forEach((m: DestData) => {
    const code = (m as Record<string, unknown>)[fieldName];
    if (!code || typeof code !== 'string') return;

    const entry = codeMap.get(code) || { flights: 0, pax: 0, revenue: 0 };

    entry.flights++;

    // PAX
    const pax = direction === 'DEPARTURES' ? (m.pax_dep || 0) : (m.pax_arr || 0);
    entry.pax += pax;

    // Revenue (simplifié: basé sur MTOW * coeff arbitraire)
    entry.revenue += (m.mtow_kg || 0) * 0.5; // À adapter selon les tarifs réels

    codeMap.set(code, entry);
  });

  // Trier selon la métrique
  const sortedEntries = Array.from(codeMap.entries())
    .map(([code, values]) => ({
      code,
      value: metric === 'FLIGHTS' ? values.flights : metric === 'PAX' ? values.pax : values.revenue
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const totalValue = sortedEntries.reduce((sum, e) => sum + e.value, 0);

  // Enrichir avec le nom de l'aéroport si possible
  const codes = sortedEntries.map((e) => e.code);
  const { data: airportsData } = await supabase
    .from('airports')
    .select('iata_code, name')
    .in('iata_code', codes);

  const airportNames = new Map((airportsData || []).map((a) => [a.iata_code, a.name]));

  return sortedEntries.map((e) => ({
    code: e.code,
    name: airportNames.get(e.code) || null,
    value: e.value,
    share: totalValue > 0 ? (e.value / totalValue) * 100 : 0
  }));
}

/**
 * Top compagnies
 */
export async function getTopAirlines(
  filters: DashboardFilters,
  metric: 'FLIGHTS' | 'PAX' | 'REVENUE',
  limit: number = 5
): Promise<TopAirline[]> {
  let query = supabase
    .from('aircraft_movements')
    .select('airline_code, airline_name, pax_arr, pax_dep, mtow_kg')
    .gte('scheduled_time', filters.date_from)
    .lte('scheduled_time', filters.date_to);

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  if (filters.ad !== 'ALL') {
    query = query.eq('movement_type', filters.ad);
  }

  if (filters.airline_code) {
    query = query.eq('airline_code', filters.airline_code);
  }

  const { data, error } = await query;

  if (error) throw error;

  type AirlineData = {
    airline_code: string | null;
    airline_name: string | null;
    pax_arr: number | null;
    pax_dep: number | null;
    mtow_kg: number | null;
  };

  const airlineMap = new Map<string, { name: string | null; flights: number; pax: number; revenue: number }>();

  ((data as AirlineData[]) || []).forEach((m: AirlineData) => {
    if (!m.airline_code) return;

    const entry = airlineMap.get(m.airline_code) || {
      name: m.airline_name || null,
      flights: 0,
      pax: 0,
      revenue: 0
    };

    entry.flights++;
    entry.pax += (m.pax_arr || 0) + (m.pax_dep || 0);
    entry.revenue += (m.mtow_kg || 0) * 0.5;

    airlineMap.set(m.airline_code, entry);
  });

  const sortedEntries = Array.from(airlineMap.entries())
    .map(([code, values]) => ({
      airline: code,
      airline_name: values.name,
      value: metric === 'FLIGHTS' ? values.flights : metric === 'PAX' ? values.pax : values.revenue
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const totalValue = sortedEntries.reduce((sum, e) => sum + e.value, 0);

  return sortedEntries.map((e) => ({
    ...e,
    share: totalValue > 0 ? (e.value / totalValue) * 100 : 0
  }));
}

/**
 * Statistiques parking
 */
export async function getParkingStats(filters: DashboardFilters): Promise<ParkingStats> {
  let standsQuery = supabase.from('stands').select('id', { count: 'exact', head: true });

  if (filters.airport_id) {
    standsQuery = standsQuery.eq('airport_id', filters.airport_id);
  }

  if (filters.parking_zone) {
    standsQuery = standsQuery.eq('zone', filters.parking_zone);
  }

  const { count: capacity, error: standsError } = await standsQuery;

  if (standsError) throw standsError;

  // Mouvements occupant un stand dans la période (ARR avec actual_time dans la période)
  let occupiedQuery = supabase
    .from('aircraft_movements')
    .select('stand_id', { count: 'exact', head: false })
    .eq('movement_type', 'ARR')
    .not('stand_id', 'is', null)
    .gte('actual_time', filters.date_from)
    .lte('actual_time', filters.date_to);

  if (filters.airport_id) {
    occupiedQuery = occupiedQuery.eq('airport_id', filters.airport_id);
  }

  const { data: occupiedData, error: occupiedError } = await occupiedQuery;

  if (occupiedError) throw occupiedError;

  type StandData = { stand_id: string | null };
  const uniqueStands = new Set(((occupiedData as StandData[]) || []).map((m: StandData) => m.stand_id));
  const occupied = uniqueStands.size;

  const occupancyRate = (capacity || 0) > 0 ? (occupied / (capacity || 1)) * 100 : 0;

  return {
    occupied,
    capacity: capacity || 0,
    occupancyRate
  };
}

/**
 * Top 10 factures en retard
 */
export async function getTopOverdueInvoices(filters: DashboardFilters, limit: number = 10): Promise<OverdueInvoice[]> {
  let query = supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, total_amount, paid_amount, due_date, status')
    .in('status', ['ISSUED', 'OVERDUE']);

  if (filters.airport_id) {
    query = query.eq('airport_id', filters.airport_id);
  }

  const { data, error } = await query;

  if (error) throw error;

  const now = new Date();

  const overdueInvoices = (data || [])
    .filter((inv) => {
      if (!inv.due_date) return false;
      const unpaid = (inv.total_amount || 0) - (inv.paid_amount || 0);
      return new Date(inv.due_date) < now && unpaid > 0;
    })
    .map((inv) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name || null,
        amount: (inv.total_amount || 0) - (inv.paid_amount || 0),
        due_date: inv.due_date,
        days_overdue: daysOverdue
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, limit);

  return overdueInvoices;
}
