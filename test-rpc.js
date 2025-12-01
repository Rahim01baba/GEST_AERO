import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRPC() {
  console.log('🧪 Testing RPC function lookup_aircraft_by_registration...\n')

  const testRegistrations = ['CNROH', 'TUTSV', 'FHTYE', 'invalid']

  for (const reg of testRegistrations) {
    console.log(`Testing: ${reg}`)

    const { data, error } = await supabase.rpc('lookup_aircraft_by_registration', {
      p_registration: reg
    })

    if (error) {
      console.error('  ❌ Error:', error.message)
      console.error('     Details:', error)
    } else {
      console.log('  ✅ Success')
      console.log('     Data:', JSON.stringify(data, null, 2))
      console.log('     Type:', typeof data)
      console.log('     Is Array:', Array.isArray(data))
      console.log('     Length:', data?.length)
    }
    console.log()
  }
}

testRPC().catch(console.error)
