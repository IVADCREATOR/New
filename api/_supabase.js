// Utilitários compartilhados pelas funções da pasta /api.
// Arquivos com "_" no início não viram rota na Vercel.
//
// O projeto usa "type": "module" no package.json, então todas as funções
// precisam ser ES Modules (import/export). Misturar require/module.exports
// aqui derruba a função inteira na hora de carregar (FUNCTION_INVOCATION_FAILED).

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function assertServerConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('server configuration missing');
    error.code = 'CONFIG';
    throw error;
  }
}

export function supabaseUrl() {
  assertServerConfig();
  return SUPABASE_URL;
}

export function serviceRoleKey() {
  assertServerConfig();
  return SUPABASE_SERVICE_ROLE_KEY;
}

export async function supabaseRequest(path, options = {}) {
  assertServerConfig();
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const error = new Error('database request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function getUserFromAccessToken(accessToken) {
  assertServerConfig();
  if (!accessToken) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) return null;
  return response.json();
}

export function bearerToken(req) {
  const value = String(req.headers.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

// A Vercel normalmente já entrega req.body como objeto quando o
// Content-Type é JSON, mas isso não é garantido em todos os casos.
export function readJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    try { return JSON.parse(String(body) || '{}'); } catch { return null; }
  }
  return {};
}

// Conta administradora ativa, validada no servidor com a service role.
export async function isActiveAdmin(userId) {
  if (!userId) return false;
  const rows = await supabaseRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,account_status&limit=1`);
  const profile = rows?.[0];
  return profile?.role === 'admin' && (profile?.account_status || 'active') === 'active';
}

export async function requireAdmin(req) {
  const user = await getUserFromAccessToken(bearerToken(req));
  if (!user?.id) return null;
  return (await isActiveAdmin(user.id)) ? user : null;
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
