// Panelin tund rejimi üçün app/panel-dark.css faylını app/globals.css-dən generasiya edir.
//   node scripts/gen-dark-panel.mjs
// globals.css dəyişəndə yenidən işə salın. Çıxış faylını əl ilə redaktə etməyin
// (əl ilə düzəlişlər app/panel-dark.manual.css-dədir və sona əlavə olunur).
//
// Üsul: hər qaydadakı rəng dəyərləri parlaqlığı tərsinə çevrilməklə (ton saxlanılır)
// yenidən yazılır və `html[data-theme=dark][data-area=panel]` ilə məhdudlaşdırılır.
// Heuristika:
//  - tünd doldurulmuş fonu olan qaydalar (düymə, yan panel) olduğu kimi qalır;
//  - demək olar ağ mətn rəngi dəyişmir (tünd fonda oturur);
//  - ağ fon "kart" rənginə çevrilir (səhifə fonundan bir az açıq);
//  - kölgələr və yarımşəffaf qara üst-pərdələr dəyişmir.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import postcss from "postcss";

const SRC = "app/globals.css";
const OUT = "app/panel-dark.css";
const MANUAL = "app/panel-dark.manual.css";
const SCOPE = "html[data-theme=dark][data-area=panel]";
const CARD = [22, 35, 30]; // #16231e

const COLOR_PROPS = /^(color|background(-color|-image)?|border(-[a-z]+)*|outline(-color)?|fill|stroke|caret-color|text-decoration-color|accent-color|column-rule(-color)?)$/;
const COLOR_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|\b(?:white|black)\b/gi;

function parseColor(str) {
  const s = str.toLowerCase();
  if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (s === "black") return { r: 0, g: 0, b: 0, a: 1 };
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}

function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function fromHsl({ h, s, l }) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

const fmt = ([r, g, b], a) =>
  a < 1 ? `rgba(${r},${g},${b},${+a.toFixed(3)})` : "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// Tünd fonda mətn rəngi bu parlaqlıqdan solğun olmasın (kiçik boz etiketlər oxunsun deyə).
const MIN_TEXT_L = 0.66;

function invert(color, isBg, isText = false) {
  const hsl = toHsl(color);
  if (isBg && hsl.l >= 0.985) return fmt(CARD, color.a);
  let l = (1 - hsl.l) * 0.88 + 0.07;
  if (isText) l = Math.max(l, MIN_TEXT_L);
  // Az doymuş (boz-yaşılımtıl) rənglər tünd fonun yaşıl çalarına çəkilir: əks halda
  // sarımtıl açıq tonlar tərsinə çevriləndə çirkli zeytun/qəhvəyi görünür.
  if (hsl.s < 0.3) return fmt(fromHsl({ h: 0.43, s: Math.min(hsl.s, 0.2), l }), color.a);
  return fmt(fromHsl({ h: hsl.h, s: hsl.s * 0.85, l }), color.a);
}

function transformValue(prop, value) {
  const isBg = prop.startsWith("background");
  const isText = prop === "color";
  return value.replace(COLOR_RE, (m) => {
    const c = parseColor(m);
    const { l } = toHsl(c);
    if (c.a < 1 && l < 0.15) return m; // kölgə / qara üst-pərdə
    if (isText && l > 0.9) return m; // ağ mətn tünd fonda qalır
    return invert(c, isBg, isText);
  });
}

function hasDarkSolidBackground(rule) {
  let dark = false;
  rule.walkDecls(/^background(-color)?$/, (d) => {
    const m = d.value.match(COLOR_RE);
    if (!m) return;
    const c = parseColor(m[0]);
    if (c.a >= 0.8 && toHsl(c).l < 0.5) dark = true;
  });
  return dark;
}

function wrappers(rule) {
  const chain = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type !== "atrule" || !/^(media|supports|container)$/.test(p.name)) return null;
    chain.unshift(`@${p.name} ${p.params}`);
  }
  return chain;
}

function prefixSelector(sel) {
  const s = sel.trim();
  if (s.startsWith(":root")) return null;
  if (/^(html|body)\b/.test(s)) return `${SCOPE} ${s.replace(/^html\s*/, "")}`.trim();
  return `${SCOPE} ${s}`;
}

// Rəngsiz border/outline xassələri (radius, width və s.) təkrar yazılmır.
const NON_COLOR = /^border(-[a-z]+)*-(radius|collapse|spacing|width|style|image[a-z-]*)$|^border-(collapse|spacing)$/;

const root = postcss.parse(readFileSync(SRC, "utf8"));
const out = [];
let emitted = 0;

// Dəyişməyən (ağ mətn, tünd fon, var(--x)) rəng qaydaları da əsl sıra ilə yazılır: əks halda
// məsələn `.panel-nav-item` üçün yaranan prefiksli qayda `.panel-nav-item.active`-in
// ağ rəngini ixtisaslıq (specificity) üstünlüyü ilə üstələyərdi.
root.walkRules((rule) => {
  const wrap = wrappers(rule);
  if (!wrap) return;
  const keepOriginal = hasDarkSolidBackground(rule);
  const decls = [];
  rule.each((node) => {
    if (node.type !== "decl" || !COLOR_PROPS.test(node.prop) || NON_COLOR.test(node.prop)) return;
    COLOR_RE.lastIndex = 0;
    const v = keepOriginal ? node.value : transformValue(node.prop, node.value);
    decls.push(`${node.prop}:${v}${node.important ? "!important" : ""}`);
  });
  if (!decls.length) return;
  const selectors = rule.selectors.map(prefixSelector).filter(Boolean);
  if (!selectors.length) return;
  let css = `${selectors.join(",")}{${decls.join(";")}}`;
  for (const w of wrap.reverse()) css = `${w}{${css}}`;
  out.push(css);
  emitted++;
});

const header = `/* GENERASİYA OLUNUB — scripts/gen-dark-panel.mjs. Əl ilə redaktə etməyin. */
${SCOPE}{--ink:#e8efe9;--muted:#9fb0a6;--green:#3f7d5e;--paper:#0e1713;--line:#24362e;color-scheme:dark}
${SCOPE} body{background:#0e1713;color:#e8efe9}
`;
const manual = existsSync(MANUAL) ? "\n" + readFileSync(MANUAL, "utf8") : "";
writeFileSync(OUT, header + out.join("\n") + "\n" + manual);
console.log(`${emitted} qayda yazıldı → ${OUT}`);
