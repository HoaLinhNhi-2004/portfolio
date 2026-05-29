/**
 * UI controller — onboarding, radial UFO menu, section panel, contact form.
 * Receives an orrery instance (from createOrrery) so it has no global deps.
 */

const SECTIONS = {
  about:    { tpl: 'tpl-about' },
  quotes:   { tpl: 'tpl-quotes' },
  projects: { tpl: 'tpl-projects' },
  contact:  { tpl: 'tpl-contact' },
};

const MOODS = [
  { key: 'Curious',  exp: 'curious',  wash: 'rgba(46,86,120,0.10)',  quote: 'Curiosity is the compass — follow it past the edge of the map.' },
  { key: 'Happy',    exp: 'happy',    wash: 'rgba(196,148,42,0.10)', quote: 'Keep that light feeling; it makes the heavy work float.' },
  { key: 'Inspired', exp: 'inspired', wash: 'rgba(120,74,140,0.10)', quote: 'Catch the spark quickly — ideas are shy and quick to drift.' },
  { key: 'Calm',     exp: 'calm',     wash: 'rgba(70,118,90,0.10)',  quote: 'Move at the speed of a planet: slow, certain, never late.' },
  { key: 'Tired',    exp: 'tired',    wash: 'rgba(86,84,108,0.12)',  quote: 'Even comets rest in the dark before their next bright pass.' },
];

