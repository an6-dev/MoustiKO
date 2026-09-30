# 🦟 MoustiKO

Duel à 2 joueurs sur le même PC : le **moustique tigre** contre l'**humain**.

▶ **Jouer en ligne : https://an6-dev.github.io/MoustiKO/**

## Contrôles

| Joueur 1 — Moustique tigre (clavier) | Joueur 2 — Humain (souris) |
|---|---|
| `← ↑ → ↓` voler partout, même au-dessus des meubles | L'humain se balade tout seul mais est attiré par la souris |
| `Espace` maintenu sur l'humain : piquer | Les mains restent dans le cercle autour de l'humain |
| `Espace` maintenu sur le point d'eau : pondre (+1 ❤, +1 œuf) | Clic : CLAP ! (raté = recharge plus longue) |
| Coins sombres : invisible et intouchable, mais pas de piqûre | |
| 🏆 5 cœurs = pièce gagnée | 🏆 Écraser le moustique quand il n'a plus d'œufs |

`P` / `Échap` pause · `M` couper le son

## Pièces

Salon → Chambre → Salle de bain (bonus), de plus en plus difficiles pour le moustique.

## Lancer en local

Ouvrir `index.html` dans un navigateur, sans installation.

## Personnaliser

- `js/config.js` : réglages d'équilibrage
- `js/rooms.js` : pièces, meubles, coins sombres, point d'eau
- `img/` : images SVG (remplaçables en gardant les mêmes noms)
