import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut /_next, /_vercel et tout chemin avec un point (sw.js, manifest.webmanifest, icones, /data/*.json)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
