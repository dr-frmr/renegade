// X (x.com, twitter.com). X picks its theme with data-theme on <html> ("dark"
// for Lights out and Dim, nothing or "light" for Default). Holding it at "light"
// on the page gives X's own light design, which is then repainted. Your X display
// setting itself is left alone.
(function () {
  const M = globalThis.Renegade;
  const html = document.documentElement;
  M.repaintPage({
    themeAttributes: ['data-theme'],
    keepLight: () => { if (html.getAttribute('data-theme') !== 'light') html.setAttribute('data-theme', 'light'); },
  });
})();
