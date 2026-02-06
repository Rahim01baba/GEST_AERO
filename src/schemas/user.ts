import { z } from 'zod';

export const userSchema = z.object({
  full_name: z.string().min(1, 'Le nom complet est requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['ADMIN', 'ATS', 'OPS', 'AIM', 'FIN'], {
    message: 'Rôle invalide',
  }),
  airport_id: z.string().optional(),
  active: z.boolean().default(true),
});

export type UserFormData = z.infer<typeof userSchema>;
