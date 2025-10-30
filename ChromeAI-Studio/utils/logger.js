/**
 * ChromeAI Studio - Logger Utility
 * Structured logging with levels, namespaces, export functionality, and debug mode checking
 */

class Logger {
  constructor(namespace = 'ChromeAI', options = {}) {
    this.namespace = namespace;
    this.enabled = options.enabled !== false;
    this.minLevel = options.minLevel || 'debug';
    this.logs = [];
    this.maxLogs = options.maxLogs || 1000;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  // Check if debug mode is enabled from user settings
  isDebugMode() {
    try {
      // Try to get debug mode from window settings manager
      const settings = window.ChromeAIStudio?.SettingsManager?.getSettings?.();
      if (settings && typeof settings.debugMode === 'boolean') {
        return settings.debugMode;
      }
      
      // Fallback to localStorage
      const debugMode = localStorage.getItem('chromeai-debugMode');
      return debugMode === 'true';
    } catch (error) {
      return false;
    }
  }

  _shouldLog(level) {
    if (!this.enabled) return false;
    
    // Always show errors and warnings
    if (level === 'error' || level === 'warn') {
      return true;
    }
    
    // For debug/info, only show if debug mode is enabled
    if (level === 'debug' || level === 'info') {
      return this.isDebugMode();
    }
    
    return this.levels[level] >= this.levels[this.minLevel];
  }

  _log(level, ...args) {
    if (!this._shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.namespace}] [${level.toUpperCase()}]`;

    // Console output
    console[level](prefix, ...args);

    // Store log for debugging
    this.logs.push({
      timestamp,
      level,
      namespace: this.namespace,
      args: [...args]
    });

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(...args) {
    this._log('debug', ...args);
  }

  info(...args) {
    this._log('info', ...args);
  }

  warn(...args) {
    this._log('warn', ...args);
  }

  error(...args) {
    this._log('error', ...args);
  }

  // Get logs with optional filtering
  getLogs(filter = {}) {
    let filtered = this.logs;

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.since) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= filter.since
      );
    }

    if (filter.namespace) {
      filtered = filtered.filter(log => log.namespace === filter.namespace);
    }

    return filtered;
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs as JSON
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get log statistics
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byNamespace: {}
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byNamespace[log.namespace] = (stats.byNamespace[log.namespace] || 0) + 1;
    });

    return stats;
  }
}

// Make Logger available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.Logger = Logger;
  window.ChromeAIStudio.Logger.logger = new Logger('ChromeAI');
  
  // Global debugLog utility
  window.ChromeAIStudio.debugLog = function(...args) {
    try {
      const isDebugMode = localStorage.getItem('chromeai-debugMode') === 'true';
      if (isDebugMode) {
        console.log('[DEBUG]', ...args);
      }
    } catch (e) {
      // Silent fail if debug mode check fails
    }
  };
}