/* =========================================================================
   SORASAKI — script compartilhado por todas as páginas
   Organização:
     1. Utilidades (formatação, mensagens, botões ocupados)
     2. Estatísticas do bot (ponte) — onStats / onConnection / onFetchError
     3. Cabeçalho, menu lateral e navegação
     4. Conta: login, cadastro, recuperação de senha, perfil
     5. Manutenção, visitas e preferências
     6. Assistente (perguntas frequentes)
     7. Inicialização
   Páginas usam window.Sora (utilidades) e window.SorasakiAuth (conta).
   ========================================================================= */

/* ===== 0. Analytics e proteção contra robôs (config vem do Supabase, não do código) ===== */
(function () {
  try {
    if (!sessionStorage.getItem("sora_entry_page")) {
      sessionStorage.setItem("sora_entry_page", location.pathname + location.search);
      sessionStorage.setItem("sora_entry_ref", document.referrer || "");
    }
  } catch {}
})();

let configPublicaPromise = null;
function carregarConfigPublica() {
  if (!configPublicaPromise) {
    configPublicaPromise = fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return configPublicaPromise;
}

function ligarGoogleAnalytics(id) {
  if (!id || window.__soraGaLigado) return;
  window.__soraGaLigado = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  // anonymize_ip: a localização detalhada já é registrada à parte (no
  // cadastro, via cabeçalhos do servidor); aqui o GA fica só com o
  // comportamento de navegação, sem precisar do IP completo.
  window.gtag("config", id, { anonymize_ip: true });
}

let turnstileScriptPromise = null;
function garantirScriptTurnstile() {
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve) => {
      if (window.turnstile) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }
  return turnstileScriptPromise;
}

function iniciarConfigPublica() {
  carregarConfigPublica().then((cfg) => { if (cfg?.ga_measurement_id) ligarGoogleAnalytics(cfg.ga_measurement_id); });
}

/* ===== 1. Utilidades ===== */
const MAPA_ESCAPE_HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/[&<>"']/g, (c) => MAPA_ESCAPE_HTML[c]);
}
function fmtNumero(n) {
  return new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
}
function fmtUptime(ms) {
  if (!ms || ms < 1000) return "0m";
  const s = Math.floor(ms / 1000);
  const dias = Math.floor(s / 86400);
  const horas = Math.floor((s % 86400) / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  if (!dias && !horas && !minutos) return `${s}s`;
  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (horas || dias) partes.push(`${horas}h`);
  partes.push(`${minutos}m`);
  return partes.join(" ");
}
function fmtHora(ts) {
  if (!ts) return "—";
  const data = new Date(ts);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
function fmtData(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
}
function fmtPing(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  return Number(ms) < 1 ? "< 1 ms" : `${Math.round(Number(ms))} ms`;
}
function fmtMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

window.Sora = (function () {
  const ICONS = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.1 7.4 7.4 2.1-7.4 2.1L12 21.5l-2.1-7.4L2.5 12l7.4-2.1z" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.8a3.3 3.3 0 010 6.4M18.5 14.8c1.7.8 2.8 2.6 3 5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l9.5 16.5h-19z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  function safeUrl(v) {
    if (!v || !String(v).trim()) return "";
    try {
      const u = new URL(String(v || ""), location.origin);
      return /^https?:$/.test(u.protocol) ? u.href : "";
    } catch { return ""; }
  }

  // Mensagens para o visitante: nunca mostrar detalhes técnicos.
  function friendlyError(error, fallback = "Não foi possível concluir esta ação. Tente novamente.") {
    const m = String(error?.message || error || "").toLowerCase();
    if (!navigator.onLine || m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed") || m.includes("load failed")) {
      return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    }
    if (m.includes("jwt") || m.includes("not authenticated") || error?.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
    if (m.includes("row-level security") || m.includes("permission denied") || error?.code === "42501") return "Você não tem permissão para esta ação.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.";
    return fallback;
  }

  let toastRegion = null;
  function toast(message, type = "info", ms = 4200) {
    if (!toastRegion) {
      toastRegion = document.createElement("div");
      toastRegion.className = "toast-region";
      toastRegion.setAttribute("role", "status");
      toastRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRegion);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    toastRegion.appendChild(el);
    setTimeout(() => { el.classList.add("leaving"); setTimeout(() => el.remove(), 300); }, ms);
  }

  // Botão em estado de carregamento: desativa, troca o texto e restaura depois.
  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      if (btn.dataset.idleHtml === undefined) btn.dataset.idleHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      if (label) btn.textContent = label;
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      if (btn.dataset.idleHtml !== undefined) { btn.innerHTML = btn.dataset.idleHtml; delete btn.dataset.idleHtml; }
    }
  }

  // Ação destrutiva em dois toques: o primeiro pede confirmação no próprio botão.
  function confirmTap(btn, confirmLabel = "Toque para confirmar") {
    if (btn.dataset.confirming === "1") {
      clearTimeout(Number(btn.dataset.confirmTimer));
      delete btn.dataset.confirming;
      if (btn.dataset.confirmIdle !== undefined) { btn.innerHTML = btn.dataset.confirmIdle; delete btn.dataset.confirmIdle; }
      return true;
    }
    btn.dataset.confirming = "1";
    btn.dataset.confirmIdle = btn.innerHTML;
    btn.textContent = confirmLabel;
    btn.dataset.confirmTimer = String(setTimeout(() => {
      delete btn.dataset.confirming;
      if (btn.dataset.confirmIdle !== undefined) { btn.innerHTML = btn.dataset.confirmIdle; delete btn.dataset.confirmIdle; }
    }, 4000));
    return false;
  }

  function showResult(el, type, message) {
    if (!el) return;
    el.className = `${el.classList.contains("form-result") ? "form-result" : "auth-result"} ${type || ""}`.trim();
    el.textContent = message || "";
  }

  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { cache: "no-store", ...options, headers: { Accept: "application/json", ...(options.headers || {}) }, signal: controller.signal });
      let body = null;
      try { body = await resp.json(); } catch {}
      return { ok: resp.ok, status: resp.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  function emptyState(title, text = "", { icon = "info", retry = false } = {}) {
    return `<div class="empty-state"><span class="empty-state-icon">${ICONS[icon] || ICONS.info}</span><strong>${escapeHtml(title)}</strong>${text ? `<span>${escapeHtml(text)}</span>` : ""}${retry ? '<button class="btn btn-sm" type="button" data-retry>Tentar novamente</button>' : ""}</div>`;
  }

  function initials(name) {
    const clean = String(name || "").replace(/[^\p{L}\p{N} ]/gu, " ").trim();
    return (clean.split(/\s+/).slice(0, 2).map((p) => p[0]).join("") || "S").toUpperCase();
  }

  // Estado público do site (manutenção, envio de divulgações). Uma chamada por página.
  let siteStatePromise = null;
  function siteState() {
    if (!siteStatePromise) {
      siteStatePromise = fetchJson("/api/site-state", {}, 8000)
        .then((r) => (r.ok && r.body ? r.body : { maintenance: false, submissions_enabled: true, max_submissions_24h: 5 }))
        .catch(() => ({ maintenance: false, submissions_enabled: true, max_submissions_24h: 5 }));
    }
    return siteStatePromise;
  }

  // Cores dos gráficos em sintonia com o tema.
  function chartTheme() {
    return {
      accent: "#b9a1ff", accentSoft: "rgba(185,161,255,.16)", second: "#8fb8ff", secondSoft: "rgba(143,184,255,.12)",
      grid: "rgba(255,255,255,.06)", text: "#8d899b", font: "Geist, system-ui, sans-serif"
    };
  }
  function applyChartDefaults() {
    if (!window.Chart) return false;
    const t = chartTheme();
    Chart.defaults.color = t.text;
    Chart.defaults.font.family = t.font;
    Chart.defaults.font.size = 12;
    Chart.defaults.borderColor = t.grid;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.tooltip.backgroundColor = "#24222d";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,.12)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleColor = "#f2f0f6";
    Chart.defaults.plugins.tooltip.bodyColor = "#bdb9c8";
    return true;
  }

  return { ICONS, safeUrl, friendlyError, toast, setBusy, confirmTap, showResult, fetchJson, emptyState, initials, siteState, chartTheme, applyChartDefaults };
})();

/* ===== 2. Estatísticas do bot (ponte) ===== */
const listeners = [];
const errorListeners = [];
const connectionListeners = [];
const INTERVALO_ATUALIZACAO_MS = 8000;
const TIMEOUT_FETCH_MS = 12000;
let ultimoSnapshot = null;

