

export interface BehaviorDefinition {
  name: string;
  description: string;
  defaultProperties: Record<string, any>;
}

export const availableBehaviors: BehaviorDefinition[] = [
  {
    name: 'PlatformerCharacter',
    description: 'Habilita controles de teclado para movimiento lateral y salto.',
    defaultProperties: {
      speed: 150,
      jumpForce: 350,
      gravity: 500,
      idleAnimId: '',
      runAnimId: '',
      jumpAnimId: '',
      attackAnimId: '',
    },
  },
  {
    name: 'TopDownRPGMovement',
    description: 'Habilita movimiento en 8 direcciones (arriba/abajo/lados/diagonales) sin gravedad.',
    defaultProperties: {
      speed: 100,
      idleAnimId: '',
      runAnimId: '',
      jumpAnimId: '',
      attackAnimId: '',
    },
  },
  {
    name: 'Solid',
    description: 'Convierte el objeto en un obstáculo sólido sobre el que otros objetos pueden pararse o colisionar.',
    defaultProperties: {},
  },
  {
    name: 'Physics',
    description: 'Aplica gravedad al objeto, haciendo que caiga.',
    defaultProperties: {
      gravity: 500,
    },
  },
  {
    name: 'Patrol',
    description: 'Mueve el objeto de un lado a otro horizontalmente dentro de un rango establecido.',
    defaultProperties: {
      speed: 50,
      range: 100,
      sticky: true,
    },
  },
  {
    name: 'Oscillate',
    description: 'Hace que el objeto se mueva de un lado a otro en un eje (x o y) de forma fluida.',
    defaultProperties: {
      axis: 'x',
      distance: 100,
      speed: 2,
      sticky: true,
    },
  },
  {
    name: 'Rotate',
    description: 'Hace que el objeto gire continuamente.',
    defaultProperties: {
      rotationSpeed: 90,
    },
  },
  {
    name: 'Pulse',
    description: 'Hace que el objeto cambie de tamaño de forma pulsante.',
    defaultProperties: {
      distance: 0.2,
      speed: 2,
    },
  },
  {
    name: 'FollowCamera',
    description: 'Hace que la cámara del juego siga a este objeto.',
    defaultProperties: {},
  },
  {
    name: 'Tilemap',
    description: 'Genera un mapa de colisiones estático basado en una rejilla de texto. Usa cualquier caracter para un bloque sólido y "0" o espacio para vacío.',
    defaultProperties: {
      tileSize: 32,
      collisionData: '11111111111111111111\n10000000000000000001\n10000000000000000001\n10000000000000000001\n11111111111111111111',
    },
  },
  {
    name: 'Health',
    description: 'Gestiona la salud y puntos de vida (hp) del objeto.',
    defaultProperties: {
      hp: 100,
      maxHp: 100,
      showHealthBar: true,
    },
  },
  {
    name: 'ScoreCounter',
    description: 'Muestra el valor de una variable. Usa {value} en la plantilla de texto.',
    defaultProperties: {
      variableName: 'score',
      format: 'Score: {value}',
    },
  },
  {
    name: 'Attack',
    description: 'Genera un cubo de daño al atacar.',
    defaultProperties: {
      attackDistance: 30,
      damage: 10,
    },
  },
  {
    name: 'TweenPath',
    description: 'Mueve el objeto siguiendo una serie de puntos.',
    defaultProperties: {
      speed: 100,
      loop: true,
      points: '0,0;100,100',
    },
  },
  {
    name: 'TextVariable',
    description: 'Muestra el valor de una variable en este objeto de texto.',
    defaultProperties: {
      variableName: '',
      prefix: '',
      suffix: '',
    },
  },
  {
    name: 'Boss',
    description: 'Comportamiento de Jefe (Boss). Persigue al jugador, salta obstáculos, y lanza proyectiles con intervalo, velocidad y color personalizados.',
    defaultProperties: {
      hp: 500,
      maxHp: 500,
      speed: 80,
      jumpForce: 300,
      attackInterval: 2,
      attackSpeed: 300,
      followPlayer: true,
      projectileColor: '#ef4444',
    },
  },
  {
    name: 'Ladder',
    description: 'Convierte el objeto en una escalera que se puede subir superponiéndose con ella.',
    defaultProperties: {},
  },
  {
    name: 'LadderClimber',
    description: 'Permite al objeto subir y bajar por escaleras usando los controles de dirección (Arriba / Abajo).',
    defaultProperties: {
      speed: 100,
    },
  },
];