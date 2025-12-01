import { supabase } from './supabase'

export interface StandSuggestion {
  stand_id: string
  stand_name: string
  group_key: string | null
  is_group_parent: boolean
  max_mtow_kg: number
  wingspan_max_m: number | null
  arc_letter_max: string | null
  available: boolean
  conflict_reason: string | null
  score: number
}

export async function suggestStands(
  airportId: string,
  mtow: number,
  arrTime: string,
  depTime: string | null,
  wingspan?: number
): Promise<StandSuggestion[]> {
  const actualDepTime = depTime || new Date(new Date(arrTime).getTime() + 2 * 60 * 60 * 1000).toISOString()

  const { data: stands, error } = await supabase
    .from('stands')
    .select('*')
    .eq('airport_id', airportId)
    .order('name')

  if (error || !stands) {
    return []
  }

  const suggestions: StandSuggestion[] = []

  for (const stand of stands) {
    if (stand.is_blocked) {
      suggestions.push({
        stand_id: stand.id,
        stand_name: stand.name,
        group_key: stand.group_key,
        is_group_parent: stand.is_group_parent,
        max_mtow_kg: stand.max_mtow_kg,
        wingspan_max_m: stand.wingspan_max_m,
        arc_letter_max: stand.arc_letter_max,
        available: false,
        conflict_reason: 'Stand is blocked',
        score: 0
      })
      continue
    }

    if (stand.max_mtow_kg < mtow) {
      suggestions.push({
        stand_id: stand.id,
        stand_name: stand.name,
        group_key: stand.group_key,
        is_group_parent: stand.is_group_parent,
        max_mtow_kg: stand.max_mtow_kg,
        wingspan_max_m: stand.wingspan_max_m,
        arc_letter_max: stand.arc_letter_max,
        available: false,
        conflict_reason: 'Insufficient MTOW capacity',
        score: 0
      })
      continue
    }

    if (wingspan && stand.wingspan_max_m && stand.wingspan_max_m < wingspan) {
      suggestions.push({
        stand_id: stand.id,
        stand_name: stand.name,
        group_key: stand.group_key,
        is_group_parent: stand.is_group_parent,
        max_mtow_kg: stand.max_mtow_kg,
        wingspan_max_m: stand.wingspan_max_m,
        arc_letter_max: stand.arc_letter_max,
        available: false,
        conflict_reason: 'Insufficient wingspan capacity',
        score: 0
      })
      continue
    }

    const { data: availabilityCheck } = await supabase.rpc('check_stand_availability', {
      p_stand_id: stand.id,
      p_arr_time: arrTime,
      p_dep_time: actualDepTime,
      p_movement_id: null
    })

    const isAvailable = availabilityCheck && availabilityCheck.length > 0 && availabilityCheck[0].available

    let score = 0
    if (isAvailable) {
      const capacityDiff = stand.max_mtow_kg - mtow
      const capacityRatio = mtow / stand.max_mtow_kg

      score = capacityRatio * 100

      if (stand.is_group_parent && mtow > 50000) {
        score += 20
      }

      if (!stand.is_group_parent && mtow < 50000) {
        score += 15
      }

      if (stand.contact_gate) {
        score += 10
      }

      if (capacityDiff < 5000) {
        score += 10
      }
    }

    suggestions.push({
      stand_id: stand.id,
      stand_name: stand.name,
      group_key: stand.group_key,
      is_group_parent: stand.is_group_parent,
      max_mtow_kg: stand.max_mtow_kg,
      wingspan_max_m: stand.wingspan_max_m,
      arc_letter_max: stand.arc_letter_max,
      available: isAvailable,
      conflict_reason: isAvailable ? null : (availabilityCheck?.[0]?.conflict_reason || 'Unknown conflict'),
      score
    })
  }

  return suggestions.sort((a, b) => b.score - a.score)
}

export function getStandGroupBadge(stand: { group_key: string | null; is_group_parent: boolean }): { label: string; color: string } | null {
  if (!stand.group_key) return null

  if (stand.is_group_parent) {
    return { label: 'Parent', color: '#6F42C1' }
  } else {
    return { label: 'Child', color: '#6C757D' }
  }
}
