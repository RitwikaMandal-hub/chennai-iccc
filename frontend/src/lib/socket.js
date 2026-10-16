// Drop-in replacement for `io` from socket.io-client.
// Real backend → real Socket.IO connection.
// DEMO_MODE → a tiny emitter fed by the in-browser simulation.

import { io as realIo } from "socket.io-client";
import { DEMO_MODE } from "./config";
import { getLatest, subscribe } from "./demoEngine";

class DemoSocket {
  constructor() {
    this.handlers = {};
    this.connected = false;
    this.unsubscribe = subscribe((data) => this.fire("simulation-update", data));

    setTimeout(() => {
      if (!this.unsubscribe) return;
      this.connected = true;
      this.fire("connect");
      this.fire("system-status", { status: "online", message: "Connected to Chennai AI ICCC (demo)" });
      this.fire("simulation-update", getLatest());
    }, 50);
  }

  on(event, handler) {
    (this.handlers[event] ||= []).push(handler);
    return this;
  }

  off(event, handler) {
    if (!handler) delete this.handlers[event];
    else this.handlers[event] = (this.handlers[event] || []).filter((fn) => fn !== handler);
    return this;
  }

  emit() {
    return this;
  }

  fire(event, payload) {
    (this.handlers[event] || []).forEach((fn) => fn(payload));
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.connected = false;
    this.fire("disconnect");
    return this;
  }

  close() {
    return this.disconnect();
  }
}

export function io(url, options) {
  return DEMO_MODE ? new DemoSocket() : realIo(url, options);
}
