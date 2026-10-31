/* ============================================================================
   E15: SHOW IN THE MODEL (design/persona-mock/6-Brief-popup-v3.html, EKO_E14d_Brief.md
   section 3): EKO_BFOCUS.

   A row of the Brief that maps to a model element or room (data.assets[].gid or
   roomGid, read from the model: handoff/hospital-model-map.md) has a locate button,
   and the row itself locates. On a locate:
     1 the Brief shrinks into the Brief button, which glows and reads "Brief · back";
     2 the focus card appears at the top right (340 px, the glow ring): the section and
       "n of N", ‹ ›, the tag and sentence, the place, the item's one action, Back to Brief;
     3 the camera flies to the element (the viewer's own fly-to) and centres it in the
       model area left of the card; the rest goes x-ray, its level is outlined in the
       glow colour, the other markers dim and the element gets three pulsing rings;
     4 when the fly ends a curved leader line draws from the element to the card. If
       the reader orbits or zooms, the line hides while the camera moves and is redrawn
       (projected with camera.project()) when it stops.
   ‹ › fly between the items. Back to Brief, Esc or the Brief button reverse it all: the
   line clears, the camera returns to the view before the first locate, the x-ray and
   dimming end, and the Brief grows back with its scroll and ribbon kept.
   Reduced motion: everything jumps, the line appears at once.
   ============================================================================ */
