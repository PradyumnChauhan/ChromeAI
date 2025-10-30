/**
 * ChromeAI Studio - Text Selection Context Menu (Simplified Working Version)
 * Based on the working old version but with improvements
 */

class TextSelectionMenu {
  constructor() {
    this.menu = null;
    this.selectedText = '';
    this.selectionRect = null;
    this.selectionRange = null;
    this.isVisible = false;
    this.hideTimeout = null;
    
    // Simple initialization - no complex dependencies
    this.domUtils = null;
    this.aiManager = null;
    
    // Only translate functions work in-place - all others open sidebar
    this.inPlaceFunctions = new Set([
      'translate', 'translate-ai'
    ]);
    
    // Language options for translation - will be set in init()
    this.languageOptions = [];
    
    // Streaming support
    this.streamingEnabled = true; // Default: streaming ON
    
    // Track current streaming message for Chrome AI features
    this.currentStreamingMessage = null;
    
    this.init();
  }

  async init() {
    
    // Get utilities with fallbacks
    this.domUtils = window.ChromeAIStudio?.domUtils;
    this.aiManager = window.ChromeAIStudio?.aiManager;
    this.logger = window.ChromeAIStudio?.Logger ? new window.ChromeAIStudio.Logger('TextSelectionMenu') : null;
    this.eventBus = window.ChromeAIStudio?.eventBus;
    this.constants = window.ChromeAIStudio?.constants;
    
    if (!this.domUtils) {
      console.warn('⚠️ TextSelectionMenu: DOM utilities not available, using fallback');
      this.domUtils = this.createFallbackDOMUtils();
    }

    if (this.logger) {
      this.logger.info('Text Selection Menu initializing...');
    }

    // Load streaming settings
    try {
      const settings = await window.ChromeAIStudio?.settingsManager?.getSettings();
      this.streamingEnabled = settings?.streaming?.enabled !== false;
    } catch (error) {
      console.warn('⚠️ Could not load streaming settings, using default:', error);
    }

    // Set language options from constants (English must be first for default)
    this.languageOptions = this.constants?.SUPPORTED_LANGUAGES || [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', flag: '🇪🇸' },
      { code: 'fr', name: 'French', flag: '🇫🇷' },
      { code: 'de', name: 'German', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', flag: '🇷🇺' },
      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', flag: '🇰🇷' },
      { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
      { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
      { code: 'tr', name: 'Turkish', flag: '🇹🇷' }
    ];
    
    // Ensure English is always in the list (add if missing from constants)
    if (!this.languageOptions.find(l => l.code === 'en')) {
      this.languageOptions.unshift({ code: 'en', name: 'English', flag: '🇺🇸' });
    }

    this.attachEventListeners();
    this.setupEventListeners();
    
    if (this.logger) {
      this.logger.info('Text Selection Menu initialized successfully');
    } else {
    }
  }

  /**
   * Consume a ReadableStream with real-time UI updates
   * @param {ReadableStream} stream - The stream to consume
   * @param {Function} onChunk - Callback for each chunk
   * @param {Function} onComplete - Callback when stream completes
   * @param {Function} onError - Callback on error
   * @returns {Promise<string>} - Full result
   */
  async consumeStream(stream, onChunk, onComplete, onError) {
    try {
      let fullResult = '';
      let lastUpdate = 0;
      const updateInterval = 16; // ~60fps
      
      for await (const chunk of stream) {
        fullResult += chunk;
        
        // Throttle UI updates for better performance
        const now = Date.now();
        if (now - lastUpdate >= updateInterval) {
          if (onChunk) onChunk(chunk, fullResult);
          lastUpdate = now;
        }
      }
      
      // Final update with all content
      if (onChunk) onChunk('', fullResult);
      if (onComplete) onComplete(fullResult);
      return fullResult;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Consume stream and update sidebar in real-time (DEPRECATED - use executeFeatureWithStreaming)
   * @deprecated Use executeFeatureWithStreaming for new features
   */
  async consumeStreamToUI(stream, featureType) {
    console.warn('consumeStreamToUI is deprecated, use executeFeatureWithStreaming instead');
    
    // Get sidebar UI
    const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
    if (!sidebarUI) {
      // Fallback: consume stream without UI updates
      let fullResult = '';
      for await (const chunk of stream) {
        fullResult += chunk;
      }
      return { success: true, result: fullResult };
    }
    
    // Create streaming message in sidebar
    const messageElement = sidebarUI.addStreamingMessage();
    
    try {
      const fullResult = await this.consumeStream(
        stream,
        (chunk, fullText) => {
          // Update sidebar message with each chunk
          sidebarUI.updateStreamingMessage(messageElement, fullText);
        },
        (finalText) => {
          // Mark as complete
          sidebarUI.completeStreamingMessage(messageElement);
        },
        (error) => {
          // Show error
          sidebarUI.errorStreamingMessage(messageElement, error.message);
        }
      );
      
      return { success: true, result: fullResult };
    } catch (error) {
      sidebarUI.errorStreamingMessage(messageElement, error.message);
      return { success: false, error: { message: error.message } };
    }
  }

  /**
   * Unified workflow for all streaming features
   * Opens sidebar immediately, creates streaming UI, then executes AI
   */
  async executeFeatureWithStreaming(featureTitle, promptTemplate, useCustomPrompt = false) {
    try {
      // 1. Open sidebar with animation IMMEDIATELY
      await this.openSidebarWithProcessing(featureTitle);
      
      // 2. Get sidebar UI and create streaming message IMMEDIATELY
      const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
      if (!sidebarUI || typeof sidebarUI.addStreamingMessage !== 'function') {
        throw new Error('Sidebar UI not available');
      }
      
      const messageElement = sidebarUI.addStreamingMessage();
      if (!messageElement) {
        throw new Error('Could not create streaming message');
      }
      
      // 3. Build prompt (NOW, not before - so sidebar opens first)
      const prompt = useCustomPrompt ? promptTemplate : promptTemplate.replace('{TEXT}', this.selectedText);
      
      // 4. Get AI response (this may take time, but UI already shows loading)
      const response = await this.aiManager.promptStreaming(prompt);
      
      if (!response.success) {
        const errorMsg = response.error?.message || 'AI request failed';
        sidebarUI.errorStreamingMessage(messageElement, errorMsg);
        this.displayApiError(errorMsg);
        return;
      }
      
      // 5. Stream response to existing UI element
      await this.consumeStream(
        response.result,
        (chunk, fullText) => {
          sidebarUI.updateStreamingMessage(messageElement, fullText);
        },
        (finalText) => {
          sidebarUI.completeStreamingMessage(messageElement);
        },
        (error) => {
          sidebarUI.errorStreamingMessage(messageElement, error.message);
        }
      );
      
    } catch (error) {
      console.error(`❌ Feature error (${featureTitle}):`, error);
      this.showError(`Failed to execute ${featureTitle}: ${error.message}`);
    }
  }

  // Fallback DOM utilities if main ones aren't available
  createFallbackDOMUtils() {
    return {
      createElement: (tag, options = {}) => {
        const element = document.createElement(tag);
        
        if (options.className) element.className = options.className;
        if (options.attributes) {
          Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
          });
        }
        if (options.styles) {
          Object.assign(element.style, options.styles);
        }
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        
        return element;
      },
      getHighZIndex: () => 10000,
      injectCSS: (css, id) => {
        if (!document.querySelector(`#${id}`)) {
          const style = document.createElement('style');
          style.id = id;
          style.textContent = css;
          document.head.appendChild(style);
        }
      }
    };
  }

  attachEventListeners() {
    // Listen for text selection
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Hide menu when clicking elsewhere
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    // Hide menu on scroll
    window.addEventListener('scroll', this.hideMenu.bind(this));
    window.addEventListener('resize', this.hideMenu.bind(this));
  }

  handleMouseUp(event) {
    // Small delay to ensure selection is complete
    setTimeout(() => this.checkSelection(event), 10);
  }

  handleKeyUp(event) {
    // Handle keyboard selections
    if (event.key === 'Shift' || (event.shiftKey && event.key.includes('Arrow'))) {
      setTimeout(() => this.checkSelection(event), 10);
    }
  }

  handleMouseDown(event) {
    // Hide menu if clicking outside of it
    if (this.menu && !this.menu.contains(event.target)) {
      this.hideMenu();
    }
  }

  checkSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) {
      this.hideMenu();
      return;
    }

    // Don't show menu if selection is inside our extension UI
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.parentElement || range.commonAncestorContainer;
    if (container.closest('.chromeai-studio')) {
      return;
    }

    this.selectedText = selectedText;
    this.selectionRange = range.cloneRange();
    this.selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    this.showContextMenu();
  }

  async showContextMenu() {
    // Always ensure menu can show - if menu exists but is being removed, clear it first
    if (this.menu && !this.isVisible) {
      // Menu DOM exists but visibility flag is false - remove it immediately to allow new menu
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      this.menu.remove();
      this.menu = null;
    }
    
    // If menu is visible, just update content
    if (this.isVisible && this.menu) {
      this.updateMenuContent();
      return;
    }

    if (!this.domUtils) {
      console.error('🔍 DOM Utils not available, cannot create menu');
      return;
    }

    // Analyze selected text to determine relevant features
    const relevantFeatures = await this.analyzeSelectedText(this.selectedText);
    this.createMenu(relevantFeatures);
    this.positionMenu();
    this.animateIn();
    
    this.isVisible = true;
  }

  async analyzeSelectedText(text) {
    const features = [];
    
    // Get current active mode from localStorage
    const currentMode = localStorage.getItem('chromeai-active-mode') || 'student';
    
    // MANDATORY: Add translate feature first with highest priority (0)
    features.push(
      { id: 'translate-ai', title: 'Translate', icon: '🌐', priority: 0 }
    );
    
    // Mode-specific features based on current active mode
    switch (currentMode) {
      case 'student':
        features.push(
          // Core Student Features
          { id: 'explain', title: 'Explain Concept', icon: '💡', priority: 1 },
          { id: 'summarize', title: 'Smart Summary', icon: '📄', priority: 1 },
          { id: 'create-quiz', title: 'Create Quiz', icon: '❓', priority: 1 },
          { id: 'create-flashcards', title: 'Flashcards', icon: '🃏', priority: 1 },
          { id: 'simplify', title: 'Simplify Text', icon: '📝', priority: 2 },
          { id: 'smart-notes', title: 'Smart Notes', icon: '📝', priority: 2 },
          // Chrome AI APIs
          { id: 'proofreader', title: 'Check Grammar', icon: '🔤', priority: 2 },
          { id: 'rewriter', title: 'Rewrite', icon: '🖊️', priority: 2 },
          { id: 'writer', title: 'Generate Content', icon: '✏️', priority: 3 },
          { id: 'study-session', title: 'Study Session', icon: '📚', priority: 3 },
          { id: 'learning-path', title: 'Learning Path', icon: '🛤️', priority: 3 }
        );
        break;
        
      case 'developer':
        features.push(
          // Core Developer Features
          { id: 'explain-code', title: 'Explain Code', icon: '💻', priority: 1 },
          { id: 'document-code', title: 'Document Code', icon: '📄', priority: 1 },
          { id: 'fix-code', title: 'Fix Bugs', icon: '🔧', priority: 1 },
          { id: 'check-quality', title: 'Code Quality', icon: '⭐', priority: 1 },
          { id: 'rewrite-code', title: 'Convert Language', icon: '🔄', priority: 2 },
          { id: 'lookup-api', title: 'API Reference', icon: '📖', priority: 2 },
          { id: 'find-resources', title: 'Find Resources', icon: '🔍', priority: 2 },
          { id: 'analyze-dependencies', title: 'Analyze Dependencies', icon: '🔗', priority: 2 },
          { id: 'recognize-patterns', title: 'Code Patterns', icon: '🔍', priority: 3 },
          // Chrome AI APIs
          { id: 'proofreader', title: 'Check Syntax', icon: '🔤', priority: 2 },
          { id: 'summarize-ai', title: 'Code Summary', icon: '📄', priority: 3 },
          { id: 'writer', title: 'Generate Code', icon: '✏️', priority: 3 },
          { id: 'rewriter', title: 'Refactor', icon: '🖊️', priority: 3 }
        );
        break;
        
      case 'creator':
        features.push(
          // Core Creator Features
          { id: 'improve-writing', title: 'Improve Writing', icon: '✨', priority: 1 },
          { id: 'change-tone', title: 'Change Tone', icon: '🎭', priority: 1 },
          { id: 'generate-hashtags', title: 'Generate Hashtags', icon: '#️⃣', priority: 1 },
          { id: 'seo-optimize', title: 'SEO Optimize', icon: '🚀', priority: 1 },
          { id: 'repurpose-content', title: 'Repurpose Content', icon: '🔄', priority: 2 },
          { id: 'plan-content', title: 'Content Calendar', icon: '📅', priority: 2 },
          { id: 'analyze-visual', title: 'Analyze Visual', icon: '👁️', priority: 2 },
          // Chrome AI APIs
          { id: 'rewriter', title: 'Rewrite', icon: '🖊️', priority: 2 },
          { id: 'proofreader', title: 'Grammar Check', icon: '🔤', priority: 2 },
          { id: 'writer', title: 'Generate Content', icon: '✏️', priority: 2 },
          { id: 'summarize-ai', title: 'Summarize', icon: '📄', priority: 3 }
        );
        break;
        
      case 'researcher':
        features.push(
          // Core Researcher Features
          { id: 'fact-check', title: 'Fact Check', icon: '✅', priority: 1 },
          { id: 'analyze-credibility', title: 'Check Credibility', icon: '🛡️', priority: 1 },
          { id: 'find-sources', title: 'Find Sources', icon: '🔍', priority: 1 },
          { id: 'generate-citation', title: 'Generate Citation', icon: '📚', priority: 1 },
          { id: 'synthesize-sources', title: 'Synthesize Sources', icon: '🔬', priority: 2 },
          { id: 'build-timeline', title: 'Build Timeline', icon: '⏰', priority: 2 },
          { id: 'create-literature-review', title: 'Literature Review', icon: '📖', priority: 2 },
          { id: 'identify-patterns', title: 'Identify Patterns', icon: '🔍', priority: 2 },
          { id: 'generate-hypothesis', title: 'Generate Hypothesis', icon: '💡', priority: 2 },
          { id: 'setup-collaboration', title: 'Setup Collaboration', icon: '👥', priority: 3 },
          { id: 'export-research', title: 'Export Research', icon: '📤', priority: 3 },
          // Chrome AI APIs
          { id: 'summarize-ai', title: 'AI Summary', icon: '📄', priority: 2 },
          { id: 'proofreader', title: 'Proofread', icon: '🔤', priority: 3 },
          { id: 'rewriter', title: 'Rewrite', icon: '🖊️', priority: 3 },
          { id: 'writer', title: 'Generate Text', icon: '✏️', priority: 3 }
        );
        break;
        
      default:
        // Fallback to Chrome AI APIs
        features.push(
          { id: 'summarize-ai', title: 'AI Summary', icon: '📄', priority: 1 },
          { id: 'proofreader', title: 'Grammar Check', icon: '🔤', priority: 1 },
          { id: 'rewriter', title: 'Rewrite', icon: '🖊️', priority: 1 },
          { id: 'writer', title: 'Generate Content', icon: '✏️', priority: 2 },
          { id: 'explain', title: 'Explain', icon: '💡', priority: 3 }
        );
        break;
    }

    // Sort by priority and return top 6 features (translate will always be first)
    return features
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6);
  }

