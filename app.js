const SORASAKI_FAQ = [
  { pergunta: "Pra que esse site está sendo criado?", resposta: "O Sorasaki está sendo desenvolvido com o objetivo de evoluir para uma plataforma cada vez mais interativa e completa, inicialmente voltada para vendas de contas e serviços relacionados. A ideia é que, futuramente, o projeto possa ir muito além disso e se transformar em uma comunidade inteira voltada para vendas, bots, ferramentas e outros recursos.\n\nO Sorasaki reúne ferramentas para facilitar o dia a dia e tornar a experiência mais prática e agradável. ❤️‍🩹" },
  { pergunta: "O site tem outras funcionalidades além das estatísticas?", resposta: "Sim! As estatísticas são apenas uma parte do site. O Sorasaki está sendo desenvolvido para ter várias outras funcionalidades, e novas ferramentas, modelos e recursos estão sendo adicionados aos poucos.\n\nA intenção é que o site não seja apenas um lugar para visualizar estatísticas, mas se torne uma plataforma realmente interativa, útil e completa para quem utiliza o bot e participa dos grupos." },
  { pergunta: "Por que um comando não funciona ou não responde?", resposta: "Hmmm... 🤔 Normalmente, quando um comando não responde, pode ser porque o bot está offline ou passando por algum problema temporário.\n\nPorém, se outros comandos estão funcionando normalmente e apenas um específico não responde, pode ser algum problema com aquele comando.\n\nNesse caso, você pode entrar em contato com o Suporte ou enviar um Relatório de Bug, para que o problema possa ser analisado e corrigido.\n\n⚠️ Para enviar um relatório de bug, é necessário estar logado na conta." },
  { pergunta: "O que é o Sorasaki?", resposta: "O Sorasaki é um bot desenvolvido para ajudar na organização, proteção e gerenciamento de grupos, trazendo ferramentas para facilitar a administração e deixar os grupos mais seguros e interativos." },
  { pergunta: "O Sorasaki é gratuito?", resposta: "O acesso e as funcionalidades podem depender de como o projeto estiver configurado no momento. Algumas funções podem estar disponíveis gratuitamente, enquanto outras podem ser adicionadas ou modificadas conforme o projeto evolui." },
  { pergunta: "Preciso ter uma conta para usar o site?", resposta: "Nem todas as áreas precisam de login, mas algumas funções específicas podem exigir que você esteja conectado, principalmente recursos que envolvem relatórios, avaliações ou informações da sua conta." },
  { pergunta: "Como posso relatar um bug?", resposta: "Você pode utilizar a área de Relatório de Bugs e explicar o que aconteceu, qual função estava utilizando e, se possível, enviar detalhes que ajudem a identificar o problema. O login é obrigatório para enviar o relatório." },
  { pergunta: "Posso enviar sugestões para o site?", resposta: "Sim! A ideia é justamente permitir que os usuários ajudem o projeto a evoluir. Você pode enviar sugestões sobre novas funções, melhorias no visual, ferramentas ou qualquer outra ideia que possa tornar o Sorasaki melhor." },
  { pergunta: "Como posso avaliar o Sorasaki?", resposta: "Você poderá deixar uma avaliação sobre sua experiência com o Sorasaki. Sua opinião ajuda a melhorar o serviço." },
  { pergunta: "O site vai receber novas funções?", resposta: "Sim! Novas funções, melhorias e ferramentas podem chegar ao Sorasaki ao longo do tempo." },
  { pergunta: "Posso sugerir uma nova função para o bot?", resposta: "Claro! Se você tiver uma ideia interessante, pode enviá-la pelo sistema de sugestões. Algumas ideias podem acabar sendo incorporadas ao projeto futuramente. 👀" },
  { pergunta: "Por que algumas funções podem não estar disponíveis?", resposta: "Algumas funções podem ficar temporariamente indisponíveis. Quando isso acontecer, tente novamente mais tarde." },
  { pergunta: "Onde encontro meus grupos?", resposta: "A área de grupos foi criada para facilitar o acesso às comunidades e grupos relacionados ao projeto. Nela, você poderá encontrar as informações e links disponíveis de forma mais organizada." },
  { pergunta: "Posso entrar nos grupos pelo site?", resposta: "Sim, quando um grupo possuir um link de convite disponível, você poderá acessá-lo diretamente pela área de grupos." },
  { pergunta: "As estatísticas são atualizadas automaticamente?", resposta: "As estatísticas dependem das informações que o sistema consegue receber do bot. Algumas informações podem ser atualizadas automaticamente, enquanto outras podem depender de sincronização ou processamento." },
  { pergunta: "O que faço se encontrar um erro no site?", resposta: "Se você encontrar alguma coisa funcionando de forma diferente do esperado, tente enviar um relatório de bug explicando exatamente o que aconteceu. Quanto mais detalhes forem fornecidos, mais fácil será investigar o problema." },
  { pergunta: "O que posso fazer se tiver uma dúvida que não aparece aqui?", resposta: "Caso sua dúvida não esteja entre as opções disponíveis, você pode procurar a área de suporte e entrar em contato para receber ajuda." },
  { pergunta: "O projeto vai virar uma comunidade?", resposta: "Essa é uma das possibilidades para o futuro. A ideia é que o projeto possa crescer além do bot e do site, criando uma comunidade voltada para vendas, bots, ferramentas e outros assuntos relacionados." },
  { pergunta: "Quem está desenvolvendo o projeto?", resposta: "O Sorasaki é pensado para oferecer uma experiência completa, bonita e funcional para quem usa o serviço." },
  { pergunta: "Como posso ajudar o projeto?", resposta: "Você pode ajudar enviando sugestões, relatando bugs, avaliando o bot, participando dos grupos e compartilhando ideias para novas funcionalidades. Mesmo uma pequena sugestão pode ajudar o projeto a evoluir. 🫡" }
];

const listeners = [];
const errorListeners = [];
const connectionListeners = [];
const INTERVALO_ATUALIZACAO_MS = 8000;
const TIMEOUT_FETCH_MS = 10000;

function onStats(callback) { listeners.push(callback); }
function onFetchError(callback) { errorListeners.push(callback); }
function onConnection(callback) { connectionListeners.push(callback); }

function emitStats(snapshot) {
  for (const cb of listeners) {
    try { cb(snapshot); } catch (e) { console.error(e); }
  }
}

function emitError(mensagem) {
  for (const cb of errorListeners) {
    try { cb(mensagem); } catch (e) { console.error(e); }
  }
}

function emitConnection(info) {
  for (const cb of connectionListeners) {
    try { cb(info); } catch (e) { console.error(e); }
  }
}

