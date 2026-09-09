// Middleware de borda (Vercel Edge) — roda ANTES de qualquer página ser
// entregue ao navegador. É isso que torna a manutenção "de verdade":
// enquanto o guard em app.js só reage depois que a página já carregou,
// isto aqui impede a página real de sair do servidor.
//
// Importante: isto roda no runtime de Edge (sem Node.js, sem `require`),
// por isso usa só `fetch`/`Request`/`Response` padrão da Web — funciona
// em qualquer projeto Vercel, independente de framework.

export const config = {
  matcher: ['/((?!api/|controle-8f4c2e91|_vercel|.*\\.[\\w]+$).*)']
};

function paginaManutencao(state) {
  const titulo = escapeHtml(state.title || 'Estamos em manutenção');
  const mensagem = escapeHtml(state.message || 'O site está passando por algumas melhorias no momento.');
  const imagem = state.image_url ? escapeHtml(state.image_url) : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex,nofollow" />
<title>${titulo} — Sorasaki</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:radial-gradient(circle at 50% 18%,rgba(143,75,255,.22),transparent 38%),#04030a;color:#fff}
.card{width:min(640px,100%);padding:32px;text-align:center;border:1px solid rgba(196,128,255,.24);border-radius:24px;background:linear-gradient(145deg,rgba(26,18,39,.98),rgba(9,9,16,.98))}
.card img{width:min(420px,100%);border-radius:18px;margin-bottom:20px}
h1{margin:0 0 12px;font-size:clamp(22px,5vw,34px);background:linear-gradient(90deg,#fff,#c996ff);-webkit-background-clip:text;background-clip:text;color:transparent}
p{color:#a7a0b2;font-size:14px;line-height:1.7;white-space:pre-line}
</style></head><body><div class="card">${imagem ? `<img src="${imagem}" alt="" />` : ''}<h1>${titulo}</h1><p>${mensagem}</p></div></body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  try {
    const stateRes = await fetch(`${url.origin}/api/site-state`, { headers: { accept: 'application/json' } });
    if (!stateRes.ok) return;
    const state = await stateRes.json();
    if (!state?.maintenance) return;
    if (state.start_at) {
      const start = new Date(state.start_at).getTime();
      if (!Number.isNaN(start) && Date.now() < start) return;
    }
    return new Response(paginaManutencao(state), {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'retry-after': '120',
        'cache-control': 'no-store'
      }
    });
  } catch {
    // Se a checagem falhar, deixa o site normal seguir — nunca travar
    // o site inteiro por causa de uma falha ao consultar o estado.
    return;
  }
}
