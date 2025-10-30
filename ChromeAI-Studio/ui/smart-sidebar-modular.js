/**
 * ChromeAI Studio - Smart Sidebar (Modular Version)
 * Main orchestrator that uses separate modules for different concerns
 * 
 * Modules:
 * - SidebarUI: UI creation and rendering
 * - SidebarState: State management and persistence
 * - SidebarChat: Chat functionality and AI interactions
 * - SidebarSettings: Settings management and theming
 * - SidebarMentions: @mentions and context awareness
 * - SidebarStyles: CSS injection and responsive design
 */

class SmartSidebar {
  constructor(options = {}) {
    this.options = {
      position: 'right',
      theme: 'auto',
      width: 400,
      ...options
    };
    
    this.isInitialized = false;
    this.isVisible = false;
    
    // Initialize modules
    this.ui = null;
    this.state = null;
    this.chat = null;
    this.settings = null;
    this.mentions = null;
    this.styles = null;
    
    // External dependencies
    this.aiManager = null;
    this.domUtils = null;
    this.contentExtractor = null;
    
    this.init();
  }

  /**
   * Initialize the smart sidebar
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      
      // Get external dependencies
      await this.getDependencies();
      
      // Initialize modules
      await this.initializeModules();
      
      // Set up module communication
      this.setupModuleCommunication();
      
      // Create UI
      await this.createUI();
      
      // Apply initial settings
      await this.applyInitialSettings();
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Smart Sidebar:', error);
      throw error;
    }
  }

  /**
   * Get external dependencies with retry logic
   */
  async getDependencies() {
    const maxRetries = 50;
    let retries = 0;
    
    while (retries < maxRetries) {
      // Check if ChromeAIStudio namespace exists
      if (!window.ChromeAIStudio) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Debug what's actually in the namespace
      if (retries === 0) {
      }
      
      this.aiManager = window.ChromeAIStudio.aiManager;
      this.domUtils = window.ChromeAIStudio.domUtils;
      this.contentExtractor = window.ChromeAIStudio.contentExtractor;
      
      // Check if all critical dependencies are available
      if (this.aiManager && this.domUtils && this.contentExtractor) {
        return;
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Log what's missing
    if (!this.aiManager) {
      console.warn('AI Manager not available after retries');
    }
    if (!this.domUtils) {
      console.warn('DOM Utils not available');
    }
    if (!this.contentExtractor) {
      console.warn('Content Extractor not available');
    }
  }

  /**
   * Initialize all modules
   */
  async initializeModules() {
    // Initialize state first (other modules depend on it)
    this.state = new window.SidebarState(this);
    await this.state.init();
    
    // Initialize settings manager first
    if (window.ChromeAIStudio?.SettingsManager) {
      this.settingsManager = new window.ChromeAIStudio.SettingsManager();
      await this.settingsManager.init();
    }
    
    // Initialize other modules - using old implementations
    this.ui = new window.SidebarUIOld(this);
    this.chat = new window.SidebarChat(this);
    this.settings = new window.SidebarSettings(this);
    this.mentions = new window.SidebarMentions(this);
    this.styles = new window.SidebarStylesOld(this);
    
    // Initialize modules that need async setup
    await Promise.all([
      this.chat.init(),
      this.settings.init(),
      this.mentions.init(),
      this.styles.init()
    ]);

    // Expose sidebar to global scope for text selection menu
    if (window.ChromeAIStudio) {
      window.ChromeAIStudio.smartSidebar = this;
    }
  }

  /**
   * Set up communication between modules
   */
  setupModuleCommunication() {
    // State changes should trigger UI updates
    this.state.addStateListener((newState, oldState) => {
      if (newState.isVisible !== oldState.isVisible) {
        if (newState.isVisible) {
          this.ui.show();
        } else {
          this.ui.hide();
        }
      }
      
      if (newState.currentMode !== oldState.currentMode) {
        this.ui.setMode(newState.currentMode);
      }
    });
  }

  /**
   * Create UI
   */
  async createUI() {
    // Create sidebar element using old implementation
    const sidebarElement = this.ui.createSidebarElement();
    
    // Add to DOM
    document.body.appendChild(sidebarElement);
    
    // Set initial visibility
    if (this.state.getState().isVisible) {
      this.ui.show();
    }
  }

  /**
   * Apply initial settings
   */
  async applyInitialSettings() {
    const state = this.state.getState();
    
    // Apply theme
    if (state.settings.theme) {
      this.styles.applyTheme(state.settings.theme);
    }
    
    // Apply position
    if (state.settings.position) {
      this.ui.sidebarElement.classList.add(`chromeai-position-${state.settings.position}`);
    }
    
    // Apply width
    if (state.settings.width) {
      this.ui.currentWidth = state.settings.width;
      this.ui.sidebarElement.style.width = `${state.settings.width}px`;
    }
  }

  /**
   * Show sidebar
   */
  show() {
    if (!this.isInitialized) {
      console.warn('Sidebar not initialized');
      return;
    }
    
    this.state.setVisible(true);
    this.ui.show();
    this.isVisible = true;
  }

  /**
   * Hide sidebar
   */
  hide() {
    if (!this.isInitialized) return;
    
    this.state.setVisible(false);
    this.ui.hide();
    this.isVisible = false;
  }

  /**
   * Toggle sidebar visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Set mode
   */
  setMode(mode) {
    if (!this.isInitialized) return;
    
    this.state.setMode(mode);
  }

  /**
   * Send message
   */
  async sendMessage() {
    if (!this.isInitialized) return;
    
    const content = this.ui.getInputValue();
    if (!content.trim()) return;
    
    // Clear input
    this.ui.clearInput();
    
    // Send message through chat module
    await this.chat.sendMessage(content);
  }

  /**
   * Show settings
   */
  showSettings() {
    if (!this.isInitialized) return;

    this.ui.showSettings();
  }

  /**
   * Show sidebar with specific action (for text selection menu)
   */
  show(options = {}) {
    if (!this.isInitialized) return;

    // Show the sidebar
    this.ui.show();

    // Handle specific actions
    if (options.action === 'show-ai-result' && options.data) {
      this.handleAIResult(options.data);
    }
  }

  /**
   * Handle AI result from text selection
   */
  handleAIResult(data) {
    if (!this.ui.sidebarElement) return;

    // Switch to main view if in settings
    this.ui.showMainView();

    // Add the result as an AI message
    this.ui.addMessage(data.content, 'assistant');

    // Update status
    this.ui.updateStatus(`Result from ${data.source || 'text selection'}`);
  }

  /**
   * Update settings
   */
  async updateSettings(settings) {
    if (!this.isInitialized) return;
    
    this.state.updateSettings(settings);
  }

  /**
   * Get current state
   */
  getState() {
    return this.state ? this.state.getState() : null;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      initialized: this.isInitialized,
      visible: this.isVisible,
      modules: {
        ui: !!this.ui,
        state: !!this.state,
        chat: !!this.chat,
        settings: !!this.settings,
        mentions: !!this.mentions,
        styles: !!this.styles
      },
      dependencies: {
        aiManager: !!this.aiManager,
        domUtils: !!this.domUtils,
        contentExtractor: !!this.contentExtractor
      },
      state: this.getState()
    };
  }

  /**
   * Export conversation
   */
  exportConversation(mode = null) {
    return this.chat ? this.chat.exportConversation(mode) : null;
  }

  /**
   * Import conversation
   */
  importConversation(conversation) {
    if (this.chat) {
      this.chat.importConversation(conversation);
    }
  }

  /**
   * Clear conversation
   */
  clearConversation() {
    if (this.chat) {
      this.chat.clearConversation();
    }
  }

  /**
   * Get settings summary
   */
  getSettingsSummary() {
    return this.settings ? this.settings.getSettingsSummary() : null;
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    if (this.state) {
      this.state.resetToDefaults();
    }
    if (this.settings) {
      this.settings.resetToDefaults();
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    try {
      
      // Cleanup modules
      if (this.ui) {
        this.ui.cleanup();
      }
      if (this.state) {
        this.state.cleanup();
      }
      if (this.chat) {
        this.chat.cleanup();
      }
      if (this.settings) {
        this.settings.cleanup();
      }
      if (this.mentions) {
        this.mentions.cleanup();
      }
      if (this.styles) {
        this.styles.cleanup();
      }
      
      // Clear references
      this.ui = null;
      this.state = null;
      this.chat = null;
      this.settings = null;
      this.mentions = null;
      this.styles = null;
      
      this.isInitialized = false;
      this.isVisible = false;
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartSidebar;
} else if (typeof window !== 'undefined') {
  window.SmartSidebar = SmartSidebar;
}
