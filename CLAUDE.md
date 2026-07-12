# Extension Chrome/Edge : ColleurMailSF

## Dossier
`C:\Users\Benjamin.MAGNIER\Desktop\ColleurMailSF\` — aussi un repo git : https://github.com/Benjamin-Mag/ColleurMailSF

## Fichiers clés
- `popup.js` — toute la logique (panneau flottant SF + copier infos + coller mail dans Quill)
- `popup.html` — interface popup + `<script src="popup.js" type="module">` (utilisée seulement hors pages SF, fallback debug)
- `manifest.json` — MV3, permission `activeTab` + `scripting`
- ⚠️ Plus de `content.js` ni `background.js` (supprimés juillet 2026 — code mort/dupliqué qui causait des conflits d'ID avec le panneau. `content_scripts` retiré du manifest.)

## Architecture popup.js
1. Constantes `LOGO_URL` et `FOOTER_HTML`
2. `async function run()` / `copyInfosSF()` — fallback pour le popup hors page SF (rarement utilisé)
3. `async function injecterBoutonSF(tab)` — injecte/retire le **panneau flottant** `#sf-mail-panel` sur la page SF (toggle au clic sur l'icône de l'extension)
4. `document.addEventListener('DOMContentLoaded', ...)` — init : si onglet SF → toggle panneau + `window.close()`, sinon affiche le popup fallback

## Contrainte critique — contexte isolé
Les fonctions injectées via `chrome.scripting.executeScript` s'exécutent dans le contexte
de la PAGE, pas du popup. Toute fonction utilisée à l'intérieur doit être auto-contenue
ou passée via `args`.

## Panneau flottant sur page SF (depuis juillet 2026)
Remplace les anciens boutons ronds à position fixe `calc(50%+Npx)` (cassaient selon la résolution d'écran).
- `#sf-mail-panel` : mini fenêtre déplaçable (glisser par la barre de titre), avec bouton réduire (`#sf-panel-min`) et fermer (`#sf-panel-close`)
- Contient les boutons `#sf-copier-btn` (📋) et `#sf-coller-btn` (📨) + une zone de statut `#sf-panel-status`
- Position et état réduit/agrandi persistés dans `localStorage` (clé `sfMailPanelState_v1`), bornés à la fenêtre visible (`clamp()`)
- Écouteurs globaux `mousemove`/`mouseup`/`resize` posés une seule fois (`window.__sfMailPanelListenersAttached`), l'état de drag vit dans `window.__sfMailPanelDrag` — évite d'empiler des listeners à chaque toggle du panneau
- z-index max (`2147483647`) → toujours devant le contenu de la page SF, mais pas devant d'autres fenêtres Windows (limite du sandbox navigateur)

## Shadow DOM Salesforce
Utiliser `chrome.dom.openOrClosedShadowRoot` pour traverser le Shadow DOM de SF Lightning.

## Installation / rechargement
Edge > Extensions > Mode développeur > Charger l'extension décompressée > pointer sur ce dossier.
Après chaque modif de popup.js : recharger l'extension dans Edge (et re-zipper si besoin de republier).
