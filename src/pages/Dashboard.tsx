import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../lib/auth'
import { DashboardFilters, FilterValues } from '../components/DashboardFilters'
import {
  getMovementsCount,
  getMovementsDailySeries,
  getRevenueSum,
  getRevenueDailySeries,
  getPaidInvoicesCount,
  getStandOccupancyAvg,
  getTopAircraftTypes,
  getTopRoutes,
  getStandOccupancyDailySeries,
  DailyMovement,
  DailyRevenue,
  AircraftTypeCount,
  RouteCount,
  DailyOccupancy
} from '../lib/dashboardQueries'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { supabase } from '../lib/supabase'

interface Airport {
  id: string
  name: string
  iata_code: string
}

export function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [airports, setAirports] = useState<Airport[]>([])
  const [filters, setFilters] = useState<FilterValues | null>(null)

  const [stats, setStats] = useState({
    movements: 0,
    revenue: 0,
    paidInvoices: 0,
    standOccupancy: 0
  })

  const [dailyMovements, setDailyMovements] = useState<DailyMovement[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [topAircraftTypes, setTopAircraftTypes] = useState<AircraftTypeCount[]>([])
  const [topRoutes, setTopRoutes] = useState<RouteCount[]>([])
  const [dailyOccupancy, setDailyOccupancy] = useState<DailyOccupancy[]>([])

  const [showPaidOnly, setShowPaidOnly] = useState(false)

  useEffect(() => {
    loadAirports()
  }, [user])

  useEffect(() => {
    if (filters) {
      loadDashboardData()
    }
  }, [filters, showPaidOnly])

  const loadAirports = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('airports')
      .select('id, name, iata_code')
      .order('name')

    if (error) {
      console.error('Error loading airports:', error)
      return
    }

    setAirports(data || [])
  }

  const loadDashboardData = async () => {
    if (!filters) return

    setLoading(true)

    try {
      const [
        movementsCount,
        revenue,
        paidInvoices,
        occupancy,
        movementsSeries,
        revenueSeries,
        aircraftTypes,
        routes,
        occupancySeries
      ] = await Promise.all([
        getMovementsCount(filters),
        getRevenueSum(filters, showPaidOnly),
        getPaidInvoicesCount(filters),
        getStandOccupancyAvg(filters),
        getMovementsDailySeries(filters),
        getRevenueDailySeries(filters, showPaidOnly),
        getTopAircraftTypes(filters, 10),
        getTopRoutes(filters, 10),
        getStandOccupancyDailySeries(filters)
      ])

      setStats({
        movements: movementsCount,
        revenue,
        paidInvoices,
        standOccupancy: occupancy
      })

      setDailyMovements(movementsSeries)
      setDailyRevenue(revenueSeries)
      setTopAircraftTypes(aircraftTypes)
      setTopRoutes(routes)
      setDailyOccupancy(occupancySeries)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    let csv = 'Type,Date,Value\n'

    dailyMovements.forEach(d => {
      csv += `Mouvements Arrivées,${d.date},${d.arr}\n`
      csv += `Mouvements Départs,${d.date},${d.dep}\n`
    })

    dailyRevenue.forEach(d => {
      csv += `Revenus,${d.date},${d.amount}\n`
    })

    dailyOccupancy.forEach(d => {
      csv += `Occupation (%),${d.date},${d.occupancy_pct}\n`
    })

    topAircraftTypes.forEach(t => {
      csv += `Type Avion,${t.type},${t.count}\n`
    })

    topRoutes.forEach(r => {
      csv += `Route,${r.route},${r.count}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Veuillez vous connecter
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 600,
            color: '#1a1a1a'
          }}>
            Dashboard – Vue générale des opérations
          </h1>
          <button
            onClick={handleExportCSV}
            disabled={!filters || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: filters && !loading ? 'pointer' : 'not-allowed',
              opacity: filters && !loading ? 1 : 0.5
            }}
          >
            📥 Exporter CSV
          </button>
        </div>

        <DashboardFilters
          onApply={setFilters}
          airports={airports}
          userAirportId={user.airport_id || undefined}
          isAdmin={user.role === 'ADMIN'}
        />

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            fontSize: '18px',
            color: '#666'
          }}>
            Chargement des données...
          </div>
        )}

        {!loading && filters && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              <KPICard
                title="Movements"
                value={stats.movements.toString()}
                icon="✈️"
                color="#3b82f6"
                bgColor="#eff6ff"
              />
              <KPICard
                title={showPaidOnly ? "Revenue (Paid)" : "Revenue (All)"}
                value={stats.revenue.toLocaleString('fr-FR')}
                unit="XOF"
                icon="💰"
                color="#10b981"
                bgColor="#f0fdf4"
                subtitle={
                  <label style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={showPaidOnly}
                      onChange={(e) => setShowPaidOnly(e.target.checked)}
                    />
                    Payées uniquement
                  </label>
                }
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
                value={stats.standOccupancy.toString()}
                unit="%"
                icon="🅿️"
                color="#f59e0b"
                bgColor="#fffbeb"
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              <ChartCard title="Mouvements par jour">
                {dailyMovements.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyMovements}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="arr" fill="#3b82f6" name="Arrivées" />
                      <Bar dataKey="dep" fill="#f59e0b" name="Départs" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Revenus par jour">
                {dailyRevenue.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR') + ' XOF'} />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" name="Montant (XOF)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              <ChartCard title="Top 10 Types d'Aéronefs">
                {topAircraftTypes.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topAircraftTypes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" style={{ fontSize: '12px' }} />
                      <YAxis dataKey="type" type="category" width={80} style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" name="Nombre" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Top 10 Routes">
                {topRoutes.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topRoutes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" style={{ fontSize: '12px' }} />
                      <YAxis dataKey="route" type="category" width={120} style={{ fontSize: '11px' }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" name="Nombre" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <ChartCard title="Tendance d'occupation des stands (%)">
              {dailyOccupancy.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyOccupancy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="occupancy_pct" stroke="#f59e0b" name="Occupation (%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </>
        )}
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
  bgColor,
  subtitle
}: {
  title: string
  value: string
  unit?: string
  icon: string
  color: string
  bgColor: string
  subtitle?: React.ReactNode
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #f3f4f6',
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

      {subtitle && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '24px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px'
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      height: '300px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9ca3af',
      fontSize: '14px'
    }}>
      Aucune donnée disponible pour cette période
    </div>
  )
}
