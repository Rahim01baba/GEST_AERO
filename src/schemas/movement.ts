import { z } from 'zod';

export const movementSchema = z.object({
  flight_number: z.string().min(1, 'Le numéro de vol est requis'),
  registration: z.string().min(1, 'L\'immatriculation est requise'),
  aircraft_type: z.string().min(1, 'Le type d\'avion est requis'),
  movement_type: z.enum(['ARR', 'DEP'], {
    message: 'Type de mouvement invalide',
  }),
  scheduled_time: z.string().min(1, 'L\'heure est requise'),
  actual_time: z.string().optional(),
  stand_id: z.string().optional(),
  status: z.enum([
    'Planned',
    'Approche',
    'Posé',
    'Enregistrement',
    'Décollé',
    'Annulé',
    'Reporté',
    'Arrived',
    'Departed',
    'Canceled',
  ]),
  mtow_kg: z.number().positive('Le MTOW doit être positif').optional(),
  airline_code: z.string().optional(),
  airline_name: z.string().optional(),
  origin_iata: z.string().length(3, 'Code IATA invalide').optional(),
  destination_iata: z.string().length(3, 'Code IATA invalide').optional(),
  traffic_type: z.enum(['NAT', 'INT']).optional(),
  pax_arr_full: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  pax_arr_half: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  pax_dep_full: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  pax_dep_half: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  pax_transit: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  pax_connecting: z.number().min(0, 'Le nombre de passagers ne peut être négatif').optional(),
  freight_arr_kg: z.number().min(0, 'Le poids ne peut être négatif').optional(),
  freight_dep_kg: z.number().min(0, 'Le poids ne peut être négatif').optional(),
  mail_arr_kg: z.number().min(0, 'Le poids ne peut être négatif').optional(),
  mail_dep_kg: z.number().min(0, 'Le poids ne peut être négatif').optional(),
  billable: z.boolean().default(true),
});

export type MovementFormData = z.infer<typeof movementSchema>;
