import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

interface Airport {
  id: string
  name: string
  icao_code: string
  iata_code: string
  city: string | null
  country: string | null
  timezone: string
  stands_count: number
  latitude: number | null
  longitude: number | null
}

export function Airports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { showToast, ToastComponent } = useToast()

  const canWrite = user?.role === 'ADMIN' || user?.role === 'DED-C'

  useEffect(() => {
    loadAirports()
  }, [])

  const loadAirports = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading airports:', error)
      showToast('Erreur de chargement des aéroports', 'error')
    } else {
      setAirports(data || [])
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('airports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting airport:', error)
      showToast('Erreur lors de la suppression', 'error')
    } else {
      showToast('Aéroport supprimé avec succès', 'success')
      loadAirports()
    }

    setDeleteConfirm(null)
  }

  const filteredAirports = airports.filter(airport => {
    const query = searchQuery.toLowerCase()
    return (
      airport.name.toLowerCase().includes(query) ||
      airport.icao_code.toLowerCase().includes(query) ||
      airport.iata_code.toLowerCase().includes(query) ||
      airport.city?.toLowerCase().includes(query)
    )
  })

  return (
    <Layout>
      {ToastComponent}

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            Airports
          </h1>

          {canWrite && (
            <button
              onClick={() => navigate('/airports/new')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Nouvel aéroport
            </button>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <input
            type="text"
            placeholder="Rechercher par nom, code OACI, IATA ou ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px'
            }}
          />
        </div>

        {loading ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            Chargement des aéroports...
          </div>
        ) : filteredAirports.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            {searchQuery ? 'Aucun aéroport trouvé' : 'Aucun aéroport configuré'}
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Nom
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Code OACI
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Code IATA
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Ville
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Stands
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Fuseau
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAirports.map((airport) => (
                  <tr
                    key={airport.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                      {airport.name}
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>
                      {airport.icao_code}
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>
                      {airport.iata_code}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {airport.city || '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                      {airport.stands_count}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                      {airport.timezone}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/airports/${airport.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          {canWrite ? 'Modifier' : 'Voir'}
                        </button>

                        {canWrite && (
                          <>
                            {deleteConfirm === airport.id ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleDelete(airport.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(airport.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Supprimer
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          {filteredAirports.length} aéroport{filteredAirports.length > 1 ? 's' : ''}
          {searchQuery && ` (filtré${filteredAirports.length > 1 ? 's' : ''})`}
        </div>
      </div>
    </Layout>
  )
}
