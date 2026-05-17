/**
 * @file NetworkManager.js
 * PeerJS wrapper — host generates a 4-letter code, guest types it in.
 * Sends input state each frame; both sides run the full simulation.
 */

/* global NetworkManager */

class NetworkManager {
  constructor() {
    this._peer          = null;
    this._conn          = null;
    this.isHost         = false;
    this.isConnected    = false;
    this._inputCallback = null;
    this._remoteHeld    = {};
    this._remotePrev    = {};
    this._remoteAxisX   = 0;
    this._remoteAxisY   = 0;
  }

  // ── Host: create peer with a chosen code ──────────────────────────────────

  host(code, onConnected, onError) {
    this.isHost = true;
    const id = `ac-${code.toLowerCase()}`;
    this._peer = new Peer(id);

    this._peer.on('error', e => {
      onError?.(e.type === 'unavailable-id' ? 'Code taken — try another' : e.message);
    });

    this._peer.on('connection', conn => {
      this._conn = conn;
      this._setupConn();
      conn.on('open', () => {
        this.isConnected = true;
        onConnected?.();
      });
    });
  }

  // ── Guest: connect to a host code ────────────────────────────────────────

  join(code, onConnected, onError) {
    this.isHost = false;
    this._peer  = new Peer();

    this._peer.on('error', e => onError?.(e.message));

    this._peer.on('open', () => {
      this._conn = this._peer.connect(`ac-${code.toLowerCase()}`, { reliable: false });

      this._conn.on('open', () => {
        this._setupConn();
        this.isConnected = true;
        onConnected?.();
      });

      this._conn.on('error', e => onError?.(e.message));
    });
  }

  // ── Connection setup ──────────────────────────────────────────────────────

  _setupConn() {
    this._conn.on('data', data => {
      this._remotePrev  = { ...this._remoteHeld };
      this._remoteHeld  = data.held  || {};
      this._remoteAxisX = data.axisX ?? 0;
      this._remoteAxisY = data.axisY ?? 0;
      this._inputCallback?.(data);
    });

    this._conn.on('close', () => { this.isConnected = false; });
  }

  // ── Send local inputs each frame ──────────────────────────────────────────

  sendInput(axisX, axisY, held) {
    if (this._conn?.open) {
      this._conn.send({ axisX, axisY, held });
    }
  }

  // ── InputManager-compatible interface for the REMOTE player ───────────────

  axisX()  { return this._remoteAxisX; }
  axisY()  { return this._remoteAxisY; }

  isHeld(action) {
    return this._remoteHeld[action] || false;
  }

  justPressed(action) {
    return !!(this._remoteHeld[action] && !this._remotePrev[action]);
  }

  consumeBuffer(action) {
    if (this._remoteHeld[action] && !this._remotePrev[action]) {
      this._remotePrev[action] = true; // consume
      return true;
    }
    return false;
  }

  onRemoteInput(cb) { this._inputCallback = cb; }

  destroy() {
    this._conn?.close();
    this._peer?.destroy();
    this._conn = null; this._peer = null;
    this.isConnected = false;
  }
}
