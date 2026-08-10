/**
 * Shared validation schemas for Edge Functions
 *
 * NOTE: ces schemas ont ete corriges pour correspondre au schema reel de la
 * table `aircraft_movements` (voir src/lib/supabase.ts et les migrations
 * supabase/migrations/*). L'ancienne version utilisait des noms de colonnes
 * qui n'ont jamais existe (pax_arr, pax_dep, connecting_pax, cargo_kg, mail_kg)
 * et un statut en minuscules (planned/confirmed/...) alors que la vraie colonne
 * `status` utilise des valeurs en francais (Planned, Approche, Pose, ...). Ces
 * fonctions restent derriere le feature flag USE_EDGE_FUNCTIONS (desactive par
 * defaut) et n'ont pas pu etre testees en conditions reelles (pas d'acces a la
 * CLI/au projet Supabase depuis cet environnement) : a valider manuellement
 * avant toute activation en production.
 */

import { z } from 'npm:zod@3.22.4';

const MovementStatusEnum = z.enum([
    'Planned',
    'Arrived',
    'Departed',
    'Canceled',
    'Approche',
    'Posé',
    'Enregistrement',
    'Décollé',
    'Annulé',
    'Reporté',
  ]);

export const CreateMovementSchema = z.object({
    airport_id: z.string().uuid(),
    flight_number: z.string().min(1).max(20),
    flight_no_arr: z.string().max(10).optional().nullable(),
    flight_no_dep: z.string().max(10).optional().nullable(),
    scheduled_time: z.string().datetime(),
    movement_type: z.enum(['ARR', 'DEP']),
    registration: z.string().min(1).max(20),
    aircraft_type: z.string().optional().nullable(),
    mtow_kg: z.number().int().min(0).optional().nullable(),
    airline_code: z.string().max(3).optional().nullable(),
    airline_name: z.string().max(100).optional().nullable(),
    origin_iata: z.string().length(3).optional().nullable(),
    destination_iata: z.string().length(3).optional().nullable(),
    traffic_type: z.enum(['NAT', 'INT']).optional().nullable(),
    pax_arr_full: z.number().int().min(0).optional(),
    pax_arr_half: z.number().int().min(0).optional(),
    pax_dep_full: z.number().int().min(0).optional(),
    pax_dep_half: z.number().int().min(0).optional(),
    pax_transit: z.number().int().min(0).optional(),
    pax_connecting: z.number().int().min(0).optional(),
    mail_arr_kg: z.number().min(0).optional(),
    mail_dep_kg: z.number().min(0).optional(),
    freight_arr_kg: z.number().min(0).optional(),
    freight_dep_kg: z.number().min(0).optional(),
    status: MovementStatusEnum.optional(),
    billable: z.boolean().optional(),
    actual_time: z.string().datetime().optional().nullable(),
    stand_id: z.string().uuid().optional().nullable(),
    remarks: z.string().optional().nullable(),
    rotation_id: z.string().uuid().optional().nullable(),
});

export const UpdateMovementSchema = z.object({
    id: z.string().uuid(),
    airport_id: z.string().uuid().optional(),
    flight_number: z.string().min(1).max(20).optional(),
    flight_no_arr: z.string().max(10).optional().nullable(),
    flight_no_dep: z.string().max(10).optional().nullable(),
    scheduled_time: z.string().datetime().optional(),
    movement_type: z.enum(['ARR', 'DEP']).optional(),
    registration: z.string().min(1).max(20).optional(),
    aircraft_type: z.string().optional().nullable(),
    mtow_kg: z.number().int().min(0).optional().nullable(),
    airline_code: z.string().max(3).optional().nullable(),
    airline_name: z.string().max(100).optional().nullable(),
    origin_iata: z.string().length(3).optional().nullable(),
    destination_iata: z.string().length(3).optional().nullable(),
    traffic_type: z.enum(['NAT', 'INT']).optional().nullable(),
    pax_arr_full: z.number().int().min(0).optional(),
    pax_arr_half: z.number().int().min(0).optional(),
    pax_dep_full: z.number().int().min(0).optional(),
    pax_dep_half: z.number().int().min(0).optional(),
    pax_transit: z.number().int().min(0).optional(),
    pax_connecting: z.number().int().min(0).optional(),
    mail_arr_kg: z.number().min(0).optional(),
    mail_dep_kg: z.number().min(0).optional(),
    freight_arr_kg: z.number().min(0).optional(),
    freight_dep_kg: z.number().min(0).optional(),
    status: MovementStatusEnum.optional(),
    billable: z.boolean().optional(),
    actual_time: z.string().datetime().optional().nullable(),
    stand_id: z.string().uuid().optional().nullable(),
    remarks: z.string().optional().nullable(),
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
