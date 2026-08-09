import { supabase } from './supabase'

export const EUR_XOF = 655.957

export interface InvoiceItem {
    code: string
    label: string
    qty: number
    unit_price_xof: number
    total_xof: number
    item_group: 'AERO' | 'ESC' | 'SURETE' | 'OTHER'
    sort_order: number
}

export interface BillingCalculationInput {
    mtow_kg: number
    traffic_type: 'NAT' | 'INT'
    arr_datetime?: Date
    dep_datetime?: Date
    pax_full?: number
    pax_half?: number
    pax_transit?: number
    freight_kg?: number
    fuel_liters?: number
    overtime_hours?: number
    include_lighting_arr?: boolean
    include_lighting_dep?: boolean
    freight_rate_xof_kg?: number
    fuel_rate_xof_liter?: number
    overtime_rate_xof_hour?: number
}

/**
 * Tarifs configurables via la page admin Billing Settings (table `billing_settings`).
 * Ces valeurs par defaut correspondent aux tarifs historiquement codes en dur et
 * servent de filet de securite si la table n'est pas accessible ou pas encore
 * configuree pour un tarif donne.
 *
 * NOTE: les redevances d'atterrissage (LANDING) ne sont pas incluses ici car les
 * lignes `billing_settings` correspondantes sont seedees a 0 et ne distinguent pas
 * encore NAT/INT: les brancher telles quelles remettrait a zero la principale
 * redevance facturee. Une migration dediee est necessaire avant de les activer
 * (voir CORRECTIONS_COMPLETES_SYSTEME_FACTURATION.md).
 */
export interface BillingRates {
    parking_rate_xof_per_tonne_hour: number
    parking_free_hours: number
    lighting_over_75t_eur: number
    lighting_under_75t_eur: number
    passenger_national_xof: number
    passenger_international_xof: number
    security_national_xof: number
    security_international_xof: number
}

export const DEFAULT_BILLING_RATES: BillingRates = {
    parking_rate_xof_per_tonne_hour: 33,
    parking_free_hours: 2,
    lighting_over_75t_eur: 166.57,
    lighting_under_75t_eur: 131.50,
    passenger_national_xof: 1000,
    passenger_international_xof: 3000,
    security_national_xof: 1000,
    security_international_xof: 3000
}

/**
   * Charge les tarifs actifs depuis `billing_settings` (panneau admin) pour les
   * redevances PARKING/LIGHTING/PASSENGER/SECURITY, avec repli sur les valeurs par
   * defaut en cas d'erreur ou d'absence de configuration. Priorise une ligne
   * specifique a l'aeroport sur une ligne globale (airport_id NULL).
   */
export async function loadBillingRates(airportId?: string | null): Promise<BillingRates> {
    const rates: BillingRates = { ...DEFAULT_BILLING_RATES }

        try {
              const { data, error } = await supabase
                .from('billing_settings')
                .select('fee_type, fee_subtype, value, airport_id')
                .eq('is_active', true)
                .in('fee_type', ['PARKING', 'LIGHTING', 'PASSENGER', 'SECURITY'])

      if (error || !data) {
              return rates
      }

      const relevant = data.filter((row: any) => !row.airport_id || row.airport_id === airportId)
              const globalRows = relevant.filter((row: any) => !row.airport_id)
              const specificRows = airportId ? relevant.filter((row: any) => row.airport_id === airportId) : []
                    const ordered = [...globalRows, ...specificRows]

      for (const row of ordered) {
              if (row.value === null || row.value === undefined) continue

                if (row.fee_type === 'PARKING' && row.fee_subtype === 'BASE_RATE') {
                          rates.parking_rate_xof_per_tonne_hour = row.value
                } else if (row.fee_type === 'LIGHTING' && row.fee_subtype === 'OVER_75T') {
                          rates.lighting_over_75t_eur = row.value
                } else if (row.fee_type === 'LIGHTING' && row.fee_subtype === 'UNDER_75T') {
                          rates.lighting_under_75t_eur = row.value
                } else if (row.fee_type === 'PASSENGER' && row.fee_subtype === 'NATIONAL') {
                          rates.passenger_national_xof = row.value
                } else if (row.fee_type === 'PASSENGER' && row.fee_subtype === 'INTERNATIONAL') {
                          rates.passenger_international_xof = row.value
                } else if (row.fee_type === 'SECURITY' && row.fee_subtype === 'NATIONAL') {
                          rates.security_national_xof = row.value
                } else if (row.fee_type === 'SECURITY' && row.fee_subtype === 'INTERNATIONAL') {
                          rates.security_international_xof = row.value
                }
      }
        } catch {
              return rates
        }

  return rates
}

