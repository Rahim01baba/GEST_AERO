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
      .from('movements')
      .select('*, aircrafts(*)')
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

    const { data: billingRates, error: ratesError } = await adminClient
      .from('billing_rates')
      .select('*')
      .eq('airport_id', airport_id)
      .maybeSingle();

    if (ratesError) {
      console.error('Rates fetch error:', ratesError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch billing rates',
            details: ratesError.message,
          },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!billingRates) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No billing rates configured for this airport',
          },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lineItems = movements.map((movement: any) => {
      const mtow = movement.mtow_kg || movement.aircrafts?.mtow_kg || 0;
      const mtowTonnes = mtow / 1000;
      const isInternational = movement.traffic_type === 'INT';

      let landingFee = 0;
      let parkingFee = 0;
      let passengerFee = 0;

      if (movement.movement_type === 'ARR') {
        landingFee = mtowTonnes * (isInternational ? billingRates.landing_fee_int : billingRates.landing_fee_nat);

        const pax = (movement.pax_arr || 0) - (movement.connecting_pax || 0);
        passengerFee = pax * (isInternational ? billingRates.pax_fee_int : billingRates.pax_fee_nat);
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
