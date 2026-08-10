import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent etre definis dans .env')
    process.exit(1)
}

const seedFile = process.argv[2] || './seed-users.local.json'

if (!existsSync(seedFile)) {
    console.error(`Fichier de configuration introuvable: ${seedFile}`)
    console.error('Copiez seed-users.example.json vers seed-users.local.json et renseignez de vrais mots de passe.')
    console.error('Ce fichier local est gitignore et ne doit jamais etre commite.')
    process.exit(1)
}

const users = JSON.parse(readFileSync(seedFile, 'utf-8'))

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
          autoRefreshToken: false,
          persistSession: false
    }
})

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
              console.log(`Created ${userData.email}`)
      }
    }

  console.log('All users created successfully!')
}

createUsers()
