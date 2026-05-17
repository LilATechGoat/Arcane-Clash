/* global HUD, GAME_CONFIG */

// â”€â”€ Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HC = {
  BG:        0x050816,
  PANEL:     0x0A1020,
  GOLD:      0xE0C070,
  GOLD_HI:   0xFFD98A,
  ACCENT:    0x1A2A44,
  P1:        0x4AB5C9,
  P2:        0xCC5533,
  WARN:      0xA83A3A,
  BLACK:     0x000000,
  WHITE:     0xFFFFFF,
  DARK:      0x020509,
};

class HUD extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  setCharacters(chars) {
    this.characters = chars;
    if (this.sys.isActive()) this._buildUI();
  }

  create() {
    this.characters  = [];
    this._built      = false;
    this._paused     = false;
    this._pauseSel   = 0;
    this._p1Dmg      = null;
    this._p2Dmg      = null;
    this._p1Stocks   = [];
    this._p2Stocks   = [];
    this._p1DmgVal   = 0;
    this._p2DmgVal   = 0;
    this._pauseGroup = [];

    const gs = this.scene.get('GameScene');
    gs.events.once('gameReady',   chars => this.setCharacters(chars));
    gs.events.on('characterDied', this._onDeath,    this);
    gs.events.on('gameOver',      this._onGameOver, this);

    // Escape key — toggle pause
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._gameOver) return;
      this._paused ? this._resumeGame() : this._showPause();
    });
  }

  update() {
    if (!this._built) {
      const gs = this.scene.get('GameScene');
      if (gs?.p1 && gs?.p2) { this.characters = [gs.p1, gs.p2]; this._buildUI(); }
      return;
    }
    if (!this.characters.length) return;
    if (!this._paused) {
      this._refreshDamage(0);
      this._refreshDamage(1);
    }
  }

  // ── Pause ─────────────────────────────────────────────────────────────────────

  _showPause() {
    this._paused   = true;
    this._pauseSel = 0;
    this.scene.pause('GameScene');

    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    const pw = 360, ph = 260, px = W/2 - pw/2, py = H/2 - ph/2;

    const overlay = this.add.rectangle(W/2, H/2, W, H, HC.BLACK, 0.72).setDepth(300);

    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(HC.BG, 0.98);
    panel.fillRect(px, py, pw, ph);
    panel.fillStyle(HC.GOLD, 0.9);
    panel.fillRect(px,       py,       pw, 2);
    panel.fillRect(px,       py+ph-2,  pw, 2);
    panel.fillRect(px,       py,       2, ph);
    panel.fillRect(px+pw-2,  py,       2, ph);
    panel.fillStyle(HC.ACCENT, 1);
    panel.fillRect(px+5, py+5,    pw-10, 1);
    panel.fillRect(px+5, py+ph-6, pw-10, 1);
    [[px+2,py+2],[px+pw-12,py+2],[px+2,py+ph-12],[px+pw-12,py+ph-12]].forEach(([ox,oy])=>{
      panel.fillStyle(HC.GOLD, 0.7);
      panel.fillRect(ox+3, oy, 2, 8);
      panel.fillRect(ox, oy+3, 8, 2);
    });

    const title = this.add.text(W/2, py+36, 'PAUSED', {
      fontSize:'28px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
      color:'#FFD98A', stroke:'#000000', strokeThickness:6,
    }).setOrigin(0.5).setDepth(302);

    const dg = this.add.graphics().setDepth(302);
    dg.fillStyle(HC.GOLD, 0.4);
    dg.fillRect(px+30, py+58, pw-60, 1);

    const options  = ['RESUME', 'MAIN MENU'];
    const optTexts = options.map((label, i) =>
      this.add.text(W/2, py+100+i*60, label, {
        fontSize:'20px', fontFamily:'"Courier New", monospace', fontStyle:'bold',
        color:'#E0C070', stroke:'#000000', strokeThickness:4,
      }).setOrigin(0.5).setDepth(302)
    );

    const cursorG = this.add.graphics().setDepth(302);
    const drawCursor = (sel) => {
      cursorG.clear();
      optTexts.forEach((t, i) => {
        t.setColor(i === sel ? '#FFD98A' : '#504030');
        t.setAlpha(i === sel ? 1.0 : 0.5);
      });
      // Fixed-offset diamond — doesn't depend on text width
      const bx = W/2 - 110;
      const by = optTexts[sel].y;
      cursorG.fillStyle(HC.P1, 0.9);
      for (let row = -4; row <= 4; row++) {
        const hw = 4 - Math.abs(row);
        if (hw >= 0) cursorG.fillRect(bx - hw, by + row, hw*2+1, 1);
      }
    };
    drawCursor(0);

    // Store callback so we can remove it properly
    this._pauseNavCallback = (e) => {
      if (!this._paused) return;
      const k = e.keyCode;
      if (k === 38 || k === 87) {           // UP / W
        this._pauseSel = (this._pauseSel - 1 + options.length) % options.length;
        drawCursor(this._pauseSel);
      } else if (k === 40 || k === 83) {    // DOWN / S
        this._pauseSel = (this._pauseSel + 1) % options.length;
        drawCursor(this._pauseSel);
      } else if (k === 13) {                // ENTER
        if (this._pauseSel === 0) this._resumeGame();
        else                      this._goToMenu();
      }
    };
    this.input.keyboard.on('keydown', this._pauseNavCallback);

    this._pauseGroup = [overlay, panel, title, dg, cursorG, ...optTexts];
  }

  _resumeGame() {
    this._paused = false;
    this._pauseGroup.forEach(o => { try { o.destroy(); } catch(_){} });
    this._pauseGroup = [];
    if (this._pauseNavCallback) {
      this.input.keyboard.off('keydown', this._pauseNavCallback);
      this._pauseNavCallback = null;
    }
    this.scene.resume('GameScene');
  }

  _goToMenu() {
    this._paused = false;
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }

  // â”€â”€ Build â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _buildUI() {
    if (this._built) return;
    this._built = true;

    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    const p1Cfg  = GAME_CONFIG.SPRITE_CONFIG?.[this.characters[0]?.constructor.name?.replace('Character','')];
    const p2Cfg  = GAME_CONFIG.SPRITE_CONFIG?.[this.characters[1]?.constructor.name?.replace('Character','')];
    const p1Name = p1Cfg?.displayName || 'P1';
    const p2Name = p2Cfg?.displayName || 'P2';

    this._drawTopBar(W, p1Name, p2Name);
    this._drawBottomHUD(W, H, p1Name, p2Name);
  }

  // â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _drawTopBar(W, p1Name, p2Name) {
    const H_BAR = 30;
    const g = this.add.graphics().setDepth(90);

    // Background
    g.fillStyle(HC.BG, 0.97);
    g.fillRect(0, 0, W, H_BAR);

    // Gold bottom border with glow lines
    g.fillStyle(HC.GOLD, 0.9);
    g.fillRect(0, H_BAR - 2, W, 1);
    g.fillStyle(HC.GOLD_HI, 0.3);
    g.fillRect(0, H_BAR - 1, W, 1);

    // Faint inner accent line
    g.fillStyle(HC.ACCENT, 1.0);
    g.fillRect(0, H_BAR - 4, W, 1);

    // Center VS medallion
    const mx = W / 2;
    const mw = 80, mh = H_BAR;
    g.fillStyle(HC.PANEL, 1.0);
    g.fillRect(mx - mw/2, 0, mw, mh);
    // Gold side edges of medallion
    g.fillStyle(HC.GOLD, 0.8);
    g.fillRect(mx - mw/2,     0, 2, mh);
    g.fillRect(mx + mw/2 - 2, 0, 2, mh);
    // Corner diamonds
    [mx - mw/2 - 4, mx + mw/2 + 1].forEach(dx => {
      g.fillStyle(HC.GOLD, 0.7);
      g.fillRect(dx + 1, mh/2 - 3, 2, 6);
      g.fillRect(dx - 1, mh/2 - 1, 6, 2);
    });

    // Corner ornaments top-left + top-right
    [[6, 4], [W - 15, 4]].forEach(([ox, oy]) => {
      g.fillStyle(HC.GOLD, 0.55);
      g.fillRect(ox + 3, oy,     2, 7);
      g.fillRect(ox,     oy + 3, 7, 2);
    });

    // Player name stripes
    g.fillStyle(HC.P1, 0.15);
    g.fillRect(0, 0, W/2 - mw/2, H_BAR);
    g.fillStyle(HC.P2, 0.15);
    g.fillRect(W/2 + mw/2, 0, W/2 - mw/2, H_BAR);

    // Thin player color accent bottom
    g.fillStyle(HC.P1, 0.7);
    g.fillRect(0, H_BAR - 3, W/2 - mw/2, 1);
    g.fillStyle(HC.P2, 0.7);
    g.fillRect(W/2 + mw/2, H_BAR - 3, W/2 - mw/2, 1);

    // Text
    this.add.text(18, H_BAR / 2, `â—†  ${p1Name}`, {
      fontSize: '12px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#4AB5C9', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(91);

    this.add.text(W - 18, H_BAR / 2, `${p2Name}  â—†`, {
      fontSize: '12px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#FF8866', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(91);

    this.add.text(mx, H_BAR / 2, 'VS', {
      fontSize: '11px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#E0C070', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(91);
  }

  // â”€â”€ Bottom Smash-Style HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _drawBottomHUD(W, H, p1Name, p2Name) {
    const hudH  = 88;
    const hudY  = H - hudH;
    const p1cx  = Math.floor(W * 0.20);
    const p2cx  = Math.floor(W * 0.80);
    const stocks = GAME_CONFIG.STARTING_STOCKS;

    // Full-width background strip
    const bg = this.add.graphics().setDepth(90);
    bg.fillStyle(HC.BG, 0.97);
    bg.fillRect(0, hudY, W, hudH);

    // Gold top border
    bg.fillStyle(HC.GOLD, 0.85);
    bg.fillRect(0, hudY, W, 1);
    bg.fillStyle(HC.GOLD_HI, 0.35);
    bg.fillRect(0, hudY + 1, W, 1);
    bg.fillStyle(HC.ACCENT, 1);
    bg.fillRect(0, hudY + 3, W, 1);

    // Vertical dividers â€” thin gold lines separating zones
    [W/2].forEach(x => {
      bg.fillStyle(HC.GOLD, 0.25);
      bg.fillRect(x - 1, hudY + 8, 1, hudH - 16);
    });

    // Player panel insets
    this._drawHUDPanel(bg, p1cx - 90, hudY + 8,  180, hudH - 16, HC.P1);
    this._drawHUDPanel(bg, p2cx - 90, hudY + 8,  180, hudH - 16, HC.P2);

    // Center fight label
    const cg = this.add.graphics().setDepth(91);
    const cw = 100, ch = 22, cx = W/2, cy = hudY + hudH/2;
    cg.fillStyle(HC.PANEL, 1.0);
    cg.fillRect(cx - cw/2, cy - ch/2, cw, ch);
    cg.fillStyle(HC.GOLD, 0.7);
    cg.fillRect(cx - cw/2,     cy - ch/2, cw, 1);
    cg.fillRect(cx - cw/2,     cy + ch/2 - 1, cw, 1);
    cg.fillRect(cx - cw/2,     cy - ch/2, 1, ch);
    cg.fillRect(cx + cw/2 - 1, cy - ch/2, 1, ch);
    // Corner diamonds
    [[cx - cw/2 - 3, cy], [cx + cw/2 + 2, cy]].forEach(([dx, dy]) => {
      cg.fillStyle(HC.GOLD, 0.6);
      cg.fillRect(dx,     dy - 3, 2, 6);
      cg.fillRect(dx - 2, dy - 1, 6, 2);
    });
    this.add.text(cx, cy, '[ FIGHT ]', {
      fontSize: '11px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#E0C070', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(92);

    // Name labels (small, above % number)
    this.add.text(p1cx, hudY + 18, p1Name, {
      fontSize: '10px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#4AB5C9', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(92);

    this.add.text(p2cx, hudY + 18, p2Name, {
      fontSize: '10px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#FF8866', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(92);

    // Damage % text â€” large, Smash-style
    this._p1Dmg = this.add.text(p1cx, hudY + 44, '0%', {
      fontSize: '38px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#FFD98A', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(92);

    this._p2Dmg = this.add.text(p2cx, hudY + 44, '0%', {
      fontSize: '38px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
      color: '#FFD98A', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(92);

    // Stock diamonds
    const stockY = hudY + 70;
    for (let i = 0; i < stocks; i++) {
      const sx1 = p1cx - ((stocks - 1) * 9) + i * 18;
      const sx2 = p2cx - ((stocks - 1) * 9) + i * 18;
      this._p1Stocks.push(this._makeStockDiamond(sx1, stockY, HC.P1,  true));
      this._p2Stocks.push(this._makeStockDiamond(sx2, stockY, HC.P2,  true));
    }
  }

  _drawHUDPanel(g, x, y, w, h, accentCol) {
    // Subtle tinted background
    g.fillStyle(accentCol, 0.06);
    g.fillRect(x, y, w, h);

    // Thin gold outer border
    g.fillStyle(HC.GOLD, 0.5);
    g.fillRect(x,     y,     w, 1);
    g.fillRect(x,     y+h-1, w, 1);
    g.fillRect(x,     y,     1, h);
    g.fillRect(x+w-1, y,     1, h);

    // Player-color inner accent line
    g.fillStyle(accentCol, 0.5);
    g.fillRect(x + 2, y + 2, w - 4, 1);
    g.fillRect(x + 2, y + h - 3, w - 4, 1);

    // Corner ornaments
    [[x+1, y+1], [x+w-8, y+1], [x+1, y+h-8], [x+w-8, y+h-8]].forEach(([cx, cy]) => {
      g.fillStyle(HC.GOLD, 0.5);
      g.fillRect(cx + 2, cy,     2, 5);
      g.fillRect(cx,     cy + 2, 5, 2);
    });
  }

  // â”€â”€ Stock diamond (drawn with graphics) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _makeStockDiamond(cx, cy, color, active) {
    const g = this.add.graphics().setDepth(92);
    this._drawDiamond(g, cx, cy, color, active);
    return { g, cx, cy, color };
  }

  // Pure fillRect pixel-art diamond â€” no strokeTriangle (not in Phaser 4)
  _drawDiamond(g, cx, cy, color, active) {
    g.clear();
    const r = 5;

    // Gold/dim border â€” one pixel larger than fill
    g.fillStyle(HC.GOLD, active ? 0.75 : 0.2);
    for (let row = -(r + 1); row <= (r + 1); row++) {
      const hw = (r + 1) - Math.abs(row);
      if (hw > 0) g.fillRect(cx - hw, cy + row, hw * 2, 1);
    }

    // Inner fill
    g.fillStyle(color, active ? 1.0 : 0.2);
    for (let row = -r; row <= r; row++) {
      const hw = r - Math.abs(row);
      if (hw > 0) g.fillRect(cx - hw, cy + row, hw * 2, 1);
    }

    // Shine on active
    if (active) {
      g.fillStyle(HC.WHITE, 0.45);
      g.fillRect(cx - 1, cy - r + 1, 2, 2);
    }
  }

  // â”€â”€ Refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _refreshDamage(pid) {
    const char = this.characters[pid];
    if (!char) return;
    const pct = Math.floor(char.damage);

    const text = pid === 0 ? this._p1Dmg : this._p2Dmg;
    const prev = pid === 0 ? this._p1DmgVal : this._p2DmgVal;
    if (!text) return;

    // Color based on damage level
    const col = pct >= 150 ? '#FF3311'
              : pct >= 100 ? '#FF7722'
              : pct >= 50  ? '#FFBB44'
              :               '#FFD98A';
    text.setText(`${pct}%`).setColor(col);

    // Flash on new damage
    if (pct > prev) {
      this.tweens.add({ targets: text, scaleX: 1.18, scaleY: 1.18,
        duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      if (pid === 0) this._p1DmgVal = pct;
      else           this._p2DmgVal = pct;
    }

    // Sync stocks
    const stocks = pid === 0 ? this._p1Stocks : this._p2Stocks;
    this._syncStocks(stocks, char.stocks);
  }

  _syncStocks(icons, remaining) {
    icons.forEach((s, i) => {
      this._drawDiamond(s.g, s.cx, s.cy, s.color, i < remaining);
    });
  }

  // â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _onDeath({ char }) {
    if (!this._built) return;
    const icons = char.playerId === 0 ? this._p1Stocks : this._p2Stocks;
    // stocks is already decremented â€” the lost stock was at index [stocks]
    const lost = icons[char.stocks];
    if (!lost) return;
    this._drawDiamond(lost.g, lost.cx, lost.cy, HC.WHITE, true);
    this.time.delayedCall(140, () => {
      this._drawDiamond(lost.g, lost.cx, lost.cy, lost.color, false);
    });
  }

  _onGameOver({ loser }) {
    this._gameOver = true;
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    const isP1Win   = loser.playerId !== 0;
    const winner    = isP1Win ? 'PLAYER  1' : 'PLAYER  2';
    const wCol      = isP1Win ? HC.P1         : HC.P2;
    const wColHex   = isP1Win ? '#4AB5C9'    : '#FF8866';

    // Dark overlay
    const overlay = this.add.rectangle(W/2, H/2, W, H, HC.BLACK, 0).setDepth(200);
    this.tweens.add({ targets: overlay, fillAlpha: 0.85, duration: 700 });

    this.time.delayedCall(500, () => {
      const pw = 580, ph = 200;
      const px = W/2 - pw/2, py = H/2 - ph/2;
      const g  = this.add.graphics().setDepth(201);

      // Panel background
      g.fillStyle(HC.BG, 0.99);
      g.fillRect(px, py, pw, ph);

      // Outer gold border
      g.fillStyle(HC.GOLD, 0.85);
      g.fillRect(px,        py,        pw, 2);
      g.fillRect(px,        py+ph-2,   pw, 2);
      g.fillRect(px,        py,        2, ph);
      g.fillRect(px+pw-2,   py,        2, ph);

      // Player-color inner accent
      g.fillStyle(wCol, 0.6);
      g.fillRect(px + 5, py + 5,    pw - 10, 1);
      g.fillRect(px + 5, py+ph - 6, pw - 10, 1);

      // Inner dark inset
      g.fillStyle(HC.PANEL, 0.6);
      g.fillRect(px + 8, py + 8, pw - 16, ph - 16);

      // Corner cross ornaments
      [[px+2, py+2], [px+pw-11, py+2], [px+2, py+ph-11], [px+pw-11, py+ph-11]]
        .forEach(([ox, oy]) => {
          g.fillStyle(HC.GOLD, 0.75);
          g.fillRect(ox+3, oy,     3, 9);
          g.fillRect(ox,   oy+3,   9, 3);
          g.fillStyle(HC.GOLD_HI, 0.9);
          g.fillRect(ox+4, oy+1,   1, 1);
        });

      // Decorative horizontal rune lines
      g.fillStyle(HC.GOLD, 0.2);
      g.fillRect(px + 20, py + ph/2 - 2, pw - 40, 1);
      g.fillRect(px + 20, py + ph/2 + 2, pw - 40, 1);

      this.add.text(W/2, py + 30, 'âœ¦  V I C T O R Y  âœ¦', {
        fontSize: '16px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: '#E0C070', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(202);

      // Thin divider
      const dg = this.add.graphics().setDepth(202);
      dg.fillStyle(HC.GOLD, 0.5);
      dg.fillRect(px + 30, py + 52, pw - 60, 1);
      dg.fillStyle(HC.GOLD_HI, 0.9);
      dg.fillRect(W/2 - 4, py + 48, 8, 8);

      this.add.text(W/2, H/2 + 4, winner, {
        fontSize: '54px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: wColHex, stroke: '#000000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(202);

      this.add.text(W/2, py + ph - 46, 'W  I  N  S', {
        fontSize: '18px', fontFamily: '"Courier New", monospace', fontStyle: 'bold',
        color: '#E0C070', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(202);

      // Thin divider
      dg.fillStyle(HC.GOLD, 0.35);
      dg.fillRect(px + 30, py + ph - 28, pw - 60, 1);

      const cont = this.add.text(W/2, py + ph - 14, 'â—†  press  R  to  continue  â—†', {
        fontSize: '11px', fontFamily: '"Courier New", monospace',
        color: '#5A6A44',
      }).setOrigin(0.5).setDepth(202);
      this.tweens.add({ targets: cont, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

      this.input.keyboard.once('keydown-R', () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      });
    });
  }
}