  createMenu(features) {
    // Clear any pending hide timeout since we're creating a new menu
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // Remove existing menu immediately if it exists
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    
    // Reset visibility flag to ensure menu can show
    this.isVisible = false;

    this.menu = this.domUtils.createElement('div', {
      className: 'ai-selection-menu',
      attributes: {
        'data-ai-component': 'selection-menu'
      },
      styles: {
        position: 'fixed',
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '8px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)',
        zIndex: this.domUtils.getHighZIndex() + 10,
        opacity: '0',
        transform: 'scale(0.8) translateY(-10px)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        maxWidth: '280px',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px'
      }
    });

    // Create menu buttons
    features.forEach((feature, index) => {
      const button = this.domUtils.createElement('button', {
        className: 'ai-feature-button',
        attributes: {
          'data-feature': feature.id,
          'title': feature.title
        },
        styles: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          background: 'transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '14px',
          fontWeight: '500',
          color: '#111827',
          textAlign: 'left'
        },
        innerHTML: `
          <span class="ai-feature-icon" style="font-size: 16px; width: 20px; text-align: center;">${feature.icon}</span>
          <span class="ai-feature-title">${feature.title}</span>
        `
      });

      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.background = '#f3f4f6';
        button.style.transform = 'translateX(2px)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.background = 'transparent';
        button.style.transform = 'translateX(0)';
      });

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleFeatureClick(feature.id);
      });

      this.menu.appendChild(button);
    });

    // Add global styles if not already added
    if (!document.querySelector('#ai-selection-menu-styles')) {
      this.domUtils.injectCSS(`
        .ai-selection-menu {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.4;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
          backdrop-filter: blur(8px);
        }
        
        .ai-feature-button:focus {
          outline: 2px solid #4285f4;
          outline-offset: -2px;
        }
        
        .ai-feature-button:active {
          transform: translateX(1px) scale(0.98);
        }
        
        .ai-feature-button + .ai-feature-button {
          border-top: 1px solid #f1f5f9;
        }
        
        .ai-feature-title {
          color: #111827;
        }
      `, 'ai-selection-menu-styles');
    }

    document.body.appendChild(this.menu);
  }

  positionMenu() {
    if (!this.menu || !this.selectionRect) return;

    const menuRect = this.menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let left = this.selectionRect.left + (this.selectionRect.width / 2) - (menuRect.width / 2);
    let top = this.selectionRect.top - menuRect.height - 10;

    // Adjust for viewport boundaries
    if (left < 10) left = 10;
    if (left + menuRect.width > viewport.width - 10) {
      left = viewport.width - menuRect.width - 10;
    }

    // If menu would be above viewport, show below selection
    if (top < 10) {
      top = this.selectionRect.bottom + 10;
    }

    // If still outside viewport, center it
    if (top + menuRect.height > viewport.height - 10) {
      top = viewport.height - menuRect.height - 10;
    }

    this.menu.style.left = `${left}px`;
    this.menu.style.top = `${top}px`;
  }

  animateIn() {
    if (!this.menu) return;

    requestAnimationFrame(() => {
      this.menu.style.opacity = '1';
      this.menu.style.transform = 'scale(1) translateY(0)';
    });
  }

  hideMenu() {
    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // Immediately reset visibility flag to allow menu to show again
    this.isVisible = false;
    
    if (!this.menu) {
      return;
    }
    
    this.menu.style.opacity = '0';
    this.menu.style.transform = 'scale(0.8) translateY(-10px)';
    
    // Store timeout reference so we can cancel it if needed
    this.hideTimeout = setTimeout(() => {
      if (this.menu) {
        this.menu.remove();
        this.menu = null;
      }
      this.hideTimeout = null;
    }, 200);
  }

  async handleFeatureClick(featureId) {
    
    // Hide menu first
    this.hideMenu();
    
    // Special handling for translate-ai: auto-detect and show language selection
    if (featureId === 'translate-ai') {
      await this.handleTranslateWithAutoDetection();
      return;
    }
    
    // Check if this function should work in-place (only translate functions)
    const isInPlace = this.inPlaceFunctions.has(featureId);
    
    // For other translate functions, show language dropdown first
    let targetLanguage = null;
    if (isInPlace && (featureId === 'translate' || featureId === 'translate-ai')) {
      targetLanguage = await this.showLanguageDropdown();
      if (!targetLanguage) {
        // User cancelled language selection
        return;
      }
    }
    
    // Get the current mode to determine which feature handler to use
    const currentMode = localStorage.getItem('chromeai-active-mode') || 'student';
    
    try {
      // Route to appropriate mode feature handler
      switch (currentMode) {
        case 'student':
          await this.handleStudentFeature(featureId, isInPlace, targetLanguage);
          break;
        case 'developer':
          await this.handleDeveloperFeature(featureId, isInPlace, targetLanguage);
          break;
        case 'creator':
          await this.handleCreatorFeature(featureId, isInPlace, targetLanguage);
          break;
        case 'researcher':
          await this.handleResearcherFeature(featureId, isInPlace, targetLanguage);
          break;
        default:
          await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling feature ${featureId}:`, error);
      this.showError(`Failed to process ${featureId}: ${error.message}`);
    }
  }

  async showLanguageDropdown() {
    return new Promise((resolve) => {
      const dropdown = this.domUtils.createElement('div', {
        className: 'ai-language-dropdown',
        styles: {
          position: 'fixed',
          background: '#ffffff',
          color: '#333333',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: this.domUtils.getHighZIndex() + 20,
          minWidth: '160px',
          maxWidth: '200px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px'
        }
      });

      // Position dropdown
      const rect = this.selectionRect;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 180;
      const dropdownWidth = 160;

      let left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      let top = rect.bottom + 10;

      // Adjust horizontal position
      if (left < 10) left = 10;
      if (left + dropdownWidth > viewportWidth - 10) {
        left = viewportWidth - dropdownWidth - 10;
      }

      // Adjust vertical position  
      if (top + dropdownHeight > viewportHeight - 10) {
        top = rect.top - dropdownHeight - 10;
      }

      dropdown.style.left = left + 'px';
      dropdown.style.top = top + 'px';

      // Add title
      const title = this.domUtils.createElement('div', {
        styles: {
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          borderBottom: '1px solid #eee',
          marginBottom: '4px'
        },
        innerHTML: 'Select Language'
      });
      dropdown.appendChild(title);

      this.languageOptions.forEach(lang => {
        const button = this.domUtils.createElement('button', {
          className: 'ai-lang-button',
          styles: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            textAlign: 'left',
            color: '#333',
            fontSize: '14px',
            transition: 'background 0.2s ease'
          },
          innerHTML: `${lang.flag} ${lang.name}`
        });

        button.addEventListener('mouseenter', () => {
          button.style.background = '#f0f0f0';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = 'transparent';
        });

        button.addEventListener('click', () => {
          dropdown.remove();
          resolve(lang.code);
        });

        dropdown.appendChild(button);
      });

      document.body.appendChild(dropdown);

      // Auto remove after 10 seconds
      setTimeout(() => {
        if (dropdown.parentNode) {
          dropdown.remove();
          resolve('es'); // Default to Spanish
        }
      }, 10000);

      // Close on click outside
      const closeHandler = (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeHandler);
          resolve('es'); // Default to Spanish
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeHandler);
      }, 100);
    });
  }

  /**
   * Handle translate with auto-detection using Language Detector API
   */
  async handleTranslateWithAutoDetection() {
    if (!this.selectionRange) {
      this.showError('No text selected');
      return;
    }

    // Show loading indicator
    const loadingSpan = this.showLoadingIndicator();
    if (!loadingSpan) {
      this.showError('Failed to show loading indicator');
      return;
    }

    try {
      // Step 1: Auto-detect source language using Language Detector API
      let sourceLanguage = 'en'; // default
      let detectedLanguage = null;
      let detectionConfidence = 0;
      
      // Try using Language Detector API directly first
      if (typeof LanguageDetector !== 'undefined') {
        try {
          // Check availability
          const availability = await LanguageDetector.availability();
          if (availability === 'available' || availability === 'downloadable' || availability === 'readily') {
            // Create detector with download progress monitoring
            const detector = await LanguageDetector.create({
              monitor(m) {
                // Could show download progress if needed
              }
            });
            
            // Detect language - returns array of {detectedLanguage, confidence}
            const detectionResults = await detector.detect(this.selectedText);
            
            if (detectionResults && detectionResults.length > 0) {
              // Get top result (highest confidence)
              const topResult = detectionResults[0];
              detectedLanguage = topResult.detectedLanguage;
              detectionConfidence = topResult.confidence || 0;
              sourceLanguage = detectedLanguage;
              
              console.log(`🌐 Auto-detected language: ${sourceLanguage} (confidence: ${(detectionConfidence * 100).toFixed(1)}%)`);
              
              // Only use auto-detection if confidence is high enough (>0.5)
              if (detectionConfidence < 0.5) {
                console.warn('⚠️ Low confidence in language detection, asking user to confirm');
                detectedLanguage = null; // Will show manual selection
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Language Detector API failed, trying AIManager:', error);
        }
      }
      
      // Fallback to AIManager detectLanguage if LanguageDetector API not available
      if (!detectedLanguage) {
        const aiManager = window.ChromeAIStudio?.aiManager;
        if (aiManager && typeof aiManager.detectLanguage === 'function') {
          try {
            const detectionResult = await aiManager.detectLanguage(this.selectedText);
            if (detectionResult && detectionResult.success && detectionResult.result) {
              detectedLanguage = detectionResult.result;
              sourceLanguage = detectedLanguage;
              detectionConfidence = detectionResult.confidence || 0.8;
              console.log(`🌐 Auto-detected language (via AIManager): ${sourceLanguage}`);
              
              // Only use auto-detection if confidence is high enough
              if (detectionConfidence < 0.5) {
                detectedLanguage = null;
              }
            }
          } catch (error) {
            console.warn('⚠️ Language auto-detection failed:', error);
          }
        }
      }

      // Step 2: Get source language confirmation (if detected) or manual selection
      let targetLanguage = null;
      
      if (detectedLanguage) {
        // Auto-detection succeeded - confirm or allow changing source
        const confirmSource = await this.confirmSourceLanguage(sourceLanguage, detectionConfidence);
        if (confirmSource === null) {
          // User cancelled
          this.removeLoadingIndicator(loadingSpan);
          return;
        }
        sourceLanguage = confirmSource;
        
        // Step 3: Get target language (auto-detection succeeded, only need target)
        targetLanguage = await this.showLanguageDropdown();
        if (!targetLanguage) {
          // User cancelled
          this.removeLoadingIndicator(loadingSpan);
          return;
        }
      } else {
        // Detection failed - show dual dropdowns for manual selection (both source and target)
        const languageSelection = await this.showDualLanguageDropdown();
        if (!languageSelection) {
          // User cancelled
          this.removeLoadingIndicator(loadingSpan);
          return;
        }
        sourceLanguage = languageSelection.source;
        targetLanguage = languageSelection.target;
      }

      // Step 4: Translate the text
      const aiManager = window.ChromeAIStudio?.aiManager;
      if (!aiManager) {
        throw new Error('AI Manager not available');
      }

      const result = await aiManager.translate(this.selectedText, sourceLanguage, targetLanguage);
      
      if (result && result.error) {
        throw new Error(result.error.message || result.error);
      }

      if (result && result.result) {
        // Replace with translated text and highlight
        this.replaceLoadingWithText(loadingSpan, result.result);
      } else {
        throw new Error('Translation failed - no result');
      }

    } catch (error) {
      console.error('❌ Translation error:', error);
      this.removeLoadingIndicator(loadingSpan);
      this.showError(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Confirm or allow changing source language after auto-detection
   */
  async confirmSourceLanguage(detectedLanguage, confidence) {
    return new Promise((resolve) => {
      // If confidence is high (>0.8), just use it without confirmation
      if (confidence > 0.8) {
        resolve(detectedLanguage);
        return;
      }

      // For lower confidence, show quick selector
      const quickSelector = this.domUtils.createElement('div', {
        className: 'ai-source-language-confirm',
        styles: {
          position: 'fixed',
          background: '#ffffff',
          color: '#333333',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: this.domUtils.getHighZIndex() + 25,
          minWidth: '240px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px'
        }
      });

      // Position near selection
      const rect = this.selectionRect;
      quickSelector.style.left = `${rect.left + rect.width / 2 - 120}px`;
      quickSelector.style.top = `${rect.bottom + 10}px`;

      const detectedLang = this.languageOptions.find(l => l.code === detectedLanguage);
      const langName = detectedLang ? detectedLang.name : detectedLanguage;

      quickSelector.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
          Detected: <strong>${langName}</strong> (${(confidence * 100).toFixed(0)}% confidence)
        </div>
        <button id="use-detected" style="
          width: 100%;
          padding: 8px;
          background: #4285f4;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 6px;
        ">Use Detected (${langName})</button>
        <button id="change-source" style="
          width: 100%;
          padding: 8px;
          background: transparent;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Change Source Language</button>
      `;

      const useDetectedBtn = quickSelector.querySelector('#use-detected');
      const changeSourceBtn = quickSelector.querySelector('#change-source');

      useDetectedBtn.addEventListener('click', () => {
        quickSelector.remove();
        resolve(detectedLanguage);
      });

      changeSourceBtn.addEventListener('click', async () => {
        quickSelector.remove();
        const sourceOnly = await this.showSourceLanguageOnlyDropdown();
        resolve(sourceOnly || detectedLanguage);
      });

      document.body.appendChild(quickSelector);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (quickSelector.parentNode) {
          quickSelector.remove();
          resolve(detectedLanguage); // Default to detected
        }
      }, 10000);
    });
  }

  /**
   * Show dropdown for source language selection only
   */
  async showSourceLanguageOnlyDropdown() {
    return new Promise((resolve) => {
      const dropdown = this.domUtils.createElement('div', {
        className: 'ai-language-dropdown',
        styles: {
          position: 'fixed',
          background: '#ffffff',
          color: '#333333',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: this.domUtils.getHighZIndex() + 20,
          minWidth: '180px',
          maxWidth: '220px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px'
        }
      });

      const rect = this.selectionRect;
      let left = rect.left + (rect.width / 2) - 110;
      let top = rect.bottom + 10;

      if (left < 10) left = 10;
      if (left + 220 > window.innerWidth - 10) {
        left = window.innerWidth - 220 - 10;
      }
      if (top + 200 > window.innerHeight - 10) {
        top = rect.top - 200 - 10;
      }

      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${top}px`;

      const title = this.domUtils.createElement('div', {
        styles: {
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          borderBottom: '1px solid #eee',
          marginBottom: '4px'
        },
        innerHTML: 'Select Source Language'
      });
      dropdown.appendChild(title);

      this.languageOptions.forEach(lang => {
        const button = this.domUtils.createElement('button', {
          className: 'ai-lang-button',
          styles: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            textAlign: 'left',
            color: '#333',
            fontSize: '14px',
            transition: 'background 0.2s ease'
          },
          innerHTML: `${lang.flag} ${lang.name}`
        });

        button.addEventListener('mouseenter', () => {
          button.style.background = '#f0f0f0';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = 'transparent';
        });

        button.addEventListener('click', () => {
          dropdown.remove();
          resolve(lang.code);
        });

        dropdown.appendChild(button);
      });

      document.body.appendChild(dropdown);

      setTimeout(() => {
        if (dropdown.parentNode) {
          dropdown.remove();
          resolve(null);
        }
      }, 15000);

      const closeHandler = (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeHandler);
          resolve(null);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeHandler);
      }, 100);
    });
  }

  /**
   * Show dual language dropdowns for source and target language selection
   */
  async showDualLanguageDropdown() {
    return new Promise((resolve) => {
      const container = this.domUtils.createElement('div', {
        className: 'ai-dual-language-dropdown',
        styles: {
          position: 'fixed',
          background: '#ffffff',
          color: '#333333',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          zIndex: this.domUtils.getHighZIndex() + 30,
          minWidth: '280px',
          maxWidth: '320px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px'
        }
      });

      // Position dropdown
      const rect = this.selectionRect;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let left = rect.left + (rect.width / 2) - 160;
      let top = rect.bottom + 10;

      // Adjust horizontal position
      if (left < 10) left = 10;
      if (left + 320 > viewportWidth - 10) {
        left = viewportWidth - 320 - 10;
      }

      // Adjust vertical position  
      if (top + 400 > viewportHeight - 10) {
        top = rect.top - 400 - 10;
      }

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;

      // Add title
      const title = this.domUtils.createElement('div', {
        styles: {
          padding: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#333',
          borderBottom: '1px solid #eee',
          marginBottom: '12px',
          textAlign: 'center'
        },
        innerHTML: '🌐 Select Languages'
      });
      container.appendChild(title);

      // Source language section
      const sourceSection = this.domUtils.createElement('div', {
        styles: { marginBottom: '16px' }
      });
      const sourceLabel = this.domUtils.createElement('div', {
        styles: {
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          marginBottom: '8px'
        },
        innerHTML: 'From (Source):'
      });
      sourceSection.appendChild(sourceLabel);

      const sourceDropdown = this.domUtils.createElement('div', {
        className: 'ai-lang-dropdown-list',
        styles: {
          maxHeight: '120px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '6px'
        }
      });

      let selectedSource = null;
      this.languageOptions.forEach(lang => {
        const button = this.domUtils.createElement('button', {
          className: 'ai-lang-button',
          styles: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            textAlign: 'left',
            color: '#333',
            fontSize: '14px',
            transition: 'background 0.2s ease'
          },
          innerHTML: `${lang.flag} ${lang.name}`
        });

        button.addEventListener('mouseenter', () => {
          button.style.background = '#f0f0f0';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = selectedSource === lang.code ? '#e3f2fd' : 'transparent';
        });

        button.addEventListener('click', () => {
          // Update selection
          selectedSource = lang.code;
          sourceDropdown.querySelectorAll('.ai-lang-button').forEach(btn => {
            btn.style.background = btn === button ? '#e3f2fd' : 'transparent';
            btn.style.fontWeight = btn === button ? '600' : '400';
          });
        });

        sourceDropdown.appendChild(button);
      });
      sourceSection.appendChild(sourceDropdown);
      container.appendChild(sourceSection);

      // Target language section
      const targetSection = this.domUtils.createElement('div', {
        styles: { marginBottom: '16px' }
      });
      const targetLabel = this.domUtils.createElement('div', {
        styles: {
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          marginBottom: '8px'
        },
        innerHTML: 'To (Target):'
      });
      targetSection.appendChild(targetLabel);

      const targetDropdown = this.domUtils.createElement('div', {
        className: 'ai-lang-dropdown-list',
        styles: {
          maxHeight: '120px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '6px'
        }
      });

      let selectedTarget = null;
      this.languageOptions.forEach(lang => {
        const button = this.domUtils.createElement('button', {
          className: 'ai-lang-button',
          styles: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            textAlign: 'left',
            color: '#333',
            fontSize: '14px',
            transition: 'background 0.2s ease'
          },
          innerHTML: `${lang.flag} ${lang.name}`
        });

        button.addEventListener('mouseenter', () => {
          button.style.background = '#f0f0f0';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = selectedTarget === lang.code ? '#e3f2fd' : 'transparent';
        });

        button.addEventListener('click', () => {
          // Update selection
          selectedTarget = lang.code;
          targetDropdown.querySelectorAll('.ai-lang-button').forEach(btn => {
            btn.style.background = btn === button ? '#e3f2fd' : 'transparent';
            btn.style.fontWeight = btn === button ? '600' : '400';
          });
        });

        targetDropdown.appendChild(button);
      });
      targetSection.appendChild(targetDropdown);
      container.appendChild(targetSection);

      // Action buttons
      const buttonContainer = this.domUtils.createElement('div', {
        styles: {
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }
      });

      const cancelBtn = this.domUtils.createElement('button', {
        styles: {
          padding: '8px 16px',
          border: '1px solid #ddd',
          background: 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#666'
        },
        innerHTML: 'Cancel'
      });
      cancelBtn.addEventListener('click', () => {
        container.remove();
        resolve(null);
      });

      const translateBtn = this.domUtils.createElement('button', {
        styles: {
          padding: '8px 16px',
          border: 'none',
          background: '#4285f4',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'white',
          fontWeight: '600'
        },
        innerHTML: 'Translate'
      });
      translateBtn.addEventListener('click', () => {
        if (!selectedSource || !selectedTarget) {
          alert('Please select both source and target languages');
          return;
        }
        container.remove();
        resolve({ source: selectedSource, target: selectedTarget });
      });

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(translateBtn);
      container.appendChild(buttonContainer);

      document.body.appendChild(container);

      // Auto remove after 30 seconds
      setTimeout(() => {
        if (container.parentNode) {
          container.remove();
          resolve(null);
        }
      }, 30000);

      // Close on click outside
      const closeHandler = (e) => {
        if (!container.contains(e.target)) {
          container.remove();
          document.removeEventListener('click', closeHandler);
          resolve(null);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeHandler);
      }, 100);
    });
  }

  openSidebar() {
    // Clean up selected text
    const cleanText = this.selectedText
      .replace(/\b\d+\s+languages\b/gi, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Dispatch event to open sidebar with cleaned text
    window.dispatchEvent(new CustomEvent('chromeai-action', {
      detail: { 
        action: 'show-ai-result',
        text: cleanText,
        source: 'text-selection',
        type: 'selection'
      }
    }));
  }

  /**
   * Get user-friendly display name for feature
   */
  getFeatureDisplayName(featureTitle) {
    const featureMap = {
      'EXPLAIN': '💡 Explain',
      'SUMMARIZE-AI': '📄 Summarize',
      'TRANSLATE-AI': '🌐 Translate',
      'WRITER': '✏️ Write',
      'REWRITER': '🖊️ Rewrite',
      'PROOFREADER': '📝 Proofread',
      'SIMPLIFY': '📝 Simplify Text',
      'CREATE-QUIZ': '❓ Create Quiz',
      'CREATE-FLASHCARDS': '🃏 Create Flashcards',
      'SMART-NOTES': '📝 Smart Notes',
      'LEARNING-PATH': '🛤️ Learning Path',
      'DOCUMENT-CODE': '📋 Document Code',
      'LOOKUP-API': '🔍 Lookup API',
      'FIND-RESOURCES': '📚 Find Resources',
      'ANALYZE-DEPENDENCIES': '🔗 Analyze Dependencies',
      'RECOGNIZE-PATTERNS': '🔍 Recognize Patterns',
      'GENERATE-HASHTAGS': '🏷️ Generate Hashtags',
      'REPURPOSE-CONTENT': '♻️ Repurpose Content',
      'PLAN-CONTENT': '📋 Plan Content',
      'ANALYZE-VISUAL': '👁️ Analyze Visual',
      'FIND-SOURCES': '🔍 Find Sources',
      'GENERATE-CITATION': '📝 Generate Citation',
      'SYNTHESIZE-SOURCES': '🔬 Synthesize Sources',
      'BUILD-TIMELINE': '⏰ Build Timeline',
      'CREATE-LITERATURE-REVIEW': '📚 Literature Review',
      'IDENTIFY-PATTERNS': '🔍 Identify Patterns',
      'GENERATE-HYPOTHESIS': '💡 Generate Hypothesis',
      'SETUP-COLLABORATION': '🤝 Setup Collaboration',
      'EXPORT-RESEARCH': '📤 Export Research',
      'IMPROVE-WRITING': '✍️ Improve Writing',
      'CHANGE-TONE': '🎭 Change Tone',
      'SEO-OPTIMIZE': '🚀 SEO Optimize',
      'FACT-CHECK': '✅ Fact Check',
      'ANALYZE-CREDIBILITY': '🔍 Analyze Credibility'
    };
    
    return featureMap[featureTitle] || `🔧 ${featureTitle}`;
  }

  /**
   * Open sidebar for streaming with immediate animation
   */
  async openSidebarWithProcessing(featureTitle) {
    this.logger?.info('Opening sidebar for:', featureTitle);
    
    // 1. Get sidebar instance
    const sidebar = window.ChromeAIStudio?.smartSidebar;
    if (!sidebar) {
      console.warn('Sidebar not available');
      return;
    }
    
    // 2. Open sidebar if not already open
    if (!sidebar.isOpen || !sidebar.isOpen()) {
      // Trigger opening animation
      if (typeof sidebar.open === 'function') {
        sidebar.open();
      } else if (typeof sidebar.show === 'function') {
        sidebar.show();
      } else {
        // Fallback: dispatch open event
        window.dispatchEvent(new CustomEvent('chromeai-sidebar-open', {
          detail: { source: 'text-selection' }
        }));
      }
    }
    
    // 3. Wait for sidebar animation and UI rendering
    await new Promise(resolve => setTimeout(resolve, 200));
    
      // 4. Add user message showing feature used (trimmed to one line)
      const featureDisplayName = this.getFeatureDisplayName(featureTitle);
      window.dispatchEvent(new CustomEvent('chromeai-action', {
        detail: { 
          action: 'add-user-message',
          text: featureDisplayName,
          featureType: featureTitle,
          source: 'text-selection'
        }
      }));
    
    // 5. Small delay for user message to render
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Setup event-driven communication
   */
  setupEventListeners() {
    if (!this.eventBus) return;

    // Listen for mode changes
    this.eventBus.on('mode:changed', (mode) => {
      if (this.logger) {
        this.logger.debug('Mode changed to:', mode);
      }
      if (this.isVisible) {
        this.updateMenuContent();
      }
    });

    // Listen for AI responses
    this.eventBus.on('ai:success', (response) => {
      if (this.logger) {
        this.logger.debug('AI operation succeeded:', response.operation);
      }
    });

    this.eventBus.on('ai:error', (response) => {
      if (this.logger) {
        this.logger.warn('AI operation failed:', response.error);
      }
      this.showError(response.error.message || 'AI operation failed');
    });

    // Listen for sidebar events
    this.eventBus.on('sidebar:opened', () => {
      if (this.logger) {
        this.logger.debug('Sidebar opened, hiding menu');
      }
      this.hideMenu();
    });
  }

  async handleChromeAIFeature(featureId, isInPlace = false, targetLanguage = null) {
    
    // Open sidebar immediately for non-in-place operations
    if (!isInPlace) {
      await this.openSidebarWithProcessing(featureId.toUpperCase());
      
      // Create streaming message IMMEDIATELY with "AI is thinking"
      const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
      if (sidebarUI && sidebarUI.addStreamingMessage) {
        this.currentStreamingMessage = sidebarUI.addStreamingMessage();
      } else {
        console.warn('⚠️ Sidebar UI or addStreamingMessage not available');
      }
    }
    
    try {
      let result;
      const useStreaming = this.streamingEnabled && !isInPlace; // No streaming for in-place operations
      
      // Route to appropriate Chrome AI API
      switch (featureId) {
        case 'explain':
          // Map explain to LanguageModel API
          result = await this.useLanguageModelAPI(this.selectedText, 'explain', useStreaming);
          break;
          
        case 'proofreader':
          // No streaming support for proofreader
          result = await this.useProofreaderAPI(this.selectedText);
          if (result && result.error) {
            this.displayApiError(result.error);
            return;
          }
          if (result && result.result && isInPlace) {
            this.replaceSelectedText(result.result);
            return;
          }
          break;
          
        case 'summarize-ai':
          result = await this.useSummarizerAPI(this.selectedText, useStreaming);
          if (result && result.error) {
            this.displayApiError(result.error);
            return;
          }
          if (result && result.result && !isInPlace && !useStreaming) {
            const formattedResult = this.formatOutput(result.result, 'summary');
            result = formattedResult;
          }
          break;
          
        case 'translate-ai':
          result = await this.useTranslatorAPI(this.selectedText, targetLanguage, useStreaming);
          if (result && result.error) {
            this.displayApiError(result.error);
            return;
          }
          if (result && result.result && isInPlace) {
            this.replaceSelectedText(result.result);
            return;
          }
          break;
          
        case 'writer':
          result = await this.useWriterAPI(this.selectedText, useStreaming);
          if (result && result.error) {
            this.displayApiError(result.error);
            return;
          }
          if (result && result.result && isInPlace) {
            this.replaceSelectedText(result.result);
            return;
          }
          break;
          
        case 'rewriter':
          result = await this.useRewriterAPI(this.selectedText, useStreaming);
          if (result && result.error) {
            this.displayApiError(result.error);
            return;
          }
          if (result && result.result && isInPlace) {
            this.replaceSelectedText(result.result);
            return;
          }
          break;
          
        default:
          return;
      }
      
      // Show result in sidebar if not in-place
      // Note: For streaming features, the result is already shown via streaming UI
      // For non-streaming features, we need to show the result manually
      if (result && !isInPlace) {
        if (useStreaming) {
          // Double-check: if streaming didn't work, show result anyway
          setTimeout(() => {
            if (this.currentStreamingMessage && !this.currentStreamingMessage.querySelector('.message-content').textContent.trim()) {
              this.showResultInSidebar(result, featureId);
            }
          }, 2000);
        } else {
          this.showResultInSidebar(result, featureId);
        }
      }
      
    } catch (error) {
      console.error(`❌ Chrome AI API error for ${featureId}:`, error);
      
      // Update streaming message with error
      if (this.currentStreamingMessage && window.ChromeAIStudio?.smartSidebar?.ui) {
        window.ChromeAIStudio.smartSidebar.ui.errorStreamingMessage(this.currentStreamingMessage, error.message);
      }
      
      this.showError(`Failed to process with ${featureId}: ${error.message}`);
    } finally {
      // Clear current streaming message
      this.currentStreamingMessage = null;
    }
  }

  replaceSelectedText(newText) {
    if (!this.selectionRange) return false;
    
    try {
      // Create a span with highlight animation
      const highlightSpan = document.createElement('span');
      highlightSpan.textContent = newText;
      highlightSpan.style.cssText = `
        background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
        background-size: 200% 200%;
        animation: highlightFade 2s ease-out;
        padding: 2px 4px;
        border-radius: 3px;
        display: inline;
        transition: background 0.3s ease;
      `;
      
      // Add CSS animation if not already added
      if (!document.querySelector('#text-highlight-animation')) {
        const style = document.createElement('style');
        style.id = 'text-highlight-animation';
        style.textContent = `
          @keyframes highlightFade {
            0% {
              background-position: 0% 50%;
              box-shadow: 0 0 10px rgba(132, 250, 176, 0.5);
            }
            50% {
              background-position: 100% 50%;
              box-shadow: 0 0 20px rgba(132, 250, 176, 0.8);
            }
            100% {
              background: transparent;
              background-position: 0% 50%;
              box-shadow: none;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Replace selected text with highlighted span
      this.selectionRange.deleteContents();
      this.selectionRange.insertNode(highlightSpan);
      
      // Clear selection
      window.getSelection().removeAllRanges();
      
      // Remove highlight after animation completes
      setTimeout(() => {
        if (highlightSpan.parentNode) {
          const textNode = document.createTextNode(newText);
          highlightSpan.parentNode.replaceChild(textNode, highlightSpan);
        }
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to replace text:', error);
      return false;
    }
  }

  showNotification(result, featureType) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 600; margin-bottom: 8px;';
    title.textContent = `${featureType.toUpperCase()} Result:`;
    
    const content = document.createElement('div');
    content.style.cssText = 'max-height: 200px; overflow-y: auto; line-height: 1.4;';
    content.textContent = result;
    
    notification.appendChild(title);
    notification.appendChild(content);
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 8000);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 4000);
  }

  /**
   * Chrome AI API: Proofreader
   */
  async useProofreaderAPI(text) {
    try {
      if (this.logger) {
        this.logger.info('Using Proofreader API...');
      }
      
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Proofreader API not available' };
        this.displayApiError(err.error);
        return err;
      }
      
      const res = await ai.proofread(text);
      if (res && res.error) {
        this.displayApiError(res.error.message || res.error);
        return res;
      }
      
      // Handle new response format: {success, result, corrections, originalText, error}
      if (this.logger) {
        this.logger.info('Proofreader result received:', res.result);
      }
      
      if (res.success && res.corrections && res.corrections.length > 0) {
        // Add summary to show number of corrections
        return {
          ...res,
          summary: `✅ Found ${res.corrections.length} correction(s)`,
          displayText: res.result // Corrected text
        };
      } else if (res.success) {
        return {
          success: true,
          result: text,
          message: '✅ No corrections needed - text looks good!'
        };
      }
      
      return res;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Proofreader API error:', error);
      }
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  /**
   * Chrome AI API: Summarizer with optional streaming
   */
  async useSummarizerAPI(text, streaming = this.streamingEnabled) {
    if (this.logger) {
      this.logger.info(`Using Summarizer API... (streaming: ${streaming})`);
    }
    
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Summarizer API not available' };
        this.displayApiError(err.error);
        return err;
      }
      
      // Use constants for summarizer options if available
      const options = this.constants?.API_DEFAULTS?.SUMMARIZER || {
        type: 'key-points',
        format: 'markdown',
        length: 'medium'
      };
      
      if (!streaming) {
        // Batch processing
        const res = await ai.summarize(text, options);
        if (res && res.error) {
          this.displayApiError(res.error);
          return res;
        }
        
        if (this.logger) {
          this.logger.info('Summarizer result received:', res.result);
        }
        return res;
      } else {
        // Streaming processing - use existing message element
        const response = await ai.summarizeStreaming(text, options);
        if (!response.success) {
          this.displayApiError(response.error);
          return response;
        }
        
        // Use existing streaming message created by handleChromeAIFeature
        const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
        const messageElement = this.currentStreamingMessage;
        
        if (messageElement && sidebarUI) {
          await this.consumeStream(
            response.result,
            (chunk, fullText) => {
              sidebarUI.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              sidebarUI.completeStreamingMessage(messageElement);
            },
            (error) => {
              console.error('📋 Stream error:', error);
              sidebarUI.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          console.warn('📋 Fallback to old method - no message element or sidebar UI');
          // Fallback to old method if no message element
          return await this.consumeStreamToUI(response.result, 'summarize');
        }
        
        return { success: true };
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error('Summarizer API error:', error);
      }
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  /**
   * Chrome AI API: Translator with optional streaming
   */
  async useTranslatorAPI(text, targetLanguage = 'es', streaming = this.streamingEnabled) {
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Translator API not available' };
        this.displayApiError(err.error);
        return err;
      }
      
      if (!streaming) {
        // Batch processing
        const res = await ai.translate(text, 'en', targetLanguage || 'es');
        if (res && res.error) {
          this.displayApiError(res.error);
          return res;
        }
        return res;
      } else {
        // Streaming processing - use existing message element
        const response = await ai.translateStreaming(text, 'en', targetLanguage || 'es');
        if (!response.success) {
          this.displayApiError(response.error);
          return response;
        }
        
        // Use existing streaming message created by handleChromeAIFeature
        const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
        const messageElement = this.currentStreamingMessage;
        
        if (messageElement && sidebarUI) {
          await this.consumeStream(
            response.result,
            (chunk, fullText) => {
              sidebarUI.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              sidebarUI.completeStreamingMessage(messageElement);
            },
            (error) => {
              sidebarUI.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          // Fallback to old method if no message element
          return await this.consumeStreamToUI(response.result, 'translate');
        }
        
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Translator API error:', error);
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  /**
   * Chrome AI API: Writer with optional streaming
   */
  async useWriterAPI(text, streaming = this.streamingEnabled) {
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Writer API not available' };
        this.displayApiError(err.error);
        return err;
      }
      const prompt = `Continue or expand this text: ${text}`;
      
      if (!streaming) {
        // Batch processing
        const res = await ai.write(prompt);
        if (res && res.error) {
          this.displayApiError(res.error);
          return res;
        }
        return res;
      } else {
        // Streaming processing - use existing message element
        const response = await ai.writeStreaming(prompt);
        if (!response.success) {
          this.displayApiError(response.error);
          return response;
        }
        
        // Use existing streaming message created by handleChromeAIFeature
        const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
        const messageElement = this.currentStreamingMessage;
        
        if (messageElement && sidebarUI) {
          await this.consumeStream(
            response.result,
            (chunk, fullText) => {
              sidebarUI.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              sidebarUI.completeStreamingMessage(messageElement);
            },
            (error) => {
              sidebarUI.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          // Fallback to old method if no message element
          return await this.consumeStreamToUI(response.result, 'writer');
        }
        
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Writer API error:', error);
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  /**
   * Chrome AI API: Rewriter with optional streaming
   */
  async useRewriterAPI(text, streaming = this.streamingEnabled) {
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Rewriter API not available' };
        this.displayApiError(err.error);
        return err;
      }
      
      if (!streaming) {
        // Batch processing
        const res = await ai.rewrite(text);
        if (res && res.error) {
          this.displayApiError(res.error);
          return res;
        }
        return res;
      } else {
        // Streaming processing - use existing message element
        const response = await ai.rewriteStreaming(text);
        if (!response.success) {
          this.displayApiError(response.error);
          return response;
        }
        
        // Use existing streaming message created by handleChromeAIFeature
        const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
        const messageElement = this.currentStreamingMessage;
        
        if (messageElement && sidebarUI) {
          await this.consumeStream(
            response.result,
            (chunk, fullText) => {
              sidebarUI.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              sidebarUI.completeStreamingMessage(messageElement);
            },
            (error) => {
              sidebarUI.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          // Fallback to old method if no message element
          return await this.consumeStreamToUI(response.result, 'rewriter');
        }
        
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Rewriter API error:', error);
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  /**
   * Chrome AI API: Language Model (for explain feature) with optional streaming
   */
  async useLanguageModelAPI(text, action = 'explain', streaming = this.streamingEnabled) {
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        const err = { error: 'Language Model API not available' };
        this.displayApiError(err.error);
        return err;
      }
      
      // Create appropriate prompt based on action
      let prompt;
      switch (action) {
        case 'explain':
          prompt = `You are a helpful AI tutor. Explain this concept in simple terms: ${text}`;
          break;
        default:
          prompt = `Please help with this: ${text}`;
      }
      
      const options = {
        temperature: 0.7
      };
      
      if (!streaming) {
        // Batch processing
        const res = await ai.prompt(prompt, options);
        if (res && res.error) {
          this.displayApiError(res.error);
          return res;
        }
        return res;
      } else {
        // Streaming processing - use existing message element
        const response = await ai.promptStreaming(prompt, options);
        if (!response.success) {
          this.displayApiError(response.error);
          return response;
        }
        
        // Use existing streaming message created by handleChromeAIFeature
        const sidebarUI = window.ChromeAIStudio?.smartSidebar?.ui;
        const messageElement = this.currentStreamingMessage;
        
        if (messageElement && sidebarUI) {
          await this.consumeStream(
            response.result,
            (chunk, fullText) => {
              sidebarUI.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              sidebarUI.completeStreamingMessage(messageElement);
            },
            (error) => {
              sidebarUI.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          // Fallback to old method if no message element
          return await this.consumeStreamToUI(response.result, 'explain');
        }
        
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Language Model API error:', error);
      const err = { error: error && error.message ? error.message : String(error) };
      this.displayApiError(err.error);
      return err;
    }
  }

  // Helper: display a transient API error message near the selection menu
  displayApiError(message) {
    try {
      const existing = document.querySelector('.chromeai-selection-api-error');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.className = 'chromeai-selection-api-error';
      el.textContent = message;
      Object.assign(el.style, {
        position: 'fixed',
        zIndex: 12000,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '8px 10px',
        borderRadius: '6px',
        fontSize: '13px',
        pointerEvents: 'none'
      });
      const menu = document.querySelector('.ai-selection-menu');
      if (menu) {
        const r = menu.getBoundingClientRect();
        el.style.left = `${Math.min(window.innerWidth - 200, r.right + 8)}px`;
        el.style.top = `${Math.max(8, r.top)}px`;
      } else {
        el.style.right = '24px';
        el.style.top = '24px';
      }
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4500);
    } catch (e) {
      console.warn('displayApiError failed', e);
    }
  }

  /**
   * Show result in sidebar
   */
  showResultInSidebar(result, featureType) {
    
    if (this.logger) {
      this.logger.info('showResultInSidebar called with:', { result, featureType });
    }
    
    // Extract the actual result content
    let resultContent = result;
    if (typeof result === 'object' && result !== null) {
      resultContent = result.result || result.content || result.message || JSON.stringify(result);
    }
    
    // Always dispatch event to sidebar (sidebar handles processing timing)
    const eventDetail = { 
      action: 'show-ai-result',
      text: resultContent,
      source: 'text-selection',
      type: 'selection',
      featureType: featureType
    };
    window.dispatchEvent(new CustomEvent('chromeai-action', {
      detail: eventDetail
    }));
    
    // Emit success event
    if (this.eventBus) {
      this.eventBus.emit('ai:result-displayed', {
        feature: featureType,
        result: resultContent,
        timestamp: Date.now()
      });
    }
  }

  // Format output for different function types
  formatOutput(output, functionType) {
    // Handle different response formats
    let formatted = '';
    if (typeof output === 'string') {
      formatted = output;
    } else if (output?.result) {
      formatted = output.result;
    } else if (output?.error) {
      formatted = `Error: ${output.error}`;
    } else {
      formatted = JSON.stringify(output);
    }
    
    // Ensure we have a string to work with
    if (typeof formatted !== 'string') {
      formatted = String(formatted);
    }
    
    // Remove markdown formatting
    formatted = formatted.replace(/#{1,6}\s+/g, ''); // Remove headers
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    formatted = formatted.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    formatted = formatted.replace(/`(.*?)`/g, '$1'); // Remove code formatting
    formatted = formatted.replace(/^\d+\.\s+/gm, ''); // Remove numbered lists
    formatted = formatted.replace(/^[-*]\s+/gm, ''); // Remove bullet points
    formatted = formatted.replace(/\n{3,}/g, '\n\n'); // Remove extra newlines
    
    // Apply function-specific formatting
    switch (functionType) {
      case 'summary':
        // Limit summaries to 50-100 words
        const words = formatted.split(' ').slice(0, 100);
        return words.join(' ') + (words.length === 100 ? '...' : '');
        
      case 'translate':
      case 'rewrite':
      case 'tone-change':
        // For replacements, keep original length roughly
        return formatted.trim();
        
      case 'explanation':
        // Limit explanations to 150 words
        const explanationWords = formatted.split(' ').slice(0, 150);
        return explanationWords.join(' ') + (explanationWords.length === 150 ? '...' : '');
        
      default:
        // Generic cleanup and reasonable length
        const defaultWords = formatted.split(' ').slice(0, 200);
        return defaultWords.join(' ') + (defaultWords.length === 200 ? '...' : '');
    }
  }

  async handleStudentFeature(featureId, isInPlace = false, targetLanguage = null) {
    
    try {
      switch (featureId) {
        // Chrome AI direct features
        case 'explain':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        case 'summarize':
          return await this.handleChromeAIFeature('summarize-ai', isInPlace, targetLanguage);
        case 'simplify':
          return await this.handleChromeAIFeature('rewriter', isInPlace, targetLanguage);
        case 'translate':
          return await this.handleChromeAIFeature('translate-ai', isInPlace, targetLanguage);
        
        // Streaming features using unified workflow
        case 'create-quiz':
          return await this.executeFeatureWithStreaming(
            'Create Quiz',
            'Create 5 multiple-choice quiz questions based on this content. Format each question with 4 options (A, B, C, D) and mark the correct answer:\n\n{TEXT}'
          );
        case 'create-flashcards':
          return await this.executeFeatureWithStreaming(
            'Create Flashcards',
            'Create flashcards from this content. Format as:\nFront: [Question]\nBack: [Answer]\n\nCreate 5-7 flashcards:\n\n{TEXT}'
          );
        case 'smart-notes':
          return await this.executeFeatureWithStreaming(
            'Smart Notes',
            'Create organized study notes from this content. Use bullet points, headings, and highlight key concepts:\n\n{TEXT}'
          );
        case 'study-session':
          return await this.executeFeatureWithStreaming(
            'Study Session',
            'Start a study session for this content. Create a structured learning plan with goals and milestones:\n\n{TEXT}'
          );
        case 'learning-path':
          return await this.executeFeatureWithStreaming(
            'Learning Path',
            'Based on this content, suggest a learning path with topics to study in order:\n\n{TEXT}'
          );
        
        // Chrome AI API features
        case 'proofreader':
        case 'summarize-ai':
        case 'translate-ai':
        case 'writer':
        case 'rewriter':
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
        
        default:
          console.warn(`Unknown student feature: ${featureId}`);
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
      }
    } catch (error) {
      console.error(`❌ Student feature error for ${featureId}:`, error);
      this.showError(`Failed to process with ${featureId}: ${error.message}`);
    }
  }

  async handleDeveloperFeature(featureId, isInPlace = false, targetLanguage = null) {
    
    try {
      switch (featureId) {
        // Chrome AI direct features
        case 'explain-code':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        case 'fix-code':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        case 'rewrite-code':
          return await this.handleChromeAIFeature('rewriter', isInPlace, targetLanguage);
        case 'check-quality':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        
        // Streaming features using unified workflow
        case 'document-code':
          return await this.executeFeatureWithStreaming(
            'Document Code',
            'Generate comprehensive documentation for this code including JSDoc comments, parameter descriptions, and usage examples:\n\n{TEXT}'
          );
        case 'lookup-api':
          return await this.executeFeatureWithStreaming(
            'API Lookup',
            'Look up API reference information for this code or function. Provide documentation, parameters, and usage examples:\n\n{TEXT}'
          );
        case 'find-resources':
          return await this.executeFeatureWithStreaming(
            'Find Resources',
            'Find learning resources and documentation for this topic. Include tutorials, guides, and official documentation:\n\n{TEXT}'
          );
        case 'analyze-dependencies':
          return await this.executeFeatureWithStreaming(
            'Analyze Dependencies',
            'Analyze the dependencies and imports in this code. Identify potential issues and suggest improvements:\n\n{TEXT}'
          );
        case 'recognize-patterns':
          return await this.executeFeatureWithStreaming(
            'Recognize Patterns',
            'Recognize design patterns and coding patterns in this code. Identify the patterns used and explain their benefits:\n\n{TEXT}'
          );
        
        // Chrome AI API features
        case 'proofreader':
        case 'summarize-ai':
        case 'translate-ai':
        case 'writer':
        case 'rewriter':
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
        
        default:
          console.warn(`Unknown developer feature: ${featureId}`);
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
      }
    } catch (error) {
      console.error(`❌ Developer feature error for ${featureId}:`, error);
      this.showError(`Failed to process with ${featureId}: ${error.message}`);
    }
  }

  async handleCreatorFeature(featureId, isInPlace = false, targetLanguage = null) {
    
    try {
      switch (featureId) {
        // Chrome AI direct features
        case 'improve-writing':
          return await this.handleChromeAIFeature('rewriter', isInPlace, targetLanguage);
        case 'change-tone':
          return await this.handleChromeAIFeature('rewriter', isInPlace, targetLanguage);
        case 'seo-optimize':
          return await this.handleChromeAIFeature('rewriter', isInPlace, targetLanguage);
        
        // Streaming features using unified workflow
        case 'generate-hashtags':
          return await this.executeFeatureWithStreaming(
            'Generate Hashtags',
            'Generate 8-12 relevant hashtags for this content. Mix popular and niche tags:\n\n{TEXT}'
          );
        case 'repurpose-content':
          return await this.executeFeatureWithStreaming(
            'Repurpose Content',
            'Repurpose this content for different formats and platforms. Create variations for social media, blog posts, and marketing materials:\n\n{TEXT}'
          );
        case 'plan-content':
          return await this.executeFeatureWithStreaming(
            'Plan Content',
            'Create a content plan and strategy for this topic. Include content ideas, formats, and distribution channels:\n\n{TEXT}'
          );
        case 'analyze-visual':
          return await this.executeFeatureWithStreaming(
            'Analyze Visual',
            'Analyze the visual aspects of this content. Provide suggestions for improving visual appeal and engagement:\n\n{TEXT}'
          );
        
        // Chrome AI API features
        case 'proofreader':
        case 'summarize-ai':
        case 'translate-ai':
        case 'writer':
        case 'rewriter':
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
        
        default:
          console.warn(`Unknown creator feature: ${featureId}`);
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
      }
    } catch (error) {
      console.error(`❌ Creator feature error for ${featureId}:`, error);
      this.showError(`Failed to process with ${featureId}: ${error.message}`);
    }
  }

  async handleResearcherFeature(featureId, isInPlace = false, targetLanguage = null) {
    
    try {
      switch (featureId) {
        // Chrome AI direct features
        case 'fact-check':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        case 'analyze-credibility':
          return await this.handleChromeAIFeature('explain', isInPlace, targetLanguage);
        
        // Streaming features using unified workflow
        case 'find-sources':
          return await this.executeFeatureWithStreaming(
            'Find Sources',
            'Suggest reliable sources and references related to this topic. Include academic and authoritative sources:\n\n{TEXT}'
          );
        case 'generate-citation':
          return await this.executeFeatureWithStreaming(
            'Generate Citation',
            'Generate APA citations for this content. Format properly according to APA guidelines:\n\n{TEXT}'
          );
        case 'synthesize-sources':
          return await this.executeFeatureWithStreaming(
            'Synthesize Sources',
            'Synthesize information from these sources. Identify common themes, contradictions, and key insights:\n\n{TEXT}'
          );
        case 'build-timeline':
          return await this.executeFeatureWithStreaming(
            'Build Timeline',
            'Create a research timeline from this information. Organize chronologically with key dates and events:\n\n{TEXT}'
          );
        case 'create-literature-review':
          return await this.executeFeatureWithStreaming(
            'Create Literature Review',
            'Create a comprehensive literature review. Summarize key findings, methodologies, and gaps:\n\n{TEXT}'
          );
        case 'identify-patterns':
          return await this.executeFeatureWithStreaming(
            'Identify Patterns',
            'Identify patterns, trends, and anomalies in this data. Provide statistical insights:\n\n{TEXT}'
          );
        case 'generate-hypothesis':
          return await this.executeFeatureWithStreaming(
            'Generate Hypothesis',
            'Generate research hypotheses based on this information. Include testable predictions:\n\n{TEXT}'
          );
        case 'setup-collaboration':
          return await this.executeFeatureWithStreaming(
            'Setup Collaboration',
            'Set up collaboration tools and workflows for this research project. Include team coordination and sharing strategies:\n\n{TEXT}'
          );
        case 'export-research':
          return await this.executeFeatureWithStreaming(
            'Export Research',
            'Create an export strategy for this research data. Include formats, metadata, and sharing options:\n\n{TEXT}'
          );
        
        // Chrome AI API features
        case 'proofreader':
        case 'summarize-ai':
        case 'translate-ai':
        case 'writer':
        case 'rewriter':
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
        
        default:
          console.warn(`Unknown researcher feature: ${featureId}`);
          return await this.handleChromeAIFeature(featureId, isInPlace, targetLanguage);
      }
    } catch (error) {
      console.error(`❌ Researcher feature error for ${featureId}:`, error);
      this.showError(`Failed to process with ${featureId}: ${error.message}`);
    }
  }

  async handleInlineTranslation(targetLanguage) {
    if (!this.selectionRange) return;

    // Show loading indicator
    const loadingSpan = this.showLoadingIndicator();

    try {
      
      // Use Chrome AI API for translation
      if (this.aiManager) {
        const result = await this.aiManager.translate(this.selectedText, 'en', targetLanguage);
        if (result && result.result) {
          // Replace the loading indicator with translated text
          this.replaceLoadingWithText(loadingSpan, result.result);
          return;
        }
      }

      // Fallback: remove loading indicator if translation failed
      this.removeLoadingIndicator(loadingSpan);
      console.error('❌ Translation failed');
    } catch (error) {
      console.error('❌ Translation error:', error);
      this.removeLoadingIndicator(loadingSpan);
    }
  }

  showLoadingIndicator() {
    if (!this.selectionRange) return null;

    // Create loading span
    const loadingSpan = document.createElement('span');
    loadingSpan.className = 'chromeai-loading-indicator';
    loadingSpan.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: #4285f4;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      animation: pulse 1.5s ease-in-out infinite;
    `;
    loadingSpan.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="4" cy="12" r="3">
          <animate attributeName="r" values="3;3;5;3;3" dur="1s" repeatCount="indefinite"/>
        </circle>
        <circle cx="12" cy="12" r="3">
          <animate attributeName="r" values="3;3;5;3;3" dur="1s" begin="0.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="20" cy="12" r="3">
          <animate attributeName="r" values="3;3;5;3;3" dur="1s" begin="0.4s" repeatCount="indefinite"/>
        </circle>
      </svg>
      Translating...
    `;

    // Replace selected text with loading indicator
    try {
      this.selectionRange.deleteContents();
      this.selectionRange.insertNode(loadingSpan);
      
      // Clear selection
      window.getSelection().removeAllRanges();
      
      return loadingSpan;
    } catch (error) {
      console.error('❌ Error showing loading indicator:', error);
      return null;
    }
  }

  replaceLoadingWithText(loadingSpan, translatedText) {
    if (!loadingSpan || !translatedText) return;

    try {
      const textNode = document.createTextNode(translatedText);
      loadingSpan.parentNode.replaceChild(textNode, loadingSpan);
    } catch (error) {
      console.error('❌ Error replacing loading with text:', error);
    }
  }

  removeLoadingIndicator(loadingSpan) {
    if (!loadingSpan) return;

    try {
      // Replace loading indicator with original text
      const textNode = document.createTextNode(this.selectedText);
      loadingSpan.parentNode.replaceChild(textNode, loadingSpan);
    } catch (error) {
      console.error('❌ Error removing loading indicator:', error);
    }
  }

  updateMenuContent() {
    if (!this.menu) return;
    
    this.analyzeSelectedText(this.selectedText).then(features => {
      this.createMenu(features);
      this.positionMenu();
    });
  }
}

// Initialize and attach to global namespace
if (!window.ChromeAIStudio) {
  window.ChromeAIStudio = {};
}

window.ChromeAIStudio.textSelectionMenu = new TextSelectionMenu();
