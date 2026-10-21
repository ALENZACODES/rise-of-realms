/*  Rise of Realms — fighting-game intro ("flash start-up")
    Made & published by John Khan · © 2026

    What it does
      Tap-to-start screen -> 2 random leader match-ups (slide in, VS slam, clash)
      -> cover art reveal -> calls onDone(). Tap / any key skips at any point.

    How to use
      <script src="addons/rr-intro.js"></script>
      RRIntro.play({
        artPath: 'art/',          // folder that holds poses/, cover.webp
        matchups: 2,              // how many fights before the cover (1-3)
        sound: true,              // synthesized whoosh / boom / clang
        onDone: () => { ... }     // show your menu here
      });

    Needs: art/poses/<leader>-1.webp (standing) and -5.webp (attack), art/cover.webp
*/
(function () {
  'use strict';

  const LEADERS = {
    augustus: ['Augustus Caesar', 'Rome', '#e0483e'],
    ramses: ['Ramses II', 'Egypt', '#e9b824'],
    cleopatra: ['Cleopatra', 'Egypt', '#e9b824'],
    qin: ['Qin Shi Huang', 'China', '#22a36a'],
    genghis: ['Genghis Khan', 'Mongolia', '#9061f9'],
    richard: ['Richard the Lionheart', 'Britain', '#3b82f6'],
    victoria: ['Queen Victoria', 'Britain', '#3b82f6'],
    mansa: ['Mansa Musa', 'Mali', '#f97316'],
    nobunaga: ['Oda Nobunaga', 'Japan', '#ec4899'],
    alexander: ['Alexander the Great', 'Greece', '#14b8a6'],
  };

  const CSS = `
  .rri{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#07060a;color:#fff;font-family:Cinzel,Georgia,serif;user-select:none;cursor:pointer}
  .rri *{box-sizing:border-box}
  .rri-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,rgba(120,60,20,.45),transparent 60%),radial-gradient(ellipse at 50% 100%,rgba(255,120,40,.25),transparent 50%),#07060a}
  .rri canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .rri-stage{position:absolute;inset:0}
  .rri-f{position:absolute;bottom:4%;height:78%;width:46%;display:flex;align-items:flex-end;justify-content:center;opacity:0}
  .rri-f img{height:100%;width:auto;max-width:none;object-fit:contain;mix-blend-mode:lighten;
    -webkit-mask-image:radial-gradient(ellipse 50% 52% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 50% 52% at 50% 50%,#000 62%,transparent 100%);
    filter:drop-shadow(0 0 30px rgba(0,0,0,.8))}
  .rri-f.l{left:2%}.rri-f.r{right:2%}.rri-f.r img{transform:scaleX(-1)}
  .rri-glow{position:absolute;bottom:0;width:80%;height:30%;left:10%;border-radius:50%;filter:blur(30px);opacity:.55}
  .rri-name{position:absolute;top:9%;max-width:46%;opacity:0;text-shadow:0 4px 0 #000,0 0 24px rgba(0,0,0,.9)}
  .rri-name b{display:block;font-size:clamp(20px,4.4vw,54px);font-weight:900;line-height:1;letter-spacing:.02em}
  .rri-name i{display:block;font-style:normal;font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:clamp(11px,1.6vw,18px);letter-spacing:.25em;text-transform:uppercase;margin-top:6px}
  .rri-name.l{left:4%;text-align:left}.rri-name.r{right:4%;text-align:right}
  .rri-vs{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font-family:"Cinzel Decorative",Cinzel,serif;font-weight:900;font-size:clamp(70px,16vw,190px);
    background:linear-gradient(180deg,#fff6d8,#f3cf7a 35%,#b0701f 55%,#e8b45a 75%,#6a3a0e);-webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:2px #2b1600;filter:drop-shadow(0 6px 0 #1a0d00) drop-shadow(0 0 40px rgba(255,150,40,.7));opacity:0}
  .rri-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
  .rri-spark{position:absolute;left:50%;top:48%;width:6px;height:6px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 10px #ffb347,0 0 20px #ff7a1a}
  .rri-cover{position:absolute;inset:0;opacity:0;background:#000}
  .rri-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .rri-cover::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.7))}
  .rri-start{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;z-index:5}
  .rri-start h1{margin:0;font-family:"Cinzel Decorative",Cinzel,serif;font-size:clamp(40px,9vw,110px);font-weight:900;
    background:linear-gradient(180deg,#fff6d8,#f3cf7a 35%,#b0701f 55%,#e8b45a 75%,#6a3a0e);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px #2b1600;filter:drop-shadow(0 5px 0 #1a0d00)}
  .rri-tap{font-family:Inter,system-ui,sans-serif;font-weight:800;letter-spacing:.3em;font-size:clamp(12px,2vw,18px);color:#f3cf7a;animation:rriPulse 1.4s ease-in-out infinite}
  .rri-skip{position:absolute;right:16px;bottom:14px;font-family:Inter,system-ui,sans-serif;font-size:12px;letter-spacing:.15em;color:rgba(255,255,255,.55);z-index:6}
  @keyframes rriPulse{50%{opacity:.35}}
  @media (prefers-reduced-motion:reduce){.rri-tap{animation:none}}
  `;

  // ---------- tiny helpers ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  // resolves even when the tab is hidden (browsers pause animations in background tabs)
  function anim(node, frames, ms, easing) { const a = node.animate(frames, { duration: ms, easing: easing || 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); return Promise.race([a.finished.catch(() => { }), new Promise(r => setTimeout(r, ms + 120))]); }
  function load(src) { return new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(i); i.src = src; }); }
  function pick(list, n) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

  // ---------- synthesized sound (no audio files) ----------
  let ac = null, soundOn = true;
  function ctx() { if (!soundOn) return null; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
  function noise(c, dur, from, to, vol, type) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type || 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, c.currentTime); f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  function tone(c, f0, f1, dur, vol, type, delay) {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (delay || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    whoosh(c) { noise(c, 0.35, 300, 2600, 0.5); },
    boom(c) { tone(c, 120, 38, 0.7, 0.6, 'sine'); noise(c, 0.5, 900, 80, 0.5, 'lowpass'); },
    clang(c) { [523, 1187, 1873, 2711, 3402].forEach((f, i) => tone(c, f, f * 0.98, 0.9 - i * 0.12, 0.12, 'triangle')); noise(c, 0.18, 4000, 1500, 0.4, 'highpass'); },
    rumble(c) { tone(c, 55, 40, 1.6, 0.25, 'sawtooth'); noise(c, 1.6, 200, 60, 0.25, 'lowpass'); },
    rise(c) { [262, 330, 392, 523, 659].forEach((f, i) => tone(c, f, f, 0.6, 0.12, 'triangle', i * 0.09)); },
  };
  function sfx(name) { const c = ctx(); if (c && SFX[name]) try { SFX[name](c); } catch (e) { } }

  // ---------- floating embers ----------
  function embers(canvas) {
    const g = canvas.getContext('2d'); let w, h, run = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => { w = canvas.width = canvas.clientWidth * dpr; h = canvas.height = canvas.clientHeight * dpr; };
    fit(); window.addEventListener('resize', fit);
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0016, s: 0.6 + Math.random() * 2.2, d: Math.random() * 6 }));
    (function loop(t) {
      if (!run) return;
      g.clearRect(0, 0, w, h);
      for (const p of P) {
        p.y -= p.v; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const x = (p.x + Math.sin(t / 900 + p.d) * 0.01) * w, y = p.y * h;
        g.fillStyle = `rgba(255,${140 + (p.d * 15 | 0)},60,${0.35 + 0.4 * Math.sin(t / 300 + p.d) ** 2})`;
        g.beginPath(); g.arc(x, y, p.s * dpr, 0, 7); g.fill();
      }
      requestAnimationFrame(loop);
    })(0);
    return () => { run = false; window.removeEventListener('resize', fit); };
  }

  function sparks(stage, n) {
    for (let i = 0; i < (n || 26); i++) {
      const s = el('div', 'rri-spark'); stage.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 260;
      anim(s, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], 500 + Math.random() * 400, 'cubic-bezier(.1,.7,.3,1)').then(() => s.remove());
    }
  }
  const shake = (node, px) => anim(node, [0, 1, 2, 3, 4, 5].map(k => ({ transform: k === 5 ? 'none' : `translate(${(Math.random() - .5) * px}px,${(Math.random() - .5) * px}px)` })), 320, 'linear');

  // ---------- main ----------
  async function play(opts) {
    opts = Object.assign({ artPath: 'art/', matchups: 2, sound: true, onDone: null, tapToStart: true }, opts || {});
    soundOn = !!opts.sound;
    const base = opts.artPath.replace(/\/?$/, '/');
    if (!document.getElementById('rri-css')) { const st = el('style'); st.id = 'rri-css'; st.textContent = CSS; document.head.appendChild(st); }

    const root = el('div', 'rri'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Rise of Realms intro');
    root.innerHTML = `<div class="rri-bg"></div><canvas></canvas><div class="rri-stage"></div><div class="rri-cover"><img alt="Rise of Realms"></div><div class="rri-flash"></div>`;
    document.body.appendChild(root);
    const stage = root.querySelector('.rri-stage'), flash = root.querySelector('.rri-flash'), cover = root.querySelector('.rri-cover');
    const stopEmbers = embers(root.querySelector('canvas'));

    // choose fighters and preload their art
    const n = Math.max(1, Math.min(3, opts.matchups));
    const chosen = pick(Object.keys(LEADERS), n * 2);
    const loads = [load(base + 'cover.webp')];
    chosen.forEach(k => { loads.push(load(`${base}poses/${k}-1.webp`), load(`${base}poses/${k}-5.webp`)); });

    let skipped = false, finished = false;
    const finish = async () => {
      if (finished) return; finished = true;
      window.removeEventListener('keydown', onKey);
      await anim(root, [{ opacity: 1 }, { opacity: 0 }], 450, 'ease');
      stopEmbers(); root.remove();
      if (typeof opts.onDone === 'function') opts.onDone();
    };
    const onKey = () => { if (started) { skipped = true; finish(); } };

    // tap to start (also unlocks audio on phones)
    let started = !opts.tapToStart;
    if (opts.tapToStart) {
      const start = el('div', 'rri-start', `<h1>Rise of Realms</h1><div class="rri-tap">TAP TO BEGIN</div>`);
      root.appendChild(start);
      await new Promise(res => { const go = () => { root.removeEventListener('click', go); window.removeEventListener('keydown', go); res(); }; root.addEventListener('click', go); window.addEventListener('keydown', go); });
      started = true; ctx();
      await anim(start, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.1)' }], 350, 'ease'); start.remove();
    }
    root.appendChild(el('div', 'rri-skip', 'TAP TO SKIP'));
    root.addEventListener('click', () => { if (started) { skipped = true; finish(); } });
    window.addEventListener('keydown', onKey);
    await Promise.all(loads);
    cover.querySelector('img').src = base + 'cover.webp';
    sfx('rumble');

    for (let m = 0; m < n && !skipped; m++) {
      const [L, R] = [chosen[m * 2], chosen[m * 2 + 1]];
      const mk = (k, side) => {
        const [name, nation, color] = LEADERS[k];
        const f = el('div', 'rri-f ' + side, `<div class="rri-glow" style="background:${color}"></div><img src="${base}poses/${k}-1.webp" alt="${name}">`);
        const t = el('div', 'rri-name ' + side, `<b>${name}</b><i style="color:${color}">${nation}</i>`);
        stage.append(f, t); return { f, t, img: f.querySelector('img'), k };
      };
      const A = mk(L, 'l'), Bf = mk(R, 'r');
      const vs = el('div', 'rri-vs', 'VS'); stage.appendChild(vs);
      const fast = m > 0 ? 0.7 : 1;

      sfx('whoosh');
      anim(A.f, [{ opacity: 0, transform: 'translateX(-70%)' }, { opacity: 1, transform: 'none' }], 450 * fast);
      anim(A.t, [{ opacity: 0, transform: 'translateX(-40px)' }, { opacity: 1, transform: 'none' }], 450 * fast);
      await wait(380 * fast); if (skipped) break;
      sfx('whoosh');
      anim(Bf.f, [{ opacity: 0, transform: 'translateX(70%)' }, { opacity: 1, transform: 'none' }], 450 * fast);
      anim(Bf.t, [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], 450 * fast);
      await wait(450 * fast); if (skipped) break;

      sfx('boom');
      anim(vs, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], 280, 'cubic-bezier(.3,1.6,.5,1)');
      await wait(250); shake(stage, 26);
      await wait(650 * fast); if (skipped) break;

      // clash: both switch to the attack pose and dash in
      A.img.src = `${base}poses/${A.k}-5.webp`; Bf.img.src = `${base}poses/${Bf.k}-5.webp`;
      anim(vs, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }], 200);
      anim(A.f, [{ transform: 'none' }, { transform: 'translateX(22%) scale(1.06)' }], 260, 'cubic-bezier(.6,0,.9,.4)');
      anim(Bf.f, [{ transform: 'none' }, { transform: 'translateX(-22%) scale(1.06)' }], 260, 'cubic-bezier(.6,0,.9,.4)');
      await wait(240); if (skipped) break;
      sfx('clang');
      anim(flash, [{ opacity: 0.95 }, { opacity: 0 }], 260, 'ease-out');
      sparks(stage, 30); shake(stage, 34);
      await wait(800 * fast); if (skipped) break;

      await Promise.all([A, Bf].map(o => anim(o.f, [{ opacity: 1 }, { opacity: 0 }], 260, 'ease')).concat([A.t, Bf.t].map(t => anim(t, [{ opacity: 1 }, { opacity: 0 }], 200))));
      stage.innerHTML = '';
    }

    if (!skipped) {
      // cover reveal
      sfx('rise');
      anim(flash, [{ opacity: 1 }, { opacity: 0 }], 600, 'ease-out');
      anim(cover, [{ opacity: 0 }, { opacity: 1 }], 500, 'ease');
      anim(cover.querySelector('img'), [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], 2200, 'cubic-bezier(.2,.8,.2,1)');
      await wait(2300);
    }
    finish();
  }

  window.RRIntro = { play, LEADERS };
})();
