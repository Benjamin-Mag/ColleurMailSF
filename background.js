// Injecter le bouton flottant sur les pages Opportunity SF
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !/\/lightning\/r\/Opportunity\//i.test(tab.url)) return;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function() {
      if (document.getElementById('sf-copier-btn')) return;

      function getSR(el) { try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) { return el.shadowRoot; } }
      function dqAll(sel, root) {
        root = root || document;
        var res = Array.from(root.querySelectorAll(sel));
        root.querySelectorAll('*').forEach(function(e) { var sr=getSR(e); if(sr) res=res.concat(dqAll(sel,sr)); });
        return res;
      }
      function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

      function showToast(msg, ok) {
        var t = document.getElementById('sf-copier-toast');
        if (!t) return;
        t.textContent = msg;
        t.style.background = ok ? '#1B4F9B' : '#c0392b';
        t.style.opacity = '1';
        clearTimeout(t._h);
        t._h = setTimeout(function() { t.style.opacity = '0'; }, 3000);
      }

      async function copierInfos() {
        var btn = document.getElementById('sf-copier-btn');
        if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
        try {
          var all = dqAll('lightning-formatted-text[slot="primaryField"]');
          var patEl = null;
          for (var i = all.length-1; i >= 0; i--) { var rb=all[i].getBoundingClientRect(); if(rb.width>0||rb.height>0){patEl=all[i];break;} }
          if (!patEl && all.length) patEl = all[all.length-1];
          var patFull = patEl ? (patEl.innerText||patEl.textContent||'').trim() : '';
          var pm = patFull.match(/^(.*?)\s+\d{5}/);
          var patient = pm ? pm[1].trim() : patFull;

          var links = dqAll('a[href*="/lightning/r/Account/"]');
          var partLink = null;
          for (var j = links.length-1; j >= 0; j--) { var rl=links[j].getBoundingClientRect(); if(rl.width>0||rl.height>0){partLink=links[j];break;} }
          if (!partLink && links.length) partLink = links[0];
          var partenaire = partLink ? (partLink.innerText||partLink.textContent||'').trim() : '';

          var adresse = '';
          if (partLink) {
            var rect = partLink.getBoundingClientRect();
            var cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
            var opts = {bubbles:true,composed:true,clientX:cx,clientY:cy};
            partLink.dispatchEvent(new PointerEvent('pointerover',opts));
            partLink.dispatchEvent(new MouseEvent('mouseover',opts));
            partLink.dispatchEvent(new MouseEvent('mouseenter',opts));
            var panelText = null;
            for (var a=0; a<8; a++) {
              await sleep(250);
              var panel = document.querySelector('.forceHoverPanel[aria-hidden="false"]')||document.querySelector('[class*="forceHoverPanel"]:not([aria-hidden="true"])');
              if (panel) { panelText=(panel.innerText||panel.textContent||'').trim(); break; }
            }
            partLink.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,composed:true}));
            partLink.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true,composed:true}));
            if (panelText) {
              var lines = panelText.split('\n').map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
              var expIdx = lines.findIndex(function(l){return /exp[eé]dition|shipping/i.test(l);});
              if (expIdx>=0) {
                var al=[]; for(var k=expIdx+1;k<lines.length&&al.length<3;k++){if(/\d{5}/.test(lines[k])||(al.length>0&&lines[k].length>2)){al.push(lines[k]);if(/\d{5}/.test(lines[k]))break;}else if(al.length===0){al.push(lines[k]);}else break;}
                adresse=al.join(',\n');
              }
              if (!adresse) {
                var cpIdx=lines.findIndex(function(l){return /\d{5}/.test(l);});
                if(cpIdx>=0){var parts=[];if(cpIdx>0&&lines[cpIdx-1].length>2)parts.push(lines[cpIdx-1]);parts.push(lines[cpIdx]);adresse=parts.join(',\n');}
              }
            }
          }
          await navigator.clipboard.writeText(JSON.stringify({patient:patient,partenaire:partenaire,adresse:adresse}));
          showToast('✓ '+[patient,partenaire].filter(Boolean).join(' / '), true);
        } catch(e) { showToast('Erreur : '+e.message, false); }
        finally { if(btn){btn.textContent='📋';btn.disabled=false;} }
      }

      var btn = document.createElement('button');
      btn.id = 'sf-copier-btn';
      btn.textContent = '📋';
      btn.title = 'Copier infos SF';
      btn.style.cssText = 'position:fixed;top:80px;right:12px;z-index:2147483647;width:44px;height:44px;border-radius:50%;border:none;background:#1B4F9B;color:white;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(27,79,155,.45);transition:transform .15s;';
      btn.onmouseenter = function(){btn.style.transform='scale(1.12)';};
      btn.onmouseleave = function(){btn.style.transform='scale(1)';};
      btn.onclick = copierInfos;
      document.body.appendChild(btn);

      var toast = document.createElement('div');
      toast.id = 'sf-copier-toast';
      toast.style.cssText = 'position:fixed;top:130px;right:12px;z-index:2147483647;padding:8px 14px;border-radius:8px;color:white;font-size:13px;font-family:sans-serif;max-width:260px;opacity:0;transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(toast);

      console.log('[SF-BTN] Bouton injecté');
    }
  });
});

