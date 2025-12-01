import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

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

async function createAimBykUser() {
  const userData = {
    email: 'aimbyk@airport.com',
    password: 'aimbyk123',
    full_name: 'AIM Officer Bouaké',
    role: 'AIM',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  }

  console.log(`Creating user: ${userData.email}`)

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      full_name: userData.full_name
    }
  })

  if (authError) {
    console.error(`Error creating auth user:`, authError.message)
    return
  }

  console.log(`Auth user created with ID: ${authData.user.id}`)

  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      airport_id: userData.airport_id,
      active: true
    })

  if (profileError) {
    console.error(`Error creating user profile:`, profileError.message)
  } else {
    console.log(`✓ User created successfully!`)
    console.log(`\nLogin credentials:`)
    console.log(`Email: ${userData.email}`)
    console.log(`Password: ${userData.password}`)
    console.log(`Role: ${userData.role}`)
    console.log(`Airport: Bouaké (BYK)`)
  }
}

createAimBykUser()
