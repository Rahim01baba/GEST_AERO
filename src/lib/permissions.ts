import type { User } from './supabase'

export type DbRole = 'ADMIN' | 'ATS' | 'OPS' | 'AIM' | 'FIN'

export interface UserRole {
    role: DbRole
    scope: 'local' | 'global'
    airport_id: string | null
    email: string
    isAdmin: boolean
}

const VALID_ROLES: DbRole[] = ['ADMIN', 'ATS', 'OPS', 'AIM', 'FIN']

/**
   * Derive le role applicatif a partir du profil DB de l'utilisateur
   * authentifie (table `users`, colonnes `role` + `airport_id`), conformement
   * a la matrice de permissions du cahier des charges (section 6.2).
   *
   * Avant ce correctif, le role etait devine par une regex sur l'email
   * (ex: atsabj@airport.com -> ATS local), ce qui ignorait totalement les
   * roles OPS et FIN pourtant presents en base: un utilisateur OPS ou FIN
   * heritait silencieusement des droits d'un ATS local.
   */
export function getUserRole(user: Pick<User, 'email' | 'role' | 'airport_id'>): UserRole {
    const role: DbRole = VALID_ROLES.includes(user.role as DbRole) ? (user.role as DbRole) : 'ATS'

  return {
        role,
        scope: user.airport_id ? 'local' : 'global',
        airport_id: user.airport_id ?? null,
        email: user.email.toLowerCase(),
        isAdmin: role === 'ADMIN'
  }
}

export type Action =
    | 'view_movements'
  | 'edit_movements'
  | 'create_movements'
  | 'delete_movements'
  | 'view_invoices'
  | 'create_invoice'
  | 'create_proforma'
  | 'export_csv'
  | 'edit_airport'
  | 'edit_aircraft'
  | 'edit_billing_settings'

/**
   * Regles issues de la matrice de permissions du cahier des charges (6.2):
   * - ATS: creer/modifier/supprimer les mouvements
   * - OPS: gestion parking/stands (lecture seule sur le reste, pas d'action
   *   dediee dans cette enumeration pour le moment)
   * - AIM: gestion du registre aeronefs
   * - FIN: creation/edition des factures (corrige: c'etait AIM par erreur)
   * - ADMIN: acces total (voir isAdmin plus haut)
   */
export function can(action: Action, userRole: UserRole): boolean {
    if (userRole.isAdmin) {
          return true
    }

  const { role } = userRole

  switch (action) {
    case 'view_movements':
    case 'view_invoices':
    case 'export_csv':
            return true

    case 'edit_movements':
    case 'create_movements':
    case 'delete_movements':
            return role === 'ATS'

    case 'create_invoice':
    case 'create_proforma':
            return role === 'FIN'

    case 'edit_aircraft':
            return role === 'AIM'

    case 'edit_airport':
    case 'edit_billing_settings':
            return false

    default:
            return false
  }
}

export function canViewAllAirports(userRole: UserRole): boolean {
    return userRole.isAdmin
}
