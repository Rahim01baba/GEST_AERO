import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, Airport, Runway, Stand, Terminal } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

export function Airports() {
  const { user } = useAuth()
  const [airports, setAirports] = useState<Airport[]>([])
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)
  const [runways, setRunways] = useState<Runway[]>([])
  const [stands, setStands] = useState<Stand[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadAirports()
  }, [])

  useEffect(() => {
    if (selectedAirport) {
      loadAirportDetails(selectedAirport)
    }
  }, [selectedAirport])

  const loadAirports = async () => {
    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .order('name')

    if (error) {
      showToast('Failed to load airports', 'error')
    } else {
      setAirports(data || [])
      if (data && data.length > 0 && !selectedAirport) {
        setSelectedAirport(data[0].id)
      }
    }
    setLoading(false)
  }

  const loadAirportDetails = async (airportId: string) => {
    const [runwaysRes, standsRes, terminalsRes] = await Promise.all([
      supabase.from('runways').select('*').eq('airport_id', airportId).order('name'),
      supabase.from('stands').select('*').eq('airport_id', airportId).order('name'),
      supabase.from('terminals').select('*').eq('airport_id', airportId).order('name'),
    ])

    setRunways(runwaysRes.data || [])
    setStands(standsRes.data || [])
    setTerminals(terminalsRes.data || [])
  }

  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
          <p>Only administrators can access airport configuration.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 600 }}>Airport Configuration</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            height: 'fit-content'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Airports</h2>
            {airports.map(airport => (
              <div
                key={airport.id}
                onClick={() => setSelectedAirport(airport.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedAirport === airport.id ? '#eff6ff' : 'transparent',
                  marginBottom: '8px',
                  border: selectedAirport === airport.id ? '2px solid #3b82f6' : '2px solid transparent'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{airport.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {airport.icao} / {airport.iata}
                </div>
              </div>
            ))}
          </div>

          {selectedAirport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Section title="Runways">
                {runways.length === 0 ? (
                  <p style={{ color: '#666' }}>No runways configured</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Length (m)</th>
                        <th style={thStyle}>Width (m)</th>
                        <th style={thStyle}>Max Aircraft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runways.map(runway => (
                        <tr key={runway.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={tdStyle}>{runway.name}</td>
                          <td style={tdStyle}>{runway.length_m}</td>
                          <td style={tdStyle}>{runway.width_m}</td>
                          <td style={tdStyle}>{runway.max_aircraft_type || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>

              <Section title="Parking Stands">
                {stands.length === 0 ? (
                  <p style={{ color: '#666' }}>No stands configured</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Max MTOW (kg)</th>
                        <th style={thStyle}>Wingspan (m)</th>
                        <th style={thStyle}>ARC</th>
                        <th style={thStyle}>Group</th>
                        <th style={thStyle}>Contact Gate</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stands.map(stand => (
                        <tr key={stand.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={tdStyle}>{stand.name}</td>
                          <td style={tdStyle}>{stand.max_mtow_kg.toLocaleString()}</td>
                          <td style={tdStyle}>{stand.wingspan_max_m || 'N/A'}</td>
                          <td style={tdStyle}>{stand.arc_letter_max || 'N/A'}</td>
                          <td style={tdStyle}>
                            {stand.group_key ? (
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: stand.is_group_parent ? '#E7D6F7' : '#E9ECEF',
                                color: stand.is_group_parent ? '#6F42C1' : '#6C757D'
                              }}>
                                {stand.group_key} {stand.is_group_parent ? '(Parent)' : '(Child)'}
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )}
                          </td>
                          <td style={tdStyle}>{stand.contact_gate ? 'Yes' : 'No'}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor: stand.is_blocked ? '#fee2e2' : '#d1fae5',
                              color: stand.is_blocked ? '#991b1b' : '#065f46'
                            }}>
                              {stand.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>

              <Section title="Terminals">
                {terminals.length === 0 ? (
                  <p style={{ color: '#666' }}>No terminals configured</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Arrival Capacity</th>
                        <th style={thStyle}>Departure Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terminals.map(terminal => (
                        <tr key={terminal.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={tdStyle}>{terminal.name}</td>
                          <td style={tdStyle}>{terminal.arrival_capacity}/hour</td>
                          <td style={tdStyle}>{terminal.departure_capacity}/hour</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>
            </div>
          )}
        </div>
      )}
      {ToastComponent}
    </Layout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  )
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
