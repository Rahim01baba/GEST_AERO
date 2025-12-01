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

const users = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@airport.com',
    password: 'Baba1234',
    full_name: 'Admin User',
    role: 'ADMIN',
    airport_id: null
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'ops@airport.com',
    password: 'ops123',
    full_name: 'Operations Manager',
    role: 'OPS',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'aim@airport.com',
    password: 'aim123',
    full_name: 'AIM Officer',
    role: 'AIM',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'fin@airport.com',
    password: 'fin123',
    full_name: 'Finance Manager',
    role: 'FIN',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'ats@airport.com',
    password: 'ats123',
    full_name: 'ATS Controller',
    role: 'ATS',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'aimbyk@airport.com',
    password: 'aimbyk123',
    full_name: 'AIM Officer Bouaké',
    role: 'AIM',
    airport_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  }
]

async function createUsers() {
  for (const userData of users) {
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
      console.error(`Error creating auth user ${userData.email}:`, authError.message)
      continue
    }

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
      console.error(`Error creating user profile ${userData.email}:`, profileError.message)
    } else {
      console.log(`✓ Created ${userData.email}`)
    }
  }

  console.log('\nAll users created successfully!')
  console.log('\nLogin credentials:')
  users.forEach(u => {
    console.log(`${u.email} / ${u.password}`)
  })
}

createUsers()
