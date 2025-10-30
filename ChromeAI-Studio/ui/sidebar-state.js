/**
 * ChromeAI Studio - Smart Sidebar State Module
 * Handles state management, persistence, and mode switching
 */

class SidebarState {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.state = {
      isVisible: false,
      currentMode: 'student',
      isProcessing: false,
      chatHistory: [],
      settings: {
        theme: 'auto',
        position: 'right',
        width: 400,
        autoSave: true
      },
      userPreferences: {
        preferredMode: 'student',
        lastUsedMode: 'student',
        chatEnabled: true,
        voiceEnabled: false
      }
    };
    
    this.stateListeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize state management
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Load saved state from storage
      await this.loadState();
      
      // Set up state persistence
      this.setupStatePersistence();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SidebarState:', error);
    }
  }

  /**
   * Load state from storage
   */
  async loadState() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(['chromeai_sidebar_state']);
        if (result.chromeai_sidebar_state) {
          const savedState = result.chromeai_sidebar_state;
          
          // Merge with defaults, preserving structure
          this.state = {
            ...this.state,
            ...savedState,
            // ✅ Always start with sidebar closed, regardless of saved state
            isVisible: false,
            settings: {
              ...this.state.settings,
              ...savedState.settings
            },
            userPreferences: {
              ...this.state.userPreferences,
              ...savedState.userPreferences
            }
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
    }
  }

  /**
   * Save state to storage
   */
  async saveState() {
    try {
      if (chrome?.storage?.local && this.state.settings.autoSave) {
        await chrome.storage.local.set({
          chromeai_sidebar_state: this.state
        });
      }
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  /**
   * Set up automatic state persistence
   */
  setupStatePersistence() {
    // Save state on changes
    this.addStateListener((newState) => {
      this.saveState();
    });

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Notify listeners
    this.notifyStateChange(this.state, oldState);
  }

  /**
   * Update nested state
   */
  updateNestedState(path, updates) {
    const oldState = { ...this.state };
    
    // Deep clone and update
    const newState = JSON.parse(JSON.stringify(this.state));
    const keys = path.split('.');
    let current = newState;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = { ...current[keys[keys.length - 1]], ...updates };
    
    this.state = newState;
    this.notifyStateChange(this.state, oldState);
  }

  /**
   * Set visibility
   */
  setVisible(visible) {
    this.updateState({ isVisible: visible });
  }

  /**
   * Toggle visibility
   */
  toggleVisibility() {
    this.setVisible(!this.state.isVisible);
  }

  /**
   * Set current mode
   */
  setMode(mode) {
    if (this.isValidMode(mode)) {
      this.updateState({ 
        currentMode: mode,
        userPreferences: {
          ...this.state.userPreferences,
          lastUsedMode: mode
        }
      });
    }
  }

  /**
   * Check if mode is valid
   */
  isValidMode(mode) {
    const validModes = ['student', 'developer', 'creator', 'researcher'];
    return validModes.includes(mode);
  }

  /**
   * Set processing state
   */
  setProcessing(processing) {
    this.updateState({ isProcessing: processing });
  }

  /**
   * Add message to chat history
   */
  addMessage(content, type = 'user', metadata = {}) {
    const message = {
      id: Date.now() + Math.random(),
      content,
      type,
      timestamp: Date.now(),
      mode: this.state.currentMode,
      metadata
    };
    
    this.updateState({
      chatHistory: [...this.state.chatHistory, message]
    });
  }

  /**
   * Clear chat history
   */
  clearChatHistory() {
    this.updateState({ chatHistory: [] });
  }

  /**
   * Get chat history for current mode
   */
  getChatHistory(mode = null) {
    const targetMode = mode || this.state.currentMode;
    return this.state.chatHistory.filter(msg => msg.mode === targetMode);
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    this.updateNestedState('settings', settings);
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences) {
    this.updateNestedState('userPreferences', preferences);
  }

  /**
   * Get setting value
   */
  getSetting(key, defaultValue = null) {
    return this.state.settings[key] ?? defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key, value) {
    this.updateSettings({ [key]: value });
  }

  /**
   * Get user preference
   */
  getPreference(key, defaultValue = null) {
    return this.state.userPreferences[key] ?? defaultValue;
  }

  /**
   * Set user preference
   */
  setPreference(key, value) {
    this.updateUserPreferences({ [key]: value });
  }

  /**
   * Add state change listener
   */
  addStateListener(listener) {
    this.stateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify state change listeners
   */
  notifyStateChange(newState, oldState) {
    this.stateListeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  /**
   * Reset to default state
   */
  resetToDefaults() {
    this.state = {
      isVisible: false,
      currentMode: 'student',
      isProcessing: false,
      chatHistory: [],
      settings: {
        theme: 'auto',
        position: 'right',
        width: 400,
        autoSave: true
      },
      userPreferences: {
        preferredMode: 'student',
        lastUsedMode: 'student',
        chatEnabled: true,
        voiceEnabled: false
      }
    };
    
    this.notifyStateChange(this.state, {});
  }

  /**
   * Export state for debugging
   */
  exportState() {
    return {
      state: this.getState(),
      listeners: this.stateListeners.length,
      initialized: this.isInitialized
    };
  }

  /**
   * Import state from external source
   */
  importState(importedState) {
    try {
      this.state = {
        ...this.state,
        ...importedState
      };
      this.notifyStateChange(this.state, {});
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stateListeners = [];
    this.isInitialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarState;
} else if (typeof window !== 'undefined') {
  window.SidebarState = SidebarState;
}

