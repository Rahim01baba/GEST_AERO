import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, AircraftMovement, logAudit } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { MovementModal } from '../components/MovementModal'

const STATUS_OPTIONS = [
  { value: 'Planned', label: 'Planifié', emoji: '📋' },
  { value: 'Approche', label: 'Approche', emoji: '✈️' },
  { value: 'Posé', label: 'Posé', emoji: '🟢' },
  { value: 'Enregistrement', label: 'Enreg.', emoji: '🧾' },
  { value: 'Décollé', label: 'Décollé', emoji: '🛫' },
  { value: 'Annulé', label: 'Annulé', emoji: '❌' },
  { value: 'Reporté', label: 'Reporté', emoji: '🔁' },
]

interface MovementWithStand extends AircraftMovement {
  stand_name?: string
}

export function Movements() {
  const { user } = useAuth()
  const [movements, setMovements] = useState<MovementWithStand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const saved = sessionStorage.getItem('movements_filter_start_date')
    if (saved) return saved
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const saved = sessionStorage.getItem('movements_filter_end_date')
    if (saved) return saved
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterRegistration, setFilterRegistration] = useState(() =>
    sessionStorage.getItem('movements_filter_registration') || ''
  )
  const [filterType, setFilterType] = useState(() =>
    sessionStorage.getItem('movements_filter_type') || ''
  )
  const [filterStatus, setFilterStatus] = useState(() =>
    sessionStorage.getItem('movements_filter_status') || ''
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMovementId, setEditMovementId] = useState<string | null>(null)
  const [selectedAirportId, setSelectedAirportId] = useState<string>('')
  const [airports, setAirports] = useState<Array<{ id: string; name: string; iata_code: string }>>([])
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadAirports()
    } else if (user?.airport_id) {
      setSelectedAirportId(user.airport_id)
    }
  }, [user])

  const loadAirports = async () => {
    const { data } = await supabase
      .from('airports')
      .select('id, name, iata_code')
      .order('name')
    if (data) {
      setAirports(data)
      if (data.length > 0 && !selectedAirportId) {
        setSelectedAirportId(data[0].id)
      }
    }
  }

  useEffect(() => {
    sessionStorage.setItem('movements_filter_start_date', filterStartDate)
    sessionStorage.setItem('movements_filter_end_date', filterEndDate)
    sessionStorage.setItem('movements_filter_registration', filterRegistration)
    sessionStorage.setItem('movements_filter_type', filterType)
    sessionStorage.setItem('movements_filter_status', filterStatus)
  }, [filterStartDate, filterEndDate, filterRegistration, filterType, filterStatus])

  useEffect(() => {
    if (selectedAirportId) {
      loadMovements()
    }
  }, [user, selectedAirportId, filterStartDate, filterEndDate, filterRegistration, filterType, filterStatus])


  const loadMovements = async () => {
    if (!user || !selectedAirportId) {
      console.log('Cannot load movements: user or airportId missing', { user: !!user, selectedAirportId })
      return
    }

    setLoading(true)
    console.log('Loading movements for airport:', selectedAirportId)

    let query = supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `)
      .eq('airport_id', selectedAirportId)
      .order('scheduled_time', { ascending: false })

    if (filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(filterEndDate)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('scheduled_time', startDate.toISOString()).lte('scheduled_time', endDate.toISOString())
    }

    if (filterRegistration) {
      query = query.ilike('registration', `%${filterRegistration}%`)
    }

    if (filterType) {
      query = query.eq('movement_type', filterType)
    }

    if (filterStatus) {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error loading movements:', error)
      showToast(`Erreur chargement: ${error.message || 'Erreur inconnue'}`, 'error')
      setMovements([])
    } else {
      console.log(`Loaded ${data?.length || 0} movements`)
      const movementsWithStands = (data || []).map((m: any) => ({
        ...m,
        stand_name: m.stands?.name || null
      }))
      setMovements(movementsWithStands)

      if (movementsWithStands.length === 0) {
        console.log('No movements found. Filters:', { filterStartDate, filterEndDate, filterType, filterStatus, filterRegistration })
      }
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const actualTime = status === 'Posé' || status === 'Décollé' ? new Date().toISOString() : null

    const { error } = await supabase
      .from('aircraft_movements')
      .update({ status, actual_time: actualTime })
      .eq('id', id)

    if (error) {
      showToast('Failed to update status', 'error')
    } else {
      showToast(`Status updated to ${status}`, 'success')
      await logAudit(`Update movement status to ${status}`, 'aircraft_movements', id)
      loadMovements()
    }
  }


  const exportCSV = () => {
    const headers = [
      'Type',
      'Vol ARR',
      'Vol DEP',
      'Compagnie',
      'Type avion',
      'Immat',
      'Provenance/Destination',
      'Date',
      'Heure',
      'Stand',
      'Statut'
    ]

    const rows = movements.map(m => {
      const scheduledDate = new Date(m.scheduled_time)
      return [
        m.movement_type === 'ARR' ? 'Arrivée' : 'Départ',
        m.flight_no_arr || (m.movement_type === 'ARR' ? m.flight_number : ''),
        m.flight_no_dep || (m.movement_type === 'DEP' ? m.flight_number : ''),
        m.airline_code || '',
        m.aircraft_type,
        m.registration,
        m.movement_type === 'ARR' ? (m.origin_iata || '') : (m.destination_iata || ''),
        scheduledDate.toLocaleDateString('fr-FR'),
        scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        m.stand_name || '',
        m.status
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movements_${new Date().toISOString().split('T')[0]}_${user?.airport_id || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)

    showToast('Export CSV terminé', 'success')
  }

  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0]
    setFilterStartDate(today)
    setFilterEndDate(today)
    setFilterRegistration('')
    setFilterType('')
    setFilterStatus('')
    sessionStorage.removeItem('movements_filter_start_date')
    sessionStorage.removeItem('movements_filter_end_date')
    sessionStorage.removeItem('movements_filter_registration')
    sessionStorage.removeItem('movements_filter_type')
    sessionStorage.removeItem('movements_filter_status')
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#1a1a1a' }}>
              Aircraft Movements
            </h1>
            {user?.role === 'ADMIN' && airports.length > 0 && (
              <select
                value={selectedAirportId}
                onChange={(e) => setSelectedAirportId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {airports.map(airport => (
                  <option key={airport.id} value={airport.id}>
                    {airport.iata_code} - {airport.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setEditMovementId(null)
                setIsModalOpen(true)
              }}
              style={{...buttonStyle, backgroundColor: '#3b82f6'}}
            >
              + Créer
            </button>
            <button onClick={exportCSV} style={{...buttonStyle, backgroundColor: '#10b981'}}>
              📄 Export CSV
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #f3f4f6'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
            Filtres de recherche
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={labelStyle}>Date de début</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Date de fin</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Immatriculation</label>
              <input
                type="text"
                value={filterRegistration}
                onChange={(e) => setFilterRegistration(e.target.value)}
                placeholder="Ex: N12345"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type de mouvement</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                <option value="">Tous</option>
                <option value="ARR">Arrivée</option>
                <option value="DEP">Départ</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="">Tous</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={clearFilters}
              style={{ ...buttonStyle, backgroundColor: '#6b7280' }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: '1px solid #f3f4f6'
        }}>
          {loading ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              fontSize: '16px',
              color: '#666'
            }}>
              Loading movements...
            </div>
          ) : movements.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#666',
              fontSize: '15px'
            }}>
              Aucun mouvement trouvé pour les critères sélectionnés
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Vol ARR</th>
                    <th style={thStyle}>Vol DEP</th>
                    <th style={thStyle}>Cie</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Immat</th>
                    <th style={thStyle}>Prov./Dest.</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Heure</th>
                    <th style={thStyle}>Stand</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const scheduledDate = new Date(movement.scheduled_time)
                    return (
                      <tr key={movement.id} style={{
                        borderTop: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontSize: '20px' }}>
                            {movement.movement_type === 'ARR' ? '🛬' : '🛫'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>
                          {movement.flight_no_arr || (movement.movement_type === 'ARR' ? movement.flight_number : '–')}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>
                          {movement.flight_no_dep || (movement.movement_type === 'DEP' ? movement.flight_number : '–')}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>
                          {movement.airline_code || '-'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>{movement.aircraft_type}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                          {movement.registration}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>
                          {movement.movement_type === 'ARR'
                            ? (movement.origin_iata || '-')
                            : (movement.destination_iata || '-')}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px' }}>
                          {scheduledDate.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, fontSize: '14px' }}>
                          {scheduledDate.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px' }}>
                          {movement.stand_name || '-'}
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={movement.status}
                            onChange={(e) => updateStatus(movement.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '5px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #e5e7eb',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              minWidth: '140px',
                              ...getStatusStyle(movement.status)
                            }}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.emoji} {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {movement.is_invoiced && (
                              <span style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                marginRight: '8px'
                              }}>
                                FACTURÉ
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditMovementId(movement.id)
                                setIsModalOpen(true)
                              }}
                              disabled={movement.is_invoiced}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: movement.is_invoiced ? '#d1d5db' : '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '5px',
                                cursor: movement.is_invoiced ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                opacity: movement.is_invoiced ? 0.5 : 1
                              }}
                              title={movement.is_invoiced ? "Mouvement facturé - modification impossible" : "Éditer"}
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'right'
        }}>
          {movements.length} mouvement(s) affiché(s)
        </div>
      </div>
      {ToastComponent}
      <MovementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditMovementId(null)
        }}
        onSuccess={() => {
          loadMovements()
          setEditMovementId(null)
        }}
        airportId={selectedAirportId}
        editMovementId={editMovementId}
      />
    </Layout>
  )
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'Planned':
      return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' }
    case 'Approche':
      return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }
    case 'Posé':
      return { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }
    case 'Enregistrement':
      return { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#a5b4fc' }
    case 'Décollé':
      return { backgroundColor: '#f3e8ff', color: '#6b21a8', borderColor: '#c084fc' }
    case 'Annulé':
      return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }
    case 'Reporté':
      return { backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#fcd34d' }
    default:
      return { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' }
  }
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  transition: 'border-color 0.2s'
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  transition: 'border-color 0.2s'
}

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 700,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid #e5e7eb'
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#1f2937'
}
