import { z } from 'zod';

export const standSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  max_mtow_kg: z.number().positive('Le MTOW maximum doit être positif'),
  contact_gate: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
  wingspan_max_m: z.number().positive('L\'envergure doit être positive').optional(),
  arc_letter_max: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).optional(),
  group_key: z.string().optional(),
  is_group_parent: z.boolean().optional(),
  group_priority: z.number().min(1).max(2).optional(),
  length_m: z.number().positive('La longueur doit être positive').optional(),
  width_m: z.number().positive('La largeur doit être positive').optional(),
});

export type StandFormData = z.infer<typeof standSchema>;
