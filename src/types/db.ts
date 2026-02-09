/**
 * Database type aliases for easier usage throughout the app
 */

import type { Database } from './supabase.types';

export type MovementRow = Database['public']['Tables']['aircraft_movements']['Row'];
export type MovementInsert = Database['public']['Tables']['aircraft_movements']['Insert'];
export type MovementUpdate = Database['public']['Tables']['aircraft_movements']['Update'];

export type StandRow = Database['public']['Tables']['stands']['Row'];
export type StandInsert = Database['public']['Tables']['stands']['Insert'];
export type StandUpdate = Database['public']['Tables']['stands']['Update'];

export type AirportRow = Database['public']['Tables']['airports']['Row'];
export type AirportInsert = Database['public']['Tables']['airports']['Insert'];
export type AirportUpdate = Database['public']['Tables']['airports']['Update'];

export type AircraftRow = Database['public']['Tables']['aircrafts']['Row'];
export type AircraftInsert = Database['public']['Tables']['aircrafts']['Insert'];
export type AircraftUpdate = Database['public']['Tables']['aircrafts']['Update'];

export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type BillingSettingsRow = Database['public']['Tables']['billing_settings']['Row'];
export type BillingSettingsInsert = Database['public']['Tables']['billing_settings']['Insert'];
export type BillingSettingsUpdate = Database['public']['Tables']['billing_settings']['Update'];

export type { Database };
