const { supabaseRequest, getUserFromAccessToken, bearerToken } = require('./_supabase');

const KEYS = new Set([
  'max_group_submissions_per_24h',
  'community_submissions_enabled',
  'maintenance_mode',
  'maintenance_start_at',
  'maintenance_title',
  'maintenance_message',
  'maintenance_return_at'
]);

function json(res, status, body) {
  res.status(status).json(body);
}

function isBool(value) {
  return typeof value === 'boolean';
}

function cleanValue(key, value) {
  if (key === 'max_group_submissions_per_24h') {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error('O limite de divulgações precisa estar entre 1 e 50.');
    return n;
  }
  if (key === 'community_submissions_enabled' || key === 'maintenance_mode') {
    if (!isBool(value)) throw new Error('Valor inválido para uma configuração booleana.');
    return value;
  }
  if (key === 'maintenance_start_at' || key === 'maintenance_return_at') {
    if (value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error('Data de manutenção inválida.');
    return d.toISOString();
  }
  if (key === 'maintenance_title') {
    const text = String(value ?? '').trim();
    if (text.length > 120) throw new Error('O título da manutenção é muito longo.');
    return text || '🔧 Estamos em manutenção';
  }
  if (key === 'maintenance_message') {
    const text = String(value ?? '').trim();
    if (text.length > 1000) throw new Error('A mensagem da manutenção é muito longa.');
    return text || 'O site está passando por algumas melhorias no momento.';
  }
  throw new Error('Configuração não permitida.');
}

async function requireAdmin(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const authUser = await getUserFromAccessToken(token);
  if (!authUser?.id) return null;
  const rows = await supabaseRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(authUser.id)}&select=role,account_status&limit=1`);
  const profile = rows?.[0];
  if (profile?.role !== 'admin' || profile?.account_status !== 'active') return null;
  return authUser;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return json(res, 405, { ok: false, message: 'Método não permitido.' });
  }

  try {
    const admin = await requireAdmin(req);
    if (!admin) return json(res, 403, { ok: false, message: 'Acesso administrativo necessário.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Object.entries(body).filter(([key]) => KEYS.has(key));
    if (!entries.length) return json(res, 400, { ok: false, message: 'Nenhuma configuração válida foi enviada.' });

    // Só usa key/value. Isso mantém compatibilidade com instalações antigas
    // onde colunas opcionais como updated_by ainda não existiam.
    const rows = entries.map(([key, value]) => ({ key, value: cleanValue(key, value) }));
    const saved = await supabaseRequest('/rest/v1/site_settings?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(rows)
    });

    return json(res, 200, { ok: true, settings: saved });
  } catch (error) {
    console.error('admin-settings error', error);
    if (error?.message?.includes('configuração') || error?.message?.includes('limite') || error?.message?.includes('Data') || error?.message?.includes('título') || error?.message?.includes('mensagem')) {
      return json(res, 400, { ok: false, message: error.message });
    }
    return json(res, 500, { ok: false, message: 'Não foi possível salvar as configurações agora.' });
  }
};
