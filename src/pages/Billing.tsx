import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase, Invoice, AircraftMovement, logAudit } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { formatXOF } from '../lib/billing'
import { logger } from '../lib/logger'
import { toUserMessage } from '../lib/errorHandler'

export function Billing() {
  const { user, can, getAssignedAirportId } = useAuth()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterRegistration, setFilterRegistration] = useState('')
  const { showToast, ToastComponent } = useToast()

  const [uninvoicedMovements, setUninvoicedMovements] = useState<AircraftMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [filterMvtStartDate, setFilterMvtStartDate] = useState('')
  const [filterMvtEndDate, setFilterMvtEndDate] = useState('')
  const [filterMvtRegistration, setFilterMvtRegistration] = useState('')
  const [showUninvoicedSection, setShowUninvoicedSection] = useState(true)
  const [creatingInvoices, setCreatingInvoices] = useState<Set<string>>(new Set())
  const [selectedAirportId, setSelectedAirportId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const airportId = user?.airport_id || await getAssignedAirportId()
      if (airportId) {
        setSelectedAirportId(airportId)
      }
    }
    init()
  }, [user])

  useEffect(() => {
    if (selectedAirportId) {
      loadInvoices()
      loadUninvoicedMovements()
    }
  }, [selectedAirportId, filterStartDate, filterEndDate, filterRegistration, filterMvtStartDate, filterMvtEndDate, filterMvtRegistration])

  const loadInvoices = async () => {
    if (!selectedAirportId) {
      setLoading(false)
      return
    }

    setError(null)
    setLoading(true)

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('airport_id', selectedAirportId)

      if (filterStartDate) {
        query = query.gte('created_at', new Date(filterStartDate).toISOString())
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('created_at', endDate.toISOString())
      }
      if (filterRegistration.trim()) {
        query = query.ilike('registration', `%${filterRegistration.trim()}%`)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      setInvoices(data || [])
    } catch (err: any) {
      logger.error('Error loading invoices', { error: err })
      const errorMessage = toUserMessage(err) || 'Erreur inconnue'
      if (err.code === '42501') {
        setError('Accès refusé (RLS). Vérifiez vos permissions.')
      } else if (toUserMessage(err)?.includes('JWT')) {
        setError('Session expirée. Reconnectez-vous.')
      } else {
        setError(`Erreur: ${errorMessage}`)
      }
      showToast('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadUninvoicedMovements = async () => {
    if (!selectedAirportId) return

    setMovementsLoading(true)
    try {
      let query = supabase
        .from('aircraft_movements')
        .select('*')
        .eq('airport_id', selectedAirportId)
        .eq('is_invoiced', false)
        .eq('billable', true)

      if (filterMvtStartDate) {
        query = query.gte('scheduled_time', new Date(filterMvtStartDate).toISOString())
      }
      if (filterMvtEndDate) {
        const endDate = new Date(filterMvtEndDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('scheduled_time', endDate.toISOString())
      }
      if (filterMvtRegistration.trim()) {
        query = query.ilike('registration', `%${filterMvtRegistration.trim()}%`)
      }

      query = query.order('scheduled_time', { ascending: true }).limit(100)

      const { data, error } = await query

      if (error) throw error
      setUninvoicedMovements(data || [])
    } catch (err: any) {
      logger.error('Error loading uninvoiced movements', { error: err })
      showToast('Erreur chargement mouvements', 'error')
    } finally {
      setMovementsLoading(false)
    }
  }

  const createInvoiceFromMovement = async (movementId: string) => {
    if (!user || !user.airport_id) return

    setCreatingInvoices(prev => new Set(prev).add(movementId))

    try {
      const movement = uninvoicedMovements.find(m => m.id === movementId)
      if (!movement) throw new Error('Mouvement introuvable')

      const trafficType = movement.origin_iata || movement.destination_iata ? 'INT' : 'NAT'

      const invoiceData = {
        airport_id: user.airport_id,
        movement_arr_id: movement.movement_type === 'ARR' ? movement.id : null,
        movement_dep_id: movement.movement_type === 'DEP' ? movement.id : null,
        customer: movement.airline_name || movement.airline_code || 'Client inconnu',
        mtow_kg: movement.mtow_kg || 0,
        aircraft_type: movement.aircraft_type,
        registration: movement.registration,
        traffic_type: trafficType,
        arr_datetime: movement.movement_type === 'ARR' ? movement.actual_time || movement.scheduled_time : null,
        dep_datetime: movement.movement_type === 'DEP' ? movement.actual_time || movement.scheduled_time : null,
        origin_iata: movement.origin_iata,
        destination_iata: movement.destination_iata,
        status: 'DRAFT' as const,
        total_xof: 0,
        created_by: user.id
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      const { error: updateError } = await supabase
        .from('aircraft_movements')
        .update({ is_invoiced: true })
        .eq('id', movementId)

      if (updateError) throw updateError

      await logAudit('Create invoice from movement', 'invoices', invoice.id)

      showToast('Facture créée avec succès', 'success')
      loadUninvoicedMovements()
      loadInvoices()

      navigate(`/billing/${invoice.id}`)
    } catch (err: any) {
      logger.error('Error creating invoice', { error: err })
      showToast(toUserMessage(err) || 'Erreur création facture', 'error')
    } finally {
      setCreatingInvoices(prev => {
        const next = new Set(prev)
        next.delete(movementId)
        return next
      })
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: 'ISSUED' | 'PAID' | 'CANCELED') => {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId)

    if (error) {
      showToast('Erreur de mise à jour', 'error')
    } else {
      showToast(`Statut mis à jour: ${status}`, 'success')
      await logAudit(`Update invoice to ${status}`, 'invoices', invoiceId)
      loadInvoices()
    }
  }

  const exportCSV = () => {
    const headers = ['N° Facture', 'Client', 'Immat', 'Type', 'Montant', 'Statut', 'Date']
    const rows = invoices.map(inv => [
      inv.invoice_number,
      inv.customer,
      inv.registration,
      inv.aircraft_type,
      inv.total_xof,
      inv.status,
      new Date(inv.created_at).toLocaleDateString('fr-FR')
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factures-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>Facturation</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {can('export_csv') && (
            <button onClick={exportCSV} style={buttonStyle}>Export CSV</button>
          )}
          {can('create_proforma') && (
            <button
              onClick={() => navigate('/billing/new')}
              style={{ ...buttonStyle, backgroundColor: '#10b981' }}
            >
              + Nouvelle facture
            </button>
          )}
        </div>
      </div>

      {showUninvoicedSection && can('create_invoice') && (
        <>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
                Mouvements Non Factures
              </h2>
              <button
                onClick={() => setShowUninvoicedSection(false)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Masquer
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={labelStyle}>Date de debut</label>
                <input
                  type="date"
                  value={filterMvtStartDate}
                  onChange={(e) => setFilterMvtStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input
                  type="date"
                  value={filterMvtEndDate}
                  onChange={(e) => setFilterMvtEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Immatriculation</label>
                <input
                  type="text"
                  placeholder="F-HBNA"
                  value={filterMvtRegistration}
                  onChange={(e) => setFilterMvtRegistration(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => {
                    setFilterMvtStartDate('')
                    setFilterMvtEndDate('')
                    setFilterMvtRegistration('')
                  }}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6b7280',
                    width: '100%'
                  }}
                >
                  Reinitialiser
                </button>
              </div>
            </div>

            {movementsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                Chargement des mouvements...
              </div>
            ) : uninvoicedMovements.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>
                  Aucun mouvement non facture
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#fef3c7' }}>
                    <tr>
                      <th style={thStyle}>Vol</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Immat</th>
                      <th style={thStyle}>Type Avion</th>
                      <th style={thStyle}>Date/Heure</th>
                      <th style={thStyle}>Route</th>
                      <th style={thStyle}>Compagnie</th>
                      <th style={thStyle}>MTOW (kg)</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uninvoicedMovements.map((movement) => (
                      <tr key={movement.id} style={{ borderTop: '1px solid #fef3c7' }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>
                          {movement.flight_number}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: movement.movement_type === 'ARR' ? '#dbeafe' : '#dcfce7',
                            color: movement.movement_type === 'ARR' ? '#1e40af' : '#065f46'
                          }}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                          {movement.registration}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>{movement.aircraft_type}</td>
                        <td style={{ ...tdStyle, fontSize: '13px' }}>
                          {new Date(movement.scheduled_time).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>
                          {movement.movement_type === 'ARR'
                            ? `${movement.origin_iata || '?'} → BYK`
                            : `BYK → ${movement.destination_iata || '?'}`
                          }
                        </td>
                        <td style={tdStyle}>{movement.airline_name || movement.airline_code || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {movement.mtow_kg?.toLocaleString('fr-FR') || '-'}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => createInvoiceFromMovement(movement.id)}
                            disabled={creatingInvoices.has(movement.id)}
                            style={{
                              ...buttonStyle,
                              backgroundColor: creatingInvoices.has(movement.id) ? '#9ca3af' : '#10b981',
                              cursor: creatingInvoices.has(movement.id) ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              padding: '6px 12px'
                            }}
                          >
                            {creatingInvoices.has(movement.id) ? 'Creation...' : 'Creer facture'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uninvoicedMovements.length === 100 && (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#6b7280',
                    backgroundColor: '#fef3c7',
                    borderTop: '1px solid #f59e0b'
                  }}>
                    Affichage limite a 100 mouvements. Utilisez les filtres pour affiner la recherche.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!showUninvoicedSection && can('create_invoice') && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowUninvoicedSection(true)}
            style={{
              ...buttonStyle,
              backgroundColor: '#f59e0b'
            }}
          >
            Afficher les mouvements non factures
          </button>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f3f4f6'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
          Filtres de recherche
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <label style={labelStyle}>Date de debut</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date de fin</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Immatriculation</label>
            <input
              type="text"
              placeholder="F-HBNA"
              value={filterRegistration}
              onChange={(e) => setFilterRegistration(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                setFilterStartDate('')
                setFilterEndDate('')
                setFilterRegistration('')
              }}
              style={{
                ...buttonStyle,
                backgroundColor: '#6b7280',
                width: '100%'
              }}
            >
              Reinitialiser
            </button>
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
            Chargement des factures...
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
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>
              Aucune facture trouvee
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
              Creez votre premiere facture ou ajustez les filtres
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={thStyle}>N° Facture</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Immat</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Trafic</th>
                <th style={thStyle}>Montant</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>
                    {invoice.invoice_number}
                  </td>
                  <td style={tdStyle}>{invoice.customer}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                    {invoice.registration}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px' }}>{invoice.aircraft_type}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: invoice.traffic_type === 'INT' ? '#dbeafe' : '#f3f4f6',
                      color: invoice.traffic_type === 'INT' ? '#1e40af' : '#374151'
                    }}>
                      {invoice.traffic_type}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {formatXOF(invoice.total_xof)}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      ...getStatusStyle(invoice.status)
                    }}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px' }}>
                    {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/billing/${invoice.id}`)}
                        style={{ ...actionButtonStyle, backgroundColor: '#6b7280' }}
                        title="Voir"
                      >
                        View
                      </button>
                      {invoice.status === 'DRAFT' && can('create_invoice') && (
                        <>
                          <button
                            onClick={() => updateInvoiceStatus(invoice.id, 'ISSUED')}
                            style={{ ...actionButtonStyle, backgroundColor: '#3b82f6' }}
                            title="Emettre"
                          >
                            Issue
                          </button>
                          <button
                            onClick={() => updateInvoiceStatus(invoice.id, 'CANCELED')}
                            style={{ ...actionButtonStyle, backgroundColor: '#ef4444' }}
                            title="Annuler"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {invoice.status === 'ISSUED' && can('create_invoice') && (
                        <>
                          <button
                            onClick={() => updateInvoiceStatus(invoice.id, 'PAID')}
                            style={{ ...actionButtonStyle, backgroundColor: '#10b981' }}
                            title="Marquer paye"
                          >
                            Paid
                          </button>
                          <button
                            onClick={() => updateInvoiceStatus(invoice.id, 'CANCELED')}
                            style={{ ...actionButtonStyle, backgroundColor: '#ef4444' }}
                            title="Annuler"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {ToastComponent}
    </Layout>
  )
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT': return 'Brouillon'
    case 'ISSUED': return 'Emise'
    case 'PAID': return 'Payee'
    case 'CANCELED': return 'Annulee'
    default: return status
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'DRAFT':
      return { backgroundColor: '#f3f4f6', color: '#1f2937' }
    case 'ISSUED':
      return { backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'PAID':
      return { backgroundColor: '#d1fae5', color: '#065f46' }
    case 'CANCELED':
      return { backgroundColor: '#fee2e2', color: '#991b1b' }
    default:
      return { backgroundColor: '#f3f4f6', color: '#1f2937' }
  }
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#1a1a1a',
}

const actionButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '11px',
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
}
