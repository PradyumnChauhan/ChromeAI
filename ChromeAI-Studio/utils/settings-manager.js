/**
 * ChromeAI Studio - Settings Manager
 * Manages user preferences and settings with Chrome storage sync
 */

class SettingsManager {
  constructor() {
    this.settings = {};
    this.defaultSettings = {
      // General Settings
      theme: 'auto', // auto, light, dark
      mode: 'student', // student, developer, creator, researcher
      
      // Voice Settings
      voiceEnabled: false,
      voiceRate: 1.4,
      voicePitch: 1.0,
      voiceVolume: 1.0,
      preferredVoice: 'auto',
      
      // Wake Word Settings
      wakeWordEnabled: false,
      wakeWords: ['hey assistant', 'computer', 'hey computer', 'assistant'],
      customWakeWord: '',
      wakeWordSensitivity: 0.7,
      
      // AI Model Settings
      defaultAIModel: 'promptai',
      aiTemperature: 0.7,
      aiTopK: 20,
      maxTokens: 1000,
      
      // UI Settings
      sidebarWidth: 460,
      showWelcomeMessage: true,
      autoHideSidebar: false,
      enableAnimations: true,
      compactMode: false,
      
      // Privacy Settings
      saveConversations: true,
      shareAnalytics: false,
      crossTabSync: true,
      
      // Advanced Settings
      enableExperimentalFeatures: false,
      debugMode: false,
      apiTimeout: 30000,
      retryAttempts: 3,
      
      // Accessibility
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium', // small, medium, large
      
      // Language & Localization
      language: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      
      // Shortcuts
      quickSummaryShortcut: 'Ctrl+Shift+S',
      voiceToggleShortcut: 'Ctrl+Shift+V',
      sidebarToggleShortcut: 'Ctrl+Shift+A'
    };
    
    this.listeners = new Set();
    this.initialized = false;
  }

  /**
   * Initialize settings manager
   */
  async init() {
    if (this.initialized) return;
    
    try {
      await this.loadSettings();
      this.setupStorageListener();
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Settings Manager:', error);
    }
  }

  /**
   * Load settings from Chrome storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['chromeAISettings']);
      this.settings = { 
        ...this.defaultSettings, 
        ...(result.chromeAISettings || {}) 
      };
      this.notifyListeners('loaded', this.settings);
    } catch (error) {
      console.warn('⚠️ Failed to load settings, using defaults:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  /**
   * Save settings to Chrome storage
   */
  async saveSettings() {
    try {
      await chrome.storage.sync.set({ chromeAISettings: this.settings });
      this.notifyListeners('saved', this.settings);
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Get a setting value
   */
  get(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Set a setting value
   */
  async set(key, value) {
    const oldValue = this.settings[key];
    this.settings[key] = value;
    
    try {
      await this.saveSettings();
      this.notifyListeners('changed', { key, value, oldValue });
      return true;
    } catch (error) {
      // Revert on error
      this.settings[key] = oldValue;
      throw error;
    }
  }

  /**
   * Set multiple settings at once
   */
  async setMultiple(settingsObj) {
    const oldSettings = { ...this.settings };
    Object.assign(this.settings, settingsObj);
    
    try {
      await this.saveSettings();
      this.notifyListeners('changed', { settings: settingsObj, oldSettings });
      return true;
    } catch (error) {
      // Revert on error
      this.settings = oldSettings;
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults() {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.defaultSettings };
    
    try {
      await this.saveSettings();
      this.notifyListeners('reset', { settings: this.settings, oldSettings });
      return true;
    } catch (error) {
      // Revert on error
      this.settings = oldSettings;
      throw error;
    }
  }

  /**
   * Get all settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Export settings as JSON
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  async importSettings(jsonString) {
    try {
      const importedSettings = JSON.parse(jsonString);
      
      // Validate imported settings (only keep known keys)
      const validSettings = {};
      Object.keys(this.defaultSettings).forEach(key => {
        if (importedSettings[key] !== undefined) {
          validSettings[key] = importedSettings[key];
        }
      });
      
      await this.setMultiple(validSettings);
      return { success: true, importedCount: Object.keys(validSettings).length };
    } catch (error) {
      console.error('❌ Failed to import settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add settings change listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Remove settings change listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of settings changes
   */
  notifyListeners(type, data) {
    this.listeners.forEach(callback => {
      try {
        callback(type, data);
      } catch (error) {
        console.error('❌ Error in settings listener:', error);
      }
    });
  }

  /**
   * Setup Chrome storage listener for cross-tab sync
   */
  setupStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.chromeAISettings) {
          const newSettings = changes.chromeAISettings.newValue;
          if (newSettings) {
            this.settings = { ...this.defaultSettings, ...newSettings };
            this.notifyListeners('synced', this.settings);
          }
        }
      });
    }
  }

  /**
   * Get available voices for speech synthesis
   */
  getAvailableVoices() {
    if (typeof speechSynthesis === 'undefined') return [];
    
    return speechSynthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService
    }));
  }

  /**
   * Get theme-specific CSS variables
   */
  getThemeVariables() {
    const theme = this.get('theme');
    const actualTheme = theme === 'auto' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
      theme;
    
    return {
      theme: actualTheme,
      variables: this.getThemeCSS(actualTheme)
    };
  }

  /**
   * Get CSS variables for a specific theme
   */
  getThemeCSS(theme) {
    // This would return CSS variables based on theme
    // Implementation would match the existing theme-manager.js
    return theme === 'dark' ? {
      '--ai-bg': '#1a1a1a',
      '--ai-text': '#ffffff',
      // ... other dark theme variables
    } : {
      '--ai-bg': '#ffffff',
      '--ai-text': '#000000',
      // ... other light theme variables
    };
  }

  /**
   * Validate setting value
   */
  validateSetting(key, value) {
    const validators = {
      voiceRate: (v) => typeof v === 'number' && v >= 0.1 && v <= 3.0,
      voicePitch: (v) => typeof v === 'number' && v >= 0.0 && v <= 2.0,
      voiceVolume: (v) => typeof v === 'number' && v >= 0.0 && v <= 1.0,
      aiTemperature: (v) => typeof v === 'number' && v >= 0.0 && v <= 1.0,
      sidebarWidth: (v) => typeof v === 'number' && v >= 300 && v <= 800,
      theme: (v) => ['auto', 'light', 'dark'].includes(v),
      mode: (v) => ['student', 'developer', 'creator', 'researcher'].includes(v),
      language: (v) => typeof v === 'string' && v.length === 2
    };

    const validator = validators[key];
    return validator ? validator(value) : true;
  }
}

// Export for both browser and potential module environments
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.SettingsManager = SettingsManager;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
}