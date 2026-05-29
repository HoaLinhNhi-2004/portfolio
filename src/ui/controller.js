/**
 * UI controller — onboarding, radial UFO menu, section panel, contact form.
 * Receives an orrery instance (from createOrrery) so it has no global deps.
 */
import { supabase } from '../lib/supabase.js';

const SECTIONS = {
  about:     { tpl: 'tpl-about',     label: 'About' },
  quotes:    { tpl: 'tpl-quotes',    label: 'Quotes' },
  projects:  { tpl: 'tpl-projects',  label: 'Projects' },
  contact:   { tpl: 'tpl-contact',   label: 'Contact' },
  guestbook: { tpl: 'tpl-guestbook', label: 'Guestbook' },
};

const MOODS = [
  { key: 'Curious',  exp: 'curious',  wash: 'rgba(46,86,120,0.10)',  quote: 'Curiosity is the compass — follow it to the edge of the map.' },
  { key: 'Happy',    exp: 'happy',    wash: 'rgba(196,148,42,0.10)', quote: 'Hold on to that lightness; it makes heavy work feel like flight.' },
  { key: 'Inspired', exp: 'inspired', wash: 'rgba(120,74,140,0.10)', quote: 'Catch the spark quickly — ideas are shy and easy to lose.' },
  { key: 'Calm',     exp: 'calm',     wash: 'rgba(70,118,90,0.10)',  quote: 'Move at the speed of a planet: unhurried, certain, never late.' },
  { key: 'Tired',    exp: 'tired',    wash: 'rgba(86,84,108,0.12)',  quote: 'Even comets rest in the dark before they blaze again.' },
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
      $('#quote-hi').textContent   = user.name ? `Here, ${user.name} — carry this with you:` : 'Here, carry this with you:';
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
    $('#greet-hi').textContent   = user.name ? `Hello, ${user.name}` : 'Welcome, traveller';
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
      btn.textContent = sec.label;
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
    document.body.classList.add('panel-open');
    orrery.highlight(id);
    if (id === 'guestbook') {
      panel.classList.add('centered');
      orrery.focusGuestbookStar();
      wireGuestbookForm();
    } else {
      panel.classList.remove('centered');
      orrery.focusPlanet(id);
      orrery.showPlanetPreview(id);
    }
    // Add 'open' after class setup so transition starts from the right state
    requestAnimationFrame(() => panel.classList.add('open'));
    if (id === 'contact') wireContactForm();
  }

  function closePanel() {
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    orrery.highlight(null);
    orrery.resetZoom();
    orrery.hidePlanetPreview();
  }

  // Remove .centered after close transition so next open starts clean
  panel.addEventListener('transitionend', () => {
    if (!panel.classList.contains('open')) panel.classList.remove('centered');
  });

  $('#panel-close').addEventListener('click', closePanel);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { radialOpen ? closeRadial() : closePanel(); }
  });

  orrery.onPlanetClick(id => openPanel(id));
  orrery.onGuestbookClick(() => openPanel('guestbook'));

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
        note.textContent = 'Please fill in your name and message before sending.';
        return;
      }
      note.textContent = '✦ Sent into orbit — I\'ll reply soon.';
      form.querySelector('button[type="submit"]').style.display = 'none';
      form.reset();
    });
  }

  // ── Guestbook form ───────────────────────────────────────────────────────
  function wireGuestbookForm() {
    const form = document.querySelector('#guestbook-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    renderGuestbookEntries();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f    = Object.fromEntries(new FormData(form));
      const note = document.getElementById('guestbook-note');
      if (!f.thought?.trim()) return;
      const entry = {
        name:    f.name?.trim() || 'Anonymous traveller',
        thought: f.thought.trim().slice(0, 280),
      };

      if (supabase) {
        const { error } = await supabase.from('guestbook_entries').insert(entry);
        if (error) {
          note.textContent = '✗ Could not send — please try again.';
          return;
        }
      } else {
        // localStorage fallback (dev without Supabase keys)
        const local = { ...entry, date: new Date().toLocaleDateString('vi', { day: 'numeric', month: 'short', year: 'numeric' }) };
        const all = JSON.parse(localStorage.getItem('orrery-guestbook') || '[]');
        all.unshift(local);
        localStorage.setItem('orrery-guestbook', JSON.stringify(all.slice(0, 30)));
      }

      note.textContent = '✦ Your thought is now drifting through the system.';
      form.reset();
      renderGuestbookEntries();
    });
  }

  async function renderGuestbookEntries() {
    const el = document.getElementById('guestbook-entries');
    if (!el) return;

    let entries = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('guestbook_entries')
        .select('name, thought, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && data) {
        entries = data.map(e => ({
          name:    e.name || 'Anonymous traveller',
          thought: e.thought,
          date:    new Date(e.created_at).toLocaleDateString('vi', { day: 'numeric', month: 'short', year: 'numeric' }),
        }));
      }
    } else {
      entries = JSON.parse(localStorage.getItem('orrery-guestbook') || '[]');
    }

    if (!entries.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="gb-heading">Thoughts from other travellers</p>' +
      entries.map(e => `
        <div class="gb-entry">
          <div class="gb-meta">
            <span class="gb-name">${escapeHtml(e.name)}</span>
            <span class="gb-date">${e.date}</span>
          </div>
          <p class="gb-thought">"${escapeHtml(e.thought)}"</p>
        </div>`).join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
