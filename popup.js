// ============================================================
// CONSTANTES
// ============================================================
var LOGO_URL = 'https://betterhearing.file.force.com/file-asset-public/audibene_Logo_2020?oid=00D24000000KHXk';

function textToHtml(text) {
  var wrap = '<span style="font-family:Arial,Helvetica,sans-serif;"><span style="font-size:14px;">';
  var endWrap = '</span></span>';
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      html += '<p style="margin:0.8em 0"><br></p>';
    } else {
      html += '<p style="margin:0">' + wrap + lines[i] + endWrap + '</p>';
    }
  }
  return html;
}

var FOOTER_HTML =
  '<p>_________________________________________________</p>' +
  '<p><br></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;"><strong>audibene — pour bien entendre</strong></span></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">Tour la Marseillaise</span></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">2bis Bd Euromediterranée Quai d\'Arenc, 13002 Marseille</span></p>' +
  '<p><br></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">audibene GmbH</span></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">820 709 046 R.C.S. Marseille</span></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">Siège de la société : Berlin</span></p>' +
  '<p><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">Gérants : Paul Crusius, Dr. Marco Vietor, Marco Wiesmann</span></p>';

// ============================================================
// BOUTON 📨 — Coller le mail dans l'éditeur SF (depuis popup)
// ============================================================
async function run() {
  var status = document.getElementById('status');
  if (status) { status.textContent = 'Collage en cours...'; status.style.color = '#1B4F9B'; }
  try {
    var text = await navigator.clipboard.readText();
    if (!text) { if (status) { status.textContent = 'Presse-papier vide.'; status.style.color = 'red'; } return; }
    var lines = text.split('\n');
    var subject = lines[0];
    var body = lines.slice(1).join('\n').replace(/^\n/, '');
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: function(subject, body, logoUrl, footerHtml) {
        function getSR(el) { try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; } }
        function dq(sel, root) {
          root = root || document;
          var el = root.querySelector(sel); if (el) return el;
          var all = root.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) { var sr = getSR(all[i]); if (sr) { var f = dq(sel, sr); if (f) return f; } }
          return null;
        }
        var ed = dq('.ql-editor');
        if (!ed) return;
        var si = dq('input[placeholder="L\'objet"]');
        if (si) { si.focus(); si.value = subject; si.dispatchEvent(new Event('input', { bubbles: true })); si.dispatchEvent(new Event('change', { bubbles: true })); }
        var wrap = '<span style="font-family:Arial,Helvetica,sans-serif;"><span style="font-size:14px;">';
        var endWrap = '</span></span>';
        var bodyHtml = (function(t){var ls=t.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n'),html='';for(var i=0;i<ls.length;i++){if(ls[i].trim()===''){html+='<p style="margin:0.8em 0"><br></p>';}else{html+='<p style="margin:0">'+wrap+ls[i]+endWrap+'</p>';}}return html;})(body);
        var logoHtml = '<p><img src="' + logoUrl + '" alt="audibene" width="191" height="86"></p><p><br></p>';
        var nativeSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
        ed.focus();
        nativeSet.call(ed, logoHtml + bodyHtml + footerHtml);
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      },
      args: [subject, body, LOGO_URL, FOOTER_HTML]
    });
    if (status) { status.textContent = 'Mail collé !'; status.style.color = 'green'; }
  } catch(e) {
    if (status) { status.textContent = 'Erreur : ' + e.message; status.style.color = 'red'; }
  }
}

