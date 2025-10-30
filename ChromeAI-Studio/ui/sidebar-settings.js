/**
 * ChromeAI Studio - Smart Sidebar Settings Module
 * Handles settings management, persistence, and UI updates
 */

class SidebarSettings {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.settingsManager = null;
    this.settingsListeners = [];
    this.isInitialized = false;
  }

  /**
   * Open settings panel (delegates to UI)
   */
  open() {
    try {
      if (this.sidebar && this.sidebar.ui && typeof this.sidebar.ui.showSettings === 'function') {
        this.sidebar.ui.showSettings();
      }
    } catch (e) {
      console.warn('Failed to open settings panel:', e);
    }
  }

  /**
   * Close settings panel (delegates to UI)
   */
  close() {
    try {
      if (this.sidebar && this.sidebar.ui && typeof this.sidebar.ui.hideSettings === 'function') {
        this.sidebar.ui.hideSettings();
      }
    } catch (e) {
      console.warn('Failed to close settings panel:', e);
    }
  }

  /**
   * Toggle settings panel
   */
  toggle() {
    const panel = this.sidebar?.ui?.sidebarElement?.querySelector?.('.ai-settings-panel');
    if (panel && panel.style.display !== 'none' && panel.classList.contains('show')) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Initialize settings management
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Use the settings manager from the main sidebar
      this.settingsManager = this.sidebar.settingsManager || window.ChromeAIStudio?.SettingsManager;
      
      if (this.settingsManager) {
        await this.settingsManager.init();
      } else {
        console.warn('SettingsManager not available, using fallback');
        // Create a fallback settings manager
        this.settingsManager = {
          get: (key, defaultValue) => this.sidebar.state?.getSetting(key, defaultValue),
          set: async (key, value) => {
            this.sidebar.state?.setSetting(key, value);
            return true;
          },
          getAll: () => this.sidebar.state?.getState().settings || {},
          updateSettings: async (settings) => {
            // Update sidebar state
            if (this.sidebar.state) {
              this.sidebar.state.updateSettings(settings);
            }
            
            // Persist to chrome storage
            try {
              await chrome.storage.sync.set({ 'chromeai-settings': settings });
            } catch (error) {
              console.warn('Failed to save to chrome.storage.sync, using localStorage:', error);
              localStorage.setItem('chromeai-settings', JSON.stringify(settings));
            }
            
            return true;
          },
          resetToDefaults: async () => {
            const defaultSettings = {
              theme: 'auto',
              mode: 'student',
                     sidebarWidth: 460,
              sidebarPosition: 'right'
            };
            this.sidebar.state?.updateSettings(defaultSettings);
            return true;
          }
        };
      }
      
      // Load settings
      await this.loadSettings();
      
      // Set up settings persistence
      this.setupSettingsPersistence();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SidebarSettings:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (this.settingsManager) {
        const settings = await this.settingsManager.getAll();
        this.applySettings(settings);
      } else {
        // Load from chrome storage or localStorage
        let settings = {};
        try {
          const result = await chrome.storage.sync.get(['chromeai-settings']);
          settings = result['chromeai-settings'] || {};
        } catch (error) {
          console.warn('Failed to load from chrome.storage.sync, trying localStorage:', error);
          const stored = localStorage.getItem('chromeai-settings');
          if (stored) {
            settings = JSON.parse(stored);
          }
        }
        
        // Apply default settings if none exist
        if (Object.keys(settings).length === 0) {
          settings = {
            theme: 'auto',
            mode: 'student',
            sidebarWidth: 460,
            sidebarPosition: 'right',
            voiceEnabled: false,
            voiceRate: 1.4,
            voicePitch: 1.0,
            voiceVolume: 1.0,
            wakeWordEnabled: true,
            aiTemperature: 0.7,
            aiMaxTokens: 1000,
            autoSave: true,
            chatSound: false,
            typingIndicator: true,
            dataCollection: false,
            conversationHistory: true,
            debugMode: false,
            experimentalFeatures: false
          };
        }
        
        // Update sidebar state with loaded settings
        if (this.sidebar.state) {
          this.sidebar.state.updateSettings(settings);
        }
        
        this.applySettings(settings);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  /**
   * Apply settings to sidebar
   */
  applySettings(settings) {
    if (!settings) return;

    // Apply theme
    if (settings.theme) {
      this.applyTheme(settings.theme);
    }

    // Apply position
    if (settings.position) {
      this.applyPosition(settings.position);
    }

    // Apply width
    if (settings.width) {
      this.applyWidth(settings.width);
    }

    // Apply other settings
    if (settings.autoSave !== undefined) {
      this.sidebar.state.setSetting('autoSave', settings.autoSave);
    }

    if (settings.chatEnabled !== undefined) {
      this.sidebar.state.setPreference('chatEnabled', settings.chatEnabled);
    }

    if (settings.voiceEnabled !== undefined) {
      this.sidebar.state.setPreference('voiceEnabled', settings.voiceEnabled);
    }
  }

  /**
   * Apply theme to sidebar
   */
  applyTheme(theme) {
    const sidebarElement = this.sidebar.ui.sidebarElement;
    if (!sidebarElement) return;

    // Remove existing theme classes
    sidebarElement.classList.remove('chromeai-theme-light', 'chromeai-theme-dark', 'chromeai-theme-auto');
    
    // Add new theme class
    sidebarElement.classList.add(`chromeai-theme-${theme}`);
    
    // Update CSS variables
    this.updateThemeVariables(theme);
  }

  /**
   * Update CSS variables for theme
   */
  updateThemeVariables(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--chromeai-bg-primary', '#1f2937');
      root.style.setProperty('--chromeai-bg-secondary', '#374151');
      root.style.setProperty('--chromeai-text-primary', '#f9fafb');
      root.style.setProperty('--chromeai-text-secondary', '#d1d5db');
      root.style.setProperty('--chromeai-border', '#4b5563');
    } else if (theme === 'light') {
      root.style.setProperty('--chromeai-bg-primary', '#ffffff');
      root.style.setProperty('--chromeai-bg-secondary', '#f9fafb');
      root.style.setProperty('--chromeai-text-primary', '#111827');
      root.style.setProperty('--chromeai-text-secondary', '#6b7280');
      root.style.setProperty('--chromeai-border', '#e5e7eb');
    } else {
      // Auto theme - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.updateThemeVariables(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Apply position to sidebar
   */
  applyPosition(position) {
    const sidebarElement = this.sidebar.ui.sidebarElement;
    if (!sidebarElement) return;

    // Remove existing position classes
    sidebarElement.classList.remove('chromeai-position-left', 'chromeai-position-right');
    
    // Add new position class
    sidebarElement.classList.add(`chromeai-position-${position}`);
    
    // Update CSS
    if (position === 'left') {
      sidebarElement.style.left = '0';
      sidebarElement.style.right = 'auto';
      sidebarElement.style.borderLeft = 'none';
      sidebarElement.style.borderRight = '1px solid var(--chromeai-border, #e5e7eb)';
    } else {
      sidebarElement.style.right = '0';
      sidebarElement.style.left = 'auto';
      sidebarElement.style.borderRight = 'none';
      sidebarElement.style.borderLeft = '1px solid var(--chromeai-border, #e5e7eb)';
    }
  }

  /**
   * Apply width to sidebar
   */
  applyWidth(width) {
    const sidebarElement = this.sidebar.ui.sidebarElement;
    if (!sidebarElement) return;

    const clampedWidth = Math.max(320, Math.min(800, width));
    sidebarElement.style.width = `${clampedWidth}px`;
    this.sidebar.ui.currentWidth = clampedWidth;
  }

  /**
   * Set up settings persistence
   */
  setupSettingsPersistence() {
    // Listen for settings changes
    this.sidebar.state.addStateListener((newState, oldState) => {
      if (newState.settings !== oldState.settings) {
        this.saveSettings();
      }
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      const currentTheme = this.sidebar.state.getSetting('theme', 'auto');
      if (currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (this.settingsManager) {
        const settings = this.sidebar.state.getState().settings;
        await this.settingsManager.updateSettings(settings);
      }
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  /**
   * Update setting
   */
  async updateSetting(key, value) {
    try {
      if (this.settingsManager && this.settingsManager.set) {
        await this.settingsManager.set(key, value);
      } else {
        this.sidebar.state.setSetting(key, value);
      }
      this.notifySettingsChange(key, value);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }

  /**
   * Get setting value
   */
  getSetting(key, defaultValue = null) {
    return this.sidebar.state.getSetting(key, defaultValue);
  }

  /**
   * Update multiple settings
   */
  updateSettings(settings) {
    this.sidebar.state.updateSettings(settings);
    this.notifySettingsChange('bulk', settings);
  }

  /**
   * Add settings change listener
   */
  addSettingsListener(listener) {
    this.settingsListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.settingsListeners.indexOf(listener);
      if (index > -1) {
        this.settingsListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify settings change listeners
   */
  notifySettingsChange(key, value) {
    this.settingsListeners.forEach(listener => {
      try {
        listener(key, value);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults() {
    const defaultSettings = {
      theme: 'auto',
      position: 'right',
      width: 460,
      autoSave: true
    };
    
    this.updateSettings(defaultSettings);
  }

  /**
   * Export settings to JSON string
   */
  async exportSettingsToFile() {
    try {
      const data = this.exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chromeai-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Failed to export settings file:', e);
      return false;
    }
  }

  /**
   * Import settings from a File object
   */
  async importSettingsFromFile(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      return this.importSettings(json);
    } catch (e) {
      console.error('Failed to import settings file:', e);
      return false;
    }
  }

  /**
   * Export settings
   */
  exportSettings() {
    return {
      settings: this.sidebar.state.getState().settings,
      userPreferences: this.sidebar.state.getState().userPreferences,
      timestamp: Date.now()
    };
  }

  /**
   * Import settings
   */
  importSettings(importedSettings) {
    try {
      if (importedSettings.settings) {
        this.updateSettings(importedSettings.settings);
      }
      
      if (importedSettings.userPreferences) {
        this.sidebar.state.updateUserPreferences(importedSettings.userPreferences);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return [
      { id: 'auto', name: 'Auto', description: 'Follow system preference' },
      { id: 'light', name: 'Light', description: 'Light theme' },
      { id: 'dark', name: 'Dark', description: 'Dark theme' }
    ];
  }

  /**
   * Get available positions
   */
  getAvailablePositions() {
    return [
      { id: 'left', name: 'Left', description: 'Show sidebar on the left' },
      { id: 'right', name: 'Right', description: 'Show sidebar on the right' }
    ];
  }

  /**
   * Get settings summary
   */
  getSettingsSummary() {
    const state = this.sidebar.state.getState();
    return {
      theme: state.settings.theme,
      position: state.settings.position,
      width: state.settings.width,
      autoSave: state.settings.autoSave,
      chatEnabled: state.userPreferences.chatEnabled,
      voiceEnabled: state.userPreferences.voiceEnabled,
      currentMode: state.currentMode
    };
  }

  /**
   * Validate settings
   */
  validateSettings(settings) {
    const errors = [];
    
    if (settings.theme && !['auto', 'light', 'dark'].includes(settings.theme)) {
      errors.push('Invalid theme value');
    }
    
    if (settings.position && !['left', 'right'].includes(settings.position)) {
      errors.push('Invalid position value');
    }
    
    if (settings.width && (typeof settings.width !== 'number' || settings.width < 320 || settings.width > 800)) {
      errors.push('Invalid width value');
    }
    
    if (settings.autoSave !== undefined && typeof settings.autoSave !== 'boolean') {
      errors.push('Invalid autoSave value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.settingsListeners = [];
    this.isInitialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarSettings;
} else if (typeof window !== 'undefined') {
  window.SidebarSettings = SidebarSettings;
}
