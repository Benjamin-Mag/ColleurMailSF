console.log('[SF-BTN] content.js chargé dans :', location.href);

function getShadowRoot(el) {
  try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; }
}

function deepQuery(selector, root) {
  root = root || document;
  var el = root.querySelector(selector);
  if (el) return el;
  var all = root.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var sr = getShadowRoot(all[i]);
    if (sr) {
      var found = deepQuery(selector, sr);
      if (found) return found;
    }
  }
  return null;
}

function deepQueryAll(selector, root) {
  root = root || document;
  var results = Array.from(root.querySelectorAll(selector));
  var all = root.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var sr = getShadowRoot(all[i]);
    if (sr) results = results.concat(deepQueryAll(selector, sr));
  }
  return results;
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

/* ========== Bouton flottant Opportunité ========== */
(function() {
  var BTN_ID = 'sf-copier-btn';
  var TOAST_ID = 'sf-copier-toast';

  function isOpportunityPage() {
    return /\/lightning\/r\/Opportunity\//i.test(location.href);
  }

  function showToast(msg, ok) {
    var t = document.getElementById(TOAST_ID);
    if (!t) return;
    t.textContent = msg;
    t.style.background = ok ? '#1B4F9B' : '#c0392b';
    t.style.opacity = '1';
    clearTimeout(t._hide);
    t._hide = setTimeout(function() { t.style.opacity = '0'; }, 3000);
  }

  async function copierInfos() {
    var btn = document.getElementById(BTN_ID);
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
    try {
      // Patient
      var all = deepQueryAll('lightning-formatted-text[slot="primaryField"]');
      var patEl = null;
      for (var i = all.length - 1; i >= 0; i--) {
        var r = all[i].getBoundingClientRect();
        if (r.width > 0 || r.height > 0) { patEl = all[i]; break; }
      }
      if (!patEl && all.length) patEl = all[all.length - 1];
      var patFull = patEl ? (patEl.innerText || patEl.textContent || '').trim() : '';
      var pm = patFull.match(/^(.*?)\s+\d{5}/);
      var patient = pm ? pm[1].trim() : patFull;

      // Partenaire
      var links = deepQueryAll('a[href*="/lightning/r/Account/"]');
      var partLink = null;
      for (var j = links.length - 1; j >= 0; j--) {
        var rr = links[j].getBoundingClientRect();
        if (rr.width > 0 || rr.height > 0) { partLink = links[j]; break; }
      }
      if (!partLink && links.length) partLink = links[0];
      var partenaire = partLink ? (partLink.innerText || partLink.textContent || '').trim() : '';

      // Hover pour adresse
      var adresse = '';
      if (partLink) {
        var rect = partLink.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var opts = { bubbles: true, composed: true, clientX: cx, clientY: cy };
        partLink.dispatchEvent(new PointerEvent('pointerover', opts));
        partLink.dispatchEvent(new MouseEvent('mouseover', opts));
        partLink.dispatchEvent(new MouseEvent('mouseenter', opts));

        // Attendre le panel hover
        var panelText = null;
        for (var attempt = 0; attempt < 8; attempt++) {
          await sleep(250);
          var panel = document.querySelector('.forceHoverPanel[aria-hidden="false"]')
                   || document.querySelector('[class*="forceHoverPanel"]:not([aria-hidden="true"])');
          if (panel) { panelText = (panel.innerText || panel.textContent || '').trim(); break; }
        }

        // Fermer le hover
        partLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, composed: true }));
        partLink.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));

        if (panelText) {
          var lines = panelText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
          var expIdx = lines.findIndex(function(l) { return /exp[eé]dition|shipping/i.test(l); });
          if (expIdx >= 0) {
            var addrLines = [];
            for (var k = expIdx + 1; k < lines.length && addrLines.length < 3; k++) {
              if (/\d{5}/.test(lines[k]) || (addrLines.length > 0 && lines[k].length > 2)) {
                addrLines.push(lines[k]);
                if (/\d{5}/.test(lines[k])) break;
              } else if (addrLines.length === 0) { addrLines.push(lines[k]); }
              else break;
            }
            adresse = addrLines.join(',\n');
          }
          if (!adresse) {
            var cpIdx = lines.findIndex(function(l) { return /\d{5}/.test(l); });
            if (cpIdx >= 0) {
              var parts = [];
              if (cpIdx > 0 && lines[cpIdx-1].length > 2) parts.push(lines[cpIdx-1]);
              parts.push(lines[cpIdx]);
              adresse = parts.join(',\n');
            }
          }
        }
      }

      await navigator.clipboard.writeText(JSON.stringify({ patient: patient, partenaire: partenaire, adresse: adresse }));
      showToast('✓ ' + [patient, partenaire].filter(Boolean).join(' / '), true);
    } catch(e) {
      showToast('Erreur : ' + e.message, false);
    } finally {
      if (btn) { btn.textContent = '📋'; btn.disabled = false; }
    }
  }

  function injectButton() {
    if (document.getElementById(BTN_ID)) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '📋';
    btn.title = 'Copier infos SF';
    btn.style.cssText = [
      'display:inline-flex','align-items:center','justify-content:center',
      'width:32px','height:32px','border-radius:50%','border:none',
      'background:#1B4F9B','color:white','font-size:16px',
      'cursor:pointer','box-shadow:0 2px 8px rgba(27,79,155,.45)',
      'margin-left:8px','flex-shrink:0','vertical-align:middle',
      'transition:transform .15s','z-index:2147483647'
    ].join(';');
    btn.addEventListener('mouseenter', function() { btn.style.transform = 'scale(1.15)'; });
    btn.addEventListener('mouseleave', function() { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', copierInfos);

    var toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.cssText = [
      'position:fixed','top:56px','right:12px','z-index:2147483647',
      'padding:8px 14px','border-radius:8px','color:white','font-size:13px',
      'font-family:sans-serif','max-width:260px','opacity:0',
      'transition:opacity .3s','pointer-events:none'
    ].join(';');
    document.body.appendChild(toast);

    // Essaie d'insérer le bouton à droite de la barre de recherche SF
    var searchSel = [
      'one-app-nav-bar-item-root[data-id="Search"]',
      '.slds-global-search',
      'one-global-search',
      'input[title*="echerch"]',
      'input[placeholder*="echerch"]',
      '.navContainer .searchContainer',
    ];
    var anchor = null;
    for (var s = 0; s < searchSel.length; s++) {
      anchor = document.querySelector(searchSel[s]);
      if (anchor) break;
    }
    if (anchor) {
      // Remonte au parent de niveau conteneur si c'est un input
      var target = anchor.closest
        ? (anchor.closest('one-app-nav-bar-item-root') || anchor.closest('li') || anchor.parentElement)
        : anchor.parentElement;
      if (target && target.parentElement) {
        target.parentElement.insertBefore(btn, target.nextSibling);
      } else {
        document.body.appendChild(btn);
      }
    } else {
      // Fallback position fixe
      btn.style.cssText = [
        'position:fixed','top:10px','right:160px','z-index:2147483647',
        'width:32px','height:32px','border-radius:50%','border:none',
        'background:#1B4F9B','color:white','font-size:16px',
        'cursor:pointer','box-shadow:0 2px 8px rgba(27,79,155,.45)',
        'transition:transform .15s'
      ].join(';');
      document.body.appendChild(btn);
    }
  }

  function removeButton() {
    var b = document.getElementById(BTN_ID); if (b) b.remove();
    var t = document.getElementById(TOAST_ID); if (t) t.remove();
  }

  function checkPage() {
    if (isOpportunityPage()) injectButton();
    else removeButton();
  }

  // Ne pas injecter dans les iframes sans URL Opportunity
  if (!isOpportunityPage()) return;

  console.log('[SF-BTN] Opportunity détectée, injection bouton...');

  function tryInject() {
    var target = document.body || document.documentElement;
    if (!target) { setTimeout(tryInject, 300); return; }
    injectButton();
  }

  // Retry toutes les 2s (SF peut supprimer le bouton lors de ses re-renders)
  var lastHref = location.href;
  setInterval(function() {
    var cur = location.href;
    if (cur !== lastHref) { lastHref = cur; if (isOpportunityPage()) setTimeout(tryInject, 1000); else removeButton(); }
    if (isOpportunityPage() && !document.getElementById(BTN_ID)) injectButton();
  }, 2000);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInject);
  else tryInject();
})();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'copy_client') {
    var el = deepQuery('lightning-formatted-text[slot="primaryField"]');
    sendResponse({ value: el ? el.textContent.trim() : null });
    return true;
  }

  if (message.action === 'debug_client') {
    var all = deepQueryAll('lightning-formatted-text');
    var info = all.map(function(e) {
      return (e.getAttribute('slot') || 'no-slot') + ' | ' + e.textContent.trim().substring(0, 60);
    });
    var iframes = Array.from(document.querySelectorAll('iframe')).map(function(f) {
      return 'IFRAME src=' + (f.src || f.name || 'unknown');
    });
    sendResponse({ items: info, iframes: iframes, url: location.href });
    return true;
  }

  if (message.action !== 'paste_email') return;

  var btn = deepQuery('button[name="template"]');
  if (!btn) return; // Pas dans ce frame

  sendResponse({ found: true });

  (async function() {
    btn.removeAttribute('aria-disabled');
    btn.click();
    await sleep(600);

    var items = deepQueryAll('lightning-base-combobox-item');
    if (items.length > 1) items[1].click();
    await sleep(1200);

    var si = deepQuery('input[placeholder="L\'objet"]');
    if (si) {
      si.focus();
      si.value = message.subject;
      si.dispatchEvent(new Event('input', { bubbles: true }));
      si.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var ed = deepQuery('.ql-editor');
    if (ed) {
      var ch = Array.from(ed.children);
      var li = -1;
      ch.forEach(function(el, i) {
        if ((el.querySelector && el.querySelector('img')) || el.tagName === 'IMG') li = i;
      });
      var hh = li >= 0 ? ch.slice(0, li + 1).map(function(el) { return el.outerHTML; }).join('') : '';
      var bh = '<p>' + message.body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      var spacer = li >= 0 ? '<p><br></p><p><br></p>' : '';
      ed.innerHTML = hh + spacer + bh;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      ed.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })();

  return true;
});
