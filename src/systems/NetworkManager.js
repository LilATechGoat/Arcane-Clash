/**
 * @file NetworkManager.js
 * PeerJS wrapper supporting 2-6 players.
 * Host accepts multiple connections; each guest gets a slot (1-5).
 * Lobby phase syncs character picks. Game phase: host broadcasts
 * authoritative state, guests send inputs.
 */

/* global NetworkManager */

// ── Per-slot input adapter — plugs into InputManager like a BotController ───

class SlotInputAdapter {
  constructor(net, slot) {
    this._net  = net;
    this._slot = slot;
  }
  axisX()  { return this._net._remoteInputs[this._slot]?.axisX  ?? 0; }
  axisY()  { return this._net._remoteInputs[this._slot]?.axisY  ?? 0; }
  isHeld(a) {
    return this._net._remoteInputs[this._slot]?.held[a]  || false;
  }
  justPressed(a) {
    const ri = this._net._remoteInputs[this._slot];
    return !!(ri?.held[a] && !ri?.prev[a]);
  }
  consumeBuffer(a) {
    const ri = this._net._remoteInputs[this._slot];
    if (ri?.held[a] && !ri?.prev[a]) { ri.prev[a] = true; return true; }
    return false;
  }
}

// ── NetworkManager ────────────────────────────────────────────────────────────

class NetworkManager {
  constructor() {
    this._peer       = null;
    this.isHost      = false;
    this.mySlot      = 0;
    this.myCharName  = 'Naruto';

    // Host only: map of slot → { conn, charName }
    this._slots      = {};
    this._nextSlot   = 1;
    this._maxGuests  = 5;

    // Guest only: connection to host
    this._hostConn   = null;

    // Shared
    this.isConnected  = false;
    this.lobbyPlayers = [];   // [{slot, charName, name}]
    this.pendingState = null; // buffered game state packet

    // Remote inputs by slot (host uses these for guests)
    this._remoteInputs = {};  // { slot: {held, prev, axisX, axisY} }

    // Callbacks
    this.onLobbyUpdate = null;
    this.onGameStart   = null;
    this.onDisconnect  = null;
  }

  // ── HOST ──────────────────────────────────────────────────────────────────

  host(code, charName, onReady, onError) {
    this.isHost     = true;
    this.mySlot     = 0;
    this.myCharName = charName;
    this._peer      = new Peer(`ac-${code.toLowerCase()}`);

    this._peer.on('error', e => {
      onError?.(e.type === 'unavailable-id' ? 'Code taken — try another' : e.message);
    });

    this._peer.on('open', () => {
      this._updateLobby();
      onReady?.();
    });

    this._peer.on('connection', conn => {
      if (Object.keys(this._slots).length >= this._maxGuests) {
        conn.close(); return;
      }
      const slot = this._nextSlot++;
      this._slots[slot]       = { conn, charName: 'Naruto' };
      this._remoteInputs[slot] = { held:{}, prev:{}, axisX:0, axisY:0 };

      conn.on('open', () => {
        conn.send({ t:'welcome', slot, lobby: this._buildLobby() });
        this._updateLobby();
      });

      conn.on('data', data => {
        if (data.t === 'char') {
          if (this._slots[slot]) {
            this._slots[slot].charName = data.charName;
            this._updateLobby();
          }
        } else if (data.t === 'input') {
          const ri = this._remoteInputs[slot];
          if (ri) {
            ri.prev  = { ...ri.held };
            ri.held  = data.held  || {};
            ri.axisX = data.axisX ?? 0;
            ri.axisY = data.axisY ?? 0;
          }
        }
      });

      conn.on('close', () => {
        delete this._slots[slot];
        delete this._remoteInputs[slot];
        this._updateLobby();
        this.onDisconnect?.(slot);
      });
    });
  }

  startGame(stage) {
    const players = this._buildLobby();
    this._broadcast({ t:'start', players, stage });
    this.isConnected = true;
    this.onGameStart?.(players, stage);
  }

  // ── GUEST ─────────────────────────────────────────────────────────────────

  join(code, charName, onJoined, onError) {
    this.isHost     = false;
    this.myCharName = charName;
    this._peer      = new Peer();

    this._peer.on('error', e => onError?.(e.message));

    this._peer.on('open', () => {
      this._hostConn = this._peer.connect(`ac-${code.toLowerCase()}`);

      this._hostConn.on('open', () => { onJoined?.(); });

      this._hostConn.on('data', data => {
        if (data.t === 'welcome') {
          this.mySlot = data.slot;
          this.lobbyPlayers = data.lobby;
          this.onLobbyUpdate?.(data.lobby);
          // Tell host our character right away
          this._hostConn.send({ t:'char', charName: this.myCharName });
        } else if (data.t === 'lobby') {
          this.lobbyPlayers = data.players;
          this.onLobbyUpdate?.(data.players);
        } else if (data.t === 'start') {
          this.isConnected = true;
          this.onGameStart?.(data.players, data.stage);
        } else if (data.t === 's') {
          this.pendingState = data;
        }
      });

      this._hostConn.on('error', e => onError?.(e.message));
      this._hostConn.on('close', () => {
        this.isConnected = false;
        this.onDisconnect?.(-1);
      });
    });
  }

  // ── Lobby: change character ───────────────────────────────────────────────

  changeChar(charName) {
    this.myCharName = charName;
    if (this.isHost) {
      this._updateLobby();
    } else if (this._hostConn?.open) {
      this._hostConn.send({ t:'char', charName });
    }
  }

  // ── Game phase ────────────────────────────────────────────────────────────

  sendInput(axisX, axisY, held) {
    if (this._hostConn?.open) {
      this._hostConn.send({ t:'input', axisX, axisY, held });
    }
  }

  sendStateToAll(chars) {
    this._broadcast({
      t: 's',
      c: chars.map(ch => ({
        x:  Math.round(ch.x),     y:  Math.round(ch.y),
        vx: Math.round(ch.vel.x), vy: Math.round(ch.vel.y),
        d: ch.damage, s: ch.stocks, f: ch.facing,
        a: ch.renderer?.state || 'idle',   // animation state
        at: ch.isAttacking ? 1 : 0,        // attacking flag
      })),
    });
  }

  getSlotAdapter(slot) {
    return new SlotInputAdapter(this, slot);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _buildLobby() {
    const list = [{ slot:0, charName:this.myCharName, name:'P1' }];
    for (const [s, info] of Object.entries(this._slots)) {
      list.push({ slot:+s, charName:info.charName, name:`P${+s+1}` });
    }
    return list.sort((a,b) => a.slot - b.slot);
  }

  _updateLobby() {
    const players = this._buildLobby();
    this.lobbyPlayers = players;
    this.onLobbyUpdate?.(players);
    this._broadcast({ t:'lobby', players });
  }

  _broadcast(data) {
    for (const { conn } of Object.values(this._slots)) {
      if (conn?.open) conn.send(data);
    }
  }

  get playerCount() { return 1 + Object.keys(this._slots).length; }

  destroy() {
    for (const { conn } of Object.values(this._slots)) conn?.close();
    this._hostConn?.close();
    this._peer?.destroy();
    this._slots = {}; this._hostConn = null; this._peer = null;
    this.isConnected = false;
  }
}
