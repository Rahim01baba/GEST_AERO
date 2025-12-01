# 📋 IMPLÉMENTATION COMPLÈTE SYSTÈME DE FACTURATION

**Date:** 2025-11-18
**Version:** 3.0.0
**Statut:** ✅ MIGRATIONS APPLIQUÉES - FRONTEND EN COURS

---

## ✅ MIGRATIONS SQL DÉJÀ APPLIQUÉES

### 1. `add_aircraft_icao_code_and_billing_system.sql`

**Modifications effectuées:**

#### A. Table `aircrafts` - Code OACI ajouté
```sql
ALTER TABLE aircrafts ADD COLUMN code_oaci TEXT;
ALTER TABLE aircrafts ADD CONSTRAINT aircrafts_code_oaci_check
  CHECK (code_oaci IN ('A', 'B', 'C', 'D', 'E', 'F') OR code_oaci IS NULL);
```

**Résultat:** ✅ Code OACI disponible dans le système

#### B. Table `aircraft_movements` - Verrouillage facturation
```sql
ALTER TABLE aircraft_movements ADD COLUMN is_invoiced BOOLEAN DEFAULT false;
```

**Résultat:** ✅ Flag `is_invoiced` remplace `is_locked`

#### C. Table `billing_settings` - Paramètres admin
```sql
CREATE TABLE billing_settings (
  id UUID PRIMARY KEY,
  airport_id UUID REFERENCES airports(id),
  fee_type TEXT NOT NULL,
  fee_subtype TEXT,
  description TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

**Tarifs par défaut insérés:**
- Atterrissage par tranches MTOW (7 tranches)
- Stationnement: 33 XOF/tonne/heure (après 2h)
- Balisage: 166,57€ (>75T), 131,50€ (≤75T)
- Passagers: 1000 XOF (NAT), 3000 XOF (INT)
- Sûreté: 1000 XOF (NAT), 3000 XOF (INT)
- Fret, Carburant, Horaires: 0 (à paramétrer)

**RLS configuré:**
- ADMIN: Lecture + Écriture totale
- Autres: Lecture seule

#### D. Table `invoices` - Colonnes détaillées ajoutées
```sql
ALTER TABLE invoices ADD COLUMN landing_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN parking_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN lighting_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN passenger_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN security_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN freight_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN fuel_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN overtime_fee_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN subtotal_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN discount_xof NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN calculation_details JSONB;
ALTER TABLE invoices ADD COLUMN pax_total INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN parking_hours NUMERIC DEFAULT 0;
```

**Résultat:** ✅ Détail complet des redevances

#### E. Fonction `calculate_invoice_fees()`
```sql
CREATE FUNCTION calculate_invoice_fees(
  p_movement_arr_id UUID,
  p_movement_dep_id UUID,
  p_airport_id UUID
) RETURNS TABLE (...);
```

**Résultat:** ✅ Fonction prête (à compléter avec logique métier)

### 2. `create_advanced_statistics_dashboard.sql`

#### A. Vue `movements_enriched`
```sql
CREATE VIEW movements_enriched AS
SELECT
  am.*,
  a.code_oaci,
  a.mtow_kg as aircraft_mtow,
  a.type as aircraft_type_full,
  -- ... + 20 colonnes calculées
FROM aircraft_movements am
LEFT JOIN aircrafts a ON a.registration = am.registration
LEFT JOIN airports ap ON ap.id = am.airport_id;
```

**Colonnes ajoutées:**
- `code_oaci`, `aircraft_mtow`, `aircraft_type_full`
- `ground_time_hours` (turnaround)
- `route` (origin-destination)
- `mtow_class` (0-5T, 5-10T, etc.)
- `hour_of_day`, `day_of_week`
- `movement_date`, `movement_month`, `movement_quarter`
- `pax_total_all`, `freight_total_kg`

#### B. Fonction `get_dashboard_stats()`
```sql
CREATE FUNCTION get_dashboard_stats(
  p_airport_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_registration TEXT,
  p_code_oaci TEXT
) RETURNS JSONB;
```

**Retourne:**
```json
{
  "operations": {
    "volume": {...},
    "by_aircraft_type": {...},
    "by_code_oaci": {...},
    "by_mtow_class": {...},
    "by_hour": {...},
    "turnaround": {...},
    "top_routes": [...],
    "top_airlines": [...]
  },
  "finances": {
    "global": {...},
    "by_fee_type": {...},
    "by_traffic": {...}
  },
  "filters": {...}
}
```

#### C. Index créés
```sql
CREATE INDEX idx_movements_dashboard_filters
  ON aircraft_movements(airport_id, scheduled_time, registration, movement_type);
