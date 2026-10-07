// Comic-book drawing kit: fonts (measured + subset + embedded), shapes and the SVG document wrapper.
import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';
import subsetFont from 'subset-font';

export const C = {
  ink: '#16120F',
  paper: '#FFF7E3',
  white: '#FFFFFF',
  yellow: '#FFD23F',
  gold: '#FFB30F',
  orange: '#FF8C42',
  red: '#EF3E36',
  blue: '#2E86DE',
  sky: '#8ED1FC',
  navy: '#1C1F3F',
  cyan: '#3EC1D3',
  teal: '#2EC4B6',
  green: '#5BC864',
  pink: '#FF6FB5',
  purple: '#8F6BFF',
};

// b = Bangers (titles, SFX, lettering), h = Patrick Hand (body text). Both OFL, both cover Vietnamese.
const FONTS = {
  b: { file: 'Bangers-Regular.ttf', family: 'KatminBangers', stack: "Impact,'Arial Black',sans-serif" },
  h: { file: 'PatrickHand-Regular.ttf', family: 'KatminHand', stack: "'Comic Sans MS','Chalkboard SE',cursive" },
};
for (const f of Object.values(FONTS)) {
  f.buf = readFileSync(new URL(`../../fonts/${f.file}`, import.meta.url));
  f.ot = opentype.parse(f.buf.buffer.slice(f.buf.byteOffset, f.buf.byteOffset + f.buf.byteLength));
}

export function measure(font, str, size, spacing = 0) {
  return FONTS[font].ot.getAdvanceWidth(String(str), size) + spacing * [...String(str)].length;
}

export function wrap(font, str, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(str).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(font, next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');

// Characters drawn with each font since the last svg() call, so every file embeds only the glyphs it uses.
const used = { b: new Set(), h: new Set() };

export function T(font, str, { size, cls, ...rest }) {
  for (const ch of String(str)) used[font].add(ch);
  return `<text class="${font}${cls ? ` ${cls}` : ''}" font-size="${size}"${attrs(rest)}>${esc(str)}</text>`;
}

// Lettering that survives both GitHub themes: white outer gutter, ink outline, coloured fill.
export function pop(font, str, { size, fill = C.white, sw = 8, gutter = 5, ...rest }) {
  return (
    (gutter ? T(font, str, { size, ...rest, cls: 'o', fill: C.white, stroke: C.white, 'stroke-width': sw + gutter * 2 }) : '') +
    T(font, str, { size, ...rest, cls: 'o', fill, stroke: C.ink, 'stroke-width': sw })
  );
}

export function el(tag, a = {}, inner) {
  return inner === undefined ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${inner}</${tag}>`;
}

const f1 = (n) => +n.toFixed(1);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Jagged "KA-POW" starburst outline.
export function burst(cx, cy, ro, ri, n, seed = 1, jitter = 0.2) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const rad = (i % 2 ? ri : ro) * (1 - jitter / 2 + r() * jitter);
    pts.push(`${f1(cx + Math.cos(a) * rad)},${f1(cy + Math.sin(a) * rad)}`);
  }
  return pts.join(' ');
}

export const star = (cx, cy, ro, ri = ro * 0.45) => burst(cx, cy, ro, ri, 5, 1, 0);

// Sunburst wedges, drawn as one path centred on (cx, cy) so it can spin around its own box centre.
export function rays(cx, cy, R, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (2 * Math.PI * i) / n;
    const a1 = a0 + Math.PI / n;
    d += `M${f1(cx)} ${f1(cy)}L${f1(cx + Math.cos(a0) * R)} ${f1(cy + Math.sin(a0) * R)}L${f1(cx + Math.cos(a1) * R)} ${f1(cy + Math.sin(a1) * R)}Z`;
  }
  return d;
}

export function dots(id, { size = 10, r = 2.2, color = C.ink, angle = 30 } = {}) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/></pattern>`;
}

// A mask that fades from opaque to clear along a direction, for halftone that dissolves across a panel.
export function fade(id, { x1 = 0, y1 = 0, x2 = 1, y2 = 1, from = 1, to = 0 } = {}) {
  return (
    `<linearGradient id="${id}-g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#fff" stop-opacity="${from}"/><stop offset="1" stop-color="#fff" stop-opacity="${to}"/></linearGradient>` +
    `<mask id="${id}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}-g)"/></mask>`
  );
}

// Oval speech bubble with a tail. The tail leaves the oval at angle `at` (degrees, 90 = straight down).
export function bubble(cx, cy, rx, ry, at, spread, [tx, ty]) {
  const p = (deg) => {
    const a = (deg * Math.PI) / 180;
    return `${f1(cx + rx * Math.cos(a))} ${f1(cy + ry * Math.sin(a))}`;
  };
  return `M${p(at + spread / 2)}A${rx} ${ry} 0 1 1 ${p(at - spread / 2)}L${tx} ${ty}Z`;
}

// Bordered box with a white gutter so the ink line reads on GitHub's dark theme too.
export function box(x, y, w, h, { fill = C.paper, border = 4, gutter = 4, shadow = 0, rx = 0, extra = {} } = {}) {
  return (
    (gutter ? el('rect', { x: x - gutter, y: y - gutter, width: w + gutter * 2, height: h + gutter * 2, rx: rx && rx + gutter, fill: C.white }) : '') +
    (shadow ? el('rect', { x: x + shadow, y: y + shadow, width: w, height: h, rx: rx || undefined, fill: C.ink }) : '') +
    el('rect', { x, y, width: w, height: h, rx: rx || undefined, fill, stroke: C.ink, 'stroke-width': border, ...extra })
  );
}

// Light colours get ink lettering, dark ones get white.
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 150 ? C.ink : C.white;
}

const ANIM = `
.o{paint-order:stroke;stroke-linejoin:round;stroke-linecap:round}
.spin,.spin-slow,.pulse,.wiggle,.pop-in{transform-box:fill-box;transform-origin:center}
.spin{animation:spin 50s linear infinite}
.spin-slow{animation:spin 120s linear infinite}
.pulse{animation:pulse 1.8s ease-in-out infinite}
.wiggle{animation:wiggle 1.4s ease-in-out infinite}
.bob{animation:bob 2.6s ease-in-out infinite}
.blink{animation:blink 1.1s steps(1) infinite}
.twinkle{animation:twinkle 2.2s ease-in-out infinite}
.steam{animation:steam 2.4s ease-in infinite}
.slide{animation:slide 1.1s cubic-bezier(.2,1.4,.4,1) both}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{transform:scale(1.08) rotate(-4deg)}}
@keyframes wiggle{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes bob{50%{transform:translateY(-6px)}}
@keyframes blink{50%{opacity:0}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes steam{0%{transform:translateY(8px);opacity:0}40%{opacity:1}100%{transform:translateY(-14px);opacity:0}}
@keyframes slide{from{transform:translateX(720px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

export async function svg({ w, h, title, desc, defs = '', css = '', body }) {
  let faces = '';
  let classes = '';
  for (const [k, f] of Object.entries(FONTS)) {
    if (used[k].size) {
      const woff2 = await subsetFont(f.buf, [...used[k]].sort().join(''), { targetFormat: 'woff2' });
      faces += `@font-face{font-family:${f.family};src:url(data:font/woff2;base64,${woff2.toString('base64')}) format('woff2')}`;
      used[k].clear();
    }
    classes += `.${k}{font-family:${f.family},${f.stack}}`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">` +
    `<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>` +
    `<defs><style>${faces}${classes}${ANIM}${css}</style>${defs}</defs>${body}</svg>\n`
  );
}
