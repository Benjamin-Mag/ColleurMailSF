# Extension Chrome/Edge : ColleurMailSF

## Dossier
`C:\Users\Benjamin.MAGNIER\Documents\Claude\Projects\ColleurMailSF\` (déplacé depuis Desktop le 2026-08-18) — repo git : https://github.com/Benjamin-Mag/ColleurMailSF

## Fichiers clés
- `popup.js` — toute la logique (panneau flottant SF + coller mail dans Quill)
- `popup.html` — interface popup + `<script src="popup.js" type="module">` (utilisée seulement hors pages SF, fallback debug quasi jamais utilisé)
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

## Panneau flottant sur page SF — un seul bouton (depuis 2026-08-18)
Le bandeau bleu `#sf-coller-btn` EST le bouton "📨 Coller le mail" — pas de titre séparé, pas de bouton réduire. Clic dessus (sans avoir glissé >4px) déclenche `collerMail` ; glisser déplace le panneau. Seule la croix `#sf-panel-close` reste à droite du bandeau pour fermer.
Le bouton "📋 Copier les infos client" (`#sf-copier-btn`, fonction `copierInfos`) a été **retiré** : redondant depuis que ColleurDoctolib (`..\Colleur Doco\`) copie un JSON compatible (`patient`/`partenaire`/`adresse`) qui alimente aussi l'app générateur de mails. Ne pas le réintroduire sans vérifier d'abord si c'est vraiment nécessaire.
- Position persistée dans `localStorage` (clé `sfMailPanelState_v1`), bornée à la fenêtre visible (`clamp()`)
- Écouteurs `mousemove`/`mouseup`/`resize`/`click` stockés dans `window.__sfMailPanelHandlers`, **détachés puis réattachés à chaque injection** (pas de garde "une seule fois" — recharger juste l'extension ne réinitialise pas le `window` de l'onglet SF déjà ouvert, une garde figerait l'ancien code)
- z-index max (`2147483647`) → toujours devant le contenu de la page SF, mais pas devant d'autres fenêtres Windows (limite du sandbox navigateur)

## Shadow DOM Salesforce
Utiliser `chrome.dom.openOrClosedShadowRoot` pour traverser le Shadow DOM de SF Lightning.

## Installation / rechargement
Edge/Chrome > Extensions > Mode développeur > Charger l'extension décompressée > pointer sur ce dossier (`Documents\Claude\Projects\ColleurMailSF`).
Après chaque modif de popup.js : recharger l'extension (et re-zipper via le repo générateur de mails si besoin de republier, voir sa mémoire `project_extension`).
