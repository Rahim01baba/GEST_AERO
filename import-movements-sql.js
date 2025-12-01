import { readFileSync } from 'fs'

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

function generateSQL() {
  let rawData
  try {
    rawData = readFileSync('flights-data.txt', 'utf-8')
  } catch (e) {
    console.error('❌ Cannot read flights-data.txt file')
    process.exit(1)
  }

  const lines = rawData.split('\n')
  const sqlStatements = []

  console.log(`📄 Processing ${lines.length} lines...\n`)

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split('\t')
    if (parts.length < 17) continue

    const [
      arrId, depId, stand, registration, aircraftType, pax, trafficCat,
      airportCode, arrDate, arrFlight, arrTerminal, arrStatusCode, arrTime,
      depDate, depFlight, depTerminal, depStatusCode, depTime
    ] = parts

    const airportIata = getAirportFromCode(airportCode)
    const airportId = AIRPORT_IDS[airportIata]
    const reg = (registration || 'UNKNOWN').replace(/'/g, "''")
    const type = (aircraftType || 'Unknown').replace(/'/g, "''")
    const paxCount = parseInt(pax) || 0

    // Arrival
    if (arrFlight && arrDate && arrDate !== '00/01/1900') {
      const scheduledTime = parseDate(arrDate, arrTime)
      if (scheduledTime) {
        const status = STATUS_MAP[arrStatusCode] || 'Planned'
        const flight = (arrFlight || '').replace(/'/g, "''")

        sqlStatements.push(`
INSERT INTO aircraft_movements (
  airport_id, flight_number, aircraft_type, registration,
  movement_type, scheduled_time, status, pax_count, traffic_category, billable
) VALUES (
  '${airportId}', '${flight}', '${type}', '${reg}',
  'ARR', '${scheduledTime}', '${status}', ${paxCount}, '${trafficCat}', true
);`)
      }
    }

    // Departure
    if (depFlight && depDate && depDate !== '00/01/1900') {
      const scheduledTime = parseDate(depDate, depTime)
      if (scheduledTime) {
        const status = STATUS_MAP[depStatusCode] || 'Planned'
        const flight = (depFlight || '').replace(/'/g, "''")

        sqlStatements.push(`
INSERT INTO aircraft_movements (
  airport_id, flight_number, aircraft_type, registration,
  movement_type, scheduled_time, status, pax_count, traffic_category, billable
) VALUES (
  '${airportId}', '${flight}', '${type}', '${reg}',
  'DEP', '${scheduledTime}', '${status}', ${paxCount}, '${trafficCat}', true
);`)
      }
    }
  }

  console.log(`✅ Generated ${sqlStatements.length} SQL statements\n`)
  console.log('-- SQL STATEMENTS TO RUN:')
  console.log(sqlStatements.join('\n'))
}

generateSQL()
