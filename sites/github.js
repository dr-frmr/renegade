// GitHub. Repainted live by repaint.js like the other sites, so new pages and
// components (the new pull request view, for one) are covered as GitHub ships
// them. GitHub is held in its light theme so its scripts and images also choose
// their light variants. A few colors are chosen rather than mapped:
// code colors (each paint deepened with black ink until it reads) and primary
// buttons in the blue lines, like bb's accent.
(function () {
  const M = globalThis.Renegade;
  const html = document.documentElement;
  const t = (name) => M.forText(name);
  // GitHub only switches on the stylesheet for the theme your account uses. With a
  // dark (or "sync with system") account, light mode's colors are never loaded, so
  // code colors and diff tints have nothing to read. Switch the light one on.
  function loadLightTheme() {
    for (const link of document.querySelectorAll('link[data-color-theme="light"]')) {
      if (!link.getAttribute('href') && link.dataset.href) link.href = link.dataset.href;
    }
  }
  document.addEventListener('DOMContentLoaded', loadLightTheme);
  M.repaintPage({
    themeAttributes: ['data-color-mode', 'data-light-theme'],
    keepLight: () => {
      if (html.getAttribute('data-color-mode') !== 'light') html.setAttribute('data-color-mode', 'light');
      if (html.getAttribute('data-light-theme') !== 'light') html.setAttribute('data-light-theme', 'light');
      loadLightTheme();
    },
    variables: {
      '--prettylights-syntax-comment': t('lavender-squiggle'),
      '--prettylights-syntax-constant': t('teal-marks'),
      '--prettylights-syntax-constantOtherReferenceLink': t('blue-lines'),
      '--prettylights-syntax-entity': t('orange-planes'),          // function names
      '--prettylights-syntax-entityTag': t('mauve-wedge'),          // tags
      '--prettylights-syntax-keyword': t('blue-lines'),
      '--prettylights-syntax-string': t('chartreuse'),
      '--prettylights-syntax-stringRegexp': t('pink-a-frame'),
      '--prettylights-syntax-variable': t('brown-strokes'),
      '--prettylights-syntax-storageModifierImport': M.PAINT['navy-bars'],
      '--prettylights-syntax-markup-heading': t('blue-lines'),
      '--prettylights-syntax-metaDiffRange': t('mauve-wedge'),
      '--button-primary-bgColor-rest': M.PAINT['blue-lines'],
      '--button-primary-bgColor-hover': M.shade('blue-lines', 0.12),
      '--button-primary-bgColor-active': M.shade('blue-lines', -0.25),
      '--button-primary-bgColor-disabled': M.shade('blue-lines', 0.6),
      '--button-primary-borderColor-disabled': M.shade('blue-lines', 0.6),
    },
  });
})();