// ============================================================
// BOUTON 📋 — Copier infos SF + ouvrir panneau email (depuis popup)
// ============================================================
async function copyInfosSF() {
  var status = document.getElementById('status');
  if (status) { status.textContent = 'Copie en cours...'; status.style.color = '#1B4F9B'; }
  try {
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    var results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        function getSR(el) { try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; } }
        function dqAll(sel, root) {
          root = root || document;
          var res = Array.from(root.querySelectorAll(sel));
          root.querySelectorAll('*').forEach(function(e) { var sr = getSR(e); if (sr) res = res.concat(dqAll(sel, sr)); });
          return res;
        }
        function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
        return (async function() {
          var all = dqAll('lightning-formatted-text[slot="primaryField"]');
          var patEl = null;
          for (var i = all.length - 1; i >= 0; i--) { var rb = all[i].getBoundingClientRect(); if (rb.width > 0 || rb.height > 0) { patEl = all[i]; break; } }
          if (!patEl && all.length) patEl = all[all.length - 1];
          var patFull = patEl ? (patEl.innerText || patEl.textContent || '').trim() : '';
          var pm = patFull.match(/^(.*?)\s+\d{5}/);
          var patient = pm ? pm[1].trim() : patFull;
          var links = dqAll('a[href*="/lightning/r/Account/"]');
          var partLink = null;
          for (var j = links.length - 1; j >= 0; j--) { var rl = links[j].getBoundingClientRect(); if (rl.width > 0 || rl.height > 0) { partLink = links[j]; break; } }
          if (!partLink && links.length) partLink = links[0];
          var partenaire = partLink ? (partLink.innerText || partLink.textContent || '').trim() : '';
          var adresse = '';
          if (partLink) {
            var rect = partLink.getBoundingClientRect();
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            var opts = { bubbles: true, composed: true, clientX: cx, clientY: cy };
            partLink.dispatchEvent(new PointerEvent('pointerover', opts));
            partLink.dispatchEvent(new MouseEvent('mouseover', opts));
            partLink.dispatchEvent(new MouseEvent('mouseenter', opts));
            var panelText = null;
            for (var a = 0; a < 8; a++) {
              await sleep(250);
              var panel = document.querySelector('.forceHoverPanel[aria-hidden="false"]') || document.querySelector('[class*="forceHoverPanel"]:not([aria-hidden="true"])');
              if (panel) { panelText = (panel.innerText || panel.textContent || '').trim(); break; }
            }
            partLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, composed: true }));
            partLink.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
            if (panelText) {
              var plines = panelText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
              var expIdx = plines.findIndex(function(l) { return /exp[eé]dition|shipping/i.test(l); });
              if (expIdx >= 0) {
                var al = [];
                for (var k = expIdx + 1; k < plines.length && al.length < 3; k++) {
                  if (/\d{5}/.test(plines[k]) || (al.length > 0 && plines[k].length > 2)) { al.push(plines[k]); if (/\d{5}/.test(plines[k])) break; }
                  else if (al.length === 0) { al.push(plines[k]); }
                  else break;
                }
                adresse = al.join(',\n');
              }
              if (!adresse) {
                var cpIdx = plines.findIndex(function(l) { return /\d{5}/.test(l); });
                if (cpIdx >= 0) { var pts = []; if (cpIdx > 0 && plines[cpIdx - 1].length > 2) pts.push(plines[cpIdx - 1]); pts.push(plines[cpIdx]); adresse = pts.join(',\n'); }
              }
            }
          }
          await navigator.clipboard.writeText(JSON.stringify({ patient: patient, partenaire: partenaire, adresse: adresse }));
          await sleep(300);
          var icons = dqAll('lightning-icon[data-tab-value]');
          for (var ei = 0; ei < icons.length; ei++) {
            var icon = icons[ei];
            if (icon.getAttribute('icon-name') !== 'utility:email') continue;
            var r = icon.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              (icon.closest('button,a,[role="button"]') || icon.parentElement || icon).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
              break;
            }
          }
          return { patient: patient, partenaire: partenaire, adresse: adresse };
        })();
      }
    });
    var data = results && results[0] && results[0].result;
    if (data && status) { status.textContent = '' + [data.patient, data.partenaire].filter(Boolean).join(' / '); status.style.color = 'green'; }
  } catch(e) {
    if (status) { status.textContent = 'Erreur : ' + e.message; status.style.color = 'red'; }
  }
}

