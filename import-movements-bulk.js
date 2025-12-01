import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const AIRPORT_IDS = {
  'BYK': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'HGO': 'a11edcd7-a078-4112-8b26-2c924778c40d',
  'SPY': 'b91e1fb1-9144-4ebe-967a-63b85cebc373'
}

const STATUS_MAP = {
  'A': 'Arrived',
  'B': 'Planned',
  'M': 'Departed',
  'C': 'Canceled',
  'F': 'Canceled',
  '0': 'Planned'
}

function parseDate(dateStr, timeStr) {
  if (!dateStr || !timeStr || dateStr === '00/01/1900' || timeStr === '00:00:00') {
    return null
  }

  try {
    const [day, month, year] = dateStr.split('/')
    const [hour, minute] = timeStr.split(':')

    if (!day || !month || !year || !hour || !minute) return null

    const fullYear = year.length === 4 ? year : '20' + year

    return new Date(fullYear, parseInt(month) - 1, day, hour, minute, 0).toISOString()
  } catch (e) {
    return null
  }
}

function getAirportFromCode(code) {
  if (code === '1' || code === '21') return 'BYK'
  if (code === '2') return 'HGO'
  if (code === '3') return 'SPY'
  return 'SPY'
}

function extractOriginDestination(flightNumber, movementType) {
  const match = flightNumber.match(/^([A-Z0-9]{2,3})/)
  if (!match) return { origin: null, destination: null }

  const airline = match[1]

  if (movementType === 'ARR') {
    return {
      origin_iata: airline === 'HF' ? 'ABJ' : null,
      destination_iata: null
    }
  } else {
    return {
      origin_iata: null,
      destination_iata: airline === 'HF' ? 'ABJ' : null
    }
  }
}

async function importFlights() {
  console.log('🚀 Starting bulk flight import...\n')

  let rawData
  try {
    rawData = readFileSync('flights-data.txt', 'utf-8')
  } catch (e) {
    console.error('❌ Cannot read flights-data.txt file')
    console.error('Please create this file with flight data (tab-separated)')
    process.exit(1)
  }

  const lines = rawData.split('\n')
  const movements = []

  console.log(`📄 Processing ${lines.length} lines...`)

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split('\t')
    if (parts.length < 17) {
      console.log(`⚠️  Skipping line with ${parts.length} parts (need 17+)`)
      continue
    }

    const [
      arrId, depId, stand, registration, aircraftType, pax, trafficCat,
      airportCode, arrDate, arrFlight, arrTerminal, arrStatusCode, arrTime,
      depDate, depFlight, depTerminal, depStatusCode, depTime
    ] = parts

    const airportIata = getAirportFromCode(airportCode)
    const airportId = AIRPORT_IDS[airportIata]

    if (arrFlight && arrDate && arrDate !== '00/01/1900') {
      const scheduledTime = parseDate(arrDate, arrTime)
      if (scheduledTime) {
        const { origin_iata, destination_iata } = extractOriginDestination(arrFlight, 'ARR')

        movements.push({
          airport_id: airportId,
          flight_number: arrFlight,
          aircraft_type: aircraftType || 'Unknown',
          registration: registration || 'Unknown',
          movement_type: 'ARR',
          scheduled_time: scheduledTime,
          status: STATUS_MAP[arrStatusCode] || 'Planned',
          pax_count: parseInt(pax) || 0,
          traffic_category: trafficCat || 'C',
          origin_iata,
          destination_iata,
          billable: true
        })
      }
    }

    if (depFlight && depDate && depDate !== '00/01/1900') {
      const scheduledTime = parseDate(depDate, depTime)
      if (scheduledTime) {
        const { origin_iata, destination_iata } = extractOriginDestination(depFlight, 'DEP')

        movements.push({
          airport_id: airportId,
          flight_number: depFlight,
          aircraft_type: aircraftType || 'Unknown',
          registration: registration || 'Unknown',
          movement_type: 'DEP',
          scheduled_time: scheduledTime,
          status: STATUS_MAP[depStatusCode] || 'Planned',
          pax_count: parseInt(pax) || 0,
          traffic_category: trafficCat || 'C',
          origin_iata,
          destination_iata,
          billable: true
        })
      }
    }
  }

  console.log(`\n📊 Parsed ${movements.length} movements:`)
  console.log(`   - BYK (Bouaké): ${movements.filter(m => m.airport_id === AIRPORT_IDS.BYK).length}`)
  console.log(`   - HGO (Korhogo): ${movements.filter(m => m.airport_id === AIRPORT_IDS.HGO).length}`)
  console.log(`   - SPY (San-Pedro): ${movements.filter(m => m.airport_id === AIRPORT_IDS.SPY).length}`)
  console.log()

  if (movements.length === 0) {
    console.log('⚠️  No movements to import')
    return
  }

  console.log('💾 Inserting movements in batches of 100...\n')

  let inserted = 0
  let errors = 0
  const batchSize = 100

  for (let i = 0; i < movements.length; i += batchSize) {
    const batch = movements.slice(i, i + batchSize)

    const { data, error } = await supabase
      .from('aircraft_movements')
      .insert(batch)

    if (error) {
      errors += batch.length
      console.error(`❌ Batch error (${i}-${i + batch.length}):`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\r✅ Inserted: ${inserted}/${movements.length}`)
    }
  }

  console.log(`\n\n🎉 Import complete!`)
  console.log(`   ✅ Inserted: ${inserted}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`\n💡 Check the Dashboard to see your movements!`)
}

importFlights().catch(console.error)
