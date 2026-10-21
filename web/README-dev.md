# Web PoC (Next.js + next-intl + Tailwind + PWA)

- Dev : `pnpm install && pnpm dev` -> http://localhost:3000 (redirige vers /fr ou /en).
- Build : `pnpm build` (TypeScript strict). Prod : `node .next/standalone/server.js` apres copie de `public` et `.next/static` dedans.
- Docker : `docker compose up --build` -> http://localhost:3000 (aucun secret, aucune variable requise).
- Donnees : deposer les JSON dans `data/` (players_soe, defense_tendencies, game_plan, replays, validation). Serveur : `lib/data.ts` (`loadData`).
  Client/PWA : `scripts/sync-data.mjs` les copie dans `public/data/` (auto a dev/build) ; le SW les met en cache.
- i18n : textes dans `messages/fr.json` et `en.json`, jamais en dur. Verifier les cles : `pnpm check:messages`.
- Icones PWA : `pnpm icons`. Le service worker n'est actif qu'en build de production.

## Refonte coach

- Les thèmes, espacements et règles de lisibilité sont documentés dans `DESIGN.md`.
- L’accueil conserve le radar OTS lorsque ses deux exports sont présents. Sans eux, il affiche un tableau SOE et les vrais replays issus du pipeline existant.
- `leaderboard.json` et `featured_plays.json` sont optionnels pour l’accueil. Ne pas remplacer ces fichiers par des statistiques simulées.
- Les exports SOE dans `data/` proviennent du dataset local et des scripts de `../analysis`. La configuration Next inclut les JSON dans le serveur standalone de production.
- Si Turbopack ne peut pas démarrer son observateur de fichiers dans un environnement isolé : `WATCHPACK_POLLING=true pnpm dev --webpack --port 3100`.
- Build vérifié : `pnpm build --webpack`. Les règles pnpm de délai minimal de publication sont conservées ; lucide-react utilise la version éligible 1.60.0.

- Pour compiler sans interférer avec une autre instance : `NFL_BUILD_DIR=.next-coach pnpm build --webpack`. Copier ensuite `public` dans `.next-coach/standalone/public` et `.next-coach/static` dans `.next-coach/standalone/.next-coach/static`, puis lancer `PORT=3100 node .next-coach/standalone/server.js`.
