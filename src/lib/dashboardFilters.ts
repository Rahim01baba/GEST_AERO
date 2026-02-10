/**
 * Dashboard Filters - URL Synchronization & Types
 * Gère les filtres du dashboard et leur synchronisation avec l'URL
 */

import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export type MovementDirection = 'ALL' | 'ARR' | 'DEP';
export type InvoiceStatus = 'ALL' | 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE';
export type DateRangePreset = 'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM';
export type TopMetric = 'FLIGHTS' | 'PAX' | 'REVENUE';
export type DestinationDirection = 'DEPARTURES' | 'ARRIVALS';

export interface DashboardFilters {
  airport_id?: string;
  date_from: string; // ISO string
  date_to: string; // ISO string
  ad: MovementDirection;
  airline_code?: string;
  invoice_status: InvoiceStatus;
  parking_zone?: string;
  preset?: DateRangePreset;
}

export interface UrlFiltersParams extends Omit<DashboardFilters, 'date_from' | 'date_to'> {
  date_from?: string;
  date_to?: string;
  destination?: string;
  origin?: string;
  occupied?: string;
  metric?: TopMetric;
  direction?: DestinationDirection;
}

/**
 * Construit les filtres dashboard depuis les query params URL
 * CORRIGÉ: Gère correctement les timezones en forçant les dates locales
 */
export function buildDashboardFiltersFromUrl(searchParams: URLSearchParams): DashboardFilters {
  const today = new Date();
  const preset = (searchParams.get('preset') as DateRangePreset) || 'MONTH';

  let dateFrom: Date;
  let dateTo: Date;

  // Gestion des presets
  switch (preset) {
    case 'TODAY':
      dateFrom = startOfDay(today);
      dateTo = endOfDay(today);
      break;
    case '7DAYS':
      dateFrom = startOfDay(subDays(today, 6));
      dateTo = endOfDay(today);
      break;
    case 'MONTH':
      dateFrom = startOfMonth(today);
      dateTo = endOfMonth(today);
      break;
    case 'CUSTOM':
      const customFrom = searchParams.get('date_from');
      const customTo = searchParams.get('date_to');
      if (customFrom && customTo) {
        // Parse les dates en local (pas UTC) en ajoutant l'heure
        dateFrom = new Date(customFrom + 'T00:00:00');
        dateTo = new Date(customTo + 'T23:59:59');
      } else {
        dateFrom = startOfMonth(today);
        dateTo = endOfMonth(today);
      }
      break;
    default:
      dateFrom = startOfMonth(today);
      dateTo = endOfMonth(today);
  }

  // Conversion en UTC pour requêtes Supabase
  // Important: on convertit les dates locales en ISO UTC
  const date_from_utc = dateFrom.toISOString();
  const date_to_utc = dateTo.toISOString();

  // Debug logging (production safe)
  if (typeof window !== 'undefined' && (window as unknown as { __DEBUG_DASHBOARD?: boolean }).__DEBUG_DASHBOARD) {
    console.log('[Dashboard Filters]', {
      preset,
      dateFromLocal: format(dateFrom, 'yyyy-MM-dd HH:mm:ss'),
      dateToLocal: format(dateTo, 'yyyy-MM-dd HH:mm:ss'),
      dateFromUTC: date_from_utc,
      dateToUTC: date_to_utc
    });
  }

  return {
    airport_id: searchParams.get('airport_id') || undefined,
    date_from: date_from_utc,
    date_to: date_to_utc,
    ad: (searchParams.get('ad') as MovementDirection) || 'ALL',
    airline_code: searchParams.get('airline_code') || undefined,
    invoice_status: (searchParams.get('invoice_status') as InvoiceStatus) || 'ALL',
    parking_zone: searchParams.get('parking_zone') || undefined,
    preset
  };
}

/**
 * Met à jour les query params URL avec les nouveaux filtres
 */
export function updateUrlFilters(
  navigate: (url: string) => void,
  filters: Partial<DashboardFilters>,
  additionalParams?: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams(window.location.search);

  // Mise à jour des filtres
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'date_from' || key === 'date_to') {
        searchParams.set(key, format(new Date(value as string), 'yyyy-MM-dd'));
      } else {
        searchParams.set(key, String(value));
      }
    } else {
      searchParams.delete(key);
    }
  });

  // Paramètres additionnels (pour drill-down)
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });
  }

  navigate(`?${searchParams.toString()}`);
}

/**
 * Construit une URL vers une page avec les filtres actuels
 */
export function buildNavigationUrl(
  targetPath: string,
  currentFilters: DashboardFilters,
  additionalParams?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();

  // Filtres principaux
  if (currentFilters.airport_id) params.set('airport_id', currentFilters.airport_id);
  params.set('date_from', format(new Date(currentFilters.date_from), 'yyyy-MM-dd'));
  params.set('date_to', format(new Date(currentFilters.date_to), 'yyyy-MM-dd'));
  if (currentFilters.ad !== 'ALL') params.set('ad', currentFilters.ad);
  if (currentFilters.airline_code) params.set('airline_code', currentFilters.airline_code);
  if (currentFilters.invoice_status !== 'ALL') params.set('invoice_status', currentFilters.invoice_status);
  if (currentFilters.parking_zone) params.set('parking_zone', currentFilters.parking_zone);

  // Paramètres additionnels
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, value);
    });
  }

  return `${targetPath}?${params.toString()}`;
}

/**
 * Reset tous les filtres à leurs valeurs par défaut
 */
export function getDefaultFilters(): DashboardFilters {
  const today = new Date();
  return {
    date_from: startOfMonth(today).toISOString(),
    date_to: endOfMonth(today).toISOString(),
    ad: 'ALL',
    invoice_status: 'ALL',
    preset: 'MONTH'
  };
}

/**
 * Formate une date pour affichage
 */
export function formatDateForDisplay(isoString: string): string {
  return format(new Date(isoString), 'dd/MM/yyyy');
}

/**
 * Calcule le libellé de la période selon le preset
 */
export function getDateRangeLabel(preset: DateRangePreset, dateFrom: string, dateTo: string): string {
  switch (preset) {
    case 'TODAY':
      return "Aujourd'hui";
    case '7DAYS':
      return '7 derniers jours';
    case 'MONTH':
      return 'Mois en cours';
    case 'CUSTOM':
      return `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}`;
    default:
      return 'Période personnalisée';
  }
}
