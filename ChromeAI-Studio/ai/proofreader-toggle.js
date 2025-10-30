/**
 * ChromeAI Studio - Proofreader Toggle
 * A floating toggle button that proofreads all text on any webpage
 * Shows corrections as green highlights at exact text positions
 */

class ProofreaderToggle {
  constructor() {
    this.isActive = false;
    this.corrections = [];
    this.highlightElements = [];
    this.aiManager = null;
    this.toggleButton = null;
    this.loader = null;
    this.shouldStop = false;
    this.proofreadingTimeout = null;
  }

  /**
   * Initialize the proofreader toggle system
   */
  async init() {
    try {
      // Feature detection for Chrome AI Proofreader API
      const proofreaderAPISupported = 'Proofreader' in self;
      
      if (!proofreaderAPISupported) {
        console.error('❌ Chrome AI Proofreader API not supported in this browser');
        return;
      }

      // Initialize AI Manager
      if (typeof window.ChromeAIStudio !== 'undefined' && window.ChromeAIStudio.aiManager) {
        this.aiManager = window.ChromeAIStudio.aiManager;
        await this.aiManager.init();
        console.info('🟢 ProofreaderToggle initialized. AI Manager ready.');
      } else {
        console.error('❌ ChromeAI Studio not available');
        return;
      }

      // Create the toggle button
      this.createToggleButton();
      // Default to subtle highlight mode so hover tooltips use data-tooltip
      document.body.classList.add('chromeai-subtle-highlights');
    } catch (error) {
      console.error('❌ ProofreaderToggle initialization failed:', error);
    }
  }

