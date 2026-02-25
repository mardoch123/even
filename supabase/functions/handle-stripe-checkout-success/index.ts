import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!stripeSecretKey) return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500, corsHeaders);
    if (!supabaseUrl || !serviceKey) return json({ error: 'Missing Supabase env vars' }, 500, corsHeaders);

    const authHeader = req.headers.get('Authorization') || '';

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const payload = await req.json();
    const sessionId = String(payload?.sessionId || '').trim();
    if (!sessionId) return json({ error: 'Missing sessionId' }, 400, corsHeaders);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    if (!session) return json({ error: 'Stripe session not found' }, 404, corsHeaders);

    if (session.payment_status !== 'paid') {
      return json({ error: 'Payment not completed', payment_status: session.payment_status }, 400, corsHeaders);
    }

    const clientId = String(session.client_reference_id || '');
    if (!clientId || clientId !== authData.user.id) {
      return json({ error: 'Forbidden' }, 403, corsHeaders);
    }

    const type = String((session.metadata as any)?.type || 'generic');
    const providerId = String((session.metadata as any)?.providerId || '');
    const providerName = String((session.metadata as any)?.providerName || '');
    const date = String((session.metadata as any)?.date || '');
    const serviceStartAt = String((session.metadata as any)?.serviceStartAt || '');
    const serviceEndAt = String((session.metadata as any)?.serviceEndAt || '');
    const addOns = String((session.metadata as any)?.addOns || '');

    const supabase = createClient(supabaseUrl, serviceKey);

    const exists = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (!exists.error && exists.data?.id) {
      return json({ ok: true, alreadyProcessed: true }, 200, corsHeaders);
    }

    const totalAmount = (session.amount_total || 0) / 100;

    await supabase.from('payments').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof (session as any).payment_intent === 'string' ? (session as any).payment_intent : ((session as any).payment_intent?.id || null),
      client_id: clientId,
      amount: totalAmount,
      currency: session.currency,
      type,
      status: 'paid',
      metadata: session.metadata || {},
    });

    if (type === 'service_booking') {
      if (providerId && date) {
        const { data: createdEvent, error: evErr } = await supabase
          .from('events')
          .insert({
            client_id: clientId,
            name: providerName ? `Réservation - ${providerName}` : 'Réservation',
            date,
            status: 'confirmed',
            total_cost: totalAmount,
          })
          .select()
          .single();

        if (evErr) return json({ error: evErr.message }, 500, corsHeaders);

        const selectedAddOns = addOns
          ? addOns.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const itemRes = await supabase
          .from('event_items')
          .insert({
            event_id: createdEvent.id,
            provider_id: providerId,
            price: totalAmount,
            status: 'confirmed',
            selected_add_ons: selectedAddOns,
            paid_to_provider: false,
            service_start_at: serviceStartAt || null,
            service_end_at: serviceEndAt || null,
          });

        if (itemRes.error) return json({ error: itemRes.error.message }, 500, corsHeaders);
      }
    }

    return json({ ok: true }, 200, corsHeaders);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500, corsHeaders);
  }
});
