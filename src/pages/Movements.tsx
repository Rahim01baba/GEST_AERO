import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, AircraftMovement, logAudit } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { MovementModal } from '../components/MovementModal'
import * as XLSX from 'xlsx'

const STATUS_OPTIONS = [
  { value: 'Planned', label: 'Planifié', emoji: '📋' },
  { value: 'Approche', label: 'Approche', emoji: '✈️' },
  { value: 'Posé', label: 'Posé', emoji: '🟢' },
  { value: 'Enregistrement', label: 'Enreg.', emoji: '🧾' },
  { value: 'Décollé', label: 'Décollé', emoji: '🛫' },
  { value: 'Annulé', label: 'Annulé', emoji: '❌' },
  { value: 'Reporté', label: 'Reporté', emoji: '🔁' },
]

interface MovementWithStand extends AircraftMovement {
  stand_name?: string
}

interface ColumnDef {
  id: string
  label: string
  accessor: (m: MovementWithStand) => string | number
  width?: string
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'type', label: 'Type', accessor: (m) => m.movement_type === 'ARR' ? 'Arrivée' : 'Départ', width: '80px' },
  { id: 'rotation_id', label: 'Rotation ID', accessor: (m) => m.rotation_id ? m.rotation_id.substring(0, 8) : '-', width: '100px' },
  { id: 'is_invoiced', label: 'Facturé', accessor: (m) => m.is_invoiced ? 'Oui' : 'Non', width: '80px' },
  { id: 'flight_no_arr', label: 'Vol ARR', accessor: (m) => m.flight_no_arr || (m.movement_type === 'ARR' ? m.flight_number : '–'), width: '100px' },
  { id: 'flight_no_dep', label: 'Vol DEP', accessor: (m) => m.flight_no_dep || (m.movement_type === 'DEP' ? m.flight_number : '–'), width: '100px' },
  { id: 'airline_code', label: 'Compagnie', accessor: (m) => m.airline_code || '-', width: '100px' },
  { id: 'airline_name', label: 'Nom Compagnie', accessor: (m) => m.airline_name || '-', width: '150px' },
  { id: 'aircraft_type', label: 'Type Avion', accessor: (m) => m.aircraft_type, width: '100px' },
  { id: 'registration', label: 'Immatriculation', accessor: (m) => m.registration, width: '120px' },
  { id: 'origin_iata', label: 'Provenance', accessor: (m) => m.origin_iata || '-', width: '100px' },
  { id: 'destination_iata', label: 'Destination', accessor: (m) => m.destination_iata || '-', width: '100px' },
  { id: 'scheduled_time', label: 'Date/Heure', accessor: (m) => new Date(m.scheduled_time).toLocaleString('fr-FR'), width: '150px' },
  { id: 'actual_time', label: 'Heure Réelle', accessor: (m) => m.actual_time ? new Date(m.actual_time).toLocaleString('fr-FR') : '-', width: '150px' },
  { id: 'stand_name', label: 'Stand', accessor: (m) => m.stand_name || '-', width: '80px' },
  { id: 'status', label: 'Statut', accessor: (m) => m.status, width: '140px' },
  { id: 'traffic_type', label: 'Trafic', accessor: (m) => m.traffic_type || '-', width: '80px' },
  { id: 'mtow_kg', label: 'MTOW (kg)', accessor: (m) => m.mtow_kg ? m.mtow_kg.toString() : '-', width: '100px' },
  { id: 'pax_arr_full', label: 'PAX ARR Plein', accessor: (m) => m.pax_arr_full?.toString() || '0', width: '110px' },
  { id: 'pax_arr_half', label: 'PAX ARR Demi', accessor: (m) => m.pax_arr_half?.toString() || '0', width: '110px' },
  { id: 'pax_dep_full', label: 'PAX DEP Plein', accessor: (m) => m.pax_dep_full?.toString() || '0', width: '110px' },
  { id: 'pax_dep_half', label: 'PAX DEP Demi', accessor: (m) => m.pax_dep_half?.toString() || '0', width: '110px' },
  { id: 'pax_transit', label: 'PAX Transit', accessor: (m) => m.pax_transit?.toString() || '0', width: '110px' },
  { id: 'pax_connecting', label: 'PAX Correspondance', accessor: (m) => m.pax_connecting?.toString() || '0', width: '140px' },
  { id: 'mail_arr_kg', label: 'Courrier ARR (kg)', accessor: (m) => m.mail_arr_kg?.toString() || '0', width: '130px' },
  { id: 'mail_dep_kg', label: 'Courrier DEP (kg)', accessor: (m) => m.mail_dep_kg?.toString() || '0', width: '130px' },
  { id: 'freight_arr_kg', label: 'Fret ARR (kg)', accessor: (m) => m.freight_arr_kg?.toString() || '0', width: '120px' },
  { id: 'freight_dep_kg', label: 'Fret DEP (kg)', accessor: (m) => m.freight_dep_kg?.toString() || '0', width: '120px' },
  { id: 'remarks', label: 'Remarques', accessor: (m) => m.remarks || '-', width: '200px' },
]