function urlBase() {
  return String(window.SORASAKI_BRIDGE_URL || "").trim().replace(/\/+$/, "");
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_FETCH_MS);
  try {
    const resp = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal });
    let body = null;
    try { body = await resp.json(); } catch {}
    return { resp, body };
  } finally {
    clearTimeout(timer);
  }
}

async function buscarStats() {
  const base = urlBase();

  if (!base) {
    emitConnection({ bridgeOnline: false, botDataReceived: false });
    emitError("Não foi possível carregar esta área. Tente novamente em alguns instantes.");
    return;
  }

  try {
    const health = await fetchJson(`${base}/health`);

    if (!health.resp.ok || !health.body?.ok) {
      emitConnection({ bridgeOnline: false, botDataReceived: false });
      emitError("Não foi possível carregar esta área. Tente novamente em alguns instantes.");
      return;
    }

    emitConnection({
      bridgeOnline: true,
      botDataReceived: Boolean(health.body.botDataReceived),
      lastUpdate: health.body.lastUpdate || null
    });

    const stats = await fetchJson(`${base}/api/stats`);

    if (stats.resp.status === 503) {
      emitError("Os dados ainda não estão disponíveis. Tente novamente em alguns instantes.");
      return;
    }

    if (!stats.resp.ok) {
      emitError("Não foi possível atualizar os dados agora. Tente novamente em alguns instantes.");
      return;
    }

    if (!stats.body || typeof stats.body !== "object") {
      emitError("Não foi possível atualizar os dados agora. Tente novamente em alguns instantes.");
      return;
    }
    const snapshot = (stats.body.data && typeof stats.body.data === "object")
      ? stats.body.data
      : stats.body;

    emitStats(snapshot);
    emitConnection({ bridgeOnline: true, botDataReceived: true, lastUpdate: stats.body.timestamp || stats.body.bridge?.receivedAt || health.body.lastUpdate || null });
  } catch (e) {
    console.error("[SORASAKI] Falha ao atualizar informações:", e);
    emitConnection({ bridgeOnline: false, botDataReceived: false });
    emitError(e?.name === "AbortError"
      ? "A atualização demorou mais que o esperado."
      : "Não foi possível carregar esta área. Tente novamente em alguns instantes.");
  }
}

function bootstrapDashboard() {
  let falhasSeguidas = 0;
  let cronometro = null;

  function proximoAtraso(falhas) {
    if (falhas === 0) return INTERVALO_ATUALIZACAO_MS;
    const base = Math.min(INTERVALO_ATUALIZACAO_MS * 2 ** Math.min(falhas, 4), 120000);
    const jitter = base * 0.2 * Math.random();
    return Math.round(base + jitter);
  }

  async function ciclo() {
    await buscarStats();
    cronometro = setTimeout(ciclo, proximoAtraso(falhasSeguidas));
  }

  onFetchError(() => { falhasSeguidas += 1; });
  onStats(() => { falhasSeguidas = 0; });

  ciclo();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      clearTimeout(cronometro);
      falhasSeguidas = 0;
      ciclo();
    }
  });
}

function fmtNumero(n) {
  return new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
}

const MAPA_ESCAPE_HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/[&<>"']/g, (c) => MAPA_ESCAPE_HTML[c]);
}