// ============================================================
// INJECTION DES BOUTONS FLOTTANTS DANS LA PAGE SF
// ============================================================
async function injecterBoutonSF(tab) {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function(logoUrl, footerHtml) {
      var existing1 = document.getElementById('sf-copier-btn');
      var existing2 = document.getElementById('sf-coller-btn');
      var existingToast = document.getElementById('sf-copier-toast');
      if (existing1 || existing2) {
        if (existing1) existing1.remove();
        if (existing2) existing2.remove();
        if (existingToast) existingToast.remove();
        return 'removed';
      }

      function getSR(el) { try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; } }
      function dqAll(sel, root) {
        root = root || document;
        var res = Array.from(root.querySelectorAll(sel));
        root.querySelectorAll('*').forEach(function(e) { var sr = getSR(e); if (sr) res = res.concat(dqAll(sel, sr)); });
        return res;
      }
      function dq(sel, root) {
        root = root || document;
        var el = root.querySelector(sel); if (el) return el;
        var all = root.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) { var sr = getSR(all[i]); if (sr) { var f = dq(sel, sr); if (f) return f; } }
        return null;
      }
      function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
      function showToast(msg, ok) {
        var t = document.getElementById('sf-copier-toast'); if (!t) return;
        t.textContent = msg; t.style.background = ok ? '#1B4F9B' : '#c0392b'; t.style.opacity = '1';
        clearTimeout(t._h); t._h = setTimeout(function() { t.style.opacity = '0'; }, 3000);
      }

      async function copierInfos() {
        var btn = document.getElementById('sf-copier-btn');
        if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
        try {
          var all = dqAll('lightning-formatted-text[slot="primaryField"]');
          var patEl = null;
          for (var i = all.length - 1; i >= 0; i--) { var rb = all[i].getBoundingClientRect(); if (rb.width > 0 || rb.height > 0) { patEl = all[i]; break; } }
          if (!patEl && all.length) patEl = all[all.length - 1];
          var patFull = patEl ? (patEl.innerText || patEl.textContent || '').trim() : '';
          var pm = patFull.match(/^(.*?)\s+\d{5}/);
          var patient = pm ? pm[1].trim() : patFull;
          var links = dqAll('a[href*="/lightning/r/Account/"]');
          var partLink = null;
          for (var j = links.length - 1; j >= 0; j--) { var rl = links[j].getBoundingClientRect(); if (rl.width > 0 || rl.height > 0) { partLink = links[j]; break; } }
          if (!partLink && links.length) partLink = links[0];
          var partenaire = partLink ? (partLink.innerText || partLink.textContent || '').trim() : '';
          var adresse = '';
          if (partLink) {
            var rect = partLink.getBoundingClientRect();
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            var opts = { bubbles: true, composed: true, clientX: cx, clientY: cy };
            partLink.dispatchEvent(new PointerEvent('pointerover', opts));
            partLink.dispatchEvent(new MouseEvent('mouseover', opts));
            partLink.dispatchEvent(new MouseEvent('mouseenter', opts));
            var panelText = null;
            for (var a = 0; a < 8; a++) {
              await sleep(250);
              var panel = document.querySelector('.forceHoverPanel[aria-hidden="false"]') || document.querySelector('[class*="forceHoverPanel"]:not([aria-hidden="true"])');
              if (panel) { panelText = (panel.innerText || panel.textContent || '').trim(); break; }
            }
            partLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, composed: true }));
            partLink.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
            if (panelText) {
              var plines = panelText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
              var expIdx = plines.findIndex(function(l) { return /exp[eé]dition|shipping/i.test(l); });
              if (expIdx >= 0) {
                var al = [];
                for (var k = expIdx + 1; k < plines.length && al.length < 3; k++) {
                  if (/\d{5}/.test(plines[k]) || (al.length > 0 && plines[k].length > 2)) { al.push(plines[k]); if (/\d{5}/.test(plines[k])) break; }
                  else if (al.length === 0) { al.push(plines[k]); }
                  else break;
                }
                adresse = al.join(',\n');
              }
              if (!adresse) {
                var cpIdx = plines.findIndex(function(l) { return /\d{5}/.test(l); });
                if (cpIdx >= 0) { var pts = []; if (cpIdx > 0 && plines[cpIdx - 1].length > 2) pts.push(plines[cpIdx - 1]); pts.push(plines[cpIdx]); adresse = pts.join(',\n'); }
              }
            }
          }
          await navigator.clipboard.writeText(JSON.stringify({ patient: patient, partenaire: partenaire, adresse: adresse }));
          showToast('' + [patient, partenaire].filter(Boolean).join(' / '), true);
          await sleep(300);
          var icons = dqAll('lightning-icon[data-tab-value]');
          for (var ei = 0; ei < icons.length; ei++) {
            var icon = icons[ei];
            if (icon.getAttribute('icon-name') !== 'utility:email') continue;
            var r = icon.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              (icon.closest('button,a,[role="button"]') || icon.parentElement || icon).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
              break;
            }
          }
        } catch(e) { showToast('Erreur : ' + e.message, false); }
        finally { if (btn) { btn.textContent = '📋'; btn.disabled = false; } }
      }

      async function collerMail() {
        var btn2 = document.getElementById('sf-coller-btn');
        if (btn2) { btn2.textContent = '⏳'; btn2.disabled = true; }
        try {
          var text = await navigator.clipboard.readText();
          if (!text) { showToast('Presse-papier vide', false); return; }
          var ls = text.split('\n'), subject = ls[0], body = ls.slice(1).join('\n').replace(/^\n/, '');
          var ed = dq('.ql-editor');
          if (!ed) { showToast('Éditeur non trouvé', false); return; }
          var si = dq('input[placeholder="L\'objet"]');
          if (si) { si.focus(); si.value = subject; si.dispatchEvent(new Event('input', { bubbles: true })); si.dispatchEvent(new Event('change', { bubbles: true })); }
          var wrap = '<span style="font-family:Arial,Helvetica,sans-serif;"><span style="font-size:14px;">';
          var endWrap = '</span></span>';
          var bodyHtml = (function(t){var ls=t.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n'),html='';for(var i=0;i<ls.length;i++){if(ls[i].trim()===''){html+='<p style="margin:0.8em 0"><br></p>';}else{html+='<p style="margin:0">'+wrap+ls[i]+endWrap+'</p>';}}return html;})(body);
          var logoHtml = '<p><img src="' + logoUrl + '" alt="audibene" width="191" height="86"></p><p><br></p>';
          var nativeSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
          ed.focus();
          nativeSet.call(ed, logoHtml + bodyHtml + footerHtml);
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('Mail collé !', true);
        } catch(e) { showToast('Erreur : ' + e.message, false); }
        finally { if (btn2) { btn2.textContent = '📨'; btn2.disabled = false; } }
      }

      var btnStyle = 'position:fixed;top:10px;z-index:2147483647;width:33px;height:33px;border-radius:50%;border:none;background:#1B4F9B;color:white;font-size:17px;cursor:pointer;box-shadow:0 2px 8px rgba(27,79,155,.45);';
      var btn1 = document.createElement('button');
      btn1.id = 'sf-copier-btn'; btn1.textContent = '📋'; btn1.title = 'Copier infos SF + ouvrir email';
      btn1.style.cssText = btnStyle + 'left:calc(50% + 140px);';
      btn1.onclick = copierInfos;
      document.body.appendChild(btn1);

      var btn2 = document.createElement('button');
      btn2.id = 'sf-coller-btn'; btn2.textContent = '📨'; btn2.title = 'Coller le mail dans SF';
      btn2.style.cssText = btnStyle + 'left:calc(50% + 180px);';
      btn2.onclick = collerMail;
      document.body.appendChild(btn2);

      var toast = document.createElement('div');
      toast.id = 'sf-copier-toast';
      toast.style.cssText = 'position:fixed;top:50px;left:calc(50% + 140px);z-index:2147483647;padding:8px 14px;border-radius:8px;color:white;font-size:13px;font-family:sans-serif;max-width:260px;opacity:0;transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(toast);
      return 'injected';
    },
    args: [LOGO_URL, FOOTER_HTML]
  });
}