CREATE INDEX idx_invoices_dashboard_filters
  ON invoices(airport_id, created_at, status, traffic_type);
CREATE INDEX idx_movements_rotation
  ON aircraft_movements(rotation_id) WHERE rotation_id IS NOT NULL;
```

**Résultat:** ✅ Performance optimisée

---

## 🔧 MODIFICATIONS FRONTEND NÉCESSAIRES

### PROBLÈME 1: Erreur création aéroport ❌ NON RÉSOLU

**Diagnostic:**
Le code ligne 141 de `AirportEditor.tsx` affiche "Erreur lors de la mise à jour" même en mode création.

**Cause probable:**
RLS ou contrainte bloquante, ou code erroné.

**Solution:**
```typescript
// AirportEditor.tsx - ligne 136-144
if (error) {
  console.error('Error updating airport:', error)
  if (error.code === '23505') {
    setError('Un aéroport avec ce code OACI ou IATA existe déjà')
  } else {
    setError(`Erreur lors de la mise à jour: ${error.message}`)
  }
  setLoading(false)
  return
}
```

**Test à effectuer:**
```sql
-- Vérifier politiques RLS
SELECT * FROM pg_policies WHERE tablename = 'airports';

-- Tester insertion directe
INSERT INTO airports (name, icao_code, iata_code)
VALUES ('Test Airport', 'TEST', 'TST')
RETURNING *;
```

### PROBLÈME 2: Infrastructures non disponibles dès création ✅ DÉJÀ RÉSOLU

**État actuel:**
Le code redirige déjà vers `/airports/${data.id}` après création (ligne 128), et le composant `InfrastructureManagement` est déjà disponible.

**Aucune modification nécessaire.**

### PROBLÈME 3: Retirer facturation de Movements ⚠️ À FAIRE

**Fichier:** `src/pages/Movements.tsx`

**Lignes à supprimer:** 167-209, 521-531

**Modifications:**

1. **Supprimer la fonction `createInvoiceFromMovement`** (lignes 167-209)

2. **Supprimer le bouton de facturation** dans le tableau (lignes 521-531)

3. **Ajouter indicateur visuel** pour mouvements facturés:

```typescript
// Après ligne 500, dans le rendu du tableau:
{movement.is_invoiced && (
  <span style={{
    backgroundColor: '#10b981',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    marginLeft: '8px'
  }}>
    FACTURÉ
  </span>
)}
```

4. **Bloquer édition/suppression** si facturé:

```typescript
// Ligne 452 - Condition d'édition:
disabled={movement.is_invoiced}
title={movement.is_invoiced ? "Mouvement facturé - modification impossible" : "Modifier"}

// Ligne 470 - Condition de suppression:
disabled={movement.is_invoiced}
title={movement.is_invoiced ? "Mouvement facturé - suppression impossible" : "Supprimer"}
```

### PROBLÈME 4: Page Billing - Affichage mouvements ⚠️ À FAIRE

**Fichier:** `src/pages/Billing.tsx`

**Ajouter filtres:**

```typescript
const [filterStartDate, setFilterStartDate] = useState(() => {
  const today = new Date()
  today.setDate(1) // Premier jour du mois
  return today.toISOString().split('T')[0]
})

