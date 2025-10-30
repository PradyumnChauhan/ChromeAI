/**
 * ChromeAI Studio - Event Bus
 * Central event system for loose coupling between components
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 50;
    this.debug = false;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} - Unsubscribe function
   */
  on(event, listener, options = {}) {
    if (typeof event !== 'string' || typeof listener !== 'function') {
      throw new Error('Event must be a string and listener must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);
    
    // Check max listeners
    if (listeners.length >= this.maxListeners) {
      console.warn(`EventBus: Max listeners (${this.maxListeners}) reached for event '${event}'`);
    }

    const listenerObj = {
      fn: listener,
      once: options.once || false,
      priority: options.priority || 0,
      id: options.id || this._generateId()
    };

    // Insert in priority order (higher priority first)
    const insertIndex = listeners.findIndex(l => l.priority < listenerObj.priority);
    if (insertIndex === -1) {
      listeners.push(listenerObj);
    } else {
      listeners.splice(insertIndex, 0, listenerObj);
    }

    if (this.debug) {
    }

    // Return unsubscribe function
    return () => this.off(event, listenerObj.id);
  }

  /**
   * Add one-time event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} - Unsubscribe function
   */
  once(event, listener, options = {}) {
    return this.on(event, listener, { ...options, once: true });
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {string|Function} listener - Listener ID or function
   */
  off(event, listener) {
    if (!this.events.has(event)) return;

    const listeners = this.events.get(event);
    
    if (typeof listener === 'string') {
      // Remove by ID
      const index = listeners.findIndex(l => l.id === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else if (typeof listener === 'function') {
      // Remove by function reference
      const index = listeners.findIndex(l => l.fn === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    if (this.debug) {
    }

    // Clean up empty event arrays
    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   * @returns {boolean} - True if event had listeners
   */
  emit(event, ...args) {
    if (!this.events.has(event)) {
      if (this.debug) {
      }
      return false;
    }

    const listeners = [...this.events.get(event)]; // Copy to avoid modification during iteration
    let hasListeners = false;

    for (const listenerObj of listeners) {
      try {
        listenerObj.fn(...args);
        hasListeners = true;

        // Remove one-time listeners
        if (listenerObj.once) {
          this.off(event, listenerObj.id);
        }
      } catch (error) {
        console.error(`EventBus: Error in listener for '${event}':`, error);
      }
    }

    if (this.debug) {
    }

    return hasListeners;
  }

  /**
   * Emit event asynchronously
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   * @returns {Promise<boolean>} - True if event had listeners
   */
  async emitAsync(event, ...args) {
    if (!this.events.has(event)) {
      if (this.debug) {
      }
      return false;
    }

    const listeners = [...this.events.get(event)];
    let hasListeners = false;

    // Execute all listeners in parallel
    const promises = listeners.map(async (listenerObj) => {
      try {
        await listenerObj.fn(...args);
        hasListeners = true;

        // Remove one-time listeners
        if (listenerObj.once) {
          this.off(event, listenerObj.id);
        }
      } catch (error) {
        console.error(`EventBus: Error in async listener for '${event}':`, error);
      }
    });

    await Promise.all(promises);

    if (this.debug) {
    }

    return hasListeners;
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
      if (this.debug) {
      }
    } else {
      this.events.clear();
      if (this.debug) {
      }
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} - Listener count
   */
  listenerCount(event) {
    return this.events.get(event)?.length || 0;
  }

  /**
   * Get all event names
   * @returns {Array<string>} - Event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Set maximum number of listeners per event
   * @param {number} max - Maximum listeners
   */
  setMaxListeners(max) {
    this.maxListeners = max;
  }

  /**
   * Generate unique listener ID
   * @private
   */
  _generateId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   * @returns {Object} - Event statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.events.size,
      totalListeners: 0,
      events: {}
    };

    for (const [event, listeners] of this.events) {
      stats.events[event] = listeners.length;
      stats.totalListeners += listeners.length;
    }

    return stats;
  }

  /**
   * Create namespaced event emitter
   * @param {string} namespace - Event namespace
   * @returns {Object} - Namespaced emitter
   */
  namespace(namespace) {
    return {
      on: (event, listener, options) => this.on(`${namespace}:${event}`, listener, options),
      once: (event, listener, options) => this.once(`${namespace}:${event}`, listener, options),
      off: (event, listener) => this.off(`${namespace}:${event}`, listener),
      emit: (event, ...args) => this.emit(`${namespace}:${event}`, ...args),
      emitAsync: (event, ...args) => this.emitAsync(`${namespace}:${event}`, ...args)
    };
  }
}

// Create global event bus instance
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.EventBus = EventBus;
  
  // Create default event bus
  if (!window.ChromeAIStudio.eventBus) {
    window.ChromeAIStudio.eventBus = new EventBus();
    window.ChromeAIStudio.eventBus.setDebug(false); // Disable debug by default
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventBus;
}

