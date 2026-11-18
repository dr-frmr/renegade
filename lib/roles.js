/*
 * What each color is for. Every value is a paint from palette.json, a paint
 * thinned over the ground, or a paint glazed with ink to read as text (lib/color.js).
 * The app outputs in build.js only read from here.
 */
const R = require('./color.js');
const P = R.PAINT;
const text = (name, ratio) => R.forText(name, ratio);

const ground = P['ground'];
const navy = P['navy-bars'];

/** Meaningful roles, for apps with named slots. */
const role = {
  background: ground,
  surface: R.mix(ground, P['grey-planes'], 0.3),          // panels, inputs, raised areas
  frame: R.shade('pink-plane', 0.5),                      // window chrome, tab strips
  border: R.mix(navy, ground, 0.86),
  text: navy,
  textMuted: text('lavender-squiggle'),
  accent: P['blue-lines'],                                // links, primary buttons, cursor, focus
  onAccent: ground,
  highlight: R.shade('pink-plane', 0.5),                  // selection, the active row
  highlightStrong: P['pink-plane'],                       // edge of the active row, selected item in sidebars
  success: text('chartreuse'),
  warning: text('orange-planes'),
  attention: P['saffron-arcs'],
  danger: P['burst-red'],
  dangerText: text('burst-red'),
  merged: text('mauve-wedge'),
  path: text('brown-strokes'),
  added: text('chartreuse'),
  removed: text('burst-red'),
};

/** The same roles on a navy ground, for apps that also want a dark side. */
const dark = {
  background: navy,
  text: ground,
  accent: R.onNavy('sky-planes'),
  onAccent: navy,
  danger: R.onNavy('burst-red', 3),
  dangerText: R.onNavy('burst-red'),
  warning: P['orange-planes'],
  warningText: P['orange-planes'],
  attention: P['saffron-arcs'],
  success: R.onNavy('chartreuse'),
  added: R.onNavy('chartreuse'),
  removed: R.onNavy('burst-red'),
  merged: R.onNavy('mauve-wedge'),
  path: R.onNavy('peach-planes'),
};

/** Code colors. */
const syntax = {
  comment: text('lavender-squiggle'),
  keyword: P['blue-lines'],
  function: text('orange-planes'),
  type: text('mauve-wedge'),
  string: text('chartreuse'),
  number: text('teal-marks'),
  constant: text('saffron-arcs'),
  namespace: text('brown-strokes'),
  variable: navy,
  parameter: P['slate-blue-plane'],
  operator: text('sky-planes'),
  decorator: text('pink-a-frame'),
  builtin: P['red-arc'],
  tag: text('mauve-wedge'),
  attribute: text('teal-marks'),
  regexp: text('pink-a-frame'),
  escape: text('saffron-arcs'),
};

/** Base16 (tinted-theming spec 0.11): base00-07 background to darkest text, base08-0F accents. */
const base16 = {
  base00: ground,
  base01: role.surface,
  base02: role.highlight,
  base03: text('lavender-squiggle'),
  base04: R.mix(navy, ground, 0.25),
  base05: navy,
  base06: R.shade('navy-bars', -0.35),
  base07: R.shade('navy-bars', -0.6),
  base08: text('burst-red'),
  base09: text('orange-planes'),
  base0A: text('saffron-arcs'),
  base0B: text('chartreuse'),
  base0C: text('teal-marks'),
  base0D: P['blue-lines'],
  base0E: text('mauve-wedge'),
  base0F: P['red-arc'],
};

/** Base24: Base16 plus two more backgrounds and the bright accents, at lighter contrast. */
const base24 = {
  ...base16,
  base10: R.mix(ground, P['grey-planes'], 0.45),
  base11: R.mix(ground, P['grey-planes'], 0.6),
  base12: text('burst-red', 3),
  base13: text('saffron-arcs', 3),
  base14: text('chartreuse', 3),
  base15: text('teal-marks', 3),
  base16: text('sky-planes', 3),
  base17: text('pink-plane', 3),
};

/** Terminal colors, laid out like Solarized: 0-7 normal, 8-15 bright. */
const ansi = [
  navy, text('burst-red'), text('chartreuse'), text('saffron-arcs'), P['blue-lines'], text('pink-a-frame'), text('teal-marks'), P['grey-planes'],
  text('lavender-squiggle', 3), text('orange-planes', 3), text('chartreuse', 3), text('saffron-arcs', 3), text('sky-planes', 3), text('mauve-wedge', 3), text('teal-marks', 3), ground,
];
const ansiDark = [
  R.mix(navy, ground, 0.12), R.onNavy('burst-red'), R.onNavy('chartreuse'), R.onNavy('saffron-arcs'), R.onNavy('sky-planes'), R.onNavy('pink-a-frame'), R.onNavy('teal-marks'), P['grey-planes'],
  R.onNavy('lavender-squiggle', 3), P['orange-planes'], R.onNavy('chartreuse', 6), R.onNavy('saffron-arcs', 7), R.onNavy('sky-planes', 6), R.onNavy('mauve-wedge', 6), R.onNavy('teal-marks', 6), ground,
];
/** The readable text color (ground or navy) on top of each color. */
const readableOn = (bg) => (R.contrast(ground, bg) >= R.contrast(navy, bg) ? ground : navy);

module.exports = { paint: P, role, dark, syntax, base16, base24, ansi, ansiDark, readableOn, contrast: R.contrast };
