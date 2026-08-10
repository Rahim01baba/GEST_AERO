import { createClient } from 'jsr:@supabase/supabase-js@2';
import { InvoicePreviewSchema } from '../_shared/schemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

function checkRateLimit(userId: string, action: string): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 20;

  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }

  if (rateLimitStore[key].count >= maxRequests) {
    return false;
  }

  rateLimitStore[key].count++;
  return true;
}

// Bareme atterrissage (XOF/tonne), aligne sur src/lib/billing.ts::calculateLandingFee.
// Les lignes billing_settings de type LANDING sont seedees a 0 et ne distinguent pas
// NAT/INT (voir CORRECTIONS_COMPLETES_SYSTEME_FACTURATION.md) : on garde donc le
// meme bareme code en dur ici plutot que de les lire.
function calculateLandingFee(mtowKg: number, isInternational: boolean): number {
    const mtowTonnes = Math.ceil(mtowKg / 1000);
    let ratePerTonne = 0;
    if (!isInternational) {
          if (mtowKg <= 14000) ratePerTonne = 367;
          else if (mtowKg <= 25000) ratePerTonne = 1206;
          else if (mtowKg <= 75000) ratePerTonne = 2410;
          else if (mtowKg <= 150000) ratePerTonne = 3055;
          else ratePerTonne = 3873;
    } else {
          if (mtowKg <= 14000) ratePerTonne = 0;
          else if (mtowKg <= 25000) ratePerTonne = 1604;
          else if (mtowKg <= 75000) ratePerTonne = 3208;
          else if (mtowKg <= 150000) ratePerTonne = 4504;
          else ratePerTonne = 4230;
    }
    return mtowTonnes * ratePerTonne;
}

// NOTE: il n'existe pas de table billing_rates a plat dans le schema reel ; les
// tarifs sont geres via billing_settings (fee_type/fee_subtype/value). Cette
// fonction charge les tarifs PASSENGER actifs, avec repli sur les valeurs par
// defaut si la table est vide/inaccessible.
async function loadPassengerRates(adminClient: any, airportId: string | null) {
    const rates = { national: 1000, international: 3000 };
    try {
          const { data } = await adminClient
                  .from('billing_settings')
                  .select('fee_subtype, value, airport_id')
                  .eq('is_active', true)
                  .eq('fee_type', 'PASSENGER');
          for (const row of (data ?? []).filter((r: any) => !r.airport_id || r.airport_id === airportId)) {
                  if (row.value === null || row.value === undefined) continue;
                  if (row.fee_subtype === 'NATIONAL') rates.national = row.value;
                  else if (row.fee_subtype === 'INTERNATIONAL') rates.international = row.value;
          }
    } catch {
          return rates;
    }
    return rates;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Authorization header missing' },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(user.id, 'invoice_preview')) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validation = InvoicePreviewSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.errors,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { movement_ids, airport_id } = validation.data;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: movements, error: movementsError } = await adminClient
      .from('aircraft_movements')
      .select('*')
      .in('id', movement_ids);

    if (movementsError) {
      console.error('Movements fetch error:', movementsError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch movements',
            details: movementsError.message,
          },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passengerRates = await loadPassengerRates(adminClient, airport_id ?? null);
    const lineItems = (movements ?? []).map((movement: any) => {
      const mtow = movement.mtow_kg || 0;
      const mtowTonnes = mtow / 1000;
      const isInternational = movement.traffic_type === 'INT';

      let landingFee = 0;
      let parkingFee = 0;
      let passengerFee = 0;

      if (movement.movement_type === 'ARR') {
        landingFee = calculateLandingFee(mtow, isInternational);

        const pax = (movement.pax_arr_full || 0) + (movement.pax_arr_half || 0) - (movement.pax_connecting || 0);
        passengerFee = Math.max(0, pax) * (isInternational ? passengerRates.international : passengerRates.national);
      }

      return {
        movement_id: movement.id,
        registration: movement.registration,
        movement_type: movement.movement_type,
        landing_fee: landingFee,
        parking_fee: parkingFee,
        passenger_fee: passengerFee,
        total: landingFee + parkingFee + passengerFee,
      };
    });

    const total = lineItems.reduce((sum: number, item: any) => sum + item.total, 0);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          line_items: lineItems,
          subtotal: total,
          tax: 0,
          total: total,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
