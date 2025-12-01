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
  '0': 'Planned'
}

function parseDate(dateStr, timeStr) {
  if (!dateStr || !timeStr || dateStr === '00/01/1900' || timeStr === '00:00:00') {
    return null
  }

  const [day, month, year] = dateStr.split('/')
  const [hour, minute] = timeStr.split(':')

  return new Date(year, parseInt(month) - 1, day, hour, minute).toISOString()
}

function getAirportFromCode(code) {
  if (code === '1' || code === '21') return 'BYK'
  if (code === '2') return 'HGO'
  if (code === '3') return 'SPY'
  return 'BYK'
}

async function importFlights() {
  console.log('🚀 Starting flight import...\n')

  const rawData = \`147320	147321	6A	CNROH	B738	79	C	3	06/08/2025	AT2533	0	0	16:18:00	06/08/2020	AT2533	3	A	17:30:00
	147328	6	TCLNC	A333	215	E	1			0	0		06/08/2020	TK557	21	M	01:14:00
147288	147289	6B	XTABZ	E195	41	C	3	06/08/2025	2J507	21	B	14:17:00	06/08/2020	2J508	21	M	15:33:00
147290	147291	6A	5YKYF	B738	79	C	3	06/08/2025	KQ520	21	B	11:27:00	06/08/2020	KQ520	21	M	12:47:00
147292	147293	7A	5YCYB	B738	79	C	3	06/08/2025	KQ521	21	B	19:20:00	06/08/2020	KQ521	0	0	20:28:00
147294	147295	6	ETAVD	A359	272	E	3	06/08/2025	ET935	21	B	14:49:00	06/08/2020	ET935	0	0	14:49:00
147298	147299	4	OOSFG	A333	215	E	3	06/08/2025	SN231	0	0	22:21:00	07/08/2020	SN231	21	M	00:11:00
147300	147301	5	FHTYE	A359	272	E	3	06/08/2025	AF520	0	0	19:01:00	06/08/2020	AF521	21	M	21:18:00
147302	147303	5	FHJAZ	A332	233	E	3	06/08/2025	SS984	21	B	21:09:00	07/08/2020	SS985	21	M	00:10:00
147304	147305	7B	TUTST	A319	76	C	3	06/08/2025	HF743	21	A	11:35:00	06/08/2020	HF510	0	0	14:12:00\`

  const lines = rawData.split('\n')
  const movements = []

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

    if (arrFlight && arrDate) {
      const scheduledTime = parseDate(arrDate, arrTime)
      if (scheduledTime) {
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
          stand_name: stand || null,
          billable: true
        })
      }
    }

    if (depFlight && depDate && depDate !== '00/01/1900') {
      const scheduledTime = parseDate(depDate, depTime)
      if (scheduledTime) {
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
          stand_name: stand || null,
          billable: true
        })
      }
    }
  }

  console.log(\`📊 Parsed \${movements.length} movements\`)
  console.log(\`   - BYK (Bouaké): \${movements.filter(m => m.airport_id === AIRPORT_IDS.BYK).length}\`)
  console.log(\`   - HGO (Korhogo): \${movements.filter(m => m.airport_id === AIRPORT_IDS.HGO).length}\`)
  console.log(\`   - SPY (San-Pedro): \${movements.filter(m => m.airport_id === AIRPORT_IDS.SPY).length}\`)
  console.log()

  let inserted = 0
  let errors = 0

  for (const movement of movements) {
    const { error } = await supabase
      .from('aircraft_movements')
      .insert(movement)

    if (error) {
      errors++
      console.error(\`❌ Error inserting \${movement.flight_number}:\`, error.message)
    } else {
      inserted++
      process.stdout.write(\`\r✅ Inserted: \${inserted}/\${movements.length}\`)
    }
  }

  console.log(\`\n\n🎉 Import complete!\`)
  console.log(\`   ✅ Inserted: \${inserted}\`)
  console.log(\`   ❌ Errors: \${errors}\`)
}

importFlights().catch(console.error)
