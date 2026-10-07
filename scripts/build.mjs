// Draws every comic panel in assets/ from profile.config.mjs plus live GitHub data.
// Run locally with `npm run build`; the daily workflow runs it with GITHUB_TOKEN to refresh the numbers.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import cfg from '../profile.config.mjs';
import { C, T, pop, el, svg, measure, wrap, burst, star, rays, dots, fade, bubble, box, inkOn, rng } from './lib/comic.mjs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('assets/', ROOT);
const CACHE = new URL('data/github.json', ROOT);
const UA = { 'User-Agent': `${cfg.login}-comic-profile` };

const LANG_COLORS = {
  Java: '#B07219', JavaScript: '#F1E05A', TypeScript: '#3178C6', Python: '#3572A5', HTML: '#E34C26',
  CSS: '#663399', Vue: '#41B883', 'C++': '#F34B7D', C: '#555555', PowerShell: '#2D6CC0', Shell: '#89E051',
  SCSS: '#C6538C', Batchfile: '#C1F12E', Kotlin: '#A97BFF', Go: '#00ADD8', Rust: '#DEA584', PHP: '#4F5D95',
};

// ---------------------------------------------------------------------------------------------- data

async function gh(path) {
  const headers = { ...UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

// The public contributions fragment needs no token and is what the profile page itself renders.
async function contributions() {
  const res = await fetch(`https://github.com/users/${cfg.login}/contributions`, { headers: UA });
  if (!res.ok) throw new Error(`contributions → ${res.status}`);
  const html = await res.text();
  const total = Number((html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1] ?? '0').replace(/,/g, ''));
  const days = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*data-date[^>]*>/g)) {
    const date = tag.match(/data-date="([\d-]+)"/)?.[1];
    const level = tag.match(/data-level="(\d)"/)?.[1];
    if (date && level) days.push([date, Number(level)]);
  }
  if (!days.length) throw new Error('contribution calendar markup changed');
  return { total, days: days.sort(([a], [b]) => a.localeCompare(b)) };
}

async function loadData() {
  try {
    if (process.argv.includes('--offline')) throw new Error('--offline');
    const user = await gh(`/users/${cfg.login}`);
    const repos = await gh(`/users/${cfg.login}/repos?per_page=100&type=owner`);
    const own = repos.filter((r) => !r.fork);
    const languages = {};
    // Repos without a detected language have nothing to report, so skip their API call.
    for (const r of own.filter((r) => r.language)) {
      for (const [lang, bytes] of Object.entries(await gh(`/repos/${cfg.login}/${r.name}/languages`))) {
        if (cfg.ignoreLanguages.includes(lang)) continue;
        languages[lang] ??= { bytes: 0, repos: 0 };
        languages[lang].bytes += bytes;
        languages[lang].repos += 1;
      }
    }
    const avatarRes = await fetch(`${user.avatar_url}${user.avatar_url.includes('?') ? '&' : '?'}s=256`, { headers: UA });
    if (!avatarRes.ok) throw new Error(`avatar → ${avatarRes.status}`);
    const data = {
      repos: user.public_repos,
      followers: user.followers,
      stars: own.reduce((sum, r) => sum + r.stargazers_count, 0),
      repoStars: Object.fromEntries(own.map((r) => [r.name, r.stargazers_count])),
      languages,
      contrib: await contributions(),
      avatar: {
        mime: avatarRes.headers.get('content-type') ?? 'image/png',
        b64: Buffer.from(await avatarRes.arrayBuffer()).toString('base64'),
      },
    };
    mkdirSync(new URL('data/', ROOT), { recursive: true });
    writeFileSync(CACHE, JSON.stringify(data, null, 1) + '\n');
    return data;
  } catch (err) {
    if (!existsSync(CACHE)) throw err;
    console.warn(`! live data unavailable (${err.message}); drawing from data/github.json`);
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  }
}

// ------------------------------------------------------------------------------------------- panels

const HALFTONE = dots('ht', { size: 11, r: 2.4 });

