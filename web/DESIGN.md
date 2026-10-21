# Coaching workspace design

Refonte demandée pour une application de préparation NFL, selon les principes de lisibilité et de retenue du mode Operate d’Impeccable (https://github.com/pbakaus/impeccable).

## Direction

Un espace de travail calme inspiré des dossiers de scouting : fond ivoire clair pour la lecture prolongée, navigation vert forêt, accent vert réservé aux actions et sélections. Le mode sombre reprend les mêmes contrastes. La marque existante « Qui attaquer » et les contenus métier sont conservés.

## Système

- Manrope, une seule famille ; titres de page 30–38 px, titres de section 16–18 px, texte 14–16 px. Labels compacts 12 px. Chiffres tabulaires.
- Fond #f5f6f2, surfaces #ffffff, texte #202b25, texte secondaire #626e65, bordures #dce2d9, action #247451, navigation #172b23.
- Espacement : 4, 8, 12, 16, 24, 32 px. Bordures fines, rayons 12–16 px. Pas de néons, de dégradés décoratifs ni de titres surchargés.
- Une action principale par en-tête. Filtres regroupés avec libellés visibles, état actif, réinitialisation et nombre de résultats.
- Les petits échantillons restent lisibles et sont signalés explicitement.
- Les tableaux denses défilent dans leur propre conteneur. Sur téléphone, navigation dans un panneau refermable, filtres en deux colonnes, fiche joueur pleine largeur.
- Les terrains conservent les proportions du tracking et distinguent les rôles par couleurs, cercles, numéros et légende.
- Focus visible, lien d’évitement, préférences de mouvement réduit, textes FR/EN.

## Vérité des données

Les exports SOE proviennent des scripts d’analyse existants et du dataset local. Aucun score OTS n’a été reconstruit ou simulé. Si `leaderboard.json` et `featured_plays.json` existent, l’accueil affiche le radar OTS ; sinon il utilise les données SOE réelles et l’indique par le nom de la mesure affichée.
