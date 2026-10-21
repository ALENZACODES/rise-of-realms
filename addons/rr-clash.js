/*  Rise of Realms — VS battle clash (plays before a battle result)
    Made & published by John Khan · © 2026

    What it does
      Two leaders slide in (weapon-ready pose), "VS" slams down, they charge,
      flash + sparks + clang, then the winner flexes and the loser fades to grey.
      About 2.6 seconds. Tap / any key skips.

    How to use
      <script src="addons/rr-clash.js"></script>
      RRClash.play({
        artPath: 'art/',
        attacker: { leader: 'augustus', name: 'Johnny', color: '#e0483e' },
        defender: { leader: 'genghis',  name: 'Duke Waffles', color: '#9061f9' },
        attackerWins: true,
        title: 'Rome takes the Market!',   // optional result line
        sound: true,
        taunt: true,                      // enemy shouts in their own language when they win
        onDone: () => { ... }             // e.g. show the turn report
      });

    Needs: art/poses/<leader>-3.webp (ready), -5.webp (attack), -2.webp (victory)
*/
(function () {
  'use strict';

  const CSS = `
  .rrc{position:fixed;inset:0;z-index:9998;overflow:hidden;background:rgba(5,4,8,.98);color:#fff;font-family:Cinzel,Georgia,serif;cursor:pointer;user-select:none}
  .rrc-stage{position:absolute;inset:0}
  .rrc-bg{position:absolute;inset:0;background:linear-gradient(100deg,var(--ca) 0%,transparent 45%,transparent 55%,var(--cd) 100%);opacity:.28}
  .rrc-f{position:absolute;bottom:6%;height:70%;width:48%;display:flex;align-items:flex-end;justify-content:center;opacity:0}
  .rrc-f img{height:100%;width:auto;max-width:none;object-fit:contain;mix-blend-mode:lighten;transition:filter .5s,opacity .5s;
    -webkit-mask-image:radial-gradient(ellipse 50% 52% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 50% 52% at 50% 50%,#000 62%,transparent 100%)}
  .rrc-f.l{left:1%}.rrc-f.r{right:1%}.rrc-f.r img{transform:scaleX(-1)}
  .rrc-f.lost img{filter:grayscale(1) brightness(.45);opacity:.6}
  .rrc-tag{position:absolute;top:8%;font-weight:900;font-size:clamp(18px,3.6vw,40px);text-shadow:0 3px 0 #000,0 0 18px #000;opacity:0;max-width:46%}
  .rrc-tag small{display:block;font-family:Inter,system-ui,sans-serif;font-size:clamp(10px,1.4vw,14px);letter-spacing:.2em;text-transform:uppercase;font-weight:800;margin-top:4px}
  .rrc-tag.l{left:4%}.rrc-tag.r{right:4%;text-align:right}
  .rrc-vs{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-family:"Cinzel Decorative",Cinzel,serif;font-weight:900;font-size:clamp(64px,13vw,160px);
    background:linear-gradient(180deg,#fff6d8,#f3cf7a 35%,#b0701f 55%,#e8b45a 75%,#6a3a0e);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #2b1600;
    filter:drop-shadow(0 5px 0 #1a0d00) drop-shadow(0 0 34px rgba(255,150,40,.7));opacity:0}
  .rrc-res{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);text-align:center;opacity:0;width:92%}
  .rrc-res b{display:block;font-family:"Cinzel Decorative",Cinzel,serif;font-size:clamp(34px,7vw,84px);font-weight:900;line-height:1;
    background:linear-gradient(180deg,#fff6d8,#f3cf7a 40%,#b0701f 60%,#e8b45a);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px #2b1600;filter:drop-shadow(0 4px 0 #1a0d00)}
  .rrc-res span{display:block;margin-top:6px;font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:clamp(13px,2vw,20px);text-shadow:0 2px 6px #000}
  .rrc-taunt{margin-top:10px;font-family:system-ui,"Segoe UI","Noto Sans","Noto Sans CJK SC","Noto Sans Arabic","Hiragino Sans","Microsoft YaHei",sans-serif;font-weight:900;font-size:clamp(22px,5.4vw,46px);line-height:1.15;color:var(--cw);text-shadow:0 3px 0 #000,0 0 22px rgba(0,0,0,.9)}
  .rrc-taunt em{display:block;font-style:normal;font-weight:700;font-size:clamp(13px,2.2vw,20px);color:#f3efe4;margin-top:4px}
  .rrc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
  .rrc-spark{position:absolute;left:50%;top:46%;width:6px;height:6px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 10px #ffb347,0 0 22px #ff7a1a}
  `;
  // what an enemy leader shouts when they beat you: native language, English in brackets
  const LINES = {
    augustus: { lang: 'it', name: 'Italian', say: [['Roma vince sempre!', 'Rome always wins!'], ['Inchinati davanti a Roma!', 'Bow before Rome!']] },
    ramses: { lang: 'ar', name: 'Arabic', rtl: true, say: [['النصر لمصر!', 'Victory to Egypt!'], ['انحنِ أمام الفرعون!', 'Bow before the Pharaoh!']] },
    cleopatra: { lang: 'ar', name: 'Arabic', rtl: true, say: [['مصر لا تُهزم!', 'Egypt cannot be defeated!'], ['النيل يحميني!', 'The Nile protects me!']] },
    qin: { lang: 'zh-Hans', name: 'Mandarin', say: [['天下归一！', 'All under heaven is united!'], ['朕即天下！', 'I am the empire!']] },
    genghis: { lang: 'mn', name: 'Mongolian', say: [['Мөнх тэнгэрийн хүчин дор!', 'Under the power of the Eternal Sky!'], ['Ялалт бидний талд!', 'Victory is on our side!']] },
    richard: { lang: 'en', name: 'English', say: [['For England and Saint George!'], ['God wills it!']] },
    victoria: { lang: 'en', name: 'English', say: [['The Empire stands unbroken!'], ['We are not amused.']] },
    mansa: { lang: 'bm', name: 'Bambara', say: [['Mali ka bon!', 'Mali is great!'], ['Se bɛ an bolo!', 'The power is in our hands!']] },
    nobunaga: { lang: 'ja', name: 'Japanese', say: [['天下布武！', 'Rule the realm by force!'], ['我が刀に敵なし！', 'My sword has no equal!']] },
    alexander: { lang: 'el', name: 'Greek', say: [['Η νίκη είναι δική μου!', 'Victory is mine!'], ['Κανείς δεν σταματά τη Μακεδονία!', 'No one stops Macedonia!']] },
    washington: { lang: 'en', name: 'English', say: [["Liberty stands victorious!"], ["A new nation now leads the world!"]] },
    peter: { lang: 'ru', name: 'Russian', say: [["Победа за Россией!", "Victory belongs to Russia!"], ["Новая Россия правит миром!", "A new Russia rules the world!"]] },
    suleiman: { lang: 'tr', name: 'Turkish', say: [["Zafer bizimdir!", "Victory is ours!"], ["Dünya artık Osmanlı'nındır!", "The world now belongs to the Ottomans!"]] },
    montezuma: { lang: 'nah', name: 'Nahuatl', say: [["¡Huitzilopochtli techpalehuia!", "Huitzilopochtli is with us!"], ["¡Cemanahuac axcan toaxca!", "The whole world is ours now!"]] },
    sejong: { lang: 'ko', name: 'Korean', say: [["지혜가 승리했다!", "Wisdom has won!"], ["이제 온 세상이 배우리라!", "Now the whole world will learn!"]] },
    isabella: { lang: 'es', name: 'Spanish', say: [["¡España vence!", "Spain wins!"], ["¡El mundo entero es de España!", "The whole world belongs to Spain!"]] },
    henry: { lang: 'pt', name: 'Portuguese', say: [["Portugal vence!", "Portugal wins!"], ["Todos os mares são de Portugal!", "All the seas belong to Portugal!"]] },
    cyrus: { lang: 'fa', name: 'Persian', rtl: true, say: [["پیروزی از آنِ پارس است!", "Victory belongs to Persia!"], ["اکنون جهان از آنِ پارس است!", "Now the world belongs to Persia!"]] },
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  // resolves even when the tab is hidden (browsers pause animations in background tabs)
  function anim(node, frames, ms, easing) { const a = node.animate(frames, { duration: ms, easing: easing || 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); return Promise.race([a.finished.catch(() => { }), new Promise(r => setTimeout(r, ms + 120))]); }
  function load(src) { return new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(i); i.src = src; }); }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // sound (same recipes as the intro, kept local so each file stands alone)
  let ac = null;
  function ctx(on) { if (!on) return null; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
  function noise(c, dur, from, to, vol, type) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type || 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(from, c.currentTime); f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  function tone(c, f0, f1, dur, vol, type, delay) {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (delay || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    whoosh: c => noise(c, 0.3, 300, 2600, 0.45),
    boom: c => { tone(c, 120, 40, 0.6, 0.55); noise(c, 0.4, 900, 80, 0.45, 'lowpass'); },
    clang: c => { [523, 1187, 1873, 2711, 3402].forEach((f, i) => tone(c, f, f * 0.98, 0.85 - i * 0.12, 0.12, 'triangle')); noise(c, 0.18, 4000, 1500, 0.4, 'highpass'); },
    win: c => [392, 523, 659, 784].forEach((f, i) => tone(c, f, f, 0.45, 0.13, 'triangle', i * 0.1)),
    lose: c => [392, 349, 311, 262].forEach((f, i) => tone(c, f, f, 0.45, 0.12, 'triangle', i * 0.13)),
  };

  async function play(o) {
    o = Object.assign({ artPath: 'art/', sound: true, attackerWins: true, title: '', onDone: null, viewerIsAttacker: true }, o || {});
    const base = o.artPath.replace(/\/?$/, '/');
    const sfx = n => { const c = ctx(o.sound); if (c && SFX[n]) try { SFX[n](c); } catch (e) { } };
    if (!document.getElementById('rrc-css')) { const st = el('style'); st.id = 'rrc-css'; st.textContent = CSS; document.head.appendChild(st); }
    const A = o.attacker, D = o.defender;
    await Promise.all([3, 5, 2].flatMap(n => [load(`${base}poses/${A.leader}-${n}.webp`), load(`${base}poses/${D.leader}-${n}.webp`)]));

    const root = el('div', 'rrc');
    root.style.setProperty('--ca', A.color || '#e0483e'); root.style.setProperty('--cd', D.color || '#3b82f6');
    root.innerHTML = `<div class="rrc-bg"></div><div class="rrc-stage">
      <div class="rrc-f l"><img src="${base}poses/${A.leader}-3.webp" alt=""></div><div class="rrc-f r"><img src="${base}poses/${D.leader}-3.webp" alt=""></div>
      <div class="rrc-tag l">${esc(A.name)}<small style="color:${A.color}">Attacker</small></div><div class="rrc-tag r">${esc(D.name)}<small style="color:${D.color}">Defender</small></div>
      <div class="rrc-vs">VS</div><div class="rrc-res"></div></div><div class="rrc-flash"></div>`;
    document.body.appendChild(root);
    const $ = s => root.querySelector(s);
    const fl = $('.rrc-f.l'), fr = $('.rrc-f.r'), stage = $('.rrc-stage');

    let done = false;
    const finish = async () => {
      if (done) return; done = true; window.removeEventListener('keydown', finish);
      await anim(root, [{ opacity: 1 }, { opacity: 0 }], 300, 'ease'); root.remove();
      if (typeof o.onDone === 'function') o.onDone();
    };
    root.addEventListener('click', finish); window.addEventListener('keydown', finish);

    sfx('whoosh');
    anim(fl, [{ opacity: 0, transform: 'translateX(-60%)' }, { opacity: 1, transform: 'none' }], 380);
    anim(fr, [{ opacity: 0, transform: 'translateX(60%)' }, { opacity: 1, transform: 'none' }], 380);
    anim($('.rrc-tag.l'), [{ opacity: 0 }, { opacity: 1 }], 380); anim($('.rrc-tag.r'), [{ opacity: 0 }, { opacity: 1 }], 380);
    await wait(320); if (done) return;
    sfx('boom');
    anim($('.rrc-vs'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(2.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], 240, 'cubic-bezier(.3,1.6,.5,1)');
    await wait(560); if (done) return;

    // charge
    fl.querySelector('img').src = `${base}poses/${A.leader}-5.webp`; fr.querySelector('img').src = `${base}poses/${D.leader}-5.webp`;
    anim($('.rrc-vs'), [{ opacity: 1 }, { opacity: 0 }], 160);
    anim(fl, [{ transform: 'none' }, { transform: 'translateX(20%) scale(1.05)' }], 220, 'cubic-bezier(.6,0,.9,.4)');
    anim(fr, [{ transform: 'none' }, { transform: 'translateX(-20%) scale(1.05)' }], 220, 'cubic-bezier(.6,0,.9,.4)');
    await wait(210); if (done) return;
    sfx('clang');
    anim($('.rrc-flash'), [{ opacity: 0.95 }, { opacity: 0 }], 240, 'ease-out');
    for (let i = 0; i < 24; i++) {
      const s = el('div', 'rrc-spark'); stage.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 230;
      anim(s, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], 450 + Math.random() * 350).then(() => s.remove());
    }
    anim(stage, [0, 1, 2, 3, 4].map(k => ({ transform: k === 4 ? 'none' : `translate(${(Math.random() - .5) * 30}px,${(Math.random() - .5) * 30}px)` })), 300, 'linear');
    await wait(420); if (done) return;

    // result
    const win = o.attackerWins;
    const viewerWon = win === o.viewerIsAttacker;
    const W = win ? fl : fr, L = win ? fr : fl, Wd = win ? A : D;
    W.querySelector('img').src = `${base}poses/${Wd.leader}-2.webp`;
    anim(W, [{ transform: W === fl ? 'translateX(20%) scale(1.05)' : 'translateX(-20%) scale(1.05)' }, { transform: 'scale(1.08)' }], 300);
    anim(L, [{ transform: L === fl ? 'translateX(20%)' : 'translateX(-20%)' }, { transform: (L === fl ? 'translateX(-8%)' : 'translateX(8%)') + ' scale(.92)' }], 300);
    L.classList.add('lost');
    const head = viewerWon ? 'VICTORY' : 'DEFEATED'; // from the viewer's side
    let taunt = '';
    const PB = LINES[Wd.leader];
    const VL = window.TN && TN.VOICE ? TN.VOICE.line(Wd.leader, 'win') : null; // shared voice-line book
    if (VL && o.voice !== false) TN.VOICE.play(Wd.leader, 'win');
    if (!viewerWon && o.taunt !== false && PB) {
      const line = VL ? [VL.native, VL.english] : PB.say[Math.floor(Math.random() * PB.say.length)];
      root.style.setProperty('--cw', Wd.color || '#ffd166');
      taunt = `<div class="rrc-taunt">${esc(Wd.name)}: <bdi lang="${PB.lang}"${PB.rtl ? ' dir="rtl"' : ''}>«${esc(line[0])}»</bdi>${line[1] ? `<em>(${esc(line[1])})</em>` : ''}</div>`;
    }
    $('.rrc-res').innerHTML = `<b>${head}</b>${taunt}<span>${esc(o.title || (win ? `${A.name} wins the battle!` : `${D.name} holds the line!`))}</span>`;
    anim($('.rrc-res'), [{ opacity: 0, transform: 'translateX(-50%) translateY(20px)' }, { opacity: 1, transform: 'translateX(-50%)' }], 320);
    sfx(viewerWon ? 'win' : 'lose');
    await wait(taunt ? 2600 : 1300);
    finish();
  }

  window.RRClash = { play, LINES };
})();
