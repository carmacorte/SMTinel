/* SMTinel Bonepile More Modules integration v0.1.0 */
(function (window, document) {
  'use strict';
  if (window.__SMTINEL_BONEPILE_MENU_INTEGRATION__) return;
  window.__SMTINEL_BONEPILE_MENU_INTEGRATION__ = true;

  var BUTTON_ID = 'smtinel-bonepile-more-module';
  var LOADER_URL = 'modules/bonepile/bonepile-loader.js?v=0.1.0';

  function loadBonepileAndOpen() {
    if (window.SMTinelBonepile && typeof window.SMTinelBonepile.open === 'function') {
      window.SMTinelBonepile.open();
      return;
    }

    var existing = document.querySelector('script[data-smtinel-bonepile-menu-loader]');
    if (existing) {
      existing.addEventListener('load', function () {
        if (window.SMTinelBonepile) window.SMTinelBonepile.open();
      }, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.src = LOADER_URL;
    script.async = false;
    script.setAttribute('data-smtinel-bonepile-menu-loader', 'true');
    script.onload = function () {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (window.SMTinelBonepile && typeof window.SMTinelBonepile.open === 'function') {
          clearInterval(timer);
          window.SMTinelBonepile.open();
        } else if (tries > 40) {
          clearInterval(timer);
          try { console.error('[SMTinel Bonepile] Module loaded but API was not available.'); } catch (_) {}
        }
      }, 100);
    };
    script.onerror = function () {
      try { console.error('[SMTinel Bonepile] Failed to load', LOADER_URL); } catch (_) {}
    };
    document.head.appendChild(script);
  }

  function iconHtml() {
    return '<span aria-hidden="true" style="display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;font-size:17px;line-height:1">⌖</span>';
  }

  function makeButton(template) {
    var button = template ? template.cloneNode(true) : document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.removeAttribute('data-module');
    button.removeAttribute('data-action');
    button.removeAttribute('onclick');
    button.setAttribute('aria-label', 'Open Bonepile Visual Tracker');

    if (template) {
      var textNode = null;
      var walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (String(walker.currentNode.nodeValue || '').trim()) {
          textNode = walker.currentNode;
          break;
        }
      }
      if (textNode) textNode.nodeValue = ' Bonepile Visual Tracker';
      else button.innerHTML = iconHtml() + '<span>Bonepile Visual Tracker</span>';
    } else {
      button.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;min-height:50px;border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:0 16px;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.04));color:#fff;font:800 13px Inter,Arial,sans-serif;cursor:pointer;text-align:left';
      button.innerHTML = iconHtml() + '<span>Bonepile Visual Tracker</span>';
    }

    button.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      loadBonepileAndOpen();
    };
    return button;
  }

  function textOf(el) {
    return String(el && el.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function findMoreModulesContainer() {
    var nodes = document.querySelectorAll('h1,h2,h3,h4,h5,div,span');
    for (var i = 0; i < nodes.length; i += 1) {
      var t = textOf(nodes[i]);
      if (t === 'MORE MODULES' || t.indexOf('MORE MODULES') === 0) {
        var root = nodes[i].parentElement;
        for (var depth = 0; root && depth < 5; depth += 1, root = root.parentElement) {
          var buttons = root.querySelectorAll('button');
          if (buttons.length >= 3) return { root: root, buttons: buttons };
        }
      }
    }
    return null;
  }

  function inject() {
    if (document.getElementById(BUTTON_ID)) return true;
    var found = findMoreModulesContainer();
    if (!found) return false;

    var template = found.buttons && found.buttons.length ? found.buttons[found.buttons.length - 1] : null;
    var button = makeButton(template);

    var target = template && template.parentElement ? template.parentElement : found.root;
    target.appendChild(button);
    return true;
  }

  function init() {
    inject();
    var observer = new MutationObserver(function () { inject(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(inject, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window, document);
