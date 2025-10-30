/**
 * ChromeAI Studio - Unified Main Content Script
 * Consolidates main.js, main-v2.js, and main-simple.js with feature flags
 * 
 * Features:
 * - Event-driven architecture
 * - Service layer integration
 * - Comprehensive error handling
 * - Performance optimizations
 * - Feature flags for different modes
 */

class ChromeAIStudio {
  constructor(options = {}) {
    this.initialized = false;
    this.components = {};
    this.services = {};
    this.cleanupHandlers = [];
    this.eventListeners = []; // Track all event listeners for cleanup
    
    // Feature flags
    this.features = {
      eventDriven: options.eventDriven !== false, // Default: true
      serviceLayer: options.serviceLayer !== false, // Default: true
      advancedUI: options.advancedUI !== false, // Default: true
      performanceMode: options.performanceMode || false, // Default: false
      debugMode: options.debugMode || false // Default: false
    };
    
    // Settings with defaults
    this.settings = {
      autoDetectMode: true,
      showFloatingBubble: true,
      keyboardShortcuts: true,
      theme: 'auto', // auto, light, dark
      position: 'bottom-right',
      voiceMode: false,
      wakeWordDetection: true,
      ...options.settings
    };
    
    // Initialize logger
    this.logger = this.createLogger();
    
    // Initialize event bus if event-driven mode is enabled
    if (this.features.eventDriven) {
      this.eventBus = this.createEventBus();
    }
    
    this.init();
  }

  /**
   * Create logger instance
   */
  createLogger() {
    if (window.ChromeAIStudio?.Logger) {
      return new window.ChromeAIStudio.Logger('ChromeAIStudio');
    }
    
    // Fallback logger
    return {
      debug: this.features.debugMode ? console.debug : () => {},
      info: console.info,
      warn: console.warn,
      error: console.error
    };
  }

