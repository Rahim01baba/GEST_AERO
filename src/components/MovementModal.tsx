import { useState, useEffect } from 'react'
import { supabase, logAudit } from '../lib/supabase'
import { useToast } from './Toast'

interface MovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  airportId: string
  editMovementId?: string | null
}

interface AircraftRegistryData {
  mtow_kg: number | null
  airline_code: string | null
  airline_name: string | null
  aircraft_type: string | null
}

export function MovementModal({ isOpen, onClose, onSuccess, airportId, editMovementId }: MovementModalProps) {
  const { showToast } = useToast()

  const [flightNoArr, setFlightNoArr] = useState('')
  const [flightNoDep, setFlightNoDep] = useState('')
  const [registration, setRegistration] = useState('')
  const [aircraftType, setAircraftType] = useState('')
  const [mtow, setMtow] = useState('')
  const [airlineCode, setAirlineCode] = useState('')
  const [airlineName, setAirlineName] = useState('')
  const [standId, setStandId] = useState('')
  const [stands, setStands] = useState<Array<{id: string; name: string}>>([])

  const [createRotation, setCreateRotation] = useState(true)

  const [arrDate, setArrDate] = useState('')
  const [arrTime, setArrTime] = useState('')
  const [originIata, setOriginIata] = useState('')
  const [paxArrFull, setPaxArrFull] = useState('0')
  const [paxArrHalf, setPaxArrHalf] = useState('0')
  const [mailArrKg, setMailArrKg] = useState('0')
  const [freightArrKg, setFreightArrKg] = useState('0')

  const [depDate, setDepDate] = useState('')
  const [depTime, setDepTime] = useState('')
  const [destinationIata, setDestinationIata] = useState('')
  const [paxDepFull, setPaxDepFull] = useState('0')
  const [paxDepHalf, setPaxDepHalf] = useState('0')
  const [paxTransit, setPaxTransit] = useState('0')
  const [mailDepKg, setMailDepKg] = useState('0')
  const [freightDepKg, setFreightDepKg] = useState('0')

  const [autoFilled, setAutoFilled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rotationId, setRotationId] = useState<string | null>(null)
  const [arrMovementId, setArrMovementId] = useState<string | null>(null)
  const [depMovementId, setDepMovementId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const isEditMode = !!editMovementId

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', userData.user.id)
          .single()
        setIsAdmin(userProfile?.role === 'ADMIN')
      }
    }
    checkUserRole()
  }, [])

  useEffect(() => {
    if (isOpen && airportId) {
      loadStands()
      if (editMovementId) {
        loadMovementForEdit(editMovementId)
      }
    } else if (!isOpen) {
      resetForm()
    }
  }, [isOpen, editMovementId, airportId])

  const loadStands = async () => {
    const { data } = await supabase
      .from('stands')
      .select('id, name')
      .eq('airport_id', airportId)
      .order('name')
    if (data) setStands(data)
  }

  const loadMovementForEdit = async (id: string) => {
    const { data: movement, error } = await supabase
      .from('aircraft_movements')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !movement) {
      showToast('Erreur de chargement', 'error')
      return
    }

    setRegistration(movement.registration)
    setAircraftType(movement.aircraft_type)
    setMtow(movement.mtow_kg?.toString() || '')
    setAirlineCode(movement.airline_code || '')
    setAirlineName(movement.airline_name || '')
    setStandId(movement.stand_id || '')
    setRotationId(movement.rotation_id)
    setIsLocked(movement.is_locked || false)

    if (movement.movement_type === 'ARR') {
      setArrMovementId(movement.id)
      setFlightNoArr(movement.flight_no_arr || '')
      const arrDateTime = new Date(movement.scheduled_time)
      setArrDate(arrDateTime.toISOString().split('T')[0])
      setArrTime(arrDateTime.toTimeString().slice(0, 5))
      setOriginIata(movement.origin_iata || '')
      setPaxArrFull(movement.pax_arr_full?.toString() || '0')
      setPaxArrHalf(movement.pax_arr_half?.toString() || '0')
      setMailArrKg(movement.mail_arr_kg?.toString() || '0')
      setFreightArrKg(movement.freight_arr_kg?.toString() || '0')
    } else {
      setDepMovementId(movement.id)
      setFlightNoDep(movement.flight_no_dep || '')
      const depDateTime = new Date(movement.scheduled_time)
      setDepDate(depDateTime.toISOString().split('T')[0])
      setDepTime(depDateTime.toTimeString().slice(0, 5))
      setDestinationIata(movement.destination_iata || '')
      setPaxDepFull(movement.pax_dep_full?.toString() || '0')
      setPaxDepHalf(movement.pax_dep_half?.toString() || '0')
      setPaxTransit(movement.pax_transit?.toString() || '0')
      setMailDepKg(movement.mail_dep_kg?.toString() || '0')
      setFreightDepKg(movement.freight_dep_kg?.toString() || '0')
    }

    if (movement.rotation_id) {
      const { data: linkedMovement } = await supabase
        .from('aircraft_movements')
        .select('*')
        .eq('rotation_id', movement.rotation_id)
        .neq('id', movement.id)
        .maybeSingle()

      if (linkedMovement) {
        setCreateRotation(true)
        if (linkedMovement.movement_type === 'ARR') {
          setArrMovementId(linkedMovement.id)
          setFlightNoArr(linkedMovement.flight_no_arr || '')
          const arrDateTime = new Date(linkedMovement.scheduled_time)
          setArrDate(arrDateTime.toISOString().split('T')[0])
          setArrTime(arrDateTime.toTimeString().slice(0, 5))
          setOriginIata(linkedMovement.origin_iata || '')
          setPaxArrFull(linkedMovement.pax_arr_full?.toString() || '0')
          setPaxArrHalf(linkedMovement.pax_arr_half?.toString() || '0')
          setMailArrKg(linkedMovement.mail_arr_kg?.toString() || '0')
          setFreightArrKg(linkedMovement.freight_arr_kg?.toString() || '0')
        } else {
          setDepMovementId(linkedMovement.id)
          setFlightNoDep(linkedMovement.flight_no_dep || '')
          const depDateTime = new Date(linkedMovement.scheduled_time)
          setDepDate(depDateTime.toISOString().split('T')[0])
          setDepTime(depDateTime.toTimeString().slice(0, 5))
          setDestinationIata(linkedMovement.destination_iata || '')
          setPaxDepFull(linkedMovement.pax_dep_full?.toString() || '0')
          setPaxDepHalf(linkedMovement.pax_dep_half?.toString() || '0')
          setPaxTransit(linkedMovement.pax_transit?.toString() || '0')
          setMailDepKg(linkedMovement.mail_dep_kg?.toString() || '0')
          setFreightDepKg(linkedMovement.freight_dep_kg?.toString() || '0')
        }
      }
    }
  }

  const resetForm = () => {
    setFlightNoArr('')
    setFlightNoDep('')
    setRegistration('')
    setAircraftType('')
    setMtow('')
    setAirlineCode('')
    setAirlineName('')
    setStandId('')
    setCreateRotation(true)
    setArrDate('')
    setArrTime('')
    setOriginIata('')
    setPaxArrFull('0')
    setPaxArrHalf('0')
    setMailArrKg('0')
    setFreightArrKg('0')
    setDepDate('')
    setDepTime('')
    setDestinationIata('')
    setPaxDepFull('0')
    setPaxDepHalf('0')
    setPaxTransit('0')
    setMailDepKg('0')
    setFreightDepKg('0')
    setAutoFilled(false)
    setError('')
    setRotationId(null)
    setArrMovementId(null)
    setDepMovementId(null)
    setShowDeleteConfirm(false)
  }

  const handleRegistrationBlur = async () => {
    if (!registration.trim()) return

    const upperReg = registration.toUpperCase()
    setRegistration(upperReg)

    console.log('🔍 Looking up aircraft:', upperReg)

    const { data, error } = await supabase.rpc('lookup_aircraft_by_registration', {
      p_registration: upperReg
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      showToast('Erreur lors de la recherche de l\'avion', 'error')
      return
    }

    console.log('📊 RPC Response:', data)

    if (data && data.length > 0) {
      const aircraftData: AircraftRegistryData = data[0]
      console.log('✅ Aircraft found:', aircraftData)

      if (aircraftData.mtow_kg) setMtow(aircraftData.mtow_kg.toString())
      if (aircraftData.aircraft_type) setAircraftType(aircraftData.aircraft_type)
      if (aircraftData.airline_code) setAirlineCode(aircraftData.airline_code)
      if (aircraftData.airline_name) setAirlineName(aircraftData.airline_name)

      setAutoFilled(true)
      showToast('Données aéronef pré-remplies depuis le registre', 'success')
    } else {
      console.log('ℹ️ No aircraft found for:', upperReg)
    }
  }

  const validateDates = (): boolean => {
    if (createRotation && arrDate && arrTime && depDate && depTime) {
      const arrDateTime = new Date(`${arrDate}T${arrTime}`)
      const depDateTime = new Date(`${depDate}T${depTime}`)

      if (arrDateTime >= depDateTime) {
        setError('La date ARR doit être ≤ à la date DEP.')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateDates()) return

    if (!createRotation && !arrDate && !depDate) {
      setError('Veuillez saisir au moins une date')
      return
    }

    setLoading(true)

    try {
      const useRotationId = createRotation ? (rotationId || crypto.randomUUID()) : null

      if (arrDate && arrTime) {
        const arrDateTime = new Date(`${arrDate}T${arrTime}`).toISOString()

        const arrData = {
          airport_id: airportId,
          flight_number: flightNoArr || `ARR-${registration}`,
          flight_no_arr: flightNoArr || null,
          aircraft_type: aircraftType,
          registration: registration.toUpperCase(),
          movement_type: 'ARR' as const,
          scheduled_time: arrDateTime,
          status: 'Planned' as const,
          billable: true,
          mtow_kg: mtow ? parseInt(mtow) : null,
          airline_code: airlineCode || null,
          airline_name: airlineName || null,
          origin_iata: originIata || null,
          rotation_id: useRotationId,
          stand_id: (standId && standId.trim() !== '') ? standId : null,
          pax_arr_full: parseInt(paxArrFull) || 0,
          pax_arr_half: parseInt(paxArrHalf) || 0,
          pax_dep_full: 0,
          pax_dep_half: 0,
          pax_transit: 0,
          mail_arr_kg: parseFloat(mailArrKg) || 0,
          mail_dep_kg: 0,
          freight_arr_kg: parseFloat(freightArrKg) || 0,
          freight_dep_kg: 0
        }

        if (isEditMode && arrMovementId) {
          const { error: arrError } = await supabase
            .from('aircraft_movements')
            .update(arrData)
            .eq('id', arrMovementId)

          if (arrError) throw arrError
          await logAudit('Update movement ARR', 'aircraft_movements', arrMovementId)
        } else {
          const { error: arrError } = await supabase
            .from('aircraft_movements')
            .insert(arrData)

          if (arrError) throw arrError
          await logAudit('Create movement ARR', 'aircraft_movements', undefined)
        }
      }

      if (depDate && depTime) {
        const depDateTime = new Date(`${depDate}T${depTime}`).toISOString()

        const depData = {
          airport_id: airportId,
          flight_number: flightNoDep || `DEP-${registration}`,
          flight_no_dep: flightNoDep || null,
          aircraft_type: aircraftType,
          registration: registration.toUpperCase(),
          movement_type: 'DEP' as const,
          scheduled_time: depDateTime,
          status: 'Planned' as const,
          billable: true,
          mtow_kg: mtow ? parseInt(mtow) : null,
          airline_code: airlineCode || null,
          airline_name: airlineName || null,
          destination_iata: destinationIata || null,
          rotation_id: useRotationId,
          stand_id: (standId && standId.trim() !== '') ? standId : null,
          pax_arr_full: 0,
          pax_arr_half: 0,
          pax_dep_full: parseInt(paxDepFull) || 0,
          pax_dep_half: parseInt(paxDepHalf) || 0,
          pax_transit: parseInt(paxTransit) || 0,
          mail_arr_kg: 0,
          mail_dep_kg: parseFloat(mailDepKg) || 0,
          freight_arr_kg: 0,
          freight_dep_kg: parseFloat(freightDepKg) || 0
        }

        if (isEditMode && depMovementId) {
          const { error: depError } = await supabase
            .from('aircraft_movements')
            .update(depData)
            .eq('id', depMovementId)

          if (depError) throw depError
          await logAudit('Update movement DEP', 'aircraft_movements', depMovementId)
        } else {
          const { error: depError } = await supabase
            .from('aircraft_movements')
            .insert(depData)

          if (depError) throw depError
          await logAudit('Create movement DEP', 'aircraft_movements', undefined)
        }
      }

      showToast(isEditMode ? 'Mis à jour avec succès' : 'Créé avec succès', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde')
      showToast('Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isEditMode) return

    setLoading(true)
    try {
      const idsToDelete = []
      if (arrMovementId) idsToDelete.push(arrMovementId)
      if (depMovementId) idsToDelete.push(depMovementId)

      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from('aircraft_movements')
          .delete()
          .in('id', idsToDelete)

        if (error) throw error

        for (const id of idsToDelete) {
          await logAudit('Delete movement', 'aircraft_movements', id)
        }

        showToast('Supprimé avec succès', 'success')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de suppression')
      showToast('Erreur', 'error')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEditMode ? 'Éditer' : 'Créer'}
            {isEditMode && isLocked && (
              <span style={{
                padding: '4px 10px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #fca5a5'
              }}>
                {isAdmin ? '🔒 FACTURÉ (Admin edit)' : '🔒 FACTURÉ (Lecture seule)'}
              </span>
            )}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={formBodyStyle}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Commun</h3>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Vol ARR</label>
                  <input
                    type="text"
                    value={flightNoArr}
                    onChange={(e) => setFlightNoArr(e.target.value)}
                    placeholder="AF1234"
                    style={compactInputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Vol DEP</label>
                  <input
                    type="text"
                    value={flightNoDep}
                    onChange={(e) => setFlightNoDep(e.target.value)}
                    placeholder="AF5678"
                    style={compactInputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Immat *
                    {autoFilled && <span style={autoTagStyle}>auto</span>}
                  </label>
                  <input
                    type="text"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    onBlur={handleRegistrationBlur}
                    placeholder="F-HBNA"
                    required
                    style={{...compactInputStyle, borderColor: !registration.trim() ? '#ef4444' : '#d1d5db', borderWidth: !registration.trim() ? '2px' : '1px'}}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Parking</label>
                  <select
                    value={standId}
                    onChange={(e) => setStandId(e.target.value)}
                    style={compactInputStyle}
                  >
                    <option value="">Non assigné</option>
                    {stands.map(stand => (
                      <option key={stand.id} value={stand.id}>{stand.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Type *
                    {autoFilled && <span style={autoTagStyle}>auto</span>}
                  </label>
                  <input
                    type="text"
                    value={aircraftType}
                    onChange={(e) => setAircraftType(e.target.value)}
                    placeholder="A320"
                    required
                    style={{...compactInputStyle, borderColor: !aircraftType.trim() ? '#ef4444' : '#d1d5db', borderWidth: !aircraftType.trim() ? '2px' : '1px'}}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    MTOW
                    {autoFilled && <span style={autoTagStyle}>auto</span>}
                  </label>
                  <input
                    type="number"
                    value={mtow}
                    onChange={(e) => setMtow(e.target.value)}
                    placeholder="73500"
                    style={compactInputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Cie
                    {autoFilled && <span style={autoTagStyle}>auto</span>}
                  </label>
                  <input
                    type="text"
                    value={airlineCode}
                    onChange={(e) => setAirlineCode(e.target.value)}
                    placeholder="AF"
                    style={compactInputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Nom
                    {autoFilled && <span style={autoTagStyle}>auto</span>}
                  </label>
                  <input
                    type="text"
                    value={airlineName}
                    onChange={(e) => setAirlineName(e.target.value)}
                    placeholder="Air France"
                    style={compactInputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={checkboxContainerStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={createRotation}
                  onChange={(e) => setCreateRotation(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '13px' }}>
                  Rotation (ARR + DEP)
                </span>
              </label>
              {createRotation && (
                <div style={infoBannerStyle}>
                  ℹ️ Rotation liée par un même numéro
                </div>
              )}
            </div>

            <div style={dualPanelStyle}>
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>🛬 Arrivée</h3>

                <div style={rowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Date</label>
                    <input
                      type="date"
                      value={arrDate}
                      onChange={(e) => setArrDate(e.target.value)}
                      style={compactInputStyle}
                    />
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Heure</label>
                    <input
                      type="time"
                      value={arrTime}
                      onChange={(e) => setArrTime(e.target.value)}
                      style={compactInputStyle}
                    />
                  </div>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Origine</label>
                  <input
                    type="text"
                    value={originIata}
                    onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
                    placeholder="CDG"
                    maxLength={3}
                    style={compactInputStyle}
                  />
                </div>

                <div style={subSectionStyle}>
                  <h4 style={subTitleStyle}>PAX</h4>
                  <div style={rowStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle} title="Plein tarif">Plein</label>
                      <input
                        type="number"
                        value={paxArrFull}
                        onChange={(e) => setPaxArrFull(e.target.value)}
                        min="0"
                        style={compactInputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle} title="Demi tarif">Demi</label>
                      <input
                        type="number"
                        value={paxArrHalf}
                        onChange={(e) => setPaxArrHalf(e.target.value)}
                        min="0"
                        style={compactInputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div style={subSectionStyle}>
                  <h4 style={subTitleStyle}>Trafic</h4>
                  <div style={rowStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Mail (kg)</label>
                      <input
                        type="number"
                        value={mailArrKg}
                        onChange={(e) => setMailArrKg(e.target.value)}
                        min="0"
                        step="0.1"
                        style={compactInputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Fret (kg)</label>
                      <input
                        type="number"
                        value={freightArrKg}
                        onChange={(e) => setFreightArrKg(e.target.value)}
                        min="0"
                        step="0.1"
                        style={compactInputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>🛫 Départ</h3>

                <div style={rowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Date</label>
                    <input
                      type="date"
                      value={depDate}
                      onChange={(e) => setDepDate(e.target.value)}
                      style={compactInputStyle}
                    />
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Heure</label>
                    <input
                      type="time"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                      style={compactInputStyle}
                    />
                  </div>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Dest.</label>
                  <input
                    type="text"
                    value={destinationIata}
                    onChange={(e) => setDestinationIata(e.target.value.toUpperCase())}
                    placeholder="LHR"
                    maxLength={3}
                    style={compactInputStyle}
                  />
                </div>

                <div style={subSectionStyle}>
                  <h4 style={subTitleStyle}>PAX</h4>
                  <div style={rowStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle} title="Plein tarif">Plein</label>
                      <input
                        type="number"
                        value={paxDepFull}
                        onChange={(e) => setPaxDepFull(e.target.value)}
                        min="0"
                        style={compactInputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle} title="Demi tarif">Demi</label>
                      <input
                        type="number"
                        value={paxDepHalf}
                        onChange={(e) => setPaxDepHalf(e.target.value)}
                        min="0"
                        style={compactInputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle} title="Transit">Trans.</label>
                      <input
                        type="number"
                        value={paxTransit}
                        onChange={(e) => setPaxTransit(e.target.value)}
                        min="0"
                        style={compactInputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div style={subSectionStyle}>
                  <h4 style={subTitleStyle}>Trafic</h4>
                  <div style={rowStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Mail (kg)</label>
                      <input
                        type="number"
                        value={mailDepKg}
                        onChange={(e) => setMailDepKg(e.target.value)}
                        min="0"
                        step="0.1"
                        style={compactInputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Fret (kg)</label>
                      <input
                        type="number"
                        value={freightDepKg}
                        onChange={(e) => setFreightDepKg(e.target.value)}
                        min="0"
                        step="0.1"
                        style={compactInputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={errorStyle}>
                ⚠️ {error}
              </div>
            )}
          </div>

          <div style={footerStyle}>
            <div>
              {isEditMode && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={deleteButtonStyle}
                    >
                      Supprimer
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#991b1b' }}>Confirmer ?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        style={deleteConfirmButtonStyle}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        style={cancelButtonStyle}
                      >
                        Non
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={cancelButtonStyle}>
                Annuler
              </button>
              <button type="submit" disabled={loading || (isLocked && !isAdmin)} style={{
                ...submitButtonStyle,
                opacity: (loading || (isLocked && !isAdmin)) ? 0.5 : 1,
                cursor: (loading || (isLocked && !isAdmin)) ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Enregistrement...' : (isLocked && !isAdmin) ? 'Verrouillé' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
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

const formBodyStyle: React.CSSProperties = {
  padding: '18px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px'
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  paddingBottom: '5px',
  borderBottom: '2px solid #e5e7eb'
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px'
}

const fieldStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
}

const compactInputStyle: React.CSSProperties = {
  padding: '6px 9px',
  border: '1px solid #d1d5db',
  borderRadius: '5px',
  fontSize: '13px'
}

const autoTagStyle: React.CSSProperties = {
  fontSize: '8px',
  fontWeight: 700,
  padding: '2px 4px',
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  borderRadius: '3px',
  textTransform: 'uppercase'
}

const checkboxContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  padding: '8px',
  backgroundColor: '#f9fafb',
  borderRadius: '5px',
  border: '1px solid #e5e7eb'
}

const infoBannerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  borderRadius: '5px',
  fontSize: '11px',
  border: '1px solid #93c5fd'
}

const dualPanelStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px'
}

const panelStyle: React.CSSProperties = {
  padding: '14px',
  backgroundColor: '#f9fafb',
  borderRadius: '7px',
  border: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 600,
  color: '#1f2937',
  paddingBottom: '6px',
  borderBottom: '1px solid #d1d5db'
}

const subSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
}

const subTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.3px'
}

const errorStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 500,
  border: '1px solid #fca5a5'
}

const footerStyle: React.CSSProperties = {
  padding: '14px 22px',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '7px 14px',
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: 'none',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
}

const submitButtonStyle: React.CSSProperties = {
  padding: '7px 14px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
}

const deleteButtonStyle: React.CSSProperties = {
  padding: '7px 14px',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
}

const deleteConfirmButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  backgroundColor: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer'
}
