# Cap au Près

Jeu éducatif de voile dans la baie de La Baule pour l'école du CNBPP (Club Nautique Baule Pouliguen Pornichet). Application web installable (PWA), sans dépendance ni étape de build.

## Contenu

- **Simulateur** : 4 bateaux de l'école (Optimist, 420, Hobie Cat 16, J/80) avec polaires, réglage d'écoute, penons, rappel/trapèze, dérive, spi, chavirage ou départ au lof. Vent avec risées mobiles et oscillations, vent de terre irrégulier sous la côte, houle abritée à l'ouest par Penchâteau.
- **Baie de La Baule** : trait de côte du Pouliguen à Chémoulin, 7 îlots et roches (Baguenaude, Évens, Penchâteau, Impairs, Pierre Percée, Petit et Grand Charpentier), bande des 300 m.
- **10 missions** : du premier bord devant le club au raid du Grand Charpentier, avec étoiles calculées sur un temps de référence par bateau et un fantôme de ton meilleur passage.
- **« Montre-moi »** : pilote automatique qui tire les bords et règle les voiles devant l'élève (ne rapporte pas d'XP).
- **École** : 6 leçons, quiz illustrés générés à l'infini, mode réflexes en 60 s.
- **Météo réelle** : prévision Open-Meteo (vent, rafales, houle) sur 3 jours, verdict heure par heure, simulateur de conditions, navigation dans les conditions du jour.
- **Progression** : 9 grades, 16 badges, défi du jour commun à tout le club, série de jours.

## Lecture des conditions

Un seul verdict pour tout le club, **quel que soit le bateau**, fondé sur le **vent** (vent effectif = max du vent moyen et de 82 % des rafales) et la **houle** :

| Niveau | Vent effectif | Houle |
| --- | --- | --- |
| Petit temps | < 6 nds | |
| Bonnes conditions | < 18 nds | < 1 m |
| Vigilance | < 23 nds | < 1,6 m |
| Engagé | < 29 nds | < 2,5 m |
| Très engagé | au-delà | au-delà |

La houle courte (période < 7 s) est majorée de 25 %. Le reste n'est qu'avertissement : **le vent de terre (nord à est) ne dégrade pas le verdict**, car la baie est fermée et le club au fond, la rentrée se fait au près en eau abritée. Le vent de mer avec houle signale le shore-break, les rafales marquées sont signalées. La décision finale reste au moniteur. Tout est dans `app/js/conditions.js`.

## Développement

```bash
npm start          # http://localhost:8642
npm test           # 42 tests : géographie, physique, conditions, faisabilité des 40 couples mission × bateau, progression
npm run refs       # recalcule les temps de référence (après modification d'une mission ou d'un bateau)
npm run icons      # régénère les PNG depuis app/icons/icon.svg (Playwright)
```

Après une modification des fichiers de l'app, incrémenter `VERSION` dans `app/sw.js` pour que les élèves reçoivent le bandeau de mise à jour.

## Déploiement (Cloudflare Pages)

Automatique : le projet Pages `capaupres` est relié au dépôt GitHub (dossier publié `app/`, pas de build). Chaque push sur `main` part en production sur https://capaupres.pages.dev, chaque autre branche en préversion sur `https://<branche>.capaupres.pages.dev`. GitHub Actions ne fait que lancer les tests.

En manuel :

```bash
npx wrangler login
npm run deploy     # publie le dossier app/ sur le projet Pages « capaupres »
```

Pour réserver l'accès au club : Cloudflare Zero Trust, Access, application sur le domaine Pages, règle « emails se terminant par » ou liste d'adresses, connexion par code envoyé par email.

## À valider par le club

- Trait de côte et positions des îlots : **tracés à la main** (approximation), à recaler sur les données OpenStreetMap ou SHOM.
- Seuils de conditions et textes des avertissements.
- Utilisation du nom et de l'identité CNBPP (l'icône actuelle est générique).