  /**
   * Create event bus instance
   */
  createEventBus() {
    if (window.ChromeAIStudio?.eventBus) {
      return window.ChromeAIStudio.eventBus;
    }
    
    // Fallback event bus
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
      once: () => {}
    };
  }

  /**
   * Initialize ChromeAI Studio
   */
  async init() {
    try {
      this.logger.info('🚀 ChromeAI Studio initializing...');
      
      // Cleanup any existing instances first (for page navigation)
      await this.cleanup();
      
      // Check if we should run on this page
      if (!this.shouldRun()) {
        this.logger.info('❌ ChromeAI Studio: Skipping initialization on this page');
        return;
      }

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }

      // Load settings with error recovery
      try {
        await this.loadSettings();
      } catch (error) {
        this.logger.warn('⚠️ Failed to load settings, using defaults:', error);
      }
      
      // Initialize services if service layer is enabled
      if (this.features.serviceLayer) {
        try {
          await this.initializeServices();
        } catch (error) {
          this.logger.warn('⚠️ Service initialization failed, continuing without services:', error);
        }
      }
      
      // Initialize core components with error recovery
      try {
        await this.initializeComponents();
      } catch (error) {
        this.logger.error('❌ Component initialization failed:', error);
        // Try to initialize components individually
        await this.initializeComponentsIndividually();
      }

      // Eagerly initialize AI Manager sessions (pre-warm all)
      try {
        if (window.ChromeAIStudio?.aiManager?.init) {
          this.logger.info('[BOOT] aiManager.init() starting');
          await window.ChromeAIStudio.aiManager.init();
          this.logger.info('[BOOT] aiManager.init() completed');
        } else {
          this.logger.warn('[BOOT] aiManager not available to init');
        }
      } catch (error) {
        this.logger.warn('[BOOT] aiManager.init() failed:', error);
      }
      
      // Set up event listeners
      try {
        this.setupEventListeners();
      } catch (error) {
        this.logger.warn('⚠️ Event listener setup failed:', error);
      }
      
      // Apply theme
      try {
        this.applyTheme();
      } catch (error) {
        this.logger.warn('⚠️ Theme application failed:', error);
      }
      
      // Initialize AI instance manager for performance
      if (this.features.performanceMode || true) { // Always pre-warm
        try {
          await this.initializeAIManager();
        } catch (error) {
          this.logger.warn('⚠️ AI Manager initialization failed:', error);
        }
      }
      
      // Pre-warm voice assistant on page load
      if (window.ChromeAIStudio?.mcpVoiceAgent?.preWarmSession) {
        try {
          window.ChromeAIStudio.mcpVoiceAgent.preWarmSession();
          this.logger.info('✅ Voice assistant pre-warming initiated');
        } catch (error) {
          this.logger.warn('⚠️ Voice assistant pre-warming failed:', error);
        }
      }
      
      this.initialized = true;
      this.logger.info('✅ ChromeAI Studio initialized successfully');
      
      // Emit initialization event
      if (this.features.eventDriven) {
        try {
          this.eventBus.emit('chromeai:initialized', { 
            features: this.features,
            settings: this.settings 
          });
        } catch (error) {
          this.logger.warn('⚠️ Failed to emit initialization event:', error);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ ChromeAI Studio initialization failed:', error);
      // Don't throw - allow graceful degradation
      this.initialized = false;
    }
  }

  /**
   * Check if ChromeAI Studio should run on this page
   */
  shouldRun() {
    // Skip on Chrome extension pages
    if (window.location.protocol === 'chrome-extension:') {
      return false;
    }
    
    // Skip on Chrome internal pages
    if (window.location.hostname === 'chrome://' || 
        window.location.hostname === 'chrome-extension://' ||
        window.location.hostname === 'moz-extension://') {
      return false;
    }
    
    // Skip on about: pages
    if (window.location.protocol === 'about:') {
      return false;
    }
    
    // Skip if already initialized
    if (window.ChromeAIStudio && window.ChromeAIStudio.initialized) {
      return false;
    }
    
    return true;
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(['chromeai_settings']);
        if (result.chromeai_settings) {
          this.settings = { ...this.settings, ...result.chromeai_settings };
        }
      }
      this.logger.debug('Settings loaded:', this.settings);
    } catch (error) {
      this.logger.warn('Failed to load settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ chromeai_settings: this.settings });
        this.logger.debug('Settings saved:', this.settings);
      }
    } catch (error) {
      this.logger.warn('Failed to save settings:', error);
    }
  }

  /**
   * Initialize services if service layer is enabled
   */
  async initializeServices() {
    try {
      this.logger.info('🔧 Initializing services...');
      
      // Initialize AI Service
      if (window.ChromeAIStudio?.AIService) {
        this.services.ai = new window.ChromeAIStudio.AIService();
        this.logger.info('✅ AI Service initialized');
      }
      
      // Initialize UI Service
      if (window.ChromeAIStudio?.UIService) {
        this.services.ui = new window.ChromeAIStudio.UIService();
        this.logger.info('✅ UI Service initialized');
      }
      
    } catch (error) {
      this.logger.error('❌ Service initialization failed:', error);
    }
  }

  /**
   * Initialize core components
   */
  async initializeComponents() {
    try {
      this.logger.info('🧩 Initializing components...');
      
      // Initialize floating action bubble
      if (this.settings.showFloatingBubble) {
        await this.initializeFloatingBubble();
      }
      
      // Initialize text selection menu
      await this.initializeTextSelectionMenu();
      
      // Initialize smart sidebar if advanced UI is enabled
      if (this.features.advancedUI) {
        await this.initializeSmartSidebar();
      }
      
      // Initialize context analyzer
      await this.initializeContextAnalyzer();
      
    } catch (error) {
      this.logger.error('❌ Component initialization failed:', error);
    }
  }

  /**
   * Initialize components individually with error recovery
   */
  async initializeComponentsIndividually() {
    this.logger.info('🧩 Initializing components individually...');
    
    // Initialize floating action bubble
    if (this.settings.showFloatingBubble) {
      try {
        await this.initializeFloatingBubble();
        this.logger.info('✅ Floating action bubble initialized');
      } catch (error) {
        this.logger.error('❌ Floating action bubble failed:', error);
      }
    }
    
    // Initialize text selection menu
    try {
      await this.initializeTextSelectionMenu();
      this.logger.info('✅ Text selection menu initialized');
    } catch (error) {
      this.logger.error('❌ Text selection menu failed:', error);
    }
    
    // Initialize smart sidebar if advanced UI is enabled
    if (this.features.advancedUI) {
      try {
        await this.initializeSmartSidebar();
        this.logger.info('✅ Smart sidebar initialized');
      } catch (error) {
        this.logger.error('❌ Smart sidebar failed:', error);
      }
    }
    
    // Initialize context analyzer
    try {
      await this.initializeContextAnalyzer();
      this.logger.info('✅ Context analyzer initialized');
    } catch (error) {
      this.logger.error('❌ Context analyzer failed:', error);
    }
  }

  /**
   * Initialize floating action bubble
   */
  async initializeFloatingBubble() {
    try {
      
      if (window.ChromeAIStudio?.floatingActionBubble) {
        // Use the singleton instance and initialize it
        this.components.floatingBubble = window.ChromeAIStudio.floatingActionBubble;
        await this.components.floatingBubble.init();
        this.logger.info('✅ Floating Action Bubble initialized');
      } else {
        this.logger.warn('FloatingActionBubble singleton not available');
      }
    } catch (error) {
      this.logger.error('❌ Floating Action Bubble initialization failed:', error);
    }
  }

  /**
   * Initialize text selection menu
   */
  async initializeTextSelectionMenu() {
    try {
      if (window.ChromeAIStudio?.TextSelectionMenu) {
        this.components.textSelectionMenu = new window.ChromeAIStudio.TextSelectionMenu({
          theme: this.settings.theme
        });
        this.logger.info('✅ Text Selection Menu initialized');
      }
    } catch (error) {
      this.logger.error('❌ Text Selection Menu initialization failed:', error);
    }
  }

  /**
   * Initialize smart sidebar (modular version)
   */
  async initializeSmartSidebar() {
    try {
      // Wait for dependencies to be available
      let retries = 0;
      const maxRetries = 20;
      
      while (retries < maxRetries) {
        if (window.SmartSidebar && 
            window.ChromeAIStudio?.aiManager && 
            window.ChromeAIStudio?.domUtils && 
            window.ChromeAIStudio?.contentExtractor) {
          break;
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (window.SmartSidebar) {
        this.components.smartSidebar = new window.SmartSidebar({
          theme: this.settings.theme,
          position: 'right',
          width: this.settings.width || 400
        });
        this.logger.info('✅ Smart Sidebar (Modular) initialized');
      } else {
        this.logger.warn('SmartSidebar class not available after retries');
      }
    } catch (error) {
      this.logger.error('❌ Smart Sidebar initialization failed:', error);
    }
  }

  /**
   * Initialize context analyzer
   */
  async initializeContextAnalyzer() {
    try {
      if (window.ChromeAIStudio?.ContextAnalyzer) {
        this.components.contextAnalyzer = new window.ChromeAIStudio.ContextAnalyzer();
        this.logger.info('✅ Context Analyzer initialized');
      }
    } catch (error) {
      this.logger.error('❌ Context Analyzer initialization failed:', error);
    }
  }

  /**
   * Initialize AI instance manager for performance
   */
  async initializeAIManager() {
    try {
      if (window.ChromeAIStudio?.AIInstanceManager) {
        this.components.aiManager = new window.ChromeAIStudio.AIInstanceManager({
          preWarmOnLoad: true,
          maxInstances: 5
        });
        this.logger.info('✅ AI Instance Manager initialized');
      }
    } catch (error) {
      this.logger.error('❌ AI Instance Manager initialization failed:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Keyboard shortcuts
    if (this.settings.keyboardShortcuts) {
      this.addEventListener(document, 'keydown', this.handleKeyboardShortcuts.bind(this));
    }
    
    // Page visibility changes
    this.addEventListener(document, 'visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Page unload cleanup
    this.addEventListener(window, 'beforeunload', this.cleanup.bind(this));
    
    // Also cleanup on pagehide for better mobile support
    this.addEventListener(window, 'pagehide', this.cleanup.bind(this));
    
    // Settings changes
    if (this.features.eventDriven) {
      this.eventBus.on('settings:changed', this.handleSettingsChange.bind(this));
    }
  }

  /**
   * Add event listener with tracking for cleanup
   */
  addEventListener(target, event, handler, options = {}) {
    // Add passive flag for scroll-related events
    if (['scroll', 'wheel', 'touchstart', 'touchmove'].includes(event)) {
      options.passive = options.passive !== false;
    }
    target.addEventListener(event, handler, options);
    this.eventListeners.push({ target, event, handler, options });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Shift + A - Toggle AI sidebar
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      this.toggleSidebar();
    }
    
    // Ctrl/Cmd + Shift + V - Toggle voice mode
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
      event.preventDefault();
      this.toggleVoiceMode();
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.logger.debug('Page hidden, pausing non-essential components');
      // Pause voice recognition, etc.
    } else {
      this.logger.debug('Page visible, resuming components');
      // Resume components
    }
  }

  /**
   * Handle settings change
   */
  handleSettingsChange(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applyTheme();
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    if (this.components.smartSidebar) {
      this.components.smartSidebar.toggle();
    }
  }

  /**
   * Toggle voice mode
   */
  toggleVoiceMode() {
    this.settings.voiceMode = !this.settings.voiceMode;
    this.saveSettings();
    
    if (this.components.floatingBubble) {
      this.components.floatingBubble.setVoiceMode(this.settings.voiceMode);
    }
  }

  /**
   * Apply theme
   */
  applyTheme() {
    const theme = this.settings.theme === 'auto' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
      this.settings.theme;
    
    document.documentElement.setAttribute('data-chromeai-theme', theme);
    this.logger.debug('Theme applied:', theme);
  }

  /**
   * Get component by name
   */
  getComponent(name) {
    return this.components[name];
  }

  /**
   * Get service by name
   */
  getService(name) {
    return this.services[name];
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    if (this.features.eventDriven) {
      this.eventBus.emit('settings:changed', newSettings);
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up ChromeAI Studio...');
      
      // Cleanup AI Manager first (most important)
      if (window.ChromeAIStudio?.aiManager?.cleanup) {
        try {
          await window.ChromeAIStudio.aiManager.cleanup();
          this.logger.debug('Cleaned up AI Manager');
        } catch (error) {
          this.logger.error('Failed to cleanup AI Manager:', error);
        }
      }
      
      // Cleanup components
      for (const [name, component] of Object.entries(this.components)) {
        if (component && typeof component.cleanup === 'function') {
          try {
            await component.cleanup();
            this.logger.debug(`Cleaned up component: ${name}`);
          } catch (error) {
            this.logger.error(`Failed to cleanup component ${name}:`, error);
          }
        }
      }
      
      // Cleanup services
      for (const [name, service] of Object.entries(this.services)) {
        if (service && typeof service.cleanup === 'function') {
          try {
            await service.cleanup();
            this.logger.debug(`Cleaned up service: ${name}`);
          } catch (error) {
            this.logger.error(`Failed to cleanup service ${name}:`, error);
          }
        }
      }
      
      // Remove event listeners
      for (const { target, event, handler, options } of this.eventListeners) {
        try {
          target.removeEventListener(event, handler, options);
        } catch (error) {
          this.logger.warn(`Failed to remove event listener: ${event}`, error);
        }
      }
      this.eventListeners = [];
      
      // Clear references
      this.components = {};
      this.services = {};
      this.initialized = false;
      
      // Memory leak detection in development mode
      if (this.features.debugMode) {
        this.detectMemoryLeaks();
      }
      
      this.logger.info('✅ ChromeAI Studio cleaned up');
      
    } catch (error) {
      this.logger.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Detect potential memory leaks in development mode
   */
  detectMemoryLeaks() {
    try {
      const debugInfo = this.getDebugInfo();
      
      // Check for lingering event listeners
      if (debugInfo.eventListeners > 0) {
        this.logger.warn(`⚠️ Potential memory leak: ${debugInfo.eventListeners} event listeners not cleaned up`);
      }
      
      // Check for lingering components
      const componentCount = Object.keys(this.components).length;
      if (componentCount > 0) {
        this.logger.warn(`⚠️ Potential memory leak: ${componentCount} components not cleaned up`);
      }
      
      // Check for lingering services
      const serviceCount = Object.keys(this.services).length;
      if (serviceCount > 0) {
        this.logger.warn(`⚠️ Potential memory leak: ${serviceCount} services not cleaned up`);
      }
      
      // Check for lingering timeouts/intervals
      if (this.timeouts && this.timeouts.length > 0) {
        this.logger.warn(`⚠️ Potential memory leak: ${this.timeouts.length} timeouts not cleared`);
      }
      
      if (this.intervals && this.intervals.length > 0) {
        this.logger.warn(`⚠️ Potential memory leak: ${this.intervals.length} intervals not cleared`);
      }
      
    } catch (error) {
      this.logger.error('❌ Memory leak detection failed:', error);
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      features: this.features,
      settings: this.settings,
      components: Object.keys(this.components),
      services: Object.keys(this.services),
      eventListeners: this.eventListeners.length
    };
  }
}

// Initialize ChromeAI Studio when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.ChromeAIStudio || !window.ChromeAIStudio.initialized) {
      const chromeAIStudio = new ChromeAIStudio();
      window.ChromeAIStudio = window.ChromeAIStudio || {};
      Object.assign(window.ChromeAIStudio, chromeAIStudio);
      // Don't call init() - constructor already calls it
    }
  });
} else {
  if (!window.ChromeAIStudio || !window.ChromeAIStudio.initialized) {
    const chromeAIStudio = new ChromeAIStudio();
    window.ChromeAIStudio = window.ChromeAIStudio || {};
    Object.assign(window.ChromeAIStudio, chromeAIStudio);
    // Don't call init() - constructor already calls it
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChromeAIStudio;
}

// =============================================================================
// MESSAGE LISTENER FOR AUTOMATION EXTRACTION
// =============================================================================

/**
 * Listen for extraction requests from background script (for autonomous agent)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_DATA') {
    
    // Perform extraction using the data extractor
    const extractor = window.ChromeAIStudio?.dataExtractor;
    
    if (!extractor) {
      console.error('❌ Data extractor not available');
      sendResponse({ success: false, error: 'Data extractor not initialized' });
      return true;
    }
    
    // Extract data based on type
    extractor.smartExtract(message.dataType)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error(`❌ Extraction failed for ${message.dataType}:`, error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }
  
  // NOTE: EXTRACT_SEARCH_RESULTS is now handled by data-extractor.js
  // Removed duplicate listener that was responding with 0 results before the actual extractor
  
  // Other message types can be handled here in the future
  return false;
});