export function initUI(orrery) {
  const $ = s => document.querySelector(s);

  const user      = { name: '', mood: null };
  let radialOpen  = false;

  // ── DOM refs ──
  const scrim    = $('#scrim');
  const dlgName  = $('#dlg-name');
  const dlgMood  = $('#dlg-mood');
  const dlgQuote = $('#dlg-quote');
  const inName   = $('#in-name');
  const radial   = $('#radial');
  const panel    = $('#panel');
  const sheet    = $('#panel-sheet');

  function show(el) { el.classList.add('show'); }
  function hide(el) { el.classList.remove('show'); }

  // ── Onboarding ───────────────────────────────────────────────────────────
  function startOnboarding() {
    orrery.ufoOnboard();
    show(scrim);
    setTimeout(() => { show(dlgName); inName.focus(); }, 450);
  }

  function toMood() {
    user.name = inName.value.trim();
    hide(dlgName);
    $('#mood-greet').textContent = user.name ? `Lovely to meet you, ${user.name}.` : 'Lovely to meet you.';
    setTimeout(() => show(dlgMood), 320);
  }

  // Build mood chips
  MOODS.forEach(m => {
    const btn = document.createElement('button');
    btn.className   = 'mood-chip';
    btn.textContent = m.key;
    btn.addEventListener('click', () => selectMood(m, btn));
    $('#mood-list').appendChild(btn);
  });

  function selectMood(m, btn) {
    user.mood = m;
    [...$('#mood-list').children].forEach(c => c.classList.remove('sel'));
    btn.classList.add('sel');
    orrery.setUfoExpression(m.exp);
    applyWash(m.wash);
    setTimeout(() => {
      hide(dlgMood);
      $('#quote-hi').textContent   = user.name ? `Here, ${user.name} — take this with you:` : 'Here, take this with you:';
      $('#quote-text').textContent = m.quote;
      setTimeout(() => show(dlgQuote), 280);
    }, 360);
  }

  function applyWash(color) {
    const w = $('#mood-wash');
    w.style.backgroundColor = color;
    w.style.opacity = color ? 1 : 0;
  }

  function finishOnboarding() {
    hide(dlgQuote); hide(dlgMood); hide(dlgName); hide(scrim);
    orrery.ufoToOrbit();
    if (!user.mood) orrery.setUfoExpression('happy');
    $('#greet-hi').textContent   = user.name ? `Hi, ${user.name}` : 'Welcome, traveler';
    $('#greet-mood').textContent = user.mood ? `feeling ${user.mood.key.toLowerCase()}` : '';
    $('#greet').classList.add('show');
    $('#hint').style.opacity   = 1;
    $('#legend').style.opacity = 1;
  }

  $('#next-name').addEventListener('click', toMood);
  inName.addEventListener('keydown', e => { if (e.key === 'Enter') toMood(); });
  $('#skip-name').addEventListener('click', () => { inName.value = ''; toMood(); });
  $('#skip-mood').addEventListener('click', finishOnboarding);
  $('#begin-journey').addEventListener('click', finishOnboarding);

  // Hide hint/legend until onboarding finishes
  $('#hint').style.opacity   = 0;
  $('#legend').style.opacity = 0;
  $('#hint').style.transition = $('#legend').style.transition = 'opacity .8s ease';

  // ── Radial UFO menu ──────────────────────────────────────────────────────
  function buildRadialOnce() {
    if (radial.dataset.built) return;
    const angs = [-135, -45, 135, 45].map(d => d * Math.PI / 180);
    Object.entries(SECTIONS).forEach(([id, sec], i) => {
      const btn = document.createElement('button');
      btn.className   = 'opt';
      btn.textContent = id.charAt(0).toUpperCase() + id.slice(1);
      btn.dataset.ai  = i;
      btn.addEventListener('click', e => { e.stopPropagation(); closeRadial(); openPanel(id); });
      radial.appendChild(btn);
    });
    radial.dataset.built = '1';
  }

  function placeRadial() {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const R  = Math.min(190, innerWidth * 0.22);
    const angs = [-135, -45, 135, 45].map(d => d * Math.PI / 180);
    [...radial.children].forEach(o => {
      const i = +o.dataset.ai;
      o.style.left = (cx + Math.cos(angs[i]) * R) + 'px';
      o.style.top  = (cy + Math.sin(angs[i]) * R - 6) + 'px';
    });
  }

  function openRadial() {
    if (document.body.classList.contains('panel-open')) return;
    buildRadialOnce();
    placeRadial();
    orrery.ufoToCenter(() => {});
    radial.classList.add('show');
    radialOpen = true;
  }

  function closeRadial() {
    radial.classList.remove('show');
    radialOpen = false;
    orrery.ufoToOrbit();
  }

  orrery.onUfoClick(() => { if (!document.body.classList.contains('panel-open')) { radialOpen ? closeRadial() : openRadial(); } });
  orrery.onBackgroundClick(() => { if (radialOpen) closeRadial(); });
  addEventListener('resize', () => { if (radialOpen) placeRadial(); });

  // ── Section panel ────────────────────────────────────────────────────────
  function openPanel(id) {
    const sec = SECTIONS[id]; if (!sec) return;
    if (radialOpen) closeRadial();
    const tpl = document.getElementById(sec.tpl);
    sheet.innerHTML = '';
    sheet.appendChild(tpl.content.cloneNode(true));
    sheet.scrollTop = 0;
    panel.classList.add('open');
    document.body.classList.add('panel-open');
    orrery.highlight(id);
    orrery.focusPlanet(id);
    orrery.showPlanetPreview(id);
    if (id === 'contact') wireContactForm();
  }

  function closePanel() {
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    orrery.highlight(null);
    orrery.resetZoom();
    orrery.hidePlanetPreview();
  }

  $('#panel-close').addEventListener('click', closePanel);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { radialOpen ? closeRadial() : closePanel(); }
  });

  orrery.onPlanetClick(id => openPanel(id));

  // ── Contact form ─────────────────────────────────────────────────────────
  function wireContactForm() {
    const form = document.querySelector('#contact-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f    = Object.fromEntries(new FormData(form));
      const note = document.getElementById('contact-note');
      if (!f.name?.trim() || f.msg?.trim().length < 4) {
        note.textContent = 'Add your name and a short note first.';
        return;
      }
      note.textContent = '✦ Sent into orbit — I\'ll answer soon.';
      form.querySelector('button[type="submit"]').style.display = 'none';
      form.reset();
    });
  }

  // Kick off onboarding immediately
  startOnboarding();

  // ── Expose replay hook for Tweaks panel ──────────────────────────────────
  return {
    replayIntro() {
      closePanel();
      user.name = ''; user.mood = null;
      applyWash('');
      document.getElementById('greet').classList.remove('show');
      startOnboarding();
    },
  };
}
