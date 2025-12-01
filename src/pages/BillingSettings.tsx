import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

interface BillingSetting {
  id: string
  airport_id: string | null
  fee_type: string
  fee_subtype: string | null
  description: string
  value: number
  currency: string
  unit: string | null
  is_active: boolean
  metadata: any
}

export function BillingSettings() {
  const { user } = useAuth()
  const { showToast, ToastComponent } = useToast()
  const [settings, setSettings] = useState<BillingSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Accès refusé</h2>
          <p>Seuls les administrateurs peuvent accéder aux paramètres de facturation.</p>
        </div>
      </Layout>
    )
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('billing_settings')
      .select('*')
      .order('fee_type, fee_subtype')

    if (error) {
      showToast('Erreur chargement paramètres', 'error')
    } else {
      setSettings(data || [])
    }
    setLoading(false)
  }

  const updateSetting = async (id: string, newValue: number) => {
    const { error } = await supabase
      .from('billing_settings')
      .update({
        value: newValue,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      showToast('Erreur mise à jour', 'error')
    } else {
      showToast('Paramètre mis à jour', 'success')
      setEditingId(null)
      loadSettings()
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('billing_settings')
      .update({ is_active: !currentActive })
      .eq('id', id)

    if (error) {
      showToast('Erreur', 'error')
    } else {
      showToast(`Paramètre ${!currentActive ? 'activé' : 'désactivé'}`, 'success')
      loadSettings()
    }
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.fee_type]) {
      acc[setting.fee_type] = []
    }
    acc[setting.fee_type].push(setting)
    return acc
  }, {} as Record<string, BillingSetting[]>)

  return (
    <Layout>
      {ToastComponent}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px' }}>
          ⚙️ Paramètres de Facturation
        </h1>

        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ margin: 0, color: '#92400e' }}>
            <strong>⚠️ Attention:</strong> Les modifications affectent immédiatement le calcul des nouvelles factures.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
        ) : (
          Object.entries(groupedSettings).map(([feeType, typeSettings]) => (
            <div key={feeType} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
                {getFeeTypeLabel(feeType)}
              </h2>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'right', width: '150px' }}>Valeur</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Devise</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>Unité</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Actif</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typeSettings.map(setting => (
                    <tr key={setting.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>
                        <div>{setting.description}</div>
                        {setting.metadata && Object.keys(setting.metadata).length > 0 && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {JSON.stringify(setting.metadata)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {editingId === setting.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              if (editValue) updateSetting(setting.id, parseFloat(editValue))
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editValue) {
                                updateSetting(setting.id, parseFloat(editValue))
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '2px solid #3b82f6',
                              borderRadius: '4px',
                              textAlign: 'right'
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingId(setting.id)
                              setEditValue(setting.value.toString())
                            }}
                            style={{ cursor: 'pointer', fontWeight: 600 }}
                          >
                            {setting.value.toLocaleString('fr-FR')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{setting.currency}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        {setting.unit || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleActive(setting.id, setting.is_active)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: setting.is_active ? '#10b981' : '#ef4444',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {setting.is_active ? 'OUI' : 'NON'}
                        </button>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingId(setting.id)
                            setEditValue(setting.value.toString())
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}

function getFeeTypeLabel(feeType: string): string {
  const labels: Record<string, string> = {
    'LANDING': '🛬 Redevances d\'atterrissage',
    'PARKING': '🅿️ Redevances de stationnement',
    'LIGHTING': '💡 Balisage lumineux',
    'PASSENGER': '👥 Redevances passagers',
    'SECURITY': '🔒 Redevances sûreté',
    'FREIGHT': '📦 Redevances fret',
    'FUEL': '⛽ Redevances carburant',
    'OVERTIME': '🕐 Horaires exceptionnels'
  }
  return labels[feeType] || feeType
}
