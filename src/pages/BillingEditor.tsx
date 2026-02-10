import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase, logAudit } from '../lib/supabase'
import type { InvoiceItem as DbInvoiceItem } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { calculateAllItems, formatXOF, BillingCalculationInput, calculateTotal, calculateGroupTotals } from '../lib/billing'
import { toUserMessage } from '../lib/errorHandler'

interface BillingEditorProps {
  mode: 'create' | 'edit'
}

export function BillingEditor({ mode }: BillingEditorProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast, ToastComponent } = useToast()

  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    customer: '',
    registration: '',
    aircraft_type: '',
    mtow_kg: 0,
    traffic_type: 'INT' as 'NAT' | 'INT',
    arr_datetime: '',
    dep_datetime: '',
    origin_iata: '',
    destination_iata: '',
    pax_full: 0,
    pax_half: 0,
    pax_transit: 0,
    freight_kg: 0,
    freight_rate_xof_kg: 0,
    fuel_liters: 0,
    fuel_rate_xof_liter: 0,
    overtime_hours: 0,
    overtime_rate_xof_hour: 0,
    include_lighting_arr: false,
    include_lighting_dep: false,
    notes: ''
  })

  const [items, setItems] = useState<DbInvoiceItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED'>('DRAFT')

  useEffect(() => {
    if (mode === 'edit' && id) {
      loadInvoice()
    } else if (mode === 'create') {
      setInvoiceNumber('')
    }
  }, [mode, id])

  const loadInvoice = async () => {
    if (!id) return

    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      const dbItems: DbInvoiceItem[] = (invoiceItems || []).map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        code: item.code,
        label: item.label,
        qty: item.qty,
        unit_price_xof: item.unit_price_xof,
        total_xof: item.total_xof,
        item_group: item.item_group,
        sort_order: item.sort_order,
        created_at: item.created_at
      }))

      setInvoiceNumber(invoice.invoice_number)
      setStatus(invoice.status)
      setFormData({
        customer: invoice.customer,
        registration: invoice.registration,
        aircraft_type: invoice.aircraft_type,
        mtow_kg: invoice.mtow_kg,
        traffic_type: invoice.traffic_type,
        arr_datetime: invoice.arr_datetime || '',
        dep_datetime: invoice.dep_datetime || '',
        origin_iata: invoice.origin_iata || '',
        destination_iata: invoice.destination_iata || '',
        pax_full: 0,
        pax_half: 0,
        pax_transit: 0,
        freight_kg: 0,
        freight_rate_xof_kg: 0,
        fuel_liters: 0,
        fuel_rate_xof_liter: 0,
        overtime_hours: 0,
        overtime_rate_xof_hour: 0,
        include_lighting_arr: false,
        include_lighting_dep: false,
        notes: invoice.notes || ''
      })
      setItems(dbItems)
    } catch (err: any) {
      showToast('Erreur de chargement: ' + toUserMessage(err), 'error')
      navigate('/billing')
    } finally {
      setLoading(false)
    }
  }

  const recalculate = () => {
    const input: BillingCalculationInput = {
      mtow_kg: formData.mtow_kg,
      traffic_type: formData.traffic_type,
      arr_datetime: formData.arr_datetime ? new Date(formData.arr_datetime) : undefined,
      dep_datetime: formData.dep_datetime ? new Date(formData.dep_datetime) : undefined,
      pax_full: formData.pax_full,
      pax_half: formData.pax_half,
      pax_transit: formData.pax_transit,
      freight_kg: formData.freight_kg,
      freight_rate_xof_kg: formData.freight_rate_xof_kg,
      fuel_liters: formData.fuel_liters,
      fuel_rate_xof_liter: formData.fuel_rate_xof_liter,
      overtime_hours: formData.overtime_hours,
      overtime_rate_xof_hour: formData.overtime_rate_xof_hour,
      include_lighting_arr: formData.include_lighting_arr,
      include_lighting_dep: formData.include_lighting_dep
    }

    const calculatedItems = calculateAllItems(input)
    const dbItems: DbInvoiceItem[] = calculatedItems.map((item) => ({
      id: '',
      invoice_id: id || '',
      code: item.code,
      label: item.label,
      qty: item.qty,
      unit_price_xof: item.unit_price_xof,
      total_xof: item.total_xof,
      item_group: item.item_group,
      sort_order: item.sort_order,
      created_at: new Date().toISOString()
    }))
    setItems(dbItems)
  }

  const saveInvoice = async () => {
    if (!user?.airport_id) {
      showToast('Utilisateur non connecté', 'error')
      return
    }

    if (!formData.customer || !formData.registration || !formData.aircraft_type) {
      showToast('Veuillez remplir les champs obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      const total = calculateTotal(items)

      const invoiceData: any = {
        airport_id: user.airport_id,
        customer: formData.customer,
        mtow_kg: formData.mtow_kg,
        aircraft_type: formData.aircraft_type,
        registration: formData.registration,
        traffic_type: formData.traffic_type,
        arr_datetime: formData.arr_datetime || null,
        dep_datetime: formData.dep_datetime || null,
        origin_iata: formData.origin_iata || null,
        destination_iata: formData.destination_iata || null,
        status: status,
        total_xof: total,
        notes: formData.notes || null
      }

      if (mode === 'edit') {
        invoiceData.invoice_number = invoiceNumber
      }

      let invoiceId = id

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (error) throw error
        invoiceId = data.id
        setInvoiceNumber(data.invoice_number)
        await logAudit('Create invoice', 'invoices', invoiceId)
      } else {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', id!)

        if (error) throw error
        await logAudit('Update invoice', 'invoices', id!)
      }

      if (items.length > 0 && invoiceId) {
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId)

        const itemsToInsert = items.map(item => ({
          invoice_id: invoiceId,
          code: item.code,
          label: item.label,
          qty: item.qty,
          unit_price_xof: item.unit_price_xof,
          total_xof: item.total_xof,
          item_group: item.item_group,
          sort_order: item.sort_order
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      showToast('Facture enregistrée', 'success')
      navigate('/billing')
    } catch (err: any) {
      showToast('Erreur: ' + toUserMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteInvoice = async () => {
    if (mode === 'create' || !id) return

    if (!confirm('Supprimer cette facture ?')) return

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Facture supprimée', 'success')
      await logAudit('Delete invoice', 'invoices', id)
      navigate('/billing')
    } catch (err: any) {
      showToast('Erreur: ' + toUserMessage(err), 'error')
    }
  }

  const updateStatus = async (newStatus: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED') => {
    if (mode === 'create' || !id) {
      setStatus(newStatus)
      return
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      setStatus(newStatus)
      showToast(`Statut: ${newStatus}`, 'success')
      await logAudit(`Update invoice status to ${newStatus}`, 'invoices', id)
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

  const groupTotals = calculateGroupTotals(items)
  const grandTotal = calculateTotal(items)

  return (
    <Layout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
            {mode === 'create' ? 'Nouvelle Facture' : `Facture ${invoiceNumber}`}
          </h1>
          {mode === 'edit' && (
            <span style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              ...getStatusStyle(status)
            }}>
              {getStatusLabel(status)}
            </span>
          )}
        </div>
        <button onClick={() => navigate('/billing')} style={{ ...buttonStyle, backgroundColor: '#6b7280' }}>
          ← Retour
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Informations générales</h3>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Client *</label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={e => setFormData({ ...formData, customer: e.target.value })}
                  style={inputStyle}
                  placeholder="Air France"
                />
              </div>
              <div>
                <label style={labelStyle}>Immatriculation *</label>
                <input
                  type="text"
                  value={formData.registration}
                  onChange={e => setFormData({ ...formData, registration: e.target.value })}
                  style={inputStyle}
                  placeholder="F-HBNA"
                />
              </div>
              <div>
                <label style={labelStyle}>Type avion *</label>
                <input
                  type="text"
                  value={formData.aircraft_type}
                  onChange={e => setFormData({ ...formData, aircraft_type: e.target.value })}
                  style={inputStyle}
                  placeholder="B737"
                />
              </div>
              <div>
                <label style={labelStyle}>MTOW (kg) *</label>
                <input
                  type="number"
                  value={formData.mtow_kg}
                  onChange={e => setFormData({ ...formData, mtow_kg: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Trafic</label>
                <select
                  value={formData.traffic_type}
                  onChange={e => setFormData({ ...formData, traffic_type: e.target.value as 'NAT' | 'INT' })}
                  style={inputStyle}
                >
                  <option value="NAT">National</option>
                  <option value="INT">International</option>
                </select>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Dates et lieux</h3>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Arrivée</label>
                <input
                  type="datetime-local"
                  value={formData.arr_datetime}
                  onChange={e => setFormData({ ...formData, arr_datetime: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Départ</label>
                <input
                  type="datetime-local"
                  value={formData.dep_datetime}
                  onChange={e => setFormData({ ...formData, dep_datetime: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Origine IATA</label>
                <input
                  type="text"
                  value={formData.origin_iata}
                  onChange={e => setFormData({ ...formData, origin_iata: e.target.value })}
                  style={inputStyle}
                  placeholder="CDG"
                />
              </div>
              <div>
                <label style={labelStyle}>Destination IATA</label>
                <input
                  type="text"
                  value={formData.destination_iata}
                  onChange={e => setFormData({ ...formData, destination_iata: e.target.value })}
                  style={inputStyle}
                  placeholder="ABJ"
                />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Passagers et fret</h3>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>PAX plein tarif</label>
                <input
                  type="number"
                  value={formData.pax_full}
                  onChange={e => setFormData({ ...formData, pax_full: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>PAX demi-tarif</label>
                <input
                  type="number"
                  value={formData.pax_half}
                  onChange={e => setFormData({ ...formData, pax_half: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>PAX transit</label>
                <input
                  type="number"
                  value={formData.pax_transit}
                  onChange={e => setFormData({ ...formData, pax_transit: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fret (kg)</label>
                <input
                  type="number"
                  value={formData.freight_kg}
                  onChange={e => setFormData({ ...formData, freight_kg: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tarif fret (XOF/kg)</label>
                <input
                  type="number"
                  value={formData.freight_rate_xof_kg}
                  onChange={e => setFormData({ ...formData, freight_rate_xof_kg: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Autres services</h3>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Carburant (litres)</label>
                <input
                  type="number"
                  value={formData.fuel_liters}
                  onChange={e => setFormData({ ...formData, fuel_liters: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tarif carb. (XOF/L)</label>
                <input
                  type="number"
                  value={formData.fuel_rate_xof_liter}
                  onChange={e => setFormData({ ...formData, fuel_rate_xof_liter: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Heures sup.</label>
                <input
                  type="number"
                  value={formData.overtime_hours}
                  onChange={e => setFormData({ ...formData, overtime_hours: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tarif h.sup (XOF/h)</label>
                <input
                  type="number"
                  value={formData.overtime_rate_xof_hour}
                  onChange={e => setFormData({ ...formData, overtime_rate_xof_hour: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.include_lighting_arr}
                    onChange={e => setFormData({ ...formData, include_lighting_arr: e.target.checked })}
                  />
                  Balisage ARR
                </label>
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.include_lighting_dep}
                    onChange={e => setFormData({ ...formData, include_lighting_dep: e.target.checked })}
                  />
                  Balisage DEP
                </label>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Notes additionnelles..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={recalculate} style={{ ...buttonStyle, backgroundColor: '#3b82f6' }}>
              🔄 Recalculer
            </button>
            <button onClick={saveInvoice} disabled={saving} style={{ ...buttonStyle, backgroundColor: '#10b981' }}>
              {saving ? 'Enregistrement...' : '💾 Enregistrer'}
            </button>
            {mode === 'edit' && status === 'DRAFT' && (
              <button onClick={() => updateStatus('ISSUED')} style={{ ...buttonStyle, backgroundColor: '#3b82f6' }}>
                ✓ Émettre
              </button>
            )}
            {mode === 'edit' && status === 'ISSUED' && (
              <button onClick={() => updateStatus('PAID')} style={{ ...buttonStyle, backgroundColor: '#10b981' }}>
                💰 Marquer payé
              </button>
            )}
            {mode === 'edit' && (status === 'DRAFT' || status === 'ISSUED') && (
              <button onClick={() => updateStatus('CANCELED')} style={{ ...buttonStyle, backgroundColor: '#ef4444' }}>
                ✕ Annuler
              </button>
            )}
            {mode === 'edit' && (
              <button onClick={deleteInvoice} style={{ ...buttonStyle, backgroundColor: '#dc2626' }}>
                🗑️ Supprimer
              </button>
            )}
          </div>
        </div>

        <div>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Aperçu de la facture N° {invoiceNumber}</h3>

            {items.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Cliquez sur "Recalculer" pour générer les lignes
              </div>
            ) : (
              <div>
                {(['AERO', 'ESC', 'SURETE', 'OTHER'] as const).map(group => {
                  const groupItems = items.filter(item => item.item_group === group)
                  if (groupItems.length === 0) return null

                  return (
                    <div key={group} style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        padding: '8px 12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {getGroupLabel(group)}
                      </h4>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={previewThStyle}>Libellé</th>
                            <th style={{ ...previewThStyle, textAlign: 'right' }}>Qté</th>
                            <th style={{ ...previewThStyle, textAlign: 'right' }}>P.U.</th>
                            <th style={{ ...previewThStyle, textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                              <td style={previewTdStyle}>{item.label}</td>
                              <td style={{ ...previewTdStyle, textAlign: 'right' }}>{item.qty}</td>
                              <td style={{ ...previewTdStyle, textAlign: 'right' }}>
                                {Math.round(item.unit_price_xof).toLocaleString()}
                              </td>
                              <td style={{ ...previewTdStyle, textAlign: 'right', fontWeight: 600 }}>
                                {Math.round(item.total_xof).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #d1d5db', backgroundColor: '#f9fafb' }}>
                            <td colSpan={3} style={{ ...previewTdStyle, fontWeight: 600 }}>
                              Sous-total {getGroupLabel(group)}
                            </td>
                            <td style={{ ...previewTdStyle, textAlign: 'right', fontWeight: 600 }}>
                              {Math.round(groupTotals[group]).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                })}

                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                    TOTAL GÉNÉRAL: {formatXOF(grandTotal)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {ToastComponent}
    </Layout>
  )
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT': return 'Brouillon'
    case 'ISSUED': return 'Émise'
    case 'PAID': return 'Payée'
    case 'CANCELED': return 'Annulée'
    default: return status
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'DRAFT': return { backgroundColor: '#f3f4f6', color: '#1f2937' }
    case 'ISSUED': return { backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'PAID': return { backgroundColor: '#d1fae5', color: '#065f46' }
    case 'CANCELED': return { backgroundColor: '#fee2e2', color: '#991b1b' }
    default: return { backgroundColor: '#f3f4f6', color: '#1f2937' }
  }
}

function getGroupLabel(group: string) {
  switch (group) {
    case 'AERO': return 'Redevances Aéronautiques'
    case 'ESC': return 'Assistance en Escales'
    case 'SURETE': return 'Sûreté'
    case 'OTHER': return 'Autres Services'
    default: return group
  }
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

const previewThStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase'
}

const previewTdStyle: React.CSSProperties = {
  padding: '8px',
  fontSize: '12px'
}
