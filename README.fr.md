# Who to Attack 🏈

**Trouvez les receveurs qui créent de l'espace, préparez les duels qui comptent.** · [English](README.md)

![Who to Attack : vue d'ensemble avec le radar animé et le classement des receveurs sous-exploités](docs/img/who-to-attack-overview-en.png)

Who to Attack aide les coordinateurs offensifs NFL à choisir quels receveurs et quelles défenses cibler, grâce au tracking Next Gen Stats. Au moment du lancer, chaque WR/TE/RB reçoit un **Optimal Target Score (0–99)** basé sur la séparation avec le défenseur le plus proche, les mismatches (ex. un RB couvert par un linebacker) et la ligne du 1er essai. Sur 6 867 passes, un mismatch vaut **+0,9 yd** de séparation, et les passes où le QB trouve l'option la plus ouverte donnent **+0,63 EPA contre +0,07**. L'app propose radar animé, classement des receveurs ouverts mais oubliés, plans de match, tendances des défenses et replays, en FR/EN. L'OTS est un modèle (ni lecture de couverture, ni pression), sur la saison 2021 semaines 1–8 : corrélation, pas causalité.

```bash
docker compose -f web/docker-compose.yml up --build   # http://localhost:3000
```
