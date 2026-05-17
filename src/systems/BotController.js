/**
 * @file BotController.js
 * AI opponent with 9 difficulty levels.
 * Plugs into InputManager via setBotController() so character code
 * never needs to know whether it's player- or bot-controlled.
 */

/* global BotController, GAME_CONFIG */

class BotController {
  constructor(level) {
    this.level = Math.max(1, Math.min(9, level));
    const L = this.level;

    // ── Per-level tuning ──────────────────────────────────────────────────
    this.reactionMs  = [900, 680, 520, 370, 260, 170, 100, 55, 18][L - 1];
    this.aggression  = [0.12, 0.22, 0.36, 0.50, 0.63, 0.75, 0.85, 0.93, 1.0][L - 1];
    this.accuracy    = [0.30, 0.45, 0.60, 0.72, 0.81, 0.88, 0.93, 0.97, 1.0][L - 1];
    this.attackCdMin = [560, 460, 370, 290, 220, 160, 110, 75, 40][L - 1];

    // ── Virtual input state ───────────────────────────────────────────────
    this._axisX  = 0;
    this._axisY  = 0;
    this._held   = {};   // continuously held buttons
    this._buffer = {};   // one-frame press events

    // ── Internal timers ───────────────────────────────────────────────────
    this._decisionTimer  = 0;
    this._attackCooldown = 0;
    this._pendingAxisY   = 0;

    // ── Current plan (set on each decision tick) ──────────────────────────
    this._plan = { move: 0, attack: null, jump: false, shield: false };
  }

  // ── Main update — call BEFORE the bot character's update() each frame ────

  update(dt, bot, opp) {
    // Clear one-frame buffers each frame
    this._buffer = {};

    this._decisionTimer  -= dt * 1000;
    this._attackCooldown -= dt * 1000;

    if (!bot || !opp || bot.isDead || bot.isRespawning || bot.isFrozen) {
      this._axisX = 0; this._axisY = 0; this._held = {};
      return;
    }

    // Make a new decision when the reaction timer fires
    if (this._decisionTimer <= 0) {
      this._decide(bot, opp);
      this._decisionTimer = this.reactionMs + Math.random() * 80;
    }

    // Execute current plan
    this._execute(bot, opp);
  }

  // ── Decision logic ────────────────────────────────────────────────────────

  _decide(bot, opp) {
    const dx   = opp.x - bot.x;
    const dy   = opp.y - bot.y;
    const dist = Math.abs(dx);
    const dir  = dx >= 0 ? 1 : -1;
    const W    = GAME_CONFIG.WIDTH;
    const L    = this.level;

    // 1. Stage survival — walk back toward center if near blast zone
    const edgeThreshold = 80 + L * 8;
    if (bot.x < edgeThreshold) {
      this._plan = { move: 1, attack: null, jump: !bot.isGrounded && bot.jumpsLeft > 0, shield: false };
      return;
    }
    if (bot.x > W - edgeThreshold) {
      this._plan = { move: -1, attack: null, jump: !bot.isGrounded && bot.jumpsLeft > 0, shield: false };
      return;
    }

    // 2. Recovery — airborne and falling, try to recover with jump
    if (!bot.isGrounded && bot.vel.y > 180 && bot.jumpsLeft > 0 && Math.random() < 0.15 * L) {
      this._plan = { move: dir, attack: null, jump: true, shield: false };
      return;
    }

    // 3. Shield incoming attack (higher levels)
    if (L >= 5 && opp.isAttacking && dist < 130 && Math.random() < 0.08 * (L - 4)) {
      this._plan = { move: 0, attack: null, jump: false, shield: true };
      return;
    }

    // 4. Choose attack
    let attack = null;
    if (dist < 150 && this._attackCooldown <= 0 && Math.random() < this.aggression) {
      attack = this._chooseAttack(bot, opp, dist, dy);
      this._attackCooldown = this.attackCdMin + Math.random() * 180;
    }

    // 5. Movement
    let move = 0;
    if (dist > 130) {
      // Approach — accuracy determines how reliably the bot moves toward opponent
      move = Math.random() < this.accuracy ? dir : (Math.random() > 0.5 ? dir : 0);
    } else if (dist < 55 && L >= 4) {
      // Slight retreat for spacing (higher levels only)
      move = Math.random() < 0.28 * (L / 9) ? -dir : dir;
    } else {
      move = Math.random() < this.accuracy * 0.5 ? dir : 0;
    }

    // 6. Jump to follow on platforms
    let jump = false;
    if (dy < -70 && bot.isGrounded && Math.random() < 0.04 * L) jump = true;

    this._plan = { move, attack, jump, shield: false };
  }

  _chooseAttack(bot, opp, dist, dy) {
    const L        = this.level;
    const airborne = !bot.isGrounded;

    // Low levels: mostly light, occasional grab
    if (L <= 2) return Math.random() < 0.85 ? 'light' : 'grab';

    // Mid levels: balanced mix
    if (L <= 4) {
      const r = Math.random();
      if (r < 0.50) return 'light';
      if (r < 0.72) return 'heavy';
      if (r < 0.87) return 'grab';
      return 'special';
    }

    // High levels: situational selection
    if (airborne) return Math.random() < 0.55 ? 'light' : 'heavy';

    if (dy < -55) {
      // Opponent is above — up attack
      this._pendingAxisY = -1;
      return Math.random() < 0.65 ? 'heavy' : 'light';
    }

    if (dist < 55) {
      const r = Math.random();
      if (r < 0.30) return 'grab';
      if (r < 0.58) return 'light';
      if (r < 0.80) return 'heavy';
      return 'special';
    }

    // Mid range — prefer special at higher levels
    return L >= 7 ? 'special' : (Math.random() < 0.55 ? 'light' : 'heavy');
  }

  _execute(bot, opp) {
    const plan = this._plan;

    this._axisX = plan.move;
    this._axisY = this._pendingAxisY || 0;
    this._pendingAxisY = 0;

    this._held.shield = plan.shield;

    if (plan.jump) {
      this._buffer.jump = true;
      this._plan.jump = false;
    }

    if (plan.attack && !bot.isAttacking && bot._attackCooldown <= 0) {
      this._buffer[plan.attack] = true;
      this._plan.attack = null;
    }
  }

  // ── InputManager interface (called by patched InputManager) ───────────────

  axisX()  { return this._axisX; }
  axisY()  { return this._axisY; }

  isHeld(action) {
    return this._held[action] || false;
  }

  justPressed(action) {
    return this._buffer[action] || false;
  }

  consumeBuffer(action) {
    if (this._buffer[action]) {
      delete this._buffer[action];
      return true;
    }
    return false;
  }
}
