// Les pièces (niveaux). Coordonnées sur un plateau de 1280 x 720, murs de 30 px.
// furniture : bloque l'humain (le moustique vole au-dessus). rot : 0, 90, 180 ou 270.
//   x, y, w, h = rectangle occupé au sol (déjà tourné).
// deco      : décor au sol, ne bloque rien.
// water     : point d'eau (ponte + renaissance du moustique).
// shadows   : coins sombres (ellipses) où le moustique est invisible et intouchable.
const ROOMS = [
  {
    id: 'salon',
    name: 'Le Salon',
    tagline: "Canapé moelleux, table basse… et une soucoupe d'eau au pied de la plante.",
    floor: 'parquet', seed: 7,
    windows: [{ from: 200, to: 420 }, { from: 800, to: 980 }],
    door: { from: 130, to: 230 },
    deco: [{ img: 'tapis', x: 470, y: 255, w: 340, h: 215 }],
    furniture: [
      { img: 'meuble-tv', x: 500, y: 30, w: 240, h: 55 },
      { img: 'table-basse', x: 565, y: 325, w: 150, h: 80 },
      { img: 'canape', x: 500, y: 500, w: 280, h: 100, rot: 180 },
      { img: 'fauteuil', x: 880, y: 315, w: 100, h: 100, rot: 90 },
      { img: 'bibliotheque', x: 30, y: 230, w: 60, h: 220 },
      { img: 'commode', x: 1020, y: 30, w: 150, h: 55 },
      { img: 'plante', x: 1170, y: 610, w: 70, h: 70 },
      { img: 'plante', x: 40, y: 40, w: 60, h: 60 },
    ],
    water: { x: 1125, y: 645, r: 22 },
    shadows: [
      { cx: 75, cy: 95, rx: 120, ry: 120 },
      { cx: 640, cy: 652, rx: 180, ry: 52 },
      { cx: 640, cy: 365, rx: 85, ry: 42 },
      { cx: 1200, cy: 120, rx: 95, ry: 110 },
    ],
    humanStart: { x: 300, y: 560 },
    difficulty: { reach: 165, speed: 85, cooldown: 0.6 },
  },
  {
    id: 'chambre',
    name: 'La Chambre',
    tagline: "Un grand lit, une armoire… et un verre d'eau oublié sur la table de nuit.",
    floor: 'moquette', seed: 13,
    windows: [{ from: 150, to: 380 }, { from: 880, to: 1040 }],
    door: { from: 420, to: 520 },
    deco: [{ img: 'tapis', x: 525, y: 330, w: 210, h: 130 }],
    furniture: [
      { img: 'lit', x: 520, y: 30, w: 220, h: 260 },
      { img: 'table-nuit', x: 452, y: 36, w: 60, h: 60 },
      { img: 'table-nuit', x: 748, y: 36, w: 60, h: 60 },
      { img: 'armoire', x: 30, y: 470, w: 75, h: 190, rot: 270 },
      { img: 'bureau', x: 990, y: 610, w: 170, h: 80, rot: 180 },
      { img: 'chaise', x: 1050, y: 552, w: 50, h: 50 },
      { img: 'commode', x: 1090, y: 30, w: 150, h: 55 },
      { img: 'plante', x: 40, y: 40, w: 60, h: 60 },
    ],
    water: { x: 783, y: 72, r: 15 },
    shadows: [
      { cx: 85, cy: 95, rx: 120, ry: 115 },
      { cx: 150, cy: 665, rx: 140, ry: 55 },
      { cx: 1075, cy: 655, rx: 115, ry: 45 },
      { cx: 630, cy: 305, rx: 125, ry: 26 },
    ],
    humanStart: { x: 300, y: 350 },
    difficulty: { reach: 175, speed: 95, cooldown: 0.55 },
  },
  {
    id: 'sdb',
    name: 'La Salle de bain',
    bonus: true,
    tagline: 'Niveau bonus : la baignoire est pleine… le paradis du moustique tigre !',
    floor: 'carrelage', seed: 21,
    windows: [{ from: 250, to: 420 }],
    door: { from: 560, to: 660 },
    deco: [{ img: 'tapis-bain', x: 1010, y: 120, w: 85, h: 130 }],
    furniture: [
      { img: 'baignoire', x: 1110, y: 40, w: 130, h: 270 },
      { img: 'lavabo', x: 480, y: 30, w: 140, h: 70 },
      { img: 'commode', x: 700, y: 30, w: 130, h: 55 },
      { img: 'commode', x: 30, y: 220, w: 55, h: 140, rot: 90 },
      { img: 'wc', x: 30, y: 560, w: 85, h: 60, rot: 270 },
      { img: 'panier', x: 1175, y: 615, w: 60, h: 60 },
      { img: 'plante', x: 40, y: 40, w: 55, h: 55 },
    ],
    water: { x: 1175, y: 200, r: 26, img: null },   // l'eau de la baignoire
    shadows: [
      { cx: 85, cy: 640, rx: 125, ry: 70 },
      { cx: 1195, cy: 650, rx: 95, ry: 70 },
      { cx: 550, cy: 122, rx: 105, ry: 30 },
      { cx: 75, cy: 85, rx: 105, ry: 95 },
    ],
    humanStart: { x: 600, y: 420 },
    difficulty: { reach: 185, speed: 105, cooldown: 0.5 },
  },
];