chrome.action.onClicked.addListener(async function(tab) {
  try {
    var [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() { return navigator.clipboard.readText(); }
    });

    var text = await navigator.clipboard.readText().catch(function() { return null; });
    if (!text) {
      // Lire depuis l'onglet actif
      var [r] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async function() { return await navigator.clipboard.readText(); }
      });
      text = r && r.result;
    }

    if (!text) return;

    var lines = text.split('\n');
    var subject = lines[0];
    var body = lines.slice(1).join('\n').replace(/^\n/, '');

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: async function(subject, body) {
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
            if (sr) { var f = deepQuery(selector, sr); if (f) return f; }
          }
          return null;
        }
        function deepQueryAll(selector, root) {
          root = root || document;
          var res = Array.from(root.querySelectorAll(selector));
          var all = root.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            var sr = getShadowRoot(all[i]);
            if (sr) res = res.concat(deepQueryAll(selector, sr));
          }
          return res;
        }
        function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
        var nativeSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;

        var ed = deepQuery('.ql-editor');
        if (!ed) return;

        var si = deepQuery('input[placeholder="L\'objet"]');
        if (si) {
          si.focus();
          si.value = subject;
          si.dispatchEvent(new Event('input', { bubbles: true }));
          si.dispatchEvent(new Event('change', { bubbles: true }));
        }

        var logoHtml = '<p><img src="https://benjamin-mag.github.io/generateur-mails/logo.png" alt="audibene Logo 2020" width="191" height="86"></p>';
        var normalizedBody = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var wrap = '<span style="font-family:Arial,Helvetica,sans-serif;"><span style="font-size:14px;">';
        var endWrap = '</span></span>';
        var bodyHtml = normalizedBody.split('\n').map(function(line) {
          return '<p>' + wrap + (line || ' ') + endWrap + '</p>';
        }).join('');
        var footerHtml =
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
        var newContent = logoHtml + bodyHtml + footerHtml;

        ed.focus();
        nativeSet.call(ed, newContent);

        var attempts = 0;
        var observer = new MutationObserver(function() {
          if (attempts < 8) {
            attempts++;
            observer.disconnect();
            nativeSet.call(ed, newContent);
            setTimeout(function() {
              observer.observe(ed, { childList: true, subtree: true, characterData: true });
            }, 100);
          } else {
            observer.disconnect();
          }
        });
        observer.observe(ed, { childList: true, subtree: true, characterData: true });
      },
      args: [subject, body]
    });
  } catch(e) {
    console.error('ColleurMailSF:', e.message);
  }
});
