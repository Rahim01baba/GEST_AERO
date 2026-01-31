import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

interface InvoiceEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  movementId: string
  airportCode: string
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
  airline_code: string | null
  origin_iata: string | null
  destination_iata: string | null
  stand_name: string | null
  pax_arr_full: number
  pax_arr_half: number
  pax_dep_full: number
  pax_dep_half: number
  traffic_type: string | null
  airport_id: string
}

interface BillingLine {
  label: string
  description: string
  amount: number
}

export function InvoiceEditorModal({ isOpen, onClose, onSuccess, movementId, airportCode }: InvoiceEditorModalProps) {
  const { showToast } = useToast()
  const [movement, setMovement] = useState<Movement | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [billingLines, setBillingLines] = useState<BillingLine[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerName, setCustomerName] = useState('')

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
      setCustomerName(movementData.airline_name || '')

      await generateInvoiceNumber(movementData.airport_id)
      calculateBilling(movementData)
    } catch (error) {
      console.error('Error loading movement:', error)
      showToast('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generateInvoiceNumber = async (airportId: string) => {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('airport_id', airportId)
      .gte('created_at', `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`)

    const sequence = ((count || 0) + 1).toString().padStart(4, '0')
    const invoiceNum = `SODEXAM-${airportCode}-${yearMonth}-${sequence}`
    setInvoiceNumber(invoiceNum)
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

  const handleSave = async () => {
    if (!movement) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .insert({
          movement_id: movement.id,
          airport_id: movement.airport_id,
          invoice_number: invoiceNumber,
          customer: customerName,
          registration: movement.registration,
          flight_number: movement.flight_number,
          amount_xof: getTotalHT(),
          total_xof: getTotalTTC(),
          tax_xof: getTVA(),
          status: 'Issued',
          traffic_type: movement.traffic_type || 'NAT',
          issued_at: new Date().toISOString(),
          billing_details: {
            lines: billingLines
          }
        })

      if (error) throw error

      await supabase
        .from('aircraft_movements')
        .update({ is_invoiced: true })
        .eq('id', movement.id)

      showToast('Facture créée avec succès', 'success')
      onSuccess()
      onClose()
    } catch (error: any) {
      showToast('Erreur: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    showToast('Fonction PDF en développement', 'info')
  }

  if (!isOpen) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Édition de facture
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={bodyStyle}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
          ) : movement ? (
            <>
              <div style={invoiceHeaderStyle}>
                <div style={logoSectionStyle}>
                  <div style={logoStyle}>SODEXAM</div>
                  <div style={companyInfoStyle}>
                    <strong>Société d'Exploitation et de Développement Aéroportuaire, Aéronautique et Météorologique</strong>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                      Direction des Aéroports Secondaires
                      <br />
                      Aéroport de {airportCode}
                      <br />
                      Tél: +225 XX XX XX XX XX
                      <br />
                      Email: facturation@sodexam.ci
                    </div>
                  </div>
                </div>

                <div style={invoiceInfoStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                    FACTURE
                  </h3>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    <strong>N° {invoiceNumber}</strong>
                    <br />
                    Date: {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              <div style={customerSectionStyle}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#374151' }}>Client:</strong>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={inputStyle}
                    placeholder="Nom de la compagnie"
                  />
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                  <strong>Vol:</strong> {movement.flight_number} | <strong>Immat:</strong> {movement.registration} | <strong>Date:</strong> {new Date(movement.scheduled_time).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div style={tableSectionStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={thStyle}>Redevance</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Montant HT (XOF)</th>
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

              <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                Merci de votre confiance - SODEXAM
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
            Annuler
          </button>
          <button onClick={handlePrint} style={secondaryButtonStyle}>
            🖨️ Imprimer
          </button>
          <button onClick={handleDownloadPDF} style={secondaryButtonStyle}>
            📥 Télécharger PDF
          </button>
          <button onClick={handleSave} disabled={saving || !customerName} style={{
            ...saveButtonStyle,
            opacity: (saving || !customerName) ? 0.5 : 1,
            cursor: (saving || !customerName) ? 'not-allowed' : 'pointer'
          }}>
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
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
  maxWidth: '1000px',
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
  padding: '32px'
}

const invoiceHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '3px solid #3b82f6'
}

const logoSectionStyle: React.CSSProperties = {
  flex: 1
}

const logoStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  color: '#3b82f6',
  marginBottom: '12px',
  letterSpacing: '1px'
}

const companyInfoStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: 1.5
}

const invoiceInfoStyle: React.CSSProperties = {
  textAlign: 'right'
}

const customerSectionStyle: React.CSSProperties = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px'
}

const tableSectionStyle: React.CSSProperties = {
  marginBottom: '24px'
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

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
}

const saveButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
}
