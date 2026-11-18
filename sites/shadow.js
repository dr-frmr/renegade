// Runs in the page's own JavaScript world. Components can wall off their styles
// in a "closed" shadow root that no other script can read; this opens every new
// shadow root (the component keeps working the same way) and announces it on its
// host, so repaint.js can repaint what's inside.
(function () {
  if (globalThis.__renegadeShadow) return;
  globalThis.__renegadeShadow = true;
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const root = attach.call(this, Object.assign({}, init, { mode: 'open' }));
    const host = this;
    const announce = () => host.dispatchEvent(new Event('renegade-shadow', { composed: true }));
    if (host.isConnected) announce(); else queueMicrotask(() => { if (host.isConnected) announce(); });
    return root;
  };
})();
