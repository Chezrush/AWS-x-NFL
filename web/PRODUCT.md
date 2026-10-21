# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Coachs NFL. Le demandeur réalise cette application dans le cadre d’un hackathon et attend une interface professionnelle, belle, lisible et pratique.

## Product Purpose

Analyser les receveurs et les défenses, préparer un plan de jeu et visualiser des jeux de passe à partir du tracking NFL. L’implémentation existante expose le SOE, l’EPA, le ciblage et, lorsque ses exports sont disponibles, un radar OTS.

## Capabilities and Constraints

Next.js, React, Tailwind et next-intl. Six vues principales : accueil, plan de jeu, joueurs, défenses, replays, méthode. Langues française et anglaise, thème clair et sombre. Conserver les métriques et les limites méthodologiques existantes. Les données livrées couvrent la saison 2021, semaines 1 à 8 ; elles ne représentent pas une saison actuelle.

## Brand Commitments

Nom existant : « Qui attaquer ». L’utilisateur demande une refonte graphique complète avec Impeccable, sans référence visuelle imposée.

## Evidence on Hand

Types et chargeurs dans lib/data.ts. Scripts reproductibles dans ../analysis. JSON d’analyse dans data/. Les exports OTS sont optionnels pour l’accueil ; ne pas inventer ces chiffres.
