# Extension Chrome/Edge : ColleurMailSF

## Dossier
`C:\Users\Benjamin.MAGNIER\Desktop\ColleurMailSF\`

## Fichiers clés
- `popup.js` — toute la logique (copier infos SF + coller mail dans Quill)
- `popup.html` — interface popup + `<script src="popup.js" type="module">`
- `manifest.json` — MV3, permission `activeTab` + `scripting`

## Architecture popup.js
Quatre blocs dans cet ordre :
1. Constantes `LOGO_URL` et `FOOTER_HTML`
2. `async function run()` — colle le mail dans SF (bouton 📨)
3. `async function copyInfosSF()` — copie infos patient depuis SF (bouton 📋)
4. `async function injecterBoutonSF(tab)` — injecte les deux boutons flottants sur la page SF
5. `document.addEventListener('DOMContentLoaded', async function(){...})` — init popup

## Contrainte critique — contexte isolé
Les fonctions injectées via `chrome.scripting.executeScript` s'exécutent dans le contexte
de la PAGE, pas du popup. Toute fonction utilisée à l'intérieur doit être auto-contenue
ou passée via `args`. Ne jamais appeler `run()` ou `copyInfosSF()` depuis le code injecté.

## Boutons flottants sur page SF
- Btn1 📋 `copierInfos()` — position `left:calc(50% + 198px), top:10px`
- Btn2 📨 `collerMail()` — position `left:calc(50% + 238px), top:10px`
- `injecterBoutonSF` passe `[LOGO_URL, FOOTER_HTML]` comme `args`

## Shadow DOM Salesforce
Utiliser `chrome.dom.openOrClosedShadowRoot` pour traverser le Shadow DOM de SF Lightning.

## Installation / rechargement
Edge > Extensions > Mode développeur > Charger l'extension décompressée > pointer sur ce dossier.
Après chaque modif de popup.js : recharger l'extension dans Edge.
