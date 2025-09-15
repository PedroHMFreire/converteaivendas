// src/lib/events.ts
type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

export const userEvents = new EventEmitter();

// Eventos específicos do usuário
export const USER_EVENTS = {
  STATUS_CHANGED: 'user:status_changed',
  PROFILE_UPDATED: 'user:profile_updated',
  PLAN_CHANGED: 'user:plan_changed',
  LOGGED_IN: 'user:logged_in',
  LOGGED_OUT: 'user:logged_out'
} as const;
