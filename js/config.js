// Réglages du jeu : modifie ces valeurs pour équilibrer les parties.
const CONFIG = {
  W: 1280,               // taille logique du plateau
  H: 720,
  WALL: 30,              // épaisseur des murs

  heartsToWin: 5,        // cœurs nécessaires au moustique pour gagner la pièce
  startEggs: 2,          // œufs déjà pondus au début (= vies de réserve)

  mosquito: {
    speed: 290,          // vitesse max (px/s)
    accel: 2400,
    friction: 7,
    radius: 9,           // taille de la zone touchable
    stingTime: 1.2,      // secondes d'Espace maintenu pour piquer
    layTime: 0.9,        // secondes d'Espace maintenu pour pondre
    respawnDelay: 1.2,   // délai avant qu'un œuf éclose
    invulnTime: 1.5,     // invincibilité après l'éclosion
  },

  human: {
    radius: 28,          // collision avec les meubles
    bodyRadius: 34,      // zone où le moustique peut piquer
    handRadius: 24,      // zone d'impact du clap
    missPenalty: 0.5,    // recharge en plus quand on rate
    attraction: 1.3,     // force d'attraction vers la souris
    itchTime: 1.4,       // durée de la réaction après une piqûre
    // vitesse, portée et recharge sont définies par pièce (rooms.js)
  },
};
