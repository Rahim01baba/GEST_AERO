/**
 * Auto-generated types from Supabase schema
 * Generated on: 2026-02-09
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      airports: {
        Row: {
          id: string
          name: string
          icao_code: string
          iata_code: string
          timezone: string
          latitude: number | null
          longitude: number | null
          created_at: string | null
          updated_at: string | null
          city: string | null
          country: string | null
          elevation_m: number | null
          runways: string | null
          stands_count: number | null
          description: string | null
        }
        Insert: {
          id?: string
          name: string
          icao_code: string
          iata_code: string
          timezone?: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
          updated_at?: string | null
          city?: string | null
          country?: string | null
          elevation_m?: number | null
          runways?: string | null
          stands_count?: number | null
          description?: string | null
        }
        Update: {
          id?: string
          name?: string
          icao_code?: string
          iata_code?: string
          timezone?: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
          updated_at?: string | null
          city?: string | null
          country?: string | null
          elevation_m?: number | null
          runways?: string | null
          stands_count?: number | null
          description?: string | null
        }
      }
      aircraft_movements: {
        Row: {
          id: string
          airport_id: string
          flight_number: string
          aircraft_type: string
          registration: string
          movement_type: 'ARR' | 'DEP'
          scheduled_time: string
          actual_time: string | null
          stand_id: string | null
          status: string
          billable: boolean | null
          created_at: string | null
          updated_at: string | null
          mtow_kg: number | null
          rotation_id: string | null
          airline_code: string | null
          airline_name: string | null
          origin_iata: string | null
          destination_iata: string | null
          flight_no_arr: string | null
          flight_no_dep: string | null
          pax_arr_full: number | null
          pax_arr_half: number | null
          pax_dep_full: number | null
          pax_dep_half: number | null
          pax_transit: number | null
          mail_arr_kg: number | null
          mail_dep_kg: number | null
          freight_arr_kg: number | null
          freight_dep_kg: number | null
          is_locked: boolean | null
          is_invoiced: boolean | null
          pax_connecting: number | null
          traffic_type: 'NAT' | 'INT' | null
        }
        Insert: {
          id?: string
          airport_id: string
          flight_number: string
          aircraft_type: string
          registration: string
          movement_type: 'ARR' | 'DEP'
          scheduled_time: string
          actual_time?: string | null
          stand_id?: string | null
          status?: string
          billable?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          mtow_kg?: number | null
          rotation_id?: string | null
          airline_code?: string | null
          airline_name?: string | null
          origin_iata?: string | null
          destination_iata?: string | null
          flight_no_arr?: string | null
          flight_no_dep?: string | null
          pax_arr_full?: number | null
          pax_arr_half?: number | null
          pax_dep_full?: number | null
          pax_dep_half?: number | null
          pax_transit?: number | null
          mail_arr_kg?: number | null
          mail_dep_kg?: number | null
          freight_arr_kg?: number | null
          freight_dep_kg?: number | null
          is_locked?: boolean | null
          is_invoiced?: boolean | null
          pax_connecting?: number | null
          traffic_type?: 'NAT' | 'INT' | null
        }
        Update: {
          id?: string
          airport_id?: string
          flight_number?: string
          aircraft_type?: string
          registration?: string
          movement_type?: 'ARR' | 'DEP'
          scheduled_time?: string
          actual_time?: string | null
          stand_id?: string | null
          status?: string
          billable?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          mtow_kg?: number | null
          rotation_id?: string | null
          airline_code?: string | null
          airline_name?: string | null
          origin_iata?: string | null
          destination_iata?: string | null
          flight_no_arr?: string | null
          flight_no_dep?: string | null
          pax_arr_full?: number | null
          pax_arr_half?: number | null
          pax_dep_full?: number | null
          pax_dep_half?: number | null
          pax_transit?: number | null
          mail_arr_kg?: number | null
          mail_dep_kg?: number | null
          freight_arr_kg?: number | null
          freight_dep_kg?: number | null
          is_locked?: boolean | null
          is_invoiced?: boolean | null
          pax_connecting?: number | null
          traffic_type?: 'NAT' | 'INT' | null
        }
      }
      stands: {
        Row: {
          id: string
          airport_id: string
          name: string
          max_mtow_kg: number
          contact_gate: boolean | null
          is_blocked: boolean | null
          created_at: string | null
          updated_at: string | null
          wingspan_max_m: number | null
          arc_letter_max: string | null
          group_key: string | null
          is_group_parent: boolean | null
          group_priority: number | null
          length_m: number | null
          width_m: number | null
        }
        Insert: {
          id?: string
          airport_id: string
          name: string
          max_mtow_kg: number
          contact_gate?: boolean | null
          is_blocked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          wingspan_max_m?: number | null
          arc_letter_max?: string | null
          group_key?: string | null
          is_group_parent?: boolean | null
          group_priority?: number | null
          length_m?: number | null
          width_m?: number | null
        }
        Update: {
          id?: string
          airport_id?: string
          name?: string
          max_mtow_kg?: number
          contact_gate?: boolean | null
          is_blocked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          wingspan_max_m?: number | null
          arc_letter_max?: string | null
          group_key?: string | null
          is_group_parent?: boolean | null
          group_priority?: number | null
          length_m?: number | null
          width_m?: number | null
        }
      }
      aircrafts: {
        Row: {
          id: string
          registration: string
          type: string
          mtow_kg: number | null
          seats: number | null
          length_m: number | null
          wingspan_m: number | null
          height_m: number | null
          operator: string | null
          remarks: string | null
          created_at: string | null
          updated_at: string | null
          code_oaci: string | null
        }
        Insert: {
          id?: string
          registration: string
          type: string
          mtow_kg?: number | null
          seats?: number | null
          length_m?: number | null
          wingspan_m?: number | null
          height_m?: number | null
          operator?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
          code_oaci?: string | null
        }
        Update: {
          id?: string
          registration?: string
          type?: string
          mtow_kg?: number | null
          seats?: number | null
          length_m?: number | null
          wingspan_m?: number | null
          height_m?: number | null
          operator?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
          code_oaci?: string | null
        }
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'ADMIN' | 'ATS' | 'OPS' | 'AIM' | 'FIN'
          airport_id: string | null
          active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: 'ADMIN' | 'ATS' | 'OPS' | 'AIM' | 'FIN'
          airport_id?: string | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'ADMIN' | 'ATS' | 'OPS' | 'AIM' | 'FIN'
          airport_id?: string | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      invoices: {
        Row: {
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
          total_xof: number | null
          pdf_url: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          landing_fee_xof: number | null
          parking_fee_xof: number | null
          lighting_fee_xof: number | null
          passenger_fee_xof: number | null
          security_fee_xof: number | null
          freight_fee_xof: number | null
          fuel_fee_xof: number | null
          overtime_fee_xof: number | null
          subtotal_xof: number | null
          tax_xof: number | null
          discount_xof: number | null
          calculation_details: Json | null
          pax_total: number | null
          parking_hours: number | null
          rotation_id: string | null
          document_type: 'PROFORMA' | 'INVOICE'
        }
        Insert: {
          id?: string
          airport_id: string
          movement_arr_id?: string | null
          movement_dep_id?: string | null
          invoice_number: string
          customer: string
          mtow_kg: number
          aircraft_type: string
          registration: string
          traffic_type: 'NAT' | 'INT'
          arr_datetime?: string | null
          dep_datetime?: string | null
          origin_iata?: string | null
          destination_iata?: string | null
          status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED'
          total_xof?: number | null
          pdf_url?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          landing_fee_xof?: number | null
          parking_fee_xof?: number | null
          lighting_fee_xof?: number | null
          passenger_fee_xof?: number | null
          security_fee_xof?: number | null
          freight_fee_xof?: number | null
          fuel_fee_xof?: number | null
          overtime_fee_xof?: number | null
          subtotal_xof?: number | null
          tax_xof?: number | null
          discount_xof?: number | null
          calculation_details?: Json | null
          pax_total?: number | null
          parking_hours?: number | null
          rotation_id?: string | null
          document_type?: 'PROFORMA' | 'INVOICE'
        }
        Update: {
          id?: string
          airport_id?: string
          movement_arr_id?: string | null
          movement_dep_id?: string | null
          invoice_number?: string
          customer?: string
          mtow_kg?: number
          aircraft_type?: string
          registration?: string
          traffic_type?: 'NAT' | 'INT'
          arr_datetime?: string | null
          dep_datetime?: string | null
          origin_iata?: string | null
          destination_iata?: string | null
          status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED'
          total_xof?: number | null
          pdf_url?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          landing_fee_xof?: number | null
          parking_fee_xof?: number | null
          lighting_fee_xof?: number | null
          passenger_fee_xof?: number | null
          security_fee_xof?: number | null
          freight_fee_xof?: number | null
          fuel_fee_xof?: number | null
          overtime_fee_xof?: number | null
          subtotal_xof?: number | null
          tax_xof?: number | null
          discount_xof?: number | null
          calculation_details?: Json | null
          pax_total?: number | null
          parking_hours?: number | null
          rotation_id?: string | null
          document_type?: 'PROFORMA' | 'INVOICE'
        }
      }
      billing_settings: {
        Row: {
          id: string
          airport_id: string | null
          fee_type: string
          fee_subtype: string | null
          description: string | null
          value: number
          currency: string
          unit: string | null
          is_active: boolean | null
          valid_from: string | null
          valid_until: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          airport_id?: string | null
          fee_type: string
          fee_subtype?: string | null
          description?: string | null
          value?: number
          currency?: string
          unit?: string | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          airport_id?: string | null
          fee_type?: string
          fee_subtype?: string | null
          description?: string | null
          value?: number
          currency?: string
          unit?: string | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