function fmtUptime(ms) {
  if (!ms || ms < 1000) return "0m";
  const s = Math.floor(ms / 1000);
  const dias = Math.floor(s / 86400);
  const horas = Math.floor((s % 86400) / 3600);
  const minutos = Math.floor((s % 3600) / 60);
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

function statusEfetivo(snapshot) {
  if (snapshot.status !== "online") return snapshot.status || "offline";
  const quedas = snapshot.historico?.quedas || [];
  const agora = Date.now();
  const recentes = quedas.filter((q) => q.inicio && agora - new Date(q.inicio).getTime() < 15 * 60 * 1000).length;
  return recentes >= 2 ? "instavel" : "online";
}

function statusInfo(status) {
  const mapa = {
    online: { texto: "Bot Online", classe: "online", emoji: "🟢" },
    instavel: { texto: "Bot Instável", classe: "instavel", emoji: "🟡" },
    reconectando: { texto: "Reconectando...", classe: "reconectando", emoji: "🟡" },
    conectando: { texto: "Conectando...", classe: "conectando", emoji: "🟣" },
    offline: { texto: "Bot Offline", classe: "offline", emoji: "🔴" }
  };
  return mapa[status] || mapa.offline;
}


function criarAssistente() {
  if (document.querySelector('.assistant-widget')) return;

  const widget = document.createElement('aside');
  widget.className = 'assistant-widget';
  widget.setAttribute('aria-label', 'Assistente do painel');
  widget.innerHTML = `
    <div class="sora-chat-panel" id="soraChatPanel" role="dialog" aria-label="Chat da assistente Sorasaki" aria-hidden="true">
      <div class="sora-chat-head">
        <div class="sora-chat-head-info">
          <span class="sora-chat-avatar"><img src="assistente-nojx.png" alt="" /></span>
          <div><strong>Assistente Sorasaki</strong><small>Geralmente responde na hora ✨</small></div>
        </div>
        <button class="sora-chat-close" id="soraChatClose" type="button" aria-label="Fechar chat">×</button>
      </div>
      <div class="sora-chat-body" id="soraChatBody"></div>
    </div>
    <div class="assistant-bubble" id="assistantBubble">
      <button class="assistant-close" id="assistantClose" type="button" aria-label="Esconder assistente">×</button>
      <strong>Oii! 👋</strong>
      <span id="assistantMessage">Eu sou a assistente do Sorasaki 💜</span>
    </div>
    <button class="assistant-character" id="assistantCharacter" type="button" aria-label="Conversar com a assistente">
      <span class="assistant-glow"></span>
      <img src="assistente-nojx.png" alt="Assistente do Sorasaki acenando" draggable="false" />
      <span class="assistant-wave-lines" aria-hidden="true"></span>
    </button>
    <button class="assistant-show" id="assistantShow" type="button" aria-label="Mostrar assistente">👋</button>
  `;
  document.body.appendChild(widget);

  const bubble = widget.querySelector('#assistantBubble');
  const character = widget.querySelector('#assistantCharacter');
  const message = widget.querySelector('#assistantMessage');
  const close = widget.querySelector('#assistantClose');
  const show = widget.querySelector('#assistantShow');
  const panel = widget.querySelector('#soraChatPanel');
  const chatBody = widget.querySelector('#soraChatBody');
  const chatClose = widget.querySelector('#soraChatClose');

  const messages = [
    'Eu sou a assistente do Sorasaki 💜',
    'Tudo certinho por aí? ✨',
    'Tem alguma dúvida? Clique em mim! 👋',
    'Clique em mim pra bater um papo~ 💬',
    'Deixei esse cantinho mais vivo pra você 💜',
    'O Sorasaki está de olho em tudo por aqui ✨'
  ];
  let index = 0;
  let chatIniciado = false;

  function trocarMensagemIdle() {
    index = (index + 1) % messages.length;
    message.textContent = messages[index];
    bubble.classList.remove('is-pop');
    void bubble.offsetWidth;
    bubble.classList.add('is-pop');
  }

  function acenar() {
    character.classList.remove('is-waving');
    void character.offsetWidth;
    character.classList.add('is-waving');
  }

  function rolarParaFinal() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function adicionarMensagem(tipo, texto) {
    const msg = document.createElement('div');
    msg.className = `sora-chat-msg ${tipo}`;
    msg.innerHTML = String(texto)
      .split(/\n{2,}/)
      .map((par) => `<p>${escapeHtml(par)}</p>`)
      .join('');
    chatBody.appendChild(msg);
    rolarParaFinal();
    return msg;
  }

  function montarChips() {
    const chips = document.createElement('div');
    chips.className = 'sora-chat-chips';
    SORASAKI_FAQ.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sora-chat-chip';
      btn.textContent = item.pergunta;
      btn.addEventListener('click', () => responder(item, chips));
      chips.appendChild(btn);
    });
    chatBody.appendChild(chips);
    rolarParaFinal();
    return chips;
  }

  function responder(item, chipsAntigos) {
    chipsAntigos.remove();
    adicionarMensagem('user', item.pergunta);

    const digitando = document.createElement('div');
    digitando.className = 'sora-chat-msg assistant sora-chat-typing';
    digitando.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(digitando);
    rolarParaFinal();

    setTimeout(() => {
      digitando.remove();
      adicionarMensagem('assistant', item.resposta);

      const voltar = document.createElement('button');
      voltar.type = 'button';
      voltar.className = 'sora-chat-back';
      voltar.textContent = '← Voltar para perguntas';
      voltar.addEventListener('click', () => {
        voltar.remove();
        montarChips();
      });
      chatBody.appendChild(voltar);
      rolarParaFinal();
    }, 550);
  }

  function abrirChat() {
    widget.classList.remove('is-hidden');
    widget.classList.add('chat-open');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    if (!chatIniciado) {
      chatIniciado = true;
      adicionarMensagem('assistant', 'Oii! 👋 Sou a assistente do Sorasaki! Tem alguma dúvida? Escolhe uma das opções abaixo que eu tento te ajudar! ✨');
      montarChips();
    }
  }

  function fecharChat() {
    widget.classList.remove('chat-open');
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }
  let arrastando = false;
  let moveuDuranteArraste = false;
  let ponteiroId = null;
  let offsetX = 0;
  let offsetY = 0;

  function limitar(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
  }

  function iniciarArraste(event) {
    if (event.button !== undefined && event.button !== 0) return;
    arrastando = true;
    moveuDuranteArraste = false;
    ponteiroId = event.pointerId;
    const rect = widget.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    widget.style.left = `${rect.left}px`;
    widget.style.top = `${rect.top}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    character.setPointerCapture?.(event.pointerId);
    character.classList.add('is-dragging');
    event.preventDefault();
  }

  function moverArraste(event) {
    if (!arrastando || event.pointerId !== ponteiroId) return;
    const largura = widget.offsetWidth;
    const altura = widget.offsetHeight;
    const maxX = Math.max(0, window.innerWidth - largura);
    const maxY = Math.max(0, window.innerHeight - altura);
    const x = limitar(event.clientX - offsetX, 0, maxX);
    const y = limitar(event.clientY - offsetY, 0, maxY);
    if (Math.abs(x - parseFloat(widget.style.left || 0)) > 3 || Math.abs(y - parseFloat(widget.style.top || 0)) > 3) {
      moveuDuranteArraste = true;
    }
    widget.style.left = `${x}px`;
    widget.style.top = `${y}px`;
  }

  function finalizarArraste(event) {
    if (!arrastando || (event.pointerId !== undefined && event.pointerId !== ponteiroId)) return;
    arrastando = false;
    ponteiroId = null;
    character.classList.remove('is-dragging');
    character.releasePointerCapture?.(event.pointerId);
  }

  character.addEventListener('pointerdown', iniciarArraste);
  character.addEventListener('pointermove', moverArraste);
  character.addEventListener('pointerup', finalizarArraste);
  character.addEventListener('pointercancel', finalizarArraste);
  character.addEventListener('click', (event) => {
    if (moveuDuranteArraste) {
      moveuDuranteArraste = false;
      event.preventDefault();
      return;
    }
    acenar();
    abrirChat();
  });
  bubble.addEventListener('click', (event) => {
    if (event.target === close) return;
    abrirChat();
  });
  chatClose.addEventListener('click', fecharChat);
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    widget.classList.add('is-hidden');
    fecharChat();
  });
  show.addEventListener('click', () => widget.classList.remove('is-hidden'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) fecharChat();
  });

  setInterval(() => {
    if (!widget.classList.contains('is-hidden') && !panel.classList.contains('is-open')) {
      acenar();
      trocarMensagemIdle();
    }
  }, 6500);
}

function marcarNavAtiva() {
  const atual = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.getAttribute("href") === atual) a.classList.add("active");
  });
}
document.addEventListener("click", (event) => {
  const imageLink = event.target.closest?.("a");
  if (imageLink && imageLink.querySelector("img")) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

document.addEventListener("contextmenu", (event) => {
  const image = event.target.closest?.("img");
  const imageLink = event.target.closest?.("a");
  if (image || (imageLink && imageLink.querySelector("img"))) event.preventDefault();
}, true);

document.addEventListener("dragstart", (event) => {
  if (event.target.closest?.("img") || event.target.closest?.("a")?.querySelector("img")) {
    event.preventDefault();
  }
}, true);

document.addEventListener("DOMContentLoaded", () => {
  marcarNavAtiva();
  criarAssistente();
  const avisoEl = document.getElementById("avisoConexao");
  if (avisoEl) {
    onFetchError((msg) => { avisoEl.textContent = `⚠️ ${msg}`; avisoEl.style.display = "block"; });
    onStats(() => { avisoEl.style.display = "none"; });
  }
  bootstrapDashboard();
});

function criarMenuSorasaki() {
  if (document.querySelector('.sora-drawer')) return;
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  const atual = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html', '🏠', 'Início', 'Visão geral e status rápido'],
    ['sobre.html', '🤖', 'Sobre o Sorasaki', 'Conheça o projeto'],
    ['grupos.html', '👥', 'Meus Grupos', 'Comunidades do Sorasaki'],
    ['grupos.html#vendas', '🛒', 'Grupos de Vendas', 'Acesse as comunidades de vendas'],
    ['recursos.html', '🛡️', 'Recursos / Proteção', 'Ferramentas e segurança'],
    ['estatisticas.html', '📊', 'Estatísticas', 'Dados e atividade'],
    ['status.html', '🟢', 'Status', 'Saúde e conexão'],
    ['suporte.html', '💬', 'Suporte', 'Fale com a equipe'],
    ['feedback.html', '📝', 'Avaliações & Bugs', 'Avalie, sugira e relate problemas'],
    ['configuracoes.html', '⚙️', 'Configurações', 'Preferências do painel'],
    ['#sorasaki-login', '👤', 'Perfil / Entrar', 'Acesse sua conta e seu perfil']
  ];

  const trigger = document.createElement('button');
  trigger.className = 'menu-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Abrir menu do Sorasaki');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span></span><span></span><span></span><b>MENU</b>';

  const overlay = document.createElement('div');
  overlay.className = 'sora-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const drawer = document.createElement('aside');
  drawer.className = 'sora-drawer';
  drawer.setAttribute('aria-label', 'Central de navegação do Sorasaki');
  drawer.innerHTML = `
    <div class="sora-menu-head">
      <div class="sora-menu-brand">
        <span class="menu-logo">✦</span>
        <div><strong>Sorasaki</strong><small>Central de navegação</small></div>
      </div>
      <button class="sora-menu-close" type="button" aria-label="Fechar menu">×</button>
    </div>

    <section class="sora-menu-character" id="soraMenuCharacter" aria-label="Sorasaki — central do menu">
      <div class="menu-character-glow"></div>
      <div class="menu-character-grid"></div>
      <span class="menu-spark spark-1">✦</span>
      <span class="menu-spark spark-2">✧</span>
      <span class="menu-spark spark-3">♡</span>
      <div class="menu-character-badge">☰ <span>central do Sorasaki</span></div>
      <img src="sorasaki-menu.png" alt="Sorasaki apresentando o menu" draggable="false" loading="eager" />
      <div class="menu-character-card">
        <span class="menu-character-status"><i></i> online</span>
        <strong>Oi! Eu sou a Sorasaki 👋</strong>
        <small>Toque em mim e explore o painel.</small>
      </div>
    </section>

    <div class="sora-menu-content">
      <div class="sora-menu-label">Navegação</div>
      <div class="sora-menu-items"></div>
      <div class="sora-menu-quick">
        <a href="grupos.html" class="menu-quick-card"><span>👥</span><b>Grupos</b><small>Explorar</small></a>
        <a href="status.html" class="menu-quick-card"><span>🟢</span><b>Status</b><small>Ver agora</small></a>
        <a href="feedback.html" class="menu-quick-card menu-quick-feedback"><span>📝</span><b>Feedback</b><small>Avaliar / relatar</small></a>
        <a href="configuracoes.html" class="menu-quick-card"><span>⚙️</span><b>Preferências</b><small>Ajustar painel</small></a>
      </div>
      <div class="sora-menu-status"><span class="live-dot"></span><div><strong>Painel conectado</strong><span>Acompanhe tudo em um só lugar.</span></div></div>
      <div class="sora-menu-footer">Sorasaki • proteção, organização e interação.</div>
    </div>
  `;

  const list = drawer.querySelector('.sora-menu-items');
  for (const [href, icon, title, desc] of links) {
    const a = document.createElement('a');
    a.className = 'sora-menu-link';
    const base = href.split('#')[0];
    if (base === atual) a.classList.add('active');
    a.href = href;
    a.style.setProperty('--menu-i', list.children.length);
    a.innerHTML = `<span class="menu-icon">${icon}</span><span><strong>${title}</strong><small>${desc}</small></span><span class="menu-arrow">›</span>`;
    list.appendChild(a);
  }

  topbar.appendChild(trigger);
  const loginTrigger = document.createElement('button');
  loginTrigger.className = 'sora-login-trigger';
  loginTrigger.type = 'button';
  loginTrigger.innerHTML = '<span class="login-dot"></span><span class="login-trigger-label">Entrar</span>';
  loginTrigger.setAttribute('aria-label', 'Abrir conta ou perfil');
  topbar.appendChild(loginTrigger);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  const closeButton = drawer.querySelector('.sora-menu-close');
  const character = drawer.querySelector('#soraMenuCharacter');

  function fechar() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  }
  function abrir() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
  }

  trigger.addEventListener('click', () => drawer.classList.contains('is-open') ? fechar() : abrir());
  closeButton.addEventListener('click', fechar);
  overlay.addEventListener('click', fechar);
  if (character) {
    character.addEventListener('pointermove', (event) => {
      const r = character.getBoundingClientRect();
      const x = ((event.clientX - r.left) / r.width - .5) * 2;
      const y = ((event.clientY - r.top) / r.height - .5) * 2;
      character.style.setProperty('--mx', `${(x * 7).toFixed(2)}deg`);
      character.style.setProperty('--my', `${(y * -5).toFixed(2)}deg`);
    });
    character.addEventListener('pointerleave', () => {
      character.style.setProperty('--mx', '0deg');
      character.style.setProperty('--my', '0deg');
    });
    character.addEventListener('click', () => {
      character.classList.remove('is-cheering');
      void character.offsetWidth;
      character.classList.add('is-cheering');
    });
  }

  drawer.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    fechar();
    const href = link.getAttribute('href') || '';
    if (href === '#sorasaki-login') {
      event.preventDefault();
      if(window.SorasakiAuth?.getUser()) window.SorasakiAuth.openProfile(); else window.SorasakiAuth?.open();
      return;
    }
    const [page, hash] = href.split('#');
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    if (hash && (!page || page === currentPage)) {
      event.preventDefault();
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${hash}`);
    }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') fechar(); });
}

