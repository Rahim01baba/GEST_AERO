import { z } from 'zod';

export const aircraftSchema = z.object({
  registration: z.string().min(1, 'L\'immatriculation est requise'),
  type: z.string().min(1, 'Le type est requis'),
  mtow_kg: z.number().positive('Le MTOW doit être positif').optional(),
  seats: z.number().positive('Le nombre de sièges doit être positif').optional(),
  length_m: z.number().positive('La longueur doit être positive').optional(),
  wingspan_m: z.number().positive('L\'envergure doit être positive').optional(),
  height_m: z.number().positive('La hauteur doit être positive').optional(),
  operator: z.string().optional(),
  remarks: z.string().optional(),
  code_oaci: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).optional(),
});

export type AircraftFormData = z.infer<typeof aircraftSchema>;
