import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Movement {
  id: string
  flight_number: string
  registration: string
  aircraft_type: string
  movement_type: string
  scheduled_time: string
  status: string
  stand_id: string | null
  stands: { name: string }[] | null
  origin_iata: string | null
  destination_iata: string | null
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    movementsToday: 0,
    monthlyRevenue: 0,
    paidInvoices: 0,
    standOccupancy: 0,
  })
  const [recentMovements, setRecentMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    let movementsQuery = supabase
      .from('aircraft_movements')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_time', today.toISOString())
      .lt('scheduled_time', tomorrow.toISOString())

    let recentMovementsQuery = supabase
      .from('aircraft_movements')
      .select('id, flight_number, registration, aircraft_type, movement_type, scheduled_time, status, stand_id, stands(name), origin_iata, destination_iata')
      .order('scheduled_time', { ascending: true })
      .limit(10)

    let invoicesQuery = supabase
      .from('invoices')
      .select('total_xof, airport_id')
      .gte('created_at', firstDayOfMonth.toISOString())

    if (user.airport_id) {
      invoicesQuery = invoicesQuery.eq('airport_id', user.airport_id)
    }

    let paidInvoicesQuery = supabase
      .from('invoices')
      .select('id, airport_id')
      .eq('status', 'PAID')

    if (user.airport_id) {
      paidInvoicesQuery = paidInvoicesQuery.eq('airport_id', user.airport_id)
    }

    let standsQuery = supabase
      .from('stands')
      .select('id')

    let occupiedStandsQuery = supabase
      .from('aircraft_movements')
      .select('stand_id')
      .in('status', ['Planned', 'Arrived'])
      .not('stand_id', 'is', null)

    if (user.role !== 'ADMIN' && user.airport_id) {
      movementsQuery = movementsQuery.eq('airport_id', user.airport_id)
      recentMovementsQuery = recentMovementsQuery.eq('airport_id', user.airport_id)
      standsQuery = standsQuery.eq('airport_id', user.airport_id)
      occupiedStandsQuery = occupiedStandsQuery.eq('airport_id', user.airport_id)
    }

    const [movementsRes, recentMovementsRes, invoicesRes, paidRes, standsRes, occupiedRes] = await Promise.all([
      movementsQuery,
      recentMovementsQuery,
      invoicesQuery,
      paidInvoicesQuery,
      standsQuery,
      occupiedStandsQuery,
    ])

    const filteredInvoices = invoicesRes.data || []
    const filteredPaid = paidRes.data || []

    const monthlyRevenue = filteredInvoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.total_xof || 0),
      0
    )

    const totalStands = standsRes.data?.length || 1
    const occupiedStands = new Set(occupiedRes.data?.map((m: any) => m.stand_id)).size
    const occupancy = Math.round((occupiedStands / totalStands) * 100)

    setStats({
      movementsToday: movementsRes.count || 0,
      monthlyRevenue,
      paidInvoices: filteredPaid.length,
      standOccupancy: occupancy,
    })
    setRecentMovements(recentMovementsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <Layout>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading dashboard...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          margin: '0 0 32px 0',
          fontSize: '32px',
          fontWeight: 600,
          color: '#1a1a1a'
        }}>
          Dashboard – Vue générale des opérations
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          <KPICard
            title="Movements Today"
            value={stats.movementsToday.toString()}
            icon="✈️"
            color="#3b82f6"
            bgColor="#eff6ff"
          />
          <KPICard
            title="Monthly Revenue"
            value={`${stats.monthlyRevenue.toLocaleString()}`}
            unit="XOF"
            icon="💰"
            color="#10b981"
            bgColor="#f0fdf4"
          />
          <KPICard
            title="Paid Invoices"
            value={stats.paidInvoices.toString()}
            icon="🧾"
            color="#8b5cf6"
            bgColor="#f5f3ff"
          />
          <KPICard
            title="Stand Occupancy"
            value={`${stats.standOccupancy}`}
            unit="%"
            icon="🅿️"
            color="#f59e0b"
            bgColor="#fffbeb"
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '20px'
          }}>
            Recent Movements
          </h2>

          {recentMovements.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666',
              fontSize: '15px'
            }}>
              No recent movements
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid #e5e7eb',
                    textAlign: 'left'
                  }}>
                    <th style={tableHeaderStyle}>Type</th>
                    <th style={tableHeaderStyle}>Registration</th>
                    <th style={tableHeaderStyle}>Aircraft Type</th>
                    <th style={tableHeaderStyle}>Origin</th>
                    <th style={tableHeaderStyle}>Destination</th>
                    <th style={tableHeaderStyle}>Time</th>
                    <th style={tableHeaderStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((movement) => (
                    <tr key={movement.id} style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: movement.movement_type === 'ARR' ? '#dbeafe' : '#fef3c7',
                          color: movement.movement_type === 'ARR' ? '#1e40af' : '#92400e'
                        }}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <strong>{movement.registration}</strong>
                      </td>
                      <td style={tableCellStyle}>{movement.aircraft_type}</td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          {movement.origin_iata || '-'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          {movement.destination_iata || '-'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '13px' }}>
                          {new Date(movement.scheduled_time).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {new Date(movement.scheduled_time).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <StatusBadge status={movement.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function KPICard({
  title,
  value,
  unit,
  icon,
  color,
  bgColor
}: {
  title: string
  value: string
  unit?: string
  icon: string
  color: string
  bgColor: string
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #f3f4f6',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontSize: '80px',
        opacity: 0.1,
        userSelect: 'none'
      }}>
        {icon}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginRight: '12px'
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#6b7280',
          lineHeight: 1.3
        }}>
          {title}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          color: color,
          lineHeight: 1
        }}>
          {value}
        </div>
        {unit && (
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#9ca3af'
          }}>
            {unit}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; color: string }> = {
    'Planned': { bg: '#e0e7ff', color: '#3730a3' },
    'Arrived': { bg: '#d1fae5', color: '#065f46' },
    'Departed': { bg: '#f3f4f6', color: '#374151' },
    'Canceled': { bg: '#fee2e2', color: '#991b1b' }
  }

  const config = statusConfig[status] || statusConfig['Planned']

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.color
    }}>
      {status}
    </span>
  )
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontWeight: 600,
  color: '#374151',
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

const tableCellStyle: React.CSSProperties = {
  padding: '16px',
  color: '#1f2937'
}
