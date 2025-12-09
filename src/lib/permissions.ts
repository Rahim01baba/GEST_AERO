import { supabase } from './supabase'

export interface UserRole {
  role: 'ats' | 'aim' | 'cmd' | 'dedc' | 'diaa'
  scope: 'local' | 'global'
  airport_code?: string
  email: string
}

export function getUserRole(email: string): UserRole {
  const localPattern = /^(ats|aim|cmd)([a-z]{3})@airport\.com$/i
  const match = email.toLowerCase().match(localPattern)

  if (match) {
    return {
      role: match[1].toLowerCase() as 'ats' | 'aim' | 'cmd',
      scope: 'local',
      airport_code: match[2].toUpperCase(),
      email: email.toLowerCase()
    }
  }

  const globalPattern = /^(ats|aim|dedc|diaa)@airport\.com$/i
  const globalMatch = email.toLowerCase().match(globalPattern)

  if (globalMatch) {
    return {
      role: globalMatch[1].toLowerCase() as 'ats' | 'aim' | 'dedc' | 'diaa',
      scope: 'global',
      email: email.toLowerCase()
    }
  }

  return {
    role: 'ats',
    scope: 'local',
    email: email.toLowerCase()
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

export function can(action: Action, userRole: UserRole): boolean {
  const { role, scope } = userRole

  switch (action) {
    case 'view_movements':
      return true

    case 'edit_movements':
    case 'create_movements':
    case 'delete_movements':
      if (scope === 'local' && role === 'ats') return true
      return false

    case 'view_invoices':
      if (scope === 'local' && role === 'ats') return false
      return true

    case 'create_invoice':
    case 'create_proforma':
      if (role === 'aim') return true
      return false

    case 'export_csv':
      if (scope === 'local' && role === 'ats') return false
      return true

    case 'edit_airport':
      if (scope === 'global' && role === 'diaa') return true
      return false

    case 'edit_aircraft':
      if (scope === 'global' && role === 'aim') return true
      return false

    case 'edit_billing_settings':
      if (scope === 'global' && role === 'aim') return true
      return false

    default:
      return false
  }
}

export async function getAirportIdForUser(email: string): Promise<string | null> {
  const userRole = getUserRole(email)

  if (userRole.scope === 'local' && userRole.airport_code) {
    const { data: airport } = await supabase
      .from('airports')
      .select('id')
      .eq('iata_code', userRole.airport_code)
      .maybeSingle()

    return airport?.id || null
  }

  return null
}

export function canViewAllAirports(userRole: UserRole): boolean {
  return userRole.scope === 'global'
}
