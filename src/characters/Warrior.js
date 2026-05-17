/**
 * @file Warrior.js
 * VOSS — blade warrior. Fast combos, spinning attack, dash strike.
 */

/* global WarriorCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

// ── VOSS Renderer (fallback) ──────────────────────────────────────────────────

class WarriorRenderer extends CharacterRenderer {
  constructor(scene, x, y) {
    super(scene, x, y);
  }

  drawBody(gfx) {
    const c = CharacterRenderer.c;
    // Simple silhouette fallback
    c(gfx, 0x8844aa);
    gfx.fillRect(-10, -30, 20, 40);
    c(gfx, 0xaa66cc);
    gfx.fillCircle(0, -36, 10);
  }
}

// ── VOSS Character ────────────────────────────────────────────────────────────
// Identity: Fast 3-hit blade combo. Spin attack hits all around. Dash strike.

class WarriorCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer  = BaseCharacter.pickRenderer(scene, x, y, 'Warrior', new WarriorRenderer(scene, x, y));
    this.maxJumps  = 2;
    this.jumpsLeft = 2;

    this._spinCooldown = 0;
    this._dashCooldown = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // VOSS: Fast 3-hit blade combo (ground) | aerial slash (air) | rising cut (up)
  _lightAttack(ax, ay, air) {
    if (air) {
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitKi(this.x + this.facing*30, this.y, 0xaa66cc, 4, 22);
      this._scheduleHitbox(32, 230, { offsetX:34, offsetY:0, w:52, h:40,
        damage:7, kbBase:265, kbScale:32, kbAngle:ax>=0?22:158,
        type:'light', particleColor:0xaa66cc });
    } else if (ay < 0) {
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitKi(this.x, this.y - 28, 0xcc88ff, 5, 28);
      this._scheduleHitbox(32, 230, { offsetX:0, offsetY:-38, w:46, h:52,
        damage:8, kbBase:295, kbScale:35, kbAngle:88,
        type:'light', particleColor:0xaa66cc });
    } else {
      // 3-hit blade combo — fast startup
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      [40, 110, 185].forEach((d, i) => {
        this.scene.time.delayedCall(d, () => {
          if (!this.isDead) {
            this._addHitbox({ offsetX:36, offsetY:0, w:52, h:42,
              damage:4 + i, kbBase:160 + i*40, kbScale:18 + i*5,
              kbAngle:this.facing>0?18:162, type:'light', particleColor:0xaa66cc });
            this._emitKi(this.x + this.facing*36, this.y, 0xaa66cc, 3, 18);
          }
        });
      });
      this._attackCooldown = 360;
      this.scene.time.delayedCall(360, () => { this.isAttacking = false; });
    }
  }

  // Overhead cleave (ground) | plunging stab (up)
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    this._emitKi(this.x + this.facing*38, this.y, 0x8833aa, 10, 50);
    if (ay < 0) {
      this._scheduleHitbox(95, 480, { offsetX:22, offsetY:-50, w:52, h:64,
        damage:16, kbBase:500, kbScale:72, kbAngle:90,
        type:'heavy', particleColor:0x8833aa });
    } else {
      this._scheduleHitbox(105, 510, { offsetX:48, offsetY:-6, w:72, h:58,
        damage:18, kbBase:540, kbScale:78,
        kbAngle:this.facing>0?16:164, type:'heavy', particleColor:0x8833aa });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ay < 0 && this._spinCooldown < now) {
      this._spinAttack(); this._spinCooldown = now + 3200;
    } else if (this._dashCooldown < now) {
      this._dashStrike(); this._dashCooldown = now + 2000;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    this._scheduleHitbox(65, 330, { offsetX:38, offsetY:0, w:46, h:42,
      damage:5, kbBase:110, kbScale:16,
      kbAngle:this.facing>0?48:132, type:'grab', particleColor:0xaa66cc });
  }

  // UNIQUE: 360° spinning blade — 4 hits covering all directions
  _spinAttack() {
    this._attackCooldown = 740; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const attackId = `${this.playerId}_${this._attackId}`;
    [0, 90, 180, 270].forEach((deg, i) => {
      this.scene.time.delayedCall(60 + i * 130, () => {
        if (this.isDead) return;
        const rad = Phaser.Math.DegToRad(deg);
        const hx  = this.x + Math.cos(rad) * 54;
        const hy  = this.y + Math.sin(rad) * 54 - 8;
        this.combat.addHitbox({ owner:this, id:attackId,
          x:hx, y:hy, w:72, h:60,
          damage:7, kbBase:260, kbScale:36,
          kbAngle:(deg + 270) % 360, type:'special', particleColor:0xaa66cc });
        this._emitKi(hx, hy, 0xcc88ff, 6, 30);
      });
    });
    this.scene.time.delayedCall(740, () => { this.isAttacking = false; });
  }

  // Fast blade dash — quick burst forward with a strike
  _dashStrike() {
    this._attackCooldown = 560; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    this._setInvuln(100);
    const dir = this.facing;
    this.vel.x = dir * 760; this.vel.y = -70;
    const trail = this.scene.add.rectangle(this.x, this.y, 48, 8, 0xaa66cc, 0.5).setDepth(24);
    this.scene.tweens.add({ targets:trail, scaleX:0.05, alpha:0, duration:180,
      onComplete:()=>trail.destroy() });
    this.scene.time.delayedCall(130, () => {
      if (this.isDead) return;
      this._addHitbox({ offsetX:44, offsetY:0, w:62, h:50,
        damage:14, kbBase:440, kbScale:62,
        kbAngle:dir>0?20:160, type:'special', particleColor:0xaa66cc });
      this._emitKi(this.x + dir*44, this.y, 0xcc88ff, 14, 52);
    });
    this.scene.time.delayedCall(560, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Warrior'] = WarriorCharacter;