function onStats(callback) { listeners.push(callback); if (ultimoSnapshot) { try { callback(ultimoSnapshot); } catch (e) { console.error(e); } } }
function onFetchError(callback) { errorListeners.push(callback); }
function onConnection(callback) { connectionListeners.push(callback); }

function emitStats(snapshot) {
  ultimoSnapshot = snapshot;
  for (const cb of listeners) { try { cb(snapshot); } catch (e) { console.error("[SORASAKI]", e); } }
}
function emitError(mensagem) {
  for (const cb of errorListeners) { try { cb(mensagem); } catch (e) { console.error("[SORASAKI]", e); } }
}
function emitConnection(info) {
  for (const cb of connectionListeners) { try { cb(info); } catch (e) { console.error("[SORASAKI]", e); } }
}
function urlBase() {
  return String(window.SORASAKI_BRIDGE_URL || "").trim().replace(/\/+$/, "");
}

async function buscarStats() {
  const base = urlBase();
  const indisponivel = "Os dados do bot estão indisponíveis no momento. Tentaremos de novo em instantes.";
  if (!base) {
    emitConnection({ bridgeOnline: false, botDataReceived: false });
    emitError(indisponivel);
    return;
  }
  try {
    const stats = await Sora.fetchJson(`${base}/api/stats`, {}, TIMEOUT_FETCH_MS);
    if (!stats.ok || !stats.body || typeof stats.body !== "object") {
      emitConnection({ bridgeOnline: stats.status > 0 && stats.status < 500, botDataReceived: false });
      emitError(stats.status === 503 ? "Os dados do bot ainda estão chegando. Tente novamente em alguns instantes." : indisponivel);
      return;
    }
    const snapshot = stats.body.data && typeof stats.body.data === "object" ? stats.body.data : stats.body;
    emitStats(snapshot);
    emitConnection({ bridgeOnline: true, botDataReceived: true, lastUpdate: stats.body.timestamp || null });
  } catch (e) {
    console.warn("[SORASAKI] Estatísticas do bot:", e?.name === "AbortError" ? "tempo esgotado" : e);
    emitConnection({ bridgeOnline: false, botDataReceived: false });
    emitError(indisponivel);
  }
}

function bootstrapDashboard() {
  let falhasSeguidas = 0;
  let cronometro = null;
  function proximoAtraso(falhas) {
    if (falhas === 0) return INTERVALO_ATUALIZACAO_MS;
    const base = Math.min(INTERVALO_ATUALIZACAO_MS * 2 ** Math.min(falhas, 4), 120000);
    return Math.round(base + base * 0.2 * Math.random());
  }
  async function ciclo() {
    clearTimeout(cronometro);
    await buscarStats();
    if (document.visibilityState === "visible") cronometro = setTimeout(ciclo, proximoAtraso(falhasSeguidas));
  }
  onFetchError(() => { falhasSeguidas += 1; });
  onStats(() => { falhasSeguidas = 0; });
  ciclo();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { falhasSeguidas = 0; ciclo(); }
    else clearTimeout(cronometro);
  });
  window.SoraRefreshStats = ciclo;
}

function statusEfetivo(snapshot) {
  if (!snapshot || snapshot.status !== "online") return snapshot?.status || "offline";
  const quedas = snapshot.historico?.quedas || [];
  const agora = Date.now();
  const recentes = quedas.filter((q) => q.inicio && agora - new Date(q.inicio).getTime() < 15 * 60 * 1000).length;
  return recentes >= 2 ? "instavel" : "online";
}
function statusInfo(status) {
  const mapa = {
    online: { texto: "Bot online", classe: "online", curto: "Online" },
    instavel: { texto: "Bot instável", classe: "instavel", curto: "Instável" },
    reconectando: { texto: "Reconectando", classe: "reconectando", curto: "Reconectando" },
    conectando: { texto: "Conectando", classe: "conectando", curto: "Conectando" },
    offline: { texto: "Bot offline", classe: "offline", curto: "Offline" }
  };
  return mapa[status] || mapa.offline;
}

// Indicador de status do bot no cabeçalho (todas as páginas).
function ligarIndicadorDoBot() {
  const alvos = document.querySelectorAll("[data-bot-status]");
  if (!alvos.length) return;
  const pintar = (estado, texto) => alvos.forEach((el) => {
    el.dataset.state = estado;
    const t = el.querySelector("[data-bot-status-text]");
    if (t) t.textContent = texto;
    el.title = texto;
  });
  pintar("unknown", "Verificando o bot");
  onStats((s) => { const st = statusEfetivo(s); pintar(st, statusInfo(st).texto); });
  onConnection((c) => { if (!c.bridgeOnline && !ultimoSnapshot) pintar("unknown", "Status indisponível"); });
}

/* ===== 3. Cabeçalho, menu lateral e navegação ===== */
const SORA_NAV = [
  { grupo: "Explorar", itens: [
    ["/", "Início", "Visão geral do Sorasaki"],
    ["/grupos", "Grupos", "Comunidades revisadas pela equipe"],
    ["/catalogo", "Catálogo", "Produtos e serviços"],
    ["/noticias", "Notícias", "Novidades e avisos"]
  ] },
  { grupo: "Bot", itens: [
    ["/status", "Status", "Como o bot está agora"],
    ["/estatisticas", "Estatísticas", "Uso do bot e visitas ao site"],
    ["/uptime", "Disponibilidade", "Histórico de conexão"],
    ["/erros", "Ocorrências", "Falhas registradas"],
    ["/recursos", "Recursos", "O que o bot faz no grupo"]
  ] },
  { grupo: "Sorasaki", itens: [
    ["/sobre", "Sobre", "O projeto e a proposta"],
    ["/suporte", "Suporte", "Fale com a equipe"],
    ["/feedback", "Avaliações e bugs", "Avalie, sugira ou relate um problema"],
    ["/configuracoes", "Configurações", "Preferências deste aparelho"]
  ] }
];

function caminhoAtual() {
  let p = location.pathname.replace(/\/+$/, "").replace(/\.html$/, "") || "/";
  if (p === "/index") p = "/";
  return p;
}