  /**
   * Inject CSS styles into the page
   */
  injectStyles() {
    // Check if styles are already injected
    if (document.querySelector('#chromeai-proofreader-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'chromeai-proofreader-styles';
    style.textContent = `
      #chromeai-proofreader-toggle {
        position: fixed !important;
        top: 50% !important; /* Center vertically */
        right: 0px !important; /* Stick to right edge */
        transform: translateY(-50%) !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        width: 24px !important;
        height: 24px !important;
        max-width: none !important;
        background: transparent !important;
        backdrop-filter: none !important;
        border: none !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: block !important;
        justify-content: unset !important;
        align-items: unset !important;
        overflow: visible !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      #chromeai-proofreader-toggle:hover {
        width: auto !important;
        height: auto !important;
        right: 0px !important;
      }
      
      .proofreader-toggle-btn {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(0, 0, 0, 0.85) !important; /* Dark theme */
        backdrop-filter: blur(10px) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-right: none !important; /* No border on right edge */
        border-radius: 6px 0 0 6px !important; /* Rounded left only */
        padding: 4px !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        width: 24px !important;
        height: 24px !important;
        justify-content: center !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        user-select: none !important;
        position: relative !important;
        overflow: hidden !important;
        text-transform: none !important;
        letter-spacing: 0.3px !important;
        white-space: nowrap !important;
        pointer-events: auto !important;
      }
      
      .toggle-text {
        display: none !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        white-space: nowrap !important;
        color: white !important; /* Ensure white text for contrast */
        opacity: 0.9 !important; /* Slight transparency for elegance */
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .proofreader-toggle-btn svg {
        width: 14px !important;
        height: 14px !important;
        flex-shrink: 0 !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        pointer-events: none !important;
      }
      
      /* Hover expansion */
      #chromeai-proofreader-toggle:hover .proofreader-toggle-btn {
        padding: 8px 12px !important;
        width: auto !important;
        border-radius: 8px 0 0 8px !important;
        background: rgba(255, 255, 255, 0.95) !important; /* Light background on hover */
        color: black !important; /* Black text for light background */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; /* Lighter shadow */
      }
      
      #chromeai-proofreader-toggle:hover .toggle-text {
        display: inline !important;
        color: black !important; /* Black text for white background on hover */
        opacity: 1 !important; /* Full opacity on hover */
      }
      
      /* Active state */
      .proofreader-toggle-btn.active {
        background: rgba(139, 92, 246, 0.85) !important; /* Purple when active */
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.4) !important;
      }
      
      /* Ensure text visibility in active state */
      .proofreader-toggle-btn.active .toggle-text {
        color: white !important;
        opacity: 1 !important; /* Full opacity when active */
      }
      
      #chromeai-proofreader-toggle:hover .proofreader-toggle-btn svg {
        width: 18px !important;
        height: 18px !important;
        color: black !important; /* Black icon for light background */
      }
      
      /* Ensure button is always clickable */
      .proofreader-toggle-btn * {
        pointer-events: none !important;
      }
      
      .proofreader-toggle-btn {
        pointer-events: auto !important;
      }
      
      .proofreader-toggle-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 
          0 8px 20px rgba(0, 0, 0, 0.15),
          0 4px 8px rgba(0, 0, 0, 0.1) !important;
        border-color: #4CAF50 !important;
        background: #f8f9fa !important;
      }
      
      .proofreader-toggle-btn:active {
        transform: translateY(0px) scale(0.98) !important;
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.1),
          0 1px 2px rgba(0, 0, 0, 0.05) !important;
      }
      
      .proofreader-toggle-btn.active {
        background: #4CAF50 !important;
        color: white !important;
        border-color: #45a049 !important;
        box-shadow: 
          0 6px 16px rgba(76, 175, 80, 0.3),
          0 2px 4px rgba(0, 0, 0, 0.1) !important;
        transform: scale(1.02) !important;
        animation: pulse-green 2s infinite !important;
      }
      
      @keyframes pulse-green {
        0%, 100% { 
          box-shadow: 
            0 6px 16px rgba(76, 175, 80, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }
        50% { 
          box-shadow: 
            0 8px 20px rgba(76, 175, 80, 0.5),
            0 4px 8px rgba(0, 0, 0, 0.2) !important;
        }
      }
      
      .proofreader-toggle-btn.active:hover {
        transform: translateY(-2px) scale(1.04) !important;
        box-shadow: 
          0 8px 20px rgba(76, 175, 80, 0.4),
          0 4px 8px rgba(0, 0, 0, 0.1) !important;
        background: #45a049 !important;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .proofreader-toggle-btn svg {
        width: 18px !important;
        height: 18px !important;
        filter: none !important;
        transition: transform 0.3s ease !important;
      }
      
      .proofreader-toggle-btn:hover svg {
        transform: scale(1.05) !important;
      }
      
      .proofreader-toggle-btn.active svg {
        filter: brightness(0) invert(1) !important;
      }
      
      .toggle-text {
        font-weight: 600 !important;
        text-shadow: none !important;
        transition: all 0.3s ease !important;
      }
      
      .proofreader-toggle-btn:hover .toggle-text {
        text-shadow: none !important;
      }
      
      /* Correction highlight styles - following official implementation */
      .chromeai-correction {
        position: relative !important;
        background: linear-gradient(120deg, #a8e6cf 0%, #dcedc1 100%) !important;
        border-radius: 4px !important;
        padding: 2px 4px !important;
        margin: 0 2px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: inline !important;
        border: 2px solid #4CAF50 !important;
        font-weight: 600 !important;
        text-decoration: none !important;
      }
      
      /* Different styles for different correction types */
      .chromeai-correction-spelling {
        background: linear-gradient(120deg, #ffebee 0%, #ffcdd2 100%) !important;
        border-color: #f44336 !important;
        color: #c62828 !important;
      }
      
      .chromeai-correction-grammar {
        background: linear-gradient(120deg, #fff3e0 0%, #ffe0b2 100%) !important;
        border-color: #ff9800 !important;
        color: #e65100 !important;
      }
      
      .chromeai-correction-punctuation {
        background: linear-gradient(120deg, #e8f5e8 0%, #c8e6c9 100%) !important;
        border-color: #4caf50 !important;
        color: #2e7d32 !important;
      }
      
      .chromeai-correction-capitalization {
        background: linear-gradient(120deg, #e3f2fd 0%, #bbdefb 100%) !important;
        border-color: #2196f3 !important;
        color: #1565c0 !important;
      }
      
      .chromeai-correction-preposition {
        background: linear-gradient(120deg, #f3e5f5 0%, #e1bee7 100%) !important;
        border-color: #9c27b0 !important;
        color: #6a1b9a !important;
      }
      
      .chromeai-correction-missing-words {
        background: linear-gradient(120deg, #fce4ec 0%, #f8bbd9 100%) !important;
        border-color: #e91e63 !important;
        color: #ad1457 !important;
      }
      
      .chromeai-correction-other {
        background: linear-gradient(120deg, #f5f5f5 0%, #e0e0e0 100%) !important;
        border-color: #9e9e9e !important;
        color: #424242 !important;
      }
      
      .chromeai-correction::before {
        content: "✓" !important;
        position: absolute !important;
        top: -8px !important;
        left: -8px !important;
        background: #4CAF50 !important;
        color: white !important;
        border-radius: 50% !important;
        width: 16px !important;
        height: 16px !important;
        font-size: 10px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: bold !important;
      }
      
      .chromeai-correction:hover {
        background: linear-gradient(120deg, #88d8a3 0%, #b8e2a1 100%) !important;
        transform: scale(1.05) !important;
      }
      
      .chromeai-correction::after {
        content: attr(data-correction) !important;
        position: absolute !important;
        top: -35px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: rgba(0, 0, 0, 0.9) !important;
        color: white !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.2s ease !important;
        z-index: 1000001 !important;
      }
      
      .chromeai-correction:hover::after {
        opacity: 1 !important;
      }

      /* Subtle highlight mode: soft colors, light borders, no tick */
      body.chromeai-subtle-highlights .chromeai-correction {
        border: none !important;
        font-weight: inherit !important;
        position: relative !important;
        display: inline !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
      }
      body.chromeai-subtle-highlights .chromeai-correction::before { content: none !important; }
      /* Minimal tooltip driven by data-tooltip in subtle mode */
      body.chromeai-subtle-highlights .chromeai-correction::after {
        content: attr(data-tooltip) !important;
        position: absolute !important;
        left: 0 !important;
        top: -28px !important;
        background: rgba(17,24,39,0.95) !important; /* slate-900 */
        color: #f8fafc !important; /* slate-50 */
        padding: 4px 6px !important;
        border-radius: 6px !important;
        font-size: 11px !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transform: translateY(4px) !important;
        transition: opacity .12s ease, transform .12s ease !important;
        z-index: 1000001 !important;
      }
      body.chromeai-subtle-highlights .chromeai-correction:hover::after { opacity: 1 !important; transform: translateY(0) !important; }

      /* Subtle colored variants */
      body.chromeai-subtle-highlights .chromeai-correction--replaced {
        background: rgba(251, 191, 36, 0.22) !important; /* amber-500 */
        border: 1px solid rgba(217, 119, 6, 0.55) !important; /* amber-600 */
        padding: 2px 5px !important;
        border-radius: 4px !important;
        box-shadow: 0 1px 0 rgba(0,0,0,0.06) inset !important;
      }
      body.chromeai-subtle-highlights .chromeai-correction--replaced:hover { background: rgba(251,191,36,0.32) !important; border-color: rgba(180,83,9,0.7) !important; }
      body.chromeai-subtle-highlights .chromeai-correction--inserted {
        background: rgba(16,185,129,0.18) !important;
        border: 1px solid rgba(5,150,105,0.5) !important; /* emerald-600 */
        padding: 2px 5px !important;
        border-radius: 4px !important;
      }
      body.chromeai-subtle-highlights .chromeai-correction--deleted {
        text-decoration: line-through !important;
        color: #9ca3af !important;
        border-bottom: 1px dotted #9ca3af !important;
        background: none !important;
        padding: 0 1px !important;
      }
      
      /* Small loader */
      .chromeai-proofreader-loader {
        position: fixed !important;
        top: 80px !important;
        right: 20px !important;
        z-index: 2147483646 !important;
        width: 30px !important;
        height: 30px !important;
        pointer-events: none !important;
      }
      
      .loader-spinner {
        width: 30px !important;
        height: 30px !important;
        border: 3px solid rgba(76, 175, 80, 0.2) !important;
        border-top: 3px solid #4CAF50 !important;
        border-radius: 50% !important;
        animation: chromeai-spin 1s linear infinite !important;
      }
      
      @keyframes chromeai-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Processing highlight animation */
      .chromeai-processing-element {
        background: linear-gradient(90deg, 
          rgba(255, 193, 7, 0.2) 0%, 
          rgba(255, 193, 7, 0.5) 50%, 
          rgba(255, 193, 7, 0.2) 100%) !important;
        background-size: 200% 100% !important;
        animation: chromeai-processing-sweep 1.5s ease-in-out infinite !important;
        border-left: 4px solid #FFC107 !important;
        padding-left: 10px !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 0 10px rgba(255, 193, 7, 0.3) !important;
      }
      
      @keyframes chromeai-processing-sweep {
        0% { 
          background-position: -200% 0; 
          box-shadow: 0 0 10px rgba(255, 193, 7, 0.3) !important;
        }
        50% { 
          background-position: 200% 0; 
          box-shadow: 0 0 15px rgba(255, 193, 7, 0.5) !important;
        }
        100% { 
          background-position: -200% 0; 
          box-shadow: 0 0 10px rgba(255, 193, 7, 0.3) !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Create the floating toggle button
   */
  createToggleButton() {
    // Remove existing button if any
    if (this.toggleButton) {
      this.toggleButton.remove();
    }

    // Ensure styles are injected first
    this.injectStyles();

    // Create button container
    this.toggleButton = document.createElement('div');
    this.toggleButton.id = 'chromeai-proofreader-toggle';
    this.toggleButton.innerHTML = `
      <div class="proofreader-toggle-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,20A2,2 0 0,1 12,22A2,2 0 0,1 10,20H14M12,2A1,1 0 0,1 13,3V4.08C15.84,4.56 18,7.03 18,10V16L21,19H3L6,16V10C6,7.03 8.16,4.56 11,4.08V3A1,1 0 0,1 12,2Z" />
        </svg>
        <span class="toggle-text">Proof</span>
      </div>
    `;

    // Styles are now injected separately in injectStyles() method

    // Add event listener
    const btn = this.toggleButton.querySelector('.proofreader-toggle-btn');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleProofreading();
    });
    
    // Optional: add debugging hooks later if needed

    // Append to document
    document.body.appendChild(this.toggleButton);
  }

  /**
   * Toggle proofreading on/off - ONLY 2 STATES: OFF and ON
   */
  async toggleProofreading() {
    
    // Get button reference
    const btn = this.toggleButton?.querySelector('.proofreader-toggle-btn');
    if (!btn) {
      console.error('❌ Button not found');
      return;
    }
    
    if (this.isActive) {
      // TURN OFF - Simple and immediate
      this.isActive = false;
      this.shouldStop = true;
      
      // Update UI to OFF state
      btn.classList.remove('active', 'processing');
      const textElement = btn.querySelector('.toggle-text');
      if (textElement) {
        textElement.textContent = 'Proof';
      }
      
      // Clean up
      this.clearHighlights();
      this.clearAllProcessingHighlights();
      this.hideLoader();
    } else {
      // TURN ON - Simple and immediate
      this.isActive = true;
      this.shouldStop = false;
      
      // Update UI to ON state immediately
      btn.classList.add('active');
      const textElement = btn.querySelector('.toggle-text');
      if (textElement) {
        textElement.textContent = 'ON';
      }
      
      // Start processing in background
      this.showLoader();
      
      try {
        // Check Chrome AI Proofreader availability (following official implementation)
        const options = { 
          includeCorrectionTypes: true, 
          expectedInputLanguages: ['en'] // Note: official uses 'en' not ["en"]
        };
        
        const supportsOurUseCase = await self.Proofreader.availability(options);
        console.info('🔎 Proofreader availability:', supportsOurUseCase);
        
        if (supportsOurUseCase === 'unavailable') {
          console.warn('⚠️ Chrome AI Proofreader not available');
          return;
        }
        
        if (supportsOurUseCase !== 'available') {
        }
        
        // Extract and proofread text
        console.info('🧪 Starting page proofreading...');
        await this.extractAndProofreadText();
        
        this.hideLoader();
        console.info('✅ Proofreading finished.');
      } catch (error) {
        console.error('❌ Failed to activate proofreading:', error);
        // Reset on error
        this.isActive = false;
        btn.classList.remove('active');
        if (textElement) {
          textElement.textContent = 'Proof';
        }
        this.hideLoader();
      }
    }
  }

  /**
   * Activate proofreading mode
   */
  async activateProofreading() {
    try {
      
      // Set state immediately - SIMPLE AND RELIABLE
      this.isActive = true;
      this.shouldStop = false;
      
      const btn = this.toggleButton.querySelector('.proofreader-toggle-btn');
      btn.classList.add('processing');
      btn.querySelector('.toggle-text').textContent = 'Processing...';
      
      // Show small loader
      this.showLoader();
      
      // Let the AI proofreader work naturally without any hardcoded tests
      
      // Pre-create proofreader with user gesture (this click)
      try {
        await this.aiManager.createProofreader();
      } catch (error) {
        console.warn('⚠️ Failed to pre-create proofreader:', error);
      }
      
      // State already set above - no need for complex checks
      
      // Extract and proofread text
      await this.extractAndProofreadText();
      
      // Update UI state (isActive already set above)
      if (btn) {
        btn.classList.remove('processing');
        btn.classList.add('active');
        const textElement = btn.querySelector('.toggle-text');
        if (textElement) {
          textElement.textContent = 'Active';
        }
      }
      
      // Hide loader
      this.hideLoader();
    } catch (error) {
      console.error('❌ Failed to activate proofreading:', error);
      this.handleProofreadingError();
    }
  }

  /**
   * Create direct test highlights to verify the system works (preserving structure)
   */
  createDirectTestHighlights() {
    
    // Find elements containing "blog" text while preserving their structure
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div');
    const blogElements = [];
    
    elements.forEach(element => {
      if (element.textContent.toLowerCase().includes('blog') && 
          !element.querySelector('.chromeai-direct-test-highlight') &&
          element.children.length === 0) { // Only process elements with direct text content
        blogElements.push(element);
      }
    });
    
    blogElements.slice(0, 3).forEach((element, index) => {
      try {
        const text = element.textContent;
        const blogIndex = text.toLowerCase().indexOf('blog');
        
        if (blogIndex !== -1) {
          // Store original content
          if (!element.dataset.originalHTML) {
            element.dataset.originalHTML = element.innerHTML;
            element.dataset.originalText = element.textContent;
          }
          
          // Create replacement HTML with highlight
          const beforeText = text.substring(0, blogIndex);
          const afterText = text.substring(blogIndex + 4);
          
          const span = document.createElement('span');
          span.style.cssText = `
            background: #ff0000 !important;
            color: #ffffff !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-weight: bold !important;
            border: 2px solid #000000 !important;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
          `;
          span.className = 'chromeai-direct-test-highlight';
          span.textContent = 'weblog'; // Replace "blog" with "weblog"
          span.title = 'Test Correction: blog → weblog';
          span.dataset.original = 'blog';
          
          // Update element content while preserving any existing formatting
          element.innerHTML = '';
          if (beforeText) {
            element.appendChild(document.createTextNode(beforeText));
          }
          element.appendChild(span);
          if (afterText) {
            element.appendChild(document.createTextNode(afterText));
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to create direct highlight:', error);
      }
    });
  }

  /**
   * Deactivate proofreading mode
   */
  deactivateProofreading() {
    
    // Set state immediately - SIMPLE AND RELIABLE
    this.isActive = false;
    this.shouldStop = true;
    
    // Stop any ongoing proofreading process
    this.stopProofreading();
    
    // Remove all highlights and processing animations
    this.clearHighlights();
    this.clearAllProcessingHighlights();
    
    // Update UI state
    const btn = this.toggleButton.querySelector('.proofreader-toggle-btn');
    if (btn) {
      btn.classList.remove('active', 'processing');
      const textElement = btn.querySelector('.toggle-text');
      if (textElement) {
        textElement.textContent = 'Proof';
      }
    }
    
    // Hide loader
    this.hideLoader();
  }

  /**
   * Stop any ongoing proofreading process
   */
  stopProofreading() {
    
    // Clear any timeouts or intervals
    if (this.proofreadingTimeout) {
      clearTimeout(this.proofreadingTimeout);
      this.proofreadingTimeout = null;
    }
    
    // Clear any ongoing processing highlights immediately
    this.clearAllProcessingHighlights();
  }

  /**
   * Show small loader in top-right corner
   */
  showLoader() {
    if (this.loader) return; // Already showing
    
    this.loader = document.createElement('div');
    this.loader.className = 'chromeai-proofreader-loader';
    this.loader.innerHTML = `
      <div class="loader-spinner"></div>
    `;
    
    // Position fixed to top-right, slightly below the toggle button
    this.loader.style.cssText = `
      position: fixed !important;
      top: 60px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483646 !important;
      width: 30px !important;
      height: 30px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: none !important;
    `;
    
    document.body.appendChild(this.loader);
  }

  /**
   * Hide loader
   */
  hideLoader() {
    if (this.loader) {
      this.loader.remove();
      this.loader = null;
    }
  }

  /**
   * Extract all text content from the page and send for proofreading
   */
  async extractAndProofreadText() {
    // Check if we should stop before starting
    if (this.shouldStop) {
      return;
    }
    
    // Check if we're still active
    if (!this.isActive) {
      return;
    }
    
    // Get all text-containing elements, excluding script, style, and hidden elements
    const textElements = this.getTextElements();
    console.info('🧩 Candidate elements for proofreading:', textElements.length);
    
    let processedCount = 0;
    let highlightedCount = 0;
    let unchangedCount = 0;
    
    for (const element of textElements) {
      // Check if we should stop processing
      if (this.shouldStop) {
        break;
      }
      
      // Check if we're still active
      if (!this.isActive) {
        break;
      }
      
      const rawText = element.innerText || element.textContent || '';
      const trimmed = rawText.trim();
      if (trimmed.length > 10) { // Only proofread substantial text
        processedCount++;
        
        try {
          // Scroll element into view if it's off-screen
          const rect = element.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            // Small delay to let scroll complete
            await new Promise(resolve => setTimeout(resolve, 400));
          }
          
          // Check if we should stop before processing this element
          if (this.shouldStop) {
            break;
          }
          
          // Highlight the element being processed
          this.highlightProcessingElement(element, processedCount);
          
          // Enhanced logging with element info and type
          const elementInfo = {
            tag: element.tagName.toLowerCase(),
            class: element.className.substring(0, 30),
            textLength: rawText.length,
            wordCount: rawText.split(/\s+/).length,
            type: this.getElementType(element)
          };
          
          // Use Chrome AI Proofreader API
          const api = await this.proofreadWithChromeAI(rawText);
          let corrections = Array.isArray(api) ? api : (api?.corrections || []);
          const correctedInput = api && typeof api === 'object' ? api.correctedInput : null;
          console.debug('📄 Element', processedCount, {
            len: rawText.length,
            sample: rawText.slice(0, 80).replace(/\s+/g,' '),
            corrections: Array.isArray(corrections) ? corrections.length : 0,
            hasCorrectedInput: !!correctedInput
          });
          
          if (correctedInput) {
            // Prefer correctedInput to avoid index drift; render with visual diff highlights
            const sanitized = this.sanitizeCorrectedText(correctedInput);
            const changed = sanitized !== rawText;
            this.renderCorrectedWithDiff(element, rawText, sanitized, corrections);
            if (!changed) unchangedCount++;
            highlightedCount++;
          } else if (corrections && Array.isArray(corrections) && corrections.length > 0) {
            const merged = this.mergeOverlappingAndAdjacentCorrections(corrections);
            const before = rawText;
            this.applyCorrections(element, rawText, merged);
            const after = element.textContent || '';
            if (after === before) unchangedCount++;
            highlightedCount++;
          }
          
          // Remove processing highlight
          this.removeProcessingHighlight(element);
          
        } catch (error) {
          console.warn('⚠️ Failed to proofread element:', error);
          // Remove processing highlight on error too
          this.removeProcessingHighlight(element);
        }
        
        // Small delay to make sequential processing visible
        this.proofreadingTimeout = setTimeout(() => {
          // This will be cleared if stopProofreading is called
        }, 800);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check again if we should stop after delay
        if (this.shouldStop) {
          break;
        }
        
        // Limit processing to avoid overwhelming the page
        if (processedCount >= 50) {
          break;
        }
      }
    }
    console.info('📊 Proofreading summary:', { candidates: textElements.length, processed: processedCount, changed: highlightedCount, unchanged: unchangedCount });
  }

  /**
   * Use Chrome AI Proofreader API to proofread text (following official implementation)
   */
  async proofreadWithChromeAI(text) {
    try {
      
      // Create proofreader with proper options as per official implementation
      const proofreader = await self.Proofreader.create({
        includeCorrectionTypes: true,
        includeCorrectionExplanations: true,
        expectedInputLanguages: ['en'], // Note: official uses 'en' not ["en"]
        correctionExplanationLanguage: 'en'
      });
      
      // Proofread the text - return full object for stability
      const { correctedInput, corrections } = await proofreader.proofread(text);
      console.debug('🛠️ Proofreader result:', {
        inputLen: text?.length || 0,
        correctedLen: correctedInput?.length || 0,
        corrections: Array.isArray(corrections) ? corrections.length : 0
      });
      return { correctedInput: correctedInput || null, corrections: corrections || [] };
      
    } catch (error) {
      console.error('❌ Chrome AI Proofreader failed:', error);
      return [];
    }
  }

  /**
   * Get meaningful content elements for proofreading, focusing on substantial text
   */
  /**
   * IMPROVED: Smart text detection and sequencing for better proofreading order
   * Uses content hierarchy, reading flow, and semantic importance
   */
  getTextElements() {
    
    // Step 1: Find all potential content containers
    const contentContainers = this.findContentContainers();
    
    // Step 2: Extract text elements from containers in priority order
    const allElements = [];
    contentContainers.forEach(container => {
      const elements = this.extractElementsFromContainer(container);
      allElements.push(...elements);
    });
    
    // Step 3: Remove duplicates and validate
    const uniqueElements = this.removeDuplicates(allElements);
    
    // Step 4: Smart sorting by reading order and importance
    const sortedElements = this.sortByReadingOrder(uniqueElements);
    
    // Step 5: Limit to most important elements
    const finalElements = sortedElements.slice(0, 20); // Increased limit
    return finalElements.map(item => item.element);
  }

  /**
   * Find main content containers on the page
   */
  findContentContainers() {
    const containers = [];
    
    // Primary content selectors (in order of importance)
    const primarySelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '[class*="article"]',
      '[id*="content"]',
      '.mw-parser-output', // Wikipedia
      '.post',
      '.entry'
    ];
    
    primarySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isValidContainer(element)) {
            containers.push({
              element,
              priority: 1,
              type: 'primary'
            });
          }
        });
      } catch (error) {
        console.warn('⚠️ Error with primary selector:', selector, error);
      }
    });
    
    // Secondary content selectors
    const secondarySelectors = [
      '.container',
      '.wrapper',
      '.page',
      '.body',
      'body'
    ];
    
    secondarySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isValidContainer(element) && !containers.some(c => c.element === element)) {
            containers.push({
              element,
              priority: 2,
              type: 'secondary'
            });
          }
        });
      } catch (error) {
        console.warn('⚠️ Error with secondary selector:', selector, error);
      }
    });
    
    // Sort containers by priority and position
    return containers.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  /**
   * Check if element is a valid content container
   */
  isValidContainer(element) {
    if (!element || element.children.length === 0) return false;
    
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    
    // Must be visible
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    // Must have reasonable size
    if (rect.width < 200 || rect.height < 100) return false;
    
    // Must contain text content
    const text = element.textContent.trim();
    if (text.length < 100) return false;
    
    return true;
  }

  /**
   * Extract text elements from a container in reading order
   */
  extractElementsFromContainer(container) {
    const elements = [];
    const containerElement = container.element;
    
    // First, analyze the container to see if it's paragraph-heavy (like a blog)
    const isParagraphHeavy = this.isParagraphHeavyContainer(containerElement);
    
    // Define element types with dynamic priority based on content type
    const elementSelectors = [
      { 
        selector: 'h1, h2, h3, h4, h5, h6', 
        priority: isParagraphHeavy ? 2 : 1, // Lower priority for blogs
        minLength: 10, 
        type: 'heading' 
      },
      { 
        selector: 'p', 
        priority: isParagraphHeavy ? 1 : 2, // Higher priority for blogs
        minLength: 50, 
        type: 'paragraph' 
      },
      { 
        selector: 'blockquote', 
        priority: isParagraphHeavy ? 3 : 3, 
        minLength: 30, 
        type: 'quote' 
      },
      { 
        selector: 'figcaption, .caption', 
        priority: isParagraphHeavy ? 4 : 4, 
        minLength: 20, 
        type: 'caption' 
      },
      { 
        selector: 'dd', 
        priority: isParagraphHeavy ? 5 : 5, 
        minLength: 30, 
        type: 'definition' 
      },
      { 
        selector: 'summary', 
        priority: isParagraphHeavy ? 6 : 6, 
        minLength: 20, 
        type: 'summary' 
      },
      { 
        selector: 'li', 
        priority: isParagraphHeavy ? 7 : 7, 
        minLength: 40, 
        type: 'list-item' 
      }
    ];
    
    elementSelectors.forEach(({ selector, priority, minLength, type }) => {
      try {
        const foundElements = containerElement.querySelectorAll(selector);
        foundElements.forEach(element => {
          if (this.isValidContentElement(element, minLength, 3)) {
            elements.push({
              element,
              priority,
              type,
              container: containerElement,
              position: this.getElementPosition(element)
            });
          }
        });
      } catch (error) {
        console.warn('⚠️ Error extracting elements:', selector, error);
      }
    });
    
    return elements;
  }

  /**
   * Check if container is paragraph-heavy (like a blog article)
   */
  isParagraphHeavyContainer(container) {
    try {
      // Count different element types
      const paragraphs = container.querySelectorAll('p');
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const lists = container.querySelectorAll('li');
      const otherElements = container.querySelectorAll('blockquote, figcaption, dd, summary');
      
      // Filter out very short elements (likely not content)
      const validParagraphs = Array.from(paragraphs).filter(p => 
        p.textContent.trim().length >= 50
      );
      const validHeadings = Array.from(headings).filter(h => 
        h.textContent.trim().length >= 10
      );
      const validLists = Array.from(lists).filter(li => 
        li.textContent.trim().length >= 40
      );
      const validOthers = Array.from(otherElements).filter(el => 
        el.textContent.trim().length >= 20
      );
      
      const totalContentElements = validParagraphs.length + validHeadings.length + validLists.length + validOthers.length;
      
      // If no content elements, default to false
      if (totalContentElements === 0) return false;
      
      // Calculate paragraph ratio
      const paragraphRatio = validParagraphs.length / totalContentElements;
      
      // Consider it paragraph-heavy if:
      // 1. Paragraphs make up more than 60% of content, OR
      // 2. There are at least 5 paragraphs and they're the majority
      const isHeavy = paragraphRatio > 0.6 || (validParagraphs.length >= 5 && paragraphRatio > 0.4);
      
      return isHeavy;
    } catch (error) {
      console.warn('⚠️ Error analyzing container content:', error);
      return false;
    }
  }

  /**
   * Get element's position for sorting
   */
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      right: rect.right + window.scrollX
    };
  }

  /**
   * Remove duplicate elements
   */
  removeDuplicates(elements) {
    const seen = new Set();
    return elements.filter(item => {
      const key = item.element;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort elements by STRICT VISUAL READING ORDER
   * Priority: Visual position > Element type > Container
   */
  sortByReadingOrder(elements) {
    return elements.sort((a, b) => {
      const aPos = a.position;
      const bPos = b.position;
      
      // PRIMARY: Sort by visual Y position (top to bottom)
      const yDiff = aPos.top - bPos.top;
      if (Math.abs(yDiff) > 5) { // If significantly different Y positions
        return yDiff;
      }
      
      // SECONDARY: If roughly same Y position, sort by X position (left to right)
      const xDiff = aPos.left - bPos.left;
      if (Math.abs(xDiff) > 5) { // If significantly different X positions
        return xDiff;
      }
      
      // TERTIARY: If very close positions, sort by element type priority
      // (headings before paragraphs, etc.)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // QUATERNARY: If same type and position, sort by document order
      const docComparison = a.element.compareDocumentPosition(b.element);
      if (docComparison & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (docComparison & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      
      return 0;
    });
  }

  /**
   * Get element type for better logging
   */
  getElementType(element) {
    const tag = element.tagName.toLowerCase();
    const classList = element.className.toLowerCase();
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading';
    if (tag === 'p') return 'paragraph';
    if (tag === 'blockquote') return 'quote';
    if (tag === 'li') return 'list-item';
    if (['figcaption', 'caption'].includes(tag) || classList.includes('caption')) return 'caption';
    if (tag === 'dd') return 'definition';
    if (tag === 'summary') return 'summary';
    
    return 'content';
  }

  /**
   * Enhanced validation for content elements
   */
  isValidContentElement(element, minLength = 50, maxChildren = 2) {
    // Allow re-processing of elements (removed processed flag check)
    
    // Check visibility
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    // Get text content
    const text = element.textContent.trim();
    
    // 📏 ENHANCED TEXT LENGTH REQUIREMENTS
    if (text.length < minLength) return false;
    
    // 🚫 SKIP NAVIGATION AND UI ELEMENTS
    const classList = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    const parentClasses = element.parentElement ? element.parentElement.className.toLowerCase() : '';
    
    const uiKeywords = [
      'nav', 'menu', 'header', 'footer', 'sidebar', 'widget', 'toolbar',
      'button', 'btn', 'link', 'tab', 'dropdown', 'popup', 'modal',
      'breadcrumb', 'pagination', 'search', 'filter', 'sort', 'login',
      'signup', 'subscribe', 'share', 'social', 'ad', 'advertisement',
      'banner', 'promo', 'cookie', 'consent', 'notice', 'alert'
    ];
    
    const hasUIKeyword = uiKeywords.some(keyword => 
      classList.includes(keyword) || id.includes(keyword) || parentClasses.includes(keyword)
    );
    
    if (hasUIKeyword) return false;
    
    // 🏗️ CHECK ELEMENT STRUCTURE
    if (element.children.length > maxChildren) return false;
    
    // 🔤 CONTENT QUALITY CHECKS
    
    // Skip if mostly numbers or symbols (likely UI elements)
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 5) return false;
    
    // Skip if mostly uppercase (likely headers/navigation)
    const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (uppercaseRatio > 0.7) return false;
    
    // Skip if it's just a single word or short phrase
    if (!text.includes(' ') || wordCount < 3) return false;
    
    // 📍 POSITION-BASED FILTERING
    const rect = element.getBoundingClientRect();
    
    // Skip elements that are likely off-screen or hidden
    if (rect.width < 10 || rect.height < 10) return false;
    
    // Skip elements with suspicious positioning (likely overlays or hidden content)
    if (rect.top < -1000 || rect.left < -1000) return false;
    
    // ✅ POSITIVE INDICATORS
    
    // Boost score for elements with good content indicators
    const contentIndicators = [
      // Wikipedia specific
      'mw-parser-output', 'mw-content-text',
      // General content
      'content', 'article', 'post', 'entry', 'text', 'body',
      'description', 'summary', 'excerpt', 'paragraph'
    ];
    
    const hasContentIndicator = contentIndicators.some(indicator =>
      classList.includes(indicator) || id.includes(indicator) || parentClasses.includes(indicator)
    );
    
    // Lower requirements for elements with good content indicators
    if (hasContentIndicator && text.length >= 30) return true;
    
    // 📝 SENTENCE STRUCTURE CHECK
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    if (sentenceCount === 0 && text.length > 100) return false; // Long text without sentences is suspicious
    
    return true;
  }

  /**
   * Get direct text nodes from an element
   */
  getDirectTextNodes(element) {
    const textNodes = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        textNodes.push(child);
      }
    }
    return textNodes;
  }

  /**
   * Apply corrections to an element using Chrome AI Proofreader format
   */
  applyCorrections(element, originalText, corrections) {
    
    // Skip if no corrections
    if (!corrections || corrections.length === 0) return;
    
    // Store original content for restoration
    if (!element.dataset.originalText) {
      element.dataset.originalText = originalText;
      element.dataset.originalHTML = element.innerHTML;
    }
    
    // Sort corrections by startIndex (reverse order to maintain indices)
    corrections.sort((a, b) => b.startIndex - a.startIndex);
    
    // Create the corrected HTML by replacing text segments
    let correctedHTML = '';
    let lastIndex = 0;
    
    for (const correction of corrections) {
      const originalWord = originalText.substring(correction.startIndex, correction.endIndex);
      const correctedText = correction.correction;
      
      // Add text before the correction
      if (correction.startIndex > lastIndex) {
        correctedHTML += this.escapeHtml(originalText.substring(lastIndex, correction.startIndex));
      }
      
      // Add the corrected text with highlighting (following official implementation)
      const correctionType = correction.type || 'other';
      const tipType = (correction.type || 'other').toUpperCase();
      const tipText = `${this.escapeHtml(originalWord)} → ${this.escapeHtml(correctedText)}${correction.explanation ? ('\n' + this.escapeHtml(correction.explanation)) : ''}`;
      const correctionSpanHTML = `<span class="chromeai-correction chromeai-correction-${correctionType} chromeai-correction--replaced" 
        data-original="${this.escapeHtml(originalWord)}" 
        data-corrected="${this.escapeHtml(correctedText)}" 
        data-type="${correctionType}"
        data-tooltip="${tipType}\n${tipText}"
        data-correction="${tipType}\n${tipText}"
        title="Original: &quot;${this.escapeHtml(originalWord)}&quot; → Corrected: &quot;${this.escapeHtml(correctedText)}&quot;${correction.explanation ? ' - ' + this.escapeHtml(correction.explanation) : ''}">${this.escapeHtml(correctedText)}</span>`;
      
      correctedHTML += correctionSpanHTML;
      lastIndex = correction.endIndex;
    }
    
    // Add remaining text after the last correction
    if (lastIndex < originalText.length) {
      correctedHTML += this.escapeHtml(originalText.substring(lastIndex));
    }
    
    // Apply the corrected HTML
    try {
      element.innerHTML = correctedHTML;
    } catch (error) {
      console.error('❌ Error applying corrections:', error);
      // Fallback: try simple text replacement
      this.fallbackTextReplacement(element, originalText, corrections);
      return;
    }
    
    // Track this element for cleanup
    this.highlightElements.push(element);
    
    // Add click handlers for corrections
    this.addCorrectionClickHandlers(element);
    
    // Add visual confirmation
    if (corrections.length > 0) {
      // Flash the element briefly to show something happened
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000);
      
      // Count total highlights on page
      const totalHighlights = document.querySelectorAll('.chromeai-correction').length;
    }
  }

  /**
   * Render corrected text with visual diff highlights when only correctedInput is available
   */
  renderCorrectedWithDiff(element, originalText, correctedText, corrections = []) {
    try {
      const tokenize = (s) => s.match(/([A-Za-z0-9’']+|[^A-Za-z0-9\s]+|\s+)/g) || [];
      const A = tokenize(originalText);
      const B = tokenize(correctedText);
      const n = A.length, m = B.length;
      const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = (A[i] === B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      const segs = [];
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) { segs.push({ t: 'eq', v: B[j] }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { segs.push({ t: 'del', v: A[i++] }); }
        else { segs.push({ t: 'ins', v: B[j++] }); }
      }
      while (i < n) segs.push({ t: 'del', v: A[i++] });
      while (j < m) segs.push({ t: 'ins', v: B[j++] });
      const coalesced = [];
      for (const s of segs) { const last = coalesced[coalesced.length - 1]; if (last && last.t === s.t) last.v += s.v; else coalesced.push({ ...s }); }
      const finalSegs = [];
      for (let k = 0; k < coalesced.length; k++) { const cur = coalesced[k], nxt = coalesced[k + 1]; if (cur && nxt && cur.t === 'del' && nxt.t === 'ins') { finalSegs.push({ t: 'rep', o: cur.v, c: nxt.v }); k++; } else finalSegs.push(cur); }
      const isWS = (s) => /^(\s+)$/.test(s);
      let html = '';
      let highlightCount = 0;
      const maxHighlightsPerElement = 80;
      for (let idx = 0, origPtr = 0; idx < finalSegs.length; idx++) {
        const s = finalSegs[idx];
        if (s.t === 'eq') { html += this.escapeHtml(s.v); origPtr += s.v.length; continue; }
        if (s.t === 'rep') {
          if (!isWS(s.c)) {
            if (highlightCount >= maxHighlightsPerElement) { html += ` <span style="color:#64748b;">+${finalSegs.length - idx} more changes</span>`; break; }
            const o = this.escapeHtml(s.o), c = this.escapeHtml(s.c);
            // Map to correction type/explanation if overlapping original range
            let typeAttr = '';
            let titleExtra = '';
            let tooltip = '';
            const segStart = origPtr;
            const segEnd = origPtr + s.o.length;
            const match = (corrections||[]).find(cr => typeof cr.startIndex==='number' && typeof cr.endIndex==='number' && !(cr.endIndex <= segStart || cr.startIndex >= segEnd));
            if (match) {
              const t = match.type || 'other';
              typeAttr = ` data-type="${t}"`;
              if (match.explanation) titleExtra = `\n${this.escapeHtml(match.explanation)}`;
              tooltip = `${t.toUpperCase()}\n${o} → ${c}${titleExtra ? ("\n"+titleExtra) : ''}`;
            } else {
              tooltip = `${o} → ${c}`;
            }
            html += `<span class="chromeai-correction chromeai-correction--replaced"${typeAttr} data-tooltip="${tooltip}" data-correction="${tooltip}" title="Original: &quot;${o}&quot; → Corrected: &quot;${c}&quot;${titleExtra}" data-original="${o}">${c}</span>`; highlightCount++;
          } else { html += s.c; }
          origPtr += s.o.length;
        } else if (s.t === 'ins') {
          if (!isWS(s.v)) {
            if (highlightCount >= maxHighlightsPerElement) { html += ` <span style=\"color:#64748b;\">+${finalSegs.length - idx} more changes</span>`; break; }
            const c = this.escapeHtml(s.v);
            html += `<span class="chromeai-correction chromeai-correction--inserted" data-type="inserted" data-tooltip="INSERTED\n${c}" data-correction="INSERTED\n${c}" title="Inserted: &quot;${c}&quot;">${c}</span>`; highlightCount++;
          } else { html += s.v; }
        } else if (s.t === 'del') {
          if (!isWS(s.v)) {
            const o = this.escapeHtml(s.v);
            html += `<span class="chromeai-correction chromeai-correction--deleted" data-type="deleted" data-tooltip="DELETED\n${o}" data-correction="DELETED\n${o}" data-original="${o}" title="Deleted: &quot;${o}&quot;">${o}</span>`; highlightCount++;
          } else { html += s.v; }
        }
      }
      element.innerHTML = html;
      this.highlightElements.push(element);
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = '#fff3cd';
      setTimeout(() => { element.style.backgroundColor = ''; }, 1000);
    } catch (e) { element.textContent = correctedText; }
  }
  /**
   * Fallback text replacement method when HTML replacement fails
   */
  fallbackTextReplacement(element, originalText, corrections) {
    try {
      if (!Array.isArray(corrections) || corrections.length === 0) return;
      const merged = this.mergeOverlappingAndAdjacentCorrections(corrections);
      // Apply via index-based splices in reverse order
      let out = originalText;
      const reversed = [...merged].sort((a, b) => b.startIndex - a.startIndex);
      for (const c of reversed) {
        out = out.substring(0, c.startIndex) + (c.correction || '') + out.substring(c.endIndex);
      }
      out = this.sanitizeCorrectedText(out);
      element.textContent = out;
      element.classList.add('chromeai-corrected');
    } catch (error) {
      console.error('❌ Fallback text replacement failed:', error);
    }
  }

  /**
   * Merge overlapping corrections to avoid conflicts
   */
  mergeOverlappingCorrections(corrections) {
    if (corrections.length <= 1) return corrections;
    
    const merged = [];
    let current = { ...corrections[0] };
    
    for (let i = 1; i < corrections.length; i++) {
      const next = corrections[i];
      
      // Check if corrections overlap
      if (next.startIndex < current.endIndex) {
        // Merge overlapping corrections
        current.endIndex = Math.max(current.endIndex, next.endIndex);
        current.correction = current.correction + ' | ' + next.correction;
        if (next.explanation) {
          current.explanation = (current.explanation || '') + ' | ' + next.explanation;
        }
      } else {
        // No overlap, add current and move to next
        merged.push(current);
        current = { ...next };
      }
    }
    
    // Add the last correction
    merged.push(current);
    
    return merged;
  }

  mergeOverlappingAndAdjacentCorrections(corrections) {
    if (!Array.isArray(corrections) || corrections.length <= 1) return corrections || [];
    const sorted = [...corrections].sort((a, b) => a.startIndex - b.startIndex);
    const merged = [];
    let current = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (next.startIndex <= current.endIndex) {
        current.endIndex = Math.max(current.endIndex, next.endIndex);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  sanitizeCorrectedText(t) {
    try {
      if (!t) return t;
      let out = t;
      // Strip accidental leading labels like PROOFREAD_TEXT:
      out = out.replace(/^\s*PROOFREAD[_\s-]*TEXT:\s*/i, '');
      const repeatRe = /\b([A-Za-z]+)\s*\1\b/gi;
      let guard = 0;
      while (repeatRe.test(out) && guard < 10) {
        out = out.replace(repeatRe, '$1');
        guard++;
      }
      out = out
        .replace(/\s{3,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([\(\[“])\s+/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      return out;
    } catch (_) {
      return t;
    }
  }

  /**
   * Highlight element currently being processed
   */
  highlightProcessingElement(element, elementNumber = 0) {
    // Add processing class with animation
    element.classList.add('chromeai-processing-element');
    
    // Store original styles to restore later
    if (!element.dataset.originalBackground) {
      element.dataset.originalBackground = element.style.background || '';
      element.dataset.originalBorderLeft = element.style.borderLeft || '';
      element.dataset.originalPaddingLeft = element.style.paddingLeft || '';
    }
    
    // Add a small processing indicator number
    const processingIndicator = document.createElement('div');
    processingIndicator.className = 'chromeai-processing-indicator';
    processingIndicator.textContent = elementNumber;
    processingIndicator.style.cssText = `
      position: absolute !important;
      top: -10px !important;
      left: -10px !important;
      background: #FFC107 !important;
      color: #000 !important;
      border-radius: 50% !important;
      width: 20px !important;
      height: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 10px !important;
      font-weight: bold !important;
      z-index: 10000 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    `;
    
    // Make element position relative to show indicator
    const originalPosition = element.style.position;
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative';
      element.dataset.originalPosition = 'static';
    }
    
    element.appendChild(processingIndicator);
    element.dataset.processingIndicator = 'true';
  }
  
  /**
   * Remove processing highlight from element
   */
  removeProcessingHighlight(element) {
    // Remove processing class
    element.classList.remove('chromeai-processing-element');
    
    // Remove processing indicator
    if (element.dataset.processingIndicator) {
      const indicator = element.querySelector('.chromeai-processing-indicator');
      if (indicator) {
        indicator.remove();
      }
      delete element.dataset.processingIndicator;
      
      // Restore original position
      if (element.dataset.originalPosition === 'static') {
        element.style.position = 'static';
        delete element.dataset.originalPosition;
      }
    }
    
    // Restore original styles
    if (element.dataset.originalBackground !== undefined) {
      element.style.background = element.dataset.originalBackground;
      element.style.borderLeft = element.dataset.originalBorderLeft;
      element.style.paddingLeft = element.dataset.originalPaddingLeft;
      
      // Clean up data attributes
      delete element.dataset.originalBackground;
      delete element.dataset.originalBorderLeft;
      delete element.dataset.originalPaddingLeft;
    }
  }
  
  /**
   * Clear all processing highlights from the page
   */
  clearAllProcessingHighlights() {
    const processingElements = document.querySelectorAll('.chromeai-processing-element');
    processingElements.forEach(element => {
      this.removeProcessingHighlight(element);
    });
  }

  /**
   * Add click handlers to correction highlights
   */
  addCorrectionClickHandlers(element) {
    const corrections = element.querySelectorAll('.chromeai-correction');
    corrections.forEach(correction => {
      correction.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const correctionText = correction.dataset.correction;
        const originalText = correction.dataset.original;
        
        // Show a more detailed tooltip or modal with correction info
        this.showCorrectionDetails(correction, correctionText, originalText);
      });
    });
  }

  /**
   * Show detailed correction information
   */
  showCorrectionDetails(element, correctionText, originalText) {
    // Remove any existing detail popups
    document.querySelectorAll('.chromeai-correction-detail').forEach(el => el.remove());
    
    // Get the corrected text from the element
    const correctedText = element.dataset.corrected || element.textContent;
    const originalWord = element.dataset.original || originalText;
    
    // Create detail popup
    const detail = document.createElement('div');
    detail.className = 'chromeai-correction-detail';
    detail.innerHTML = `
      <div class="correction-popup">
        <div class="correction-header">
          <strong>Text Correction Applied</strong>
          <button class="close-btn">&times;</button>
        </div>
        <div class="correction-content">
          <div class="original">Original: <em>"${originalWord}"</em></div>
          <div class="suggested">Corrected to: <strong>"${correctedText}"</strong></div>
          ${correctionText && correctionText.includes && correctionText.includes(' - ') ? `<div class="explanation">Reason: ${correctionText.split(' - ')[1]}</div>` : ''}
          <div class="action-buttons">
            <button class="keep-btn" onclick="this.closest('.chromeai-correction-detail').remove()">Keep Change</button>
            <button class="revert-btn" onclick="this.parentElement.parentElement.parentElement.parentElement.querySelector('.chromeai-correction').textContent = '${originalWord}'; this.closest('.chromeai-correction-detail').remove()">Revert to Original</button>
          </div>
        </div>
      </div>
    `;
    
    // Add popup styles if not already present
    if (!document.querySelector('#chromeai-correction-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'chromeai-correction-popup-styles';
      style.textContent = `
        .chromeai-correction-detail {
          position: absolute;
          z-index: 1000001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .correction-popup {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 250px;
          max-width: 400px;
        }
        
        .correction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          border-radius: 8px 8px 0 0;
          font-size: 14px;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .correction-content {
          padding: 16px;
          font-size: 13px;
          line-height: 1.4;
        }
        
        .correction-content > div {
          margin-bottom: 8px;
        }
        
        .correction-content > div:last-child {
          margin-bottom: 0;
        }
        
        .original {
          color: #666;
        }
        
        .suggested {
          color: #28a745;
        }
        
        .explanation {
          color: #495057;
          font-style: italic;
        }
        
        .action-buttons {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        
        .action-buttons button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        }
        
        .keep-btn {
          background: #28a745;
          color: white;
        }
        
        .revert-btn {
          background: #dc3545;
          color: white;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Position popup near the correction
    const rect = element.getBoundingClientRect();
    detail.style.position = 'fixed';
    detail.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
    detail.style.top = (rect.bottom + 10) + 'px';
    
    // Add to document
    document.body.appendChild(detail);
    
    // Add close handler
    detail.querySelector('.close-btn').addEventListener('click', () => {
      detail.remove();
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      if (detail.parentNode) detail.remove();
    }, 5000);
  }

  /**
   * Create a visual test highlight to verify the system works
   */
  createVisualTestHighlight(element, text, startIndex, endIndex) {
    
    // Create a very obvious highlight using direct DOM manipulation
    const range = document.createRange();
    const textNode = element.firstChild;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      try {
        range.setStart(textNode, startIndex);
        range.setEnd(textNode, endIndex);
        
        const highlightSpan = document.createElement('span');
        highlightSpan.style.cssText = `
          background: #ffff00 !important;
          color: #000 !important;
          padding: 2px 4px !important;
          border: 2px solid #ff0000 !important;
          border-radius: 4px !important;
          font-weight: bold !important;
        `;
        highlightSpan.className = 'chromeai-test-highlight';
        
        range.surroundContents(highlightSpan);
      } catch (error) {
        console.warn('⚠️ Failed to create visual test highlight:', error);
      }
    }
  }

  /**
   * Create a demo paragraph with intentional errors for testing
   */
  createDemoErrorParagraph() {
    // Check if demo already exists
    if (document.querySelector('#chromeai-demo-paragraph')) {
      return;
    }
    
    const demoDiv = document.createElement('div');
    demoDiv.id = 'chromeai-demo-paragraph';
    demoDiv.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      width: 300px;
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      z-index: 999998;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    `;
    
    const demoHTML = `
      <div style="font-weight: bold; color: #856404; margin-bottom: 10px;">
        📝 Proofreader Demo - Text with Errors
      </div>
      <p>
        This is a sentance with some erors that the proofreader should detect and fix. 
        Their are several mistakes here, including wrong word choices and speling errors.
        The system will highlght these mistakes and sugest corrections.
      </p>
      <button onclick="this.parentElement.remove()" style="
        background: #ffc107;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 10px;
      ">Remove Demo</button>
    `;
    
    demoDiv.innerHTML = demoHTML;
    document.body.appendChild(demoDiv);
  }

  /**
   * Test the highlighting system with fake corrections to verify it works
   */
  testHighlightingSystem() {
    
    // Find the demo paragraph
    const demoElement = document.querySelector('#chromeai-demo-paragraph p');
    if (!demoElement) {
      console.warn('⚠️ Demo paragraph not found for testing');
      return;
    }
    
    const text = demoElement.textContent;
    
    // Create fake corrections for obvious errors
    const fakeCorrections = [
      {
        startIndex: text.indexOf('sentance'),
        endIndex: text.indexOf('sentance') + 8,
        correction: 'sentence',
        type: 'spelling',
        explanation: 'Correct spelling of sentence'
      },
      {
        startIndex: text.indexOf('erors'),
        endIndex: text.indexOf('erors') + 5,
        correction: 'errors',
        type: 'spelling',
        explanation: 'Correct spelling of errors'
      },
      {
        startIndex: text.indexOf('Their are'),
        endIndex: text.indexOf('Their are') + 9,
        correction: 'There are',
        type: 'grammar',
        explanation: 'Correct usage of "there are"'
      }
    ].filter(correction => correction.startIndex !== -1); // Only include corrections that were found
    
    if (fakeCorrections.length > 0) {
      this.applyCorrections(demoElement, text, fakeCorrections);
    } else {
      console.warn('⚠️ No fake corrections could be applied - text may have changed');
    }
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all correction highlights and restore original HTML structure
   */
  clearHighlights() {
    // Remove any correction detail popups
    document.querySelectorAll('.chromeai-correction-detail').forEach(el => el.remove());
    
    // Restore original HTML for tracked elements
    this.highlightElements.forEach(element => {
      if (element.dataset.originalHTML) {
        // Restore complete original HTML structure
        element.innerHTML = element.dataset.originalHTML;
        delete element.dataset.originalHTML;
        delete element.dataset.originalText;
      } else if (element.dataset.originalText) {
        // Fallback to text restoration
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    });
    
    // Clean up any remaining correction spans that weren't tracked
    const corrections = document.querySelectorAll('.chromeai-correction');
    corrections.forEach(correction => {
      const parent = correction.parentNode;
      if (parent) {
        // Replace with original text if available, otherwise use current text
        const originalText = correction.dataset.original || correction.textContent;
        parent.replaceChild(document.createTextNode(originalText), correction);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
    
    // Clean up test highlights
    const testHighlights = document.querySelectorAll('.chromeai-direct-test-highlight, .chromeai-test-highlight');
    testHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        const originalText = highlight.dataset.original || 'blog'; // Restore original "blog" text
        parent.replaceChild(document.createTextNode(originalText), highlight);
        parent.normalize();
      }
    });
    
    // Remove popup styles
    const popupStyles = document.querySelector('#chromeai-correction-popup-styles');
    if (popupStyles) popupStyles.remove();
    
    this.highlightElements = [];
    this.corrections = [];
  }

  /**
   * Handle proofreading errors
   */
  handleProofreadingError() {
    const btn = this.toggleButton?.querySelector('.proofreader-toggle-btn');
    if (!btn) return;
    
    btn.classList.remove('processing', 'active');
    const textElement = btn.querySelector('.toggle-text');
    if (textElement) {
      textElement.textContent = 'Error';
    }
    
    this.hideLoader();
    
    // Reset after a delay
    setTimeout(() => {
      if (textElement) {
        textElement.textContent = 'Proof';
      }
    }, 2000);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    
    // Clear timeout
    if (this.proofreadingTimeout) {
      clearTimeout(this.proofreadingTimeout);
      this.proofreadingTimeout = null;
    }
    
    // Stop any ongoing proofreading
    this.stopProofreading();
    
    // Remove UI elements
    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }
    
    // Clear highlights and overlays
    this.clearHighlights();
    this.hideProcessingOverlay();
    
    // Clear references
    this.highlightElements = [];
    this.aiManager = null;
    this.loader = null;
    this.shouldStop = true;
  }
}

// Initialize proofreader toggle when page loads
let proofreaderToggle = null;

// Wait for page load and ChromeAI Studio
function initProofreaderToggle() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProofreaderToggle);
    return;
  }
  
  // Wait for ChromeAI Studio to be available
  const waitForChromeAI = async () => {
    const maxRetries = 50;
    let retries = 0;
    
    while (retries < maxRetries) {
      if (window.ChromeAIStudio?.aiManager) {
        try {
          proofreaderToggle = new ProofreaderToggle();
          await proofreaderToggle.init();
          return;
        } catch (error) {
          console.error('❌ Failed to initialize ProofreaderToggle:', error);
          return;
        }
      }
      
      retries++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ ChromeAI Studio not available after retries, skipping ProofreaderToggle');
  };
  
  waitForChromeAI();
}

// Start initialization
initProofreaderToggle();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (proofreaderToggle) {
    proofreaderToggle.cleanup();
  }
});