const _criarMenuOriginal = criarAssistente;
criarAssistente = function() {
  _criarMenuOriginal();
  criarMenuSorasaki();
};


(function () {
  const SUPA_URL = window.SORASAKI_SUPABASE_URL || '';
  const SUPA_KEY = window.SORASAKI_SUPABASE_KEY || '';
  let client = null;
  let currentUser = null;
  const authListeners = [];
  let resolveReady;
  let afterAuthAction = null;
  const ready = new Promise(r => resolveReady = r);
  function setAfterAuth(fn) { afterAuthAction = typeof fn === 'function' ? fn : null; }
  function runAfterAuth() { const fn = afterAuthAction; afterAuthAction = null; if (fn) setTimeout(() => { try { fn(); } catch (e) { console.warn('[SORASAKI] Pós-login:', e); } }, 80); }

  function ensureClient() {
    if (client) return client;
    if (!SUPA_URL || !SUPA_KEY || !window.supabase?.createClient) return null;
    client = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }
  async function syncSession() {
    const c = ensureClient();
    if (!c) { resolveReady(); return; }
    const { data } = await c.auth.getSession();
    currentUser = data?.session?.user || null;
    updateAuthUI();
    authListeners.forEach(fn => { try { fn(currentUser, null); } catch {} });
    c.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();
      authListeners.forEach(fn => { try { fn(currentUser, event); } catch {} });
    });
    resolveReady();
  }
  function getUser() { return currentUser; }
  function onAuthChange(callback) { if (typeof callback === 'function') authListeners.push(callback); return () => { const i = authListeners.indexOf(callback); if (i >= 0) authListeners.splice(i, 1); }; }
  async function getToken() {
    const c = ensureClient();
    if (!c) return '';
    const { data } = await c.auth.getSession();
    return data?.session?.access_token || '';
  }
  async function logout() {
    const c = ensureClient();
    if (c) await c.auth.signOut();
    currentUser = null;
    updateAuthUI();
  }

  function createLoginUI() {
    if (document.querySelector('.sora-login-drawer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'sora-login-overlay'; overlay.setAttribute('aria-hidden','true');
    const drawer = document.createElement('aside');
    drawer.className = 'sora-login-drawer'; drawer.id = 'sorasaki-login';
    drawer.innerHTML = `
      <div class="login-head"><div class="login-brand"><span>🔐</span><div><strong>Conta Sorasaki</strong><small>Login para recursos da conta</small></div></div><div class="login-head-actions"><button class="auth-logout hidden" id="authLogout" type="button">Sair</button><button class="login-close" type="button" aria-label="Fechar login">×</button></div></div>
      <div class="login-tabs"><button type="button" class="login-tab active" data-auth-tab="login">Entrar</button><button type="button" class="login-tab" data-auth-tab="register">Criar conta</button></div>
      <div class="auth-panel" data-auth-panel="login">
        <div class="login-intro"><b>Bem-vindo de volta 💜</b><span>Você pode navegar pelo catálogo sem conta. Para enviar grupos, avaliar, relatar ou comprar, é necessário estar conectado.</span></div>
        <label>E-mail<input id="authEmail" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
        <label>Senha<div class="password-wrap"><input id="authPassword" type="password" autocomplete="current-password" placeholder="Sua senha"><button type="button" class="password-toggle" aria-label="Mostrar senha">◉</button></div></label>
        <button class="auth-primary" id="authLogin" type="button">Entrar <span>→</span></button>
        <div class="auth-row"><button class="auth-link" id="authForgot" type="button">Esqueci minha senha</button><button class="auth-link" id="authRegisterSwitch" type="button">Criar conta</button></div>
        <div class="auth-result" id="authResult" aria-live="polite"></div>
      </div>
      <div class="auth-panel hidden" data-auth-panel="register">
        <div class="login-intro"><b>Crie sua conta ✨</b><span>Escolha um nome de usuário, use um e-mail válido e uma senha com pelo menos 8 caracteres. Depois, confirme seu e-mail pelo link enviado pelo Sorasaki.</span></div>
        <div id="registerFormFields">
          <label>Nome de usuário<input id="registerUsername" type="text" autocomplete="username" maxlength="24" placeholder="ex.: sorasakifan"></label>
          <label>E-mail<input id="registerEmail" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
          <label>Senha<input id="registerPassword" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>
          <label>Confirmar senha<input id="registerConfirm" type="password" autocomplete="new-password" placeholder="Digite novamente"></label>
          <button class="auth-primary" id="authRegister" type="button">Criar conta <span>✦</span></button>
        </div>
        <div class="auth-code-area hidden" id="signupCodeArea">
          <div class="code-title"><span>✉</span><div><b>Confirme seu e-mail.</b><small>Abra o e-mail do Sorasaki e clique no botão de confirmação. Depois você voltará ao site já conectado.</small></div></div>
          <button class="auth-primary" id="authResendSignup" type="button">Reenviar e-mail <span>↻</span></button>
        </div>
        <div class="auth-result" id="registerResult" aria-live="polite"></div>
      </div>
      <div class="auth-panel hidden" data-auth-panel="forgot">
        <div class="login-intro"><b>Recuperar acesso 📩</b><span>Digite o e-mail da conta. Enviaremos um código de 6 dígitos.</span></div>
        <label>E-mail<input id="forgotEmail" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
        <button class="auth-primary" id="authSendCode" type="button">Enviar código <span>✉</span></button>
        <div class="auth-code-area hidden" id="authCodeArea">
          <label>Código recebido<input id="resetCode" inputmode="numeric" maxlength="6" placeholder="000000"></label>
          <label>Nova senha<input id="resetPassword" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>
          <button class="auth-secondary" id="authReset" type="button">Redefinir senha</button>
        </div>
        <button class="auth-link back-login" id="authBackLogin" type="button">← Voltar para o login</button>
        <div class="auth-result" id="forgotResult" aria-live="polite"></div>
      </div>
      <div class="login-character-tip"><div><strong>Ei! 👀</strong><span>Quer divulgar um grupo ou participar da comunidade?</span><small>Faça login para continuar!</small></div><img src="sorasaki-login.png" alt="Sorasaki apontando para o login" draggable="false"></div>
      <div class="login-privacy">🔐 Sua conta está protegida e seus dados de acesso são tratados com segurança.</div>`;
    document.body.appendChild(overlay); document.body.appendChild(drawer);
    const open=()=>{drawer.classList.add('is-open');overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('login-open');};
    const close=()=>{drawer.classList.remove('is-open');overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('login-open');};
    window.SorasakiAuth.open=open;
    drawer.querySelector('.login-close').onclick=close; overlay.onclick=close;
    const tabs=drawer.querySelectorAll('[data-auth-tab]'), panels=drawer.querySelectorAll('[data-auth-panel]');
    function tab(name){panels.forEach(p=>p.classList.toggle('hidden',p.dataset.authPanel!==name));tabs.forEach(t=>t.classList.toggle('active',t.dataset.authTab===name));}
    tabs.forEach(t=>t.onclick=()=>tab(t.dataset.authTab));
    drawer.querySelector('#authRegisterSwitch').onclick=()=>tab('register'); drawer.querySelector('#authForgot').onclick=()=>tab('forgot'); drawer.querySelector('#authBackLogin').onclick=()=>tab('login');
    drawer.querySelector('.password-toggle').onclick=e=>{const i=drawer.querySelector('#authPassword');i.type=i.type==='password'?'text':'password';e.currentTarget.textContent=i.type==='password'?'◉':'◎';};
    const show=(id,ok,msg)=>{const el=drawer.querySelector('#'+id);el.className='auth-result '+(ok?'ok':'error');el.textContent=msg;};
    const c=ensureClient();
    if(!c){show('authResult',false,'Não foi possível carregar sua conta. Tente novamente.');}

    drawer.querySelector('#authLogin').onclick=async()=>{
      const c=ensureClient(); if(!c)return show('authResult',false,'Não foi possível acessar sua conta. Tente novamente.');
      const email=drawer.querySelector('#authEmail').value.trim(),password=drawer.querySelector('#authPassword').value;
      if(!email||!password)return show('authResult',false,'Informe seu e-mail e sua senha.');
      const {error}=await c.auth.signInWithPassword({email,password});
      if(error)return show('authResult',false,traduzAuthError(error));
      show('authResult',true,'Login realizado! 💜'); runAfterAuth(); setTimeout(close,500);
    };
    let pendingSignupEmail = '';

    drawer.querySelector('#authRegister').onclick=async()=>{
      const c=ensureClient(); if(!c)return show('registerResult',false,'Não foi possível acessar sua conta. Tente novamente.');
      const username=drawer.querySelector('#registerUsername').value.trim(), email=drawer.querySelector('#registerEmail').value.trim(),password=drawer.querySelector('#registerPassword').value,confirm=drawer.querySelector('#registerConfirm').value;
      if(!username||!email||!password)return show('registerResult',false,'Preencha nome de usuário, e-mail e senha.');
      if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))return show('registerResult',false,'O nome de usuário deve ter 3 a 24 caracteres, usando letras, números ou _.');
      if(password.length<8)return show('registerResult',false,'A senha precisa ter pelo menos 8 caracteres.');
      if(password!==confirm)return show('registerResult',false,'As senhas não coincidem.');
      const redirectTo = window.location.href.split('#')[0];
      const {data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:redirectTo,data:{username,display_name:username}}});
      if(error)return show('registerResult',false,traduzAuthError(error));
      pendingSignupEmail = email;
      if(data.user && !data.session){
        drawer.querySelector('#signupCodeArea').classList.remove('hidden');
        drawer.querySelector('#registerFormFields').classList.add('hidden');
        show('registerResult',true,'Conta criada! Enviamos um e-mail de confirmação. Clique no link para voltar ao Sorasaki já conectado. 💜');
      } else {
        currentUser=data?.session?.user||data?.user||null;
        updateAuthUI();
        show('registerResult',true,'Conta criada e sessão iniciada! Bem-vindo ao Sorasaki. 💜');
        runAfterAuth(); setTimeout(close,700);
      }
    };

    drawer.querySelector('#authSendCode').onclick=async()=>{
      const c=ensureClient(); if(!c)return show('forgotResult',false,'Não foi possível acessar sua conta. Tente novamente.');
      const email=drawer.querySelector('#forgotEmail').value.trim(); if(!email)return show('forgotResult',false,'Informe o e-mail da conta.');
      const {error}=await c.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
      if(error)return show('forgotResult',false,traduzAuthError(error));
      drawer.querySelector('#authCodeArea').classList.remove('hidden'); show('forgotResult',true,'Código enviado! Verifique seu e-mail e use o código recebido.');
    };
    drawer.querySelector('#authReset').onclick=async()=>{
      const c=ensureClient(); if(!c)return show('forgotResult',false,'Não foi possível acessar sua conta. Tente novamente.');
      const email=drawer.querySelector('#forgotEmail').value.trim(),token=drawer.querySelector('#resetCode').value.trim(),password=drawer.querySelector('#resetPassword').value;
      if(!email||!token||!password)return show('forgotResult',false,'Preencha e-mail, código e nova senha.');
      if(password.length<8)return show('forgotResult',false,'A nova senha precisa ter pelo menos 8 caracteres.');
      const {error:verifyError}=await c.auth.verifyOtp({email,token,type:'email'});
      if(verifyError)return show('forgotResult',false,'Código inválido ou expirado.');
      const {error:updateError}=await c.auth.updateUser({password});
      if(updateError)return show('forgotResult',false,traduzAuthError(updateError));
      show('forgotResult',true,'Senha redefinida! Você já pode entrar com a nova senha. 💜'); setTimeout(()=>tab('login'),900);
    };
    drawer.querySelector('#authLogout').onclick=async()=>{await logout();tab('login');close();};
  }
  function traduzAuthError(error){
    const m=(error?.message||'').toLowerCase();
    if(m.includes('invalid login credentials'))return 'E-mail ou senha incorretos.';
    if(m.includes('user already registered'))return 'Este e-mail já possui uma conta.';
    if(m.includes('email not confirmed'))return 'Confirme seu e-mail antes de entrar.';
    if(m.includes('password'))return 'A senha não atende aos requisitos.';
    if(m.includes('rate limit'))return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    return 'Não foi possível concluir a operação. Tente novamente em alguns instantes.';
  }
  function fmtDataHora(ts){
    if(!ts)return 'Ainda não disponível';
    try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(ts));}catch{return '—';}
  }
  async function loadProfile(){
    const c=ensureClient(), user=getUser();
    if(!c||!user)return null;
    const {data,error}=await c.from('profiles').select('username,display_name,created_at,updated_at').eq('user_id',user.id).maybeSingle();
    if(error){console.warn('[SORASAKI] Perfil:',error);return null;}
    return data||{};
  }
  function createProfileUI(){
    if(document.querySelector('.sora-profile-modal'))return;
    const overlay=document.createElement('div'); overlay.className='sora-profile-overlay'; overlay.setAttribute('aria-hidden','true');
    const modal=document.createElement('section'); modal.className='sora-profile-modal'; modal.innerHTML=`
      <div class="profile-head"><div><span class="profile-kicker">CONTA SORASAKI</span><h2>👤 Meu perfil</h2><p>Gerencie suas informações e a segurança da conta.</p></div><button class="profile-close" type="button" aria-label="Fechar perfil">×</button></div>
      <div class="profile-card-main"><div class="profile-avatar" id="profileAvatar">@</div><div><strong id="profileUsername">@usuario</strong><span id="profileEmail">email</span><span class="profile-status" id="profileStatus">● Verificando…</span></div></div>
      <div class="profile-grid">
        <div class="profile-info"><small>Nome de usuário</small><b id="profileUsernameInfo">—</b></div>
        <div class="profile-info"><small>E-mail</small><b id="profileEmailInfo">—</b></div>
        <div class="profile-info"><small>Status</small><b id="profileStatusInfo">—</b></div>
        <div class="profile-info"><small>Último login</small><b id="profileLastLogin">—</b></div>
      </div>
      <div class="profile-section-title">SEGURANÇA</div>
      <button class="profile-action" id="profilePasswordBtn" type="button"><span>🔐</span><div><strong>Alterar senha</strong><small>Atualize sua senha com segurança</small></div><b>›</b></button>
      <form class="profile-password-form hidden" id="profilePasswordForm">
        <label>Senha atual<input id="profileCurrentPassword" type="password" autocomplete="current-password" required></label>
        <label>Nova senha<input id="profileNewPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>Confirmar nova senha<input id="profileNewPassword2" type="password" autocomplete="new-password" minlength="8" required></label>
        <div class="profile-form-actions"><button class="auth-secondary" id="profilePasswordCancel" type="button">Cancelar</button><button class="auth-primary" type="submit">Salvar senha</button></div>
        <div class="auth-result" id="profilePasswordResult" aria-live="polite"></div>
      </form>
      <div class="profile-section-title">CONTA</div>
      <button class="profile-action" id="profileInfoBtn" type="button"><span>✏️</span><div><strong>Informações do perfil</strong><small>Altere seu nome de usuário</small></div><b>›</b></button>
      <form class="profile-edit-form hidden" id="profileEditForm">
        <label>Nome de usuário<input id="profileEditUsername" type="text" maxlength="24" autocomplete="username"></label>
        <div class="profile-form-actions"><button class="auth-secondary" id="profileEditCancel" type="button">Cancelar</button><button class="auth-primary" type="submit">Salvar perfil</button></div>
        <div class="auth-result" id="profileEditResult" aria-live="polite"></div>
      </form>
      <div class="profile-section-title">DIVULGAÇÕES</div>
      <button class="profile-action" id="profileGroupsBtn" type="button"><span>📢</span><div><strong>Minhas divulgações</strong><small id="profileGroupsSummary">Gerencie os grupos enviados por você</small></div><b>›</b></button><div class="profile-groups-list hidden" id="profileGroups"></div>
      <button class="profile-logout" id="profileLogout" type="button">🚪 Sair da conta</button>
      <div class="profile-note">🔐 Sua conta está protegida e suas informações de acesso são tratadas com segurança.</div>`;
    document.body.append(overlay,modal);
    const close=()=>{modal.classList.remove('is-open');overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('profile-open');};
    const open=async()=>{if(!getUser()){window.SorasakiAuth.open();return;} modal.classList.add('is-open');overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('profile-open'); await renderProfile();};
    window.SorasakiAuth.openProfile=open;
    modal.querySelector('.profile-close').onclick=close; overlay.onclick=close;
    modal.querySelector('#profilePasswordBtn').onclick=()=>modal.querySelector('#profilePasswordForm').classList.toggle('hidden');
    modal.querySelector('#profilePasswordCancel').onclick=()=>{modal.querySelector('#profilePasswordForm').classList.add('hidden');};
    modal.querySelector('#profileInfoBtn').onclick=()=>{modal.querySelector('#profileEditForm').classList.toggle('hidden');};
    modal.querySelector('#profileEditCancel').onclick=()=>modal.querySelector('#profileEditForm').classList.add('hidden');
    modal.querySelector('#profilePasswordForm').onsubmit=async e=>{
      e.preventDefault(); const c=ensureClient(),user=getUser(),res=modal.querySelector('#profilePasswordResult');
      const current=modal.querySelector('#profileCurrentPassword').value,newPass=modal.querySelector('#profileNewPassword').value,newPass2=modal.querySelector('#profileNewPassword2').value;
      const setRes=(ok,msg)=>{res.className='auth-result '+(ok?'ok':'error');res.textContent=msg;};
      if(!current||!newPass||!newPass2)return setRes(false,'Preencha todos os campos.');
      if(newPass.length<8)return setRes(false,'A nova senha precisa ter pelo menos 8 caracteres.');
      if(newPass!==newPass2)return setRes(false,'As novas senhas não coincidem.');
      const {error:loginError}=await c.auth.signInWithPassword({email:user.email,password:current});
      if(loginError)return setRes(false,'A senha atual está incorreta.');
      const {error}=await c.auth.updateUser({password:newPass});
      if(error)return setRes(false,traduzAuthError(error));
      modal.querySelector('#profilePasswordForm').reset(); setRes(true,'Senha alterada com sucesso! 💜');
      setTimeout(()=>modal.querySelector('#profilePasswordForm').classList.add('hidden'),1100);
    };
    modal.querySelector('#profileEditForm').onsubmit=async e=>{
      e.preventDefault(); const c=ensureClient(),user=getUser(),res=modal.querySelector('#profileEditResult'),username=modal.querySelector('#profileEditUsername').value.trim();
      const setRes=(ok,msg)=>{res.className='auth-result '+(ok?'ok':'error');res.textContent=msg;};
      if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))return setRes(false,'Use 3 a 24 caracteres: letras, números ou _.');
      const {error}=await c.from('profiles').update({username,display_name:username,updated_at:new Date().toISOString()}).eq('user_id',user.id);
      if(error)return setRes(false,error.code==='23505'?'Esse nome de usuário já está em uso.':'Não foi possível salvar o perfil.');
      setRes(true,'Perfil atualizado! 💜'); await renderProfile(); setTimeout(()=>modal.querySelector('#profileEditForm').classList.add('hidden'),800);
    };
    modal.querySelector('#profileGroupsBtn').onclick=()=>{ const list=modal.querySelector('#profileGroups'); list?.classList.toggle('hidden'); };
    modal.querySelector('#profileLogout').onclick=async()=>{if(!confirm('Tem certeza que deseja sair da sua conta?'))return; await logout(); close();};
    async function renderProfile(){
      const user=getUser(); if(!user)return; const p=await loadProfile();
      try { const {count}=await ensureClient().from('groups').select('id',{count:'exact',head:true}).eq('owner_id',user.id); const summary=modal.querySelector('#profileGroupsSummary'); if(summary) summary.textContent=`${count||0} ${count===1?'divulgação':'divulgações'} cadastrada${count===1?'':'s'}`; } catch {} const username=p?.username||p?.display_name||user.user_metadata?.username||user.email?.split('@')[0]||'usuario';
      const confirmed=Boolean(user.email_confirmed_at);
      modal.querySelector('#profileAvatar').textContent='@'; modal.querySelector('#profileUsername').textContent='@'+username; modal.querySelector('#profileEmail').textContent=user.email||'—';
      modal.querySelector('#profileUsernameInfo').textContent='@'+username; modal.querySelector('#profileEmailInfo').textContent=user.email||'—'; modal.querySelector('#profileStatus').textContent=confirmed?'● E-mail confirmado':'● E-mail pendente'; modal.querySelector('#profileStatus').classList.toggle('pending',!confirmed); modal.querySelector('#profileStatusInfo').textContent=confirmed?'E-mail confirmado':'E-mail pendente'; modal.querySelector('#profileLastLogin').textContent=fmtDataHora(user.last_sign_in_at); modal.querySelector('#profileEditUsername').value=username;
      const list=modal.querySelector('#profileGroups');
      const c=ensureClient();
      if(list&&c){
        const {data,error}=await c.from('groups').select('id,name,category,status,view_count,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(20);
        if(error){list.innerHTML='<div class="profile-groups-empty">Não foi possível carregar suas divulgações.</div>';return;}
        const labels={pending:'🟡 Em análise',approved:'🟢 Ativa',rejected:'🔴 Recusada',removed:'⚫ Removida'};
        const cat={vendas:'Vendas',comunidade:'Comunidade',jogos:'Jogos',freefire:'Free Fire',divulgacao:'Divulgação',amizades:'Amizades',suporte:'Suporte',estudos:'Estudos',outros:'Outros'};
        list.innerHTML=(data||[]).map(g=>`<div class="profile-group-row"><div><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(cat[g.category]||g.category)} · ${labels[g.status]||g.status} · 👁️ ${fmtNumero(g.view_count||0)}</small></div><div class="profile-group-actions"><button type="button" data-profile-edit="${g.id}">Editar</button><button type="button" data-profile-delete="${g.id}">Remover</button></div></div>`).join('')||'<div class="profile-groups-empty">Você ainda não publicou nenhuma divulgação.</div>';
        list.querySelectorAll('[data-profile-edit]').forEach(b=>b.onclick=()=>{location.href='/grupos?editar='+b.dataset.profileEdit;});
        list.querySelectorAll('[data-profile-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover esta divulgação?\n\nEssa ação não poderá ser desfeita.'))return;b.disabled=true;const {error}=await c.from('groups').delete().eq('id',Number(b.dataset.profileDelete)).eq('owner_id',user.id);if(error){b.disabled=false;alert('Não foi possível remover a divulgação. Tente novamente.');return;}await renderProfile();});
      }
    }
  }
  async function installMaintenanceGuard(){
    const path=location.pathname.replace(/\/+$/,'') || '/';
    if(path==='/controle-8f4c2e91') return false;
    try{
      const response=await fetch('/api/site-state',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok) return false;
      const state=await response.json();
      if(!state?.maintenance) return false;
      if(state.start_at){const start=new Date(state.start_at);if(!Number.isNaN(start.getTime())&&Date.now()<start.getTime())return false;}
      const existing=document.getElementById('sorasakiMaintenance');
      if(existing) return true;
      const overlay=document.createElement('div');
      overlay.id='sorasakiMaintenance';
      overlay.className='sorasaki-maintenance';
      const card=document.createElement('section');
      card.className='sorasaki-maintenance-card';
      const visual=document.createElement('div');
      visual.className='sorasaki-maintenance-visual';
      const image=String(state.image_url||'');
      let safeImage='';
      try{const u=new URL(image,location.origin);if(['https:','http:'].includes(u.protocol)&&(!u.hostname||u.hostname===location.hostname))safeImage=u.href;}catch{}
      if(safeImage){const img=document.createElement('img');img.src=safeImage;img.alt='';img.loading='eager';visual.appendChild(img);}
      else {visual.textContent='🔧';}
      const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent='SORASAKI';
      const title=document.createElement('h1');title.textContent=state.title||'Estamos em manutenção';
      const message=document.createElement('p');message.textContent=state.message||'Estamos fazendo algumas melhorias. Voltaremos em breve.';
      card.append(visual,eyebrow,title,message);
      if(state.return_at){
        const d=new Date(state.return_at);
        if(!Number.isNaN(d.getTime())){const eta=document.createElement('div');eta.className='sorasaki-maintenance-return';eta.textContent=`Previsão de retorno: ${d.toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}`;card.appendChild(eta);}
      }
      const thanks=document.createElement('div');thanks.className='sorasaki-maintenance-thanks';thanks.textContent='Agradecemos pela compreensão. 💜';card.appendChild(thanks);
      overlay.appendChild(card);document.body.appendChild(overlay);document.documentElement.classList.add('maintenance-active');
      return true;
    }catch{return false;}
  }

  async function trackSiteVisit(){
    const path=location.pathname.replace(/\/+$/,'')||'/'; if(path==='/controle-8f4c2e91'||path.startsWith('/api/'))return;
    try{let id=localStorage.getItem('sorasaki_visitor_id');if(!id||!/^[A-Za-z0-9_-]{20,120}$/.test(id)){id=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'_');localStorage.setItem('sorasaki_visitor_id',id);}await fetch('/api/site-analytics',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({visitor_id:id,path})});}catch{}
  }

  function updateAuthUI(){
    const user=getUser(),btn=document.querySelector('.sora-login-trigger');
    if(btn){btn.classList.toggle('logged',!!user);const label=btn.querySelector('.login-trigger-label');if(label)label.textContent=user?'Perfil':'Entrar';btn.setAttribute('aria-label',user?'Abrir meu perfil':'Entrar ou criar conta');}
    const logout=document.querySelector('#authLogout');if(logout)logout.classList.toggle('hidden',!user);
    document.querySelectorAll('[data-auth-required]').forEach(el=>el.classList.toggle('auth-locked',!user));
    const profileModal=document.querySelector('.sora-profile-modal'); if(profileModal&&user) { const status=profileModal.querySelector('#profileStatus'); if(status) status.textContent=user.email_confirmed_at?'● E-mail confirmado':'● E-mail pendente'; }
  }
  window.SorasakiAuth={getUser,getToken,ready,open:()=>{},openProfile:()=>{},logout,clear:logout,setAfterAuth,requireLogin:(msg='Faça login para continuar.')=>{if(getUser())return true;createLoginUI();window.SorasakiAuth.open();const r=document.querySelector('#authResult');if(r){r.className='auth-result error';r.textContent=msg;}return false;},getClient:ensureClient};
  function init(){createLoginUI();createProfileUI();installMaintenanceGuard().then(async active=>{window.SORASAKI_MAINTENANCE=active;document.dispatchEvent(new CustomEvent('sorasaki:maintenance-checked',{detail:{active}}));if(!active)await trackSiteVisit();const btn=document.querySelector('.sora-login-trigger');if(btn)btn.onclick=()=>getUser()?window.SorasakiAuth.openProfile():window.SorasakiAuth.open();syncSession();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelector('.sora-login-drawer')?.classList.remove('is-open');document.querySelector('.sora-login-overlay')?.classList.remove('is-open');document.querySelector('.sora-profile-modal')?.classList.remove('is-open');document.querySelector('.sora-profile-overlay')?.classList.remove('is-open');document.body.classList.remove('login-open','profile-open');}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