function marcarNavAtiva() {
  const atual = caminhoAtual();
  document.querySelectorAll(".site-nav a, .sora-menu-link, .footer-col a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("#")[0].replace(/\.html$/, "") || "/";
    const ativo = href === atual;
    a.classList.toggle("active", ativo);
    if (ativo && !a.closest(".footer-col")) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function criarMenuSorasaki() {
  if (document.querySelector(".sora-drawer")) return;
  const trigger = document.querySelector(".menu-trigger");
  if (!trigger) return;

  const overlay = document.createElement("div");
  overlay.className = "sora-overlay";
  const drawer = document.createElement("aside");
  drawer.className = "sora-drawer";
  drawer.id = "soraDrawer";
  drawer.setAttribute("aria-label", "Menu do Sorasaki");
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="drawer-head">
      <a class="brand" href="/"><span class="brand-mark">${Sora.ICONS.star}</span><span class="brand-name">SORASAKI</span></a>
      <button class="icon-btn" type="button" data-close-drawer aria-label="Fechar menu">×</button>
    </div>
    <div class="drawer-body">
      <div class="drawer-account" data-drawer-account></div>
      <a class="btn btn-primary btn-block" href="/grupos#divulgar" style="margin-top:12px">Divulgar meu grupo</a>
      ${SORA_NAV.map((sec) => `
        <div class="drawer-label">${sec.grupo}</div>
        <div class="sora-menu-items">${sec.itens.map(([href, titulo, desc]) => `
          <a class="sora-menu-link" href="${href}"><span><strong>${titulo}</strong><small>${desc}</small></span><span class="menu-arrow" aria-hidden="true">›</span></a>`).join("")}
        </div>`).join("")}
    </div>`;
  trigger.setAttribute("aria-controls", "soraDrawer");
  document.body.append(overlay, drawer);

  function renderConta() {
    const box = drawer.querySelector("[data-drawer-account]");
    const user = window.SorasakiAuth?.getUser?.();
    if (user) {
      const nome = user.user_metadata?.username || user.email?.split("@")[0] || "sua conta";
      box.innerHTML = `<span class="profile-avatar" style="width:40px;height:40px;font-size:16px">${escapeHtml(Sora.initials(nome))}</span><div><strong>@${escapeHtml(nome)}</strong><small>${escapeHtml(user.email || "")}</small></div><button class="btn btn-sm" type="button" data-drawer-profile>Perfil</button>`;
      box.querySelector("[data-drawer-profile]").onclick = () => { fechar(); window.SorasakiAuth.openProfile(); };
    } else {
      box.innerHTML = `<div><strong>Você não está conectado</strong><small>Entre para divulgar, avaliar e comprar.</small></div><button class="btn btn-sm" type="button" data-drawer-login>Entrar</button>`;
      box.querySelector("[data-drawer-login]").onclick = () => { fechar(); window.SorasakiAuth.open("login"); };
    }
  }

  function abrir() {
    renderConta();
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    setTimeout(() => drawer.querySelector("[data-close-drawer]")?.focus(), 60);
  }
  function fechar() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener("click", () => (drawer.classList.contains("is-open") ? fechar() : abrir()));
  overlay.addEventListener("click", fechar);
  drawer.querySelector("[data-close-drawer]").addEventListener("click", fechar);
  drawer.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const [pagina, hash] = (link.getAttribute("href") || "").split("#");
    const mesmaPagina = (pagina.replace(/\.html$/, "") || "/") === caminhoAtual();
    fechar();
    if (hash && mesmaPagina) {
      event.preventDefault();
      history.replaceState(null, "", `#${hash}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") fechar(); });
  window.SorasakiAuth?.onAuthChange?.(() => { if (drawer.classList.contains("is-open")) renderConta(); });
  window.SoraMenu = { abrir, fechar };
}

/* ===== 4. Conta: login, cadastro, recuperação de senha, perfil ===== */
const ICONE_GOOGLE = '<svg viewBox="0 0 18 18" aria-hidden="true" width="18" height="18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.98v2.34C2.46 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.95H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.46 2.02.98 4.95l2.99 2.34C4.68 5.16 6.66 3.58 9 3.58z"/></svg>';
(function () {
  const SUPA_URL = window.SORASAKI_SUPABASE_URL || "";
  const SUPA_KEY = window.SORASAKI_SUPABASE_KEY || "";
  let client = null;
  let currentUser = null;
  let afterAuthAction = null;
  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });
  const authListeners = [];
  // Lido antes do Supabase limpar o endereço (links de e-mail).
  const hashInicial = location.hash || "";

  function ensureClient() {
    if (client) return client;
    if (!SUPA_URL || !SUPA_KEY || !window.supabase?.createClient) return null;
    try {
      client = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (e) {
      console.error("[SORASAKI] Cliente de contas:", e);
      client = null;
    }
    return client;
  }

  function notify(event) {
    updateAuthUI();
    authListeners.slice().forEach((fn) => { try { fn(currentUser, event); } catch (e) { console.error("[SORASAKI]", e); } });
  }

  async function syncSession() {
    const c = ensureClient();
    if (!c) { resolveReady(); notify("INITIAL"); return; }
    c.auth.onAuthStateChange((event, session) => {
      // A sessão inicial é tratada logo abaixo por getSession().
      if (event === "INITIAL_SESSION") return;
      const antes = currentUser?.id;
      currentUser = session?.user || null;
      if (event === "PASSWORD_RECOVERY") { openLogin("reset"); }
      if (event === "SIGNED_IN") registrarContextoCadastro(session);
      if (antes !== currentUser?.id || event !== "TOKEN_REFRESHED") notify(event);
    });
    try {
      const { data } = await c.auth.getSession();
      currentUser = data?.session?.user || null;
    } catch (e) {
      console.warn("[SORASAKI] Sessão:", e);
      currentUser = null;
    }
    resolveReady();
    notify("INITIAL");
    tratarRetornoDeEmail();
  }

  // Manda pro servidor o contexto de quando a conta foi criada (IP e
  // localização vêm do servidor, não do navegador). Idempotente: pode
  // rodar em todo login que o backend só grava na primeira vez.
  function registrarContextoCadastro(session) {
    try {
      if (!session?.access_token) return;
      if (sessionStorage.getItem("sora_signup_tracked")) return;
      sessionStorage.setItem("sora_signup_tracked", "1");
      fetch("/api/track-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          entry_page: sessionStorage.getItem("sora_entry_page") || location.pathname,
          referrer: sessionStorage.getItem("sora_entry_ref") || document.referrer || ""
        })
      }).catch(() => {});
    } catch {}
  }

  function tratarRetornoDeEmail() {
    if (!hashInicial) return;
    const p = new URLSearchParams(hashInicial.slice(1));
    if (p.get("error_code") || p.get("error")) {
      const expirou = /expired|otp/i.test(p.get("error_code") || p.get("error_description") || "");
      Sora.toast(expirou ? "Este link expirou ou já foi usado. Peça um novo e-mail." : "Não foi possível confirmar pelo link. Tente novamente.", "error", 6500);
      history.replaceState(null, "", location.pathname + location.search);
      return;
    }
    if (p.get("type") === "signup" && currentUser) Sora.toast("E-mail confirmado. Você já está conectado.", "ok");
    if (p.get("type") === "recovery") openLogin("reset");
  }

  function getUser() { return currentUser; }
  function onAuthChange(callback) {
    if (typeof callback !== "function") return () => {};
    authListeners.push(callback);
    return () => { const i = authListeners.indexOf(callback); if (i >= 0) authListeners.splice(i, 1); };
  }
  async function getToken() {
    const c = ensureClient();
    if (!c) return "";
    try { const { data } = await c.auth.getSession(); return data?.session?.access_token || ""; } catch { return ""; }
  }
  async function logout() {
    const c = ensureClient();
    try { if (c) await c.auth.signOut(); } catch (e) { console.warn("[SORASAKI] Sair:", e); }
    currentUser = null;
    notify("SIGNED_OUT");
  }
  function setAfterAuth(fn) { afterAuthAction = typeof fn === "function" ? fn : null; }
  function runAfterAuth() {
    const fn = afterAuthAction;
    afterAuthAction = null;
    if (fn) setTimeout(() => { try { fn(); } catch (e) { console.warn("[SORASAKI] Pós-login:", e); } }, 120);
  }

  function traduzAuthError(error) {
    const m = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    if (m.includes("invalid login credentials") || code === "invalid_credentials") return "E-mail ou senha incorretos.";
    if (m.includes("email not confirmed") || code === "email_not_confirmed") return "Confirme seu e-mail antes de entrar. Procure a mensagem do Sorasaki na sua caixa de entrada.";
    if (m.includes("user already registered") || code === "user_already_exists") return "Este e-mail já tem uma conta. Tente entrar.";
    if (m.includes("database error saving new user")) return "Esse nome de usuário já está em uso. Escolha outro.";
    if (m.includes("banned")) return "Esta conta está suspensa. Fale com o suporte.";
    if (m.includes("signups not allowed")) return "Novos cadastros estão pausados no momento.";
    if (m.includes("should be different") || code === "same_password") return "A nova senha precisa ser diferente da atual.";
    if (m.includes("password") && (m.includes("at least") || m.includes("weak") || m.includes("short"))) return "Use uma senha mais forte, com pelo menos 8 caracteres.";
    if (m.includes("invalid") && m.includes("email")) return "Confira o e-mail digitado.";
    if (m.includes("expired") || m.includes("token has expired") || code === "otp_expired") return "Código inválido ou expirado. Peça um novo.";
    if (m.includes("rate limit") || m.includes("too many") || code.includes("rate")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    return Sora.friendlyError(error, "Não foi possível concluir agora. Tente novamente em alguns instantes.");
  }

  let loginDrawer = null;
  let loginOverlay = null;
  let lastFocus = null;

  function createLoginUI() {
    if (loginDrawer) return;
    loginOverlay = document.createElement("div");
    loginOverlay.className = "sora-login-overlay";
    loginDrawer = document.createElement("aside");
    loginDrawer.className = "sora-login-drawer";
    loginDrawer.id = "sorasaki-login";
    loginDrawer.setAttribute("aria-label", "Conta Sorasaki");
    loginDrawer.setAttribute("aria-hidden", "true");
    loginDrawer.innerHTML = `
      <div class="drawer-head">
        <strong>Conta Sorasaki</strong>
        <button class="icon-btn login-close" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="drawer-body">
        <div class="login-tabs" role="tablist">
          <button type="button" class="login-tab active" data-auth-tab="login" role="tab">Entrar</button>
          <button type="button" class="login-tab" data-auth-tab="register" role="tab">Criar conta</button>
        </div>

        <section class="auth-panel" data-auth-panel="login">
          <div class="login-intro"><h3>Bem-vindo de volta</h3><p>Navegar pelo site não exige conta. Para divulgar grupos, avaliar, relatar ou comprar, entre com seu e-mail.</p></div>
          <button class="btn btn-google btn-block" type="button" data-google-login>${ICONE_GOOGLE} Continuar com Google</button>
          <div class="auth-divider">ou com e-mail</div>
          <form id="authLoginForm" novalidate>
            <label>E-mail<input id="authEmail" type="email" autocomplete="email" inputmode="email" required placeholder="voce@exemplo.com"></label>
            <label>Senha<div class="password-wrap"><input id="authPassword" type="password" autocomplete="current-password" required placeholder="Sua senha"><button type="button" class="password-toggle" data-toggle-password="authPassword">Mostrar</button></div></label>
            <button class="btn btn-primary btn-block" id="authLogin" type="submit">Entrar</button>
            <div class="auth-row"><button class="auth-link" type="button" data-go="forgot">Esqueci minha senha</button><button class="auth-link" type="button" data-go="register">Criar conta</button></div>
            <div class="auth-result" id="authResult" aria-live="polite"></div>
          </form>
        </section>

        <section class="auth-panel hidden" data-auth-panel="register">
          <div id="registerFormFields" class="auth-panel" style="animation:none">
            <div class="login-intro"><h3>Crie sua conta</h3><p>Leva menos de um minuto. Depois, confirme pelo link que enviaremos ao seu e-mail.</p></div>
            <button class="btn btn-google btn-block" type="button" data-google-login>${ICONE_GOOGLE} Cadastrar com Google</button>
            <div class="auth-divider">ou com e-mail</div>
            <form id="authRegisterForm" novalidate>
              <label>Nome de usuário<input id="registerUsername" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" required placeholder="ex.: sorasakifan"><span class="field-hint">3 a 24 caracteres: letras, números ou _</span></label>
              <label>E-mail<input id="registerEmail" type="email" autocomplete="email" inputmode="email" required placeholder="voce@exemplo.com"></label>
              <label>Senha<div class="password-wrap"><input id="registerPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"><button type="button" class="password-toggle" data-toggle-password="registerPassword">Mostrar</button></div></label>
              <label>Confirmar senha<input id="registerConfirm" type="password" autocomplete="new-password" required placeholder="Digite a senha novamente"></label>
              <div id="turnstileBox" class="turnstile-box"></div>
              <button class="btn btn-primary btn-block" id="authRegister" type="submit">Criar conta</button>
              <div class="auth-result" id="registerResult" aria-live="polite"></div>
            </form>
          </div>
          <div class="auth-code-area hidden" id="signupCodeArea">
            <div class="login-intro"><h3>Confirme seu e-mail</h3><p>Enviamos um link para <b id="signupEmailLabel"></b>. Abra a mensagem e toque em confirmar — você volta para cá já conectado.</p><p class="field-hint">Não chegou? Confira a caixa de spam ou peça outro envio.</p></div>
            <button class="btn btn-block" id="authResendSignup" type="button">Reenviar e-mail</button>
            <button class="auth-link back-login" type="button" data-go="login">Voltar para o login</button>
            <div class="auth-result" id="signupResult" aria-live="polite"></div>
          </div>
        </section>

        <section class="auth-panel hidden" data-auth-panel="forgot">
          <div class="login-intro"><h3>Recuperar acesso</h3><p>Informe o e-mail da conta. Enviaremos um link para você criar uma nova senha.</p></div>
          <form id="authForgotForm" novalidate>
            <label>E-mail<input id="forgotEmail" type="email" autocomplete="email" inputmode="email" required placeholder="voce@exemplo.com"></label>
            <button class="btn btn-primary btn-block" id="authSendCode" type="submit">Enviar link de recuperação</button>
          </form>
          <form class="auth-code-area hidden" id="authCodeArea" novalidate>
            <p class="field-hint">Recebeu um código de 6 dígitos no e-mail em vez de um link? Digite abaixo com a nova senha.</p>
            <label>Código<input id="resetCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
            <label>Nova senha<input id="resetPasswordCode" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo de 8 caracteres"></label>
            <button class="btn btn-block" id="authReset" type="submit">Redefinir senha</button>
          </form>
          <button class="auth-link back-login" type="button" data-go="login">Voltar para o login</button>
          <div class="auth-result" id="forgotResult" aria-live="polite"></div>
        </section>

        <section class="auth-panel hidden" data-auth-panel="reset">
          <div class="login-intro"><h3>Crie uma nova senha</h3><p>Você entrou pelo link de recuperação. Defina a nova senha da sua conta.</p></div>
          <form id="authNewPasswordForm" novalidate>
            <label>Nova senha<div class="password-wrap"><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"><button type="button" class="password-toggle" data-toggle-password="newPassword">Mostrar</button></div></label>
            <label>Confirmar nova senha<input id="newPassword2" type="password" autocomplete="new-password" required></label>
            <button class="btn btn-primary btn-block" id="authSaveNewPassword" type="submit">Salvar nova senha</button>
            <div class="auth-result" id="resetResult" aria-live="polite"></div>
          </form>
        </section>

        <div class="login-privacy">A gente nunca vai pedir sua senha por WhatsApp ou e-mail — desconfie se isso acontecer.</div>
      </div>`;
    document.body.append(loginOverlay, loginDrawer);

    const $ = (id) => loginDrawer.querySelector("#" + id);
    const tabs = loginDrawer.querySelectorAll("[data-auth-tab]");
    const panels = loginDrawer.querySelectorAll("[data-auth-panel]");
    function tab(name) {
      panels.forEach((p) => p.classList.toggle("hidden", p.dataset.authPanel !== name));
      tabs.forEach((t) => { const on = t.dataset.authTab === name; t.classList.toggle("active", on); t.setAttribute("aria-selected", String(on)); });
      loginDrawer.querySelector(".login-tabs").classList.toggle("hidden", name === "forgot" || name === "reset");
    }
    loginDrawer._tab = tab;
    tabs.forEach((t) => { t.onclick = () => tab(t.dataset.authTab); });
    loginDrawer.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => tab(b.dataset.go); });
    loginDrawer.querySelectorAll("[data-toggle-password]").forEach((b) => {
      b.onclick = () => { const i = $(b.dataset.togglePassword); const show = i.type === "password"; i.type = show ? "text" : "password"; b.textContent = show ? "Ocultar" : "Mostrar"; };
    });
    loginDrawer.querySelector(".login-close").onclick = closeLogin;
    loginOverlay.onclick = closeLogin;
    const show = (id, ok, msg) => Sora.showResult($(id), ok === true ? "ok" : ok === "info" ? "info" : "error", msg);
    const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    // Turnstile (anti-robô) no cadastro: só é ativado se houver uma site key
    // configurada no Supabase. Sem ela, o cadastro continua funcionando
    // normalmente — o Turnstile é uma camada extra, não uma trava dura.
    let turnstileWidgetId = null;
    let turnstileToken = "";
    function resetTurnstile() {
      turnstileToken = "";
      if (turnstileWidgetId !== null && window.turnstile) { try { window.turnstile.reset(turnstileWidgetId); } catch {} }
    }
    carregarConfigPublica().then(async (cfg) => {
      const siteKey = cfg?.turnstile_site_key;
      const box = $("turnstileBox");
      if (!siteKey || !box) return;
      const ok = await garantirScriptTurnstile();
      if (!ok || !window.turnstile) return;
      turnstileWidgetId = window.turnstile.render(box, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => { turnstileToken = token; },
        "expired-callback": () => { turnstileToken = ""; },
        "error-callback": () => { turnstileToken = ""; }
      });
    });

    // Login com Google: o Supabase cuida do OAuth e da volta para o site
    // (detectSessionInUrl já está ligado no cliente). Se a conta ainda não
    // existir, ela é criada automaticamente pelo mesmo trigger que cria o
    // perfil no cadastro por e-mail.
    loginDrawer.querySelectorAll("[data-google-login]").forEach((btn) => {
      btn.onclick = async () => {
        const c = ensureClient();
        if (!c) return Sora.toast("Não foi possível acessar sua conta agora. Recarregue a página e tente novamente.", "error");
        Sora.setBusy(btn, true, "Redirecionando…");
        const { error } = await c.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
        });
        if (error) { Sora.setBusy(btn, false); Sora.toast("Não foi possível continuar com o Google agora. Tente novamente.", "error"); }
        // Sem erro: o navegador já está saindo para o Google, nada mais a fazer aqui.
      };
    });

    $("authLoginForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient();
      if (!c) return show("authResult", false, "Não foi possível acessar sua conta agora. Recarregue a página e tente novamente.");
      const email = $("authEmail").value.trim();
      const password = $("authPassword").value;
      if (!validEmail(email) || !password) return show("authResult", false, "Informe seu e-mail e sua senha.");
      const btn = $("authLogin");
      Sora.setBusy(btn, true, "Entrando…");
      show("authResult", null, "");
      try {
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) return show("authResult", false, traduzAuthError(error));
        $("authPassword").value = "";
        closeLogin();
        Sora.toast("Você entrou na sua conta.", "ok");
        runAfterAuth();
      } catch (err) {
        console.error("[SORASAKI] Login:", err);
        show("authResult", false, traduzAuthError(err));
      } finally { Sora.setBusy(btn, false); }
    };

    let pendingSignupEmail = "";
    $("authRegisterForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient();
      if (!c) return show("registerResult", false, "Não foi possível criar a conta agora. Recarregue a página e tente novamente.");
      const username = $("registerUsername").value.trim();
      const email = $("registerEmail").value.trim();
      const password = $("registerPassword").value;
      const confirm = $("registerConfirm").value;
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return show("registerResult", false, "O nome de usuário deve ter 3 a 24 caracteres, usando letras, números ou _.");
      if (!validEmail(email)) return show("registerResult", false, "Confira o e-mail digitado.");
      if (password.length < 8) return show("registerResult", false, "A senha precisa ter pelo menos 8 caracteres.");
      if (password !== confirm) return show("registerResult", false, "As senhas não coincidem.");
      if (turnstileWidgetId !== null && !turnstileToken) return show("registerResult", false, "Confirme que você não é um robô antes de continuar.");
      const btn = $("authRegister");
      Sora.setBusy(btn, true, "Criando conta…");
      show("registerResult", null, "");
      try {
        const { data, error } = await c.auth.signUp({
          email, password,
          options: { emailRedirectTo: location.origin + location.pathname, data: { username, display_name: username }, captchaToken: turnstileToken || undefined }
        });
        if (error) return show("registerResult", false, traduzAuthError(error));
        pendingSignupEmail = email;
        if (data.user && !data.session) {
          $("signupEmailLabel").textContent = email;
          $("signupCodeArea").classList.remove("hidden");
          $("registerFormFields").classList.add("hidden");
        } else {
          closeLogin();
          Sora.toast("Conta criada. Bem-vindo ao Sorasaki!", "ok");
          runAfterAuth();
        }
      } catch (err) {
        console.error("[SORASAKI] Cadastro:", err);
        show("registerResult", false, traduzAuthError(err));
      } finally { Sora.setBusy(btn, false); resetTurnstile(); }
    };

    $("authResendSignup").onclick = async () => {
      const c = ensureClient();
      if (!c || !pendingSignupEmail) return show("signupResult", false, "Não foi possível reenviar agora. Tente criar a conta novamente.");
      const btn = $("authResendSignup");
      Sora.setBusy(btn, true, "Reenviando…");
      try {
        const { error } = await c.auth.resend({ type: "signup", email: pendingSignupEmail, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) return show("signupResult", false, traduzAuthError(error));
        show("signupResult", true, "Enviamos um novo e-mail. Pode levar alguns minutos para chegar.");
      } catch (err) { show("signupResult", false, traduzAuthError(err)); }
      finally { Sora.setBusy(btn, false); }
    };

    $("authForgotForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient();
      if (!c) return show("forgotResult", false, "Não foi possível enviar agora. Recarregue a página e tente novamente.");
      const email = $("forgotEmail").value.trim();
      if (!validEmail(email)) return show("forgotResult", false, "Informe o e-mail da conta.");
      const btn = $("authSendCode");
      Sora.setBusy(btn, true, "Enviando…");
      try {
        const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
        if (error) return show("forgotResult", false, traduzAuthError(error));
        $("authCodeArea").classList.remove("hidden");
        show("forgotResult", true, "Se existir uma conta com este e-mail, você vai receber o link em alguns minutos.");
      } catch (err) { show("forgotResult", false, traduzAuthError(err)); }
      finally { Sora.setBusy(btn, false); }
    };

    $("authCodeArea").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient();
      const email = $("forgotEmail").value.trim();
      const token = $("resetCode").value.trim();
      const password = $("resetPasswordCode").value;
      if (!c) return;
      if (!email || !/^\d{6}$/.test(token)) return show("forgotResult", false, "Digite o código de 6 dígitos recebido.");
      if (password.length < 8) return show("forgotResult", false, "A nova senha precisa ter pelo menos 8 caracteres.");
      const btn = $("authReset");
      Sora.setBusy(btn, true, "Salvando…");
      try {
        const { error: verifyError } = await c.auth.verifyOtp({ email, token, type: "recovery" });
        if (verifyError) return show("forgotResult", false, "Código inválido ou expirado. Peça um novo.");
        const { error } = await c.auth.updateUser({ password });
        if (error) return show("forgotResult", false, traduzAuthError(error));
        closeLogin();
        Sora.toast("Senha redefinida. Você já está conectado.", "ok");
      } catch (err) { show("forgotResult", false, traduzAuthError(err)); }
      finally { Sora.setBusy(btn, false); }
    };

    $("authNewPasswordForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient();
      const p1 = $("newPassword").value;
      const p2 = $("newPassword2").value;
      if (!c) return;
      if (p1.length < 8) return show("resetResult", false, "A nova senha precisa ter pelo menos 8 caracteres.");
      if (p1 !== p2) return show("resetResult", false, "As senhas não coincidem.");
      const btn = $("authSaveNewPassword");
      Sora.setBusy(btn, true, "Salvando…");
      try {
        const { error } = await c.auth.updateUser({ password: p1 });
        if (error) return show("resetResult", false, traduzAuthError(error));
        $("authNewPasswordForm").reset();
        closeLogin();
        Sora.toast("Nova senha salva.", "ok");
      } catch (err) { show("resetResult", false, traduzAuthError(err)); }
      finally { Sora.setBusy(btn, false); }
    };
  }

  function openLogin(which = "login", message = "") {
    createLoginUI();
    lastFocus = document.activeElement;
    loginDrawer._tab(which);
    if (which === "register") {
      loginDrawer.querySelector("#registerFormFields").classList.remove("hidden");
      loginDrawer.querySelector("#signupCodeArea").classList.add("hidden");
    }
    const box = loginDrawer.querySelector("#authResult");
    Sora.showResult(box, message ? "info" : "", message);
    loginDrawer.classList.add("is-open");
    loginOverlay.classList.add("is-open");
    loginDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("login-open");
    const foco = { login: "#authEmail", register: "#registerUsername", forgot: "#forgotEmail", reset: "#newPassword" }[which];
    setTimeout(() => {
      const el = loginDrawer.querySelector(foco);
      // No celular, abrir o teclado sozinho atrapalha; só foca no desktop.
      if (el && window.matchMedia("(hover: hover)").matches) el.focus();
    }, 80);
  }
  function closeLogin() {
    if (!loginDrawer?.classList.contains("is-open")) return;
    loginDrawer.classList.remove("is-open");
    loginOverlay.classList.remove("is-open");
    loginDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("login-open");
    lastFocus?.focus?.({ preventScroll: true });
  }

  /* ----- Perfil ----- */
  let profileModal = null;
  let profileOverlay = null;
  const CATEGORIAS = { vendas: "Compra e venda", comunidade: "Comunidade", jogos: "Jogos", freefire: "Free Fire", divulgacao: "Divulgação", amizades: "Amizades", suporte: "Suporte", estudos: "Estudos", outros: "Outros" };
  const STATUS_GRUPO = { pending: "Em análise", approved: "Publicada", rejected: "Recusada", removed: "Removida" };

  function createProfileUI() {
    if (profileModal) return;
    profileOverlay = document.createElement("div");
    profileOverlay.className = "sora-profile-overlay";
    profileModal = document.createElement("section");
    profileModal.className = "sora-profile-modal";
    profileModal.setAttribute("role", "dialog");
    profileModal.setAttribute("aria-modal", "true");
    profileModal.setAttribute("aria-labelledby", "profileTitle");
    profileModal.innerHTML = `
      <div class="profile-head"><div><span class="eyebrow">Sua conta</span><h2 id="profileTitle" style="margin-top:8px">Meu perfil</h2></div><button class="icon-btn profile-close" type="button" aria-label="Fechar">×</button></div>
      <div class="profile-card-main"><div class="profile-avatar" id="profileAvatar">S</div><div><strong id="profileUsername">@usuario</strong><span id="profileEmail"></span><span class="profile-status" id="profileStatus"></span></div></div>
      <div class="profile-grid">
        <div class="profile-info"><small>Último acesso</small><b id="profileLastLogin">—</b></div>
        <div class="profile-info"><small>Conta criada em</small><b id="profileCreated">—</b></div>
      </div>
      <div class="profile-section-title">Divulgações</div>
      <button class="profile-action" id="profileGroupsBtn" type="button" aria-expanded="false"><div><strong>Minhas divulgações</strong><small id="profileGroupsSummary">Carregando…</small></div><b>›</b></button>
      <div class="profile-groups-list hidden" id="profileGroups"></div>
      <div class="profile-section-title">Conta</div>
      <button class="profile-action" id="profileInfoBtn" type="button" aria-expanded="false"><div><strong>Nome de usuário</strong><small>Altere como você aparece no Sorasaki</small></div><b>›</b></button>
      <form class="profile-edit-form hidden" id="profileEditForm" novalidate>
        <label>Nome de usuário<input id="profileEditUsername" type="text" maxlength="24" autocomplete="username" autocapitalize="none" spellcheck="false"><span class="field-hint">3 a 24 caracteres: letras, números ou _</span></label>
        <div class="profile-form-actions"><button class="btn btn-sm" id="profileEditCancel" type="button">Cancelar</button><button class="btn btn-primary btn-sm" id="profileEditSave" type="submit">Salvar</button></div>
        <div class="auth-result" id="profileEditResult" aria-live="polite"></div>
      </form>
      <button class="profile-action" id="profilePasswordBtn" type="button" aria-expanded="false"><div><strong>Alterar senha</strong><small>Confirme a senha atual e escolha uma nova</small></div><b>›</b></button>
      <form class="profile-password-form hidden" id="profilePasswordForm" novalidate>
        <label>Senha atual<input id="profileCurrentPassword" type="password" autocomplete="current-password"></label>
        <label>Nova senha<input id="profileNewPassword" type="password" autocomplete="new-password" minlength="8"></label>
        <label>Confirmar nova senha<input id="profileNewPassword2" type="password" autocomplete="new-password" minlength="8"></label>
        <div class="profile-form-actions"><button class="btn btn-sm" id="profilePasswordCancel" type="button">Cancelar</button><button class="btn btn-primary btn-sm" id="profilePasswordSave" type="submit">Salvar senha</button></div>
        <div class="auth-result" id="profilePasswordResult" aria-live="polite"></div>
      </form>
      <button class="btn btn-danger profile-logout" id="profileLogout" type="button">Sair da conta</button>`;
    document.body.append(profileOverlay, profileModal);

    const $ = (id) => profileModal.querySelector("#" + id);
    const toggle = (btnId, formId, force) => {
      const form = $(formId);
      const abrir = force ?? form.classList.contains("hidden");
      form.classList.toggle("hidden", !abrir);
      $(btnId).setAttribute("aria-expanded", String(abrir));
    };
    profileModal.querySelector(".profile-close").onclick = closeProfile;
    profileOverlay.onclick = closeProfile;
    $("profilePasswordBtn").onclick = () => toggle("profilePasswordBtn", "profilePasswordForm");
    $("profilePasswordCancel").onclick = () => { $("profilePasswordForm").reset(); toggle("profilePasswordBtn", "profilePasswordForm", false); };
    $("profileInfoBtn").onclick = () => toggle("profileInfoBtn", "profileEditForm");
    $("profileEditCancel").onclick = () => toggle("profileInfoBtn", "profileEditForm", false);
    $("profileGroupsBtn").onclick = () => toggle("profileGroupsBtn", "profileGroups");

    $("profilePasswordForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient(), user = getUser(), res = $("profilePasswordResult");
      const current = $("profileCurrentPassword").value, p1 = $("profileNewPassword").value, p2 = $("profileNewPassword2").value;
      if (!c || !user) return;
      if (!current || !p1 || !p2) return Sora.showResult(res, "error", "Preencha todos os campos.");
      if (p1.length < 8) return Sora.showResult(res, "error", "A nova senha precisa ter pelo menos 8 caracteres.");
      if (p1 !== p2) return Sora.showResult(res, "error", "As novas senhas não coincidem.");
      const btn = $("profilePasswordSave");
      Sora.setBusy(btn, true, "Salvando…");
      try {
        const { error: loginError } = await c.auth.signInWithPassword({ email: user.email, password: current });
        if (loginError) return Sora.showResult(res, "error", "A senha atual está incorreta.");
        const { error } = await c.auth.updateUser({ password: p1 });
        if (error) return Sora.showResult(res, "error", traduzAuthError(error));
        $("profilePasswordForm").reset();
        Sora.showResult(res, "", "");
        toggle("profilePasswordBtn", "profilePasswordForm", false);
        Sora.toast("Senha alterada.", "ok");
      } catch (err) { Sora.showResult(res, "error", traduzAuthError(err)); }
      finally { Sora.setBusy(btn, false); }
    };

    $("profileEditForm").onsubmit = async (e) => {
      e.preventDefault();
      const c = ensureClient(), user = getUser(), res = $("profileEditResult");
      const username = $("profileEditUsername").value.trim();
      if (!c || !user) return;
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return Sora.showResult(res, "error", "Use 3 a 24 caracteres: letras, números ou _.");
      const btn = $("profileEditSave");
      Sora.setBusy(btn, true, "Salvando…");
      try {
        const { error } = await c.from("profiles").update({ username, display_name: username }).eq("user_id", user.id);
        if (error) {
          console.warn("[SORASAKI] Perfil:", error);
          return Sora.showResult(res, "error", error.code === "23505" ? "Esse nome de usuário já está em uso." : "Não foi possível salvar agora. Tente novamente.");
        }
        c.auth.updateUser({ data: { username, display_name: username } }).catch(() => {});
        Sora.showResult(res, "", "");
        toggle("profileInfoBtn", "profileEditForm", false);
        Sora.toast("Nome de usuário atualizado.", "ok");
        await renderProfile();
      } catch (err) { Sora.showResult(res, "error", Sora.friendlyError(err)); }
      finally { Sora.setBusy(btn, false); }
    };

    $("profileLogout").onclick = async (ev) => {
      const btn = ev.currentTarget;
      if (!Sora.confirmTap(btn, "Toque de novo para sair")) return;
      Sora.setBusy(btn, true, "Saindo…");
      await logout();
      Sora.setBusy(btn, false);
      closeProfile();
      Sora.toast("Você saiu da conta.");
    };
  }

  async function renderProfile() {
    const user = getUser(), c = ensureClient();
    if (!user || !c || !profileModal) return;
    const $ = (id) => profileModal.querySelector("#" + id);
    let perfil = null;
    try {
      const { data, error } = await c.from("profiles").select("username,display_name,created_at").eq("user_id", user.id).maybeSingle();
      if (error) console.warn("[SORASAKI] Perfil:", error); else perfil = data;
    } catch (e) { console.warn("[SORASAKI] Perfil:", e); }
    const username = perfil?.username || user.user_metadata?.username || user.email?.split("@")[0] || "usuario";
    const confirmado = Boolean(user.email_confirmed_at);
    $("profileAvatar").textContent = Sora.initials(username);
    $("profileUsername").textContent = "@" + username;
    $("profileEmail").textContent = user.email || "";
    $("profileStatus").textContent = confirmado ? "E-mail confirmado" : "E-mail aguardando confirmação";
    $("profileStatus").classList.toggle("pending", !confirmado);
    $("profileLastLogin").textContent = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
    $("profileCreated").textContent = fmtData(perfil?.created_at || user.created_at);
    $("profileEditUsername").value = username;

    const list = $("profileGroups");
    const summary = $("profileGroupsSummary");
    try {
      const { data, error } = await c.from("groups").select("id,name,category,status,view_count,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      const rows = data || [];
      summary.textContent = rows.length ? `${rows.length} ${rows.length === 1 ? "divulgação enviada" : "divulgações enviadas"}` : "Nenhuma divulgação ainda";
      list.innerHTML = rows.map((g) => `
        <div class="profile-group-row">
          <div><strong>${escapeHtml(g.name)}</strong><small><span class="status-badge ${escapeHtml(g.status)}">${STATUS_GRUPO[g.status] || escapeHtml(g.status)}</span>${escapeHtml(CATEGORIAS[g.category] || g.category)} · ${fmtNumero(g.view_count || 0)} visualizações</small></div>
          <div class="profile-group-actions"><a class="btn btn-sm" href="/grupos?editar=${g.id}">Editar</a><button class="btn btn-sm btn-danger" type="button" data-profile-delete="${g.id}">Remover</button></div>
        </div>`).join("") || '<div class="profile-groups-empty">Você ainda não enviou nenhuma divulgação. <a class="text-link" href="/grupos#divulgar">Divulgar agora</a></div>';
      list.querySelectorAll("[data-profile-delete]").forEach((b) => {
        b.onclick = async () => {
          if (!Sora.confirmTap(b, "Confirmar")) return;
          Sora.setBusy(b, true);
          const { error: delError } = await c.from("groups").delete().eq("id", Number(b.dataset.profileDelete)).eq("owner_id", user.id);
          if (delError) { console.warn("[SORASAKI] Remover divulgação:", delError); Sora.setBusy(b, false); Sora.toast("Não foi possível remover a divulgação. Tente novamente.", "error"); return; }
          Sora.toast("Divulgação removida.", "ok");
          document.dispatchEvent(new CustomEvent("sorasaki:groups-changed"));
          renderProfile();
        };
      });
    } catch (e) {
      console.warn("[SORASAKI] Divulgações do perfil:", e);
      summary.textContent = "Não foi possível carregar agora";
      list.innerHTML = '<div class="profile-groups-empty">Não foi possível carregar suas divulgações. Tente novamente em instantes.</div>';
    }
  }

  function openProfile() {
    if (!getUser()) { openLogin("login"); return; }
    createProfileUI();
    lastFocus = document.activeElement;
    profileModal.classList.add("is-open");
    profileOverlay.classList.add("is-open");
    document.body.classList.add("profile-open");
    setTimeout(() => profileModal.querySelector(".profile-close")?.focus(), 60);
    renderProfile();
  }
  function closeProfile() {
    if (!profileModal?.classList.contains("is-open")) return;
    profileModal.classList.remove("is-open");
    profileOverlay.classList.remove("is-open");
    document.body.classList.remove("profile-open");
    lastFocus?.focus?.({ preventScroll: true });
  }

  function updateAuthUI() {
    const user = getUser();
    document.querySelectorAll(".sora-login-trigger").forEach((btn) => {
      btn.classList.toggle("logged", Boolean(user));
      const nome = user?.user_metadata?.username || user?.email?.split("@")[0] || "";
      const label = btn.querySelector(".login-trigger-label");
      const avatar = btn.querySelector(".login-avatar");
      if (label) label.textContent = user ? "Perfil" : "Entrar";
      if (avatar) avatar.textContent = user ? Sora.initials(nome) : "";
      btn.setAttribute("aria-label", user ? "Abrir meu perfil" : "Entrar ou criar conta");
    });
    document.querySelectorAll("[data-auth-required]").forEach((el) => el.classList.toggle("auth-locked", !user));
    document.querySelectorAll("[data-when-logged]").forEach((el) => { el.hidden = !user; });
    document.querySelectorAll("[data-when-guest]").forEach((el) => { el.hidden = Boolean(user); });
  }

  window.SorasakiAuth = {
    getUser, getToken, ready, logout, clear: logout, setAfterAuth, onAuthChange, getClient: ensureClient,
    open: (which = "login", message = "") => openLogin(typeof which === "string" ? which : "login", message),
    close: closeLogin,
    openProfile, closeProfile,
    requireLogin(msg = "Entre na sua conta para continuar.") {
      if (getUser()) return true;
      openLogin("login", msg);
      return false;
    }
  };

  function init() {
    document.querySelectorAll(".sora-login-trigger").forEach((btn) => {
      btn.addEventListener("click", () => (getUser() ? openProfile() : openLogin("login")));
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLogin(); closeProfile(); } });
    syncSession();
  }
  window.SorasakiAuth._init = init;
})();

