import { describe, it, expect } from 'vitest'
import { getUserRole, can, canViewAllAirports, type UserRole } from '../permissions'
import type { User } from '../supabase'

type DbUser = Pick<User, 'email' | 'role' | 'airport_id'>

function buildUser(overrides: Partial<DbUser> = {}): DbUser {
    return {
          email: 'user@airport.com',
          role: 'ATS',
          airport_id: 'airport-1',
          ...overrides,
    }
}

describe('permissions - getUserRole', () => {
    it('reads ATS role and local scope from the DB profile', () => {
          const role = getUserRole(buildUser({ role: 'ATS', airport_id: 'airport-1' }))
          expect(role.role).toBe('ATS')
          expect(role.scope).toBe('local')
          expect(role.airport_id).toBe('airport-1')
          expect(role.isAdmin).toBe(false)
    })

           it('reads OPS role correctly (regression: used to default to ATS)', () => {
                 const role = getUserRole(buildUser({ role: 'OPS' }))
                 expect(role.role).toBe('OPS')
                 expect(role.isAdmin).toBe(false)
           })

           it('reads FIN role correctly (regression: used to default to ATS)', () => {
                 const role = getUserRole(buildUser({ role: 'FIN' }))
                 expect(role.role).toBe('FIN')
           })

           it('reads AIM role correctly', () => {
                 const role = getUserRole(buildUser({ role: 'AIM' }))
                 expect(role.role).toBe('AIM')
           })

           it('flags ADMIN role as isAdmin', () => {
                 const role = getUserRole(buildUser({ role: 'ADMIN', airport_id: null }))
                 expect(role.role).toBe('ADMIN')
                 expect(role.scope).toBe('global')
                 expect(role.isAdmin).toBe(true)
           })

           it('treats a null airport_id as global scope for any role', () => {
                 const role = getUserRole(buildUser({ role: 'AIM', airport_id: null }))
                 expect(role.scope).toBe('global')
           })

           it('falls back to ATS for an unrecognised role value', () => {
                 const role = getUserRole(buildUser({ role: 'UNKNOWN' as DbUser['role'] }))
                 expect(role.role).toBe('ATS')
           })

           it('lower-cases the email', () => {
                 const role = getUserRole(buildUser({ email: 'ATS@AIRPORT.COM' }))
                 expect(role.email).toBe('ats@airport.com')
           })
})

describe('permissions - can', () => {
    const ats: UserRole = { role: 'ATS', scope: 'local', airport_id: 'airport-1', email: 'ats@airport.com', isAdmin: false }
    const ops: UserRole = { role: 'OPS', scope: 'local', airport_id: 'airport-1', email: 'ops@airport.com', isAdmin: false }
    const aim: UserRole = { role: 'AIM', scope: 'local', airport_id: 'airport-1', email: 'aim@airport.com', isAdmin: false }
    const fin: UserRole = { role: 'FIN', scope: 'local', airport_id: 'airport-1', email: 'fin@airport.com', isAdmin: false }
    const admin: UserRole = { role: 'ADMIN', scope: 'global', airport_id: null, email: 'admin@airport.com', isAdmin: true }

           describe('view_movements / view_invoices / export_csv', () => {
                 it('are readable by every role', () => {
                         for (const role of [ats, ops, aim, fin]) {
                                   expect(can('view_movements', role)).toBe(true)
                                   expect(can('view_invoices', role)).toBe(true)
                                   expect(can('export_csv', role)).toBe(true)
                         }
                 })
           })

           describe('edit_movements / create_movements / delete_movements', () => {
                 it('are allowed only for ATS', () => {
                         expect(can('edit_movements', ats)).toBe(true)
                         expect(can('create_movements', ats)).toBe(true)
                         expect(can('delete_movements', ats)).toBe(true)
                 })

                       it('are denied for OPS, AIM and FIN (regression: used to leak ATS rights)', () => {
                               for (const role of [ops, aim, fin]) {
                                         expect(can('edit_movements', role)).toBe(false)
                                         expect(can('create_movements', role)).toBe(false)
                                         expect(can('delete_movements', role)).toBe(false)
                               }
                       })
           })

           describe('create_invoice / create_proforma', () => {
                 it('are allowed only for FIN', () => {
                         expect(can('create_invoice', fin)).toBe(true)
                         expect(can('create_proforma', fin)).toBe(true)
                 })

                        it('are denied for ATS, OPS and AIM (regression: used to be reserved to AIM)', () => {
                                for (const role of [ats, ops, aim]) {
                                          expect(can('create_invoice', role)).toBe(false)
                                          expect(can('create_proforma', role)).toBe(false)
                                }
                        })
           })

           describe('edit_aircraft', () => {
                 it('is allowed only for AIM', () => {
                         expect(can('edit_aircraft', aim)).toBe(true)
                 })

                        it('is denied for ATS, OPS and FIN', () => {
                                for (const role of [ats, ops, fin]) {
                                          expect(can('edit_aircraft', role)).toBe(false)
                                }
                        })
           })

           describe('edit_airport / edit_billing_settings', () => {
                 it('are reserved to ADMIN', () => {
                         for (const role of [ats, ops, aim, fin]) {
                                   expect(can('edit_airport', role)).toBe(false)
                                   expect(can('edit_billing_settings', role)).toBe(false)
                         }
                         expect(can('edit_airport', admin)).toBe(true)
                         expect(can('edit_billing_settings', admin)).toBe(true)
                 })
           })

           describe('admin override', () => {
                 it('allows admin to do everything', () => {
                         expect(can('view_movements', admin)).toBe(true)
                         expect(can('edit_movements', admin)).toBe(true)
                         expect(can('create_invoice', admin)).toBe(true)
                         expect(can('edit_airport', admin)).toBe(true)
                         expect(can('edit_aircraft', admin)).toBe(true)
                         expect(can('edit_billing_settings', admin)).toBe(true)
                 })
           })
})

describe('permissions - canViewAllAirports', () => {
    it('allows only ADMIN', () => {
          const admin: UserRole = { role: 'ADMIN', scope: 'global', airport_id: null, email: 'admin@airport.com', isAdmin: true }
          const nonAdminGlobal: UserRole = { role: 'AIM', scope: 'global', airport_id: null, email: 'aim@airport.com', isAdmin: false }
          const local: UserRole = { role: 'ATS', scope: 'local', airport_id: 'airport-1', email: 'ats@airport.com', isAdmin: false }

           expect(canViewAllAirports(admin)).toBe(true)
          expect(canViewAllAirports(nonAdminGlobal)).toBe(false)
          expect(canViewAllAirports(local)).toBe(false)
    })
})
