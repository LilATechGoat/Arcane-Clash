/**
 * @file game.js
 * Entry point. Pixel-art mode enabled for crisp, Hollow Knight-style rendering.
 */

/* global Phaser, GAME_CONFIG, BootScene, MenuScene, GameScene, UIScene */

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width:  GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#05050f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
});