/* ===== 5. Manutenção, visitas e preferências ===== */
const SORA_PREFS = {
  get(key, fallback) { try { return localStorage.getItem("sorasaki_pref_" + key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem("sorasaki_pref_" + key, value); } catch {} }
};
if (SORA_PREFS.get("motion", "auto") === "reduce") document.documentElement.classList.add("reduce-motion");

async function instalarGuardaDeManutencao() {
  // O middleware já bloqueia no servidor; isto cobre páginas em cache.
  if (caminhoAtual() === "/controle-8f4c2e91") return false;
  const state = await Sora.siteState();
  if (!state?.maintenance) return false;
  if (state.start_at) { const start = new Date(state.start_at).getTime(); if (!Number.isNaN(start) && Date.now() < start) return false; }
  if (document.getElementById("sorasakiMaintenance")) return true;
  const overlay = document.createElement("div");
  overlay.id = "sorasakiMaintenance";
  overlay.className = "sorasaki-maintenance";
  const card = document.createElement("section");
  card.className = "sorasaki-maintenance-card";
  const visual = document.createElement("div");
  visual.className = "sorasaki-maintenance-visual";
  const img = document.createElement("img");
  img.src = "/img/sorasaki-manutencao.webp";
  img.alt = "";
  visual.appendChild(img);
  const title = document.createElement("h1");
  title.textContent = state.title || "Estamos em manutenção";
  const message = document.createElement("p");
  message.textContent = state.message || "Estamos fazendo algumas melhorias. Voltamos em breve.";
  card.append(visual, title, message);
  if (state.return_at) {
    const d = new Date(state.return_at);
    if (!Number.isNaN(d.getTime())) {
      const eta = document.createElement("div");
      eta.className = "sorasaki-maintenance-return";
      eta.textContent = `Previsão de retorno: ${d.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}`;
      card.appendChild(eta);
    }
  }
  const thanks = document.createElement("div");
  thanks.className = "sorasaki-maintenance-thanks";
  thanks.textContent = "Obrigado pela paciência.";
  card.appendChild(thanks);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.documentElement.classList.add("maintenance-active");
  return true;
}

function registrarVisita() {
  const path = caminhoAtual();
  if (path === "/controle-8f4c2e91" || path.startsWith("/api/")) return;
  try {
    let id = localStorage.getItem("sorasaki_visitor_id");
    if (!id || !/^[A-Za-z0-9_-]{20,120}$/.test(id)) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "_");
      localStorage.setItem("sorasaki_visitor_id", id);
    }
    fetch("/api/site-analytics", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor_id: id, path }) }).catch(() => {});
  } catch {}
}

