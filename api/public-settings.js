import { supabaseRequest, sendJson } from './_supabase.js';

// Configurações públicas que o frontend precisa para funcionar, mas que
// preferimos manter fora do código-fonte (facilita trocar sem novo deploy).
// Nenhuma delas é secreta: o ID do Google Analytics e a site key do Turnstile
// são, por natureza, valores que rodam no navegador da pessoa visitante.
const PUBLIC_KEYS = ['ga_measurement_id', 'turnstile_site_key'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, max-age=300');
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { ok: false, message: 'Ação não disponível.' });
    }
    const rows = await supabaseRequest(`/rest/v1/site_settings?key=in.(${PUBLIC_KEYS.join(',')})&select=key,value`);
    const settings = Object.fromEntries((rows || []).map((x) => [x.key, x.value]));
    return sendJson(res, 200, {
      ok: true,
      ga_measurement_id: settings.ga_measurement_id || null,
      turnstile_site_key: settings.turnstile_site_key || null
    });
  } catch (error) {
    console.error('public-settings error', error?.status || '', error?.data || error?.message || error);
    // Nunca travar o carregamento do site por causa disso.
    return sendJson(res, 200, { ok: true, ga_measurement_id: null, turnstile_site_key: null });
  }
}
