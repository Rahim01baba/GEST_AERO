import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { resolveBillingScope, getScopeLabel, getMovementsSummary, type AircraftMovement, type BillingScope } from '../lib/billingScope'
import { buildInvoiceModelFromScope, type InvoiceModel } from '../lib/billingEngine'
import { formatXOF } from '../lib/billing'
import { logger } from '../lib/logger'

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  movementId: string
}

export function InvoicePreviewModal({ isOpen, onClose, movementId }: InvoicePreviewModalProps) {
  const [invoiceModel, setInvoiceModel] = useState<InvoiceModel | null>(null)
  const [scope, setScope] = useState<BillingScope | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const model = await buildInvoiceModelFromScope(billingScope, {
        documentType: 'PROFORMA',
        pax_full: (movement.pax_arr_full || 0) + (movement.pax_dep_full || 0),
        pax_half: (movement.pax_arr_half || 0) + (movement.pax_dep_half || 0),
        pax_transit: movement.pax_transit || 0
      })

      setInvoiceModel(model)
    } catch (err: any) {
      logger.error('Error loading invoice preview', { error: err })
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
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
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              {error}
            </div>
          ) : invoiceModel && scope ? (
            <>
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Périmètre de facturation</h3>
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>
                    {getScopeLabel(scope)}
                  </div>
                  {scope.rotation_id && (
                    <div style={{ fontSize: '12px', color: '#0c4a6e', marginBottom: '8px' }}>
                      Rotation ID: <code style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>{scope.rotation_id.slice(0, 8)}</code>
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: '#0c4a6e' }}>
                    <strong>Mouvements concernés:</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {getMovementsSummary(scope).map((summary, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{summary}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Informations générales</h3>
                <div style={infoGridStyle}>
                  <div style={infoItemStyle}>
                    <strong>Immatriculation:</strong> {invoiceModel.header.registration}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Type d'avion:</strong> {invoiceModel.header.aircraft_type || 'N/A'}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>MTOW:</strong> {invoiceModel.header.mtow_kg} kg
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Compagnie:</strong> {invoiceModel.header.airline_name || invoiceModel.header.airline_code || 'N/A'}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Trafic:</strong> {invoiceModel.header.traffic_type}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>Type de document:</strong> {invoiceModel.header.documentType}
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Détail de facturation</h3>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Redevance</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Qté</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Prix unit.</th>
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
                    <tr style={{ borderTop: '2px solid #374151', backgroundColor: '#f0fdf4' }}>
                      <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
                        TOTAL:
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#059669' }}>
                        {formatXOF(invoiceModel.totals.grand_total_xof)}
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
              Données introuvables
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
