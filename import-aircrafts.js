/**
 * Script d'import des aéronefs dans la base de données Supabase
 *
 * Usage:
 * 1. Préparez votre fichier CSV avec les colonnes suivantes (dans cet ordre):
 *    - registration (obligatoire)
 *    - type (obligatoire)
 *    - mtow_kg
 *    - seats
 *    - length_m
 *    - wingspan_m
 *    - height_m
 *    - operator
 *    - remarks
 *
 * 2. Exécutez le script:
 *    node import-aircrafts.js votre-fichier.csv
 *
 * Alternative JSON:
 *    node import-aircrafts.js votre-fichier.json
 *
 * Format JSON attendu:
 * [
 *   {
 *     "registration": "F-HBNA",
 *     "type": "ATR72",
 *     "mtow_kg": 22000,
 *     "seats": 72,
 *     "length_m": 27.2,
 *     "wingspan_m": 27.0,
 *     "height_m": 7.7,
 *     "operator": "Air Côte d'Ivoire",
 *     "remarks": "Configuration régionale"
 *   }
 * ]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies dans .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('Fichier CSV vide ou invalide')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const aircrafts = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const aircraft = {}

    headers.forEach((header, index) => {
      const value = values[index]
      if (value && value !== '') {
        if (['mtow_kg', 'length_m', 'wingspan_m', 'height_m'].includes(header)) {
          aircraft[header] = parseFloat(value)
        } else if (header === 'seats') {
          aircraft[header] = parseInt(value)
        } else {
          aircraft[header] = value
        }
      }
    })

    if (aircraft.registration && aircraft.type) {
      aircrafts.push(aircraft)
    }
  }

  return aircrafts
}

function parseJSON(content) {
  const data = JSON.parse(content)
  if (!Array.isArray(data)) {
    throw new Error('Le fichier JSON doit contenir un tableau d\'objets')
  }

  return data.filter(aircraft => aircraft.registration && aircraft.type)
}

async function importAircrafts(filePath) {
  try {
    console.log(`📂 Lecture du fichier: ${filePath}`)
    const content = readFileSync(filePath, 'utf-8')

    let aircrafts
    if (filePath.endsWith('.json')) {
      console.log('📋 Format: JSON')
      aircrafts = parseJSON(content)
    } else if (filePath.endsWith('.csv')) {
      console.log('📋 Format: CSV')
      aircrafts = parseCSV(content)
    } else {
      throw new Error('Format de fichier non supporté. Utilisez .csv ou .json')
    }

    console.log(`✅ ${aircrafts.length} aéronefs trouvés dans le fichier\n`)

    let imported = 0
    let errors = 0

    for (const aircraft of aircrafts) {
      try {
        // Normaliser l'immatriculation en majuscules
        aircraft.registration = aircraft.registration.toUpperCase()

        const { error } = await supabase
          .from('aircrafts')
          .insert(aircraft)

        if (error) {
          if (error.code === '23505') {
            console.log(`⚠️  ${aircraft.registration} existe déjà`)
          } else {
            console.error(`❌ ${aircraft.registration}: ${error.message}`)
            errors++
          }
        } else {
          console.log(`✅ ${aircraft.registration} - ${aircraft.type}`)
          imported++
        }
      } catch (err) {
        console.error(`❌ Erreur lors de l'import de ${aircraft.registration}:`, err.message)
        errors++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`📊 RÉSUMÉ DE L'IMPORT`)
    console.log('='.repeat(50))
    console.log(`✅ Importés avec succès: ${imported}`)
    console.log(`❌ Erreurs: ${errors}`)
    console.log(`📋 Total traité: ${aircrafts.length}`)
    console.log('='.repeat(50))

  } catch (err) {
    console.error('❌ Erreur:', err.message)
    process.exit(1)
  }
}

// Point d'entrée
const filePath = process.argv[2]

if (!filePath) {
  console.error('❌ Usage: node import-aircrafts.js <fichier.csv|fichier.json>')
  console.error('\nExemple CSV (avec en-têtes):')
  console.error('registration,type,mtow_kg,seats,length_m,wingspan_m,height_m,operator,remarks')
  console.error('F-HBNA,ATR72,22000,72,27.2,27.0,7.7,Air Côte d\'Ivoire,Configuration régionale')
  console.error('\nExemple JSON:')
  console.error('[{"registration":"F-HBNA","type":"ATR72","mtow_kg":22000,"seats":72}]')
  process.exit(1)
}

importAircrafts(filePath)
