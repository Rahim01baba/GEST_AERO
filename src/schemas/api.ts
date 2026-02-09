/**
 * API Validation Schemas - Zod schemas for Edge Functions
 *
 * These schemas validate requests on the server side
 */

import { z } from 'zod';

export const CreateMovementSchema = z.object({
  scheduled_time: z.string().datetime(),
  movement_type: z.enum(['ARR', 'DEP']),
  registration: z.string().min(1).max(20),
  aircraft_type: z.string().optional(),
  aircraft_id: z.string().uuid().optional().nullable(),
  mtow_kg: z.number().int().min(0).optional().nullable(),
  airline_code: z.string().max(3).optional().nullable(),
  airline_name: z.string().max(100).optional().nullable(),
  origin_iata: z.string().length(3).optional().nullable(),
  destination_iata: z.string().length(3).optional().nullable(),
  flight_no_arr: z.string().max(10).optional().nullable(),
  flight_no_dep: z.string().max(10).optional().nullable(),
  traffic_type: z.enum(['NAT', 'INT']).optional().nullable(),
  pax_arr: z.number().int().min(0).optional().nullable(),
  pax_dep: z.number().int().min(0).optional().nullable(),
  connecting_pax: z.number().int().min(0).optional().nullable(),
  cargo_kg: z.number().int().min(0).optional().nullable(),
  mail_kg: z.number().int().min(0).optional().nullable(),
  status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']).optional(),
  actual_time: z.string().datetime().optional().nullable(),
  stand_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  rotation_id: z.string().uuid().optional().nullable(),
});

export const UpdateMovementSchema = z.object({
  id: z.string().uuid(),
  scheduled_time: z.string().datetime().optional(),
  movement_type: z.enum(['ARR', 'DEP']).optional(),
  registration: z.string().min(1).max(20).optional(),
  aircraft_type: z.string().optional().nullable(),
  aircraft_id: z.string().uuid().optional().nullable(),
  mtow_kg: z.number().int().min(0).optional().nullable(),
  airline_code: z.string().max(3).optional().nullable(),
  airline_name: z.string().max(100).optional().nullable(),
  origin_iata: z.string().length(3).optional().nullable(),
  destination_iata: z.string().length(3).optional().nullable(),
  flight_no_arr: z.string().max(10).optional().nullable(),
  flight_no_dep: z.string().max(10).optional().nullable(),
  traffic_type: z.enum(['NAT', 'INT']).optional().nullable(),
  pax_arr: z.number().int().min(0).optional().nullable(),
  pax_dep: z.number().int().min(0).optional().nullable(),
  connecting_pax: z.number().int().min(0).optional().nullable(),
  cargo_kg: z.number().int().min(0).optional().nullable(),
  mail_kg: z.number().int().min(0).optional().nullable(),
  status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']).optional(),
  actual_time: z.string().datetime().optional().nullable(),
  stand_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  rotation_id: z.string().uuid().optional().nullable(),
});

export const InvoicePreviewSchema = z.object({
  movement_ids: z.array(z.string().uuid()).min(1),
  airport_id: z.string().uuid(),
});

export const CreateInvoiceSchema = z.object({
  movement_ids: z.array(z.string().uuid()).min(1),
  airport_id: z.string().uuid(),
  invoice_type: z.enum(['proforma', 'final']),
  billing_entity: z.string().optional().nullable(),
});

export type CreateMovementInput = z.infer<typeof CreateMovementSchema>;
export type UpdateMovementInput = z.infer<typeof UpdateMovementSchema>;
export type InvoicePreviewInput = z.infer<typeof InvoicePreviewSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