// Entrada suave de blocos marcados com data-reveal.
function ligarRevelacao() {
  const alvos = document.querySelectorAll("[data-reveal]");
  if (!alvos.length || !("IntersectionObserver" in window) || document.documentElement.classList.contains("reduce-motion")) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  alvos.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) return; // já visível: não anima
    el.classList.add("reveal");
    io.observe(el);
  });
}

// Borboleta roxa — detalhe de identidade. Atravessa a tela de vez em quando,
// sem atrapalhar: não bloqueia cliques, some com toque/clique nela, e
// respeita a preferência de movimento reduzido (do sistema e da página
// Configurações). Some totalmente se o navegador não suportar offset-path.
function motionReduzido() {
  return document.documentElement.classList.contains("reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function criarBorboleta() {
  if (motionReduzido()) return;
  if (!window.CSS || !CSS.supports("offset-path", "path('M0 0')")) return;

  const camada = document.createElement("div");
  camada.className = "sora-borboleta-camada";
  document.body.appendChild(camada);

  function caminhoAleatorio() {
    const w = window.innerWidth, h = window.innerHeight;
    const daEsquerda = Math.random() < 0.5;
    const y0 = h * (0.12 + Math.random() * 0.35);
    const y1 = h * (0.15 + Math.random() * 0.5);
    const yMeio = h * (0.05 + Math.random() * 0.55);
    const x0 = daEsquerda ? -60 : w + 60;
    const x1 = daEsquerda ? w + 60 : -60;
    const xm1 = w * (0.25 + Math.random() * 0.2);
    const xm2 = w * (0.55 + Math.random() * 0.2);
    return `path('M ${x0} ${y0} C ${xm1} ${yMeio}, ${xm2} ${yMeio}, ${x1} ${y1}')`;
  }

  function ciclo() {
    const espera = 24000 + Math.random() * 40000; // entre 24s e 64s
    setTimeout(() => { document.hidden ? ciclo() : voar(); }, espera);
  }

  function voar() {
    const id = "sbg" + Math.random().toString(36).slice(2, 8);
    const el = document.createElement("div");
    el.className = "sora-borboleta";
    el.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/>
      </linearGradient></defs>
      <g class="asa asa-esq"><path d="M16 16C10 6 2 6 2 14c0 7 8 9 14 4z" fill="url(#${id})"/></g>
      <g class="asa asa-dir"><path d="M16 16c6-10 14-10 14-2 0 7-8 9-14 4z" fill="url(#${id})"/></g>
      <ellipse cx="16" cy="16" rx="1.2" ry="5" fill="#2a2733"/>
    </svg>`;
    const duracao = 10 + Math.random() * 6;
    el.style.offsetPath = caminhoAleatorio();
    el.style.animationDuration = `${duracao}s`;
    camada.appendChild(el);

    let saiu = false;
    const remover = () => {
      if (saiu) return;
      saiu = true;
      el.classList.add("ir-embora");
      setTimeout(() => el.remove(), 450);
      ciclo();
    };
    el.addEventListener("pointerenter", remover, { once: true });
    el.addEventListener("animationend", remover, { once: true });
    setTimeout(remover, (duracao + 1.5) * 1000); // rede de segurança
  }

  ciclo();
}

/* ===== 6. Assistente (perguntas frequentes) ===== */
const SORASAKI_FAQ = [
  { pergunta: "O que é o Sorasaki?", resposta: "O Sorasaki é um bot para grupos de WhatsApp que ajuda na proteção, organização e administração dos grupos.\n\nEste site reúne o status do bot ao vivo, a vitrine de comunidades, o catálogo e as novidades do projeto." },
  { pergunta: "Como divulgo o meu grupo?", resposta: "Vá em Grupos e toque em \"Divulgar meu grupo\". Você precisa estar conectado a uma conta.\n\nPreencha nome, categoria, descrição e o link de convite. A equipe confere antes de publicar — você acompanha o status em \"Minhas divulgações\"." },
  { pergunta: "Quanto tempo leva para aprovar?", resposta: "Toda divulgação passa por uma checagem manual da equipe. Assim que for revisada, o status muda em \"Minhas divulgações\" — publicada ou recusada, com o motivo quando houver." },
  { pergunta: "Preciso ter uma conta para usar o site?", resposta: "Não para navegar. A conta só é necessária para divulgar grupos, avaliar, relatar problemas, enviar sugestões ou comprar." },
  { pergunta: "Por que um comando não responde?", resposta: "Veja primeiro a página Status: se o bot estiver offline ou reconectando, os comandos voltam a funcionar em instantes.\n\nSe o bot estiver online e só um comando falhar, relate em Avaliações e bugs contando o que você digitou — isso ajuda a corrigir mais rápido." },
  { pergunta: "Como relato um bug?", resposta: "Em Avaliações e bugs, preencha o que aconteceu, onde (site ou bot) e, se puder, os passos para repetir o problema. É preciso estar conectado para enviar." },
  { pergunta: "Posso sugerir uma função nova?", resposta: "Pode e deve. Use o formulário de sugestões em Avaliações e bugs. Algumas ideias podem entrar nas próximas atualizações." },
  { pergunta: "As estatísticas são em tempo real?", resposta: "Os números do bot são atualizados a cada poucos segundos enquanto a página está aberta. As visitas ao site são contadas de forma anônima, sem guardar IP." },
  { pergunta: "O Sorasaki é gratuito?", resposta: "Navegar, divulgar um grupo e usar a vitrine não custam nada. Planos de destaque e produtos do catálogo são pagos e aparecem com o preço antes da compra." },
  { pergunta: "Como falo com a equipe?", resposta: "Na página Suporte você encontra o e-mail e o WhatsApp da equipe. Conte o que aconteceu e, se possível, mande um print." }
];

function criarAssistente() {
  if (document.querySelector(".assistant-widget")) return;
  if (caminhoAtual() === "/controle-8f4c2e91" || SORA_PREFS.get("assistant", "on") === "off") return;

  const widget = document.createElement("aside");
  widget.className = "assistant-widget";
  widget.setAttribute("aria-label", "Ajuda rápida");
  widget.innerHTML = `
    <div class="sora-chat-panel" id="soraChatPanel" role="dialog" aria-label="Perguntas frequentes">
      <div class="sora-chat-head">
        <div class="sora-chat-head-info"><span class="sora-chat-avatar"><img src="/img/sorasaki-avatar.webp" alt="" width="36" height="36"></span><div><strong>Sorasaki</strong><small>Perguntas frequentes</small></div></div>
        <button class="icon-btn" type="button" data-chat-close aria-label="Fechar">×</button>
      </div>
      <div class="sora-chat-body" id="soraChatBody"></div>
    </div>
    <button class="assistant-launcher" type="button" aria-label="Abrir perguntas frequentes" aria-expanded="false" aria-controls="soraChatPanel">
      <img src="/img/sorasaki-avatar.webp" alt="" width="56" height="56" draggable="false"><span class="launcher-close" aria-hidden="true">×</span>
    </button>`;
  document.body.appendChild(widget);

  // No celular o botão só aparece depois de rolar um pouco, para não cobrir
  // os botões principais da primeira tela.
  if (window.matchMedia("(max-width: 640px)").matches && window.scrollY < 280) {
    widget.classList.add("is-tucked");
    const revelar = () => { if (window.scrollY >= 280) { widget.classList.remove("is-tucked"); window.removeEventListener("scroll", revelar); } };
    window.addEventListener("scroll", revelar, { passive: true });
  }

  const panel = widget.querySelector("#soraChatPanel");
  const body = widget.querySelector("#soraChatBody");
  const launcher = widget.querySelector(".assistant-launcher");
  let iniciado = false;

  const rolar = () => { body.scrollTop = body.scrollHeight; };
  function mensagem(tipo, texto) {
    const el = document.createElement("div");
    el.className = `sora-chat-msg ${tipo}`;
    el.innerHTML = String(texto).split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    body.appendChild(el);
    rolar();
  }
  function perguntas() {
    const chips = document.createElement("div");
    chips.className = "sora-chat-chips";
    SORASAKI_FAQ.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sora-chat-chip";
      b.textContent = item.pergunta;
      b.onclick = () => responder(item, chips);
      chips.appendChild(b);
    });
    body.appendChild(chips);
    rolar();
  }
  function responder(item, chips) {
    chips.remove();
    mensagem("user", item.pergunta);
    const digitando = document.createElement("div");
    digitando.className = "sora-chat-msg assistant sora-chat-typing";
    digitando.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(digitando);
    rolar();
    setTimeout(() => {
      digitando.remove();
      mensagem("assistant", item.resposta);
      const voltar = document.createElement("button");
      voltar.type = "button";
      voltar.className = "sora-chat-back";
      voltar.textContent = "Ver outras perguntas";
      voltar.onclick = () => { voltar.remove(); perguntas(); };
      body.appendChild(voltar);
      rolar();
    }, 450);
  }
  function abrir() {
    widget.querySelector(".assistant-hint")?.remove();
    panel.classList.add("is-open");
    widget.classList.add("chat-open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Fechar perguntas frequentes");
    if (!iniciado) { iniciado = true; mensagem("assistant", "Oi! Escolha uma pergunta abaixo que eu respondo na hora."); perguntas(); }
  }
  function fechar() {
    panel.classList.remove("is-open");
    widget.classList.remove("chat-open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Abrir perguntas frequentes");
  }
  launcher.onclick = () => (panel.classList.contains("is-open") ? fechar() : abrir());
  widget.querySelector("[data-chat-close]").onclick = fechar;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) fechar(); });

  // Uma dica discreta, uma vez por sessão.
  try {
    if (!sessionStorage.getItem("sorasaki_hint_seen")) {
      setTimeout(() => {
        if (panel.classList.contains("is-open") || document.body.classList.contains("group-modal-open")) return;
        sessionStorage.setItem("sorasaki_hint_seen", "1");
        const hint = document.createElement("div");
        hint.className = "assistant-hint";
        hint.innerHTML = 'Dúvidas sobre o Sorasaki? Toque em mim.<button type="button" aria-label="Dispensar">×</button>';
        hint.querySelector("button").onclick = () => hint.remove();
        widget.insertBefore(hint, launcher);
        setTimeout(() => hint.remove(), 9000);
      }, 5000);
    }
  } catch {}
}

/* ===== 7. Inicialização ===== */
// Imagens decorativas não abrem menu de "salvar imagem" nem são arrastadas.
// (Links continuam funcionando normalmente, inclusive os que têm imagem.)
document.addEventListener("contextmenu", (e) => { if (e.target instanceof HTMLImageElement && !e.target.closest("a")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (e.target instanceof HTMLImageElement) e.preventDefault(); });

window.addEventListener("unhandledrejection", (e) => console.error("[SORASAKI] Erro não tratado:", e.reason));

function iniciarSorasaki() {
  marcarNavAtiva();
  window.SorasakiAuth._init();
  criarMenuSorasaki();
  marcarNavAtiva();
  ligarIndicadorDoBot();
  criarAssistente();
  ligarRevelacao();
  criarBorboleta();
  iniciarConfigPublica();

  const aviso = document.getElementById("avisoConexao");
  if (aviso) {
    onFetchError((msg) => { aviso.textContent = msg; aviso.classList.add("is-visible"); });
    onStats(() => { aviso.classList.remove("is-visible"); });
  }
  if (document.body.dataset.live === "true") bootstrapDashboard();
  else if ([...document.querySelectorAll("[data-bot-status]")].some((el) => el.offsetParent !== null)) setTimeout(buscarStats, 600);

  instalarGuardaDeManutencao().then((ativa) => {
    window.SORASAKI_MAINTENANCE = ativa;
    document.dispatchEvent(new CustomEvent("sorasaki:maintenance-checked", { detail: { active: ativa } }));
    if (!ativa) registrarVisita();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarSorasaki);
else iniciarSorasaki();
