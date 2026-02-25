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
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!stripeSecretKey) return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500, corsHeaders);
    if (!appUrl) return json({ error: 'Missing APP_URL' }, 500, corsHeaders);
    if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Missing Supabase env vars' }, 500, corsHeaders);

    const authHeader = req.headers.get('Authorization') || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const payload = await req.json();

    const amount = Number(payload?.amount || 0);
    const currency = String(payload?.currency || 'eur').toLowerCase();
    const type = String(payload?.type || 'generic');
    const label = payload?.label ? String(payload.label) : 'Paiement Événéo';

    const providerId = payload?.providerId ? String(payload.providerId) : '';
    const providerName = payload?.providerName ? String(payload.providerName) : '';
    const date = payload?.date ? String(payload.date) : '';
    const duration = payload?.duration ? String(payload.duration) : '';
    const serviceStartAt = payload?.serviceStartAt ? String(payload.serviceStartAt) : '';
    const serviceEndAt = payload?.serviceEndAt ? String(payload.serviceEndAt) : '';
    const addOns = payload?.addOns ? String(payload.addOns) : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Invalid amount' }, 400, corsHeaders);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const unitAmount = Math.round(amount * 100);

    const successUrl = `${appUrl}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/#/payment/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: authData.user.id,
      metadata: {
        type,
        providerId,
        providerName,
        date,
        duration,
        serviceStartAt,
        serviceEndAt,
        addOns,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: label,
            },
          },
        },
      ],
    });

    return json({ url: session.url }, 200, corsHeaders);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500, corsHeaders);
  }
});
