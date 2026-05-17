/**
 * @file UIScene.js
 * Thin Phaser Scene wrapper that instantiates the HUD class.
 * Sits on top of GameScene (launched in parallel, higher depth).
 */

/* global UIScene, HUD */

class UIScene extends HUD {
  constructor() {
    super();
    // HUD already sets key: 'UIScene'
  }
}
