import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { toUserMessage } from '../lib/errorHandler'

interface AircraftEditorProps {
  mode: 'create' | 'edit'
}

export function AircraftEditor({ mode }: AircraftEditorProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast, ToastComponent } = useToast()

  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    registration: '',
    type: '',
    mtow_kg: '',
    seats: '',
    length_m: '',
    wingspan_m: '',
    height_m: '',
    operator: '',
    remarks: ''
  })

  useEffect(() => {
    if (mode === 'edit' && id) {
      loadAircraft()
    }
  }, [mode, id])

  const loadAircraft = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('aircrafts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        registration: data.registration || '',
        type: data.type || '',
        mtow_kg: data.mtow_kg?.toString() || '',
        seats: data.seats?.toString() || '',
        length_m: data.length_m?.toString() || '',
        wingspan_m: data.wingspan_m?.toString() || '',
        height_m: data.height_m?.toString() || '',
        operator: data.operator || '',
        remarks: data.remarks || ''
      })
    } catch (err: any) {
      showToast('Erreur de chargement: ' + toUserMessage(err), 'error')
      navigate('/aircrafts')
    } finally {
      setLoading(false)
    }
  }

  const saveAircraft = async () => {
    if (!formData.registration.trim() || !formData.type.trim()) {
      showToast('Veuillez remplir les champs obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      const aircraftData = {
        registration: formData.registration.trim().toUpperCase(),
        type: formData.type.trim(),
        mtow_kg: formData.mtow_kg ? parseFloat(formData.mtow_kg) : null,
        seats: formData.seats ? parseInt(formData.seats) : null,
        length_m: formData.length_m ? parseFloat(formData.length_m) : null,
        wingspan_m: formData.wingspan_m ? parseFloat(formData.wingspan_m) : null,
        height_m: formData.height_m ? parseFloat(formData.height_m) : null,
        operator: formData.operator.trim() || null,
        remarks: formData.remarks.trim() || null
      }

      if (mode === 'create') {
        const { error } = await supabase
          .from('aircrafts')
          .insert(aircraftData)

        if (error) throw error
        showToast('Avion créé', 'success')
      } else {
        const { error } = await supabase
          .from('aircrafts')
          .update(aircraftData)
          .eq('id', id!)

        if (error) throw error
        showToast('Avion modifié', 'success')
      }

      navigate('/aircrafts')
    } catch (err: any) {
      showToast('Erreur: ' + toUserMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteAircraft = async () => {
    if (mode === 'create' || !id) return

    if (!confirm(`Supprimer l'avion ${formData.registration} ?`)) return

    try {
      const { error } = await supabase
        .from('aircrafts')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Avion supprimé', 'success')
      navigate('/aircrafts')
    } catch (err: any) {
      showToast('Erreur: ' + toUserMessage(err), 'error')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
          {mode === 'create' ? 'Nouvel Avion' : `Éditer ${formData.registration}`}
        </h1>
        <button
          onClick={() => navigate('/aircrafts')}
          style={{ ...buttonStyle, backgroundColor: '#6b7280' }}
        >
          ← Retour
        </button>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Informations principales</h3>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Immatriculation *</label>
              <input
                type="text"
                value={formData.registration}
                onChange={e => setFormData({ ...formData, registration: e.target.value })}
                style={inputStyle}
                placeholder="F-HBNA"
                disabled={mode === 'edit'}
              />
            </div>
            <div>
              <label style={labelStyle}>Type d'aéronef *</label>
              <input
                type="text"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                style={inputStyle}
                placeholder="ATR72, A320, C208B..."
              />
            </div>
            <div>
              <label style={labelStyle}>MTOW (kg)</label>
              <input
                type="number"
                value={formData.mtow_kg}
                onChange={e => setFormData({ ...formData, mtow_kg: e.target.value })}
                style={inputStyle}
                placeholder="22000"
              />
            </div>
            <div>
              <label style={labelStyle}>Nombre de places</label>
              <input
                type="number"
                value={formData.seats}
                onChange={e => setFormData({ ...formData, seats: e.target.value })}
                style={inputStyle}
                placeholder="72"
              />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Dimensions</h3>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Longueur (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.length_m}
                onChange={e => setFormData({ ...formData, length_m: e.target.value })}
                style={inputStyle}
                placeholder="27.2"
              />
            </div>
            <div>
              <label style={labelStyle}>Envergure (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.wingspan_m}
                onChange={e => setFormData({ ...formData, wingspan_m: e.target.value })}
                style={inputStyle}
                placeholder="27.0"
              />
            </div>
            <div>
              <label style={labelStyle}>Hauteur (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.height_m}
                onChange={e => setFormData({ ...formData, height_m: e.target.value })}
                style={inputStyle}
                placeholder="7.7"
              />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Opérateur et remarques</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Compagnie / Opérateur</label>
            <input
              type="text"
              value={formData.operator}
              onChange={e => setFormData({ ...formData, operator: e.target.value })}
              style={inputStyle}
              placeholder="Air Côte d'Ivoire"
            />
          </div>
          <div>
            <label style={labelStyle}>Remarques</label>
            <textarea
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder="Notes additionnelles..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={saveAircraft}
            disabled={saving}
            style={{ ...buttonStyle, backgroundColor: '#10b981' }}
          >
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
          {mode === 'edit' && (
            <button
              onClick={deleteAircraft}
              style={{ ...buttonStyle, backgroundColor: '#dc2626' }}
            >
              🗑️ Supprimer
            </button>
          )}
          <button
            onClick={() => navigate('/aircrafts')}
            style={{ ...buttonStyle, backgroundColor: '#6b7280' }}
          >
            Annuler
          </button>
        </div>
      </div>
      {ToastComponent}
    </Layout>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '16px'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  fontWeight: 600,
  color: '#374151'
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px'
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

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer'
}
