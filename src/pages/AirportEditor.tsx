import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { InfrastructureManagement } from '../components/InfrastructureManagement'
import { logger } from '../lib/logger'

export function AirportEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast, ToastComponent } = useToast()

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [icaoCode, setIcaoCode] = useState('')
  const [iataCode, setIataCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Côte d\'Ivoire')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [elevationM, setElevationM] = useState('')
  const [timezone, setTimezone] = useState('Africa/Abidjan')
  const [runways, setRunways] = useState('')
  const [standsCount, setStandsCount] = useState('0')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const isNewAirport = id === 'new'
  const canWrite = user?.role === 'ADMIN' || user?.role === 'DED-C'

  useEffect(() => {
    if (!isNewAirport && id) {
      loadAirport(id)
    }
  }, [id])

  const loadAirport = async (airportId: string) => {
    setLoading(true)

    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .eq('id', airportId)
      .single()

    if (error) {
      logger.error('Error loading airport', { error })
      showToast('Erreur de chargement', 'error')
      navigate('/airports')
    } else if (data) {
      setName(data.name)
      setIcaoCode(data.icao_code)
      setIataCode(data.iata_code)
      setCity(data.city || '')
      setCountry(data.country || 'Côte d\'Ivoire')
      setLatitude(data.latitude?.toString() || '')
      setLongitude(data.longitude?.toString() || '')
      setElevationM(data.elevation_m?.toString() || '')
      setTimezone(data.timezone || 'Africa/Abidjan')
      setRunways(data.runways || '')
      setStandsCount(data.stands_count?.toString() || '0')
      setDescription(data.description || '')
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !icaoCode.trim()) {
      setError('Le nom et le code OACI sont obligatoires')
      return
    }

    if (!canWrite) {
      setError('Vous n\'avez pas les permissions pour modifier les aéroports')
      return
    }

    setLoading(true)

    const airportData = {
      name: name.trim(),
      icao_code: icaoCode.toUpperCase().trim(),
      iata_code: iataCode.toUpperCase().trim(),
      city: city.trim() || null,
      country: country.trim() || 'Côte d\'Ivoire',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      elevation_m: elevationM ? parseFloat(elevationM) : null,
      timezone: timezone || 'Africa/Abidjan',
      runways: runways.trim() || null,
      stands_count: standsCount ? parseInt(standsCount) : 0,
      description: description.trim() || null
    }

    if (isNewAirport) {
      const { data, error } = await supabase
        .from('airports')
        .insert([airportData])
        .select()
        .single()

      if (error) {
        logger.error('Error creating airport', { error })
        if (error.code === '23505') {
          setError('Un aéroport avec ce code OACI existe déjà')
        } else {
          setError('Erreur lors de la création')
        }
        setLoading(false)
        return
      }

      if (data) {
        await logAudit(
          'CREATE',
          'airports',
          data.id,
          airportData
        )

        showToast('Aéroport créé! Configurez maintenant son infrastructure ci-dessous.', 'success')
        navigate(`/airports/${data.id}`)
      }
    } else {
      const { error } = await supabase
        .from('airports')
        .update(airportData)
        .eq('id', id)

      if (error) {
        logger.error('Error updating airport', { error })
        if (error.code === '23505') {
          setError('Un aéroport avec ce code OACI existe déjà')
        } else {
          setError('Erreur lors de la mise à jour')
        }
        setLoading(false)
        return
      }

      await logAudit(
        'UPDATE',
        'airports',
        id!,
        airportData
      )

      showToast('Aéroport mis à jour avec succès', 'success')
      navigate('/airports')
    }

    setLoading(false)
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

  if (!canWrite) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Vous n'avez pas les permissions pour accéder à cette page
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {ToastComponent}

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/airports')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            ← Retour
          </button>

          <h1 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 600,
            color: '#1a1a1a'
          }}>
            {isNewAirport ? 'Nouvel aéroport' : 'Modifier l\'aéroport'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>
              Informations générales
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Nom de l'aéroport *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Aéroport International de Bouaké"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Code OACI *
                </label>
                <input
                  type="text"
                  value={icaoCode}
                  onChange={(e) => setIcaoCode(e.target.value.toUpperCase())}
                  required
                  placeholder="DIBK"
                  maxLength={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Code IATA
                </label>
                <input
                  type="text"
                  value={iataCode}
                  onChange={(e) => setIataCode(e.target.value.toUpperCase())}
                  placeholder="BYK"
                  maxLength={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bouaké"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Pays
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Côte d'Ivoire"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>
              Coordonnées géographiques
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Latitude (°)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="7.738889"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Longitude (°)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-5.073611"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Altitude (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={elevationM}
                  onChange={(e) => setElevationM(e.target.value)}
                  placeholder="376"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>
              Infrastructure
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Fuseau horaire
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Africa/Abidjan">Africa/Abidjan (UTC+0)</option>
                  <option value="Africa/Lagos">Africa/Lagos (UTC+1)</option>
                  <option value="Africa/Accra">Africa/Accra (UTC+0)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Nombre de stands
                </label>
                <input
                  type="number"
                  value={standsCount}
                  onChange={(e) => setStandsCount(e.target.value)}
                  placeholder="0"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Pistes
                </label>
                <input
                  type="text"
                  value={runways}
                  onChange={(e) => setRunways(e.target.value)}
                  placeholder="03/21, 09/27"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#374151'
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Informations complémentaires sur l'aéroport..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/airports')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Enregistrement...' : isNewAirport ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {!isNewAirport && id && (
          <InfrastructureManagement
            airportId={id}
            canWrite={canWrite}
            showToast={showToast}
          />
        )}
      </div>
    </Layout>
  )
}
