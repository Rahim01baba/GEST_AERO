import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

interface Aircraft {
  id: string
  registration: string
  type: string
  mtow_kg: number | null
  seats: number | null
  length_m: number | null
  wingspan_m: number | null
  height_m: number | null
  operator: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export function Aircrafts() {
  const navigate = useNavigate()
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterRegistration, setFilterRegistration] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterOperator, setFilterOperator] = useState('')
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadAircrafts()
  }, [filterRegistration, filterType, filterOperator])

  const loadAircrafts = async () => {
    setError(null)
    setLoading(true)

    try {
      let query = supabase
        .from('aircrafts')
        .select('*')

      if (filterRegistration.trim()) {
        query = query.ilike('registration', `%${filterRegistration.trim()}%`)
      }
      if (filterType.trim()) {
        query = query.ilike('type', `%${filterType.trim()}%`)
      }
      if (filterOperator.trim()) {
        query = query.ilike('operator', `%${filterOperator.trim()}%`)
      }

      query = query.order('registration', { ascending: true })

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      setAircrafts(data || [])
    } catch (err: any) {
      console.error('Error loading aircrafts:', err)
      const errorMessage = err.message || 'Erreur inconnue'
      if (err.code === '42501') {
        setError('Accès refusé (RLS). Vérifiez vos permissions.')
      } else if (err.message?.includes('JWT')) {
        setError('Session expirée. Reconnectez-vous.')
      } else {
        setError(`Erreur: ${errorMessage}`)
      }
      showToast('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteAircraft = async (id: string, registration: string) => {
    if (!confirm(`Supprimer l'avion ${registration} ?`)) return

    try {
      const { error } = await supabase
        .from('aircrafts')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Avion supprimé', 'success')
      loadAircrafts()
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  return (
    <Layout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>Aéronefs</h1>
        <button
          onClick={() => navigate('/aircrafts/new')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          + Nouvel avion
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Immatriculation</label>
            <input
              type="text"
              value={filterRegistration}
              onChange={e => setFilterRegistration(e.target.value)}
              style={inputStyle}
              placeholder="F-HBNA"
            />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <input
              type="text"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={inputStyle}
              placeholder="ATR72"
            />
          </div>
          <div>
            <label style={labelStyle}>Opérateur</label>
            <input
              type="text"
              value={filterOperator}
              onChange={e => setFilterOperator(e.target.value)}
              style={inputStyle}
              placeholder="Air Côte d'Ivoire"
            />
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
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px', color: '#6b7280' }}>
            Chargement des aéronefs...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              Erreur de chargement
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {error}
            </div>
          </div>
        ) : aircrafts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>
              Aucun aéronef trouvé
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
              Créez votre premier avion ou ajustez les filtres
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={thStyle}>Immatriculation</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>MTOW (kg)</th>
                  <th style={thStyle}>Places</th>
                  <th style={thStyle}>Envergure (m)</th>
                  <th style={thStyle}>Opérateur</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {aircrafts.map(aircraft => (
                  <tr key={aircraft.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>
                        {aircraft.registration}
                      </span>
                    </td>
                    <td style={tdStyle}>{aircraft.type}</td>
                    <td style={tdStyle}>
                      {aircraft.mtow_kg ? Math.round(aircraft.mtow_kg).toLocaleString() : '-'}
                    </td>
                    <td style={tdStyle}>{aircraft.seats || '-'}</td>
                    <td style={tdStyle}>
                      {aircraft.wingspan_m ? aircraft.wingspan_m.toFixed(1) : '-'}
                    </td>
                    <td style={tdStyle}>{aircraft.operator || '-'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/aircrafts/${aircraft.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Éditer
                        </button>
                        <button
                          onClick={() => deleteAircraft(aircraft.id, aircraft.registration)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {ToastComponent}
    </Layout>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px'
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
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#1f2937'
}
