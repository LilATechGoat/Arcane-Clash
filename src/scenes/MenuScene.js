/**
 * @file MenuScene.js
 * Dark fantasy gothic character + stage select.
 */

/* global MenuScene, GAME_CONFIG */

const C = {
  BLACK:     0x000000,
  BG:        0x050816,
  PANEL:     0x080D1A,
  PANEL2:    0x0A1020,
  BORDER:    0x1A2A44,
  GOLD:      0xE0C070,
  GOLD_HI:   0xFFD98A,
  GOLD_DIM:  0x705830,
  P1:        0x4AB5C9,
  P2:        0xCC4422,
  TEXT:      0xE8D8A0,
  TEXT_DIM:  0x5A6050,
  WHITE:     0xFFFFFF,
  CYAN_DIM:  0x1A3A44,
};

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    this._W = W; this._H = H;

    this._drawBackground();
    this._drawTitle();
    this._drawCharacterSelect();
    this._drawStageSelect();
    this._drawFooter();
    this._drawScanlines();

    this._keys = this.input.keyboard.addKeys({
      navUp:'W', navDn:'S',
      selL:'A',  selR:'D',
      diffL:'Q', diffR:'E',
      p2L:'LEFT', p2R:'RIGHT',
      enter:'ENTER',
    });
    this._lastNav = 0;
    this._section  = 0;        // 0=characters  1=mode  2=stage
    this._mode     = 'pvp';
    this._botLevel = 5;
    this._netMgr   = null;
    this._updateCards();
    this._updateStageHighlight();
    this._drawModeSelect();
    this._drawSectionCursor();
    this._spawnParticles();
  }

  // ── Background ────────────────────────────────────────────────────────────────

  _drawBackground() {
    const { _W: W, _H: H } = this;
    const g = this.add.graphics().setDepth(0);

    // Deep dark base
    g.fillStyle(C.BG);
    g.fillRect(0, 0, W, H);

    // Subtle vertical vignette — darker at edges
    for (let i = 0; i < 12; i++) {
      g.fillStyle(C.BLACK, 0.04 * (12 - i));
      g.fillRect(0, 0, (i + 1) * 18, H);
      g.fillRect(W - (i + 1) * 18, 0, (i + 1) * 18, H);
    }

    // Faint gold radial at center-top (arcane glow)
    for (let r = 400; r > 0; r -= 30) {
      g.fillStyle(C.GOLD, 0.004 * (1 - r / 400));
      g.fillEllipse(W / 2, 0, r * 3, r);
    }

    // Star field — cold blue-white
    this._seedRng(7);
    const stars = this.add.graphics().setDepth(1);
    for (let i = 0; i < 220; i++) {
      const x  = this._rng() * W;
      const y  = this._rng() * H;
      const sz = this._rng() > 0.96 ? 2 : 1;
      const a  = 0.06 + this._rng() * 0.22;
      stars.fillStyle(C.TEXT, a);
      stars.fillRect(Math.round(x), Math.round(y), sz, sz);
    }

    // Bottom gradient fade
    for (let i = 0; i < 10; i++) {
      g.fillStyle(C.BLACK, 0.07 * (10 - i));
      g.fillRect(0, H - 80 + i * 8, W, 8);
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────────

  _drawTitle() {
    const { _W: W } = this;

    // Gold arcane circle glow behind title
    const glow = this.add.graphics().setDepth(2);
    for (let r = 160; r > 0; r -= 16) {
      glow.fillStyle(C.GOLD, 0.005 * (1 - r / 160));
      glow.fillEllipse(W / 2, 62, r * 5, r * 1.2);
    }

    // Top ornamental rule
    this._drawHRule(0, 18, W, C.GOLD_DIM, 1);
    this._drawHRule(0, 21, W, C.GOLD, 1);

    // Center title medallion background
    const mw = 560, mx = W / 2;
    const mg = this.add.graphics().setDepth(3);
    mg.fillStyle(C.PANEL, 0.92);
    mg.fillRect(mx - mw/2, 28, mw, 60);
    // Gold frame top/bottom
    mg.fillStyle(C.GOLD, 0.8);
    mg.fillRect(mx - mw/2, 28,    mw, 2);
    mg.fillRect(mx - mw/2, 88,    mw, 2);
    // Inner thin accent
    mg.fillStyle(C.GOLD_DIM, 0.6);
    mg.fillRect(mx - mw/2 + 4, 31, mw - 8, 1);
    mg.fillRect(mx - mw/2 + 4, 86, mw - 8, 1);
    // Side vertical lines
    mg.fillStyle(C.GOLD, 0.6);
    mg.fillRect(mx - mw/2,     28, 2, 62);
    mg.fillRect(mx + mw/2 - 2, 28, 2, 62);
    // Corner ornaments
    this._corners(mg, mx - mw/2 + 2, 30, mx + mw/2 - 2, 88, C.GOLD, 0.9);

    // Left/right decorative diamonds flanking title
    [mx - mw/2 - 18, mx + mw/2 + 10].forEach(dx => {
      mg.fillStyle(C.GOLD, 0.8);
      for (let row = -5; row <= 5; row++) {
        const hw = 5 - Math.abs(row);
        if (hw > 0) mg.fillRect(dx + hw, 58 + row, (5 - hw) * 2 + 2, 1);
      }
    });

    this.add.text(W / 2, 57, 'ARCANE  CLASH', {
      fontSize: '40px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#FFD98A', stroke: '#050816', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(4);

    this.add.text(W / 2, 82, '-- dark tournament --', {
      fontSize: '11px', fontFamily: '"Courier New", monospace',
      color: '#705830',
    }).setOrigin(0.5).setDepth(4);

    // Ornamental rule below title
    this._drawHRule(0, 94, W, C.GOLD, 1);
    this._drawHRule(0, 97, W, C.GOLD_DIM, 1);
  }

  // ── Character select ──────────────────────────────────────────────────────────

  _drawCharacterSelect() {
    const { _W: W } = this;
    const charNames = Object.keys(GAME_CONFIG.CHARACTERS);
    this._p1Sel = 0;
    this._p2Sel = Math.min(1, charNames.length - 1);

    // Section header
    this._sectionLabel(W / 2, 110, 'SELECT  FIGHTER');

    const cardW = 130, cardH = 162, gap = 12;
    const totalW = charNames.length * (cardW + gap) - gap;
    const startX = (W - totalW) / 2;

    this._charCards = charNames.map((name, i) => {
      const cx = startX + i * (cardW + gap);
      const cy = 126;
      const cfg  = GAME_CONFIG.SPRITE_CONFIG?.[name] || {};
      const displayName = cfg.displayName || name;
      const accentCol   = this._charAccent(name);

      const g = this.add.graphics().setDepth(4);
      this._drawCard(g, cx, cy, cardW, cardH, accentCol, false);

      // Character sprite preview or styled fallback
      const sprKey = `${name}_idle`;
      if (GAME_CONFIG.LOADED_SHEETS?.[name] && this.textures.exists(sprKey)) {
        const scale = (cfg.scale || 1.0) * 0.78;
        const spr = this.add.sprite(cx + cardW/2, cy + cardH/2 - 14, sprKey, 0)
          .setDepth(5).setScale(scale).setOrigin(0.5, 0.5);
        // Subtle vignette mask using a tinted rect
        const fade = this.add.graphics().setDepth(5);
        fade.fillStyle(C.PANEL, 0.25);
        fade.fillRect(cx + 3, cy + cardH - 38, cardW - 6, 30);
      } else {
        // Fallback — large character initial
        this.add.text(cx + cardW/2, cy + cardH/2 - 18, displayName[0], {
          fontSize: '52px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
          color: Phaser.Display.Color.IntegerToColor(accentCol).rgba,
          stroke: '#050816', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(5);
      }

      // Name plate at bottom
      const np = this.add.graphics().setDepth(5);
      np.fillStyle(C.BLACK, 0.82);
      np.fillRect(cx + 2, cy + cardH - 28, cardW - 4, 26);
      np.fillStyle(accentCol, 0.5);
      np.fillRect(cx + 2, cy + cardH - 29, cardW - 4, 1);

      this.add.text(cx + cardW/2, cy + cardH - 15, displayName, {
        fontSize: '13px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: '#FFD98A', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6);

      return { g, cx, cy, cardW, cardH, name, accentCol };
    });

    // Player cursor labels
    this._p1Cursor = this._makeCursorText(C.P1, '[ P1 ]');
    this._p2Cursor = this._makeCursorText(C.P2, '[ P2 ]');
  }

  // ── Stage select ──────────────────────────────────────────────────────────────

  _drawModeSelect() {
    const { _W: W } = this;
    const my = 316;

    this._drawHRule(0, 308, W, C.GOLD_DIM, 1);
    this._drawHRule(0, 310, W, C.GOLD, 1);
    this._sectionLabel(W / 2, my - 2, 'SELECT  MODE');

    // Three mode buttons: PVP | VS BOT | ONLINE  — centered around W/2
    const btnW = 110, btnH = 26, gap = 16;
    const totalW = btnW * 3 + gap * 2;
    const bx1 = W/2 - totalW/2;
    const bx2 = bx1 + btnW + gap;
    const bx3 = bx2 + btnW + gap;
    const by  = my + 14;

    this._modeBtns = [
      { g: this.add.graphics().setDepth(4), x: bx1, label: 'PVP',    mode: 'pvp'    },
      { g: this.add.graphics().setDepth(4), x: bx2, label: 'VS BOT', mode: 'bot'    },
      { g: this.add.graphics().setDepth(4), x: bx3, label: 'ONLINE', mode: 'online' },
    ];
    this._modeLbls = this._modeBtns.map(btn => {
      return this.add.text(btn.x + btnW/2, by + btnH/2, btn.label, {
        fontSize: '12px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: '#E0C070', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(5);
    });

    // Difficulty row (shown only when bot mode active)
    const dy = by + btnH + 14;
    this._diffRow = this.add.graphics().setDepth(4);
    this._diffLabel = this.add.text(W/2, dy + 10, '', {
      fontSize: '12px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#E0C070', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    this._modeBtn_W  = btnW;
    this._modeBtn_H  = btnH;
    this._modeBtn_Y  = by;
    this._diffRowY   = dy;

    this._refreshModeUI();
  }

  _refreshModeUI() {
    const { _W: W } = this;
    const btnW = this._modeBtn_W, btnH = this._modeBtn_H, by = this._modeBtn_Y;

    this._modeBtns.forEach((btn, i) => {
      const sel = (btn.mode === this._mode);
      btn.g.clear();
      btn.g.fillStyle(sel ? C.GOLD_DIM : C.PANEL, 0.9);
      btn.g.fillRect(btn.x, by, btnW, btnH);
      btn.g.fillStyle(sel ? C.GOLD : C.BORDER, 0.9);
      btn.g.fillRect(btn.x,          by,          btnW, 1);
      btn.g.fillRect(btn.x,          by + btnH-1,  btnW, 1);
      btn.g.fillRect(btn.x,          by,          1, btnH);
      btn.g.fillRect(btn.x + btnW-1, by,          1, btnH);
      this._modeLbls[i].setColor(sel ? '#FFD98A' : '#504030');
    });

    // Difficulty row
    this._diffRow.clear();
    this._diffLabel.setText('');
    if (this._mode === 'bot') {
      const L = this._botLevel;
      const labels = ['','NOVICE','BEGINNER','AMATEUR','CASUAL','SKILLED','EXPERT','PRO','MASTER','LEGEND'];
      const dy = this._diffRowY;
      const dotW = 16, dotGap = 6;
      const totalDots = 9 * (dotW + dotGap) - dotGap;
      const startX = W/2 - totalDots/2;

      for (let i = 1; i <= 9; i++) {
        const dx = startX + (i-1) * (dotW + dotGap);
        const active = i <= L;
        this._diffRow.fillStyle(active ? C.GOLD : C.BORDER, active ? 0.9 : 0.4);
        this._diffRow.fillRect(dx, dy + 3, dotW, dotW - 3);
        if (i === L) {
          this._diffRow.fillStyle(C.GOLD_HI, 0.6);
          this._diffRow.fillRect(dx + 1, dy + 4, dotW - 2, dotW - 5);
        }
      }

      this._diffLabel.setText(`Q ◄  ${labels[L]}  (${L}/9)  ► E`);
      this._diffLabel.setY(this._diffRowY + dotW + 10);
      this._diffLabel.setColor('#E0C070');
    }
  }

  _drawStageSelect() {
    const { _W: W } = this;
    this._stageSel = 0;

    const topY = this._mode === 'bot' ? 406 : 372;

    // Section divider + header
    this._drawHRule(0, topY - 8, W, C.GOLD_DIM, 1);
    this._drawHRule(0, topY - 6, W, C.GOLD, 1);
    this._sectionLabel(W / 2, topY + 8, 'SELECT  STAGE');

    const stageW = 300, stageH = 72, gap = 40;
    const totalW = GAME_CONFIG.STAGES.length * (stageW + gap) - gap;
    const startX = (W - totalW) / 2;

    this._stageCards = GAME_CONFIG.STAGES.map((id, i) => {
      const sx = startX + i * (stageW + gap);
      const sy = topY + 24;
      const g = this.add.graphics().setDepth(4);
      this._drawCard(g, sx, sy, stageW, stageH, C.GOLD_DIM, false);

      // Arrow labels
      this.add.text(sx + 18, sy + stageH/2, '◄', {
        fontSize: '13px', fontFamily: '"Courier New", monospace',
        color: '#705830',
      }).setOrigin(0.5).setDepth(5);
      this.add.text(sx + stageW - 18, sy + stageH/2, '►', {
        fontSize: '13px', fontFamily: '"Courier New", monospace',
        color: '#705830',
      }).setOrigin(0.5).setDepth(5);

      const label = id === 'battlefield' ? 'BATTLEFIELD' : 'FINAL DESTINATION';
      const sub   = id === 'battlefield' ? 'floating platforms' : 'single flat stage';

      this.add.text(sx + stageW/2, sy + 24, label, {
        fontSize: '14px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: '#E8D8A0', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(5);

      this.add.text(sx + stageW/2, sy + 46, sub, {
        fontSize: '11px', fontFamily: '"Courier New", monospace',
        color: '#504030',
      }).setOrigin(0.5).setDepth(5);

      return { g, sx, sy, stageW, stageH };
    });

    this._stageGlow = this.add.graphics().setDepth(6);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────

  _drawFooter() {
    const { _W: W, _H: H } = this;

    // Ornamental rule
    this._drawHRule(0, H - 100, W, C.GOLD, 1);
    this._drawHRule(0, H - 97,  W, C.GOLD_DIM, 1);

    this.add.text(W / 2, H - 58, 'W/S = navigate     A/D = select / toggle mode     Q/E = bot difficulty     LEFT/RIGHT = P2', {
      fontSize: '10px', fontFamily: '"Courier New", monospace',
      color: '#706050',
    }).setOrigin(0.5).setDepth(4);

    // Blinking PRESS ENTER prompt
    this._startText = this.add.text(W / 2, H - 28, '- PRESS  ENTER  TO  FIGHT -', {
      fontSize: '16px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#E0C070', stroke: '#050816', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: this._startText, alpha: 0.12,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── Scanlines ─────────────────────────────────────────────────────────────────

  _drawScanlines() {
    const { _W: W, _H: H } = this;
    const g = this.add.graphics().setDepth(999);
    g.fillStyle(C.BLACK, 0.08);
    for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  }

  // ── Floating particles ────────────────────────────────────────────────────────

  _spawnParticles() {
    const { _W: W, _H: H } = this;
    const spawn = () => {
      if (!this.scene.isActive()) return;
      const x   = Phaser.Math.Between(30, W - 30);
      const col = Math.random() > 0.6 ? C.GOLD : C.P1;
      const sz  = Math.random() > 0.7 ? 2 : 1;
      const e   = this.add.rectangle(x, H - 30, sz, sz, col, 0.6).setDepth(3);
      this.tweens.add({
        targets: e,
        y: Phaser.Math.Between(H * 0.05, H * 0.45),
        x: x + Phaser.Math.Between(-50, 50),
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(2000, 5000),
        ease: 'Sine.easeOut',
        onComplete: () => e.destroy(),
      });
      this.time.delayedCall(Phaser.Math.Between(100, 300), spawn);
    };
    spawn();
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(time) {
    const charNames = Object.keys(GAME_CONFIG.CHARACTERS);

    // ENTER — always fires regardless of cooldown
    if (Phaser.Input.Keyboard.JustDown(this._keys.enter)) {
      this._startGame(charNames);
      return;
    }

    if (time - this._lastNav < 160) return;
    const n = charNames.length;
    let changed = false;

    // W / S — move between sections
    if (this._keys.navUp.isDown) {
      this._section = Math.max(0, this._section - 1);
      this._lastNav = time; this._drawSectionCursor(); return;
    }
    if (this._keys.navDn.isDown) {
      this._section = Math.min(2, this._section + 1);
      this._lastNav = time; this._drawSectionCursor(); return;
    }

    // P2 character — LEFT/RIGHT always works
    if (this._keys.p2L.isDown)      { this._p2Sel = (this._p2Sel - 1 + n) % n; changed = true; }
    else if (this._keys.p2R.isDown) { this._p2Sel = (this._p2Sel + 1) % n;     changed = true; }

    // A / D — action depends on focused section
    const left  = this._keys.selL.isDown;
    const right = this._keys.selR.isDown;

    if (this._section === 0) {
      // Character select
      if (left)       { this._p1Sel = (this._p1Sel - 1 + n) % n; changed = true; }
      else if (right) { this._p1Sel = (this._p1Sel + 1) % n;     changed = true; }

    } else if (this._section === 1) {
      // A/D cycles PVP → BOT → ONLINE
      if (left) {
        const modes = ['pvp','bot','online'];
        this._mode = modes[(modes.indexOf(this._mode) - 1 + modes.length) % modes.length];
        this._refreshModeUI(); changed = true;
      } else if (right) {
        const modes = ['pvp','bot','online'];
        this._mode = modes[(modes.indexOf(this._mode) + 1) % modes.length];
        this._refreshModeUI(); changed = true;
      }
    } else if (this._section === 2) {
      // Stage select
      const sLen = GAME_CONFIG.STAGES.length;
      if (left)       { this._stageSel = (this._stageSel - 1 + sLen) % sLen; changed = true; }
      else if (right) { this._stageSel = (this._stageSel + 1) % sLen;        changed = true; }
    }

    // Q/E — difficulty (only when mode section is focused AND bot is active)
    if (this._section === 1 && this._mode === 'bot') {
      if (this._keys.diffL.isDown) {
        this._botLevel = Math.max(1, this._botLevel - 1);
        this._refreshModeUI(); changed = true;
      } else if (this._keys.diffR.isDown) {
        this._botLevel = Math.min(9, this._botLevel + 1);
        this._refreshModeUI(); changed = true;
      }
    }

    if (changed) {
      this._lastNav = time;
      this._updateCards();
      this._updateStageHighlight();
    }
  }

  _updateCards() {
    const charNames = Object.keys(GAME_CONFIG.CHARACTERS);
    const cardW = 130, gap = 12;
    const totalW = charNames.length * (cardW + gap) - gap;
    const startX = (this._W - totalW) / 2;

    this._charCards.forEach((card, i) => {
      const isP1  = i === this._p1Sel;
      const isP2  = i === this._p2Sel;
      const both  = isP1 && isP2;
      const selCol = both ? C.GOLD_HI : isP1 ? C.P1 : isP2 ? C.P2 : card.accentCol;
      card.g.clear();
      this._drawCard(card.g, card.cx, card.cy, card.cardW, card.cardH, selCol, isP1 || isP2);
    });

    const cw = cardW + gap;
    const sx = startX + cardW / 2;
    this._p1Cursor.setPosition(sx + this._p1Sel * cw, 122);
    this._p2Cursor.setPosition(sx + this._p2Sel * cw, 294);
  }

  _updateStageHighlight() {
    const g = this._stageGlow;
    g.clear();
    const card = this._stageCards[this._stageSel];
    // Layered gold glow
    for (let t = 4; t >= 0; t--) {
      g.fillStyle(C.GOLD, 0.04 * (5 - t));
      g.fillRect(card.sx - t, card.sy - t, card.stageW + t*2, card.stageH + t*2);
    }
    g.fillStyle(C.GOLD, 0.9);
    g.fillRect(card.sx,        card.sy,        card.stageW, 1);
    g.fillRect(card.sx,        card.sy + card.stageH - 1, card.stageW, 1);
    g.fillRect(card.sx,        card.sy,        1, card.stageH);
    g.fillRect(card.sx + card.stageW - 1, card.sy, 1, card.stageH);
  }

  // Gold side-bracket that highlights the active section
  _drawSectionCursor() {
    if (!this._sectionCursorG) {
      this._sectionCursorG = this.add.graphics().setDepth(8);
    }
    const g = this._sectionCursorG;
    g.clear();

    // Section bounding boxes [x, y, w, h]
    const W  = this._W;
    const cardH = 162, cardY = 126;
    const bounds = [
      [30,            cardY - 6,  W - 60,  cardH + 18 ],  // 0: characters
      [W/2 - 170,    308,        340,      60          ],  // 1: mode
      [30,            362,        W - 60,  100         ],  // 2: stage
    ];

    const [bx, by, bw, bh] = bounds[this._section];
    const s = 10; // bracket arm length

    g.fillStyle(0xE0C070, 0.85);

    // Top-left bracket
    g.fillRect(bx,     by,     s,  2);
    g.fillRect(bx,     by,     2,  s);
    // Top-right bracket
    g.fillRect(bx+bw-s, by,    s,  2);
    g.fillRect(bx+bw-2, by,    2,  s);
    // Bottom-left bracket
    g.fillRect(bx,      by+bh-2, s,  2);
    g.fillRect(bx,      by+bh-s, 2,  s);
    // Bottom-right bracket
    g.fillRect(bx+bw-s, by+bh-2, s,  2);
    g.fillRect(bx+bw-2, by+bh-s, 2,  s);

    // Tiny diamond at each corner
    g.fillStyle(0xFFD98A, 0.9);
    [[bx, by],[bx+bw, by],[bx, by+bh],[bx+bw, by+bh]].forEach(([cx, cy]) => {
      g.fillRect(cx-2, cy-1, 4, 2);
      g.fillRect(cx-1, cy-2, 2, 4);
    });
  }

  _startGame(charNames) {
    if (this._mode === 'online') {
      this._showLobby(charNames);
      return;
    }
    this._launchGame(charNames, null, false);
  }

  _launchGame(charNames, netMgr, netIsHost) {
    this.scene.start('GameScene', {
      p1Char:     charNames[this._p1Sel],
      p2Char:     charNames[this._p2Sel],
      stage:      GAME_CONFIG.STAGES[this._stageSel],
      mode:       netMgr ? 'online' : this._mode,
      botLevel:   this._botLevel,
      netMgr:     netMgr,
      netIsHost:  netIsHost,
    });
    this.scene.launch('UIScene');
  }

  // ── Multiplayer lobby overlay ─────────────────────────────────────────────

  _showLobby(charNames) {
    const W = this._W, H = this._H;
    const pw = 420, ph = 300, px = W/2 - pw/2, py = H/2 - ph/2;
    const group = [];
    let   _joinKeyHandler = null;
    let   _escHandler     = null;

    const addToGroup = (obj) => { group.push(obj); return obj; };
    const destroy = () => {
      group.forEach(o => { try { o.destroy(); } catch(_){} });
      if (_joinKeyHandler) { this.input.keyboard.off('keydown', _joinKeyHandler); _joinKeyHandler = null; }
      if (_escHandler)     { this.input.keyboard.off('keydown-ESC', _escHandler); _escHandler = null; }
    };

    // Dim background
    addToGroup(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75).setDepth(200));

    // Panel
    const pg = addToGroup(this.add.graphics().setDepth(201));
    pg.fillStyle(0x050816, 0.98); pg.fillRect(px, py, pw, ph);
    pg.fillStyle(0xE0C070, 0.85);
    pg.fillRect(px, py, pw, 2); pg.fillRect(px, py+ph-2, pw, 2);
    pg.fillRect(px, py, 2, ph); pg.fillRect(px+pw-2, py, 2, ph);

    addToGroup(this.add.text(W/2, py+28, 'ONLINE  MULTIPLAYER', {
      fontSize:'16px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
      color:'#FFD98A', stroke:'#000000', strokeThickness:4,
    }).setOrigin(0.5).setDepth(202));

    // HOST button
    const hostBtn = addToGroup(this.add.text(W/2 - 80, py+80, '[ HOST ]', {
      fontSize:'18px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
      color:'#E0C070', stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor:true }));

    // JOIN button
    const joinBtn = addToGroup(this.add.text(W/2 + 80, py+80, '[ JOIN ]', {
      fontSize:'18px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
      color:'#E0C070', stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor:true }));

    const statusTxt = addToGroup(this.add.text(W/2, py+140, '', {
      fontSize:'14px', fontFamily:'"Courier New", monospace',
      color:'#FFD98A', stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5).setDepth(202));

    const codeTxt = addToGroup(this.add.text(W/2, py+185, '', {
      fontSize:'28px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
      color:'#4AB5C9', stroke:'#000000', strokeThickness:6,
    }).setOrigin(0.5).setDepth(202));

    const cancelTxt = addToGroup(this.add.text(W/2, py+ph-24, 'ESC = cancel', {
      fontSize:'11px', fontFamily:'"Courier New", monospace', color:'#504030',
    }).setOrigin(0.5).setDepth(202));

    // Generate a random 4-letter room code
    const makeCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };

    // ── HOST flow ────────────────────────────────────────────────────────────
    hostBtn.on('pointerdown', () => {
      hostBtn.setVisible(false); joinBtn.setVisible(false);
      const code = makeCode();
      statusTxt.setText('Waiting for player to join...');
      codeTxt.setText(`Code:  ${code}`);

      const net = new NetworkManager();
      net.host(code, () => {
        // Connected — launch game
        statusTxt.setText('Player connected!');
        this.time.delayedCall(500, () => {
          destroy();
          this._launchGame(charNames, net, true);
        });
      }, (err) => { statusTxt.setText(`Error: ${err}`); });
    });

    // ── JOIN flow ────────────────────────────────────────────────────────────
    let typedCode = '';
    joinBtn.on('pointerdown', () => {
      hostBtn.setVisible(false); joinBtn.setVisible(false);
      statusTxt.setText('Type the 4-letter code:');
      codeTxt.setText('_ _ _ _');

      _joinKeyHandler = (e) => {
        if (e.key === 'Escape') return;
        if (e.key === 'Backspace') {
          typedCode = typedCode.slice(0, -1);
        } else if (/^[a-zA-Z]$/.test(e.key) && typedCode.length < 4) {
          typedCode += e.key.toUpperCase();
        }
        const display = typedCode.split('').concat(['_','_','_','_']).slice(0,4).join(' ');
        codeTxt.setText(display);

        if (typedCode.length === 4) {
          statusTxt.setText('Connecting...');
          this.input.keyboard.off('keydown', _joinKeyHandler);
          _joinKeyHandler = null;

          const net = new NetworkManager();
          net.join(typedCode, () => {
            statusTxt.setText('Connected!');
            this.time.delayedCall(500, () => {
              destroy();
              this._launchGame(charNames, net, false);
            });
          }, () => {
            statusTxt.setText('Failed — check code and try again');
            typedCode = '';
            codeTxt.setText('_ _ _ _');
            this.input.keyboard.on('keydown', _joinKeyHandler);
          });
        }
      };
      this.input.keyboard.on('keydown', _joinKeyHandler);
    });

    // ESC to cancel
    _escHandler = () => { destroy(); };
    this.input.keyboard.once('keydown-ESC', _escHandler);
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────────

  _drawCard(g, x, y, w, h, accentCol, selected) {
    // Background
    g.fillStyle(selected ? 0x0C1428 : C.PANEL);
    g.fillRect(x, y, w, h);

    // Subtle accent tint on selected
    if (selected) {
      g.fillStyle(accentCol, 0.08);
      g.fillRect(x, y, w, h);
    }

    // Outer border
    const bc = selected ? accentCol : C.BORDER;
    g.fillStyle(bc, selected ? 0.9 : 0.5);
    g.fillRect(x,     y,     w, 1);
    g.fillRect(x,     y+h-1, w, 1);
    g.fillRect(x,     y,     1, h);
    g.fillRect(x+w-1, y,     1, h);

    // Gold inner inset (selected only)
    if (selected) {
      g.fillStyle(accentCol, 0.35);
      g.fillRect(x+2, y+2,   w-4, 1);
      g.fillRect(x+2, y+h-3, w-4, 1);
      g.fillRect(x+2, y+2,   1,   h-4);
      g.fillRect(x+w-3, y+2, 1,   h-4);
      // Glow top stripe
      g.fillStyle(accentCol, 0.5);
      g.fillRect(x+3, y+3, w-6, 2);
    }

    // Corner ornaments (always shown)
    this._corners(g, x + 1, y + 1, x + w - 1, y + h - 1, C.GOLD, selected ? 0.7 : 0.3);
  }

  _corners(g, x1, y1, x2, y2, color, alpha) {
    const s = 8;
    [[x1, y1], [x2 - s, y1], [x1, y2 - s], [x2 - s, y2 - s]].forEach(([ox, oy]) => {
      g.fillStyle(color, alpha);
      g.fillRect(ox + 3, oy,     2, s);
      g.fillRect(ox,     oy + 3, s, 2);
    });
  }

  _drawHRule(x, y, w, color, h = 1) {
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(color, 0.7);
    g.fillRect(x, y, w, h);
    // Center diamond accent
    if (w > 100) {
      const mx = x + w / 2;
      g.fillStyle(C.GOLD, 0.9);
      g.fillRect(mx - 5, y - 2, 10, h + 4);
      g.fillStyle(C.GOLD_HI, 0.95);
      g.fillRect(mx - 2, y - 1, 4, h + 2);
      // Flanking marks
      [-90, -45, 45, 90].forEach(off => {
        g.fillStyle(C.GOLD_DIM, 0.6);
        g.fillRect(mx + off - 2, y - 1, 5, h + 2);
      });
    }
  }

  _sectionLabel(x, y, text) {
    const lbl = this.add.graphics().setDepth(3);
    const tw  = text.length * 8 + 32;
    lbl.fillStyle(C.PANEL, 0.9);
    lbl.fillRect(x - tw/2, y - 10, tw, 20);
    lbl.fillStyle(C.GOLD_DIM, 0.7);
    lbl.fillRect(x - tw/2, y - 10, tw, 1);
    lbl.fillRect(x - tw/2, y + 9,  tw, 1);

    this.add.text(x, y, text, {
      fontSize: '12px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#705830',
    }).setOrigin(0.5).setDepth(4);
  }

  _makeCursorText(color, label) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(0, 0, label, {
      fontSize: '11px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: hex, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(7);
    this.tweens.add({ targets: t, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
    return t;
  }

  _charAccent(name) {
    const map = {
      Naruto:  0x4AB5C9,
      Goku:    0xFF6622,
      Ichigo:  0x5588BB,
      Luffy:   0xCC3322,
      Tanjiro: 0x22AA55,
      Warrior: 0xAA44CC,
    };
    return map[name] || C.GOLD;
  }

  _seedRng(s) { this._rs = s; }
  _rng() {
    this._rs = (this._rs * 1664525 + 1013904223) & 0xffffffff;
    return (this._rs >>> 0) / 0xffffffff;
  }
}