export function calculateLandingFee(mtow_kg: number, traffic_type: 'NAT' | 'INT'): number {
    const mtow_tonnes = Math.ceil(mtow_kg / 1000)

  let rate_per_tonne = 0

  if (traffic_type === 'NAT') {
        if (mtow_kg <= 14000) {
                rate_per_tonne = 367
        } else if (mtow_kg <= 25000) {
                rate_per_tonne = 1206
        } else if (mtow_kg <= 75000) {
                rate_per_tonne = 2410
        } else if (mtow_kg <= 150000) {
                rate_per_tonne = 3055
        } else {
                rate_per_tonne = 3873
        }
  } else {
        if (mtow_kg <= 14000) {
                rate_per_tonne = 0
        } else if (mtow_kg <= 25000) {
                rate_per_tonne = 1604
        } else if (mtow_kg <= 75000) {
                rate_per_tonne = 3208
        } else if (mtow_kg <= 150000) {
                rate_per_tonne = 4504
        } else {
                rate_per_tonne = 4230
        }
  }

  return mtow_tonnes * rate_per_tonne
}

export function calculateParkingFee(
    mtow_kg: number,
    arr_datetime?: Date,
    dep_datetime?: Date,
    rates: BillingRates = DEFAULT_BILLING_RATES
  ): number {
    if (!arr_datetime || !dep_datetime) return 0

  const duration_hours = (dep_datetime.getTime() - arr_datetime.getTime()) / (1000 * 60 * 60)
    const billable_hours = Math.max(0, duration_hours - rates.parking_free_hours)

  if (billable_hours <= 0) return 0

  const hours_ceil = Math.ceil(billable_hours)
    const mtow_tonnes = Math.ceil(mtow_kg / 1000)

  return hours_ceil * mtow_tonnes * rates.parking_rate_xof_per_tonne_hour
}

export function calculateLightingFee(mtow_kg: number, rates: BillingRates = DEFAULT_BILLING_RATES): number {
    const base_eur = mtow_kg <= 75000 ? rates.lighting_under_75t_eur : rates.lighting_over_75t_eur
    return Math.round(base_eur * EUR_XOF)
}

export function calculatePassengerFee(
    pax_count: number,
    traffic_type: 'NAT' | 'INT',
    rates: BillingRates = DEFAULT_BILLING_RATES
  ): number {
    const rate = traffic_type === 'NAT' ? rates.passenger_national_xof : rates.passenger_international_xof
    return pax_count * rate
}

export function calculateSecurityFee(
    pax_count: number,
    traffic_type: 'NAT' | 'INT',
    rates: BillingRates = DEFAULT_BILLING_RATES
  ): number {
    const rate = traffic_type === 'NAT' ? rates.security_national_xof : rates.security_international_xof
    return pax_count * rate
}

