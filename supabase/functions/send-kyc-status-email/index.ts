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
    const url = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!url || !anonKey || !serviceKey) {
      return json({ error: 'Missing Supabase environment variables' }, 500, corsHeaders);
    }

    const authHeader = req.headers.get('Authorization') || '';

    const supabaseAuth = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const supabaseService = createClient(url, serviceKey);

    const { data: invokerProfile, error: invokerError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (invokerError) {
      return json({ error: `Invoker profile error: ${invokerError.message}` }, 403, corsHeaders);
    }

    if (invokerProfile?.role !== 'ADMIN') {
      return json({ error: 'Forbidden' }, 403, corsHeaders);
    }

    const payload = await req.json();
    const userId = String(payload?.userId || '').trim();
    const status = String(payload?.status || '').trim();
    const reason = payload?.reason ? String(payload.reason) : '';

    if (!userId || (status !== 'approved' && status !== 'rejected')) {
      return json({ error: 'Invalid payload' }, 400, corsHeaders);
    }

    const { data: targetProfile, error: targetError } = await supabaseService
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile?.email) {
      return json({ error: `Target profile error: ${targetError?.message || 'missing email'}` }, 400, corsHeaders);
    }

    const brevoKey = Deno.env.get('BREVO_API_KEY') || '';
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || '';
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Eveneo';

    if (!brevoKey) {
      return json({ error: 'Missing BREVO_API_KEY' }, 500, corsHeaders);
    }
    if (!senderEmail) {
      return json({ error: 'Missing BREVO_SENDER_EMAIL' }, 500, corsHeaders);
    }

    const subject = status === 'approved'
      ? 'Votre vérification Événéo est approuvée'
      : 'Votre vérification Événéo a été refusée';

    const name = (targetProfile.full_name || '').trim() || 'Bonjour';

    const html = status === 'approved'
      ? `<p>${name},</p><p>Votre vérification d'identité a été approuvée. Vous pouvez maintenant recevoir des demandes et être payé sur Événéo.</p><p>L'équipe Événéo</p>`
      : `<p>${name},</p><p>Votre vérification d'identité a été refusée.</p>${reason ? `<p>Motif: ${reason}</p>` : ''}<p>Merci de soumettre de nouveaux documents depuis votre espace prestataire.</p><p>L'équipe Événéo</p>`;

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: targetProfile.email,
            name: targetProfile.full_name || undefined,
          },
        ],
        subject,
        htmlContent: html,
      }),
    });

    if (!emailRes.ok) {
      const txt = await emailRes.text();
      return json({ error: `Brevo error: ${txt}` }, 500, corsHeaders);
    }

    return json({ ok: true }, 200, corsHeaders);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500, corsHeaders);
  }
});
