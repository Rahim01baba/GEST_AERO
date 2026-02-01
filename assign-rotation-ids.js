import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('Assurez-vous que VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function assignRotationIds() {
  console.log('🔄 Attribution des rotation_id aux mouvements existants...\n')

  try {
    const { data: airports, error: airportsError } = await supabase
      .from('airports')
      .select('id, name, iata_code')
      .order('name')

    if (airportsError) throw airportsError

    console.log(`📍 ${airports.length} aéroport(s) trouvé(s)\n`)

    let totalMovementsUpdated = 0
    let totalRotationsCreated = 0

    for (const airport of airports) {
      console.log(`\n🏢 Traitement de l'aéroport: ${airport.iata_code} - ${airport.name}`)

      const { data: movements, error: countError } = await supabase
        .from('aircraft_movements')
        .select('id', { count: 'exact', head: true })
        .eq('airport_id', airport.id)
        .is('rotation_id', null)

      if (countError) {
        console.error(`   ❌ Erreur comptage: ${countError.message}`)
        continue
      }

      const movementsCount = movements || 0
      console.log(`   📊 ${movementsCount} mouvement(s) sans rotation_id`)

      if (movementsCount === 0) {
        console.log('   ✅ Aucun mouvement à traiter')
        continue
      }

      const { data, error } = await supabase.rpc('reassign_existing_rotations', {
        airport_filter: airport.id
      })

      if (error) {
        console.error(`   ❌ Erreur: ${error.message}`)
        continue
      }

      const result = data[0]
      console.log(`   ✅ ${result.movements_updated} mouvement(s) mis à jour`)
      console.log(`   🔗 ${result.rotations_created} rotation(s) créée(s)`)

      totalMovementsUpdated += result.movements_updated
      totalRotationsCreated += result.rotations_created
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 RÉSUMÉ GLOBAL')
    console.log('='.repeat(60))
    console.log(`✅ Total mouvements mis à jour: ${totalMovementsUpdated}`)
    console.log(`🔗 Total rotations créées: ${totalRotationsCreated}`)
    console.log('='.repeat(60))

    console.log('\n🔍 Vérification finale...')
    const { count } = await supabase
      .from('aircraft_movements')
      .select('id', { count: 'exact', head: true })
      .is('rotation_id', null)

    if (count > 0) {
      console.log(`\n⚠️  ${count} mouvement(s) reste(nt) sans rotation_id`)
      console.log('   Cela peut être normal pour des mouvements récents ou incomplets.')
    } else {
      console.log('\n✅ Tous les mouvements ont un rotation_id assigné!')
    }

    console.log('\n✨ Attribution terminée avec succès!')

  } catch (error) {
    console.error('\n❌ Erreur:', error.message)
    process.exit(1)
  }
}

console.log('╔════════════════════════════════════════════════════════╗')
console.log('║   Attribution des Rotation IDs - Airport Manager      ║')
console.log('╚════════════════════════════════════════════════════════╝')
console.log()

assignRotationIds()