// ============================================================
// DÉMARRAGE
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url && /force\.com|salesforce\.com/i.test(tab.url)) {
    await injecterBoutonSF(tab);
    window.close();
    return;
  }

  document.getElementById('pasteBtn').addEventListener('click', function() { setTimeout(run, 50); });
  document.getElementById('copyInfosBtn').addEventListener('click', copyInfosSF);

  document.getElementById('debugBtn').addEventListener('click', async function() {
    var out = document.getElementById('debugOut');
    out.textContent = 'Recherche...';
    try {
      var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      var results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: function() {
          function getSR(el) { try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; } }
          function dqAll(sel, root) {
            root = root || document;
            var res = Array.from(root.querySelectorAll(sel));
            root.querySelectorAll('*').forEach(function(el) { var sr = getSR(el); if (sr) res = res.concat(dqAll(sel, sr)); });
            return res;
          }
          var all = dqAll('lightning-formatted-text');
          var iframes = Array.from(document.querySelectorAll('iframe')).map(function(f) { return f.src || f.name || 'iframe'; });
          return { url: location.href, iframes: iframes, items: all.map(function(e) { return (e.getAttribute('slot') || 'no-slot') + ' | ' + e.textContent.trim().substring(0, 80); }) };
        }
      });
      var lines = [];
      results.forEach(function(r) {
        if (!r.result) return;
        lines.push('FRAME: ' + r.result.url.substring(0, 60));
        r.result.iframes.forEach(function(s) { lines.push('  iframe: ' + s.substring(0, 60)); });
        r.result.items.forEach(function(s) { lines.push('  ' + s); });
      });
      out.innerHTML = (lines.length ? lines : ['Rien trouvé.']).map(function(s) {
        return '<div style="border-bottom:1px solid #eee;padding:2px 0">' + s + '</div>';
      }).join('');
    } catch(e) { out.textContent = 'Erreur : ' + e.message; }
  });
});