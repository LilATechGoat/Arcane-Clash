/**
 * @file InputManager.js
 * Maps raw keyboard keys to abstract game actions for each player.
 * Swap key bindings here without touching character logic.
 */

/* global InputManager */

class InputManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.createCursorKeys();

    /** @type {Object.<string, Phaser.Input.Keyboard.Key>} */
    this.rawKeys = scene.input.keyboard.addKeys({
      // Player 1
      p1Left:    'A',
      p1Right:   'D',
      p1Up:      'W',
      p1Down:    'S',
      p1Light:   'Z',
      p1Heavy:   'X',
      p1Special: 'C',
      p1Grab:    'V',
      p1Shield:  'F',

      // Player 2
      p2Left:    'LEFT',
      p2Right:   'RIGHT',
      p2Up:      'UP',
      p2Down:    'DOWN',
      p2Light:   'K',
      p2Heavy:   'L',
      p2Special: 'I',
      p2Grab:    'O',
      p2Shield:  'P',
    });

    /** Tracks which actions were just pressed this frame (rising edge). */
    this._prev = {};
    /** Buffered actions (pressed within last N ms). */
    this._buffer = {};
    this._BUFFER_MS = 100;

    /** Bot controllers keyed by playerId — override inputs when set. */
    this._bots = {};
    /** Network controller keyed by playerId — override inputs when set. */
    this._net  = {};
    /** Keyboard remapping: { slot → keyboardPlayerId } for online guests */
    this._kbOverride = {};

    this._actionMap = {
      0: {
        left:    'p1Left',
        right:   'p1Right',
        up:      'p1Up',
        down:    'p1Down',
        light:   'p1Light',
        heavy:   'p1Heavy',
        special: 'p1Special',
        grab:    'p1Grab',
        shield:  'p1Shield',
      },
      1: {
        left:    'p2Left',
        right:   'p2Right',
        up:      'p2Up',
        down:    'p2Down',
        light:   'p2Light',
        heavy:   'p2Heavy',
        special: 'p2Special',
        grab:    'p2Grab',
        shield:  'p2Shield',
      },
    };
  }

  /**
   * Call once per frame before any character update.
   * @param {number} delta  ms elapsed since last frame
   */
  update(delta) {
    const now = this.scene.time.now;
    for (const pid of [0, 1]) {
      const map = this._actionMap[pid];
      for (const action of Object.keys(map)) {
        const rawKey = map[action];
        const key = `${pid}_${action}`;
        const cur = this.rawKeys[rawKey].isDown;
        const prev = this._prev[key] || false;

        if (cur && !prev) {
          // Rising edge — store buffer timestamp
          this._buffer[key] = now;
        }
        this._prev[key] = cur;
      }

      // Expire old buffer entries
      for (const [k, t] of Object.entries(this._buffer)) {
        if (now - t > this._BUFFER_MS) delete this._buffer[k];
      }
    }
  }

  setBotController(playerId, bot)  { this._bots[playerId] = bot; }
  setNetController(playerId, net)  { this._net[playerId]  = net; }
  setKeyboardOverride(slot, kbId)  { this._kbOverride[slot] = kbId; }
  /** True when the player is driven by a network or bot controller (not local keyboard). */
  isRemoteControlled(playerId)     { return !!(this._net[playerId] || this._bots[playerId]); }

  // Gather local held state and send over network each frame
  // Always reads keyboard 0 (WASD) since online local player uses keyboard override → 0
  sendNetworkInput(net, localPlayerId, localChar) {
    const kbId = this._kbOverride[localPlayerId] ?? localPlayerId;
    const map  = this._actionMap[kbId] || this._actionMap[0] || {};
    const held = {};
    for (const action of Object.keys(map)) {
      held[action] = this.rawKeys[map[action]]?.isDown || false;
    }
    const l = held.left || false, r = held.right || false;
    const u = held.up   || false, d = held.down  || false;
    const ax = (r && !l) ? 1 : (l && !r) ? -1 : 0;
    const ay = (d && !u) ? 1 : (u && !d) ? -1 : 0;
    // Also send actual position so host can correct guest char before hit detection
    const px  = localChar ? Math.round(localChar.x)     : undefined;
    const py  = localChar ? Math.round(localChar.y)     : undefined;
    const pvx = localChar ? Math.round(localChar.vel?.x) : undefined;
    const pvy = localChar ? Math.round(localChar.vel?.y) : undefined;
    net.sendInput(ax, ay, held, px, py, pvx, pvy);
  }

  isHeld(playerId, action) {
    if (this._net[playerId])  return this._net[playerId].isHeld(action);
    if (this._bots[playerId]) return this._bots[playerId].isHeld(action);
    const kb     = this._kbOverride[playerId] ?? playerId;
    const rawKey = this._actionMap[kb]?.[action];
    if (!rawKey) return false;
    return this.rawKeys[rawKey].isDown;
  }

  justPressed(playerId, action) {
    if (this._net[playerId])  return this._net[playerId].justPressed(action);
    if (this._bots[playerId]) return this._bots[playerId].justPressed(action);
    const kb     = this._kbOverride[playerId] ?? playerId;
    const rawKey = this._actionMap[kb]?.[action];
    if (!rawKey) return false;
    const key  = `${kb}_${action}`;
    const prev = this._prev[key] || false;
    return this.rawKeys[rawKey].isDown && !prev;
  }

  consumeBuffer(playerId, action) {
    if (this._net[playerId])  return this._net[playerId].consumeBuffer(action);
    if (this._bots[playerId]) return this._bots[playerId].consumeBuffer(action);
    const kb  = this._kbOverride[playerId] ?? playerId;
    const key = `${kb}_${action}`;
    if (this._buffer[key] !== undefined) { delete this._buffer[key]; return true; }
    return false;
  }

  axisX(playerId) {
    if (this._net[playerId])  return this._net[playerId].axisX();
    if (this._bots[playerId]) return this._bots[playerId].axisX();
    const kb = this._kbOverride[playerId] ?? playerId;
    const l  = this.isHeld(playerId, 'left');
    const r  = this.isHeld(playerId, 'right');
    if (l && !r) return -1;
    if (r && !l) return  1;
    return 0;
  }

  axisY(playerId) {
    if (this._net[playerId])  return this._net[playerId].axisY();
    if (this._bots[playerId]) return this._bots[playerId].axisY();
    const kb = this._kbOverride[playerId] ?? playerId;
    const u  = this.isHeld(playerId, 'up');
    const d  = this.isHeld(playerId, 'down');
    if (u && !d) return -1;
    if (d && !u) return  1;
    return 0;
  }
}
