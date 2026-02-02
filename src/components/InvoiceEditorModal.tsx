import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { resolveBillingScope, getScopeLabel, type AircraftMovement, type BillingScope } from '../lib/billingScope'
import { buildInvoiceModelFromScope, saveInvoice, type InvoiceModel } from '../lib/billingEngine'
import { formatXOF } from '../lib/billing'

interface InvoiceEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  movementId: string
  airportCode: string
}

export function InvoiceEditorModal({ isOpen, onClose, onSuccess, movementId, airportCode }: InvoiceEditorModalProps) {
  const { showToast } = useToast()
  const [invoiceModel, setInvoiceModel] = useState<InvoiceModel | null>(null)
  const [scope, setScope] = useState<BillingScope | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')

  useEffect(() => {
    if (isOpen && movementId) {
      loadAndCalculate()
    }
  }, [isOpen, movementId])

  const loadAndCalculate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: movement, error: movementError } = await supabase
        .from('aircraft_movements')
        .select('*')
        .eq('id', movementId)
        .single()

      if (movementError) throw movementError
      if (!movement) throw new Error('Mouvement introuvable')

      const billingScope = await resolveBillingScope(movement as AircraftMovement)
      setScope(billingScope)

      setCustomerName(movement.airline_name || movement.airline_code || '')

      const model = await buildInvoiceModelFromScope(billingScope, {
        documentType: 'PROFORMA',
        pax_full: (movement.pax_arr_full || 0) + (movement.pax_dep_full || 0),
        pax_half: (movement.pax_arr_half || 0) + (movement.pax_dep_half || 0),
        pax_transit: movement.pax_transit || 0
      })

      setInvoiceModel(model)
    } catch (err: any) {
      console.error('Error loading invoice preview:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!invoiceModel || !customerName) return

    setSaving(true)
    try {
      await saveInvoice(invoiceModel, {
        client_name: customerName,
        status: 'draft'
      })

      showToast('Proforma créée avec succès', 'success')
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
            Édition de proforma
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={bodyStyle}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              {error}
            </div>
          ) : invoiceModel && scope ? (
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
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                    PROFORMA
                  </h3>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Date: {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '12px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '8px' }}>
                    {getScopeLabel(scope)}
                  </div>
                  {scope.rotation_id && (
                    <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>
                      Rotation ID: <code style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fbbf24' }}>{scope.rotation_id.slice(0, 8)}</code>
                    </div>
                  )}
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
                  <strong>Immat:</strong> {invoiceModel.header.registration} | <strong>MTOW:</strong> {invoiceModel.header.mtow_kg} kg | <strong>Trafic:</strong> {invoiceModel.header.traffic_type}
                </div>
              </div>

              <div style={tableSectionStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Redevance</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Qté</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Prix unitaire</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceModel.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={tdStyle}>{item.code}</td>
                        <td style={tdStyle}>{item.label}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {formatXOF(item.unit_price_xof)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                          {formatXOF(item.total_xof)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {Object.entries(invoiceModel.totals.group_totals).map(([group, total]) => {
                      if (total === 0) return null
                      const groupLabels: Record<string, string> = {
                        AERO: 'Redevances aéroportuaires',
                        ESC: 'Services d\'escale',
                        SURETE: 'Redevances sûreté',
                        OTHER: 'Autres redevances'
                      }
                      return (
                        <tr key={group} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontStyle: 'italic', color: '#6b7280' }}>
                            {groupLabels[group]}:
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                            {formatXOF(total)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid #374151', backgroundColor: '#fef3c7' }}>
                      <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
                        TOTAL:
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#b45309' }}>
                        {formatXOF(invoiceModel.totals.grand_total_xof)}
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
              Données introuvables
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
            {saving ? 'Enregistrement...' : '💾 Enregistrer Proforma'}
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

const sectionStyle: React.CSSProperties = {
  marginBottom: '16px'
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
  backgroundColor: '#f59e0b',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
}