window.EKO_BFOCUS = (function(){
  'use strict';
  const B = () => window.EKO_BRIEF, C = () => window.EKO_C;
  const esc = s => C().esc(s);
  const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NS = 'http://www.w3.org/2000/svg';
  let E = null, st = null, idleT = null, hooked = false, card = null, line = null, mark = null, linkT = null;

  /* an asset the model can show: an element or a room of the model, and an engine that can fly to it */
  function locatable(app, id){
    if(!id || !app || !app.engine || !app.engine.flyToAssetAt) return false;
    const a = (app.data.assets || []).find(x => x.id === id);
    return !!(a && (a.gid || a.roomGid) && (!app.engine.locatable || app.engine.locatable(id)));
  }
  const viewer = () => document.getElementById('vpmain');
  const host = () => document.getElementById('enginehost') || viewer();

  /* ------------------------------ the pieces ------------------------------ */
  function ensure(){
    if(!card){ card = document.createElement('aside'); card.id = 'bfocus'; card.className = 'bfwrap'; card.setAttribute('aria-live', 'polite'); card.hidden = true; document.body.appendChild(card); }
    if(!line){ line = document.createElementNS(NS, 'svg'); line.id = 'bfline'; line.setAttribute('aria-hidden', 'true');
      line.innerHTML = '<defs><linearGradient id="bflg" x1="0" x2="1"><stop offset="0" stop-color="#4CC3F0"/><stop offset=".5" stop-color="#7B6CFF"/><stop offset="1" stop-color="#C86BD9"/></linearGradient></defs><path id="bflp" d=""/><circle id="bflc1" r="0"/><circle id="bflc2" r="0"/>';
      document.body.appendChild(line); }
    if(!mark){ mark = document.createElement('div'); mark.id = 'bfmark'; mark.setAttribute('aria-hidden', 'true'); mark.innerHTML = '<i></i><i></i><i></i><b></b>'; mark.hidden = true; document.body.appendChild(mark); }
  }
  function fill(){
    const t = (k, v) => E.t(k, v), it = st.list[st.i], sec = st.list.filter(x => x.sec === it.sec), n = sec.indexOf(it) + 1;
    const a = it.act;
    card.dataset.sev = it.sev || '';
    card.innerHTML = `<div class="bfcard">
      <div class="bfhd"><span class="bfsev"></span><span>${esc(it.secLabel || '')}</span><span class="bfpos">${esc(t('bf15.pos', { n, m: sec.length }))}</span><span class="grow"></span>
        <button class="bfstep" data-act="bfStep" data-v="-1" aria-label="${esc(t('bf15.prev'))}">‹</button><button class="bfstep" data-act="bfStep" data-v="1" aria-label="${esc(t('bf15.next'))}">›</button></div>
      <div class="bftl">${it.tag ? `<code>${esc(it.tag)}</code>` : ''}${esc(it.text)}</div>
      ${it.meta ? `<div class="bfm">${esc(it.meta)}</div>` : ''}
      <div class="bfact">${a ? `<button class="br14btn${it.pri ? ' pri' : ''}" data-act="${esc(a.act)}"${Object.keys(a.data || {}).map(k => ` data-${k}="${esc(a.data[k])}"`).join('')}>${esc(a.label)}</button>` : ''}
        <button class="bfback" data-act="bfBack"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c.6 4.9 3.1 7.4 8 8-4.9.6-7.4 3.1-8 8-.6-4.9-3.1-7.4-8-8 4.9-.6 7.4-3.1 8-8z"/></svg>${esc(t('bf15.back'))}</button></div></div>
      <span class="bfpin" aria-hidden="true"></span>`;
  }
  const rtl = () => document.documentElement.dir === 'rtl';
  /* the card sits at the top end of the model area (the right, the left in Arabic) */
  function placeCard(){
    const v = viewer(); if(!v || !card) return; const r = v.getBoundingClientRect();
    /* never over the summary panel */
    const sm = document.getElementById('ovp'), sr = sm && sm.isConnected && sm.offsetWidth ? sm.getBoundingClientRect() : null;
    const room = sr ? (rtl() ? sr.left - r.left : r.right - sr.right) : r.width, w = Math.min(340, Math.max(240, room - 32));
    card.style.setProperty('--bfW', Math.round(w) + 'px'); card.style.top = Math.round(r.top + 10) + 'px';
    card.style.setProperty('--bfL', Math.round(rtl() ? r.left + 16 : r.right - 16 - w) + 'px');
  }
  function showCard(){
    ensure(); fill(); placeCard();
    if(card.hidden){ card.hidden = false; if(!reduce()) card.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' }); }
  }
  function clearLine(){
    if(!line) return; line.querySelector('#bflp').setAttribute('d', ''); line.querySelectorAll('circle').forEach(c => c.setAttribute('r', 0));
    if(card) card.classList.remove('linked'); clearTimeout(linkT);
  }
  /* the element's point on the page (px), or null */
  function point(){
    const it = st && st.list[st.i], eng = E && E.engine; if(!it || !eng || !eng.projectAsset) return null;
    const p = eng.projectAsset(it.asset), h = host(); if(!p || !h) return null;
    const r = h.getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y, visible: p.visible !== false };
  }
  function placeMark(){
    ensure(); const p = point();
    if(!p || !p.visible){ mark.hidden = true; return null; }
    const tg = (st.list[st.i] || {}).asset; document.querySelectorAll('#vpmain .mk').forEach(m => m.classList.toggle('bfon', m.dataset.tip === tg));
    mark.hidden = false; mark.style.left = Math.round(p.x) + 'px'; mark.style.top = Math.round(p.y) + 'px'; mark.dataset.sev = (st.list[st.i] || {}).sev || '';
    return p;
  }
  function drawLine(animate){
    if(!st || card.hidden) return;
    const p = placeMark(); if(!p){ clearLine(); return; }
    /* to the card's near side edge, or up to its bottom edge when the element is under it */
    const f = card.getBoundingClientRect(), x1 = p.x, y1 = p.y, under = p.y > f.bottom && (rtl() ? p.x < f.right + 40 : p.x > f.left - 40);
    const x2 = under ? f.left + f.width / 2 : rtl() ? f.right : f.left, y2 = under ? f.bottom : f.top + f.height / 2;
    const d = under ? 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + (y2 - y1) * 0.55) + ' ' + x2 + ',' + (y1 + (y2 - y1) * 0.45) + ' ' + x2 + ',' + y2
      : 'M' + x1 + ',' + y1 + ' C' + (x1 + (x2 - x1) * 0.55) + ',' + y1 + ' ' + (x1 + (x2 - x1) * 0.45) + ',' + y2 + ' ' + x2 + ',' + y2;
    card.dataset.edge = under ? 'bottom' : 'side';
    const lp = line.querySelector('#bflp'), c1 = line.querySelector('#bflc1'), c2 = line.querySelector('#bflc2');
    lp.setAttribute('d', d); c1.setAttribute('cx', x1); c1.setAttribute('cy', y1); c1.setAttribute('r', 3); c2.setAttribute('cx', x2); c2.setAttribute('cy', y2); c2.setAttribute('r', 3);
    const L = lp.getTotalLength ? lp.getTotalLength() : 0;
    lp.style.strokeDasharray = L; lp.style.strokeDashoffset = 0;
    if(animate && !reduce() && L && lp.animate) lp.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 520, easing: 'ease-out' });
    card.classList.add('linked');
    line.dataset.x1 = Math.round(x1); line.dataset.y1 = Math.round(y1); line.dataset.x2 = Math.round(x2); line.dataset.y2 = Math.round(y2);
  }
  /* wait for the fly to end, then link */
  function whenStill(cb){
    const eng = E.engine; let n = 0; clearTimeout(linkT);
    const tick = () => { if(!st) return; if(eng.animating && eng.animating() && n++ < 80){ linkT = setTimeout(tick, 50); return; } linkT = setTimeout(cb, 60); };
    tick();
  }
  /* the camera: centre the element in the model area left of the card */
  function fly(){
    const it = st.list[st.i], eng = E.engine, v = viewer(); if(!v) return;
    const vr = v.getBoundingClientRect(), f = card.getBoundingClientRect();
    /* the free model area: beside the card, and clear of the summary panel on the reading-start side */
    const sm = document.getElementById('ovp'), sr = sm && sm.isConnected && sm.offsetWidth ? sm.getBoundingClientRect() : null;
    const a0 = rtl() ? Math.max(vr.left, f.right + 16) : Math.max(vr.left, sr ? sr.right + 8 : vr.left), a1 = rtl() ? Math.min(vr.right, sr ? sr.left - 8 : vr.right) : Math.min(vr.right, f.left - 16);
    /* too narrow beside the card (a laptop with both panels): the area under it */
    let cx = (a0 + a1) / 2, cy = (vr.top + vr.bottom) / 2; st.below = a1 - a0 < 220;
    if(st.below){ const b0 = rtl() ? vr.left : Math.max(vr.left, sr ? sr.right + 8 : vr.left), b1 = rtl() ? Math.min(vr.right, sr ? sr.left - 8 : vr.right) : vr.right;
      cx = (b0 + b1) / 2; cy = (f.bottom + 24 + vr.bottom - 140) / 2; }
    const dx = cx - (vr.left + vr.right) / 2, dy = cy - (vr.top + vr.bottom) / 2;
    clearLine(); mark && (mark.hidden = true);
    document.body.classList.add('bfx');
    try{ eng.setFocus && eng.setFocus([it.asset], '#7B6CFF'); eng.cutAbove && eng.cutAbove(it.asset); eng.outlineLevel && eng.outlineLevel(it.asset); }catch(e){}
    eng.flyToAssetAt(it.asset, dx, it.dist || 34, reduce() ? 1 : 900, dy);
    whenStill(() => drawLine(true));
  }
  /* a camera that moves (the reader orbits or zooms): the line hides, and comes back when it stops */
  function onCamera(){
    if(!st || !card || card.hidden) return;
    if(E.engine.animating && E.engine.animating()) return;
    clearLine(); placeMark();
    clearTimeout(idleT); idleT = setTimeout(() => drawLine(false), 220);
  }

  /* -------------------------------- the flow -------------------------------- */
  function locate(app, key){
    E = app;
    if(!viewer()){ E.go(E.overviewId(), 'overview', null); setTimeout(() => locate(app, key), 700); return; }
    const data = B() && B().focusData ? B().focusData() : null; if(!data) return;
    let list = data.items.filter(x => locatable(app, x.asset)), i = list.findIndex(x => x.key === key);
    if(i < 0){ const one = data.tl.find(x => x.key === key && locatable(app, x.asset)); if(!one) return; list = [one]; i = 0; }
    if(!hooked && E.engine.onCameraChange){ E.engine.onCameraChange(onCamera); hooked = true; }
    if(!st) st = { list, i, from: E.engine.saveViewpoint ? E.engine.saveViewpoint() : null };
    else { st.list = list; st.i = i; }
    ensure();
    const go = () => { showCard(); fly(); };
    if(B() && B().isHeld && B().isHeld()) go(); else B().shrinkInto(go);
  }
  function step(d){
    if(!st || !st.list.length) return;
    st.i = (st.i + d + st.list.length) % st.list.length; fill(); fly();
  }
  function back(){
    if(!st) return;
    const eng = E.engine, from = st.from;
    clearLine(); if(mark) mark.hidden = true; clearTimeout(idleT); clearTimeout(linkT);
    try{ eng.setFocus && eng.setFocus(null); eng.cutAbove && eng.cutAbove(null); eng.outlineLevel && eng.outlineLevel(null); }catch(e){}
    document.body.classList.remove('bfx');
    if(from && eng.flyToViewpoint) eng.flyToViewpoint(from, reduce() ? 1 : 800);
    st = null;
    if(card && !card.hidden){ if(reduce() || !card.animate) card.hidden = true; else card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).onfinish = () => { card.hidden = true; }; }
    if(B()) B().unhold();
  }
  /* a page change ends the focus without flying (the page has its own view) */
  function reset(){
    if(!st) return; clearLine(); if(mark) mark.hidden = true; if(card) card.hidden = true;
    try{ E.engine.setFocus && E.engine.setFocus(null); E.engine.cutAbove && E.engine.cutAbove(null); E.engine.outlineLevel && E.engine.outlineLevel(null); }catch(e){}
    document.body.classList.remove('bfx'); st = null;
  }
  /* a timeline row that locates is a button for the keyboard too */
  document.addEventListener('keydown', ev => { if((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.matches && ev.target.matches('.br14ev.loc')){ ev.preventDefault(); ev.target.click(); } });
  /* after a render (an action from the card, a new alarm): the item's words and action again, the line where it was */
  function refresh(){
    if(!st || !card || card.hidden) return;
    const d = B() && B().focusData ? B().focusData() : null; if(!d) return;
    const all = d.items.concat(d.tl);
    st.list = st.list.map(x => all.find(y => y.key === x.key) || x); fill();
    if(card.classList.contains('linked') && !(E.engine.animating && E.engine.animating())) drawLine(false);
  }
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && st){ ev.stopPropagation(); ev.preventDefault(); back(); } }, true);
  addEventListener('resize', () => { if(st){ placeCard(); fly(); } });

  const ACTS = {
    bfLocate(el, ev){ if(ev && ev.target && ev.target.closest('button') && !ev.target.closest('[data-act="bfLocate"]')) return; locate(window.EKO, el.dataset.v); },
    bfStep(el){ step(+el.dataset.v || 1); },
    bfBack(){ back(); }
  };
  return { locatable, locate, step, back, reset, refresh, ACTS, active: () => !!st, state: () => st ? { key: st.list[st.i].key, asset: st.list[st.i].asset, line: line ? Object.assign({}, line.dataset) : null } : null };
})();
