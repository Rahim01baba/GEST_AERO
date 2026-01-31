import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  active: boolean
}

interface Permission {
  id?: string
  user_id: string
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'movements', label: 'Mouvements' },
  { key: 'parking', label: 'Parking' },
  { key: 'billing', label: 'Facturation' },
  { key: 'aircrafts', label: 'Aéronefs' },
  { key: 'airports', label: 'Aéroports' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'audit', label: 'Audit' },
  { key: 'billing_settings', label: 'Paramètres Facturation' }
]

export function UsersNew() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, permsRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email, role, active').order('full_name'),
        supabase.from('users_permissions').select('*')
      ])

      if (usersRes.error) throw usersRes.error
      if (permsRes.error) throw permsRes.error

      setUsers(usersRes.data || [])
      setPermissions(permsRes.data || [])
    } catch (error: any) {
      showToast('Erreur de chargement: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const getPermission = (userId: string, module: string): Permission => {
    const existing = permissions.find(p => p.user_id === userId && p.module === module)
    if (existing) return existing
    return {
      user_id: userId,
      module,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false
    }
  }

  const togglePermission = (userId: string, module: string, field: keyof Permission) => {
    const perm = getPermission(userId, module)
    const newValue = !perm[field]

    const newPerms = [...permissions]
    const existingIndex = newPerms.findIndex(p => p.user_id === userId && p.module === module)

    if (existingIndex >= 0) {
      newPerms[existingIndex] = { ...newPerms[existingIndex], [field]: newValue }
    } else {
      newPerms.push({ ...perm, [field]: newValue })
    }

    setPermissions(newPerms)
  }

  const savePermissions = async () => {
    setSaving(true)
    try {
      for (const perm of permissions) {
        if (perm.id) {
          await supabase
            .from('users_permissions')
            .update({
              can_view: perm.can_view,
              can_create: perm.can_create,
              can_edit: perm.can_edit,
              can_delete: perm.can_delete,
              updated_at: new Date().toISOString()
            })
            .eq('id', perm.id)
        } else {
          const { data: existing } = await supabase
            .from('users_permissions')
            .select('id')
            .eq('user_id', perm.user_id)
            .eq('module', perm.module)
            .maybeSingle()

          if (existing) {
            await supabase
              .from('users_permissions')
              .update({
                can_view: perm.can_view,
                can_create: perm.can_create,
                can_edit: perm.can_edit,
                can_delete: perm.can_delete,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
          } else {
            await supabase
              .from('users_permissions')
              .insert({
                user_id: perm.user_id,
                module: perm.module,
                can_view: perm.can_view,
                can_create: perm.can_create,
                can_edit: perm.can_edit,
                can_delete: perm.can_delete
              })
          }
        }
      }

      showToast('Permissions enregistrées', 'success')
      loadData()
    } catch (error: any) {
      showToast('Erreur de sauvegarde: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      await supabase
        .from('users')
        .update({ active: !currentActive })
        .eq('id', userId)

      showToast(`Utilisateur ${currentActive ? 'désactivé' : 'activé'}`, 'success')
      loadData()
    } catch (error: any) {
      showToast('Erreur: ' + error.message, 'error')
    }
  }

  if (currentUser?.role !== 'ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Accès refusé</h2>
          <p>Seuls les administrateurs peuvent gérer les utilisateurs.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
          Gestion des Utilisateurs et Permissions
        </h1>
        <button
          onClick={savePermissions}
          disabled={saving || loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            opacity: saving || loading ? 0.5 : 1
          }}
        >
          {saving ? 'Enregistrement...' : '💾 Enregistrer les permissions'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', fontSize: '16px', color: '#666' }}>
          Chargement...
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ ...thStyle, minWidth: '180px', position: 'sticky', left: 0, backgroundColor: '#f9fafb', zIndex: 2 }}>
                  Utilisateur
                </th>
                <th style={{ ...thStyle, width: '80px' }}>Rôle</th>
                <th style={{ ...thStyle, width: '80px' }}>Statut</th>
                {MODULES.map(module => (
                  <th key={module.key} style={{ ...thStyle, textAlign: 'center', padding: '8px 4px' }} colSpan={4}>
                    {module.label}
                  </th>
                ))}
              </tr>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ ...subThStyle, position: 'sticky', left: 0, backgroundColor: '#f3f4f6', zIndex: 2 }}></th>
                <th style={subThStyle}></th>
                <th style={subThStyle}></th>
                {MODULES.map(module => (
                  <>
                    <th key={`${module.key}-v`} style={subThStyle} title="Voir">V</th>
                    <th key={`${module.key}-c`} style={subThStyle} title="Créer">C</th>
                    <th key={`${module.key}-e`} style={subThStyle} title="Éditer">E</th>
                    <th key={`${module.key}-d`} style={subThStyle} title="Supprimer">S</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const isAdmin = user.role === 'ADMIN'
                return (
                  <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa', zIndex: 1, fontWeight: 500 }}>
                      <div>{user.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{user.email}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: getRoleColor(user.role),
                        color: 'white'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.active)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 500,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: user.active ? '#d1fae5' : '#fee2e2',
                          color: user.active ? '#065f46' : '#991b1b'
                        }}
                      >
                        {user.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    {MODULES.map(module => {
                      const perm = getPermission(user.id, module.key)
                      return (
                        <>
                          <td key={`${user.id}-${module.key}-v`} style={checkboxTdStyle}>
                            <input
                              type="checkbox"
                              checked={isAdmin || perm.can_view}
                              disabled={isAdmin}
                              onChange={() => togglePermission(user.id, module.key, 'can_view')}
                              style={checkboxStyle}
                            />
                          </td>
                          <td key={`${user.id}-${module.key}-c`} style={checkboxTdStyle}>
                            <input
                              type="checkbox"
                              checked={isAdmin || perm.can_create}
                              disabled={isAdmin}
                              onChange={() => togglePermission(user.id, module.key, 'can_create')}
                              style={checkboxStyle}
                            />
                          </td>
                          <td key={`${user.id}-${module.key}-e`} style={checkboxTdStyle}>
                            <input
                              type="checkbox"
                              checked={isAdmin || perm.can_edit}
                              disabled={isAdmin}
                              onChange={() => togglePermission(user.id, module.key, 'can_edit')}
                              style={checkboxStyle}
                            />
                          </td>
                          <td key={`${user.id}-${module.key}-d`} style={checkboxTdStyle}>
                            <input
                              type="checkbox"
                              checked={isAdmin || perm.can_delete}
                              disabled={isAdmin}
                              onChange={() => togglePermission(user.id, module.key, 'can_delete')}
                              style={checkboxStyle}
                            />
                          </td>
                        </>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
        <strong>Légende:</strong> V = Voir | C = Créer | E = Éditer | S = Supprimer
        <br />
        <strong>Note:</strong> Les administrateurs (ADMIN) ont tous les droits par défaut et ne peuvent pas être modifiés.
      </div>

      {ToastComponent}
    </Layout>
  )
}

function getRoleColor(role: string) {
  switch (role) {
    case 'ADMIN':
      return '#ef4444'
    case 'ATS':
      return '#3b82f6'
    case 'OPS':
      return '#10b981'
    case 'AIM':
      return '#8b5cf6'
    case 'FIN':
      return '#f59e0b'
    default:
      return '#6b7280'
  }
}

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  borderRight: '1px solid #e5e7eb'
}

const subThStyle: React.CSSProperties = {
  padding: '6px 4px',
  textAlign: 'center',
  fontSize: '10px',
  fontWeight: 600,
  color: '#6b7280',
  borderRight: '1px solid #e5e7eb'
}

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  fontSize: '13px',
  color: '#1a1a1a',
  borderRight: '1px solid #e5e7eb'
}

const checkboxTdStyle: React.CSSProperties = {
  padding: '10px 4px',
  textAlign: 'center',
  borderRight: '1px solid #e5e7eb'
}

const checkboxStyle: React.CSSProperties = {
  cursor: 'pointer',
  width: '16px',
  height: '16px'
}
