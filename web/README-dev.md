# Web PoC (Next.js + next-intl + Tailwind + PWA)

- Dev : `pnpm install && pnpm dev` -> http://localhost:3000 (redirige vers /fr ou /en).
- Build : `pnpm build` (TypeScript strict). Prod : `node .next/standalone/server.js` apres copie de `public` et `.next/static` dedans.
- Docker : `docker compose up --build` -> http://localhost:3000 (aucun secret, aucune variable requise).
- Donnees : deposer les JSON dans `data/` (players_soe, defense_tendencies, game_plan, replays, validation). Serveur : `lib/data.ts` (`loadData`).
  Client/PWA : `scripts/sync-data.mjs` les copie dans `public/data/` (auto a dev/build) ; le SW les met en cache.
- i18n : textes dans `messages/fr.json` et `en.json`, jamais en dur. Verifier les cles : `pnpm check:messages`.
- Icones PWA : `pnpm icons`. Le service worker n'est actif qu'en build de production.
