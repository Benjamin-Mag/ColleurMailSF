# ColleurMailSF — extension Chrome/Edge

Colle dans l'éditeur de mail Salesforce Lightning (Quill) le texte généré par l'app **générateur de mails**. Salesforce ne permet pas de personnaliser facilement les modèles de mail — l'app génère le texte, cette extension le colle.

## Utilisation

Sur une page Salesforce, cliquer l'icône de l'extension : un panneau flottant apparaît (`#sf-mail-panel`), déplaçable en le glissant. Le bandeau bleu **est** le bouton — cliquer dessus (sans glisser) colle le contenu du presse-papier (format `sujet\ncorps`, produit par le bouton copier de l'app) dans le mail en cours d'édition. La croix ferme le panneau.

## Fichiers

- `popup.js` — toute la logique
- `popup.html` — popup fallback (hors page Salesforce), rarement utilisé
- `manifest.json` — MV3, permissions `activeTab` + `scripting`

## Installation / mise à jour

`chrome://extensions` (ou `edge://extensions`) → mode développeur → "Charger l'extension décompressée" → pointer sur ce dossier. Après modif de `popup.js`, recharger (↺).

## Projet frère

**ColleurDoctolib** (`..\Colleur Doco\`) — même famille d'extensions (panneau flottant injecté sur Salesforce), mais dans l'autre sens : copie les infos patient plutôt que de coller un mail.
