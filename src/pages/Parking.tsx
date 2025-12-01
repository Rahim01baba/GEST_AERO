import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, Stand, logAudit } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { getStandGroupBadge } from '../lib/standUtils'

interface Movement {
  id: string
  flight_number: string
  flight_no_arr: string | null
  flight_no_dep: string | null
  aircraft_type: string
  registration: string
  movement_type: string
  scheduled_time: string
  actual_time: string | null
  status: string
  stand_id: string
  rotation_id: string | null
}

interface StandOccupancy {
  stand: Stand
  movements: Movement[]
  groupConflicts: Array<{ start: number; end: number; reason: string }>
}

export function Parking() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [standOccupancy, setStandOccupancy] = useState<StandOccupancy[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    loadParkingData()
  }, [user, selectedDate])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadParkingData()
      }, 60000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, selectedDate])

  const loadParkingData = async () => {
    if (!user) return

    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)

    let standsQuery = supabase
      .from('stands')
      .select('*')
      .order('group_priority, name')

    if (user.role !== 'ADMIN' && user.airport_id) {
      standsQuery = standsQuery.eq('airport_id', user.airport_id)
    }

    const { data: standsData, error: standsError } = await standsQuery

    if (standsError) {
      showToast('Failed to load stands', 'error')
      setLoading(false)
      return
    }

    let movementsQuery = supabase
      .from('aircraft_movements')
      .select('*')
      .not('stand_id', 'is', null)
      .gte('scheduled_time', dayStart.toISOString())
      .lte('scheduled_time', dayEnd.toISOString())
      .order('scheduled_time', { ascending: true })

    if (user.role !== 'ADMIN' && user.airport_id) {
      movementsQuery = movementsQuery.eq('airport_id', user.airport_id)
    }

    const { data: movementsData } = await movementsQuery

    const rotationMap = new Map<string, any>()
    movementsData?.forEach((movement: any) => {
      if (movement.rotation_id) {
        if (!rotationMap.has(movement.rotation_id)) {
          rotationMap.set(movement.rotation_id, { arr: null, dep: null })
        }
        const rotation = rotationMap.get(movement.rotation_id)!
        if (movement.movement_type === 'ARR') {
          rotation.arr = movement
        } else {
          rotation.dep = movement
        }
      }
    })

    const enrichedMovements = (movementsData || []).map((movement: any) => {
      if (movement.rotation_id) {
        const rotation = rotationMap.get(movement.rotation_id)
        if (rotation) {
          return {
            ...movement,
            flight_no_arr: rotation.arr?.flight_no_arr || rotation.arr?.flight_number || null,
            flight_no_dep: rotation.dep?.flight_no_dep || rotation.dep?.flight_number || null
          }
        }
      }
      return movement
    })

    const occupancyMap = new Map<string, Movement[]>()

    enrichedMovements.forEach((movement: any) => {
      if (!occupancyMap.has(movement.stand_id)) {
        occupancyMap.set(movement.stand_id, [])
      }
      occupancyMap.get(movement.stand_id)!.push(movement)
    })

    const groupMovementsMap = new Map<string, Movement[]>()
    standsData?.forEach(stand => {
      if (stand.group_key) {
        if (!groupMovementsMap.has(stand.group_key)) {
          groupMovementsMap.set(stand.group_key, [])
        }
        const standMovements = occupancyMap.get(stand.id) || []
        groupMovementsMap.get(stand.group_key)!.push(...standMovements)
      }
    })

    const occupancy: StandOccupancy[] = (standsData || []).map(stand => {
      const movements = occupancyMap.get(stand.id) || []
      const groupConflicts: Array<{ start: number; end: number; reason: string }> = []

      if (stand.group_key) {
        const groupStands = standsData.filter(s => s.group_key === stand.group_key && s.id !== stand.id)

        groupStands.forEach(otherStand => {
          const otherMovements = occupancyMap.get(otherStand.id) || []

          const isConflict =
            (stand.is_group_parent && !otherStand.is_group_parent) ||
            (!stand.is_group_parent && otherStand.is_group_parent)

          if (isConflict) {
            otherMovements.forEach(movement => {
              const arrTime = new Date(movement.scheduled_time)
              const depTime = movement.actual_time
                ? new Date(movement.actual_time)
                : new Date(arrTime.getTime() + 2 * 60 * 60 * 1000)

              const startHour = arrTime.getHours() + arrTime.getMinutes() / 60
              const endHour = depTime.getHours() + depTime.getMinutes() / 60

              groupConflicts.push({
                start: startHour,
                end: endHour,
                reason: stand.is_group_parent
                  ? `Child stand ${otherStand.name} occupied`
                  : `Parent stand ${otherStand.name} occupied`
              })
            })
          }
        })
      }

      return {
        stand,
        movements,
        groupConflicts
      }
    })

    setStandOccupancy(occupancy)
    setLoading(false)
  }

  const toggleBlockStand = async (standId: string, currentlyBlocked: boolean) => {
    if (user?.role !== 'ADMIN' && user?.role !== 'OPS') {
      showToast('You do not have permission to block/unblock stands', 'error')
      return
    }

    const { error } = await supabase
      .from('stands')
      .update({ is_blocked: !currentlyBlocked })
      .eq('id', standId)

    if (error) {
      showToast('Failed to update stand', 'error')
    } else {
      showToast(`Stand ${currentlyBlocked ? 'unblocked' : 'blocked'}`, 'success')
      await logAudit(currentlyBlocked ? 'Unblock stand' : 'Block stand', 'stands', standId)
      loadParkingData()
    }
  }

  const exportPlan = () => {
    window.print()
  }

  const canManageStands = user?.role === 'ADMIN' || user?.role === 'OPS'

  const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <Layout>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Date :
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                minWidth: '200px'
              }}
            />
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-refresh (60s)
            </label>
            <button onClick={exportPlan} style={{
              ...buttonStyle,
              backgroundColor: '#10b981'
            }}>
              📄 Imprimer le plan
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600, color: '#1a1a1a' }}>
              Plan d'Encombrement Journalier – Parking Stands
            </h1>
            <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
              Journée du {formattedDate}
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#A8D08D', borderRadius: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>🟩 Occupied</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#9DC3E6', borderRadius: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>🟦 Reserved</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#F4B084', borderRadius: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>🟥 Blocked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#FD7E14', borderRadius: '4px', opacity: 0.4, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.5) 5px, rgba(255,255,255,0.5) 10px)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>⚠️ Group Conflict</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>⬜ Free</span>
          </div>
        </div>

        {loading ? (
          <div style={{
            backgroundColor: 'white',
            padding: '60px',
            textAlign: 'center',
            borderRadius: '12px',
            fontSize: '16px',
            color: '#666'
          }}>
            Loading parking timeline...
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'auto',
            maxWidth: '100%'
          }}>
            <div style={{ minWidth: '1800px', padding: '16px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '150px repeat(24, 1fr)',
                gap: '0',
                position: 'sticky',
                top: 0,
                backgroundColor: '#f9fafb',
                zIndex: 10,
                padding: '12px 0',
                borderBottom: '2px solid #e5e7eb',
                marginBottom: '8px'
              }}>
                <div style={{
                  ...headerCellStyle,
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  Stand
                </div>
                {hours.map(hour => (
                  <div key={hour} style={headerCellStyle}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {standOccupancy.map((occupancy, idx) => {
                const groupBadge = getStandGroupBadge(occupancy.stand)
                return (
                  <div key={occupancy.stand.id}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '150px repeat(24, 1fr)',
                      gap: '0',
                      minHeight: '60px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      position: 'relative',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        ...standLabelStyle,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px' }}>
                            {occupancy.stand.name}
                          </span>
                          {groupBadge && (
                            <span style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              backgroundColor: groupBadge.color + '30',
                              color: groupBadge.color,
                              fontWeight: 700
                            }}>
                              {groupBadge.label}
                            </span>
                          )}
                        </div>
                        {canManageStands && (
                          <button
                            onClick={() => toggleBlockStand(occupancy.stand.id, occupancy.stand.is_blocked)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              backgroundColor: occupancy.stand.is_blocked ? '#10b981' : '#F4B084',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {occupancy.stand.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
                      </div>

                      <div style={{
                        gridColumn: '2 / -1',
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(24, 1fr)',
                        gap: '0'
                      }}>
                        {hours.map(hour => (
                          <div
                            key={hour}
                            style={{
                              borderRight: '1px solid #e5e7eb',
                              minHeight: '60px'
                            }}
                          />
                        ))}

                        {occupancy.stand.is_blocked && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '40px',
                            backgroundColor: '#F4B084',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '14px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 5
                          }}>
                            🟥 STAND BLOCKED
                          </div>
                        )}

                        {!occupancy.stand.is_blocked && occupancy.groupConflicts.map((conflict, cIdx) => {
                          const left = (conflict.start / 24) * 100
                          const width = ((conflict.end - conflict.start) / 24) * 100

                          return (
                            <div
                              key={`conflict-${cIdx}`}
                              title={conflict.reason}
                              style={{
                                position: 'absolute',
                                left: `${left}%`,
                                width: `${width}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: '40px',
                                backgroundColor: '#FD7E14',
                                opacity: 0.3,
                                borderRadius: '6px',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)',
                                border: '2px dashed #FD7E14',
                                zIndex: 1
                              }}
                            />
                          )
                        })}

                        {!occupancy.stand.is_blocked && occupancy.movements.map(movement => {
                          const arrTime = new Date(movement.scheduled_time)
                          const depTime = movement.actual_time
                            ? new Date(movement.actual_time)
                            : new Date(arrTime.getTime() + 2 * 60 * 60 * 1000)

                          const startHour = arrTime.getHours() + arrTime.getMinutes() / 60
                          const endHour = depTime.getHours() + depTime.getMinutes() / 60
                          const duration = endHour - startHour

                          const left = (startHour / 24) * 100
                          const width = (duration / 24) * 100

                          const isOccupied = movement.status === 'Posé' || movement.status === 'Arrived'
                          const bgColor = isOccupied ? '#A8D08D' : '#9DC3E6'

                          return (
                            <div
                              key={movement.id}
                              title={`${movement.flight_number} - ${movement.aircraft_type}\n${movement.registration}\n${arrTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → ${depTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\nStatus: ${movement.status}`}
                              style={{
                                position: 'absolute',
                                left: `${left}%`,
                                width: `${width}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: '40px',
                                backgroundColor: bgColor,
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '13px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                border: '2px solid rgba(255,255,255,0.3)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                padding: '0 8px',
                                zIndex: 3
                              }}
                            >
                              {movement.flight_no_arr || ''}{movement.flight_no_arr && movement.flight_no_dep ? '/' : ''}{movement.flight_no_dep || ''} {movement.aircraft_type}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {standOccupancy.length === 0 && (
                <div style={{
                  padding: '60px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '15px'
                }}>
                  No parking stands found
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{
          marginTop: '16px',
          fontSize: '13px',
          color: '#6b7280',
          textAlign: 'right'
        }}>
          {standOccupancy.length} stand(s) • {standOccupancy.reduce((sum, occ) => sum + occ.movements.length, 0)} mouvement(s)
        </div>
      </div>
      {ToastComponent}
    </Layout>
  )
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

const headerCellStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'center',
  fontSize: '11px',
  fontWeight: 600,
  color: '#374151',
  borderRight: '1px solid #e5e7eb'
}

const standLabelStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#1f2937',
  borderRight: '2px solid #e5e7eb',
  backgroundColor: '#f9fafb'
}
