// Czat w dashboardzie otwartym w osobnym oknie (http://localhost:3000/dashboard.html):
// panel po LEWEJ stronie jak sidebar — zwinięty do wąskiego paska, rozwija się kliknięciem lub Ctrl+B.
// Panel otwiera się NAD dashboardem (bez przeliczania układu i przerysowywania wykresów).
// Pinezka 📌 przypina panel obok dashboardu (układ zmienia się raz, bez animacji).
// Dodawany tylko przez serwer; pobrany plik HTML zostaje czysty. W podglądzie (iframe głównego UI) się nie pokazuje.
(() => {
  if (window.top !== window) return;
  const KEY = 'itsmChatOpen', PIN = 'itsmChatPinned', W = 420, RAIL = 44;
  const css = `
  .itsm-rail{position:fixed;top:0;left:0;height:100vh;width:${RAIL}px;z-index:2147483002;background:#fff;border-right:1px solid #DADDE3;
    display:flex;flex-direction:column;align-items:center;padding-top:10px;gap:8px;font-family:"Segoe UI",Arial,sans-serif}
  .itsm-rail button{width:32px;height:32px;border:1px solid transparent;border-radius:8px;background:none;cursor:pointer;font-size:16px;color:#5B6272}
  .itsm-rail button:hover,.itsm-rail button[aria-expanded="true"]{background:#F1EEFB;border-color:#D8CDF5}
  .itsm-rail button:focus-visible,.itsm-dh button:focus-visible,.itsm-dh a:focus-visible,.itsm-askfab:focus-visible{outline:3px solid #7C5CD6;outline-offset:2px}
  .itsm-rail .lbl{writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px;color:#7C5CD6;font-weight:600;letter-spacing:.5px;cursor:pointer;user-select:none}
  .itsm-drawer{position:fixed;top:0;left:${RAIL}px;height:100vh;width:${W}px;max-width:calc(100vw - ${RAIL}px);z-index:2147483001;background:#FAFAFB;
    border-right:1px solid #DADDE3;box-shadow:8px 0 24px rgba(0,0,0,.14);display:flex;flex-direction:column;
    transform:translateX(calc(-100% - ${RAIL}px));transition:transform .22s ease;will-change:transform;visibility:hidden}
  .itsm-drawer.open{transform:none;visibility:visible}
  .itsm-drawer.pinned{box-shadow:none;transition:none}
  .itsm-dh{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fff;border-bottom:1px solid #DADDE3;font:600 13px "Segoe UI",Arial,sans-serif;color:#1F2430}
  .itsm-dh .sp{flex:1}.itsm-dh a,.itsm-dh button{font:12px "Segoe UI",Arial,sans-serif;color:#7C5CD6;background:none;border:1px solid #D8CDF5;border-radius:6px;padding:3px 8px;cursor:pointer;text-decoration:none}
  .itsm-dh button[aria-pressed="true"]{background:#7C5CD6;color:#fff}
  .itsm-drawer iframe{flex:1;border:0;width:100%}
  body{margin-left:${RAIL}px !important}
  body.itsm-chat-pinned{margin-left:${RAIL + W}px !important}
  @media (max-width:900px){body.itsm-chat-pinned{margin-left:${RAIL}px !important}}
  .itsm-askfab{position:fixed;z-index:2147482999;display:none;background:#7C5CD6;color:#fff;border:0;border-radius:14px;padding:3px 10px;
    font:600 12px "Segoe UI",Arial,sans-serif;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.2)}
  .itsm-sel{outline:2px dashed #7C5CD6 !important;outline-offset:3px;border-radius:8px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const rail = document.createElement('nav'); rail.className = 'itsm-rail'; rail.setAttribute('aria-label', 'Chat panel');
  rail.innerHTML = '<button type="button" title="Chat (Ctrl+B)" aria-label="Open chat (Ctrl+B)" aria-controls="itsm-drawer" aria-expanded="false">💬</button><span class="lbl" aria-hidden="true">ITSM Chat</span>';
  const dr = document.createElement('aside'); dr.className = 'itsm-drawer'; dr.id = 'itsm-drawer'; dr.setAttribute('aria-label', 'ITSM chat');
  dr.innerHTML = '<div class="itsm-dh">ITSM Dashboard Chat<span class="sp"></span><button type="button" class="pin" title="Pin next to the dashboard" aria-pressed="false">📌 Pin</button><a href="/" target="_blank" title="Open the full chat app">Full app ↗</a><button type="button" class="hide" title="Hide (Ctrl+B or Esc)" aria-label="Hide chat">«</button></div>';
  let frame = null;
  const ensureFrame = () => { if (!frame) { frame = document.createElement('iframe'); frame.src = '/?embed=1'; frame.title = 'Chat'; frame.addEventListener('load', () => { frame.dataset.ready = '1'; }); dr.appendChild(frame); } };
  const isOpen = () => dr.classList.contains('open');
  let pinned = false; try { pinned = sessionStorage.getItem(PIN) === '1'; } catch { /* ignore */ }
  const layout = () => { // zmiana układu tylko przy przypięciu — jednorazowo, bez animacji
    const dock = pinned && isOpen();
    document.body.classList.toggle('itsm-chat-pinned', dock); dr.classList.toggle('pinned', dock);
    dr.querySelector('.pin').setAttribute('aria-pressed', String(pinned));
  };
  const set = (open, { focus = false } = {}) => {
    dr.classList.toggle('open', open); dr.inert = !open; dr.setAttribute('aria-hidden', String(!open));
    rail.querySelector('button').setAttribute('aria-expanded', String(open));
    if (open) ensureFrame();
    layout();
    try { sessionStorage.setItem(KEY, open ? '1' : '0'); } catch { /* ignore */ }
    if (open && focus) setTimeout(() => frame && frame.focus(), 250);
    if (!open && focus) rail.querySelector('button').focus();
  };
  rail.querySelectorAll('button, .lbl').forEach(b => b.onclick = () => set(!isOpen(), { focus: true }));
  dr.querySelector('.hide').onclick = () => set(false, { focus: true });
  dr.querySelector('.pin').onclick = () => { pinned = !pinned; try { sessionStorage.setItem(PIN, pinned ? '1' : '0'); } catch { /* ignore */ } layout(); };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); set(!isOpen(), { focus: true }); }
    if (e.key === 'Escape' && isOpen() && !pinned && !document.querySelector('.modal.on')) set(false, { focus: true });
  });
  // „Zapytaj o ten element”: najazd (albo fokus z klawiatury) na kafelek/wykres/tabelę pokazuje przycisk;
  // klik lub Alt+A obrysowuje element ramką i przekazuje jego kontekst do czatu.
  document.body.classList.add('has-chat');
  const fab = document.createElement('button'); fab.className = 'itsm-askfab'; fab.type = 'button'; fab.textContent = '💬 Ask about this';
  fab.title = 'Ask the chat about this element (keyboard: Alt+A)';
  let hoverEl = null, selected = null;
  const place = el => { const r = el.getBoundingClientRect(); fab.style.left = Math.max(RAIL + 8, r.left + 8) + 'px'; fab.style.top = Math.max(8, r.top - 12) + 'px'; fab.style.display = 'block'; };
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-ask]'); if (el && !dr.contains(el)) { hoverEl = el; place(el); } });
  document.addEventListener('mouseout', e => { const t = e.relatedTarget; if (!t || (!(t.closest && t.closest('[data-ask]')) && t !== fab)) fab.style.display = 'none'; });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-ask]'); if (el && !dr.contains(el)) { hoverEl = el; place(el); } });
  addEventListener('scroll', () => { fab.style.display = 'none'; }, true);
  const post = msg => { const send = () => frame.contentWindow.postMessage(msg, location.origin); if (frame.dataset.ready) send(); else frame.addEventListener('load', () => setTimeout(send, 300), { once: true }); };
  const askAbout = (ctx, el) => {
    if (selected) selected.classList.remove('itsm-sel');
    selected = el || null; if (selected) selected.classList.add('itsm-sel');
    set(true, { focus: true }); post({ type: 'itsm-ask', ctx });
  };
  fab.onclick = e => { e.stopPropagation(); if (!hoverEl) return; try { askAbout(JSON.parse(hoverEl.dataset.ask), hoverEl); } catch { /* ignore */ } fab.style.display = 'none'; };
  document.addEventListener('keydown', e => { if (e.altKey && e.key.toLowerCase() === 'a') { const el = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-ask]'); if (el) { e.preventDefault(); try { askAbout(JSON.parse(el.dataset.ask), el); } catch { /* ignore */ } } } });
  window.addEventListener('itsm-ask', e => askAbout(e.detail, null)); // przycisk w oknie drill-down
  // Wiadomości z czatu (iframe)
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'itsm-toggle') return set(!isOpen(), { focus: true });
    if (e.data.type === 'itsm-clear-selection') { if (selected) selected.classList.remove('itsm-sel'); selected = null; return; }
    if (e.data.type === 'itsm-dashboard-updated') { try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } location.reload(); }
  });
  document.body.append(rail, dr, fab);
  let open = false; try { open = sessionStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
  set(open);
})();
