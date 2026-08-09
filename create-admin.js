import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent etre definis dans .env')
    process.exit(1)
}

if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD doivent etre definis dans .env (aucune valeur par defaut, pour des raisons de securite)')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdmin() {
    console.log('Creating admin user...')

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
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
              email: adminEmail,
              role: 'ADMIN',
              airport_id: null,
              active: true
      })

  if (profileError) {
        console.error('Error creating admin profile:', profileError.message)
  } else {
        console.log('Admin created successfully!')
        console.log(`\nLogin: ${adminEmail}`)
  }
}

createAdmin()
