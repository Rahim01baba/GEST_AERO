import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  movementId: string
}

interface Movement {
  id: string
  flight_number: string
  registration: string
  aircraft_type: string
  mtow_kg: number | null
  scheduled_time: string
  movement_type: string
  airline_name: string | null
  origin_iata: string | null
  destination_iata: string | null
  stand_name: string | null
  pax_arr_full: number
  pax_arr_half: number
  pax_dep_full: number
  pax_dep_half: number
  traffic_type: string | null
}

interface BillingLine {
  label: string
  description: string
  amount: number
}

export function InvoicePreviewModal({ isOpen, onClose, movementId }: InvoicePreviewModalProps) {
  const [movement, setMovement] = useState<Movement | null>(null)
  const [loading, setLoading] = useState(false)
  const [billingLines, setBillingLines] = useState<BillingLine[]>([])

  useEffect(() => {
    if (isOpen && movementId) {
      loadMovementData()
    }
  }, [isOpen, movementId])

  const loadMovementData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('aircraft_movements')
        .select(`
          *,
          stands!aircraft_movements_stand_id_fkey(name)
        `)
        .eq('id', movementId)
        .single()

      if (error) throw error

      let finalMtow = data.mtow_kg

      if (!finalMtow && data.registration) {
        const { data: aircraftData } = await supabase
          .from('aircrafts')
          .select('mtow_kg')
          .eq('registration', data.registration)
          .maybeSingle()

        if (aircraftData?.mtow_kg) {
          finalMtow = aircraftData.mtow_kg
        }
      }

      const movementData = {
        ...data,
        mtow_kg: finalMtow,
        stand_name: data.stands?.name || null
      }
      setMovement(movementData)

      calculateBilling(movementData)
    } catch (error) {
      console.error('Error loading movement:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBilling = (mvt: Movement) => {
    const lines: BillingLine[] = []

    const mtow = mvt.mtow_kg || 0
    const paxTotal = mvt.pax_arr_full + mvt.pax_arr_half + mvt.pax_dep_full + mvt.pax_dep_half
    const isInternational = mvt.traffic_type === 'INT'

    if (mvt.movement_type === 'ARR' || mvt.movement_type === 'DEP') {
      const landingRate = isInternational ? 15 : 10
      const landingAmount = (mtow / 1000) * landingRate
      lines.push({
        label: 'Redevance d\'atterrissage',
        description: `${(mtow / 1000).toFixed(2)} tonnes × ${landingRate} XOF/tonne`,
        amount: landingAmount
      })
    }

    if (mvt.stand_name) {
      const parkingHours = 3
      const parkingRate = 500
      const parkingAmount = parkingHours * parkingRate
      lines.push({
        label: 'Redevance de stationnement',
        description: `${parkingHours} heures × ${parkingRate} XOF/h`,
        amount: parkingAmount
      })
    }

    if (paxTotal > 0) {
      const paxRate = isInternational ? 2000 : 1500
      const paxAmount = paxTotal * paxRate
      lines.push({
        label: 'Redevance passagers',
        description: `${paxTotal} PAX × ${paxRate} XOF`,
        amount: paxAmount
      })
    }

    lines.push({
      label: 'Redevance de sûreté',
      description: 'Forfait',
      amount: 5000
    })

    setBillingLines(lines)
  }

  const getTotalHT = () => {
    return billingLines.reduce((sum, line) => sum + line.amount, 0)
  }

  const getTVA = () => {
    return getTotalHT() * 0.18
  }

  const getTotalTTC = () => {
    return getTotalHT() + getTVA()
  }

  if (!isOpen) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Prévisualisation de la facture
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={bodyStyle}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
          ) : movement ? (
            <>
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Informations du mouvement</h3>
                <div style={infoGridStyle}>
                  <div style={infoItemStyle}>
                    <strong>Vol:</strong> {movement.flight_number}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Immatriculation:</strong> {movement.registration}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Type:</strong> {movement.aircraft_type}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>MTOW:</strong> {movement.mtow_kg ? `${movement.mtow_kg} kg` : 'N/A'}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Date:</strong> {new Date(movement.scheduled_time).toLocaleString('fr-FR')}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Stand:</strong> {movement.stand_name || 'Non assigné'}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Compagnie:</strong> {movement.airline_name || 'N/A'}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Trafic:</strong> {movement.traffic_type || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Détail de facturation</h3>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={thStyle}>Redevance</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Montant (XOF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingLines.map((line, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={tdStyle}>{line.label}</td>
                        <td style={tdStyle}>{line.description}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                          {line.amount.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        Total HT:
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {getTotalHT().toLocaleString('fr-FR')} XOF
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right' }}>
                        TVA (18%):
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {getTVA().toLocaleString('fr-FR')} XOF
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
                        Total TTC:
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#059669' }}>
                        {getTotalTTC().toLocaleString('fr-FR')} XOF
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
                ℹ️ Ceci est une prévisualisation. Utilisez le bouton "Facturer" pour créer la facture officielle.
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Mouvement introuvable
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
}

const modalStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  maxWidth: '900px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
}

const headerStyle: React.CSSProperties = {
  padding: '18px 22px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '26px',
  cursor: 'pointer',
  color: '#6b7280',
  lineHeight: 1,
  padding: 0
}

const bodyStyle: React.CSSProperties = {
  padding: '22px'
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '24px'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: '16px',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '8px'
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px'
}

const infoItemStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1f2937'
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px'
}

const thStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: '13px'
}

const tdStyle: React.CSSProperties = {
  padding: '12px',
  color: '#1f2937'
}

const footerStyle: React.CSSProperties = {
  padding: '16px 22px',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px'
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#6b7280',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
}