async function header(d) {
  const W = 1000, H = 460, ax = 735, ay = 288;
  const titleSize = 168;
  const issueSize = 120;
  const issueW = measure('b', cfg.issue, issueSize);
  const tag = 'THE AMAZING ADVENTURES OF';
  const tagW = measure('b', tag, 24, 1) + 26;
  const caption = `${cfg.name}  ·  ${cfg.role}  ·  ${cfg.location}`;
  const capW = measure('h', caption, 25) + 32;
  const logo = 'KATMIN COMICS';
  const logoW = measure('b', logo, 26, 1) + 24;
  const powX = 40 + issueW + 100;

  const stampLines = [['b', 'APPROVED BY THE', 12.5, C.ink], ['b', 'COMPILER', 26, C.red], ['b', '0 ERRORS · 0 WARNINGS', 11, C.ink]];
  const stampW = Math.max(...stampLines.map(([f, s, size]) => measure(f, s, size, 0.5))) + 18;

  const r = rng(7);
  let bars = '';
  for (let x = 8; x < 72; ) {
    const w = 1 + Math.floor(r() * 3);
    bars += el('rect', { x, y: 8, width: w, height: 32, fill: C.ink });
    x += w + 1 + Math.floor(r() * 2);
  }

  const layered = (text, x, y, size, fill) =>
    T('b', text, { size, x: x + 10, y: y + 9, fill: C.ink, stroke: C.ink, 'stroke-width': 13, cls: 'o' }) +
    T('b', text, { size, x: x + 5, y: y + 4, fill: C.red, stroke: C.ink, 'stroke-width': 13, cls: 'o' }) +
    T('b', text, { size, x, y, fill, stroke: C.ink, 'stroke-width': 11, cls: 'o' });

  const body = [
    el('rect', { width: W, height: H, rx: 10, fill: C.white }),
    '<g clip-path="url(#cover)">',
    el('rect', { x: 8, y: 8, width: 984, height: 444, fill: C.yellow }),
    el('path', { class: 'spin', d: rays(ax, ay, 1100, 30), fill: C.gold, opacity: 0.55 }),
    el('rect', { x: 8, y: 8, width: 984, height: 444, fill: 'url(#ht)', mask: 'url(#ht-fade)', opacity: 0.22 }),
    el('rect', { x: 8, y: 8, width: 984, height: 58, fill: C.ink }),
    `<g transform="translate(24 17) rotate(-3)">`,
    el('rect', { width: logoW, height: 38, fill: C.red, stroke: C.white, 'stroke-width': 3 }),
    T('b', logo, { size: 26, x: logoW / 2, y: 29, 'text-anchor': 'middle', fill: C.white, 'letter-spacing': 1 }),
    '</g>',
    T('b', `ISSUE #${cfg.issue}  ·  ${cfg.location.toUpperCase()} EDITION`, { size: 26, x: 500, y: 47, 'text-anchor': 'middle', fill: C.yellow, 'letter-spacing': 2 }),
    T('b', `${d.repos} REPOS INSIDE!`, { size: 24, x: 972, y: 46, 'text-anchor': 'end', fill: C.white, 'letter-spacing': 1 }),
    '</g>',
    el('rect', { x: 8, y: 8, width: 984, height: 444, fill: 'none', stroke: C.ink, 'stroke-width': 6 }),

    // Title block
    `<g transform="translate(38 84) rotate(-4)">`,
    box(0, 0, tagW, 38, { fill: C.red, gutter: 0, shadow: 5 }),
    T('b', tag, { size: 24, x: 13, y: 29, fill: C.white, 'letter-spacing': 1 }),
    '</g>',
    `<g transform="rotate(-3 40 250)">`,
    layered(cfg.alias, 40, 252, titleSize, C.white),
    layered(cfg.issue, 44, 366, issueSize, C.blue),
    '</g>',
    `<g transform="translate(${powX} 318)"><g class="pulse">`,
    el('polygon', { points: burst(0, 0, 76, 52, 14, 3), fill: C.red, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    el('polygon', { points: burst(0, 0, 58, 40, 14, 9), fill: C.yellow, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    pop('b', 'POW!', { size: 44, x: 0, y: 15, 'text-anchor': 'middle', fill: C.red, sw: 6, gutter: 0 }),
    '</g></g>',
    `<g transform="translate(40 394) rotate(-1.5)">`,
    box(0, 0, capW, 46, { fill: C.paper, gutter: 0, shadow: 6 }),
    T('h', caption, { size: 25, x: 16, y: 31, fill: C.ink }),
    '</g>',

    // Hero portrait + speech bubble
    `<g transform="translate(${ax} ${ay}) rotate(4)">`,
    el('rect', { x: -133, y: -133, width: 266, height: 266, fill: C.white }),
    el('rect', { x: -114, y: -114, width: 252, height: 252, fill: C.ink }),
    el('rect', { x: -126, y: -126, width: 252, height: 252, fill: C.white, stroke: C.ink, 'stroke-width': 6 }),
    el('image', { href: `data:${d.avatar.mime};base64,${d.avatar.b64}`, x: -116, y: -116, width: 232, height: 232, preserveAspectRatio: 'xMidYMid slice' }),
    el('rect', { x: -116, y: -116, width: 232, height: 232, fill: 'none', stroke: C.ink, 'stroke-width': 4 }),
    '</g>',
    '<g class="bob">',
    el('path', { d: bubble(700, 118, 122, 52, 104, 26, [668, 214]), fill: C.white, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    ...cfg.bubble.map((line, i) => T('b', line, { size: 32, x: 700, y: 112 + i * 33 - (cfg.bubble.length - 1) * 8, 'text-anchor': 'middle', fill: C.ink, 'letter-spacing': 1 })),
    '</g>',

    // Cover furniture: code-authority stamp and barcode
    `<g transform="translate(916 116) rotate(8)">`,
    box(-stampW / 2, -40, stampW, 82, { fill: C.white, gutter: 0, shadow: 4 }),
    T('b', stampLines[0][1], { size: 12.5, x: 0, y: -20, 'text-anchor': 'middle', 'letter-spacing': 0.5 }),
    T('b', stampLines[1][1], { size: 26, x: 0, y: 9, 'text-anchor': 'middle', fill: C.red, 'letter-spacing': 0.5 }),
    el('line', { x1: -stampW / 2 + 8, x2: stampW / 2 - 8, y1: 17, y2: 17, stroke: C.ink, 'stroke-width': 2 }),
    T('b', stampLines[2][1], { size: 11, x: 0, y: 32, 'text-anchor': 'middle', 'letter-spacing': 0.5 }),
    '</g>',
    `<g transform="translate(896 372)">`,
    box(0, 0, 80, 64, { fill: C.white, border: 3, gutter: 0 }),
    bars,
    T('b', 'FREE · ₫0', { size: 15, x: 40, y: 57, 'text-anchor': 'middle', 'letter-spacing': 0.5 }),
    '</g>',
  ].join('');

  return svg({
    w: W,
    h: H,
    title: `${cfg.alias} ${cfg.issue} — comic book cover`,
    desc: `${cfg.name}, ${cfg.role}, ${cfg.location}. "${cfg.bubble.join(' ')}"`,
    defs:
      HALFTONE +
      fade('ht-fade', { x1: 0, y1: 1, x2: 0.7, y2: 0 }) +
      '<clipPath id="cover"><rect x="8" y="8" width="984" height="444"/></clipPath>',
    body,
  });
}

async function chapter(ch) {
  const W = 1000, H = 124, y0 = 28, y1 = 104, skew = 22;
  const color = C[ch.color];
  const tagText = `CH.${ch.no}`;
  const tagW = measure('b', tagText, 34, 1) + 28;
  const title = ch.title.toUpperCase();
  const titleW = measure('b', title, 54, 1.5);
  const sub = `— ${ch.vi}`;
  const subW = measure('h', sub, 26);
  const x0 = 20 + tagW - 16;
  const boxW = titleW + subW + 84;
  const pts = (dx = 0, dy = 0) =>
    [[x0 + skew, y0], [x0 + boxW + skew, y0], [x0 + boxW, y1], [x0, y1]].map(([x, y]) => `${x + dx},${y + dy}`).join(' ');

  // The sound effect gets whatever room is left on the right, shrinking to fit.
  const room = W - 24 - (x0 + boxW + skew + 34);
  let sfxSize = 64;
  while (measure('b', ch.sfx, sfxSize, 1) > room && sfxSize > 26) sfxSize -= 2;
  const sfxX = x0 + boxW + skew + 34 + room / 2;

  const body = [
    el('polygon', { points: pts(), fill: C.white, stroke: C.white, 'stroke-width': 14, 'stroke-linejoin': 'round' }),
    el('polygon', { points: pts(8, 8), fill: C.ink }),
    el('polygon', { points: pts(), fill: C.yellow }),
    el('polygon', { points: pts(), fill: 'url(#ht)', opacity: 0.13 }),
    el('polygon', { points: pts(), fill: 'none', stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    T('b', title, { size: 54, x: x0 + 36, y: 86, fill: C.ink, 'letter-spacing': 1.5 }),
    T('h', sub, { size: 26, x: x0 + 48 + titleW, y: 84, fill: C.ink, opacity: 0.72 }),
    `<g transform="translate(20 16) rotate(-6)">`,
    box(0, 0, tagW, 50, { fill: C.red, gutter: 4, shadow: 5 }),
    pop('b', tagText, { size: 34, x: tagW / 2, y: 38, 'text-anchor': 'middle', fill: C.white, sw: 5, gutter: 0, 'letter-spacing': 1 }),
    '</g>',
    `<g transform="translate(${sfxX} 66) rotate(-5)"><g class="wiggle">`,
    pop('b', ch.sfx, { size: sfxSize, x: 0, y: sfxSize * 0.36, 'text-anchor': 'middle', fill: color, sw: 9, gutter: 5, 'letter-spacing': 1 }),
    '</g></g>',
  ].join('');

  return svg({ w: W, h: H, title: `Chapter ${ch.no}: ${ch.title}`, desc: `${ch.title} (${ch.vi})`, defs: HALFTONE, body });
}

async function origin() {
  const W = 1000, H = 340, top = 12, bot = 328, L = 12, R = 988, gut = 12, slant = 14;
  const splits = [256, 500, 744];
  const panels = [0, 1, 2, 3].map((i) => {
    const lt = i ? splits[i - 1] + slant + gut / 2 : L;
    const lb = i ? splits[i - 1] - slant + gut / 2 : L;
    const rt = i < 3 ? splits[i] + slant - gut / 2 : R;
    const rb = i < 3 ? splits[i] - slant - gut / 2 : R;
    return {
      pts: `${lt},${top} ${rt},${top} ${rb},${bot} ${lb},${bot}`,
      lt, rt,
      at: (y) => (lt + rt + ((lb - lt + rb - rt) * (y - top)) / (bot - top)) / 2,
    };
  });

  const caption = (p, text) => {
    const w = measure('b', text, 19, 0.5) + 18;
    return box(p.lt + 12, top + 12, w, 30, { fill: C.yellow, border: 3, gutter: 0 }) + T('b', text, { size: 19, x: p.lt + 21, y: top + 34, 'letter-spacing': 0.5 });
  };
  const say = (p, text, w = 200) => {
    const lines = wrap('h', text, 20, w - 22);
    const h = lines.length * 22 + 16;
    const y = bot - 14 - h;
    const cx = p.at(y + h / 2);
    return (
      box(cx - w / 2, y, w, h, { fill: C.white, border: 3, gutter: 0 }) +
      lines.map((line, i) => T('h', line, { size: 20, x: cx, y: y + 27 + i * 22, 'text-anchor': 'middle' })).join('')
    );
  };

  // Panel 1 — the hero appears
  const p1 = panels[0];
  const one = [
    el('rect', { width: W, height: H, fill: C.red }),
    el('path', { class: 'spin-slow', d: rays(p1.at(140), 140, 420, 16), fill: '#D42A24' }),
    `<g class="pulse">${el('polygon', { points: star(p1.at(140), 140, 66, 28), fill: C.yellow, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' })}</g>`,
    caption(p1, 'MEANWHILE, IN VIETNAM...'),
    pop('b', 'A HERO DEV', { size: 38, x: p1.at(250), y: 256, 'text-anchor': 'middle', fill: C.white, sw: 7, gutter: 0, 'letter-spacing': 1 }),
    pop('b', 'APPEARS!', { size: 48, x: p1.at(300), y: 304, 'text-anchor': 'middle', fill: C.yellow, sw: 8, gutter: 0, 'letter-spacing': 1 }),
  ].join('');

  // Panel 2 — by day
  const p2 = panels[1];
  const lx = p2.at(140);
  const r = rng(3);
  const codeColors = [C.yellow, C.pink, C.cyan, C.green, C.white];
  let code = '';
  [0, 1, 2, 2, 1, 0].forEach((indent, i) => {
    let x = lx - 62 + indent * 12;
    for (let s = 0; s < 2; s++) {
      const w = 14 + Math.floor(r() * 34);
      if (x + w > lx + 62) break;
      code += el('rect', { x, y: 94 + i * 12, width: w, height: 6, rx: 3, fill: codeColors[(i + s * 2) % codeColors.length] });
      x += w + 6;
    }
  });
  let sunRays = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    sunRays += `M${(Math.cos(a) * 28).toFixed(1)} ${(Math.sin(a) * 28).toFixed(1)}L${(Math.cos(a) * 38).toFixed(1)} ${(Math.sin(a) * 38).toFixed(1)}`;
  }
  const two = [
    el('rect', { width: W, height: H, fill: C.sky }),
    el('rect', { width: W, height: H, fill: 'url(#ht)', opacity: 0.12 }),
    `<g transform="translate(${p2.rt - 52} ${top + 58})"><g class="spin-slow">`,
    el('path', { d: sunRays, stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }),
    el('circle', { r: 20, fill: C.yellow, stroke: C.ink, 'stroke-width': 4 }),
    '</g></g>',
    caption(p2, 'BY DAY...'),
    el('rect', { x: lx - 80, y: 76, width: 160, height: 104, rx: 8, fill: C.ink }),
    el('rect', { x: lx - 70, y: 86, width: 140, height: 84, rx: 3, fill: '#22305A' }),
    code,
    el('rect', { class: 'blink', x: lx - 50, y: 160, width: 8, height: 4, fill: C.white }),
    el('polygon', { points: `${lx - 96},180 ${lx + 96},180 ${lx + 110},196 ${lx - 110},196`, fill: '#D9E2EC', stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    `<g transform="translate(${lx + 58} 80) rotate(-12)"><g class="wiggle">`,
    pop('b', 'TAP TAP!', { size: 26, x: 0, y: 9, 'text-anchor': 'middle', fill: C.yellow, sw: 6, gutter: 3, 'letter-spacing': 1 }),
    '</g></g>',
    say(p2, cfg.origin.day),
  ].join('');

  // Panel 3 — by night
  const p3 = panels[2];
  const mx = p3.at(140);
  const rs = rng(11);
  let sparkles = '';
  for (let i = 0; i < 16; i++) {
    const x = p3.lt - 20 + rs() * 260, y = 20 + rs() * 200, s = 3 + rs() * 4;
    sparkles += el('path', {
      class: 'twinkle',
      style: `animation-delay:-${(rs() * 2.2).toFixed(2)}s`,
      d: `M${x.toFixed(1)} ${(y - s).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x + s).toFixed(1)} ${y.toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y + s).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x - s).toFixed(1)} ${y.toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y - s).toFixed(1)}Z`,
      fill: '#FFF3C4',
    });
  }
  const three = [
    el('rect', { width: W, height: H, fill: C.navy }),
    sparkles,
    `<g transform="translate(${p3.rt - 50} ${top + 56})">`,
    el('circle', { r: 22, fill: '#FFE9A8', stroke: C.ink, 'stroke-width': 4 }),
    el('circle', { cx: 10, cy: -8, r: 19, fill: C.navy }),
    '</g>',
    caption(p3, 'BY NIGHT...'),
    el('circle', { cx: mx, cy: 128, r: 110, fill: 'url(#glow)' }),
    el('rect', { x: mx - 84, y: 74, width: 168, height: 108, rx: 9, fill: '#C9D3E6', stroke: C.ink, 'stroke-width': 4 }),
    el('rect', { x: mx - 74, y: 84, width: 148, height: 88, rx: 4, fill: '#0B0F24' }),
    T('b', 'AI TOOLS', { size: 21, x: mx, y: 108, 'text-anchor': 'middle', fill: C.cyan, 'letter-spacing': 1 }),
    T('b', 'EXTENSIONS', { size: 21, x: mx, y: 133, 'text-anchor': 'middle', fill: C.pink, 'letter-spacing': 1 }),
    T('b', 'GAMES', { size: 21, x: mx, y: 158, 'text-anchor': 'middle', fill: C.yellow, 'letter-spacing': 1 }),
    el('rect', { x: mx - 10, y: 182, width: 20, height: 10, fill: '#C9D3E6', stroke: C.ink, 'stroke-width': 3 }),
    el('rect', { x: mx - 42, y: 191, width: 84, height: 9, rx: 4, fill: '#C9D3E6', stroke: C.ink, 'stroke-width': 3 }),
    `<g transform="translate(${mx + 34} 72) rotate(8)"><g class="wiggle">`,
    pop('b', 'SLEEP? NOPE!', { size: 22, x: 0, y: 8, 'text-anchor': 'middle', fill: C.pink, sw: 6, gutter: 3, 'letter-spacing': 1 }),
    '</g></g>',
    say(p3, cfg.origin.night),
  ].join('');

  // Panel 4 — the mission
  const p4 = panels[3];
  const ux = p4.at(150);
  const steam = [-18, 0, 18]
    .map((dx, i) =>
      el('path', {
        class: 'steam',
        style: `animation-delay:-${(i * 0.8).toFixed(1)}s`,
        d: `M${ux + dx} 100q-8 -10 0 -20q8 -10 0 -20`,
        fill: 'none',
        stroke: C.ink,
        'stroke-width': 4,
        'stroke-linecap': 'round',
      }),
    )
    .join('');
  const four = [
    el('rect', { width: W, height: H, fill: C.pink }),
    el('path', { class: 'spin-slow', d: rays(ux, 150, 420, 16), fill: '#FF8CC6' }),
    el('rect', { width: W, height: H, fill: 'url(#ht)', opacity: 0.1 }),
    caption(p4, 'THE MISSION:'),
    steam,
    el('path', { d: `M${ux + 40} 126c36 0 36 54 0 54`, fill: 'none', stroke: C.ink, 'stroke-width': 15, 'stroke-linecap': 'round' }),
    el('path', { d: `M${ux + 40} 126c36 0 36 54 0 54`, fill: 'none', stroke: C.white, 'stroke-width': 6, 'stroke-linecap': 'round' }),
    el('rect', { x: ux - 44, y: 108, width: 88, height: 94, rx: 12, fill: C.white, stroke: C.ink, 'stroke-width': 5 }),
    el('ellipse', { cx: ux, cy: 111, rx: 40, ry: 9, fill: '#7B4A2E', stroke: C.ink, 'stroke-width': 4 }),
    T('b', '</>', { size: 36, x: ux, y: 172, 'text-anchor': 'middle', fill: C.red }),
    `<g transform="translate(${ux - 64} 96) rotate(-14)"><g class="wiggle">`,
    pop('b', 'SLURP!', { size: 26, x: 0, y: 9, 'text-anchor': 'middle', fill: C.yellow, sw: 6, gutter: 3, 'letter-spacing': 1 }),
    '</g></g>',
    say(p4, cfg.origin.mission),
  ].join('');

  const body = [
    el('rect', { width: W, height: H, rx: 10, fill: C.white }),
    ...[one, two, three, four].map((inner, i) => `<g clip-path="url(#p${i})">${inner}</g>`),
    ...panels.map((p) => el('polygon', { points: p.pts, fill: 'none', stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' })),
  ].join('');

  return svg({
    w: W,
    h: H,
    title: 'Origin story — a four-panel comic strip',
    desc: `Meanwhile, in ${cfg.location}... a hero dev appears! ${cfg.origin.day} ${cfg.origin.night} The mission: ${cfg.origin.mission}`,
    defs:
      HALFTONE +
      '<radialGradient id="glow"><stop offset="0" stop-color="#3EC1D3" stop-opacity=".55"/><stop offset="1" stop-color="#3EC1D3" stop-opacity="0"/></radialGradient>' +
      panels.map((p, i) => `<clipPath id="p${i}"><polygon points="${p.pts}"/></clipPath>`).join(''),
    body,
  });
}

async function powers() {
  const W = 1000, padX = 34, size = 27, padS = 18, sh = 52, gap = 16, maxGap = 44, lineGap = 14, rowGap = 30;
  const labelW = Math.max(...cfg.powers.map((g) => measure('b', g.label.toUpperCase(), 22, 1))) + 30;
  const x0 = padX + labelW + 30, maxX = W - 38;
  const r = rng(42);
  let y = 40;
  let body = '';
  for (const group of cfg.powers) {
    // Flow stickers into lines, then spread each line across the board (capped, centred if short).
    const flow = (limit) => {
      const out = [[]];
      let x = x0;
      for (const [name, color] of group.items) {
        const text = name.toUpperCase();
        const w = measure('b', text, size, 0.5) + padS * 2;
        if (x + w > limit && out.at(-1).length) out.push([]), (x = x0);
        out.at(-1).push({ text, fill: C[color], w });
        x += w + gap;
      }
      return out;
    };
    // When a group wraps, narrow the limit as far as the line count allows so lines come out even.
    let lines = flow(maxX);
    for (let limit = maxX - 10; lines.length > 1 && flow(limit).length === lines.length; limit -= 10) lines = flow(limit);
    const placed = lines.flatMap((items, line) => {
      const used = items.reduce((sum, it) => sum + it.w, 0);
      const spread = items.length > 1 ? Math.min(maxGap, (maxX - x0 - used) / (items.length - 1)) : 0;
      let ix = x0 + (maxX - x0 - used - spread * (items.length - 1)) / 2;
      return items.map((it) => {
        const out = { ...it, x: ix, line };
        ix += it.w + spread;
        return out;
      });
    });
    const line = lines.length - 1;
    const rowH = (line + 1) * sh + line * lineGap;
    body += `<g transform="translate(${padX} ${y + rowH / 2 - 22}) rotate(-3)">`;
    body += box(0, 0, labelW, 44, { fill: C.ink, border: 3, gutter: 0, shadow: 0 });
    body += T('b', group.label.toUpperCase(), { size: 22, x: labelW / 2, y: 30, 'text-anchor': 'middle', fill: C.yellow, 'letter-spacing': 1 });
    body += '</g>';
    for (const it of placed) {
      const sy = y + it.line * (sh + lineGap);
      const textAttrs = { size, x: 0, y: 10, 'text-anchor': 'middle', 'letter-spacing': 0.5 };
      body += `<g transform="translate(${(it.x + it.w / 2).toFixed(1)} ${sy + sh / 2}) rotate(${(r() * 6 - 3).toFixed(1)})">`;
      body += box(-it.w / 2, -sh / 2, it.w, sh, { fill: it.fill, gutter: 0, shadow: 5, rx: 10 });
      body +=
        inkOn(it.fill) === C.ink
          ? T('b', it.text, { ...textAttrs, fill: C.ink })
          : pop('b', it.text, { ...textAttrs, fill: C.white, sw: 5, gutter: 0 });
      body += '</g>';
    }
    y += rowH + rowGap;
  }
  const H = y + 6;

  return svg({
    w: W,
    h: H,
    title: 'Super powers — tech stack',
    desc: cfg.powers.map((g) => `${g.label}: ${g.items.map(([n]) => n).join(', ')}`).join('. '),
    defs: HALFTONE + fade('corner', { x1: 1, y1: 0, x2: 0.4, y2: 0.8 }),
    body:
      el('rect', { width: W, height: H, rx: 10, fill: C.white }) +
      el('rect', { x: 8, y: 8, width: W - 16, height: H - 16, fill: C.paper, stroke: C.ink, 'stroke-width': 5 }) +
      el('rect', { x: 8, y: 8, width: W - 16, height: H - 16, fill: 'url(#ht)', mask: 'url(#corner)', opacity: 0.16 }) +
      body,
  });
}

async function card(m, i, d) {
  const W = 490, H = 270;
  const color = C[m.color];
  const stars = d.repoStars[m.repo] ?? 0;
  const title = m.title.toUpperCase();
  let titleSize = 46;
  while (measure('b', title, titleSize, 1) > 440 && titleSize > 28) titleSize -= 2;
  let lines = wrap('h', m.desc, 20, 440);
  if (lines.length > 3) lines = [...lines.slice(0, 2), `${lines[2].replace(/[\s,.:;]+$/, '')}…`];
  const missionTag = `MISSION #${String(i + 1).padStart(2, '0')}`;
  const missionW = measure('b', missionTag, 20, 1) + 22;
  const band = (dx = 0) => `6,6 484,6 484,${62 + dx} 6,${76 + dx}`;

  let tx = 24;
  const tags = m.tags
    .map((t) => {
      const text = t.toUpperCase();
      const w = measure('b', text, 16, 0.5) + 24;
      const out =
        el('rect', { x: tx, y: 220, width: w, height: 28, rx: 14, fill: C.white, stroke: C.ink, 'stroke-width': 3 }) +
        T('b', text, { size: 16, x: tx + w / 2, y: 240, 'text-anchor': 'middle', 'letter-spacing': 0.5 });
      tx += w + 8;
      return out;
    })
    .join('');

  const body = [
    el('rect', { width: W, height: H, rx: 10, fill: C.white }),
    '<g clip-path="url(#card)">',
    el('rect', { x: 6, y: 6, width: 478, height: 258, fill: C.paper }),
    el('polygon', { points: band(), fill: color }),
    el('polygon', { points: band(), fill: 'url(#ht)', opacity: 0.18 }),
    el('rect', { x: 6, y: 80, width: 478, height: 184, fill: 'url(#ht)', mask: 'url(#card-fade)', opacity: 0.1 }),
    '</g>',
    el('path', { d: 'M6 76L484 62', stroke: C.ink, 'stroke-width': 5 }),
    box(22, 20, missionW, 32, { fill: C.ink, border: 2, gutter: 0 }),
    T('b', missionTag, { size: 20, x: 22 + missionW / 2, y: 43, 'text-anchor': 'middle', fill: C.yellow, 'letter-spacing': 1 }),
    `<g transform="translate(${W - 30} 50) rotate(-6)"><g class="wiggle">`,
    pop('b', m.sfx, { size: 44, x: 0, y: 14, 'text-anchor': 'end', fill: C.white, sw: 8, gutter: 0, 'letter-spacing': 1 }),
    '</g></g>',
    T('b', title, { size: titleSize, x: 27, y: 129, fill: color, stroke: C.ink, 'stroke-width': 3, cls: 'o', 'letter-spacing': 1 }),
    T('b', title, { size: titleSize, x: 24, y: 126, fill: C.ink, 'letter-spacing': 1 }),
    ...lines.map((line, k) => T('h', line, { size: 20, x: 24, y: 158 + k * 22, fill: C.ink })),
    tags,
    `<g transform="translate(${W - 54} 228)"><g class="pulse">`,
    el('polygon', { points: burst(0, 0, 36, 27, 12, i + 5), fill: C.yellow, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    stars
      ? el('polygon', { points: star(-10, -1, 10), fill: C.ink }) + T('b', String(stars), { size: 24, x: 10, y: 8, 'text-anchor': 'middle' })
      : T('b', 'NEW!', { size: 19, x: 0, y: 7, 'text-anchor': 'middle', fill: C.red }),
    '</g></g>',
    el('rect', { x: 6, y: 6, width: 478, height: 258, fill: 'none', stroke: C.ink, 'stroke-width': 5 }),
  ].join('');

  return svg({
    w: W,
    h: H,
    title: `${missionTag}: ${m.title}`,
    desc: `${m.desc} (${m.tags.join(', ')}) — ${stars} stars`,
    defs:
      HALFTONE +
      fade('card-fade', { x1: 1, y1: 1, x2: 0.5, y2: 0.4 }) +
      '<clipPath id="card"><rect x="6" y="6" width="478" height="258"/></clipPath>',
    body,
  });
}

async function stats(d) {
  const W = 1000, H = 500;
  const items = [
    [d.repos, 'PUBLIC REPOS', C.red],
    [d.stars, 'STARS EARNED', C.blue],
    [d.followers, 'FOLLOWERS', C.pink],
    [d.contrib.total, 'CONTRIBS / YEAR', C.green],
  ];
  const bursts = items
    .map(([n, label, color], i) => {
      const x = 134 + i * 244;
      const lw = measure('b', label, 20, 1) + 24;
      return (
        `<g transform="translate(${x} 112)"><g class="pulse" style="animation-delay:-${(i * 0.45).toFixed(2)}s">` +
        el('polygon', { points: burst(0, 0, 94, 72, 16, i + 11), fill: C.white, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }) +
        el('polygon', { points: burst(0, 0, 76, 58, 16, i + 21), fill: color, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }) +
        pop('b', String(n), { size: String(n).length > 3 ? 50 : 68, x: 0, y: 24, 'text-anchor': 'middle', fill: C.white, sw: 9, gutter: 0, 'letter-spacing': 1 }) +
        '</g></g>' +
        box(x - lw / 2, 200, lw, 32, { fill: C.ink, border: 2, gutter: 3 }) +
        T('b', label, { size: 20, x, y: 223, 'text-anchor': 'middle', fill: C.yellow, 'letter-spacing': 1 })
      );
    })
    .join('');

  const caption = (x, y, text) => {
    const w = measure('b', text, 22, 1) + 22;
    return box(x, y, w, 32, { fill: C.yellow, border: 3, gutter: 0, shadow: 4 }) + T('b', text, { size: 22, x: x + 11, y: y + 24, 'letter-spacing': 1 });
  };

  // Favorite weapons: sqrt(bytes) × sqrt(repo count), so one giant repo can't drown out everything else.
  const scores = Object.entries(d.languages).map(([lang, { bytes, repos }]) => [lang, Math.sqrt(bytes) * Math.sqrt(repos)]);
  const total = scores.reduce((sum, [, s]) => sum + s, 0) || 1;
  const top = scores.sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fallback = [C.red, C.blue, C.green, C.pink, C.purple];
  const bars = top.length
    ? top
        .map(([lang, score], i) => {
          const y = 318 + i * 32;
          const pct = (score / total) * 100;
          const w = Math.max(24, (pct / 100) * 248);
          return (
            T('b', lang.toUpperCase(), { size: 21, x: 34, y: y + 18, 'letter-spacing': 0.5 }) +
            el('rect', { x: 170, y, width: 252, height: 22, rx: 11, fill: C.white, stroke: C.ink, 'stroke-width': 3 }) +
            el('rect', { x: 170, y, width: w.toFixed(1), height: 22, rx: 11, fill: LANG_COLORS[lang] ?? fallback[i], stroke: C.ink, 'stroke-width': 3 }) +
            el('rect', { x: 170, y, width: w.toFixed(1), height: 22, rx: 11, fill: 'url(#ht)', opacity: 0.2 }) +
            T('b', `${pct.toFixed(pct < 10 ? 1 : 0)}%`, { size: 21, x: 474, y: y + 18, 'text-anchor': 'end' })
          );
        })
        .join('')
    : T('h', 'No language data yet.', { size: 22, x: 34, y: 360 });

  // Training log: last 26 weeks of the contribution calendar, Sunday-first columns like GitHub's.
  const levels = ['#F1E4C3', '#FFE38A', '#FFC93C', '#FF8C42', C.red];
  const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const lastDay = d.contrib.days.at(-1)?.[0];
  const weeks = 26, cell = 14, step = 17;
  const gx = 506 + (482 - (weeks * step - 3)) / 2, gy = 328;
  let grid = '';
  let months = '';
  if (lastDay) {
    const last = day(lastDay);
    const start = last - new Date(last).getUTCDay() * 864e5 - (weeks - 1) * 7 * 864e5;
    let lastMonth = -1;
    for (const [date, level] of d.contrib.days) {
      const t = day(date);
      if (t < start) continue;
      const col = Math.floor((t - start) / (7 * 864e5));
      const row = new Date(t).getUTCDay();
      grid += el('rect', {
        class: t === last ? 'blink' : undefined,
        x: gx + col * step,
        y: gy + row * step,
        width: cell,
        height: cell,
        rx: 3,
        fill: levels[level] ?? levels[0],
        stroke: C.ink,
        'stroke-width': 1.6,
      });
      const month = new Date(t).getUTCMonth();
      if (row === 0 && month !== lastMonth && col < weeks - 2) {
        months += T('h', new Date(t).toLocaleString('en', { month: 'short', timeZone: 'UTC' }), { size: 16, x: gx + col * step, y: gy - 6 });
        lastMonth = month;
      }
    }
  }
  const legend =
    T('h', 'less', { size: 17, x: 806, y: 478, 'text-anchor': 'end' }) +
    levels.map((fill, i) => el('rect', { x: 814 + i * 19, y: 465, width: 14, height: 14, rx: 3, fill, stroke: C.ink, 'stroke-width': 1.6 })).join('') +
    T('h', 'more', { size: 17, x: 914, y: 478 });

  const body = [
    el('rect', { width: W, height: H, rx: 10, fill: C.white }),
    '<g clip-path="url(#pa)">',
    el('rect', { x: 12, y: 12, width: 976, height: 236, fill: C.yellow }),
    el('path', { class: 'spin', d: rays(500, 130, 700, 32), fill: C.gold, opacity: 0.5 }),
    el('rect', { x: 12, y: 12, width: 976, height: 236, fill: 'url(#ht)', opacity: 0.1 }),
    '</g>',
    el('rect', { x: 12, y: 12, width: 976, height: 236, fill: 'none', stroke: C.ink, 'stroke-width': 5 }),
    bursts,
    box(12, 260, 482, 228, { fill: C.paper, border: 5, gutter: 0 }),
    caption(28, 274, 'FAVORITE WEAPONS'),
    bars,
    box(506, 260, 482, 228, { fill: C.paper, border: 5, gutter: 0 }),
    caption(522, 274, `TRAINING LOG · LAST ${weeks} WEEKS`),
    months,
    grid,
    legend,
  ].join('');

  return svg({
    w: W,
    h: H,
    title: 'Power level — GitHub stats',
    desc:
      `${d.repos} public repos, ${d.stars} stars, ${d.followers} followers, ${d.contrib.total} contributions in the last year. ` +
      `Top languages: ${top.map(([l, b]) => `${l} ${((b / total) * 100).toFixed(0)}%`).join(', ')}.`,
    defs: HALFTONE + '<clipPath id="pa"><rect x="12" y="12" width="976" height="236"/></clipPath>',
    body,
  });
}

async function button({ label, sub, color, icon }) {
  const W = 320, H = 100;
  const text = inkOn(color);
  const body = [
    el('rect', { x: 2, y: 2, width: 308, height: 88, rx: 18, fill: C.white }),
    el('rect', { x: 16, y: 16, width: 292, height: 76, rx: 14, fill: C.ink }),
    el('rect', { x: 8, y: 8, width: 292, height: 76, rx: 14, fill: color, stroke: C.ink, 'stroke-width': 5 }),
    el('rect', { x: 8, y: 8, width: 292, height: 76, rx: 14, fill: 'url(#ht)', opacity: 0.14 }),
    `<g transform="translate(52 46)"><g class="pulse">`,
    el('polygon', { points: burst(0, 0, 34, 25, 10, 4), fill: C.white, stroke: C.ink, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }),
    T('b', icon, { size: 38, x: 0, y: 14, 'text-anchor': 'middle', fill: C.ink }),
    '</g></g>',
    text === C.ink
      ? T('b', label, { size: 34, x: 96, y: 50, fill: C.ink, 'letter-spacing': 1.5 })
      : pop('b', label, { size: 34, x: 96, y: 50, fill: C.white, sw: 6, gutter: 0, 'letter-spacing': 1.5 }),
    T('h', sub, { size: 19, x: 97, y: 72, fill: text, opacity: 0.9 }),
  ].join('');
  return svg({ w: W, h: H, title: label, desc: sub, defs: HALFTONE, body });
}

async function continued() {
  const W = 1000, H = 170;
  const text = 'TO BE CONTINUED...';
  const tw = measure('b', text, 46, 2);
  const tip = 0, head = 86, bodyH = 64, headH = 120;
  const len = head + tw + 70;
  const ox = (W - len) / 2, cy = 66;
  const pts = (dx = 0, dy = 0) =>
    [[tip, 0], [head, -headH / 2], [head, -bodyH / 2], [len, -bodyH / 2], [len, bodyH / 2], [head, bodyH / 2], [head, headH / 2]]
      .map(([x, y]) => `${(ox + x + dx).toFixed(1)},${(cy + y + dy).toFixed(1)}`)
      .join(' ');
  const speed = [-18, 0, 18].map((dy, i) => el('path', { d: `M${ox + len + 22 + i * 10} ${cy + dy}h${70 - i * 16}`, stroke: C.white, 'stroke-width': 12, 'stroke-linecap': 'round' }) + el('path', { d: `M${ox + len + 22 + i * 10} ${cy + dy}h${70 - i * 16}`, stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' })).join('');

  const body = [
    '<g class="slide">',
    speed,
    el('polygon', { points: pts(), fill: C.white, stroke: C.white, 'stroke-width': 16, 'stroke-linejoin': 'round' }),
    el('polygon', { points: pts(9, 9), fill: C.ink, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    el('polygon', { points: pts(), fill: C.yellow, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    el('polygon', { points: pts(), fill: 'url(#ht)', opacity: 0.14 }),
    T('b', text, { size: 46, x: ox + head + 34, y: cy + 17, fill: C.ink, 'letter-spacing': 2 }),
    '</g>',
    pop('h', 'Thanks for reading!  ·  Cảm ơn bạn đã ghé qua!', { size: 24, x: W / 2, y: 156, 'text-anchor': 'middle', fill: C.ink, sw: 0, gutter: 4 }),
  ].join('');
  return svg({ w: W, h: H, title: 'To be continued...', desc: 'Thanks for reading! Cảm ơn bạn đã ghé qua!', defs: HALFTONE, body });
}

// --------------------------------------------------------------------------------------------- main

const d = await loadData();
mkdirSync(OUT, { recursive: true });
const files = {
  'header.svg': await header(d),
  'origin.svg': await origin(),
  'powers.svg': await powers(),
  'stats.svg': await stats(d),
  'to-be-continued.svg': await continued(),
  'btn-facebook.svg': await button({ label: 'FACEBOOK', sub: cfg.links.facebook.handle, color: C.blue, icon: 'f' }),
  'btn-follow.svg': await button({ label: 'FOLLOW', sub: `@${cfg.login} on GitHub`, color: C.yellow, icon: '+' }),
  'btn-repos.svg': await button({ label: 'ALL ISSUES', sub: `${d.repos} public repos`, color: C.red, icon: '#' }),
};
for (const ch of cfg.chapters) files[`${ch.file}.svg`] = await chapter(ch);
for (const [i, m] of cfg.missions.entries()) files[`mission-${String(i + 1).padStart(2, '0')}.svg`] = await card(m, i, d);

for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), content);
  console.log(`✓ assets/${name.padEnd(24)} ${(content.length / 1024).toFixed(1)} KB`);
}
