import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { InvoicePreviewModal } from '../components/InvoicePreviewModal'
import { InvoiceEditorModal } from '../components/InvoiceEditorModal'

interface MovementWithStand {
  id: string
  flight_number: string
  registration: string
  aircraft_type: string
  mtow_kg: number | null
  scheduled_time: string
  movement_type: string
  status: string
  airline_name: string | null
  stand_name: string | null
  is_invoiced: boolean
  rotation_id: string | null
}

interface Airport {
  id: string
  name: string
  iata_code: string
}

export function BillingNew() {
  const { user, canViewAllAirports, getAssignedAirportId } = useAuth()
  const [movements, setMovements] = useState<MovementWithStand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterRegistration, setFilterRegistration] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedAirportId, setSelectedAirportId] = useState<string>('')
  const [airports, setAirports] = useState<Airport[]>([])
  const [previewMovementId, setPreviewMovementId] = useState<string | null>(null)
  const [invoiceMovementId, setInvoiceMovementId] = useState<string | null>(null)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    const init = async () => {
      if (canViewAllAirports()) {
        loadAirports()
      } else {
        const airportId = user?.airport_id || await getAssignedAirportId()
        if (airportId) {
          setSelectedAirportId(airportId)
        }
      }
    }
    init()
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
    if (selectedAirportId) {
      loadMovements()
    }
  }, [selectedAirportId, filterStartDate, filterEndDate, filterRegistration, filterType])

  const loadMovements = async () => {
    if (!selectedAirportId) return

    setLoading(true)

    let query = supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `)
      .eq('airport_id', selectedAirportId)
      .order('scheduled_time', { ascending: true })

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

    const { data, error } = await query

    if (error) {
      console.error('Error loading movements:', error)
      showToast('Erreur de chargement', 'error')
      setMovements([])
    } else {
      const movementsWithStands = (data || []).map((m: any) => ({
        ...m,
        stand_name: m.stands?.name || null
      }))
      setMovements(movementsWithStands)
    }

    setLoading(false)
  }

  const exportToCSV = () => {
    let csv = 'Rotation ID,Vol,Type,Immatriculation,Type Avion,Date,Heure,Stand,Compagnie,Statut,Facturé\n'

    movements.forEach(m => {
      const date = new Date(m.scheduled_time)
      csv += `${m.rotation_id ? m.rotation_id.substring(0, 8) : 'N/A'},`
      csv += `${m.flight_number},${m.movement_type},${m.registration},${m.aircraft_type},`
      csv += `${date.toLocaleDateString('fr-FR')},${date.toLocaleTimeString('fr-FR')},`
      csv += `${m.stand_name || 'N/A'},${m.airline_name || 'N/A'},${m.status},`
      csv += `${m.is_invoiced ? 'Oui' : 'Non'}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `facturation-${filterStartDate}-${filterEndDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getAirportCode = () => {
    const airport = airports.find(a => a.id === selectedAirportId)
    return airport?.iata_code || 'XXX'
  }

  return (
    <Layout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>Facturation</h1>
        <button
          onClick={exportToCSV}
          disabled={movements.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: movements.length > 0 ? 'pointer' : 'not-allowed',
            opacity: movements.length > 0 ? 1 : 0.5
          }}
        >
          📥 Exporter CSV
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: canViewAllAirports() ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '16px' }}>
          {canViewAllAirports() && (
            <div>
              <label style={labelStyle}>Aéroport</label>
              <select
                value={selectedAirportId}
                onChange={(e) => setSelectedAirportId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Sélectionner...</option>
                {airports.map(airport => (
                  <option key={airport.id} value={airport.id}>
                    {airport.iata_code} - {airport.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Date début</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Date fin</label>
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
              placeholder="Ex: FHBNA"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={inputStyle}
            >
              <option value="">Tous</option>
              <option value="ARR">ARR</option>
              <option value="DEP">DEP</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '16px', color: '#666' }}>
            Chargement...
          </div>
        ) : movements.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '16px', color: '#666' }}>
            Aucun mouvement trouvé pour cette période
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={thStyle}>Rotation</th>
                  <th style={thStyle}>Vol</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Immat</th>
                  <th style={thStyle}>Aéronef</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Heure</th>
                  <th style={thStyle}>Stand</th>
                  <th style={thStyle}>Compagnie</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Facturé</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const date = new Date(movement.scheduled_time)
                  return (
                    <tr key={movement.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{...tdStyle, fontSize: '11px', fontFamily: 'monospace', color: '#6b7280'}}>
                        {movement.rotation_id ? movement.rotation_id.substring(0, 8) : '-'}
                      </td>
                      <td style={tdStyle}>{movement.flight_number}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: movement.movement_type === 'ARR' ? '#dbeafe' : '#fef3c7',
                          color: movement.movement_type === 'ARR' ? '#1e40af' : '#92400e'
                        }}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td style={tdStyle}>{movement.registration}</td>
                      <td style={tdStyle}>{movement.aircraft_type}</td>
                      <td style={tdStyle}>{date.toLocaleDateString('fr-FR')}</td>
                      <td style={tdStyle}>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={tdStyle}>{movement.stand_name || '-'}</td>
                      <td style={tdStyle}>{movement.airline_name || '-'}</td>
                      <td style={tdStyle}>{movement.status}</td>
                      <td style={tdStyle}>
                        {movement.is_invoiced ? (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: '#d1fae5',
                            color: '#065f46'
                          }}>
                            Oui
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: '#fee2e2',
                            color: '#991b1b'
                          }}>
                            Non
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setPreviewMovementId(movement.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                            title="Prévisualiser la facture"
                          >
                            👁️ Prévisualiser
                          </button>
                          {!movement.is_invoiced && (
                            <button
                              onClick={() => setInvoiceMovementId(movement.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              title="Créer la facture"
                            >
                              💰 Facturer
                            </button>
                          )}
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

      <InvoicePreviewModal
        isOpen={!!previewMovementId}
        onClose={() => setPreviewMovementId(null)}
        movementId={previewMovementId || ''}
      />

      <InvoiceEditorModal
        isOpen={!!invoiceMovementId}
        onClose={() => setInvoiceMovementId(null)}
        onSuccess={() => {
          setInvoiceMovementId(null)
          loadMovements()
        }}
        movementId={invoiceMovementId || ''}
        airportCode={getAirportCode()}
      />

      {ToastComponent}
    </Layout>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px'
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase'
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#1a1a1a'
}
