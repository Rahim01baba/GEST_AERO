import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdmin() {
  console.log('Creating admin user...')

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'admin@airport.com',
    password: 'Baba1234',
    options: {
      data: {
        full_name: 'Admin User'
      }
    }
  })

  if (signUpError) {
    console.error('Error creating admin:', signUpError.message)
    process.exit(1)
  }

  console.log('Admin user created:', signUpData.user.id)

  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: signUpData.user.id,
      full_name: 'Admin User',
      email: 'admin@airport.com',
      role: 'ADMIN',
      airport_id: null,
      active: true
    })

  if (profileError) {
    console.error('Error creating admin profile:', profileError.message)
  } else {
    console.log('✓ Admin created successfully!')
    console.log('\nLogin: admin@airport.com / Baba1234')
  }
}

createAdmin()