export function Movements() {
  const { user, can, canViewAllAirports, getAssignedAirportId } = useAuth()
  const [movements, setMovements] = useState<MovementWithStand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterRegistration, setFilterRegistration] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMovementId, setEditMovementId] = useState<string | null>(null)
  const [selectedAirportId, setSelectedAirportId] = useState<string>('')
  const [airports, setAirports] = useState<Array<{ id: string; name: string; iata_code: string }>>([])
  const { showToast, ToastComponent } = useToast()
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map(c => c.id))
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (user) {
        await loadUserPreferences()
      }

      if (canViewAllAirports()) {
        loadAirports()
      } else {
        const airportId = user?.airport_id || await getAssignedAirportId()
        if (airportId) {
          setSelectedAirportId(airportId)
        }
      }
    }
    init()
  }, [user])

  const loadUserPreferences = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data) {
      if (data.movements_column_order && Array.isArray(data.movements_column_order) && data.movements_column_order.length > 0) {
        setColumnOrder(data.movements_column_order)
      }
      if (data.filter_start_date) {
        setFilterStartDate(data.filter_start_date)
      } else {
        setFilterStartDate(new Date().toISOString().split('T')[0])
      }
      if (data.filter_end_date) {
        setFilterEndDate(data.filter_end_date)
      } else {
        setFilterEndDate(new Date().toISOString().split('T')[0])
      }
    } else {
      const today = new Date().toISOString().split('T')[0]
      setFilterStartDate(today)
      setFilterEndDate(today)
    }

    setPreferencesLoaded(true)
  }

  const saveUserPreferences = async () => {
    if (!user) return

    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const prefs = {
      user_id: user.id,
      movements_column_order: columnOrder,
      filter_start_date: filterStartDate,
      filter_end_date: filterEndDate,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      await supabase
        .from('user_preferences')
        .update(prefs)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('user_preferences')
        .insert(prefs)
    }
  }

  useEffect(() => {
    if (preferencesLoaded && user) {
      saveUserPreferences()
    }
  }, [columnOrder, filterStartDate, filterEndDate])

  const loadAirports = async () => {
    const { data } = await supabase
      .from('airports')
      .select('id, name, iata_code')
      .order('name')
    if (data) {
      setAirports(data)
      if (data.length > 0 && !selectedAirportId) {
        setSelectedAirportId(data[0].id)
      }
    }
  }

  useEffect(() => {
    if (selectedAirportId && preferencesLoaded) {
      loadMovements()
    }
  }, [user, selectedAirportId, filterStartDate, filterEndDate, filterRegistration, filterType, filterStatus, preferencesLoaded])

  const loadMovements = async () => {
    if (!user || !selectedAirportId) return

    setLoading(true)

    let query = supabase
      .from('aircraft_movements')
      .select(`
        *,
        stands!aircraft_movements_stand_id_fkey(name)
      `)
      .eq('airport_id', selectedAirportId)
      .order('scheduled_time', { ascending: true })

    if (filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(filterEndDate)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('scheduled_time', startDate.toISOString()).lte('scheduled_time', endDate.toISOString())
    }

    if (filterRegistration) {
      query = query.ilike('registration', `%${filterRegistration}%`)
    }

    if (filterType) {
      query = query.eq('movement_type', filterType)
    }

    if (filterStatus) {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query

    if (error) {
      showToast(`Erreur chargement: ${error.message || 'Erreur inconnue'}`, 'error')
      setMovements([])
    } else {
      const movementsWithStands = (data || []).map((m: any) => ({
        ...m,
        stand_name: m.stands?.name || null
      }))
      setMovements(movementsWithStands)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const actualTime = status === 'Posé' || status === 'Décollé' ? new Date().toISOString() : null

    const { error } = await supabase
      .from('aircraft_movements')
      .update({ status, actual_time: actualTime })
      .eq('id', id)

    if (error) {
      showToast('Failed to update status', 'error')
    } else {
      showToast(`Status updated to ${status}`, 'success')
      await logAudit(`Update movement status to ${status}`, 'aircraft_movements', id)
      loadMovements()
    }
  }

  const exportExcel = () => {
    const orderedColumns = columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(c => c !== undefined) as ColumnDef[]

    const headers = orderedColumns.map(col => col.label)

    const rows = movements.map(m => {
      return orderedColumns.map(col => col.accessor(m))
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    const colWidths = orderedColumns.map(() => ({ wch: 15 }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements')

    XLSX.writeFile(wb, `movements_${new Date().toISOString().split('T')[0]}_${selectedAirportId}.xlsx`)

    showToast('Export Excel terminé', 'success')
  }

  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0]
    setFilterStartDate(today)
    setFilterEndDate(today)
    setFilterRegistration('')
    setFilterType('')
    setFilterStatus('')
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId)
  }

  const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumnId) return

    const newOrder = [...columnOrder]
    const draggedIndex = newOrder.indexOf(draggedColumn)
    const targetIndex = newOrder.indexOf(targetColumnId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

  const resetColumnOrder = () => {
    setColumnOrder(ALL_COLUMNS.map(c => c.id))
    showToast('Ordre des colonnes réinitialisé', 'success')
  }

  const orderedColumns = columnOrder
    .map(id => ALL_COLUMNS.find(c => c.id === id))
    .filter(c => c !== undefined) as ColumnDef[]

  return (
    <Layout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#1a1a1a' }}>
              Aircraft Movements
            </h1>
            {canViewAllAirports() && airports.length > 0 && (
              <select
                value={selectedAirportId}
                onChange={(e) => setSelectedAirportId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {airports.map(airport => (
                  <option key={airport.id} value={airport.id}>
                    {airport.iata_code} - {airport.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={resetColumnOrder}
              style={{...buttonStyle, backgroundColor: '#6b7280'}}
              title="Réinitialiser l'ordre des colonnes"
            >
              🔄 Ordre colonnes
            </button>
            {can('create_movements') && (
              <button
                onClick={() => {
                  setEditMovementId(null)
                  setIsModalOpen(true)
                }}
                style={{...buttonStyle, backgroundColor: '#3b82f6'}}
              >
                + Créer
              </button>
            )}
            {can('export_csv') && (
              <button onClick={exportExcel} style={{...buttonStyle, backgroundColor: '#10b981'}}>
                📊 Export Excel
              </button>
            )}
          </div>
        </div>

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
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={labelStyle}>Date de début</label>
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
                value={filterRegistration}
                onChange={(e) => setFilterRegistration(e.target.value)}
                placeholder="Ex: N12345"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type de mouvement</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                <option value="">Tous</option>
                <option value="ARR">Arrivée</option>
                <option value="DEP">Départ</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="">Tous</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={clearFilters}
              style={{ ...buttonStyle, backgroundColor: '#6b7280' }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: '#eff6ff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#1e40af',
          border: '1px solid #bfdbfe'
        }}>
          💡 <strong>Astuce:</strong> Glissez-déposez les en-têtes de colonnes pour réorganiser l'ordre. Votre configuration sera sauvegardée automatiquement.
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: '1px solid #f3f4f6'
        }}>
          {loading ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              fontSize: '16px',
              color: '#666'
            }}>
              Loading movements...
            </div>
          ) : movements.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#666',
              fontSize: '15px'
            }}>
              Aucun mouvement trouvé pour les critères sélectionnés
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    {orderedColumns.slice(0, 3).map((column) => (
                      <th
                        key={column.id}
                        draggable
                        onDragStart={() => handleDragStart(column.id)}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          ...thStyle,
                          cursor: 'move',
                          minWidth: column.width,
                          backgroundColor: draggedColumn === column.id ? '#dbeafe' : '#f9fafb',
                          userSelect: 'none'
                        }}
                        title="Glisser pour réorganiser"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th style={thStyle}>Actions</th>
                    {orderedColumns.slice(3).map((column) => (
                      <th
                        key={column.id}
                        draggable
                        onDragStart={() => handleDragStart(column.id)}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          ...thStyle,
                          cursor: 'move',
                          minWidth: column.width,
                          backgroundColor: draggedColumn === column.id ? '#dbeafe' : '#f9fafb',
                          userSelect: 'none'
                        }}
                        title="Glisser pour réorganiser"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} style={{
                      borderTop: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}>
                      {orderedColumns.slice(0, 3).map((column) => {
                        if (column.id === 'status') {
                          return (
                            <td key={column.id} style={tdStyle}>
                              <select
                                value={movement.status}
                                onChange={(e) => updateStatus(movement.id, e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '5px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  minWidth: '140px',
                                  ...getStatusStyle(movement.status)
                                }}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.emoji} {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )
                        }

                        if (column.id === 'type') {
                          return (
                            <td key={column.id} style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{ fontSize: '18px' }}>
                                {movement.movement_type === 'ARR' ? '🛬' : '🛫'}
                              </span>
                            </td>
                          )
                        }

                        if (column.id === 'is_invoiced') {
                          return (
                            <td key={column.id} style={tdStyle}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: movement.is_invoiced ? '#d1fae5' : '#fee2e2',
                                color: movement.is_invoiced ? '#065f46' : '#991b1b'
                              }}>
                                {movement.is_invoiced ? 'OUI' : 'NON'}
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td key={column.id} style={tdStyle}>
                            {column.accessor(movement)}
                          </td>
                        )
                      })}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setEditMovementId(movement.id)
                            setIsModalOpen(true)
                          }}
                          disabled={movement.is_invoiced}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: movement.is_invoiced ? '#d1d5db' : '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '5px',
                            cursor: movement.is_invoiced ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: movement.is_invoiced ? 0.5 : 1
                          }}
                          title={movement.is_invoiced ? "Mouvement facturé - modification impossible" : "Éditer"}
                        >
                          ✏️
                        </button>
                      </td>
                      {orderedColumns.slice(3).map((column) => {
                        if (column.id === 'status') {
                          return (
                            <td key={column.id} style={tdStyle}>
                              <select
                                value={movement.status}
                                onChange={(e) => updateStatus(movement.id, e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '5px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  minWidth: '140px',
                                  ...getStatusStyle(movement.status)
                                }}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.emoji} {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )
                        }

                        if (column.id === 'type') {
                          return (
                            <td key={column.id} style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{ fontSize: '18px' }}>
                                {movement.movement_type === 'ARR' ? '🛬' : '🛫'}
                              </span>
                            </td>
                          )
                        }

                        if (column.id === 'is_invoiced') {
                          return (
                            <td key={column.id} style={tdStyle}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: movement.is_invoiced ? '#d1fae5' : '#fee2e2',
                                color: movement.is_invoiced ? '#065f46' : '#991b1b'
                              }}>
                                {movement.is_invoiced ? 'OUI' : 'NON'}
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td key={column.id} style={tdStyle}>
                            {column.accessor(movement)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'right'
        }}>
          {movements.length} mouvement(s) affiché(s) • {orderedColumns.length} colonnes visibles
        </div>
      </div>
      {ToastComponent}
      <MovementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditMovementId(null)
        }}
        onSuccess={() => {
          loadMovements()
          setEditMovementId(null)
        }}
        airportId={selectedAirportId}
        editMovementId={editMovementId}
      />
    </Layout>
  )
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'Planned':
      return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' }
    case 'Approche':
      return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }
    case 'Posé':
      return { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }
    case 'Enregistrement':
      return { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#a5b4fc' }
    case 'Décollé':
      return { backgroundColor: '#f3e8ff', color: '#6b21a8', borderColor: '#c084fc' }
    case 'Annulé':
      return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }
    case 'Reporté':
      return { backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#fcd34d' }
    default:
      return { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' }
  }
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  transition: 'border-color 0.2s'
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  transition: 'border-color 0.2s'
}

const thStyle: React.CSSProperties = {
  padding: '14px 12px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap'
}

const tdStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '13px',
  color: '#1f2937',
  whiteSpace: 'nowrap'
}
