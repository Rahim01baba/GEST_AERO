import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, User, Airport } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

export function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [usersRes, airportsRes] = await Promise.all([
      supabase.from('users').select('*').order('full_name'),
      supabase.from('airports').select('*').order('name'),
    ])

    if (usersRes.error) {
      showToast('Failed to load users', 'error')
    } else {
      setUsers(usersRes.data || [])
    }

    if (airportsRes.error) {
      showToast('Failed to load airports', 'error')
    } else {
      setAirports(airportsRes.data || [])
    }

    setLoading(false)
  }

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('users')
      .update({ active: !currentActive })
      .eq('id', userId)

    if (error) {
      showToast('Failed to update user', 'error')
    } else {
      showToast(`User ${currentActive ? 'deactivated' : 'activated'}`, 'success')
      loadData()
    }
  }

  const getAirportName = (airportId: string | null) => {
    if (!airportId) return 'All Airports'
    const airport = airports.find(a => a.id === airportId)
    return airport ? airport.name : 'Unknown'
  }

  if (currentUser?.role !== 'ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
          <p>Only administrators can access user management.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 600 }}>User Management</h1>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Airport</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{user.full_name}</td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: getRoleColor(user.role),
                      color: 'white'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={tdStyle}>{getAirportName(user.airport_id)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: user.active ? '#d1fae5' : '#fee2e2',
                      color: user.active ? '#065f46' : '#991b1b'
                    }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.active)}
                      style={{
                        ...actionButtonStyle,
                        backgroundColor: user.active ? '#ef4444' : '#10b981'
                      }}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#1a1a1a',
}

const actionButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
}
