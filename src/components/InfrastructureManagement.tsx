import { useState, useEffect } from 'react'
import { supabase, logAudit } from '../lib/supabase'
import { logger } from '../lib/logger'

// ========== TYPES ==========

interface Stand {
  id: string
  name: string
  max_mtow_kg: number
  length_m: number | null
  width_m: number | null
  wingspan_max_m: number | null
  arc_letter_max: string | null
  contact_gate: boolean | null
  is_blocked: boolean | null
}

interface Runway {
  id: string
  name: string
  length_m: number
  width_m: number
  orientation: string | null
  surface_type: string | null
  pcn: string | null
  max_aircraft_type: string | null
}

interface Taxiway {
  id: string
  name: string
  length_m: number | null
  width_m: number | null
  surface_type: string | null
}

interface InfrastructureManagementProps {
  airportId: string
  canWrite: boolean
  showToast: (message: string, type: 'success' | 'error') => void
}

// ========== STANDS SECTION ==========

function StandsSection({ airportId, canWrite, showToast }: InfrastructureManagementProps) {
  const [stands, setStands] = useState<Stand[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [maxMtow, setMaxMtow] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [wingspan, setWingspan] = useState('')
  const [arcLetter, setArcLetter] = useState('')
  const [contactGate, setContactGate] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    loadStands()
  }, [airportId])

  const loadStands = async () => {
    const { data, error } = await supabase
      .from('stands')
      .select('*')
      .eq('airport_id', airportId)
      .order('name')

    if (error) {
      logger.error('Error loading stands', { error })
      showToast('Erreur chargement parkings', 'error')
    } else {
      setStands(data || [])
    }
  }

  const resetForm = () => {
    setName('')
    setMaxMtow('')
    setLength('')
    setWidth('')
    setWingspan('')
    setArcLetter('')
    setContactGate(false)
    setIsBlocked(false)
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (stand: Stand) => {
    setName(stand.name)
    setMaxMtow(stand.max_mtow_kg.toString())
    setLength(stand.length_m?.toString() || '')
    setWidth(stand.width_m?.toString() || '')
    setWingspan(stand.wingspan_max_m?.toString() || '')
    setArcLetter(stand.arc_letter_max || '')
    setContactGate(stand.contact_gate || false)
    setIsBlocked(stand.is_blocked || false)
    setEditingId(stand.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !maxMtow) {
      showToast('Nom et MTOW obligatoires', 'error')
      return
    }

    setLoading(true)

    const standData = {
      airport_id: airportId,
      name: name.trim(),
      max_mtow_kg: parseInt(maxMtow),
      length_m: length ? parseFloat(length) : null,
      width_m: width ? parseFloat(width) : null,
      wingspan_max_m: wingspan ? parseFloat(wingspan) : null,
      arc_letter_max: arcLetter.trim() || null,
      contact_gate: contactGate,
      is_blocked: isBlocked
    }

    if (editingId) {
      const { error } = await supabase
        .from('stands')
        .update(standData)
        .eq('id', editingId)

      if (error) {
        logger.error('Error updating stand', { error })
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Parking mis à jour', 'success')
        await logAudit('Update stand', 'stands', editingId)
        resetForm()
        loadStands()
      }
    } else {
      const { error } = await supabase
        .from('stands')
        .insert(standData)

      if (error) {
        logger.error('Error creating stand', { error })
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Parking créé', 'success')
        await logAudit('Create stand', 'stands', undefined)
        resetForm()
        loadStands()
      }
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce parking ?')) return

    const { error } = await supabase
      .from('stands')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting stand', { error })
      showToast(`Erreur: ${error.message}`, 'error')
    } else {
      showToast('Parking supprimé', 'success')
      await logAudit('Delete stand', 'stands', id)
      loadStands()
    }
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Parkings / Stands ({stands.length})
        </h3>
        {canWrite && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: showForm ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showForm ? 'Annuler' : '+ Ajouter'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Nom *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="A1"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                MTOW max (kg) *
              </label>
              <input
                type="number"
                value={maxMtow}
                onChange={(e) => setMaxMtow(e.target.value)}
                placeholder="150000"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Longueur (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="50"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Largeur (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="40"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Envergure max (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={wingspan}
                onChange={(e) => setWingspan(e.target.value)}
                placeholder="60"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Lettre ARC
              </label>
              <input
                type="text"
                value={arcLetter}
                onChange={(e) => setArcLetter(e.target.value.toUpperCase())}
                placeholder="E"
                maxLength={1}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={contactGate}
                onChange={(e) => setContactGate(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>Passerelle contact</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>Bloqué</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '8px 24px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {stands.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
          Aucun parking configuré
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nom</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>MTOW (kg)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Long. (m)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Larg. (m)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Enverg. (m)</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>ARC</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Passerelle</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Statut</th>
                {canWrite && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {stands.map(stand => (
                <tr key={stand.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{stand.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{stand.max_mtow_kg.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{stand.length_m || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{stand.width_m || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{stand.wingspan_max_m || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{stand.arc_letter_max || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{stand.contact_gate ? '✓' : '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: stand.is_blocked ? '#fee2e2' : '#dcfce7',
                      color: stand.is_blocked ? '#991b1b' : '#166534'
                    }}>
                      {stand.is_blocked ? 'Bloqué' : 'Actif'}
                    </span>
                  </td>
                  {canWrite && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(stand)}
                        style={{
                          padding: '4px 12px',
                          marginRight: '8px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(stand.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Suppr.
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ========== RUNWAYS SECTION ==========

function RunwaysSection({ airportId, canWrite, showToast }: InfrastructureManagementProps) {
  const [runways, setRunways] = useState<Runway[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [orientation, setOrientation] = useState('')
  const [surfaceType, setSurfaceType] = useState('')
  const [pcn, setPcn] = useState('')
  const [maxAircraftType, setMaxAircraftType] = useState('')

  useEffect(() => {
    loadRunways()
  }, [airportId])

  const loadRunways = async () => {
    const { data, error } = await supabase
      .from('runways')
      .select('*')
      .eq('airport_id', airportId)
      .order('name')

    if (error) {
      logger.error('Error loading runways', { error })
      showToast('Erreur chargement pistes', 'error')
    } else {
      setRunways(data || [])
    }
  }

  const resetForm = () => {
    setName('')
    setLength('')
    setWidth('')
    setOrientation('')
    setSurfaceType('')
    setPcn('')
    setMaxAircraftType('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (runway: Runway) => {
    setName(runway.name)
    setLength(runway.length_m.toString())
    setWidth(runway.width_m.toString())
    setOrientation(runway.orientation || '')
    setSurfaceType(runway.surface_type || '')
    setPcn(runway.pcn || '')
    setMaxAircraftType(runway.max_aircraft_type || '')
    setEditingId(runway.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !length || !width) {
      showToast('Nom, longueur et largeur obligatoires', 'error')
      return
    }

    setLoading(true)

    const runwayData = {
      airport_id: airportId,
      name: name.trim(),
      length_m: parseInt(length),
      width_m: parseInt(width),
      orientation: orientation.trim() || null,
      surface_type: surfaceType.trim() || null,
      pcn: pcn.trim() || null,
      max_aircraft_type: maxAircraftType.trim() || null
    }

    if (editingId) {
      const { error } = await supabase
        .from('runways')
        .update(runwayData)
        .eq('id', editingId)

      if (error) {
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Piste mise à jour', 'success')
        await logAudit('Update runway', 'runways', editingId)
        resetForm()
        loadRunways()
      }
    } else {
      const { error } = await supabase
        .from('runways')
        .insert(runwayData)

      if (error) {
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Piste créée', 'success')
        await logAudit('Create runway', 'runways', undefined)
        resetForm()
        loadRunways()
      }
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette piste ?')) return

    const { error } = await supabase
      .from('runways')
      .delete()
      .eq('id', id)

    if (error) {
      showToast(`Erreur: ${error.message}`, 'error')
    } else {
      showToast('Piste supprimée', 'success')
      await logAudit('Delete runway', 'runways', id)
      loadRunways()
    }
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Pistes / Runways ({runways.length})
        </h3>
        {canWrite && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: showForm ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showForm ? 'Annuler' : '+ Ajouter'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Désignation * (ex: 03/21)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="03/21"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Longueur (m) *
              </label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="2500"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Largeur (m) *
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="45"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Orientation (ex: 030°/210°)
              </label>
              <input
                type="text"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                placeholder="030°/210°"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Surface
              </label>
              <select
                value={surfaceType}
                onChange={(e) => setSurfaceType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="Asphalte">Asphalte</option>
                <option value="Béton">Béton</option>
                <option value="Terre">Terre</option>
                <option value="Gravier">Gravier</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                PCN
              </label>
              <input
                type="text"
                value={pcn}
                onChange={(e) => setPcn(e.target.value)}
                placeholder="PCN 80"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Type d'avion maximum
              </label>
              <input
                type="text"
                value={maxAircraftType}
                onChange={(e) => setMaxAircraftType(e.target.value)}
                placeholder="A380"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '8px 24px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {runways.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
          Aucune piste configurée
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Désignation</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Longueur (m)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Largeur (m)</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Orientation</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Surface</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>PCN</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type max</th>
                {canWrite && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {runways.map(runway => (
                <tr key={runway.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{runway.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{runway.length_m}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{runway.width_m}</td>
                  <td style={{ padding: '12px' }}>{runway.orientation || '-'}</td>
                  <td style={{ padding: '12px' }}>{runway.surface_type || '-'}</td>
                  <td style={{ padding: '12px' }}>{runway.pcn || '-'}</td>
                  <td style={{ padding: '12px' }}>{runway.max_aircraft_type || '-'}</td>
                  {canWrite && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(runway)}
                        style={{
                          padding: '4px 12px',
                          marginRight: '8px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(runway.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Suppr.
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ========== TAXIWAYS SECTION ==========

function TaxiwaysSection({ airportId, canWrite, showToast }: InfrastructureManagementProps) {
  const [taxiways, setTaxiways] = useState<Taxiway[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [surfaceType, setSurfaceType] = useState('')

  useEffect(() => {
    loadTaxiways()
  }, [airportId])

  const loadTaxiways = async () => {
    const { data, error } = await supabase
      .from('taxiways')
      .select('*')
      .eq('airport_id', airportId)
      .order('name')

    if (error) {
      logger.error('Error loading taxiways', { error })
      showToast('Erreur chargement bretelles', 'error')
    } else {
      setTaxiways(data || [])
    }
  }

  const resetForm = () => {
    setName('')
    setLength('')
    setWidth('')
    setSurfaceType('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (taxiway: Taxiway) => {
    setName(taxiway.name)
    setLength(taxiway.length_m?.toString() || '')
    setWidth(taxiway.width_m?.toString() || '')
    setSurfaceType(taxiway.surface_type || '')
    setEditingId(taxiway.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      showToast('Nom obligatoire', 'error')
      return
    }

    setLoading(true)

    const taxiwayData = {
      airport_id: airportId,
      name: name.trim(),
      length_m: length ? parseFloat(length) : null,
      width_m: width ? parseFloat(width) : null,
      surface_type: surfaceType.trim() || null
    }

    if (editingId) {
      const { error } = await supabase
        .from('taxiways')
        .update(taxiwayData)
        .eq('id', editingId)

      if (error) {
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Bretelle mise à jour', 'success')
        await logAudit('Update taxiway', 'taxiways', editingId)
        resetForm()
        loadTaxiways()
      }
    } else {
      const { error } = await supabase
        .from('taxiways')
        .insert(taxiwayData)

      if (error) {
        showToast(`Erreur: ${error.message}`, 'error')
      } else {
        showToast('Bretelle créée', 'success')
        await logAudit('Create taxiway', 'taxiways', undefined)
        resetForm()
        loadTaxiways()
      }
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette bretelle ?')) return

    const { error } = await supabase
      .from('taxiways')
      .delete()
      .eq('id', id)

    if (error) {
      showToast(`Erreur: ${error.message}`, 'error')
    } else {
      showToast('Bretelle supprimée', 'success')
      await logAudit('Delete taxiway', 'taxiways', id)
      loadTaxiways()
    }
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Bretelles / Taxiways ({taxiways.length})
        </h3>
        {canWrite && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: showForm ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showForm ? 'Annuler' : '+ Ajouter'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Nom * (ex: Alpha, Bravo)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alpha"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Surface
              </label>
              <select
                value={surfaceType}
                onChange={(e) => setSurfaceType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="Asphalte">Asphalte</option>
                <option value="Béton">Béton</option>
                <option value="Terre">Terre</option>
                <option value="Gravier">Gravier</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Longueur (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="1200"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Largeur (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="23"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '8px 24px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {taxiways.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
          Aucune bretelle configurée
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nom</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Longueur (m)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Largeur (m)</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Surface</th>
                {canWrite && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {taxiways.map(taxiway => (
                <tr key={taxiway.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{taxiway.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{taxiway.length_m || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{taxiway.width_m || '-'}</td>
                  <td style={{ padding: '12px' }}>{taxiway.surface_type || '-'}</td>
                  {canWrite && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(taxiway)}
                        style={{
                          padding: '4px 12px',
                          marginRight: '8px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(taxiway.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Suppr.
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ========== MAIN COMPONENT ==========

export function InfrastructureManagement({ airportId, canWrite, showToast }: InfrastructureManagementProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginTop: '32px'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '32px', fontSize: '22px', fontWeight: '600' }}>
        Infrastructure de l'Aéroport
      </h2>

      <StandsSection airportId={airportId} canWrite={canWrite} showToast={showToast} />
      <RunwaysSection airportId={airportId} canWrite={canWrite} showToast={showToast} />
      <TaxiwaysSection airportId={airportId} canWrite={canWrite} showToast={showToast} />
    </div>
  )
}
