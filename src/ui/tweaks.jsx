/**
 * Tweaks panel — sliders for planet speed, star density, replay button.
 * Toggle with the 'T' key, or via Claude Design's toolbar (edit-mode protocol).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// ─── Mount helper (called from main.js) ───────────────────────────────────
export function mountTweaks(orrery, uiHandle) {
  const root = document.getElementById('tweaks-root');
  if (!root) return;
  createRoot(root).render(<OrreryTweaks orrery={orrery} uiHandle={uiHandle} />);
}

// ─── Minimal inline styles ────────────────────────────────────────────────
const S = {
  panel: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 2147483646,
    width: 260, padding: '10px 14px 14px',
    background: 'rgba(244,239,228,0.92)',
    border: '1.5px solid rgba(43,41,38,0.3)',
    borderRadius: 14,
    boxShadow: '0 12px 40px rgba(43,41,38,.18)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    fontFamily: "'Architects Daughter', cursive",
    fontSize: 13,
    color: '#2b2926',
    userSelect: 'none',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, cursor: 'move',
  },
  title: { fontWeight: 600, fontSize: 13, letterSpacing: '.04em' },
  close: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#8b857a', lineHeight: 1,
  },
  section: {
    fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#8b857a',
    marginTop: 12, marginBottom: 6,
  },
  row: { marginBottom: 10 },
  label: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: 4, fontSize: 12, color: '#56524a',
  },
  slider: { width: '100%', accentColor: '#a8553f' },
  btn: {
    width: '100%', padding: '7px 0',
    background: 'transparent',
    border: '1.5px solid #2b2926',
    borderRadius: 8, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12,
    color: '#2b2926', marginTop: 4,
    transition: 'background .15s, color .15s',
  },
};

// ─── Component ────────────────────────────────────────────────────────────
function OrreryTweaks({ orrery, uiHandle }) {
  const [open,        setOpen]        = useState(false);
  const [planetSpeed, setPlanetSpeed] = useState(1);
  const [density,     setDensity]     = useState(1);
  const dragRef  = useRef(null);
  const offsetRef = useRef({ x: 16, y: 16 });

  // 'T' key toggles the panel
  useEffect(() => {
    const handler = e => {
      if (e.key === 't' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Claude Design host protocol (edit-mode toolbar button)
  useEffect(() => {
    const onMsg = e => {
      if (e?.data?.type === '__activate_edit_mode')   setOpen(true);
      if (e?.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Wire sliders to orrery API
  useEffect(() => { orrery.setPlanetSpeed(planetSpeed); }, [planetSpeed, orrery]);
  useEffect(() => { orrery.setDensity(density); },        [density, orrery]);

  // Drag to reposition
  const onDragStart = useCallback(e => {
    const panel = dragRef.current; if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startR = window.innerWidth  - r.right;
    const startB = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = { x: startR - (ev.clientX - sx), y: startB - (ev.clientY - sy) };
      panel.style.right  = Math.max(8, offsetRef.current.x) + 'px';
      panel.style.bottom = Math.max(8, offsetRef.current.y) + 'px';
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, []);

  if (!open) return null;

  return (
    <div ref={dragRef} style={{ ...S.panel, right: offsetRef.current.x, bottom: offsetRef.current.y }}>
      <div style={S.header} onMouseDown={onDragStart}>
        <span style={S.title}>Tweaks</span>
        <button style={S.close} onClick={() => setOpen(false)} title="Close (T)">✕</button>
      </div>

      <div style={S.section}>Motion</div>
      <div style={S.row}>
        <div style={S.label}><span>Planet speed</span><span>{planetSpeed.toFixed(1)}×</span></div>
        <input type="range" style={S.slider} min={0} max={3} step={0.1} value={planetSpeed}
               onChange={e => setPlanetSpeed(Number(e.target.value))} />
      </div>

      <div style={S.section}>Sky</div>
      <div style={S.row}>
        <div style={S.label}><span>Stars & meteors</span><span>{density.toFixed(1)}×</span></div>
        <input type="range" style={S.slider} min={0.3} max={2.4} step={0.1} value={density}
               onChange={e => setDensity(Number(e.target.value))} />
      </div>

      <div style={S.section}>Intro</div>
      <button style={S.btn}
              onMouseEnter={e => { e.target.style.background = '#2b2926'; e.target.style.color = '#f4efe4'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#2b2926'; }}
              onClick={() => uiHandle?.replayIntro()}>
        Replay UFO intro
      </button>
    </div>
  );
}
