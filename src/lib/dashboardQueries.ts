import { supabase } from './supabase'

export interface DateRange {
  startDate: string
  endDate: string
}

export interface DashboardFilters extends DateRange {
  airportId?: string
}

export interface DailyMovement {
  date: string
  arr: number
  dep: number
  total: number
}

export interface DailyRevenue {
  date: string
  amount: number
}

export interface AircraftTypeCount {
  type: string
  count: number
}

export interface RouteCount {
  route: string
  count: number
}

export interface DailyOccupancy {
  date: string
  occupancy_pct: number
}

export async function getMovementsCount(filters: DashboardFilters): Promise<number> {
  let query = supabase
    .from('aircraft_movements')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_time', filters.startDate)
    .lte('scheduled_time', filters.endDate)

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

export async function getMovementsDailySeries(filters: DashboardFilters): Promise<DailyMovement[]> {
  let query = supabase
    .from('aircraft_movements')
    .select('scheduled_time, movement_type')
    .gte('scheduled_time', filters.startDate)
    .lte('scheduled_time', filters.endDate)
    .order('scheduled_time')

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { data, error } = await query

  if (error) throw error

  const dailyMap = new Map<string, { arr: number; dep: number }>()

  data?.forEach((movement) => {
    const date = new Date(movement.scheduled_time).toISOString().split('T')[0]
    const entry = dailyMap.get(date) || { arr: 0, dep: 0 }

    if (movement.movement_type === 'ARR') {
      entry.arr++
    } else if (movement.movement_type === 'DEP') {
      entry.dep++
    }

    dailyMap.set(date, entry)
  })

  return Array.from(dailyMap.entries())
    .map(([date, counts]) => ({
      date,
      arr: counts.arr,
      dep: counts.dep,
      total: counts.arr + counts.dep
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getRevenueSum(
  filters: DashboardFilters,
  paidOnly: boolean = false
): Promise<number> {
  let query = supabase
    .from('invoices')
    .select('total_xof')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate)

  if (paidOnly) {
    query = query.eq('status', 'PAID')
  }

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { data, error } = await query

  if (error) throw error

  return data?.reduce((sum, inv) => sum + Number(inv.total_xof || 0), 0) || 0
}

export async function getRevenueDailySeries(
  filters: DashboardFilters,
  paidOnly: boolean = false
): Promise<DailyRevenue[]> {
  let query = supabase
    .from('invoices')
    .select('created_at, total_xof')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate)
    .order('created_at')

  if (paidOnly) {
    query = query.eq('status', 'PAID')
  }

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { data, error } = await query

  if (error) throw error

  const dailyMap = new Map<string, number>()

  data?.forEach((invoice) => {
    const date = new Date(invoice.created_at).toISOString().split('T')[0]
    const current = dailyMap.get(date) || 0
    dailyMap.set(date, current + Number(invoice.total_xof || 0))
  })

  return Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getPaidInvoicesCount(filters: DashboardFilters): Promise<number> {
  let query = supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PAID')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate)

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

export async function getStandOccupancyAvg(filters: DashboardFilters): Promise<number> {
  let standsQuery = supabase.from('stands').select('id')

  let occupiedQuery = supabase
    .from('aircraft_movements')
    .select('stand_id')
    .in('status', ['Planned', 'Arrived'])
    .not('stand_id', 'is', null)
    .gte('scheduled_time', filters.startDate)
    .lte('scheduled_time', filters.endDate)

  if (filters.airportId) {
    standsQuery = standsQuery.eq('airport_id', filters.airportId)
    occupiedQuery = occupiedQuery.eq('airport_id', filters.airportId)
  }

  const [standsRes, occupiedRes] = await Promise.all([standsQuery, occupiedQuery])

  if (standsRes.error) throw standsRes.error
  if (occupiedRes.error) throw occupiedRes.error

  const totalStands = standsRes.data?.length || 1
  const occupiedStands = new Set(
    (occupiedRes.data as { stand_id: string | null }[] | null)?.map((m) => m.stand_id)
  ).size

  return Math.round((occupiedStands / totalStands) * 100)
}

export async function getTopAircraftTypes(
  filters: DashboardFilters,
  limit: number = 10
): Promise<AircraftTypeCount[]> {
  let query = supabase
    .from('aircraft_movements')
    .select('aircraft_type')
    .gte('scheduled_time', filters.startDate)
    .lte('scheduled_time', filters.endDate)

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { data, error } = await query

  if (error) throw error

  const typeMap = new Map<string, number>()

  data?.forEach((movement) => {
    const type = movement.aircraft_type || 'Unknown'
    typeMap.set(type, (typeMap.get(type) || 0) + 1)
  })

  return Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function getTopRoutes(
  filters: DashboardFilters,
  limit: number = 10
): Promise<RouteCount[]> {
  const { data, error } = await supabase.rpc('get_top10_routes_all', {
    p_airport_id: filters.airportId || null,
    p_start_date: filters.startDate,
    p_end_date: filters.endDate
  })

  if (error) throw error

  type RouteRow = { route: string; total_vols: number };
  return ((data as RouteRow[]) || [])
    .map((row) => ({
      route: row.route.replace('XXX', '?'),
      count: Number(row.total_vols)
    }))
    .slice(0, limit)
}

export async function getStandOccupancyDailySeries(
  filters: DashboardFilters
): Promise<DailyOccupancy[]> {
  let standsQuery = supabase.from('stands').select('id')

  if (filters.airportId) {
    standsQuery = standsQuery.eq('airport_id', filters.airportId)
  }

  const { data: standsData, error: standsError } = await standsQuery

  if (standsError) throw standsError

  const totalStands = standsData?.length || 1

  let query = supabase
    .from('aircraft_movements')
    .select('scheduled_time, stand_id, status')
    .gte('scheduled_time', filters.startDate)
    .lte('scheduled_time', filters.endDate)
    .not('stand_id', 'is', null)

  if (filters.airportId) {
    query = query.eq('airport_id', filters.airportId)
  }

  const { data, error } = await query

  if (error) throw error

  const dailyMap = new Map<string, Set<string>>()

  data?.forEach((movement) => {
    if (movement.status === 'Planned' || movement.status === 'Arrived') {
      const date = new Date(movement.scheduled_time).toISOString().split('T')[0]
      const stands = dailyMap.get(date) || new Set<string>()
      stands.add(movement.stand_id)
      dailyMap.set(date, stands)
    }
  })

  return Array.from(dailyMap.entries())
    .map(([date, stands]) => ({
      date,
      occupancy_pct: Math.round((stands.size / totalStands) * 100)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
