import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'ADMIN' | 'DED-C' | 'ATS' | 'OPS' | 'AIM' | 'FIN'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  airport_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Airport {
  id: string
  name: string
  icao: string
  iata: string
  timezone: string
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface Runway {
  id: string
  airport_id: string
  name: string
  length_m: number
  width_m: number
  max_aircraft_type: string | null
  created_at: string
  updated_at: string
}

export interface Stand {
  id: string
  airport_id: string
  name: string
  max_mtow_kg: number
  wingspan_max_m: number | null
  arc_letter_max: string | null
  contact_gate: boolean
  is_blocked: boolean
  group_key: string | null
  is_group_parent: boolean
  group_priority: number
  created_at: string
  updated_at: string
}

export interface Terminal {
  id: string
  airport_id: string
  name: string
  arrival_capacity: number
  departure_capacity: number
  created_at: string
  updated_at: string
}

export interface AircraftMovement {
  id: string
  airport_id: string
  flight_number: string
  flight_no_arr: string | null
  flight_no_dep: string | null
  aircraft_type: string
  registration: string
  movement_type: 'ARR' | 'DEP'
  scheduled_time: string
  actual_time: string | null
  stand_id: string | null
  status: 'Planned' | 'Arrived' | 'Departed' | 'Canceled' | 'Approche' | 'Posé' | 'Enregistrement' | 'Décollé' | 'Annulé' | 'Reporté'
  billable: boolean
  mtow_kg: number | null
  rotation_id: string | null
  airline_code: string | null
  airline_name: string | null
  origin_iata: string | null
  destination_iata: string | null
  pax_arr_full: number
  pax_arr_half: number
  pax_dep_full: number
  pax_dep_half: number
  pax_transit: number
  mail_arr_kg: number
  mail_dep_kg: number
  freight_arr_kg: number
  freight_dep_kg: number
  is_invoiced: boolean
  created_at: string
  updated_at: string
}

export interface AircraftRegistry {
  id: string
  registration: string
  mtow_kg: number | null
  airline_code: string | null
  airline_name: string | null
  aircraft_type: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  airport_id: string
  movement_arr_id: string | null
  movement_dep_id: string | null
  invoice_number: string
  customer: string
  mtow_kg: number
  aircraft_type: string
  registration: string
  traffic_type: 'NAT' | 'INT'
  arr_datetime: string | null
  dep_datetime: string | null
  origin_iata: string | null
  destination_iata: string | null
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED'
  total_xof: number
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  code: string
  label: string
  qty: number
  unit_price_xof: number
  total_xof: number
  item_group: 'AERO' | 'ESC' | 'SURETE' | 'OTHER'
  sort_order: number
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  details: any
  timestamp: string
}

export async function logAudit(
  action: string,
  targetType: string,
  targetId?: string,
  details?: any
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  })
}
