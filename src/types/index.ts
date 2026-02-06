export type UserRole = 'ADMIN' | 'ATS' | 'OPS' | 'AIM' | 'FIN';

export type MovementType = 'ARR' | 'DEP';

export type MovementStatus =
  | 'Planned'
  | 'Approche'
  | 'Posé'
  | 'Enregistrement'
  | 'Décollé'
  | 'Annulé'
  | 'Reporté'
  | 'Arrived'
  | 'Departed'
  | 'Canceled';

export type TrafficType = 'NAT' | 'INT';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED';

export type DocumentType = 'PROFORMA' | 'INVOICE';

export type ItemGroup = 'AERO' | 'ESC' | 'SURETE' | 'OTHER';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  airport_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Airport {
  id: string;
  name: string;
  icao_code: string;
  iata_code: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  elevation_m?: number | null;
  runways?: string | null;
  stands_count?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stand {
  id: string;
  airport_id: string;
  name: string;
  max_mtow_kg: number;
  contact_gate?: boolean;
  is_blocked?: boolean;
  wingspan_max_m?: number | null;
  arc_letter_max?: string | null;
  group_key?: string | null;
  is_group_parent?: boolean;
  group_priority?: number;
  length_m?: number | null;
  width_m?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Aircraft {
  id: string;
  registration: string;
  type: string;
  mtow_kg?: number | null;
  seats?: number | null;
  length_m?: number | null;
  wingspan_m?: number | null;
  height_m?: number | null;
  operator?: string | null;
  remarks?: string | null;
  code_oaci?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AircraftRegistry {
  id: string;
  registration: string;
  mtow_kg?: number | null;
  airline_code?: string | null;
  airline_name?: string | null;
  aircraft_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  airport_id: string;
  flight_number: string;
  aircraft_type: string;
  registration: string;
  movement_type: MovementType;
  scheduled_time: string;
  actual_time?: string | null;
  stand_id?: string | null;
  status: MovementStatus;
  billable: boolean;
  mtow_kg?: number | null;
  rotation_id?: string | null;
  airline_code?: string | null;
  airline_name?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  flight_no_arr?: string | null;
  flight_no_dep?: string | null;
  pax_arr_full?: number;
  pax_arr_half?: number;
  pax_dep_full?: number;
  pax_dep_half?: number;
  pax_transit?: number;
  pax_connecting?: number;
  mail_arr_kg?: number;
  mail_dep_kg?: number;
  freight_arr_kg?: number;
  freight_dep_kg?: number;
  traffic_type?: TrafficType | null;
  is_locked: boolean;
  is_invoiced: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovementWithStand extends Movement {
  stand_name?: string | null;
}

export interface Invoice {
  id: string;
  airport_id: string;
  movement_arr_id?: string | null;
  movement_dep_id?: string | null;
  invoice_number: string;
  customer: string;
  mtow_kg: number;
  aircraft_type: string;
  registration: string;
  traffic_type: TrafficType;
  arr_datetime?: string | null;
  dep_datetime?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  status: InvoiceStatus;
  total_xof: number;
  pdf_url?: string | null;
  notes?: string | null;
  document_type: DocumentType;
  rotation_id?: string | null;
  landing_fee_xof?: number;
  parking_fee_xof?: number;
  lighting_fee_xof?: number;
  passenger_fee_xof?: number;
  security_fee_xof?: number;
  freight_fee_xof?: number;
  fuel_fee_xof?: number;
  overtime_fee_xof?: number;
  subtotal_xof?: number;
  tax_xof?: number;
  discount_xof?: number;
  calculation_details?: Record<string, unknown>;
  pax_total?: number;
  parking_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  code: string;
  label: string;
  qty: number;
  unit_price_xof: number;
  total_xof: number;
  item_group: ItemGroup;
  sort_order: number;
  created_at: string;
}

export interface MovementFilters {
  startDate?: string;
  endDate?: string;
  movementType?: MovementType;
  status?: MovementStatus;
  registration?: string;
  flightNumber?: string;
  airlineCode?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
