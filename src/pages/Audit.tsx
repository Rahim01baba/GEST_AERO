import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, AuditLog } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

interface AuditLogWithUser extends AuditLog {
  actor?: {
    full_name: string
    email: string
  }
}

export function Audit() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadLogs()
  }, [user])

  const loadLogs = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:users(full_name, email)
      `)
      .order('timestamp', { ascending: false })
      .limit(500)

    if (error) {
      showToast('Failed to load audit logs', 'error')
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID']
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.actor?.full_name || 'System',
      log.action,
      log.target_type,
      log.target_id || ''
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>Audit Logs</h1>
        <button onClick={exportCSV} style={buttonStyle}>Export CSV</button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No audit logs found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Actor</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Target Type</th>
                <th style={thStyle}>Target ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {log.actor ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{log.actor.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{log.actor.email}</div>
                      </div>
                    ) : (
                      'System'
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: '#eff6ff',
                      color: '#1e40af'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={tdStyle}>{log.target_type}</td>
                  <td style={{
                    ...tdStyle,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {log.target_id ? log.target_id.substring(0, 8) + '...' : 'N/A'}
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

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
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
