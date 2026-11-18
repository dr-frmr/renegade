// The repaint engine shared by the sites (GitHub, X). It rewrites every color in
// the page's own stylesheets in place,
// so each rule keeps its exact position, layer and priority, and repaints colors
// that scripts put straight on elements (inline styles, SVG fills and strokes).
// Components with their own sealed-off styles (shadow roots) get the same
// treatment; shadow.js keeps those roots readable. Each site file calls
// Renegade.repaintPage() with what is particular to it.
(function () {
  const M = globalThis.Renegade;
  const html = document.documentElement;

  const NAMED = { white: '#ffffff', black: '#000000' };
  const COLORISH = /#[0-9a-f]{3,8}\b|rgba?\(|oklch\(|hsla?\(/i;
  const HSL_TRIPLE = /^\d[\d.]*\s+\d[\d.]*%\s+\d[\d.]*%(\s*\/\s*[\d.]+%?)?$/;   // shadcn tokens, e.g. "60 4.3% 95.5%"
  function repaint(value, name = '') {
    const v = value.trim();
    if (NAMED[v.toLowerCase()]) return M.mapColor(NAMED[v.toLowerCase()]);
    if (name.startsWith('--') && HSL_TRIPLE.test(v)) return M.mapColor(v);   // only color variables use bare triples
    if (!COLORISH.test(v)) return null;
    return M.mapColor(v) || M.mapColorsIn(v);
  }

  // ---- stylesheets, rewritten in place ----
  const doneRules = new WeakSet();
  function repaintRule(rule) {
    if (doneRules.has(rule)) return;
    doneRules.add(rule);
    const st = rule.style;
    for (const name of [...st]) {
      const v = st.getPropertyValue(name);
      const out = v && repaint(v, name);
      if (out && out !== v.trim()) st.setProperty(name, out, st.getPropertyPriority(name));
    }
  }
  function walk(rules) {
    for (const r of rules) {
      if (r.style) repaintRule(r);
      if (r.cssRules) walk(r.cssRules);            // @layer, @media, @supports, nested rules
    }
  }

  // Every place styles can live: the document and each shadow root found so far.
  const roots = new Set([document]);
  // A sheet is walked again only when its rule count changes (scripts insert
  // rules), so big stylesheets don't cost anything on every page change.
  const seenLength = new WeakMap();
  function repaintSheet(sheet, rules) {
    if (seenLength.get(sheet) === rules.length) return;
    seenLength.set(sheet, rules.length);
    walk(rules);
  }
  function repaintSheets() {
    for (const root of roots) {
      for (const sheet of root.styleSheets) {
        const owner = sheet.ownerNode;
        if (owner && owner.dataset && owner.dataset.renegadeFrom) continue;   // our repainted copy
        let rules; try { rules = sheet.cssRules; } catch { adoptCrossOrigin(sheet); continue; }
        repaintSheet(sheet, rules);
      }
      for (const sheet of root.adoptedStyleSheets || []) repaintSheet(sheet, sheet.cssRules);
    }
  }

  // ---- stylesheets from another domain (X serves its CSS from abs.twimg.com) ----
  // Their rules can't be read in place, so fetch the text, repaint a parsed copy,
  // put it right after the original <link> and switch the original off. Order,
  // layers and priority stay the same.
  const pending = new Set();
  const absolutize = (css, base) => css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/g,
    (_, q, u) => `url(${q}${new URL(u, base).href}${q})`);
  function adoptCrossOrigin(sheet) {
    const link = sheet.ownerNode;
    if (!link || link.nodeName !== 'LINK' || link.dataset.renegade) return;
    link.dataset.renegade = 'fetching';
    const job = fetch(link.href, { credentials: 'omit' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((text) => {
        const copy = new CSSStyleSheet();
        copy.replaceSync(absolutize(text, link.href));
        walk(copy.cssRules);
        const style = document.createElement('style');
        style.dataset.renegadeFrom = link.href;
        if (link.media) style.media = link.media;
        style.textContent = [...copy.cssRules].map((r) => r.cssText).join('\n');
        link.after(style);
        link.disabled = true;
        link.dataset.renegade = 'replaced';
      })
      .catch(() => { link.dataset.renegade = 'unreadable'; })          // e.g. no CORS: leave it as it is
      .finally(() => pending.delete(job));
    pending.add(job);
  }

  // ---- colors scripts put on elements ----
  const ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];
  const written = new WeakMap();                    // element -> {attr: value we wrote}
  function repaintElement(el) {
    if (el.nodeType !== 1 || el === html) return;
    const mem = written.get(el) || {};
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v == null || mem[a] === v) continue;
      const out = repaint(v);
      if (out) { el.setAttribute(a, out); mem[a] = out; }
    }
    const s = el.getAttribute('style');
    if (s && mem.style !== s && COLORISH.test(s)) {
      const out = M.mapColorsIn(s);
      if (out) { el.setAttribute('style', out); mem.style = el.getAttribute('style'); }
    }
    written.set(el, mem);
    if (el.shadowRoot) addRoot(el.shadowRoot);
  }
  function repaintTree(node) {
    if (!node || (node.nodeType !== 1 && node.nodeType !== 11)) return;   // elements and shadow roots
    if (node.nodeType === 1) repaintElement(node);
    for (const el of node.querySelectorAll('*')) {
      if (el.hasAttribute('style') || el.hasAttribute('fill') || el.hasAttribute('stroke') || el.hasAttribute('stop-color')) repaintElement(el);
      else if (el.shadowRoot) addRoot(el.shadowRoot);
    }
  }

  // ---- watching a root for changes ----
  let scheduleSheets = () => {};
  const observe = (root) => new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes') repaintElement(m.target);
      for (const n of m.addedNodes) repaintTree(n);
    }
    scheduleSheets();                               // new stylesheets, or rules inserted by scripts
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', ...ATTRS] });
  function addRoot(root) {
    if (roots.has(root)) return;
    roots.add(root);
    observe(root);
    repaintTree(root);
    scheduleSheets();
  }
  // shadow.js (in the page's own world) announces each new shadow root on its host
  document.addEventListener('renegade-shadow', (e) => { if (e.target.shadowRoot) addRoot(e.target.shadowRoot); }, true);

  /**
   * @param {object} site
   * @param {() => void} [site.keepLight]  undo the site's own dark theme, if it can be undone
   * @param {string[]} [site.themeAttributes]  <html> attributes the site's theme lives in (default: class)
   * @param {Record<string,string>} [site.variables]  variables to pin on <html>
   */
  M.repaintPage = function (site = {}) {
    if (site.keepLight) {
      site.keepLight();
      new MutationObserver(site.keepLight).observe(html, { attributes: true, attributeFilter: site.themeAttributes || ['class'] });
    }
    for (const [n, v] of Object.entries(site.variables || {})) html.style.setProperty(n, v, 'important');

    let frame = 0;
    scheduleSheets = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(repaintSheets); };
    observe(html);
    document.addEventListener('load', (e) => { if (e.target.nodeName === 'LINK') scheduleSheets(); }, true);

    // show the page once its stylesheets, including fetched ones, are repainted
    const reveal = () => html.setAttribute('data-renegade', '');
    const revealWhenReady = () => Promise.allSettled([...pending]).then(reveal);
    document.addEventListener('DOMContentLoaded', () => { repaintSheets(); repaintTree(document.body); revealWhenReady(); });
    window.addEventListener('load', () => { repaintSheets(); revealWhenReady(); });
    setTimeout(reveal, 1500);                       // never leave the page hidden
  };
})();