const [filterEndDate, setFilterEndDate] = useState(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const [filterRegistration, setFilterRegistration] = useState('')
```

**Ajouter section "Mouvements non facturés":**

```typescript
const [unin voicedMovements, setUninvoicedMovements] = useState<AircraftMovement[]>([])

const loadUninvoicedMovements = async () => {
  if (!user?.airport_id) return

  let query = supabase
    .from('aircraft_movements')
    .select('*')
    .eq('airport_id', user.airport_id)
    .eq('is_invoiced', false)
    .order('scheduled_time', { ascending: false })

  if (filterStartDate && filterEndDate) {
    query = query
      .gte('scheduled_time', filterStartDate)
      .lte('scheduled_time', filterEndDate)
  }

  if (filterRegistration) {
    query = query.ilike('registration', `%${filterRegistration}%`)
  }

  const { data, error } = await query

  if (!error && data) {
    setUninvoicedMovements(data)
  }
}
```

**UI Mouvements non facturés:**

```tsx
<div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
  <h2>Mouvements non facturés</h2>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
    <div>
      <label>Date début</label>
      <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
    </div>
    <div>
      <label>Date fin</label>
      <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
    </div>
    <div>
      <label>Immatriculation</label>
      <input type="text" value={filterRegistration} onChange={e => setFilterRegistration(e.target.value)} />
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Vol</th>
        <th>Immat</th>
        <th>Type Avion</th>
        <th>Route</th>
        <th>PAX</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {uninvoicedMovements.map(movement => (
        <tr key={movement.id}>
          <td>{new Date(movement.scheduled_time).toLocaleDateString()}</td>
          <td>{movement.movement_type}</td>
          <td>{movement.flight_number}</td>
          <td>{movement.registration}</td>
          <td>{movement.aircraft_type}</td>
          <td>
            {movement.movement_type === 'ARR' ? movement.origin_iata : movement.destination_iata}
          </td>
          <td>
            {(movement.pax_arr_full || 0) + (movement.pax_arr_half || 0) +
             (movement.pax_dep_full || 0) + (movement.pax_dep_half || 0)}
          </td>
          <td>
            <button onClick={() => createInvoiceFromMovement(movement.id)}>
              Facturer
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### PROBLÈME 5: Facture PDF complète ⚠️ COMPLEXE

**Approche recommandée:**

1. **Créer composant `InvoicePDF.tsx`**

```typescript
interface InvoiceData {
  invoice_number: string
  created_at: string
  customer: string
  aircraft_type: string
  registration: string
  mtow_kg: number
  traffic_type: string
  // Redevances
  landing_fee_xof: number
  parking_fee_xof: number
  lighting_fee_xof: number
  passenger_fee_xof: number
  security_fee_xof: number
  freight_fee_xof: number
  fuel_fee_xof: number
  overtime_fee_xof: number
  // Totaux
  subtotal_xof: number
  tax_xof: number
  discount_xof: number
  total_xof: number
  // Détails
  pax_total: number
  parking_hours: number
  calculation_details: any
}

export function InvoicePDF({ invoice, airport }: { invoice: InvoiceData, airport: any }) {
  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* En-tête */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>{airport.name}</h1>
        <p>{airport.city}, {airport.country}</p>
        <p>Code OACI: {airport.icao_code} | Code IATA: {airport.iata_code}</p>
      </div>

      {/* Titre */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <h2>FACTURE N° {invoice.invoice_number}</h2>
        <p>Date: {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
      </div>

      {/* Informations client */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Client</h3>
        <p><strong>{invoice.customer}</strong></p>
      </div>

      {/* Informations vol */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Informations du vol</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td><strong>Immatriculation:</strong></td>
            <td>{invoice.registration}</td>
            <td><strong>Type avion:</strong></td>
            <td>{invoice.aircraft_type}</td>
          </tr>
          <tr>
            <td><strong>MTOW:</strong></td>
            <td>{invoice.mtow_kg} kg</td>
            <td><strong>Trafic:</strong></td>
            <td>{invoice.traffic_type === 'NAT' ? 'National' : 'International'}</td>
          </tr>
          <tr>
            <td><strong>Passagers:</strong></td>
            <td>{invoice.pax_total}</td>
            <td><strong>Temps stationnement:</strong></td>
            <td>{invoice.parking_hours?.toFixed(2)} h</td>
          </tr>
        </table>
      </div>

      {/* Détail redevances */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Détail des redevances</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Désignation</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Montant (XOF)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.landing_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance d'atterrissage</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.landing_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.parking_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance de stationnement</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.parking_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.lighting_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Balisage lumineux</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.lighting_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.passenger_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance passagers ({invoice.pax_total} PAX)</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.passenger_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.security_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance sûreté</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.security_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.freight_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance fret</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.freight_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.fuel_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Redevance carburant</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.fuel_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.overtime_fee_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Horaires exceptionnels</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.overtime_fee_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              <td style={{ border: '1px solid #000', padding: '8px' }}>Sous-total</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                {invoice.subtotal_xof.toLocaleString('fr-FR')}
              </td>
            </tr>
            {invoice.discount_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Remise</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  -{invoice.discount_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            {invoice.tax_xof > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Taxes</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                  {invoice.tax_xof.toLocaleString('fr-FR')}
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold', fontSize: '18px', backgroundColor: '#e0e0e0' }}>
              <td style={{ border: '1px solid #000', padding: '12px' }}>TOTAL À PAYER</td>
              <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'right' }}>
                {invoice.total_xof.toLocaleString('fr-FR')} XOF
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pied de page */}
      <div style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
        <p>Facture émise électroniquement - Ne nécessite pas de signature</p>
        <p>Conditions de paiement: 30 jours à compter de la date d'émission</p>
      </div>
    </div>
  )
}
```

2. **Fonction d'export PDF** (utiliser `html2pdf` ou `jspdf`):

```typescript
const generatePDF = async (invoiceId: string) => {
  // Charger données facture
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, airports(*)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return

  // Générer HTML
  const element = document.createElement('div')
  element.innerHTML = renderToString(<InvoicePDF invoice={invoice} airport={invoice.airports} />)

  // Convertir en PDF (nécessite librairie)
  // Option 1: html2pdf.js
  html2pdf()
    .from(element)
    .save(`facture_${invoice.invoice_number}.pdf`)

  // Option 2: window.print()
  const printWindow = window.open('', '_blank')
  printWindow.document.write(element.innerHTML)
  printWindow.document.close()
  printWindow.print()
}
```

### PROBLÈME 6: Page Admin Billing Settings ⚠️ NOUVELLE PAGE

**Créer:** `src/pages/BillingSettings.tsx`

```typescript
import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'

interface BillingSetting {
  id: string
  airport_id: string | null
  fee_type: string
  fee_subtype: string | null
  description: string
  value: number
  currency: string
  unit: string | null
  is_active: boolean
  metadata: any
}

export function BillingSettings() {
  const { user } = useAuth()
  const { showToast, ToastComponent } = useToast()
  const [settings, setSettings] = useState<BillingSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Vérifier permissions ADMIN
  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Accès refusé</h2>
          <p>Seuls les administrateurs peuvent accéder aux paramètres de facturation.</p>
        </div>
      </Layout>
    )
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('billing_settings')
      .select('*')
      .order('fee_type, fee_subtype')

    if (error) {
      showToast('Erreur chargement paramètres', 'error')
    } else {
      setSettings(data || [])
    }
    setLoading(false)
  }

  const updateSetting = async (id: string, newValue: number) => {
    const { error } = await supabase
      .from('billing_settings')
      .update({
        value: newValue,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      showToast('Erreur mise à jour', 'error')
    } else {
      showToast('Paramètre mis à jour', 'success')
      setEditingId(null)
      loadSettings()
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('billing_settings')
      .update({ is_active: !currentActive })
      .eq('id', id)

    if (error) {
      showToast('Erreur', 'error')
    } else {
      showToast(`Paramètre ${!currentActive ? 'activé' : 'désactivé'}`, 'success')
      loadSettings()
    }
  }

  // Grouper par type
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.fee_type]) {
      acc[setting.fee_type] = []
    }
    acc[setting.fee_type].push(setting)
    return acc
  }, {} as Record<string, BillingSetting[]>)

  return (
    <Layout>
      {ToastComponent}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px' }}>
          ⚙️ Paramètres de Facturation
        </h1>

        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ margin: 0, color: '#92400e' }}>
            <strong>⚠️ Attention:</strong> Les modifications affectent immédiatement le calcul des nouvelles factures.
            Assurez-vous de vérifier les montants avant validation.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
        ) : (
          Object.entries(groupedSettings).map(([feeType, typeSettings]) => (
            <div key={feeType} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
                {getFeeTypeLabel(feeType)}
              </h2>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'right', width: '150px' }}>Valeur</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Devise</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>Unité</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Actif</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typeSettings.map(setting => (
                    <tr key={setting.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>
                        <div>{setting.description}</div>
                        {setting.metadata && Object.keys(setting.metadata).length > 0 && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {JSON.stringify(setting.metadata)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {editingId === setting.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              updateSetting(setting.id, parseFloat(editValue))
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateSetting(setting.id, parseFloat(editValue))
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '2px solid #3b82f6',
                              borderRadius: '4px',
                              textAlign: 'right'
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingId(setting.id)
                              setEditValue(setting.value.toString())
                            }}
                            style={{ cursor: 'pointer', fontWeight: 600 }}
                          >
                            {setting.value.toLocaleString('fr-FR')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{setting.currency}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        {setting.unit || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleActive(setting.id, setting.is_active)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: setting.is_active ? '#10b981' : '#ef4444',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {setting.is_active ? 'OUI' : 'NON'}
                        </button>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingId(setting.id)
                            setEditValue(setting.value.toString())
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}

function getFeeTypeLabel(feeType: string): string {
  const labels: Record<string, string> = {
    'LANDING': '🛬 Redevances d\'atterrissage',
    'PARKING': '🅿️ Redevances de stationnement',
    'LIGHTING': '💡 Balisage lumineux',
    'PASSENGER': '👥 Redevances passagers',
    'SECURITY': '🔒 Redevances sûreté',
    'FREIGHT': '📦 Redevances fret',
    'FUEL': '⛽ Redevances carburant',
    'OVERTIME': '🕐 Horaires exceptionnels'
  }
  return labels[feeType] || feeType
}
```

**Ajouter route dans `App.tsx`:**

```typescript
import { BillingSettings } from './pages/BillingSettings'

// Dans les routes:
<Route path="/billing-settings" element={<ProtectedRoute><BillingSettings /></ProtectedRoute>} />
```

**Ajouter lien dans `Layout.tsx`:**

```typescript
{user?.role === 'ADMIN' && (
  <Link to="/billing-settings" style={linkStyle}>
    ⚙️ Paramètres Facturation
  </Link>
)}
```

---

## ✅ RÉSUMÉ DES ACTIONS

### Migrations SQL
- ✅ Code OACI ajouté dans `aircrafts`
- ✅ `is_invoiced` ajouté dans `aircraft_movements`
- ✅ Table `billing_settings` créée avec tarifs par défaut
- ✅ Colonnes détaillées dans `invoices`
- ✅ Vue `movements_enriched` créée
- ✅ Fonction `get_dashboard_stats()` créée
- ✅ Index performance créés
- ✅ RLS configuré

### Frontend À faire
- ⚠️ Diagnostiquer erreur création aéroport
- ⚠️ Retirer facturation de Movements
- ⚠️ Ajouter indicateur "FACTURÉ"
- ⚠️ Bloquer édition si facturé
- ⚠️ Modifier page Billing (mouvements non facturés)
- ⚠️ Créer composant InvoicePDF
- ⚠️ Créer page BillingSettings
- ⚠️ Implémenter calcul automatique redevances
- ⚠️ Implémenter génération PDF

### Tests nécessaires
- Test création aéroport
- Test verrouillage mouvement facturé
- Test calcul redevances ivoiriennes
- Test génération numéro facture unique
- Test Dashboard statistiques
- Test performance avec 10000+ mouvements

---

**Document créé:** 2025-11-18
**Migrations:** 2/2 appliquées ✅
**Frontend:** 0/9 complété ⚠️
**Estimation temps:** 8-12 heures de développement restant

