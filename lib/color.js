/*
 * renegade's color logic, shared by the build (Node) and the site extension
 * (browser). Every color it produces comes from the painting: one of the paints,
 * a paint thinned over the ground (as if translucent), or a paint glazed darker
 * with black ink (to read as text).
 *
 * In Node the paints come from palette.json. In the browser the build prepends
 * `globalThis.RENEGADE_PAINT = {...}` before this file.
 */
(function (root) {
  const PAINT = typeof module !== 'undefined' && module.exports
    ? Object.fromEntries(Object.entries(require('../palette.json').paint)
        .filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, v.$value]))
    : root.RENEGADE_PAINT;

  // ---- sRGB <-> OKLab ----
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055);
  function rgbToOklab([r, g, b]) {
    [r, g, b] = [r, g, b].map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function oklabToRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(gam);
  }
  const clamp = (rgb) => rgb.map((v) => Math.min(1, Math.max(0, v)));
  const toLch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const rgbToHex = (rgb, a = 1) => '#' + clamp(rgb).map(hex2).join('') + (a < 1 ? hex2(a) : '');

  const LAB = Object.fromEntries(Object.entries(PAINT).map(([n, hex]) => [n, rgbToOklab(hexToRgb(hex))]));
  const GROUND = LAB['ground'], NAVY = LAB['navy-bars'];
  const linOf = (name) => hexToRgb(PAINT[name]).map(lin);

  // ---- contrast (WCAG) ----
  const luminance = (hex) => { const [r, g, b] = hexToRgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

  /** A paint thinned over the ground (t > 0) or glazed with black ink (t < 0); t in -1..1. */
  function shade(name, t) {
    const base = linOf(name), ground = linOf('ground');
    const l = t >= 0 ? base.map((v, i) => v + (ground[i] - v) * t) : base.map((v) => v * (1 + t));
    return rgbToHex(l.map(gam));
  }
  /** The paint, glazed darker with ink just until it reaches `ratio` against the ground. */
  function forText(name, ratio = 4.5) {
    for (let i = 0; i <= 200; i++) { const c = shade(name, -i / 200); if (contrast(c, PAINT['ground']) >= ratio) return c; }
    return PAINT['navy-bars'];
  }
  /** The paint, thinned toward the ground just until it reaches `ratio` against the navy. */
  function onNavy(name, ratio = 4.5) {
    for (let i = 0; i <= 100; i++) { const c = shade(name, i / 100); if (contrast(c, PAINT['navy-bars']) >= ratio) return c; }
    return PAINT['ground'];
  }
  /** Mix two hex colors in sRGB; t of b into a. */
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
  }

  // ---- mapping any color onto the paints (used to repaint websites) ----
  // Source hue ranges (OKLCH degrees) and the paints that may replace them.
  const FAMILIES = [
    { range: [[12, 40]],            paints: ['burst-red', 'red-arc'] },
    { range: [[40, 72]],            paints: ['orange-planes', 'peach-planes', 'brown-strokes'] },
    { range: [[72, 105]],           paints: ['saffron-arcs'] },
    { range: [[105, 165]],          paints: ['chartreuse'] },
    { range: [[165, 215]],          paints: ['teal-marks'] },
    { range: [[215, 280]],          paints: ['blue-lines', 'slate-blue-plane', 'sky-planes'] },
    { range: [[280, 335]],          paints: ['mauve-wedge', 'lavender-squiggle'] },
    { range: [[335, 360], [0, 12]], paints: ['pink-plane', 'pink-a-frame', 'mauve-wedge'] },
  ];
  // Grays walk the painting's own grays, light to dark.
  const NEUTRALS = ['ground', 'grey-planes', 'lavender-squiggle', 'navy-bars'];
  const SNAP = 0.08;     // OKLab lightness within which a color becomes the pure paint
  const VIVID = 0.12;    // OKLCH chroma above which a source counts as vivid
  const labMix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  /** Thin a paint over the ground (lighter) or glaze it with ink (darker) to reach lightness Lp. */
  function toLightness(name, Lp) {
    const paint = LAB[name], base = linOf(name), ground = linOf('ground');
    const lighter = Lp >= paint[0];
    const at = (t) => rgbToOklab((lighter ? base.map((v, i) => v + (ground[i] - v) * t) : base.map((v) => v * (1 - t))).map(gam));
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2, L = at(mid)[0]; if (lighter ? L < Lp : L > Lp) lo = mid; else hi = mid; }
    return at((lo + hi) / 2);
  }
  function mapLab(L, C, h) {
    const Lp = Math.min(GROUND[0], L * GROUND[0]);   // white lands exactly on the ground
    if (C < (Lp < 0.8 ? 0.04 : 0.02)) {
      const pts = NEUTRALS.map((n) => LAB[n]);
      let i = 0;
      while (i < pts.length - 2 && Lp < pts[i + 1][0]) i++;
      const t = Math.min(1, Math.max(0, (Lp - pts[i][0]) / (pts[i + 1][0] - pts[i][0])));
      return clamp(oklabToRgb(labMix(pts[i], pts[i + 1], t)));
    }
    const fam = FAMILIES.find((f) => f.range.some(([lo, hi]) => h >= lo && h < hi));
    let best = null, bestScore = Infinity;
    for (const n of fam.paints) {
      const score = Math.abs(LAB[n][0] - Lp) + 1.5 * Math.abs(Math.hypot(LAB[n][1], LAB[n][2]) - C);
      if (score < bestScore) { bestScore = score; best = n; }
    }
    const dL = LAB[best][0] - Lp;
    const pure = Math.abs(dL) < SNAP || (C > VIVID && dL < 0.05);
    return clamp(oklabToRgb(pure ? LAB[best] : toLightness(best, Lp)));
  }
  const mapRgb = (rgb) => { const [L, C, h] = toLch(rgbToOklab(rgb)); return mapLab(L, C, h); };

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
  }
  function rgbToHsl([r, g, b]) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, s * 100, l * 100];
  }
  const num = parseFloat;
  const pct = (s, scale = 1) => (s.trim().endsWith('%') ? num(s) / 100 : num(s) / scale);

  /** Map one CSS color value onto the paints; null when it isn't a plain color. */
  function mapColor(raw) {
    const v = raw.trim();
    let m;
    if ((m = v.match(/^#([0-9a-f]{3,8})$/i))) {
      let h = m[1];
      if (h.length <= 4) h = [...h].map((c) => c + c).join('');
      return rgbToHex(mapRgb(hexToRgb('#' + h.slice(0, 6))), h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
    }
    if ((m = v.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
      return rgbToHex(mapRgb([m[1], m[2], m[3]].map((x) => pct(x, 255))), m[4] ? pct(m[4]) : 1);
    }
    if ((m = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)$/i))) {
      return rgbToHex(mapLab(pct(m[1]), num(m[2]), num(m[3])), m[4] ? pct(m[4]) : 1);
    }
    if ((m = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
      return rgbToHex(mapRgb(hslToRgb(num(m[1]), num(m[2]), num(m[3]))), m[4] ? pct(m[4]) : 1);
    }
    if ((m = v.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(\s*\/\s*[\d.]+%?)?$/))) {   // shadcn-style bare HSL
      const [h, s, l] = rgbToHsl(mapRgb(hslToRgb(num(m[1]), num(m[2]), num(m[3]))));
      return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%${m[4] || ''}`;
    }
    return null;
  }
  /** Map every color inside a compound value (shadows, gradients); null if none. */
  function mapColorsIn(raw) {
    let changed = false;
    const out = raw.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|oklch\([^)]*\)|hsla?\([^)]*\)/gi, (c) => {
      const mapped = mapColor(c);
      if (mapped) { changed = true; return mapped; }
      return c;
    });
    return changed ? out : null;
  }

  const api = { PAINT, shade, forText, onNavy, mix, contrast, mapColor, mapColorsIn };
  root.Renegade = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