export function calculateAllItems(input: BillingCalculationInput, rates: BillingRates = DEFAULT_BILLING_RATES): InvoiceItem[] {
    const items: InvoiceItem[] = []
        let order = 0

  const landing_fee = calculateLandingFee(input.mtow_kg, input.traffic_type)
    if (landing_fee > 0) {
          const mtow_tonnes = Math.ceil(input.mtow_kg / 1000)
          items.push({
                  code: 'ATT',
                  label: 'Atterrissage',
                  qty: mtow_tonnes,
                  unit_price_xof: landing_fee / mtow_tonnes,
                  total_xof: landing_fee,
                  item_group: 'AERO',
                  sort_order: order++
          })
    }

  if (input.fuel_liters && input.fuel_rate_xof_liter) {
        const fuel_total = input.fuel_liters * input.fuel_rate_xof_liter
        items.push({
                code: 'CARB',
                label: 'Carburant',
                qty: input.fuel_liters,
                unit_price_xof: input.fuel_rate_xof_liter,
                total_xof: fuel_total,
                item_group: 'AERO',
                sort_order: order++
        })
  }

  const parking_fee = calculateParkingFee(input.mtow_kg, input.arr_datetime, input.dep_datetime, rates)
    if (parking_fee > 0) {
          const duration_hours = input.arr_datetime && input.dep_datetime
            ? (input.dep_datetime.getTime() - input.arr_datetime.getTime()) / (1000 * 60 * 60)
                  : 0
          const billable_hours = Math.ceil(Math.max(0, duration_hours - rates.parking_free_hours))
          items.push({
                  code: 'STAT',
                  label: 'Stationnement',
                  qty: billable_hours,
                  unit_price_xof: parking_fee / billable_hours,
                  total_xof: parking_fee,
                  item_group: 'AERO',
                  sort_order: order++
          })
    }

  if (input.include_lighting_arr) {
        const lighting_fee = calculateLightingFee(input.mtow_kg, rates)
        items.push({
                code: 'BAL_ARR',
                label: 'Balisage lumineux (Arrivee)',
                qty: 1,
                unit_price_xof: lighting_fee,
                total_xof: lighting_fee,
                item_group: 'AERO',
                sort_order: order++
        })
  }

  if (input.include_lighting_dep) {
        const lighting_fee = calculateLightingFee(input.mtow_kg, rates)
        items.push({
                code: 'BAL_DEP',
                label: 'Balisage lumineux (Depart)',
                qty: 1,
                unit_price_xof: lighting_fee,
                total_xof: lighting_fee,
                item_group: 'AERO',
                sort_order: order++
        })
  }

  if (input.freight_kg && input.freight_rate_xof_kg) {
        const freight_total = input.freight_kg * input.freight_rate_xof_kg
        items.push({
                code: 'FRET',
                label: 'Manutention fret',
                qty: input.freight_kg,
                unit_price_xof: input.freight_rate_xof_kg,
                total_xof: freight_total,
                item_group: 'ESC',
                sort_order: order++
        })
  }

  const pax_full = input.pax_full || 0
    const pax_half = input.pax_half || 0
    const total_pax = pax_full + pax_half

  if (total_pax > 0) {
        const pax_fee = calculatePassengerFee(total_pax, input.traffic_type, rates)
        items.push({
                code: 'PAX',
                label: `Redevance passagers (${pax_full} plein + ${pax_half} demi)`,
                qty: total_pax,
                unit_price_xof: pax_fee / total_pax,
                total_xof: pax_fee,
                item_group: 'AERO',
                sort_order: order++
        })
  }

  if (total_pax > 0) {
        const security_fee = calculateSecurityFee(total_pax, input.traffic_type, rates)
        items.push({
                code: 'SURETE',
                label: `Redevance surete (${total_pax} pax)`,
                qty: total_pax,
                unit_price_xof: security_fee / total_pax,
                total_xof: security_fee,
                item_group: 'SURETE',
                sort_order: order++
        })
  }

  if (input.overtime_hours && input.overtime_rate_xof_hour) {
        const overtime_total = input.overtime_hours * input.overtime_rate_xof_hour
        items.push({
                code: 'PROL',
                label: "Prolongation d'ouverture",
                qty: input.overtime_hours,
                unit_price_xof: input.overtime_rate_xof_hour,
                total_xof: overtime_total,
                item_group: 'OTHER',
                sort_order: order++
        })
  }

  return items
}

export function calculateTotal(items: InvoiceItem[]): number {
    return items.reduce((sum, item) => sum + item.total_xof, 0)
}

export function calculateGroupTotals(items: InvoiceItem[]): Record<string, number> {
    const totals: Record<string, number> = {
          AERO: 0,
          ESC: 0,
          SURETE: 0,
          OTHER: 0
    }

  items.forEach(item => {
        totals[item.item_group] += item.total_xof
  })

  return totals
}

export function formatXOF(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
    }).format(Math.round(amount)) + ' XOF'
}
