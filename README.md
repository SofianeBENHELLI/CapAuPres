# Cap au Près

Application web (PWA) pour apprendre la voile en jouant dans la baie de La Baule avec le CNBPP : théorie, réflexes, matelotage, missions, barre en temps réel, régate en flotte, conditions en temps réel (vent, vagues, marée, webcam).

Code récupéré depuis la version en ligne https://voile.benhelli.org (le dépôt source d'origine avait été perdu). Les outils de build et les tests d'origine n'étaient pas publiés et manquent donc ici.

## Drapeau des conditions

Un seul drapeau pour tout le club, quel que soit le bateau (`app/js/core/conditions.js`, `flagFor`). Seuls le vent et les vagues font monter le niveau :

| Drapeau | Vent moyen | Rafales | Vagues au large |
| --- | --- | --- | --- |
| Vert | ≤ 16 nds | ≤ 22 nds | ≤ 2 m |
| Jaune | ≤ 21 nds | ≤ 27 nds | ≤ 3 m |
| Rouge | ≤ 27 nds | ≤ 34 nds | au-delà |
| Noir | au-delà | au-delà | |

Orage : drapeau noir. Nuit : on reste à terre. Le **vent de terre** (nord-ouest à est) ne change pas le drapeau : simple avertissement, car la baie est fermée et le club au fond, la rentrée se fait au près en eau abritée. Rafales marquées, houle sur la plage par vent de mer et brouillard sont aussi de simples avertissements.

## Développement

```bash
npm start   # http://localhost:8642
npm test
```

Après une modification, changer `VERSION` dans `app/sw.js` pour que les appareils reçoivent la mise à jour.

## Déploiement

Projet Cloudflare Pages `capaupres` relié au dépôt (dossier publié `app/`, sans build) : `main` en production sur https://capaupres.pages.dev, les autres branches en préversion.

## Sauvegarde en ligne

Dans le Profil, pseudo + date de naissance : la progression est sauvegardée en ligne et se retrouve sur tous les appareils (sur un nouvel appareil, écran d'accueil, « Retrouver ma progression »).

- `functions/api/profil/[key].js` (Cloudflare Pages Functions) : `GET` et `PUT /api/profil/:key`, stockage Cloudflare KV (liaison `PROFILS`).
- `key` = SHA-256 du pseudo normalisé et de la date de naissance, calculé dans le navigateur. Le serveur la re-hache avec le secret `PEPPER` avant de s'en servir comme clé KV. Ni le pseudo ni la date ne sont envoyés.
- À chaque envoi, le serveur fusionne (`app/js/core/merge.js`) : meilleur score par mission et par leçon, records max, badges cumulés. Deux appareils ne s'écrasent jamais. La remise à zéro remplace la version en ligne.
- Limite connue : quelqu'un qui connaît le pseudo et la date de naissance d'un élève peut lire ou compléter sa progression (jamais l'effacer, sauf via la remise à zéro).

Test local : `npx wrangler pages dev app --kv PROFILS --binding PEPPER=dev`.
