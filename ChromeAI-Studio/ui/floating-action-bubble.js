/**
 * ChromeAI Studio - Floating Action Bubble
 * The main entry point for users to access AI tools
 */

class FloatingActionBubble {
  constructor() {
    this.isVisible = false;
    this.isExpanded = false;
    this.isHovering = false;
    this.bubble = null;
    this.circularMenu = null;
    this.modeCircles = [];
    this.currentSubmenu = null;
    this.position = 'bottom-right';
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.hoverTimeout = null;
    this.voiceListeningIndicator = null;
    this.menuVisible = false;
    this.submenuVisible = false;
    this.microphonePermissionDenied = false;
    this.voiceRetryCount = 0;
    this.maxVoiceRetries = 3;
    
    // Voice state management - simplified 3-state model
    this.voiceState = 'idle'; // listening, processing, speaking
    
    // Continuous voice listening properties
    this.lastProcessedTranscript = '';
    this.lastProcessedTime = 0;
    this.processingDebounce = 300; // REDUCED from 1000ms to 300ms for faster response
    
    // NEW: Enhanced debouncing
    this.lastTranscripts = []; // Track last 3 transcripts
    
    // NEW: Silence detection
    this.silenceTimer = null; // Timer for silence detection
    this.currentTranscript = ''; // Accumulate text during silence period
    
    // NEW: Conversation timeout management
    this.conversationTimeoutId = null; // Track conversation timeout
    
    // NEW: Permission caching
    this.lastPermissionCheck = 0; // Cache permission checks
    
    // NEW: Completion cooldown to prevent stray STT results
    this.completionCooldown = false;
    this.completionCooldownTimeout = null;
    
    // NEW: Cross-tab sync properties
    this.tabId = null; // Will be set in setupCrossTabSync
    this.isLeaderTab = false; // Leader election for focused tab
    
    // Tab visibility tracking
    this.tabHiddenWhileListening = false;
    this.tabHiddenWhileContinuous = false;
    this.windowBlurredWhileListening = false;
    
    // Voice mode management (new concept)
    this.voiceModeEnabled = false; // User-controlled voice mode
    this.voiceModeInitialized = false;
    
    // Wake word detection properties (now controlled by voice mode)
    this.wakeWordListening = false;
    this.wakeWordEnabled = false; // Changed default to false - only enabled when voice mode is on
    this.wakeWordRecognition = null;
    this.wakeWords = ['hey assistant', 'computer', 'hey computer', 'assistant'];
    this.wakeWordIndicator = null;
    this.mcpConversationActive = false;
    this.wakeWordAborted = false; // Track if wake word was aborted
    
    // Load voice mode state from storage (cross-tab sync)
    this.loadVoiceModeState();
    
    // Setup cross-tab synchronization
    this.setupCrossTabSync();
    
    // Setup tab visibility handlers for voice assistant
    this.setupTabVisibilityHandlers();
    
    // Don't auto-initialize - let main script handle it
    this.initialized = false;

    // By default the bubble is locked (not draggable). Set to false to re-enable dragging.
    this.lockBubble = true;

    // Margin (in px) used when anchoring the bubble to viewport edges
    this.bubbleMargin = 36; // change this value to increase/decrease margin
  }

  // Enhanced button interaction with ripple effect
  createRippleEffect(element, event) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.className = 'ai-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  async init() {
    if (this.initialized) return;
    
    // Get utilities
    this.domUtils = window.ChromeAIStudio?.domUtils;
    this.contextDetector = window.ChromeAIStudio?.contextDetector;
    
    // Initialize Permission Manager
    this.permissionManager = window.ChromeAIStudio?.PermissionManager ? 
      new window.PermissionManager() : null;

    // Store reference globally
    if (this.permissionManager && !window.ChromeAIStudio.permissionManager) {
      window.ChromeAIStudio.permissionManager = this.permissionManager;
    }
    
    if (!this.domUtils?.shouldShowUI()) {
      return;
    }
    await this.createBubble();
    await this.attachEventListeners();
    this.show();
    
    // Initialize wake word detection
    await this.initializeWakeWordDetection();
    
    // Restore voice mode state on page load
    await this.restoreVoiceModeOnLoad();
    
    this.initialized = true;
  }

  async createBubble() {
    // Main floating bubble
    this.bubble = this.domUtils.createElement('div', {
      className: 'ai-floating-bubble',
      attributes: {
        'data-ai-component': 'floating-bubble'
      },
      styles: {
        position: 'fixed',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'transparent !important',
        boxShadow: 'none !important',
        cursor: 'pointer',
        zIndex: this.domUtils.getHighZIndex(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: '0',
        transform: 'scale(0)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        userSelect: 'none',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box'
      },
      innerHTML: `
        <div class="ai-bubble-icon" id="main-bubble-icon">
          <!-- WebM animation will be inserted here -->
        </div>
      `
    });

    // Add dynamic styles
    this.domUtils.injectCSS(`
      :root {
        --ai-primary: #4285f4;
        --ai-secondary: #34a853;
        --ai-text-primary: #333;
        --ai-text-secondary: #666;
        --ai-border: #e0e0e0;
        --ai-hover: #f5f5f5;
        --ai-surface: #ffffff;
        --ai-bg-secondary: #f8f9fa;
      }
      
      .ai-floating-bubble {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        backdrop-filter: none !important;
      }
      
      .ai-floating-bubble .ai-bubble-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      .ai-floating-bubble .ai-bubble-icon video,
      .ai-floating-bubble .ai-bubble-icon canvas,
      .ai-floating-bubble .ai-bubble-icon img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 1 !important;
        visibility: visible !important;
        object-fit: contain !important;
      }
      
      .ai-floating-bubble:hover {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      .ai-floating-bubble:active {
        transform: scale(0.95) !important;
      }
      
      .ai-bubble-icon {
        position: relative;
        z-index: 2;
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
      
      .ai-floating-bubble.expanded .ai-bubble-icon {
        transform: rotate(10deg);
      }
      
      /* Pulse effect removed - using WebM animation instead */
      
      .ai-floating-bubble.dragging {
        transition: none !important;
        cursor: grabbing !important;
      }
    `, 'ai-floating-bubble-styles');

    // Position the bubble
    this.positionBubble();
    
    // Add to DOM
    document.body.appendChild(this.bubble);
    
    // Initialize Siri Lottie animation for main bubble
    this.initializeSiriAnimation();
  }

  async createCircularMenu() {
    if (this.circularMenu) return;
    this.circularMenu = this.domUtils.createElement('div', {
      className: 'ai-circular-menu',
      attributes: {
        'data-ai-component': 'circular-menu'
      },
      styles: {
        position: 'fixed',
        width: '300px',
        height: '300px',
        pointerEvents: 'auto', // FIXED: Allow interactions
        zIndex: '9999', // FIXED: Very high z-index to ensure visibility
        opacity: '0',
        transition: 'opacity 0.3s ease'
      }
    });

    // Create main menu options (primary level)
    const primaryOptions = [
      { 
        id: 'modes', 
        name: 'Modes', 
        icon: 'settings', // SVG icon name
        iconType: 'svg',
        angle: 220, // 12 o'clock position - top
        color: '#7ed321',
        size: 60,
        hasSubMenu: true
      },
      { 
        id: 'voice-mode', 
        name: this.voiceModeEnabled ? 'Voice ON' : 'Voice OFF', 
        icon: 'voice-lottie', // Will be replaced with Lottie animation
        iconType: 'lottie',
        angle: 140, // 4 o'clock position - 120° spacing
        color: this.voiceModeEnabled ? '#4CAF50' : '#666',
        size: 60, // Container size
        iconSize: 75 // Siri WebM animation size
      },
      { 
        id: 'summary', 
        name: 'Summary', 
        icon: 'summary', // SVG icon name
        iconType: 'svg',
        angle: 180, // 8 o'clock position - 120° spacing
        color: '#bd10e0',
        size: 60
      }
    ];

    this.modeCircles = [];
    
    primaryOptions.forEach((option, index) => {
      const circle = this.createMenuCircle(option, index);
      
      this.circularMenu.appendChild(circle);
      this.modeCircles.push({
        element: circle,
        option: option
      });
    });

    // Add enhanced circular menu styles
    this.domUtils.injectCSS(`
      .ai-circular-menu {
        transform-origin: center center;
        z-index: 9999 !important; /* FIXED: Ensure high z-index */
      }
      
      .ai-menu-circle {
        position: absolute;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: scale(0);
        pointer-events: auto;
        user-select: none;
        z-index: 10000 !important;
      }
      
      /* Non-glass circles get default styling */
      .ai-menu-circle:not(.glass) {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.3);
      }
      
      .ai-menu-circle.visible {
        /* Remove conflicting transform - let JavaScript handle it */
      }
      
      /* Non-glass hover state */
      .ai-menu-circle:not(.glass):hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        z-index: 10001 !important;
      }
      
      .ai-menu-circle.center {
        z-index: 10000 !important; /* FIXED: High z-index for center */
      }
      
      .ai-menu-circle.has-submenu:hover {
        transform: scale(1.1);
      }

      /* GLOSSY BLUISH GLASS - 5mm transparent with 3D rounded border */
      .ai-menu-circle.glass {
        position: relative;
        overflow: visible !important;
        /* Bluish transparent gradient - darker border, lighter center */
        background: radial-gradient(circle at center, 
          rgba(135, 206, 250, 0.15) 0%,     /* Light blue center */
          rgba(100, 149, 237, 0.25) 40%,    /* Medium blue */
          rgba(70, 130, 180, 0.35) 70%,    /* Darker blue */
          rgba(25, 25, 112, 0.45) 100%     /* Dark blue border */
        ) !important;
        /* Thicker 3D rounded border */
        border: 4px solid rgba(70, 130, 180, 0.5) !important;
        border-radius: 50% !important; /* Ensure perfect circle */
        /* Enhanced blur for glass effect */
        backdrop-filter: blur(15px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(15px) saturate(180%) !important;
        /* 5mm bluish thickness + 3D rounded effect */
        box-shadow: 
          /* Inner glow - lighter center */
          inset 0 0 20px rgba(135, 206, 250, 0.2),
          /* 3D border highlight - thicker corners */
          inset 0 0 0 2px rgba(255, 255, 255, 0.4),
          inset 0 0 0 3px rgba(100, 149, 237, 0.3),
          /* 5mm thickness layers - bluish with rounded effect */
          0 2px 0 rgba(100, 149, 237, 0.4),
          0 4px 0 rgba(100, 149, 237, 0.35),
          0 6px 0 rgba(100, 149, 237, 0.3),
          0 8px 0 rgba(100, 149, 237, 0.25),
          0 10px 0 rgba(100, 149, 237, 0.2),
          /* Rounded corner highlights */
          2px 2px 0 rgba(100, 149, 237, 0.3),
          -2px 2px 0 rgba(100, 149, 237, 0.3),
          2px -2px 0 rgba(100, 149, 237, 0.3),
          -2px -2px 0 rgba(100, 149, 237, 0.3),
          /* Outer glow */
          0 0 25px rgba(70, 130, 180, 0.4),
          /* Depth shadow */
          0 12px 35px rgba(25, 25, 112, 0.25) !important;
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
        filter: none !important;
      }

      /* No pseudo-elements */
      .ai-menu-circle.glass::before,
      .ai-menu-circle.glass::after {
        content: none !important;
        display: none !important;
      }

      /* Ensure content is above glass layers */
      .ai-menu-circle.glass .ai-menu-icon,
      .ai-menu-circle.glass .ai-menu-tooltip {
        position: relative;
        z-index: 100; /* Very high z-index to appear above all glass layers */
      }
      
      /* Icon container - PERFECTLY centered */
      .ai-menu-circle.glass .ai-menu-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 100 !important;
        overflow: visible !important;
        border-radius: 50%;
        /* Perfect centering */
        transform: translate(0, 0) !important;
      }
      
      /* SVG Icons - 30px PERFECTLY centered */
      .ai-menu-circle.glass .ai-menu-icon svg {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        max-width: 30px !important;
        max-height: 30px !important;
        fill: #ffffff !important; /* White for contrast against blue */
        color: #ffffff !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        position: relative !important;
        z-index: 101 !important;
        margin: 0 !important;
        padding: 0 !important;
        /* Enhanced shadow for visibility on blue */
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4)) 
                drop-shadow(0 1px 3px rgba(255,255,255,0.6)) !important;
        transition: all 0.3s ease;
        /* Perfect centering */
        transform: translate(0, 0) !important;
      }
      
      /* Force all SVG paths and elements to be visible - WHITE */
      .ai-menu-circle.glass .ai-menu-icon svg path,
      .ai-menu-circle.glass .ai-menu-icon svg circle,
      .ai-menu-circle.glass .ai-menu-icon svg g,
      .ai-menu-circle.glass .ai-menu-icon svg * {
        fill: #ffffff !important; /* Force white for all SVG elements */
        stroke: #ffffff !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      /* Ensure SVG container doesn't hide content */
      .ai-menu-circle.glass .ai-menu-icon > div {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        z-index: 100 !important;
      }
      
      /* Hover - Enhanced 3D bluish glow */
      .ai-menu-circle.glass:hover {
        transform: scale(1.05) !important;
        /* Enhanced bluish gradient on hover */
        background: radial-gradient(circle at center, 
          rgba(135, 206, 250, 0.2) 0%,     /* Brighter center */
          rgba(100, 149, 237, 0.3) 40%,    /* Brighter medium */
          rgba(70, 130, 180, 0.4) 70%,    /* Brighter dark */
          rgba(25, 25, 112, 0.5) 100%     /* Brighter border */
        ) !important;
        /* Enhanced 3D bluish glow */
        box-shadow: 
          /* Brighter inner glow */
          inset 0 0 25px rgba(135, 206, 250, 0.3),
          /* Enhanced 3D border highlight */
          inset 0 0 0 2px rgba(255, 255, 255, 0.5),
          inset 0 0 0 3px rgba(100, 149, 237, 0.4),
          /* Enhanced 5mm thickness with 3D effect */
          0 2px 0 rgba(100, 149, 237, 0.5),
          0 4px 0 rgba(100, 149, 237, 0.45),
          0 6px 0 rgba(100, 149, 237, 0.4),
          0 8px 0 rgba(100, 149, 237, 0.35),
          0 10px 0 rgba(100, 149, 237, 0.3),
          /* Enhanced rounded corner highlights */
          3px 3px 0 rgba(100, 149, 237, 0.4),
          -3px 3px 0 rgba(100, 149, 237, 0.4),
          3px -3px 0 rgba(100, 149, 237, 0.4),
          -3px -3px 0 rgba(100, 149, 237, 0.4),
          /* Brighter outer glow */
          0 0 35px rgba(70, 130, 180, 0.5),
          /* Enhanced depth */
          0 15px 40px rgba(25, 25, 112, 0.3) !important;
        filter: none !important;
      }

      .ai-menu-circle.glass:hover .ai-menu-icon svg {
        transform: scale(1.05);
      }

      /* Active - ONLY size change */
      .ai-menu-circle.glass:active {
        transform: scale(0.98) !important;
        /* backdrop-filter NEVER changes! */
        /* filter NEVER changes! */
        filter: none !important;
      }
      
      /* Selected - Intense 3D bluish glow */
      .ai-menu-circle.glass.active {
        border: 5px solid rgba(100, 149, 237, 0.7) !important; /* Thicker border */
        /* Intense bluish gradient when active */
        background: radial-gradient(circle at center, 
          rgba(135, 206, 250, 0.25) 0%,     /* Bright center */
          rgba(100, 149, 237, 0.35) 40%,    /* Bright medium */
          rgba(70, 130, 180, 0.45) 70%,    /* Bright dark */
          rgba(25, 25, 112, 0.55) 100%     /* Bright border */
        ) !important;
        /* Intense 3D bluish glow */
        box-shadow: 
          /* Intense inner glow */
          inset 0 0 30px rgba(135, 206, 250, 0.4),
          /* Intense 3D border highlight */
          inset 0 0 0 3px rgba(255, 255, 255, 0.6),
          inset 0 0 0 4px rgba(100, 149, 237, 0.5),
          /* Intense 5mm thickness with 3D effect */
          0 3px 0 rgba(100, 149, 237, 0.6),
          0 6px 0 rgba(100, 149, 237, 0.55),
          0 9px 0 rgba(100, 149, 237, 0.5),
          0 12px 0 rgba(100, 149, 237, 0.45),
          0 15px 0 rgba(100, 149, 237, 0.4),
          /* Intense rounded corner highlights */
          4px 4px 0 rgba(100, 149, 237, 0.5),
          -4px 4px 0 rgba(100, 149, 237, 0.5),
          4px -4px 0 rgba(100, 149, 237, 0.5),
          -4px -4px 0 rgba(100, 149, 237, 0.5),
          /* Intense outer glow */
          0 0 50px rgba(70, 130, 180, 0.6),
          0 0 80px rgba(100, 149, 237, 0.4),
          /* Enhanced depth */
          0 18px 50px rgba(25, 25, 112, 0.4) !important;
        transform: scale(1.05) !important;
        filter: none !important;
      }
      
      .ai-menu-circle.glass.active .ai-menu-icon svg {
        opacity: 1;
        fill: #ffffff !important; /* Keep white for contrast */
        color: #ffffff !important;
        transform: scale(1.05);
      }
      
      /* Non-glass active states */
      .ai-menu-circle.active:not(.glass) {
        border: 3px solid #fff !important;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(0, 0, 0, 0.25) !important;
        transform: scale(1.05) !important;
      }
      
      /* SUBMENU CIRCLES - Glassy look with unique colors */
      .ai-submenu-circle {
        position: absolute !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transform: scale(0) !important;
        transition: all 0.3s ease !important;
        z-index: 10002 !important;
        overflow: visible !important;
      }
      
      /* Visible state for submenu circles */
      .ai-submenu-circle.visible {
        transform: scale(1) !important;
      }
      
      /* Glassy effect for all submenu circles */
      .ai-submenu-circle {
        /* Glassy effect - less thick than main circles */
        backdrop-filter: blur(12px) saturate(160%) !important;
        -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
        /* 3mm thickness (less than main 5mm) */
        box-shadow: 
          /* Inner glow */
          inset 0 0 15px rgba(255, 255, 255, 0.15),
          /* Border highlight */
          inset 0 0 0 1px rgba(255, 255, 255, 0.3),
          /* 3mm thickness layers */
          0 1px 0 rgba(255, 255, 255, 0.2),
          0 2px 0 rgba(255, 255, 255, 0.15),
          0 3px 0 rgba(255, 255, 255, 0.1),
          0 4px 0 rgba(255, 255, 255, 0.05),
          /* Outer glow */
          0 0 15px rgba(0, 0, 0, 0.2),
          /* Depth shadow */
          0 6px 20px rgba(0, 0, 0, 0.15) !important;
        filter: none !important;
      }
      
      /* Student - Blue */
      .ai-submenu-circle[data-mode="student"] {
        background: radial-gradient(circle at center, 
          rgba(59, 130, 246, 0.2) 0%,     /* Light blue center */
          rgba(37, 99, 235, 0.3) 40%,    /* Medium blue */
          rgba(29, 78, 216, 0.4) 70%,    /* Darker blue */
          rgba(30, 64, 175, 0.5) 100%    /* Dark blue border */
        ) !important;
        border: 2px solid rgba(59, 130, 246, 0.6) !important;
      }
      
      /* Developer - Green */
      .ai-submenu-circle[data-mode="developer"] {
        background: radial-gradient(circle at center, 
          rgba(16, 185, 129, 0.2) 0%,    /* Light green center */
          rgba(5, 150, 105, 0.3) 40%,   /* Medium green */
          rgba(4, 120, 87, 0.4) 70%,    /* Darker green */
          rgba(6, 95, 70, 0.5) 100%     /* Dark green border */
        ) !important;
        border: 2px solid rgba(16, 185, 129, 0.6) !important;
      }
      
      /* Creator - Orange */
      .ai-submenu-circle[data-mode="creator"] {
        background: radial-gradient(circle at center, 
          rgba(245, 158, 11, 0.2) 0%,   /* Light orange center */
          rgba(217, 119, 6, 0.3) 40%,   /* Medium orange */
          rgba(180, 83, 9, 0.4) 70%,    /* Darker orange */
          rgba(146, 64, 14, 0.5) 100%   /* Dark orange border */
        ) !important;
        border: 2px solid rgba(245, 158, 11, 0.6) !important;
      }
      
      /* Researcher - Purple */
      .ai-submenu-circle[data-mode="researcher"] {
        background: radial-gradient(circle at center, 
          rgba(139, 92, 246, 0.2) 0%,   /* Light purple center */
          rgba(124, 58, 237, 0.3) 40%,  /* Medium purple */
          rgba(109, 40, 217, 0.4) 70%,  /* Darker purple */
          rgba(91, 33, 182, 0.5) 100%   /* Dark purple border */
        ) !important;
        border: 2px solid rgba(139, 92, 246, 0.6) !important;
      }
      
      /* Hover states for submenu circles */
      .ai-submenu-circle:hover {
        transform: scale(1.1) !important;
        /* Enhanced glow on hover */
        box-shadow: 
          inset 0 0 20px rgba(255, 255, 255, 0.2),
          inset 0 0 0 1px rgba(255, 255, 255, 0.4),
          0 1px 0 rgba(255, 255, 255, 0.25),
          0 2px 0 rgba(255, 255, 255, 0.2),
          0 3px 0 rgba(255, 255, 255, 0.15),
          0 4px 0 rgba(255, 255, 255, 0.1),
          0 0 20px rgba(0, 0, 0, 0.25),
          0 8px 25px rgba(0, 0, 0, 0.2) !important;
      }
      
      .ai-submenu-circle.active {
        transform: scale(1.1) !important;
        /* Intense glow when active */
        box-shadow: 
          inset 0 0 25px rgba(255, 255, 255, 0.3),
          inset 0 0 0 2px rgba(255, 255, 255, 0.5),
          0 2px 0 rgba(255, 255, 255, 0.3),
          0 4px 0 rgba(255, 255, 255, 0.25),
          0 6px 0 rgba(255, 255, 255, 0.2),
          0 8px 0 rgba(255, 255, 255, 0.15),
          0 0 25px rgba(0, 0, 0, 0.3),
          0 10px 30px rgba(0, 0, 0, 0.25) !important;
      }
      
      /* VOICE MODE CIRCLE - Color states */
      .ai-menu-circle.voice-mode-only {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      
      /* Voice mode OFF - Dull/muted appearance */
      .ai-menu-circle.voice-mode-only.voice-off {
        filter:  brightness(1.1) !important;
        opacity: 1.2 !important;
      }
      
      /* Voice mode ON - Original bright appearance */
      .ai-menu-circle.voice-mode-only.voice-on {
        filter: none !important;
        opacity: 1 !important;
      }
      
      /* Voice mode icon styling */
      .ai-menu-circle.voice-mode-only .ai-menu-icon {
        filter: inherit !important;
        opacity: inherit !important;
      }
      
      .ai-menu-tooltip {
        position: absolute;
        top: -50px; /* Increased gap from icons */
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 4px 8px; /* Smaller padding */
        border-radius: 6px; /* Smaller border radius */
        font-size: 11px; /* Smaller font */
        font-weight: 400; /* Lighter weight */
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 100;
        /* Smaller tooltip */
        min-width: auto;
        max-width: 80px;
        text-align: center;
      }
      
      .ai-menu-circle:hover .ai-menu-tooltip {
        opacity: 1;
      }

      /* Ensure icon containers clip children and are circular */
      .ai-menu-icon {
        border-radius: 50%;
        overflow: visible !important; /* CHANGED: Don't clip for glass circles */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      /* Force videos/icons to fill container - NON-GLASS ONLY */
      .ai-menu-circle:not(.glass) .ai-menu-icon video,
      .ai-menu-circle:not(.glass) .ai-menu-icon img {
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        object-fit: cover !important;
        filter: contrast(1.2) saturate(1.15) brightness(1.1);
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      /* Custom SVG icons - NON-GLASS ONLY */
      .ai-menu-circle:not(.glass) .ai-menu-icon svg {
        display: block !important;
        object-fit: contain !important;
        filter: contrast(1.2) saturate(1.15) brightness(1.1);
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      /* Glass circles - NO FILTERS on container! */
      .ai-menu-circle.glass .ai-menu-icon {
        filter: none !important; /* REMOVED ALL FILTERS */
        text-shadow: none !important;
      }
      
      /* Removed unnecessary submenu CSS - handled in JavaScript */
    `, 'ai-enhanced-circular-menu-styles');
    
    // Position menu
    this.positionCircularMenu();
    
    // Immediate menu hover events
    this.circularMenu.addEventListener('mouseenter', () => {
      this.clearAllTimeouts();
    });
    
    this.circularMenu.addEventListener('mouseleave', () => {
      // Immediate check with shorter delay
      setTimeout(() => {
        this.startHideTimer();
      }, 50); // Very short delay to allow smooth transitions
    });
    
    // Add to DOM
    document.body.appendChild(this.circularMenu);
    
    // Add SVG lens filter for liquid glass effect (if not already added)
    if (!document.querySelector('#lensFilter')) {
      this.injectLensFilter();
    }
  }

  injectLensFilter() {
    // Create SVG filter for liquid glass lens effect
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.style.display = "none";
    svg.style.position = "absolute";
    
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "lensFilter");
    filter.setAttribute("x", "0%");
    filter.setAttribute("y", "0%");
    filter.setAttribute("width", "100%");
    filter.setAttribute("height", "100%");
    filter.setAttribute("filterUnits", "objectBoundingBox");
    
    // Alpha component transfer
    const feComponentTransfer = document.createElementNS(svgNS, "feComponentTransfer");
    feComponentTransfer.setAttribute("in", "SourceAlpha");
    feComponentTransfer.setAttribute("result", "alpha");
    
    const feFuncA = document.createElementNS(svgNS, "feFuncA");
    feFuncA.setAttribute("type", "identity");
    
    feComponentTransfer.appendChild(feFuncA);
    
    // Gaussian blur - reduced for subtlety
    const feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "alpha");
    feGaussianBlur.setAttribute("stdDeviation", "20");
    feGaussianBlur.setAttribute("result", "blur");
    
    // Displacement map for subtle lens effect
    const feDisplacementMap = document.createElementNS(svgNS, "feDisplacementMap");
    feDisplacementMap.setAttribute("in", "SourceGraphic");
    feDisplacementMap.setAttribute("in2", "blur");
    feDisplacementMap.setAttribute("scale", "15");
    feDisplacementMap.setAttribute("xChannelSelector", "A");
    feDisplacementMap.setAttribute("yChannelSelector", "A");
    
    filter.appendChild(feComponentTransfer);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feDisplacementMap);
    
    svg.appendChild(filter);
    document.body.appendChild(svg);
  }

  createMenuCircle(option, index) {
    // For voice-mode, use only the WebM animation, no parent circle background or border
    let circle;
  // Apply glass style for modes and summary
  const useGlass = option.id === 'modes' || option.id === 'summary';

  if (option.id === 'voice-mode') {
      // Use the same size as other menu circles
      circle = this.domUtils.createElement('div', {
        className: 'ai-menu-circle voice-mode-only',
        attributes: {
          'data-option': option.id
        },
        styles: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          width: `${option.size}px`,
          height: `${option.size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: '165px',
          top: '160px',
          zIndex: '10000',
          transition: 'none'
        },
        innerHTML: `
          <span class="ai-menu-icon" id="menu-icon-${option.id}" style="width: ${option.iconSize || option.size}px; height: ${option.iconSize || option.size}px; display:flex; align-items:center; justify-content:center; font-size: ${(option.iconSize || option.size) * 0.35}px;"> </span>
          <div class="ai-menu-tooltip">${option.name}</div>
        `
      });
      // Remove ALL hover/active listeners for voice-mode (no color/size change)
      // No hover listeners attached
    } else {
      circle = this.domUtils.createElement('div', {
        className: `ai-menu-circle ${useGlass ? 'glass' : ''} ${option.isCenter ? 'center' : ''} ${option.hasSubMenu ? 'has-submenu' : ''}`,
        attributes: {
          'data-option': option.id
        },
        styles: {
          background: `${option.color}, ${this.adjustColor(option.color, -20)})`,
          width: `${option.size}px`,
          height: `${option.size}px`
        },
        innerHTML: `
          <span class="ai-menu-icon" id="menu-icon-${option.id}" style="width: ${option.size}px; height: ${option.size}px; display:flex; align-items:center; justify-content:center; font-size: ${option.size * 0.35}px">${option.iconType === 'lottie' ? '' : (option.iconType === 'svg' ? '' : option.icon)}</span>
          <div class="ai-menu-tooltip">${option.name}</div>
        `
      });
      // If not glass, keep color-changing hover behavior. For glass circles, only scale on hover (CSS handles it).
      if (!useGlass) {
        circle.addEventListener('mouseenter', () => {
          circle.style.background = `linear-gradient(135deg, ${this.adjustColor(option.color, 20)}, ${option.color})`;
          circle.style.transform = 'scale(1.15)';
        });
        circle.addEventListener('mouseleave', () => {
          circle.style.background = `linear-gradient(135deg, ${option.color}, ${this.adjustColor(option.color, -20)})`;
          circle.style.transform = 'scale(1)';
        });
      }
    }

    // Add click event listener for all circles
    circle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleMenuOptionClick(option);
    });
    // For non-voice-mode, handle submenu hover
    if (option.hasSubMenu && option.id === 'modes') {
      circle.addEventListener('mouseenter', () => {
        this.showModesSubMenu();
      });
      circle.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!this.isInSubmenuZone()) {
            this.hideModesSubMenu();
          }
        }, 50);
      });
    }

    // Hardcoded absolute positioning - simple and reliable
    const halfSize = option.size / 2;
    
    // Hardcode positions for each circle relative to menu container
    let left, top;
    
    switch(option.id) {
      case 'modes':
        left = '120px';   // Top-left area
        top = '210px';    // Top area
        break;
      case 'voice-mode':
        left = '165px';  // Right side  
        top = '160px';    // Top-right area
        break;
      case 'summary':
        left = '230px';  // Center-bottom  
        top = '150px';    // Bottom area
        break;
      default:
        left = '150px';  // Default center
        top = '150px';
        break;
    }
    
    circle.style.position = 'absolute';
    circle.style.left = left;
    circle.style.top = top;
    circle.style.transform = `scale(0)`;
    
    // Delay animation for each circle
    setTimeout(() => {
      circle.classList.add('visible');
      // FIXED: Force the transform directly via JavaScript
      circle.style.transform = 'scale(1)';
    }, index * 80);

    // Initialize voice WebM animation if this is the voice-mode circle
    if (option.id === 'voice-mode' && option.icon === 'voice-lottie') {
      this.initializeVoiceWebMAnimation(circle, option);
    }

    // Load and display SVG icon if this is an SVG icon type
    if (option.iconType === 'svg') {
      this.loadAndDisplaySVGIcon(circle, option);
    }

    // If this is a glass circle, we rely on CSS-only glass/3D styling (no Three.js).

    return circle;
  }

  async handleMenuOptionClick(option) {
    
    switch(option.id) {
      case 'main-menu':
        await this.openSidebar();
        break;
      case 'modes':
        // Do nothing - submenu is handled by hover
        break;
      case 'voice-mode':
        await this.toggleVoiceMode();
        break;
      case 'summary':
        await this.handlePageSummary();
        break;
      default:
        // Handle numbered options or custom actions
        break;
    }
    
    // Hide menu after action (except for modes)
    if (option.id !== 'modes') {
      setTimeout(() => {
        this.hideCircularMenu();
      }, 300);
    }
  }

  async handleVoiceAssistant() {
    
    // Try MCP Voice Agent first (handles its own conversation flow)
    const mcpVoiceAgent = window.ChromeAIStudio?.mcpVoiceAgent;
    if (mcpVoiceAgent && !mcpVoiceAgent.conversationActive) {
      try {
        await mcpVoiceAgent.startConversation();
        return; // MCP handles the full conversation flow
      } catch (error) {
        console.warn('⚠️ MCP voice conversation failed to start:', error);
        // Continue with regular voice assistant
      }
    }
    
    // Check if we've been denied permission recently
    if (this.microphonePermissionDenied) {
      await this.showMicrophonePermissionGuide();
      return;
    }
    
    // Check microphone permission first
    try {
      const permissionStatus = await this.checkMicrophonePermission();
      if (!permissionStatus.granted) {
        this.handleMicrophonePermissionDenied();
        return;
      }
    } catch (error) {
      console.warn('🎤 Could not check microphone permission:', error);
    }
    
    // Check if speech recognition is available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.currentRecognition = new SpeechRecognition();
      
      this.currentRecognition.continuous = false;
      this.currentRecognition.interimResults = false;
      this.currentRecognition.lang = 'en-US';
      this.currentRecognition.maxAlternatives = 1;
      
      this.currentRecognition.onstart = () => {
        this.showVoiceListening();
      };
      
      this.currentRecognition.onresult = async (event) => {
        // Clear timeout since we got a result
        if (this.voiceTimeout) {
          clearTimeout(this.voiceTimeout);
          this.voiceTimeout = null;
        }
        
        const transcript = event.results[0][0].transcript;
        this.updateVoiceStatus('Processing...', '🤖');
        
        // Process with Chrome AI directly
        await this.processVoiceWithChromeAI(transcript);
      };
      
      this.currentRecognition.onerror = (event) => {
        console.error('🎤 Voice recognition error:', event.error);
        this.hideVoiceListening();
        
        // Handle specific error types
        switch(event.error) {
          case 'no-speech':
            this.showVoiceError('No speech detected. Please try speaking again.', '🔇');
            break;
          case 'audio-capture':
            this.showVoiceError('No microphone found. Please check your microphone.', '🎤');
            break;
          case 'not-allowed':
            // Mark permission as denied to prevent retry loops
            this.microphonePermissionDenied = true;
            this.handleMicrophonePermissionDenied();
            break;
          case 'network':
            this.showVoiceError('Network error. Please check your connection.', '🌐');
            break;
          case 'aborted':
            // User cancelled - don't show error
            break;
          default:
            this.showVoiceError('Voice recognition error. Please try again.', '⚠️');
            break;
        }
      };
      
      this.currentRecognition.onend = () => {
        if (this.voiceTimeout) {
          clearTimeout(this.voiceTimeout);
          this.voiceTimeout = null;
        }
        this.currentRecognition = null;
      };
      
      this.currentRecognition.start();
    } else {
      console.warn('🎤 Speech recognition not supported');
      this.showVoiceError('Voice recognition is not supported in your browser', '🚫');
    }
  }
  
  async checkMicrophonePermission() {
    try {
      
      // Try the modern Permissions API first
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        return {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          prompt: permission.state === 'prompt'
        };
      }
      
      // Fallback: try to access microphone directly (this will trigger permission prompt)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stream) {
          // Stop the stream immediately
          stream.getTracks().forEach(track => track.stop());
          return { granted: true, denied: false, prompt: false };
        }
      } catch (directError) {
        if (directError.name === 'NotAllowedError') {
          return { granted: false, denied: true, prompt: false };
        }
        return { granted: false, denied: false, prompt: true };
      }
      
    } catch (error) {
      console.error('🎤 Microphone permission check failed:', error);
      return { granted: false, denied: true, prompt: false };
    }
    
    return { granted: false, denied: false, prompt: true };
  }
  
  async handleMicrophonePermissionDenied() {
    console.warn('🎤 Microphone permission denied');
    await this.showMicrophonePermissionGuide();
  }
  
  async showMicrophonePermissionGuide() {
    
    // Ensure permission manager exists
    let permissionManager = window.ChromeAIStudio?.permissionManager;
    if (!permissionManager && window.PermissionManager) {
      permissionManager = new window.PermissionManager();
      window.ChromeAIStudio.permissionManager = permissionManager;
    }
    
    if (permissionManager) {
      const granted = await permissionManager.requestPermissionsManually();
      
      if (granted) {
        this.showTemporaryMessage('Voice permissions enabled! Try the voice assistant now.', '✅');
        // Reset permission denied state
        this.microphonePermissionDenied = false;
        this.voiceRetryCount = 0;
      } else {
        this.showTemporaryMessage('Permissions not granted. Voice features will be limited.', '⚠️');
      }
      return;
    }
    
    // Fallback to old permission modal system
    
    // Remove any existing permission modal
    const existingModal = document.querySelector('.ai-permission-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const permissionModal = this.domUtils.createElement('div', {
      className: 'ai-permission-modal',
      styles: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      },
      innerHTML: `
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
          transform: scale(0.9);
          transition: transform 0.3s ease;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">🎤</div>
          <h3 style="margin: 0 0 16px 0; color: #333;">Microphone Access Required</h3>
          <p style="color: #666; line-height: 1.5; margin-bottom: 24px;">
            Voice Assistant needs microphone access to hear your questions.<br><br>
            <strong>To enable microphone access:</strong><br>
            1. Click the 🔒 lock icon in your address bar<br>
            2. Set "Microphone" to "Allow"<br>
            3. Refresh the page<br>
            4. Try voice assistant again
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="request-permission" style="
              background: #4285f4;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Request Permission</button>
            <button class="refresh-page" style="
              background: #34a853;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            ">Refresh Page</button>
            <button class="close-permission" style="
              background: #f5f5f5;
              color: #333;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            ">Close</button>
          </div>
        </div>
      `
    });
    
    const requestBtn = permissionModal.querySelector('.request-permission');
    const refreshBtn = permissionModal.querySelector('.refresh-page');
    const closeBtn = permissionModal.querySelector('.close-permission');
    
    requestBtn.addEventListener('click', async () => {
      try {
        // Request microphone permission directly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stream) {
          // Stop the stream immediately
          stream.getTracks().forEach(track => track.stop());
          
          // Reset permission state and close modal
          this.resetVoicePermissions();
          permissionModal.remove();
          
          // Try voice assistant again
          this.handleVoiceAssistant();
        }
      } catch (error) {
        console.error('🎤 Permission request failed:', error);
        // Update the modal to show the error and manual instructions
        const content = permissionModal.querySelector('p');
        content.innerHTML = `
          <strong style="color: #f44336;">Permission request failed!</strong><br><br>
          Please manually enable microphone access:<br>
          1. Click the 🔒 lock icon in your address bar<br>
          2. Set "Microphone" to "Allow"<br>
          3. Click "Refresh Page" below
        `;
        requestBtn.textContent = 'Request Failed';
        requestBtn.disabled = true;
        requestBtn.style.background = '#ccc';
      }
    });
    
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
    
    closeBtn.addEventListener('click', () => {
      permissionModal.style.opacity = '0';
      setTimeout(() => {
        if (permissionModal.parentNode) {
          permissionModal.remove();
        }
      }, 300);
    });
    
    document.body.appendChild(permissionModal);
    
    // Force immediate visibility for debugging
    setTimeout(() => {
      permissionModal.style.opacity = '1';
      const content = permissionModal.querySelector('div > div');
      if (content) {
        content.style.transform = 'scale(1)';
      }
    }, 10);
  }

  async showChromeAISetupInstructions() {
    const setupModal = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: this.domUtils.getHighZIndex() + 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      },
      innerHTML: `
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
          transform: scale(0.9);
          transition: transform 0.3s ease;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
          <h3 style="margin: 0 0 16px 0; color: #333;">Enable Chrome AI</h3>
          <p style="color: #666; line-height: 1.5; margin-bottom: 24px;">
            To use voice AI features, please enable Chrome's built-in AI:<br><br>
            1. Go to <strong>chrome://flags</strong><br>
            2. Enable <strong>Prompt API for Gemini Nano</strong><br>
            3. Enable <strong>Gemini Nano</strong><br>
            4. Restart Chrome
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="open-flags" style="
              background: #4285f4;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            ">Open Chrome Flags</button>
            <button class="close-setup" style="
              background: #f5f5f5;
              color: #333;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            ">Close</button>
          </div>
        </div>
      `
    });
    
    const openFlagsBtn = setupModal.querySelector('.open-flags');
    const closeBtn = setupModal.querySelector('.close-setup');
    
    openFlagsBtn.addEventListener('click', () => {
      window.open('chrome://flags/#optimization-guide-on-device-model', '_blank');
    });
    
    closeBtn.addEventListener('click', () => {
      setupModal.style.opacity = '0';
      setTimeout(() => setupModal.remove(), 300);
    });
    
    document.body.appendChild(setupModal);
    
    requestAnimationFrame(() => {
      setupModal.style.opacity = '1';
      const content = setupModal.querySelector('div > div');
      content.style.transform = 'scale(1)';
    });
  }

  async handlePageSummary() {
    try {
      console.info('🧾 [FAB] Summary: start');
      // 1) Show loading popup (do NOT open sidebar yet)
      const loading = this.showSummarizingPopup();
      this.hideCircularMenu();

      // 2) Get full page markdown via in-app URL→Markdown
      const urlToMd = window.ChromeAIStudio?.urlToMarkdown;
      let markdown = '';
      try {
        if (urlToMd && typeof urlToMd.convertUrl === 'function') {
          const res = await urlToMd.convertUrl(window.location.href);
          if (res && res.success && res.markdown) {
            markdown = res.markdown;
            console.info('🧾 [FAB] Summary: URL→Markdown success, length =', markdown.length);
          }
        }
      } catch (e) {
        console.warn('⚠️ URL→Markdown failed, falling back to text extraction', e);
      }
      if (!markdown || markdown.length < 200) {
        // Fallback: basic text extraction
        const text = this.extractPageContent?.() || document.body?.innerText || '';
        markdown = `# ${document.title || 'Untitled'}\n\n${text}`;
        console.info('🧾 [FAB] Summary: Fallback text used, length =', markdown.length);
      }

      // 3) Prepare sidebar early for real-time streaming updates
      let sidebar = window.ChromeAIStudio?.smartSidebar;
      let ui = null;
      let streamingMsg = null;
      if (sidebar && sidebar.show) {
        sidebar.show();
        await new Promise(r => setTimeout(r, 150));
        ui = sidebar.ui;
        // Ensure sidebar message content doesn't overflow and has slightly smaller font
        try {
          this.domUtils?.injectCSS(`
            .chromeai-studio .message-content, .message-content {
              font-size: 0.95em !important;
              line-height: 1.5 !important;
              white-space: pre-wrap !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
              max-width: 100% !important;
            }
            .chromeai-studio .message, .message {
              max-width: 100% !important;
            }
            /* Zero-indentation bullets */
            .chromeai-studio .message-content ul,
            .chromeai-studio .message-content ol,
            .message-content ul,
            .message-content ol {
              margin: 8px 0 !important;
              padding-left: 0 !important;
              margin-left: 0 !important;
            }
            .chromeai-studio .message-content li,
            .message-content li {
              list-style: none !important;
              margin: 2px 0 !important;
              text-indent: 0 !important;
              padding-left: 0 !important;
              margin-left: 0 !important;
              white-space: normal !important;
            }
            .chromeai-studio .message-content li::before,
            .message-content li::before {
              content: "• ";
            }
          `, 'ai-sidebar-message-fixes');
        } catch (e) {}
        if (ui && ui.addStreamingMessage && ui.updateStreamingMessage && ui.completeStreamingMessage) {
          streamingMsg = ui.addStreamingMessage();
        }
      }

      // 4) Hierarchical summarization; stream when possible
      const finalSummary = await this.summarizeMarkdownHierarchy(
        markdown,
        (partial) => {
          if (!partial) return;
          const safe = this.sanitizeSummary(partial);
          if (ui && streamingMsg) {
            ui.updateStreamingMessage(streamingMsg, safe);
          }
        }
      );
      console.info('🧾 [FAB] Summary: final length =', (finalSummary || '').length);

      // 5) If we didn't have a streaming UI, show the result now
      if (!ui || !streamingMsg) {
        sidebar = window.ChromeAIStudio?.smartSidebar;
        if (sidebar) {
          sidebar.show?.();
          await new Promise(r => setTimeout(r, 150));
          ui = sidebar.ui;
          if (ui && ui.addStreamingMessage && ui.updateStreamingMessage && ui.completeStreamingMessage) {
            const msg = ui.addStreamingMessage();
            const safeOut = this.sanitizeSummary(finalSummary);
            const parts = this.chunkText(safeOut, 600);
            for (const part of parts) {
              await new Promise(r => setTimeout(r, 10));
              ui.updateStreamingMessage(msg, (msg.querySelector('.message-content')?.textContent || '') + part);
            }
            ui.completeStreamingMessage(msg);
          } else {
            window.dispatchEvent(new CustomEvent('chromeai-action', {
              detail: { action: 'show-ai-result', text: this.sanitizeSummary(finalSummary), source: 'circular-menu', type: 'summary' }
            }));
          }
        }
      } else {
        // Complete the streaming message
        ui.completeStreamingMessage(streamingMsg);
      }

      // 6) Close loading popup
      this.hideSummarizingPopup(loading);

    } catch (error) {
      console.error('📄 Summary error:', error);
      this.showSummaryError(error.message || String(error));
    }
  }

  chunkText(text, size = 6000) {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }

  async summarizeMarkdownHierarchy(markdown, onUpdate) {
    const aiManager = window.ChromeAIStudio?.aiManager;
    if (!aiManager) return markdown.slice(0, 6000);

    const isShort = (markdown || '').length <= 2500;

    const summarize = async (content, level = 'chunk') => {
      const structuredPrompt = isShort && level === 'chunk'
        ? this.getConciseParagraphPrompt(document.title || 'Page', content)
        : this.getStructuredSummaryPrompt(document.title || 'Page', level, content);
      console.info(`🧾 [FAB] Summary: summarizing level=${level}, contentLen=${content.length}`);
      let res;
      try {
        res = await aiManager.prompt(structuredPrompt, { temperature: 0.2, maxTokens: 1400 });
      } catch (e) {
        const msg = (e && (e.message || String(e))) || '';
        // Handle Chrome on-device Translator requiring a user gesture during download/setup
        const needsGesture = /Requires a user gesture/i.test(msg) || /NotAllowedError/i.test(msg);
        if (needsGesture) {
          // Ask user for a quick click and retry inside that gesture
          res = await this.withUserGestureForAI(() => aiManager.prompt(structuredPrompt, { temperature: 0.2, maxTokens: 1400 }));
        } else {
          throw e;
        }
      }
      if (res && res.result) return res.result;
      if (typeof res === 'string') return res;
      throw new Error(res?.error || 'Summarization failed');
    };

    // First-level chunk summaries
    const chunks = this.chunkText(markdown, 6000);
    console.info('🧾 [FAB] Summary: chunk count =', chunks.length);
    const firstPass = [];

    // If only one chunk, try streaming it in real-time
    if (chunks.length === 1 && typeof aiManager.promptStreaming === 'function' && typeof onUpdate === 'function') {
      const structuredPrompt = isShort
        ? this.getConciseParagraphPrompt(document.title || 'Page', chunks[0])
        : this.getStructuredSummaryPrompt(document.title || 'Page', 'chunk', chunks[0]);
      let response;
      try {
        response = await aiManager.promptStreaming(structuredPrompt, { temperature: 0.2, maxTokens: 1400 });
      } catch (e) {
        const msg = (e && (e.message || String(e))) || '';
        const needsGesture = /Requires a user gesture/i.test(msg) || /NotAllowedError/i.test(msg);
        if (needsGesture) {
          response = await this.withUserGestureForAI(() => aiManager.promptStreaming(structuredPrompt, { temperature: 0.2, maxTokens: 1400 }));
        } else {
          throw e;
        }
      }
      if (!response || response.success === false) {
        // Fallback to non-streaming
        firstPass.push(await summarize(chunks[0], 'chunk'));
      } else {
        const streamed = await this.consumeStreamToBuffer(response.result, (fullText) => {
          onUpdate(fullText);
        });
        firstPass.push(streamed);
      }
    } else {
      for (const c of chunks) {
        firstPass.push(await summarize(c, 'chunk'));
      }
      // Provide a coarse update after first pass if we have an updater
      if (typeof onUpdate === 'function') {
        onUpdate(firstPass.join('\n\n'));
      }
    }

    // Iteratively summarize until single chunk
    let current = firstPass.join('\n\n');
    while (current.length > 6000) {
      const parts = this.chunkText(current, 6000);
      const next = [];
      for (const p of parts) next.push(await summarize(p, 'merge'));
      current = next.join('\n\n');
    }
    // Sanitize and, if link-heavy, force a final concise pass
    let finalOut = this.sanitizeSummary(current);
    const linkMatches = (finalOut.match(/https?:\/\//g) || []).length;
    const mdLinkMatches = (finalOut.match(/\]\(https?:\/\//g) || []).length;
    const totalLen = finalOut.length || 1;
    const ratio = (linkMatches + mdLinkMatches) / Math.max(1, totalLen / 500);
    console.info('🧾 [FAB] Summary: link ratio =', ratio.toFixed(2));
    if (ratio > 4) {
      console.warn('🧾 [FAB] Summary: link-heavy output, applying final concise pass');
      const finalPrompt = this.getStructuredSummaryPrompt(document.title || 'Page', 'final', finalOut);
      const res = await aiManager.prompt(finalPrompt, { temperature: 0.2, maxTokens: 1400 });
      if (res?.result || typeof res === 'string') {
        finalOut = this.sanitizeSummary(res.result || res);
      }
    }
    return finalOut;
  }

  /**
   * Prompt: concise paragraph-first summary with minimal bullets.
   */
  getConciseParagraphPrompt(topic, content) {
    const header = `You write compact, readable summaries for sidebars. Prefer paragraphs over lists.`;
    const rules = `Rules:\n- Start with a single concise paragraph (3–5 sentences).\n- Optionally include up to 3 short bullets for key takeaways.\n- Bullets must be flat (no nesting), one line each, and not indented.\n- Use minimal headings: just a title and optional 'Links'.\n- Limit to 1–2 important links max, with titles.\n- No raw link dumps. No code blocks unless essential.`;
    const structure = `# ${topic}\n\n<One short paragraph>\n\n- <Up to 3 bullets max, optional>\n\nLinks (optional): <Title 1> — <brief note>; <Title 2> — <brief note>`;
    return `${header}\n\nCONTENT:\n${content}\n\nOUTPUT (follow structure, keep it short):\n${structure}\n\n${rules}`;
  }

  /**
   * Consume a ReadableStream and build a full text buffer, invoking onUpdate(fullText)
   * with throttling similar to consumeStreamToSidebar.
   */
  async consumeStreamToBuffer(stream, onUpdate) {
    const decoder = new TextDecoder();
    let fullText = '';
    let lastUpdateTime = 0;
    const updateInterval = 16;

    const pushUpdate = (text) => {
      fullText += text;
      const now = Date.now();
      if (typeof onUpdate === 'function' && now - lastUpdateTime >= updateInterval) {
        onUpdate(fullText);
        lastUpdateTime = now;
      }
    };

    // If it's already a string, just return it
    if (typeof stream === 'string') {
      pushUpdate(stream);
      if (typeof onUpdate === 'function') onUpdate(fullText);
      return fullText;
    }

    // Web ReadableStream path
    if (stream && typeof stream.getReader === 'function') {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (typeof onUpdate === 'function') onUpdate(fullText);
          return fullText;
        }
        if (typeof value === 'string') {
          pushUpdate(value);
        } else if (value && (value instanceof Uint8Array || (value.buffer && value.byteLength !== undefined))) {
          pushUpdate(decoder.decode(value, { stream: true }));
        } else {
          // Best-effort conversion
          try {
            pushUpdate(decoder.decode(value, { stream: true }));
          } catch (_) {
            // Ignore unknown chunk types
          }
        }
      }
    }

    // Async-iterable path (e.g., for await (const chunk of stream))
    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          pushUpdate(chunk);
        } else if (chunk && (chunk instanceof Uint8Array || (chunk.buffer && chunk.byteLength !== undefined))) {
          pushUpdate(decoder.decode(chunk, { stream: true }));
        } else {
          try {
            pushUpdate(decoder.decode(chunk, { stream: true }));
          } catch (_) {}
        }
      }
      if (typeof onUpdate === 'function') onUpdate(fullText);
      return fullText;
    }

    // Unknown type; return empty
    return fullText;
  }

  /**
   * Run an AI action that needs a user gesture by showing a lightweight modal.
   * The provided action will be executed within the click handler to satisfy
   * Chrome's gesture requirement when availability is "downloading"/"downloadable".
   */
  withUserGestureForAI(action) {
    return new Promise((resolve, reject) => {
      try {
        const overlay = document.createElement('div');
        overlay.className = 'chromeai-studio ai-gesture-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);z-index:2147483647;opacity:0;transition:opacity .2s ease';
        overlay.innerHTML = `
          <div style="background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(10px);padding:20px 24px;border-radius:12px;min-width:260px;max-width:360px;box-shadow:0 10px 30px rgba(0,0,0,.4);text-align:center;">
            <div style="font-size:18px;font-weight:600;margin-bottom:8px;">Enable On‑Device AI</div>
            <div style="font-size:13px;opacity:.85;margin-bottom:16px;">A quick click is required to finish setup. Then your summary will continue.</div>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button id="ai-gesture-confirm" style="background:#4285f4;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Continue</button>
              <button id="ai-gesture-cancel" style="background:transparent;color:#e5e7eb;border:1px solid rgba(255,255,255,0.2);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;">Cancel</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });

        const cleanup = () => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.parentNode && overlay.remove(), 200);
        };

        overlay.querySelector('#ai-gesture-cancel').addEventListener('click', () => {
          cleanup();
          reject(new Error('User cancelled AI enablement'));
        });
        overlay.querySelector('#ai-gesture-confirm').addEventListener('click', async () => {
          try {
            const result = await action();
            cleanup();
            resolve(result);
          } catch (err) {
            cleanup();
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  sanitizeSummary(text) {
    try {
      if (!text) return '';
      let cleaned = String(text);
      cleaned = cleaned.replace(/▊/g, '');
      cleaned = cleaned.replace(/^\s*Copy\s+Copied!\s*/i, '');
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      // Collapse wrapped bullet lines into a single line per bullet, remove indentation
      cleaned = this.collapseWrappedBullets(cleaned);
      // Cap bullets to at most 5 to avoid long lists
      cleaned = this.limitBullets(cleaned, 5);
      return cleaned.trim();
    } catch (e) {
      return text;
    }
  }

  /**
   * Combine multi-line bullets into single lines and remove indentation.
   * Supports markers: '-', '*', '•'.
   */
  collapseWrappedBullets(input) {
    const lines = String(input).split(/\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const bulletMatch = /^\s*[\-\*•]\s+(.+?)\s*$/.exec(line);
      if (!bulletMatch) {
        out.push(line.replace(/^(\s*)\t+/g, '$1').replace(/^\s+$/,'').trimEnd());
        i++;
        continue;
      }
      // Start a bullet; attach following indented/non-bullet lines as continuation
      let item = bulletMatch[1].trim();
      i++;
      while (i < lines.length) {
        const next = lines[i];
        const isNextBullet = /^\s*[\-\*•]\s+/.test(next);
        const isHeading = /^\s*#{1,6}\s+/.test(next);
        if (isNextBullet || isHeading) break;
        if (next.trim().length === 0) break;
        item += ' ' + next.trim();
        i++;
      }
      out.push('- ' + item);
    }
    return out.join('\n');
  }

  // Limit number of bullet lines to a maximum; drop excess to avoid overflow noise
  limitBullets(input, maxBullets = 5) {
    const lines = String(input).split(/\n/);
    let count = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      if (/^\s*[\-\*•]\s+/.test(lines[idx])) {
        count++;
        if (count > maxBullets) {
          // Remove bullet marker but keep as plain text appended to previous non-empty line
          const text = lines[idx].replace(/^\s*[\-\*•]\s+/, '').trim();
          // Try to append to the last non-empty line
          for (let j = idx - 1; j >= 0; j--) {
            if (lines[j].trim().length > 0) {
              lines[j] = lines[j].replace(/\s*$/, '') + (text ? ` — ${text}` : '');
              break;
            }
          }
          lines[idx] = '';
        }
      }
    }
    return lines.filter(l => l !== '').join('\n');
  }

  getStructuredSummaryPrompt(topic, level, content) {
    const header = `You are creating a clean, well-structured summary for a web page. Enforce the exact structure below. Avoid long raw link dumps; use link titles and keep links minimal.`;
    const structure = `
# ${topic} — Summary

## Overview
- 2–3 sentences capturing purpose and value

## Key Features
- Bulleted, each 1 line with a concrete detail or number

## Technology Stack (if applicable)
- Web: …
- Mobile: …

## Getting Started / Docs (if applicable)
- Main docs: <Title> — <short note>

## Official Links
- Website / Play Store / GitHub — keep to the most important 3–5

## Notes
- Any constraints, contribution status, or availability`;
    const constraints = `
Rules:
- Prefer names and concrete facts; avoid generic prose
- Keep sections compact; no paragraphs longer than 3 lines
- Use at most 5 links total; if many links present, pick the most important
- Do not include UI labels like "Copy" or "Copied!"
- Bullets must be flat (no nesting), single-line, and not indented`;
    const levelHint = level === 'chunk' ? 'FIRST PASS on a sub-part' : (level === 'merge' ? 'MERGE PASS combining previous summaries' : 'FINAL PASS ensuring compactness and clarity');
    return `${header}

Context: ${levelHint}

CONTENT:
${content}

OUTPUT (use this exact structure):
${structure}

${constraints}`;
  }

  showSummarizingPopup() {
    const el = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(17,17,17,0.85)',
        color: '#f3f4f6',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(8px)',
        padding: '10px 12px',
        borderRadius: '10px',
        zIndex: this.domUtils.getHighZIndex() + 40,
        fontSize: '13px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        opacity: '0',
        transform: 'translateY(-6px)',
        transition: 'all 0.2s ease'
      },
      innerHTML: '⏳ Summarizing page…'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    return el;
  }

  hideSummarizingPopup(el) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => el.remove(), 200);
  }

  showModesSubMenu() {
    
    // Remove existing submenu
    this.hideModesSubMenu();
    
    const submenuModes = [
      { id: 'student', name: 'Student', icon: '🎓', color: '#3b82f6', left: '95px', top: '270px' },
      { id: 'developer', name: 'Developer', icon: '💻', color: '#10b981', left: '73px', top: '231px' },
      { id: 'creator', name: 'Creator', icon: '🎨', color: '#f59e0b', left: '80px', top: '190px' },
      { id: 'researcher', name: 'Researcher', icon: '🔬', color: '#8b5cf6', left: '115px', top: '165px' }
    ];
    
    const submenuCircles = [];
    
    submenuModes.forEach((mode, index) => {
      const circle = this.domUtils.createElement('div', {
        className: 'ai-submenu-circle',
        attributes: { 'data-mode': mode.id },
        styles: {
          position: 'absolute',
          left: mode.left,
          top: mode.top,
          // Remove all inline styling - let CSS handle it
        },
        innerHTML: `<span style="font-size: 16px; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${mode.icon}</span>`
      });
      
      // Hover events - let CSS handle the styling
      circle.addEventListener('mouseenter', () => {
        // CSS handles the hover effect
      });
      
      circle.addEventListener('mouseleave', () => {
        // CSS handles the hover effect
      });
      
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleModeSelect(mode.id);
      });
      
      this.circularMenu.appendChild(circle);
      submenuCircles.push(circle);
      
      // Animate in faster - use CSS class
      setTimeout(() => {
        circle.classList.add('visible');
      }, index * 30); // Reduced from 50ms to 30ms
    });
    
    this.currentSubmenu = { circles: submenuCircles };
    this.submenuVisible = true;
  }

  hideModesSubMenu() {
    
    if (this.currentSubmenu && this.currentSubmenu.circles) {
      this.currentSubmenu.circles.forEach(circle => {
        if (circle && circle.parentNode) {
          circle.classList.remove('visible');
          setTimeout(() => {
            if (circle.parentNode) {
              circle.remove();
            }
          }, 150);
        }
      });
      this.currentSubmenu = null;
    }
    
    this.submenuVisible = false;
  }

  showVoiceListening() {
    this.showVoiceUI('listening', 'Listening... Speak clearly');
    
    // Add timeout to prevent infinite listening
    this.voiceTimeout = setTimeout(() => {
      if (this.currentRecognition) {
        this.currentRecognition.abort();
      }
      this.showVoiceError('Listening timeout. Please try again.', '⏰');
    }, 10000); // 10 second timeout
  }

  showVoiceListeningOld() {
    // Create voice listening indicator
    this.voiceListeningIndicator = this.domUtils.createElement('div', {
      className: 'ai-voice-listening',
      styles: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '24px 32px',
        borderRadius: '20px',
        zIndex: this.domUtils.getHighZIndex() + 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        fontSize: '16px',
        fontWeight: '500',
        minWidth: '280px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      },
      innerHTML: `
        <div class="voice-pulse" style="font-size: 32px;">🎤</div>
        <div>
          <div class="voice-status">Listening... Speak clearly</div>
          <div class="voice-hint" style="font-size: 14px; color: #ccc; margin-top: 8px;">Say something like "What is this page about?"</div>
        </div>
        <button class="cancel-voice" style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s ease;
        ">Cancel</button>
      `
    });
    
    // Add cancel functionality
    const cancelBtn = this.voiceListeningIndicator.querySelector('.cancel-voice');
    cancelBtn.addEventListener('click', () => {
      if (this.currentRecognition) {
        this.currentRecognition.abort();
      }
      this.hideVoiceListening();
    });
    
    // Hover effect for cancel button
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    
    // Add pulsing animation
    this.domUtils.injectCSS(`
      .voice-pulse {
        animation: voicePulse 1.5s ease-in-out infinite;
      }
      
      @keyframes voicePulse {
        0%, 100% { 
          transform: scale(1);
          opacity: 1;
        }
        50% { 
          transform: scale(1.1);
          opacity: 0.8;
        }
      }
    `, 'voice-listening-styles');
    
    document.body.appendChild(this.voiceListeningIndicator);
    
    // Add timeout to prevent infinite listening
    this.voiceTimeout = setTimeout(() => {
      if (this.currentRecognition) {
        this.currentRecognition.abort();
      }
      this.showVoiceError('Listening timeout. Please try again.', '⏰');
    }, 10000); // 10 second timeout
  }

  hideVoiceListening() {
    if (this.voiceTimeout) {
      clearTimeout(this.voiceTimeout);
      this.voiceTimeout = null;
    }
    
    // Add null check
    if (this.voiceListeningIndicator && this.voiceListeningIndicator.parentNode) {
      this.voiceListeningIndicator.remove();
      this.voiceListeningIndicator = null;
    }
  }
  
  async generateSummaryWithChromeAI(pageContent) {
    try {
      // Try using AIManager first
      if (window.ChromeAIStudio?.aiManager) {
        return await this.generateSummaryWithAIManager(pageContent);
      }
      
      // Fallback to direct LanguageModel API
      if (typeof LanguageModel === 'undefined') {
        throw new Error('Chrome AI LanguageModel not available');
      }
      
      // Get active mode for context
      const activeMode = localStorage.getItem('chromeai-active-mode') || '';
      
      // Create summary prompt based on mode
      const systemPrompt = this.getSummaryPrompt(activeMode);
      const fullPrompt = `${systemPrompt}\n\nContent to summarize:\n${pageContent.substring(0, 8000)}`; // Limit content length
      
      // Create AI session
      const session = await LanguageModel.create({
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      let summary = '';
      this.updateSummaryStatus('Generating summary...', '📄');
      
      // Stream the summary
      const stream = session.promptStreaming(fullPrompt);
      
      for await (const chunk of stream) {
        summary = chunk;
        // Update with partial summary
        this.updateSummaryStatus(summary.substring(0, 200) + '...', '📄');
      }
      
      // Show final summary
      this.showSummaryResult(summary);
      
      // Clean up session
      session.destroy();
      
    } catch (error) {
      console.error('📄 Summary generation error:', error);
      throw error;
    }
  }

  async generateSummaryWithAIManager(pageContent) {
    try {
      const aiManager = window.ChromeAIStudio.aiManager;
      
      // Get active mode for context
      const activeMode = localStorage.getItem('chromeai-active-mode') || '';
      
      // Create summary prompt based on mode
      const systemPrompt = this.getSummaryPrompt(activeMode);
      const fullPrompt = `${systemPrompt}\n\nContent to summarize:\n${pageContent.substring(0, 8000)}`;
      this.updateSummaryStatus('Generating summary with AI Manager...', '📄');
      
      // Use AIManager's streaming prompt
      let summary = '';
      const stream = await aiManager.promptStreaming(fullPrompt, {
        temperature: 0.3,
        topK: 20
      });
      
      for await (const chunk of stream) {
        summary = chunk;
        // Update with partial summary
        this.updateSummaryStatus(summary.substring(0, 200) + '...', '📄');
      }
      
      // Show final summary
      this.showSummaryResult(summary);
      
    } catch (error) {
      console.error('📄 AIManager summary generation error:', error);
      throw error;
    }
  }

  async generateSummaryForSidebar(pageContent) {
    try {
      const sidebar = window.ChromeAIStudio?.smartSidebar;
      
      // Use LanguageModel directly for better reliability
      if (typeof LanguageModel !== 'undefined') {
        await this.streamSummaryToSidebarDirect(pageContent, sidebar);
      } else if (window.ChromeAIStudio?.aiManager) {
        await this.streamSummaryToSidebar(pageContent, sidebar);
      } else {
        throw new Error('No AI capabilities available for summary generation');
      }
      
    } catch (error) {
      console.error('📄 Sidebar summary generation error:', error);
      const sidebar = window.ChromeAIStudio?.smartSidebar;
      if (sidebar && sidebar.ui && sidebar.ui.completeProcessing) {
        sidebar.ui.completeProcessing(`Failed to generate summary: ${error.message}`, 'Summary Error');
      }
    }
  }

  async streamSummaryToSidebar(pageContent, sidebar) {
    
    const aiManager = window.ChromeAIStudio.aiManager;
    if (!aiManager) {
      throw new Error('AI Manager not available');
    }
    
    // Get active mode for context
    const activeMode = localStorage.getItem('chromeai-active-mode') || '';
    
    // Create summary prompt based on mode
    const systemPrompt = this.getSummaryPrompt(activeMode);
    const fullPrompt = `${systemPrompt}\n\nContent to summarize:\n${pageContent.substring(0, 8000)}`;
    
    try {
      // Get streaming response from AI Manager
      const response = await aiManager.promptStreaming(fullPrompt, {
        temperature: 0.3,
        topK: 20
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'AI request failed');
      }
      
      // ✅ Stream response to sidebar UI in real-time
      const sidebarUI = sidebar?.ui;
      if (!sidebarUI) {
        throw new Error('Sidebar UI not available');
      }
      
      // Create streaming message element
      const messageElement = sidebarUI.addStreamingMessage();
      if (!messageElement) {
        throw new Error('Could not create streaming message');
      }
      
      // Stream the response in real-time
      await this.consumeStreamToSidebar(
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
      console.error('📄 AI Manager streaming summary failed:', error);
      
      // Fallback to old method if streaming fails
      if (sidebar && sidebar.ui && sidebar.ui.completeProcessing) {
        sidebar.ui.completeProcessing(`Failed to generate summary: ${error.message}`, 'Summary Error');
      }
    }
  }

  async streamSummaryToSidebarDirect(pageContent, sidebar) {
    
    // Get active mode for context
    const activeMode = localStorage.getItem('chromeai-active-mode') || '';
    
    // Create summary prompt based on mode
    const systemPrompt = this.getSummaryPrompt(activeMode);
    const fullPrompt = `${systemPrompt}\n\nContent to summarize:\n${pageContent.substring(0, 8000)}`;
    
    try {
      // ✅ Use AI Manager for real streaming (same as text selection features)
      const aiManager = window.ChromeAIStudio?.aiManager;
      if (!aiManager) {
        throw new Error('AI Manager not available');
      }
      
      // Get streaming response from AI Manager
      const response = await aiManager.promptStreaming(fullPrompt);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'AI request failed');
      }
      
      // ✅ Stream response to sidebar UI in real-time (same pattern as text selection)
      const sidebarUI = sidebar?.ui;
      if (!sidebarUI) {
        throw new Error('Sidebar UI not available');
      }
      
      // Create streaming message element
      const messageElement = sidebarUI.addStreamingMessage();
      if (!messageElement) {
        throw new Error('Could not create streaming message');
      }
      
      // Stream the response in real-time
      await this.consumeStreamToSidebar(
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
      console.error('📄 Real streaming summary failed:', error);
      
      // Fallback to old method if streaming fails
      if (sidebar && sidebar.ui && sidebar.ui.completeProcessing) {
        sidebar.ui.completeProcessing(`Failed to generate summary: ${error.message}`, 'Summary Error');
      }
    }
  }

  /**
   * Consume stream to sidebar (same pattern as text selection features)
   */
  async consumeStreamToSidebar(stream, onChunk, onComplete, onError) {
    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lastUpdateTime = 0;
      const updateInterval = 16; // ~60fps
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete(fullText);
          break;
        }
        
        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Throttle UI updates for smooth performance
        const now = Date.now();
        if (now - lastUpdateTime >= updateInterval) {
          onChunk(chunk, fullText);
          lastUpdateTime = now;
        }
      }
    } catch (error) {
      onError(error);
    }
  }

  async processVoiceWithChromeAI(transcript) {
    try {
      // Get active mode for context
      const activeMode = localStorage.getItem('chromeai-active-mode') || '';
      
      // First try MCP Voice Agent (best option)
      if (await this.tryProcessWithMCPVoice(transcript)) {
        return; // Success with MCP Voice Agent
      }
      
      // Fallback to Chrome AI
      if (await this.tryProcessWithChromeAI(transcript, activeMode)) {
        return; // Success with Chrome AI
      }
      
      // Fallback to extension's AI manager
      if (await this.tryProcessWithExtensionAI(transcript, activeMode)) {
        return; // Success with extension AI
      }
      
      // Final fallback - open sidebar
      this.hideVoiceListening();
      await this.fallbackToSidebar(transcript);
      
    } catch (error) {
      console.error('🎤 Voice processing error:', error);
      this.hideVoiceListening();
      this.speakText('Sorry, I encountered an error processing your request.');
    }
  }
  
  makeConciseForVoice(response) {
    if (!response || typeof response !== 'string') return response;
    
    // Remove emojis and excessive formatting
    let concise = response.replace(/[\u{1f300}-\u{1f9ff}]/gu, '').trim();
    
    // Split into sentences
    const sentences = concise.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Take first 2 sentences maximum
    concise = sentences.slice(0, 2).join('. ').trim();
    
    // If still too long, truncate at 200 characters
    if (concise.length > 200) {
      concise = concise.substring(0, 197) + '...';
    }
    
    return concise + (concise.endsWith('.') || concise.endsWith('!') || concise.endsWith('?') ? '' : '.');
  }
  
  async tryProcessWithMCPVoice(transcript) {
    try {
      // Check if MCP Voice Interface is available
      const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
      if (!mcpVoiceInterface) {
        return false;
      }
      this.updateVoiceStatus('MCP Voice Agent is thinking...', '🤖');
      
      // Process with MCP voice agent
      const response = await mcpVoiceInterface.mcpAgent.processVoiceInput(transcript);
      
      if (response && response.trim()) {
        this.hideVoiceListening();
        
        // Make response more concise for voice
        const conciseResponse = this.makeConciseForVoice(response);
        await this.speakText(conciseResponse);
        return true; // Success
      }
      
      return false; // No response
      
    } catch (error) {
      console.error('🎤 MCP Voice Agent failed:', error);
      return false; // Failed
    }
  }

  async tryProcessWithAIManager(transcript, activeMode) {
    try {
      const aiManager = window.ChromeAIStudio.aiManager;
      
      // Create voice assistant prompt based on mode
      const systemPrompt = this.getVoiceAssistantPrompt(activeMode);
      const fullPrompt = `${systemPrompt}\n\nUser: ${transcript}`;
      this.updateVoiceStatus('AI Manager is thinking...', '🧐');
      
      let fullResponse = '';
      
      // Stream the response
      const stream = await aiManager.promptStreaming(fullPrompt, {
        temperature: 0.7,
        topK: 40
      });
      
      for await (const chunk of stream) {
        fullResponse = chunk;
        this.updateVoiceStatus(fullResponse.substring(0, 100) + '...', '🎤');
      }
      
      if (fullResponse && fullResponse.trim()) {
        this.hideVoiceListening();
        
        // Make response more concise for voice
        const conciseResponse = this.makeConciseForVoice(fullResponse);
        await this.speakText(conciseResponse);
        return true; // Success
      }
      
      return false; // No response
      
    } catch (error) {
      console.error('🎤 AIManager Voice processing failed:', error);
      return false; // Failed
    }
  }

  async tryProcessWithChromeAI(transcript, activeMode) {
    try {
      // Try using AIManager first
      if (window.ChromeAIStudio?.aiManager) {
        return await this.tryProcessWithAIManager(transcript, activeMode);
      }
      
      // Fallback to direct LanguageModel API
      if (typeof LanguageModel === 'undefined') {
        return false;
      }
      
      // Create voice assistant prompt based on mode
      const systemPrompt = this.getVoiceAssistantPrompt(activeMode);
      const fullPrompt = `${systemPrompt}\n\nUser: ${transcript}`;
      this.updateVoiceStatus('Chrome AI is thinking...', '🧐');
      
      // Create AI session
      const session = await LanguageModel.create({
        temperature: 0.7,
        topK: 40,
        outputLanguage: 'en'
      });
      
      let fullResponse = '';
      
      // Stream the response
      const stream = session.promptStreaming(fullPrompt);
      
      for await (const chunk of stream) {
        fullResponse = chunk;
        // Update status with partial response
        this.updateVoiceStatus(fullResponse.substring(0, 100) + '...', '🤖');
      }
      
      // Hide processing and speak the response
      this.hideVoiceListening();
      
      // Make response concise for voice
      const conciseResponse = this.makeConciseForVoice(fullResponse);
      await this.speakText(conciseResponse);
      
      // Clean up session
      session.destroy();
      
      return true; // Success
      
    } catch (error) {
      console.error('🎤 Chrome AI failed:', error);
      return false; // Failed
    }
  }
  
  async tryProcessWithExtensionAI(transcript, activeMode) {
    try {
      // Check if extension's AI manager is available
      const aiManager = window.ChromeAIStudio?.aiManager;
      if (!aiManager) {
        return false;
      }
      this.updateVoiceStatus('Extension AI is thinking...', '🤖');
      
      // Create concise prompt for voice interaction
      const voicePrompt = `You are a helpful voice assistant. Be conversational and concise (1-2 sentences max). User said: "${transcript}". Respond naturally and helpfully.`;
      
      // Try to get AI response
      const response = await aiManager.generateResponse(voicePrompt);
      
      if (response) {
        this.hideVoiceListening();
        
        // Make response concise for voice
        const conciseResponse = this.makeConciseForVoice(response);
        await this.speakText(conciseResponse);
        return true; // Success
      }
      
      return false; // No response
      
    } catch (error) {
      console.error('🎤 Extension AI failed:', error);
      return false; // Failed
    }
  }
  
  makeConciseForVoice(response) {
    if (!response || typeof response !== 'string') return response;
    
    // Split into sentences
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Take first 2 sentences maximum
    const concise = sentences.slice(0, 2).join('. ').trim();
    
    // If still too long, truncate at 200 characters
    if (concise.length > 200) {
      return concise.substring(0, 197) + '...';
    }
    
    return concise + (concise.endsWith('.') ? '' : '.');
  }

  async fallbackToSidebar(transcript) {
    try {
      this.updateVoiceStatus('Opening sidebar...', '📱');
      
      // Open sidebar
      await this.openSidebar();
      
      // Send voice input to sidebar
      const sidebar = window.ChromeAIStudio?.smartSidebar;
      if (sidebar) {
        // Add the voice input as a message
        if (sidebar.ui && sidebar.ui.addMessage) {
          sidebar.ui.addMessage(transcript, 'user');
        }
        
        // Speak confirmation
        await this.speakText(`I've opened the sidebar with your question: ${transcript}`);
      } else {
        throw new Error('Sidebar not available');
      }
      
    } catch (error) {
      console.error('🎤 Sidebar fallback failed:', error);
      await this.speakText('I\'m having trouble processing your request. Please try typing your question instead.');
    }
  }  createModeCircle(mode, index) {
    const circle = this.domUtils.createElement('div', {
      className: 'ai-mode-circle',
      attributes: {
        'data-mode': mode.id
      },
      styles: {
        background: `linear-gradient(135deg, ${mode.color}, ${this.adjustColor(mode.color, -20)})`,
        left: '50%',
        top: '50%',
        width: `${mode.size}px`,
        height: `${mode.size}px`
      },
      innerHTML: `
        <span class="ai-mode-icon" style="font-size: ${mode.size * 0.4}px">${mode.icon}</span>
        <div class="ai-mode-tooltip">${mode.name}</div>
      `
    });

    // Add event listeners after element is created
    circle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleModeSelect(mode.id);
    });
    
    circle.addEventListener('mouseenter', () => {
      circle.style.background = `linear-gradient(135deg, ${this.adjustColor(mode.color, 20)}, ${mode.color})`;
    });
    
    circle.addEventListener('mouseleave', () => {
      circle.style.background = `linear-gradient(135deg, ${mode.color}, ${this.adjustColor(mode.color, -20)})`;
    });

    // Calculate position around the circle
    // Use consistent radius for all circles, but adjust for circle size to maintain visual spacing
    const baseRadius = 80; // Base distance from center
    const sizeAdjustment = (mode.size - 32) / 4; // Adjust based on circle size (smallest is 32px)
    const radius = baseRadius + sizeAdjustment;
    
    const angleRad = (mode.angle * Math.PI) / 180;
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    
    // Position circle relative to center of circular menu (100px, 100px is center of 200px container)
    const centerX = 100;
    const centerY = 100;
    
    // Set initial position with scale(0) - offset by half the circle size to center it
    const halfSize = mode.size / 2;
    circle.style.left = `${centerX + x - halfSize}px`;
    circle.style.top = `${centerY + y - halfSize}px`;
    circle.style.transform = `scale(0)`;
    
    // Delay animation for each circle
    setTimeout(() => {
      circle.style.transform = `scale(1)`;
      circle.classList.add('visible');
    }, index * 80);

    return circle;
  }

  // Helper function to adjust color brightness
  adjustColor(color, percent) {
    try {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, Math.min(255, (num >> 16) + amt));
      const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
      const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
      return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    } catch (error) {
      console.error('Error adjusting color:', color, error);
      return color; // Return original color if there's an error
    }
  }

  positionCircularMenu() {
    if (!this.circularMenu || !this.bubble) return;

    // Get the bubble's position without any transforms
    const bubbleRect = this.bubble.getBoundingClientRect();
    const menuSize = 300; // Updated to match new menu size
    
    // Center the circular menu on the bubble's original position
    // Use the center of the bubble as reference point
    const bubbleCenterX = bubbleRect.left + (bubbleRect.width / 2);
    const bubbleCenterY = bubbleRect.top + (bubbleRect.height / 2);
    
    // Ensure menu stays within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let menuLeft = bubbleCenterX - (menuSize / 2) - 50; // Move 50px to the left
    let menuTop = bubbleCenterY - (menuSize / 2) - 50;  // Move 50px up
    
  // Apply a margin from the viewport edges for the main circular menu
  const edgeMargin = 20; // 100px margin from bottom and right (and other edges)

  // Adjust if menu would go off-screen (use edgeMargin instead of hard 10px)
  if (menuLeft < edgeMargin) menuLeft = edgeMargin;
  if (menuTop < edgeMargin) menuTop = edgeMargin;
  if (menuLeft + menuSize > viewport.width) menuLeft = viewport.width - menuSize - edgeMargin;
  if (menuTop + menuSize > viewport.height) menuTop = viewport.height - menuSize - edgeMargin;
    
    this.circularMenu.style.left = `${menuLeft}px`;
    this.circularMenu.style.top = `${menuTop}px`;
    
    // The bubble's position is controlled by `positionBubble()` and user settings.
    // We intentionally do not modify the bubble here to avoid conflicting layout changes while hovering.
  }

  createMenuContent(contextInfo) {
    const container = this.domUtils.createElement('div', {
      className: 'ai-menu-container'
    });

    // Simple header
    const header = this.domUtils.createElement('div', {
      className: 'ai-menu-header',
      innerHTML: `
        <div class="ai-menu-title">
          <div class="ai-title-text">Select Your Mode</div>
        </div>
        <div class="ai-menu-subtitle">Choose how you want to use AI</div>
      `
    });

    // Mode toggles section
    const toggleSection = this.createModeToggles();

    container.appendChild(header);
    container.appendChild(toggleSection);

    // Add menu styles
    this.domUtils.injectCSS(`
      .ai-menu-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .ai-menu-header {
        text-align: center;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--ai-border);
      }
      
      .ai-menu-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .ai-title-text {
        font-weight: 600;
        color: var(--ai-text-primary);
        font-size: 16px;
      }
      
      .ai-context-badge {
        background: var(--ai-primary);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .ai-menu-subtitle {
        color: var(--ai-text-secondary);
        font-size: 13px;
      }
      
      .ai-quick-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .ai-quick-actions-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--ai-text-secondary);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .ai-action-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--ai-border);
        border-radius: 12px;
        background: var(--ai-background);
        color: var(--ai-text-primary);
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      
      .ai-action-button:hover {
        background: var(--ai-hover);
        border-color: var(--ai-primary);
        transform: translateY(-1px);
      }
      
      .ai-action-button.suggested {
        background: linear-gradient(135deg, var(--ai-primary), var(--ai-secondary));
        color: white;
        border-color: transparent;
      }
      
      .ai-action-button.suggested:hover {
        background: linear-gradient(135deg, var(--ai-secondary), var(--ai-primary));
      }
      
      .ai-action-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      
      .ai-action-content {
        flex: 1;
      }
      
      .ai-action-title {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 2px;
      }
      
      .ai-action-desc {
        font-size: 12px;
        opacity: 0.8;
        line-height: 1.3;
      }
      
      .ai-modes-section {
        padding-top: 8px;
        border-top: 1px solid var(--ai-border);
      }
      
      .ai-modes-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--ai-text-secondary);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .ai-modes-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .ai-mode-button {
        padding: 12px 8px;
        border: 1px solid var(--ai-border);
        border-radius: 12px;
        background: var(--ai-background);
        color: var(--ai-text-primary);
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      
      .ai-mode-button:hover {
        background: var(--ai-hover);
        border-color: var(--ai-primary);
        transform: translateY(-1px);
      }
      
      .ai-mode-icon {
        width: 24px;
        height: 24px;
      }
      
      .ai-mode-name {
        font-size: 12px;
        font-weight: 500;
      }
      
      .ai-menu-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid var(--ai-border);
      }
      
      .ai-footer-button {
        color: var(--ai-text-secondary);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
      }
      
      .ai-footer-button:hover {
        background: var(--ai-hover);
        color: var(--ai-text-primary);
      }
    `, 'ai-action-menu-styles');

    return container;
  }

  createModeToggles() {
    const toggleSection = this.domUtils.createElement('div', {
      className: 'ai-mode-toggles'
    });

    const modes = [
      { id: 'student', name: 'Student', icon: '🎓' },
      { id: 'developer', name: 'Developer', icon: '💻' },
      { id: 'creator', name: 'Creator', icon: '🎨' },
      { id: 'researcher', name: 'Researcher', icon: '🔬' }
    ];

    // Get currently active modes from storage
    const activeMode = localStorage.getItem('chromeai-active-mode') || '';

    modes.forEach(mode => {
      const isActive = activeMode === mode.id;
      
      const button = this.domUtils.createElement('div', {
        className: `ai-toggle-button ${isActive ? 'active' : ''}`,
        attributes: {
          'data-mode': mode.id
        },
        events: {
          click: () => this.handleModeToggle(mode.id, button)
        },
        innerHTML: `
          <span class="ai-mode-icon">${mode.icon}</span>
          <span class="ai-mode-name">${mode.name}</span>
        `
      });
      
      toggleSection.appendChild(button);
    });

    // Add toggle styles
    this.domUtils.injectCSS(`
      .ai-mode-toggles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 10px 0;
      }
      
      .ai-toggle-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 16px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 16px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        min-height: 80px;
      }
      
      .ai-toggle-button:hover {
        border-color: #4285f4;
        background: #f0f7ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
      }
      
      .ai-toggle-button.active {
        border-color: #4285f4;
        background: #4285f4;
        color: white;
      }
      
      .ai-toggle-button .ai-mode-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }
      
      .ai-toggle-button .ai-mode-name {
        font-size: 13px;
        font-weight: 500;
        text-align: center;
      }
    `, 'ai-toggle-styles');

    return toggleSection;
  }

  createQuickActions(contextInfo) {
    const quickActions = this.domUtils.createElement('div', {
      className: 'ai-quick-actions'
    });

    const title = this.domUtils.createElement('div', {
      className: 'ai-quick-actions-title',
      textContent: 'Smart Suggestions'
    });

    // Add "Open Full Studio" action first
    const openStudioAction = {
      id: 'open-studio',
      title: 'Open Full Studio',
      description: 'Access all AI tools in the sidebar',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3,3H21A2,2 0 0,1 23,5V19A2,2 0 0,1 21,21H3A2,2 0 0,1 1,19V5A2,2 0 0,1 3,3M3,5V19H13V5H3M15,5V19H21V5H15M17,7H19V9H17V7M17,11H19V13H17V11M17,15H19V17H17V15Z"/></svg>`
    };

    const actions = [openStudioAction, ...this.getContextualActions(contextInfo)];
    
    quickActions.appendChild(title);
    
    actions.forEach((action, index) => {
      const buttonClasses = ['ai-action-button'];
      if (index === 0) {
        buttonClasses.push('suggested');
      }
      
      const button = this.domUtils.createElement('div', {
        className: buttonClasses.join(' '),
        events: {
          click: () => this.handleActionClick(action.id, contextInfo)
        },
        innerHTML: `
          <div class="ai-action-icon">${action.icon}</div>
          <div class="ai-action-content">
            <div class="ai-action-title">${action.title}</div>
            <div class="ai-action-desc">${action.description}</div>
          </div>
        `
      });
      
      quickActions.appendChild(button);
    });

    return quickActions;
  }

  createAllModes() {
    const section = this.domUtils.createElement('div', {
      className: 'ai-modes-section'
    });

    const title = this.domUtils.createElement('div', {
      className: 'ai-modes-title',
      textContent: 'All Modes'
    });

    const grid = this.domUtils.createElement('div', {
      className: 'ai-modes-grid'
    });

    const modes = [
      {
        id: 'student',
        name: 'Student',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>`
      },
      {
        id: 'developer',
        name: 'Developer',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`
      },
      {
        id: 'creator',
        name: 'Creator',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      },
      {
        id: 'researcher',
        name: 'Researcher',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`
      }
    ];

    modes.forEach(mode => {
      const button = this.domUtils.createElement('div', {
        className: 'ai-mode-button',
        events: {
          click: (event) => {
            this.createRippleEffect(button, event);
            setTimeout(() => this.handleModeClick(mode.id), 150); // Slight delay for ripple effect
          }
        },
        innerHTML: `
          <div class="ai-mode-icon">${mode.icon}</div>
          <div class="ai-mode-name">${mode.name}</div>
        `
      });
      
      grid.appendChild(button);
    });

    section.appendChild(title);
    section.appendChild(grid);
    
    return section;
  }

  createMenuFooter() {
    const footer = this.domUtils.createElement('div', {
      className: 'ai-menu-footer',
      innerHTML: `
        <button class="ai-footer-button" data-action="settings">Settings</button>
        <button class="ai-footer-button" data-action="help">Help</button>
        <button class="ai-footer-button" data-action="feedback">Feedback</button>
      `
    });

    // Add event listeners for footer buttons
    footer.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleFooterAction(action);
      }
    });

    return footer;
  }

  getContextBadge(contextInfo) {
    if (!contextInfo) return 'PAGE';
    
    const badgeMap = {
      'learning': 'STUDY',
      'coding': 'CODE',
      'writing': 'WRITE',
      'research': 'RESEARCH',
      'social': 'SOCIAL',
      'shopping': 'SHOP',
      'video': 'VIDEO'
    };
    
    return badgeMap[contextInfo.primaryContext] || 'PAGE';
  }

  getContextualActions(contextInfo) {
    if (!contextInfo) {
      return [
        {
          id: 'summarize',
          title: 'Summarize Page',
          description: 'Get a quick summary of this page\'s content',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`
        }
      ];
    }

    const actionMap = {
      'learning': [
        {
          id: 'explain',
          title: 'Explain This',
          description: 'Get a clear explanation of the content',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C7.59,4 4,12A10,10 0 0,0 12,2Z"/></svg>`
        },
        {
          id: 'quiz',
          title: 'Create Quiz',
          description: 'Generate questions to test understanding',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>`
        }
      ],
      'coding': [
        {
          id: 'review-code',
          title: 'Review Code',
          description: 'Get code review and suggestions',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4,16.6L4.8,12L9.4,7.4L8,6L2,12L8,18L9.4,16.6M14.6,16.6L19.2,12L14.6,7.4L16,6L22,12L16,18L14.6,16.6Z"/></svg>`
        },
        {
          id: 'explain-code',
          title: 'Explain Code',
          description: 'Understand what this code does',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3H8M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z"/></svg>`
        }
      ],
      'writing': [
        {
          id: 'improve-writing',
          title: 'Improve Writing',
          description: 'Enhance clarity and style',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>`
        },
        {
          id: 'translate',
          title: 'Translate',
          description: 'Translate to another language',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z"/></svg>`
        }
      ],
      'research': [
        {
          id: 'summarize',
          title: 'Summarize Research',
          description: 'Create concise summary of findings',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`
        },
        {
          id: 'fact-check',
          title: 'Fact Check',
          description: 'Verify claims and information',
          icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>`
        }
      ]
    };

    return actionMap[contextInfo.primaryContext] || [
      {
        id: 'summarize',
        title: 'Summarize Page',
        description: 'Get a quick summary of this page\'s content',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`
      }
    ];
  }

  positionBubble() {
    const m = `${this.bubbleMargin}px`;
    const positions = {
      'bottom-right': { bottom: m, right: m },
      'bottom-left': { bottom: m, left: m },
      'top-right': { top: m, right: m },
      'top-left': { top: m, left: m }
    };

    const pos = positions[this.position];
    // Clear any possibly conflicting inline offsets (left/top/right/bottom)
    this.bubble.style.left = '';
    this.bubble.style.top = '';
    this.bubble.style.right = '';
    this.bubble.style.bottom = '';

    // Apply the anchored corner position
    Object.assign(this.bubble.style, pos);
  }

  // Legacy method - no longer used with circular menu
  positionActionMenu() {
  }

  attachEventListeners() {
    
    // Bubble click - now opens sidebar
    this.bubble.addEventListener('click', this.handleBubbleClick.bind(this));

    // Hover events for circular menu with precise circle detection
    this.bubble.addEventListener('mouseenter', this.handleBubbleHoverStart.bind(this));
    this.bubble.addEventListener('mouseleave', this.handleBubbleHoverEnd.bind(this));
    
    // Add mousemove to handle precise circular hover detection
    this.bubble.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;
      
      const isOverCircle = this.isMouseOverCircle(e);
      
      if (isOverCircle && !this.isHovering) {
        this.isHovering = true;
        this.clearAllTimeouts();
        
        // Show menu immediately
        requestAnimationFrame(() => {
          this.showCircularMenu();
        });
      } else if (!isOverCircle && this.isHovering) {
        this.isHovering = false;
        this.startHideTimer();
      }
    });

    // Drag functionality - attach only if bubble is not locked
    if (!this.lockBubble) {
      this.bubble.addEventListener('mousedown', this.handleMouseDown.bind(this));
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));

      // Touch events for mobile
      this.bubble.addEventListener('touchstart', this.handleTouchStart.bind(this));
      document.addEventListener('touchmove', this.handleTouchMove.bind(this));
      document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    } else {
    }

    // Close menu when clicking outside
    document.addEventListener('click', this.handleDocumentClick.bind(this));

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Window resize
    window.addEventListener('resize', this.domUtils.debounce(() => {
      if (this.isExpanded) {
        this.positionCircularMenu();
      }
    }, 250));
  }

  handleBubbleClick(e) {
    e.stopPropagation();
    
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    // Open sidebar instead of toggling menu
    this.openSidebar();
  }

  handleBubbleHoverStart(e) {
    if (this.isDragging) return;
    
    // Don't show menu yet - wait for mousemove to confirm we're over the circle
    this.clearAllTimeouts();
  }

  handleBubbleHoverEnd(e) {
    if (this.isDragging) return;
    
    this.isHovering = false;
    this.startHideTimer();
  }

  // Centralized timeout management
  clearAllTimeouts() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }
  
  startHideTimer() {
    this.clearAllTimeouts();
    this.hoverTimeout = setTimeout(() => {
      if (!this.isInHoverZone()) {
        this.hideCircularMenu();
      } else {
      }
    }, 200);
  }
  
  isInHoverZone() {
    // Check if mouse is over bubble or circular menu or any of its children
    const bubble = this.bubble && this.bubble.matches(':hover');
    const menu = this.circularMenu && this.circularMenu.matches(':hover');
    const result = bubble || menu;
    return result;
  }
  
  isInSubmenuZone() {
    // Check if any submenu circle is being hovered
    if (!this.currentSubmenu || !this.currentSubmenu.circles) return false;
    
    const hovering = this.currentSubmenu.circles.some(circle => {
      return circle && circle.matches(':hover');
    });
    return hovering;
  }
  
  isMouseOverCircle(event) {
    if (!this.bubble) return false;
    
    const rect = this.bubble.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2; // 28px for 56px bubble
    
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    // Calculate distance from center
    const distance = Math.sqrt(
      Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
    );
    
    const isInCircle = distance <= radius;
    
    return isInCircle;
  }

  async openSidebar() {
    // Hide circular menu first if open
    this.hideCircularMenu();
    
    // Get or create sidebar instance
    const sidebar = window.ChromeAIStudio?.smartSidebar;
    if (sidebar) {
      sidebar.show();
    } else {
      console.warn('⚠️ Sidebar not available');
    }
  }

  async showCircularMenu() {
    
    // Create menu if needed
    if (!this.circularMenu) {
      await this.createCircularMenu();
    }

    // Show menu
    this.isExpanded = true;
    this.menuVisible = true;
    this.bubble.classList.add('expanded');
    this.circularMenu.style.opacity = '1';
    this.circularMenu.style.pointerEvents = 'auto';
    
    // Animate circles faster
    this.modeCircles.forEach((circle, index) => {
      setTimeout(() => {
        circle.element.classList.add('visible');
        circle.element.style.transform = 'scale(1)';
      }, index * 50); // Reduced from 100ms to 50ms
    });
    
    this.positionCircularMenu();
  // Re-assert the bubble's anchored position to avoid conflicts caused by temporary inline moves
  this.positionBubble();
  }

  hideCircularMenu() {
    if (!this.circularMenu) return;
    
    // Hide submenu first
    this.hideModesSubMenu();
    
    // Reset states
    this.isExpanded = false;
    this.menuVisible = false;
    this.bubble.classList.remove('expanded');
    this.clearAllTimeouts();

    // Hide menu
    this.circularMenu.style.opacity = '0';
    this.circularMenu.style.pointerEvents = 'none';
    
    // Animate circles out
    this.modeCircles.forEach((circle, index) => {
      setTimeout(() => {
        circle.element.classList.remove('visible');
        circle.element.style.transform = 'scale(0)';
      }, index * 50);
    });
  }

  async handleModeSelect(modeId) {
    
    // Update active mode
    const currentMode = localStorage.getItem('chromeai-active-mode') || '';
    
    if (currentMode !== modeId) {
      localStorage.setItem('chromeai-active-mode', modeId);
      
      // Update circle visual states
      this.updateModeCircleStates(modeId);
      
      // Dispatch mode change event for text selection menu
      const event = new CustomEvent('chromeai-mode-changed', {
        detail: { 
          mode: modeId, 
          previousMode: currentMode,
          source: 'floating-bubble' 
        }
      });
      window.dispatchEvent(event);
      
      // Also dispatch the toggle event for compatibility
      const toggleEvent = new CustomEvent('chromeai-mode-toggle', {
        detail: {
          mode: modeId,
          previousMode: currentMode,
          source: 'floating-bubble'
        }
      });
      window.dispatchEvent(toggleEvent);
      
      // Show visual feedback to user
      this.showModeChangeFeedback(modeId);
    }
    
    // Hide menu after selection
    setTimeout(() => {
      this.hideCircularMenu();
    }, 300);
  }

  updateModeCircleStates(activeMode) {
    // Update primary circles
    this.modeCircles.forEach(circle => {
      const isActive = circle.option.id === activeMode;
      circle.element.classList.toggle('active', isActive);
    });
    
    // Update submenu circles if they exist
    if (this.currentSubmenu && this.currentSubmenu.circles) {
      this.currentSubmenu.circles.forEach(circle => {
        const modeId = circle.getAttribute('data-mode');
        const isActive = modeId === activeMode;
        circle.classList.toggle('active', isActive);
      });
    }
  }
  
  showModeChangeFeedback(modeId) {
    // Create a temporary feedback element (glassy black/grey toast)
    const label = modeId.charAt(0).toUpperCase() + modeId.slice(1);
    const feedback = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(0.96)',
        background: 'rgba(17, 17, 17, 0.85)',
        color: '#f3f4f6',
        padding: '12px 16px',
        borderRadius: '14px',
        zIndex: this.domUtils.getHighZIndex() + 20,
        fontSize: '14px',
        fontWeight: '600',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      },
      innerHTML: `
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.25);"></div>
        <div style="letter-spacing: 0.2px;">Mode · <span style="color:#e5e7eb">${label}</span></div>
      `
    });
    
    document.body.appendChild(feedback);
    
    // Animate in
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Remove after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.remove();
        }
      }, 200);
    }, 1800);
  }
  
  // Voice Assistant Helper Methods
  updateVoiceStatus(message, icon = '🎤') {
    if (this.voiceListeningIndicator) {
      this.voiceListeningIndicator.innerHTML = `
        <div class="voice-pulse">${icon}</div>
        <span>${message}</span>
      `;
    }
  }
  
  showVoiceError(message, icon = '⚠️') {
    // Check if this is a Chrome AI availability error
    const isChromeAIError = message.includes('Chrome AI') || message.includes('not available');
    
    const errorToast = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: isChromeAIError ? '#ff9800' : '#f44336',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        zIndex: this.domUtils.getHighZIndex() + 30,
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: '0',
        transform: 'translate(-50%, -50%) scale(0.9)',
        transition: 'all 0.3s ease',
        boxShadow: `0 8px 24px rgba(${isChromeAIError ? '255, 152, 0' : '244, 67, 54'}, 0.3)`,
        maxWidth: '400px'
      },
      innerHTML: `
        <div>${icon}</div>
        <div style="flex: 1;">
          <div>${message}</div>
          ${isChromeAIError ? '<div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">Using fallback - sidebar will open instead</div>' : ''}
        </div>
        <div style="display: flex; gap: 8px; flex-direction: column;">
          <button class="try-again" style="
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Try Again</button>
          ${isChromeAIError ? `<button class="setup-ai" style="
            background: rgba(255, 255, 255, 0.3);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Setup AI</button>` : ''}
        </div>
      `
    });
    
    // Add try again functionality with retry limits
    const tryAgainBtn = errorToast.querySelector('.try-again');
    tryAgainBtn.addEventListener('click', () => {
      errorToast.remove();
      
      // Check retry count to prevent infinite loops
      if (this.voiceRetryCount >= this.maxVoiceRetries) {
        this.showVoiceError('Too many retries. Please check your microphone settings and refresh the page.', '🚫');
        return;
      }
      
      this.voiceRetryCount++;
      this.handleVoiceAssistant();
    });
    
    // Add setup AI functionality
    const setupBtn = errorToast.querySelector('.setup-ai');
    if (setupBtn) {
      setupBtn.addEventListener('click', () => {
        errorToast.remove();
        this.showChromeAISetupInstructions();
      });
    }
    
    document.body.appendChild(errorToast);
    
    // Animate in
    requestAnimationFrame(() => {
      errorToast.style.opacity = '1';
      errorToast.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Auto remove after 7 seconds (longer for setup instructions)
    setTimeout(() => {
      if (errorToast.parentNode) {
        errorToast.style.opacity = '0';
        errorToast.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => {
          if (errorToast.parentNode) {
            errorToast.remove();
          }
        }, 300);
      }
    }, isChromeAIError ? 7000 : 5000);
  }
  
  async speakText(text) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Get a suitable voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        this.showSpeakingIndicator();
      };
      
      utterance.onend = () => {
        this.hideSpeakingIndicator();
      };
      
      utterance.onerror = (event) => {
        console.error('🔊 Speech error:', event.error);
        this.hideSpeakingIndicator();
      };
      
      speechSynthesis.speak(utterance);
    } else {
      console.warn('🔊 Text-to-speech not supported');
    }
  }
  
  getVoiceAssistantPrompt(mode) {
    const basePrompt = 'You are a helpful AI assistant. Provide clear, concise responses in a conversational tone. Keep responses under 200 words.';
    
    const modePrompts = {
      'student': 'You are a study assistant. Help with learning, explaining concepts clearly, and providing educational support. Keep explanations simple and engaging.',
      'developer': 'You are a coding assistant. Help with programming questions, code review, and technical problems. Provide practical, actionable advice.',
      'creator': 'You are a creative assistant. Help with writing, brainstorming, and creative projects. Be inspiring and offer creative suggestions.',
      'researcher': 'You are a research assistant. Help with analysis, fact-checking, and information gathering. Provide accurate, well-sourced information.'
    };
    
    return modePrompts[mode] || basePrompt;
  }
  
  async checkChromeAIAvailability() {
    try {
      const ai = window.ChromeAIStudio?.aiManager;
      if (!ai) {
        return { available: false, reason: 'aiManager not found' };
      }

      // Use aiManager to check language model availability
      const availability = await ai.checkLanguageModelAvailability();
      if (availability === 'readily' || availability === 'after-download') {
        return { available: true };
      }
      return { available: false, reason: availability };
      
    } catch (error) {
      return { available: false, reason: error && error.message ? error.message : String(error) };
    }
  }
  
  // Summary Helper Methods
  showSummaryProcessing() {
    this.summaryIndicator = this.domUtils.createElement('div', {
      className: 'ai-summary-processing',
      styles: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        zIndex: this.domUtils.getHighZIndex() + 15,
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '250px',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease'
      },
      innerHTML: `
        <div class="summary-spinner">📄</div>
        <span>Extracting page content...</span>
      `
    });
    
    document.body.appendChild(this.summaryIndicator);
    
    // Animate in
    requestAnimationFrame(() => {
      this.summaryIndicator.style.opacity = '1';
      this.summaryIndicator.style.transform = 'translateY(0)';
    });
    
    // Add spinning animation
    this.domUtils.injectCSS(`
      .summary-spinner {
        animation: summarySpinner 1s linear infinite;
      }
      @keyframes summarySpinner {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, 'summary-spinner-styles');
  }
  
  updateSummaryStatus(message, icon = '📄') {
    if (this.summaryIndicator) {
      this.summaryIndicator.innerHTML = `
        <div class="summary-spinner">${icon}</div>
        <span>${message}</span>
      `;
    }
  }
  
  hideSummaryProcessing() {
    if (this.summaryIndicator) {
      this.summaryIndicator.style.opacity = '0';
      this.summaryIndicator.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (this.summaryIndicator && this.summaryIndicator.parentNode) {
          this.summaryIndicator.remove();
          this.summaryIndicator = null;
        }
      }, 300);
    }
  }

  showSummaryResult(summary) {
    this.hideSummaryProcessing();
    
    const summaryModal = this.domUtils.createElement('div', {
      className: 'ai-summary-modal',
      styles: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: this.domUtils.getHighZIndex() + 25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      },
      innerHTML: `
        <div class="summary-content" style="
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          margin: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          transform: scale(0.9);
          transition: transform 0.3s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #333; display: flex; align-items: center; gap: 8px;">
              📄 Page Summary
            </h3>
            <button class="close-summary" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              padding: 0;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>
          <div class="summary-text" style="
            line-height: 1.6;
            color: #444;
            font-size: 15px;
            white-space: pre-wrap;
          ">${summary}</div>
          <div style="margin-top: 20px; text-align: center;">
            <button class="speak-summary" style="
              background: #4285f4;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              margin-right: 10px;
            ">🔊 Speak Summary</button>
            <button class="copy-summary" style="
              background: #34a853;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            ">📋 Copy</button>
          </div>
        </div>
      `
    });
    
    // Add event listeners
    const closeBtn = summaryModal.querySelector('.close-summary');
    const speakBtn = summaryModal.querySelector('.speak-summary');
    const copyBtn = summaryModal.querySelector('.copy-summary');
    
    closeBtn.addEventListener('click', () => this.closeSummaryModal(summaryModal));
    speakBtn.addEventListener('click', () => this.speakText(summary));
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(summary);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => copyBtn.innerHTML = '📋 Copy', 2000);
    });
    
    // Close on backdrop click
    summaryModal.addEventListener('click', (e) => {
      if (e.target === summaryModal) {
        this.closeSummaryModal(summaryModal);
      }
    });
    
    document.body.appendChild(summaryModal);
    
    // Animate in
    requestAnimationFrame(() => {
      summaryModal.style.opacity = '1';
      const content = summaryModal.querySelector('.summary-content');
      content.style.transform = 'scale(1)';
    });
  }
  
  closeSummaryModal(modal) {
    modal.style.opacity = '0';
    const content = modal.querySelector('.summary-content');
    content.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 300);
  }
  
  showSummaryError(message) {
    const errorToast = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#f44336',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        zIndex: this.domUtils.getHighZIndex() + 20,
        fontSize: '14px',
        fontWeight: '500'
      },
      innerHTML: `❌ Summary Error: ${message}`
    });
    
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
      if (errorToast.parentNode) {
        errorToast.remove();
      }
    }, 5000);
  }
  
  getSummaryPrompt(mode) {
    const basePrompt = 'Summarize the following content in a clear, concise manner. Focus on the key points and main ideas.';
    
    const modePrompts = {
      'student': 'Summarize this content for learning purposes. Include key concepts, important facts, and main takeaways that would be helpful for studying.',
      'developer': 'Summarize this technical content. Focus on key features, implementation details, code examples, and technical specifications.',
      'creator': 'Summarize this content with a focus on creative insights, inspiration, and actionable ideas for creative projects.',
      'researcher': 'Provide a research-focused summary. Include methodology, findings, data points, and analytical insights.'
    };
    
    return modePrompts[mode] || basePrompt;
  }
  
  extractPageContent() {
    // Extract main content from the page
    let content = '';
    
    // Try to get main content areas
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.entry-content',
      '.article-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.innerText || element.textContent || '';
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!content || content.length < 100) {
      content = document.body.innerText || document.body.textContent || '';
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Reduce excessive line breaks
      .trim();
    
    return content;
  }
  
  showSpeakingIndicator() {
    this.speakingIndicator = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '20px',
        zIndex: this.domUtils.getHighZIndex() + 10,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      innerHTML: `
        <div class="speaking-wave">🔊</div>
        <span>Speaking...</span>
      `
    });
    
    document.body.appendChild(this.speakingIndicator);
    
    // Add wave animation
    this.domUtils.injectCSS(`
      .speaking-wave {
        animation: speakingWave 0.5s ease-in-out infinite alternate;
      }
      @keyframes speakingWave {
        0% { transform: scale(1); }
        100% { transform: scale(1.1); }
      }
    `, 'speaking-wave-styles');
  }
  
  hideSpeakingIndicator() {
    if (this.speakingIndicator) {
      this.speakingIndicator.remove();
      this.speakingIndicator = null;
    }
  }
  
  resetVoicePermissions() {
    // Reset permission state - useful after page refresh or permission changes
    this.microphonePermissionDenied = false;
    this.voiceRetryCount = 0;
  }

  // ==================== WAKE WORD DETECTION METHODS ====================

  async startWakeWordListening() {
    // Enhanced check - must have voice mode enabled
    if (this.wakeWordListening || !this.wakeWordEnabled || !this.voiceModeEnabled || this.mcpConversationActive) {
      if (this.mcpConversationActive) {
      } else if (!this.voiceModeEnabled) {
      }

      return;
    }

    try {
      
      // Reset aborted flag
      this.wakeWordAborted = false;
      
      // Check microphone permission first
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission.granted) {
        return;
      }

      // Check if speech recognition is available
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        console.warn('👂 Speech recognition not supported for wake word detection');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.wakeWordRecognition = new SpeechRecognition();
      
      // Configure for continuous wake word detection
      this.wakeWordRecognition.continuous = true;
      this.wakeWordRecognition.interimResults = true;
      this.wakeWordRecognition.lang = 'en-US';
      this.wakeWordRecognition.maxAlternatives = 1;
      
      this.wakeWordRecognition.onstart = () => {
        this.wakeWordListening = true;
        this.updateWakeWordIndicator(true);
      };
      
      this.wakeWordRecognition.onresult = async (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          
          // Check if any wake word was spoken
          const wakeWordDetected = this.wakeWords.some(word => 
            transcript.includes(word.toLowerCase())
          );
          
          if (wakeWordDetected) {
            await this.handleWakeWordDetected(transcript);
            break;
          }
        }
      };
      
      this.wakeWordRecognition.onerror = (event) => {
        console.warn('👂 Wake word detection error:', event.error);
        
        if (event.error === 'aborted') {
          this.wakeWordAborted = true;
          return;
        }
        
        if (event.error === 'not-allowed') {
          this.wakeWordEnabled = false;
          this.updateWakeWordIndicator(false);
          return;
        }
        
        // Only restart wake word detection for recoverable errors
        if (this.wakeWordEnabled && !this.mcpConversationActive) {
          setTimeout(() => {
            if (this.wakeWordEnabled && !this.wakeWordListening && !this.mcpConversationActive && !this.wakeWordAborted) {
              this.startWakeWordListening();
            }
          }, 1500);
        }
      };
      
      this.wakeWordRecognition.onend = () => {
        this.wakeWordListening = false;
        this.updateWakeWordIndicator(false);
        
        // Only restart wake word detection if enabled, not aborted, and no MCP conversation active
        if (this.wakeWordEnabled && !this.mcpConversationActive && !this.wakeWordAborted) {
          setTimeout(() => {
            if (this.wakeWordEnabled && !this.wakeWordListening && !this.mcpConversationActive && !this.wakeWordAborted) {
              this.startWakeWordListening();
            }
          }, 500);
        }
      };
      
      // Start wake word detection
      this.wakeWordRecognition.start();
      
    } catch (error) {
      console.error('👂 Failed to start wake word detection:', error);
      this.wakeWordListening = false;
      this.updateWakeWordIndicator(false);
    }
  }

  async handleWakeWordDetected(transcript) {
    try {
      
      // Stop wake word detection completely to prevent conflicts
      this.stopWakeWordListening();
      
      // WAIT for wake word to fully stop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Visual feedback
      this.showWakeWordActivated();
      
      // Start MCP voice conversation
      const mcpVoiceAgent = window.ChromeAIStudio?.mcpVoiceAgent;
      if (mcpVoiceAgent) {
        
        // Mark that MCP is taking over speech recognition
        this.mcpConversationActive = true;
        
        const success = await mcpVoiceAgent.startConversation();
        
        // If MCP started successfully, begin continuous voice listening
        if (success) {
          this.startContinuousVoiceListening();
        } else {
          // If MCP failed to start, show helpful message and restart wake word
          this.showTemporaryMessage(
            'Voice assistant activated! Speech may be limited until you click to enable it.',
            '🎤'
          );
          this.mcpConversationActive = false;
          // Don't restart wake word immediately to avoid conflicts
          setTimeout(() => {
            if (this.wakeWordEnabled && !this.mcpConversationActive) {
              this.startWakeWordListening();
            }
          }, 2000);
        }
      } else {
        // Fallback to regular voice assistant
        await this.handleVoiceAssistant();
        this.mcpConversationActive = false;
      }
      
    } catch (error) {
      console.error('🎯 Wake word handling failed:', error);
      this.mcpConversationActive = false;
      
      // Show helpful error message
      this.showTemporaryMessage(
        'Voice assistant had an issue starting. Try clicking the microphone button instead.',
        '⚠️'
      );
      
      // Restart wake word detection after longer delay
      setTimeout(() => {
        if (this.wakeWordEnabled && !this.mcpConversationActive) {
          this.startWakeWordListening();
        }
      }, 2000);
    }
  }

  stopWakeWordListening() {
    if (this.wakeWordRecognition) {
      try {
        this.wakeWordRecognition.abort();
      } catch (error) {
        console.warn('👂 Error stopping wake word recognition:', error);
      }
      this.wakeWordRecognition = null;
    }
    this.wakeWordListening = false;
    
    // Only update indicator if we're not in cleanup mode
    if (this.domUtils && document) {
      this.updateWakeWordIndicator(false);
    }
  }

  toggleWakeWordDetection() {
    this.wakeWordEnabled = !this.wakeWordEnabled;
    
    if (this.wakeWordEnabled) {
      this.startWakeWordListening();
    } else {
      this.stopWakeWordListening();
    }
    
    // Save preference
    try {
      localStorage.setItem('chromeai-wake-word-enabled', this.wakeWordEnabled.toString());
    } catch (error) {
      console.warn('Failed to save wake word preference:', error);
    }
    
    return this.wakeWordEnabled;
  }

  updateWakeWordIndicator(isListening) {
    if (!this.wakeWordIndicator) {
      this.createWakeWordIndicator();
    }
    
    // Safety check - don't update if indicator doesn't exist (e.g., during cleanup)
    if (!this.wakeWordIndicator) return;
    
    if (isListening) {
      this.wakeWordIndicator.style.opacity = '1';
      this.wakeWordIndicator.style.animation = 'pulse 2s infinite';
      this.wakeWordIndicator.title = `Wake word detection active. Say: "${this.wakeWords.join('", "')}"`;
    } else {
      this.wakeWordIndicator.style.opacity = '0.5';
      this.wakeWordIndicator.style.animation = 'none';
      this.wakeWordIndicator.title = `Wake word detection inactive. Click to enable. Words: "${this.wakeWords.join('", "')}"`;
    }
  }

  customizeWakeWords(newWakeWords) {
    if (Array.isArray(newWakeWords) && newWakeWords.length > 0) {
      this.wakeWords = newWakeWords.map(word => word.toLowerCase().trim());
      
      // Save to localStorage
      try {
        localStorage.setItem('chromeai-wake-words', JSON.stringify(this.wakeWords));
        
        // Update indicator tooltip
        this.updateWakeWordIndicator(this.wakeWordListening);
        
        // Restart wake word detection with new words
        if (this.wakeWordListening) {
          this.stopWakeWordListening();
          setTimeout(() => {
            this.startWakeWordListening();
          }, 500);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to save custom wake words:', error);
        return false;
      }
    }
    return false;
  }

  loadCustomWakeWords() {
    try {
      const saved = localStorage.getItem('chromeai-wake-words');
      if (saved) {
        const customWords = JSON.parse(saved);
        if (Array.isArray(customWords) && customWords.length > 0) {
          this.wakeWords = customWords;
        }
      }
    } catch (error) {
      console.warn('Failed to load custom wake words:', error);
    }
  }

  createWakeWordIndicator() {
    // Wake word indicator removed - functionality preserved without visual indicator
    // Users can still toggle wake word detection through the voice mode menu
    return;
  }

  showWakeWordActivated() {
    // Visual feedback when wake word is detected - MODERN BLACK THEME
    const feedback = this.domUtils.createElement('div', {
      className: 'ai-wake-word-feedback',
      styles: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        // CHANGED: Black glassmorphism background instead of blue
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        // ADDED: Gradient border for rich effect
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5)) 1',
        color: 'white',
        padding: '32px 48px',
        borderRadius: '20px',
        fontSize: '16px',
        fontWeight: '500',
        zIndex: this.domUtils.getHighZIndex() + 1,
        opacity: '0',
        animation: 'wakeWordFadeIn 2s cubic-bezier(0.4, 0, 0.2, 1)',
        textAlign: 'center',
        // ENHANCED: Better shadow with glow effect
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        // ADDED: Additional styling
        maxWidth: '450px',
        minWidth: '300px'
      },
      // ENHANCED: Better HTML structure with icon and styled text
      innerHTML: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            animation: wakeWordPulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
          ">
            🎯
          </div>
          <div style="
            font-size: 20px;
            font-weight: 600;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.8));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 4px;
          ">
            Wake Word Detected!
          </div>
          <div style="
            font-size: 14px;
            font-weight: 400;
            opacity: 0.7;
            line-height: 1.5;
          ">
            Starting voice conversation...
          </div>
          <div style="
            font-size: 12px;
            opacity: 0.5;
            margin-top: 8px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          ">
            Say "goodbye" or "stop" to end
          </div>
        </div>
      `
    });
    
    // ENHANCED: Better animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes wakeWordFadeIn {
        0% { 
          opacity: 0; 
          transform: translate(-50%, -50%) scale(0.8) translateY(20px); 
          filter: blur(10px);
        }
        20% { 
          opacity: 1; 
          transform: translate(-50%, -50%) scale(1) translateY(0); 
          filter: blur(0);
        }
        80% { 
          opacity: 1; 
          transform: translate(-50%, -50%) scale(1) translateY(0); 
          filter: blur(0);
        }
        100% { 
          opacity: 0; 
          transform: translate(-50%, -50%) scale(0.9) translateY(-20px); 
          filter: blur(10px);
        }
      }
      
      @keyframes wakeWordPulse {
        0%, 100% { 
          transform: scale(1); 
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
        }
        50% { 
          transform: scale(1.1); 
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
        }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.2); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove();
      }
    }, 2000);
  }

  showTemporaryMessage(message, icon = '💬', duration = 3000) {
    const msg = this.domUtils.createElement('div', {
      styles: {
        position: 'fixed',
        top: '60px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        zIndex: this.domUtils.getHighZIndex(),
        opacity: '0',
        transition: 'opacity 0.3s ease',
        maxWidth: '300px',
        cursor: 'pointer'
      },
      textContent: `${icon} ${message}`
    });
    
    // Click to dismiss
    msg.addEventListener('click', () => {
      msg.style.opacity = '0';
      setTimeout(() => {
        if (msg.parentNode) {
          msg.remove();
        }
      }, 300);
    });
    
    document.body.appendChild(msg);
    
    // Animate in
    setTimeout(() => msg.style.opacity = '1', 10);
    
    // Remove after delay (longer for warning/error messages)
    const displayDuration = icon === '⚠️' || icon === '❌' ? duration * 2 : duration;
    setTimeout(() => {
      if (msg.parentNode) {
        msg.style.opacity = '0';
        setTimeout(() => {
          if (msg.parentNode) {
            msg.remove();
          }
        }, 300);
      }
    }, displayDuration);
  }

  async initializeWakeWordDetection() {
    try {
      // Load custom wake words first
      this.loadCustomWakeWords();
      
      // Load user preference
      const savedPreference = localStorage.getItem('chromeai-wake-word-enabled');
      if (savedPreference !== null) {
        this.wakeWordEnabled = savedPreference === 'true';
      }
      
      // Create indicator
      this.createWakeWordIndicator();
      
      // Wake word detection only starts if voice mode is enabled by user
      
    } catch (error) {
      console.error('👂 Failed to initialize wake word detection:', error);
    }
  }

  // Internal method - wake word is now controlled automatically by voice mode
  // This method is kept for backward compatibility if needed
  handleWakeWordToggle() {
    this.showTemporaryMessage('Wake word detection is automatically managed by voice mode', 'ℹ️');
  }

  // Method to expose configuration to users (can be called from console)
  // Voice mode state management
  loadVoiceModeState() {
    const saved = localStorage.getItem('chromeai-voice-mode-enabled');
    if (saved !== null) {
      this.voiceModeEnabled = saved === 'true';
      this.wakeWordEnabled = this.voiceModeEnabled; // Wake words follow voice mode
    }
  }

  saveVoiceModeState() {
    localStorage.setItem('chromeai-voice-mode-enabled', this.voiceModeEnabled.toString());
    
    // Broadcast to other tabs with origin validation
    const currentOrigin = window.location.origin;
    window.postMessage({
      type: 'chromeai-voice-mode-change', 
      enabled: this.voiceModeEnabled
    }, currentOrigin);
  }

  async toggleVoiceMode() {
    
    if (!this.voiceModeEnabled) {
      // Enabling voice mode - request permissions first
      const granted = await this.requestVoiceModePermissions();
      if (!granted) {
        this.showTemporaryMessage('Microphone permission is required for voice mode', '❌');
        return false;
      }
      
      this.voiceModeEnabled = true;
      this.wakeWordEnabled = true;
      
      // Initialize voice components
      await this.initializeVoiceMode();
      
      this.showTemporaryMessage('Voice mode enabled! Say "Hey Assistant" to activate', '🎤');
    } else {
      // Disabling voice mode
      this.voiceModeEnabled = false;
      this.wakeWordEnabled = false;
      
      // Cleanup voice components
      this.cleanupVoiceMode();
      
      this.showTemporaryMessage('Voice mode disabled', '🔇');
    }
    
    this.saveVoiceModeState();
    this.updateVoiceModeVisuals();
    return true;
  }

  async requestVoiceModePermissions() {
    try {
      // Request microphone permission manually when user enables voice mode
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      // Test speech synthesis
      const utterance = new SpeechSynthesisUtterance('Voice mode enabled');
      utterance.volume = 0.1;
      speechSynthesis.speak(utterance);
      
      return true;
    } catch (error) {
      console.error('🎤 Voice mode permission denied:', error);
      return false;
    }
  }

  async initializeVoiceMode() {
    
    if (this.voiceModeInitialized) return;
    
    try {
      // Initialize wake word detection
      if (!this.wakeWordListening) {
        await this.startWakeWordListening();
      }
      
      // Pre-initialize MCP voice agent
      if (window.ChromeAIStudio?.mcpVoiceAgent && !window.ChromeAIStudio.mcpVoiceAgent.isInitialized) {
        await window.ChromeAIStudio.mcpVoiceAgent.initialize();
      }
      
      // Set up voice interaction requirement handler
      this.setupVoiceInteractionHandler();
      
      this.voiceModeInitialized = true;
    } catch (error) {
      console.error('❌ Voice mode initialization failed:', error);
    }
  }

  cleanupVoiceMode() {
    
    // Stop wake word detection
    this.stopWakeWordListening();
    
    // End any active MCP conversation
    if (window.ChromeAIStudio?.mcpVoiceInterface?.conversationActive) {
      window.ChromeAIStudio.mcpVoiceInterface.endConversation();
    }
    
    this.voiceModeInitialized = false;
    this.mcpConversationActive = false;
  }

  setupCrossTabSync() {
    // Store tab ID for leader election
    this.tabId = `tab-${Date.now()}-${Math.random()}`;
    this.isLeaderTab = false;
    
    // Listen for voice mode changes from other tabs
    window.addEventListener('message', (event) => {
      // Validate origin for security
      if (event.origin !== window.location.origin) {
        return; // Ignore messages from other origins
      }
      
      if (event.data?.type === 'chromeai-voice-mode-change') {
        const newState = event.data.enabled;
        if (newState !== this.voiceModeEnabled) {
          this.voiceModeEnabled = newState;
          this.wakeWordEnabled = newState;
          
          if (newState) {
            this.initializeVoiceMode();
          } else {
            this.cleanupVoiceMode();
          }
          
          this.updateVoiceModeVisuals();
        }
      }
      
      // NEW: Handle conversation start/end from other tabs
      if (event.data?.type === 'chromeai-conversation-active') {
        const { active, tabId } = event.data;
        if (tabId !== this.tabId && active && this.mcpConversationActive) {
          // Another tab started conversation, end ours
          this.endMCPConversation();
        }
      }
      
      // NEW: Leader election for focused tab
      if (event.data?.type === 'chromeai-tab-focus') {
        const { tabId } = event.data;
        this.isLeaderTab = (tabId === this.tabId);
      }
    });
    
    // Announce when conversation starts
    const originalStartConversation = window.ChromeAIStudio?.mcpVoiceAgent?.startConversation;
    if (originalStartConversation) {
      window.ChromeAIStudio.mcpVoiceAgent.startConversation = async () => {
        const result = await originalStartConversation.call(window.ChromeAIStudio.mcpVoiceAgent);
        if (result) {
          window.postMessage({
            type: 'chromeai-conversation-active',
            active: true,
            tabId: this.tabId
          }, window.location.origin);
        }
        return result;
      };
    }
    
    // Announce tab focus
    window.addEventListener('focus', () => {
      window.postMessage({
        type: 'chromeai-tab-focus',
        tabId: this.tabId
      }, window.location.origin);
    });
    
    // Also listen for localStorage changes (alternative sync method)
    window.addEventListener('storage', (event) => {
      if (event.key === 'chromeai-voice-mode-enabled') {
        // Validate the value
        if (event.newValue !== 'true' && event.newValue !== 'false' && event.newValue !== null) {
          console.warn('⚠️ Invalid voice mode state in localStorage:', event.newValue);
          return;
        }
        
        const newState = event.newValue === 'true';
        if (newState !== this.voiceModeEnabled) {
          this.voiceModeEnabled = newState;
          this.wakeWordEnabled = newState;
          
          if (newState) {
            this.initializeVoiceMode();
          } else {
            this.cleanupVoiceMode();
          }
          
          this.updateVoiceModeVisuals();
        }
      }
    });
  }

  updateVoiceModeVisuals() {
    // Update voice mode button in menu
    this.updateVoiceModeMenuItem();
  }

  setupTabVisibilityHandlers() {
    // Handle tab visibility changes for voice assistant
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onTabHidden();
      } else {
        this.onTabVisible();
      }
    });

    // Handle window focus/blur for better UX
    window.addEventListener('blur', () => {
      this.onWindowBlur();
    });

    window.addEventListener('focus', () => {
      this.onWindowFocus();
    });
  }

  onTabHidden() {
    
    // Pause wake word detection when tab is hidden
    if (this.wakeWordListening) {
      this.stopWakeWordListening();
      this.tabHiddenWhileListening = true; // Track for resume
    }
    
    // Pause continuous voice listening
    if (this.currentRecognition) {
      this.currentRecognition.stop();
      this.tabHiddenWhileContinuous = true; // Track for resume
    }
  }

  async onTabVisible() {
    
    // Re-validate permissions FIRST
    await this.validatePermissionsOnTabFocus();
    
    // Only resume if we have permission
    if (this.microphonePermissionDenied) {
      this.tabHiddenWhileListening = false;
      this.tabHiddenWhileContinuous = false;
      return;
    }
    
    // Resume wake word detection if it was active
    if (this.tabHiddenWhileListening && this.wakeWordEnabled && !this.mcpConversationActive) {
      setTimeout(() => {
        this.startWakeWordListening();
        this.tabHiddenWhileListening = false;
      }, 500);
    }
    
    // Resume continuous voice listening if it was active
    if (this.tabHiddenWhileContinuous && this.mcpConversationActive) {
      setTimeout(() => {
        this.startContinuousVoiceListening();
        this.tabHiddenWhileContinuous = false;
      }, 500);
    }
  }

  onWindowBlur() {
    // Handle window blur - similar to tab hidden but for window focus
    if (this.wakeWordListening && !document.hidden) {
      this.stopWakeWordListening();
      this.windowBlurredWhileListening = true;
    }
  }

  onWindowFocus() {
    // Handle window focus - resume if needed
    if (this.windowBlurredWhileListening && this.wakeWordEnabled && !this.mcpConversationActive) {
      setTimeout(() => {
        this.startWakeWordListening();
        this.windowBlurredWhileListening = false;
      }, 300);
    }
  }

  async validatePermissionsOnTabFocus() {
    // Cache permission checks (only check every 30 seconds)
    const now = Date.now();
    if (this.lastPermissionCheck && (now - this.lastPermissionCheck) < 30000) {
      return;
    }
    
    try {
      if (this.voiceModeEnabled && !this.mcpConversationActive) {
        
        // Quick permission check without creating stream during active conversation
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissionStatus.state === 'granted') {
          this.microphonePermissionDenied = false;
          this.lastPermissionCheck = now;
        } else {
          console.warn('⚠️ Microphone permission denied');
          this.microphonePermissionDenied = true;
          this.voiceModeEnabled = false;
          this.saveVoiceModeState();
        }
      }
    } catch (error) {
      console.warn('⚠️ Permission check failed:', error);
      this.lastPermissionCheck = now; // Still cache to avoid spam
      
      // Show permission guide if voice mode is enabled
      if (this.voiceModeEnabled) {
        this.showMicrophonePermissionGuide();
      }
    }
  }

  updateVoiceModeMenuItem() {
    // Find the voice-mode menu circle
    const voiceModeCircle = document.querySelector('[data-option="voice-mode"]');
    if (!voiceModeCircle) return;

    const icon = voiceModeCircle.querySelector('.ai-menu-icon');
    const tooltip = voiceModeCircle.querySelector('.ai-menu-tooltip');
    
    // Update tooltip only (no background for voice mode)
    if (tooltip) {
      tooltip.textContent = this.voiceModeEnabled ? 'Voice ON' : 'Voice OFF';
    }

    // Update Lottie animation or fallback to emoji
    if (voiceModeCircle.voiceAnimation) {
      // Control Lottie animation
      try {
        if (this.voiceModeEnabled) {
          voiceModeCircle.voiceAnimation.play();
          if (voiceModeCircle.voiceAnimation.setSpeed) {
            voiceModeCircle.voiceAnimation.setSpeed(1);
          }
        } else {
          voiceModeCircle.voiceAnimation.pause();
          if (voiceModeCircle.voiceAnimation.setSpeed) {
            voiceModeCircle.voiceAnimation.setSpeed(0);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to control voice Lottie animation:', error);
        // Fallback to emoji
        if (icon) icon.textContent = this.voiceModeEnabled ? '🎤' : '🔇';
      }
    } else if (icon) {
      // Fallback to emoji if no Lottie animation
      icon.textContent = this.voiceModeEnabled ? '🎤' : '🔇';
    }
    
    // Update bubble tooltip based on voice mode status (background stays transparent)
    if (this.bubble) {
      // Remove title attribute to disable alt text
      this.bubble.removeAttribute('title');
    }
  }

  // Callback for when MCP conversation ends - restart wake word detection
  onMCPConversationEnded() {
    this.mcpConversationActive = false;
    
    // Restart wake word detection if voice mode is enabled
    if (this.voiceModeEnabled && this.wakeWordEnabled && !this.wakeWordListening) {
      setTimeout(() => {
        if (!this.wakeWordListening && !this.mcpConversationActive && this.voiceModeEnabled) {
          this.startWakeWordListening();
        }
      }, 2000); // Brief delay to ensure MCP is fully cleaned up
    }
  }

  configureWakeWords(newWords) {
    if (typeof newWords === 'string') {
      newWords = [newWords];
    }
    
    const success = this.customizeWakeWords(newWords);
    if (success) {
      this.showTemporaryMessage(
        `Wake words updated to: "${newWords.join('", "')}"`,
        '👂'
      );
    } else {
      this.showTemporaryMessage(
        'Failed to update wake words. Please provide valid words.',
        '❌'
      );
    }
    return success;
  }

  updateWakeWordMenuOption() {
    if (!this.circularMenu) return;
    
    const wakeWordCircle = this.circularMenu.querySelector('[data-option="wake-word"]');
    if (wakeWordCircle) {
      const icon = wakeWordCircle.querySelector('.ai-menu-icon');
      const tooltip = wakeWordCircle.querySelector('.ai-menu-tooltip');
      const newColor = this.wakeWordEnabled ? '#4285f4' : '#9e9e9e';
      
      // Update icon
      if (icon) {
        icon.textContent = this.wakeWordEnabled ? '👂' : '🔇';
      }
      
      // Update tooltip
      if (tooltip) {
        tooltip.textContent = this.wakeWordEnabled ? 'Wake Word ON' : 'Wake Word OFF';
      }
      
      // Update background color
      wakeWordCircle.style.background = `linear-gradient(135deg, ${newColor}, ${this.adjustColor(newColor, -20)})`;
    }
  }

  // ==================== END WAKE WORD METHODS ====================

  // Legacy method compatibility - redirects to circular menu
  async toggleMenu() {
    if (this.isExpanded) {
      this.hideCircularMenu();
    } else {
      await this.showCircularMenu();
    }
  }

  // Legacy method compatibility - redirects to circular menu
  async showMenu() {
    await this.showCircularMenu();
  }

  // Legacy method compatibility - redirects to circular menu
  hideMenu() {
    this.hideCircularMenu();
  }

  handleDocumentClick(e) {
    if (this.isExpanded && 
        !this.bubble.contains(e.target) && 
        (!this.circularMenu || !this.circularMenu.contains(e.target))) {
      this.hideCircularMenu();
    }
  }

  handleKeyDown(e) {
    // Escape key closes menu
    if (e.key === 'Escape' && this.isExpanded) {
      this.hideMenu();
    }

    // Ctrl/Cmd + Alt + A opens menu
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'a') {
      e.preventDefault();
      this.toggleMenu();
    }
  }

  handleMouseDown(e) {
    if (this.lockBubble) return; // Dragging disabled
    if (e.button !== 0) return; // Only left mouse button

    this.isDragging = true;
    this.dragOffset = {
      x: e.clientX - this.bubble.getBoundingClientRect().left,
      y: e.clientY - this.bubble.getBoundingClientRect().top
    };

    this.bubble.classList.add('dragging');
    e.preventDefault();
  }

  handleMouseMove(e) {
    if (this.lockBubble) return; // Guard: bubble locked
    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Keep bubble in viewport
    const bubbleSize = 56;
    const maxX = window.innerWidth - bubbleSize;
    const maxY = window.innerHeight - bubbleSize;

    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    this.bubble.style.left = `${clampedX}px`;
    this.bubble.style.top = `${clampedY}px`;
    this.bubble.style.right = 'auto';
    this.bubble.style.bottom = 'auto';

    // Update position preference
    this.updatePositionPreference(clampedX, clampedY);
  }

  handleMouseUp() {
    if (this.lockBubble) return; // Guard: bubble locked
    if (!this.isDragging) return;

    this.isDragging = false;
    this.bubble.classList.remove('dragging');

    // Reposition menu if open
    if (this.isExpanded) {
      setTimeout(() => this.positionCircularMenu(), 100);
    }
  }

  handleTouchStart(e) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.handleMouseDown({
      button: 0,
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }

  handleTouchMove(e) {
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    });

    e.preventDefault();
  }

  handleTouchEnd() {
    this.handleMouseUp();
  }

  updatePositionPreference(x, y) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (x < centerX && y < centerY) {
      this.position = 'top-left';
    } else if (x >= centerX && y < centerY) {
      this.position = 'top-right';
    } else if (x < centerX && y >= centerY) {
      this.position = 'bottom-left';
    } else {
      this.position = 'bottom-right';
    }
  }

  async handleActionClick(actionId, contextInfo) {
    this.hideMenu();

    // Dispatch custom event for action handling
    const event = new CustomEvent('chromeai-action', {
      detail: {
        action: actionId,
        context: contextInfo,
        source: 'floating-bubble'
      }
    });

    window.dispatchEvent(event);
  }

  async handleModeToggle(modeId, buttonElement) {
    // Get current active mode
    const currentMode = localStorage.getItem('chromeai-active-mode') || '';
    
    // Toggle mode - if clicking same mode, deactivate it, otherwise activate new mode
    let newMode = '';
    if (currentMode !== modeId) {
      newMode = modeId;
    }
    
    // Update localStorage
    if (newMode) {
      localStorage.setItem('chromeai-active-mode', newMode);
    } else {
      localStorage.removeItem('chromeai-active-mode');
    }
    
    // Update UI - mode circles will be updated via handleModeSelect method
    // (Legacy actionMenu reference removed)
    
    // Add active class to selected button (if any)
    if (newMode) {
      buttonElement.classList.add('active');
    }
    
    // Show feedback
    const modeName = newMode ? modeId.charAt(0).toUpperCase() + modeId.slice(1) : 'None';
    
    // Check AI APIs status when mode is selected
    if (window.ChromeAIStudio?.aiManager) {
      const status = window.ChromeAIStudio.aiManager.getStatus();
      
      if (!status.initialized) {
        try {
          await window.ChromeAIStudio.aiManager.init();
        } catch (error) {
          console.error('❌ AI Manager initialization failed:', error);
        }
      }
    } else {
      console.warn('⚠️ AI Manager not available');
    }
    
    // Dispatch custom event for mode switching
    const event = new CustomEvent('chromeai-mode-toggle', {
      detail: {
        mode: newMode,
        previousMode: currentMode,
        source: 'floating-bubble'
      }
    });

    window.dispatchEvent(event);
    
    // Don't hide menu immediately - let user see the change
    setTimeout(() => {
      if (newMode) {
        this.hideMenu();
      }
    }, 500);
  }

  handleFooterAction(action) {
    this.hideMenu();

    // Dispatch custom event for footer actions
    const event = new CustomEvent('chromeai-footer-action', {
      detail: {
        action,
        source: 'floating-bubble'
      }
    });

    window.dispatchEvent(event);
  }

  show() {
    if (!this.bubble) return;

    this.isVisible = true;
    
    // Check if Siri animation is loaded
    const iconContainer = document.getElementById('main-bubble-icon');
    if (iconContainer) {
      if (iconContainer.children.length > 0) {
      }
    }
    
    // Enhanced entrance animation with bounce effect
    requestAnimationFrame(() => {
      this.bubble.style.opacity = '1';
      this.bubble.style.transform = 'scale(1)';
      
      // Add a subtle bounce animation
      this.bubble.style.animation = 'ai-bubble-entrance 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      
      // Add entrance animation to CSS if not already added
      if (!document.querySelector('#ai-bubble-entrance-animation')) {
        this.domUtils.injectCSS(`
          @keyframes ai-bubble-entrance {
            0% {
              opacity: 0;
              transform: scale(0) rotate(180deg);
            }
            50% {
              transform: scale(1.1) rotate(0deg);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }
        `, 'ai-bubble-entrance-animation');
      }
      
      // Remove animation class after completion and start wake word detection
      setTimeout(() => {
        if (this.bubble) {
          this.bubble.style.animation = '';
          
          // Start wake word detection only if voice mode is enabled by user
          if (this.voiceModeEnabled && this.wakeWordEnabled && !this.wakeWordListening) {
            this.startWakeWordListening();
          }
          
          // Update visual indicators
          this.updateVoiceModeVisuals();
        }
      }, 600);
    });
  }

  hide() {
    if (!this.bubble) return;

    this.isVisible = false;
    
    // Hide menu first
    this.hideMenu();
    
    // Animate bubble out
    this.bubble.style.opacity = '0';
    this.bubble.style.transform = 'scale(0)';
  }

  destroy() {
    
    // Stop wake word detection first
    this.stopWakeWordListening();
    this.wakeWordEnabled = false;
    
    // Clean up wake word indicator
    if (this.wakeWordIndicator && this.wakeWordIndicator.parentNode) {
      this.wakeWordIndicator.parentNode.removeChild(this.wakeWordIndicator);
    }
    this.wakeWordIndicator = null;
    
    // Hide menu and bubble
    this.hideMenu();
    
    if (this.bubble && this.bubble.parentNode) {
      this.domUtils.animateOut(this.bubble).onfinish = () => {
        this.domUtils.removeElement(this.bubble);
      };
    }

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Reset state
    this.initialized = false;
    this.isVisible = false;
    this.wakeWordListening = false;
    this.mcpConversationActive = false;
  }

  /**
   * Load SVG icon from icons folder
   */
  async loadSVGIcon(iconName) {
    try {
      const response = await fetch(chrome.runtime.getURL(`icons/${iconName}.svg`));
      if (!response.ok) {
        throw new Error(`Failed to load icon: ${iconName}`);
      }
      const svgText = await response.text();
      return svgText;
    } catch (error) {
      console.warn(`⚠️ Failed to load SVG icon ${iconName}:`, error);
      return null;
    }
  }

  /**
   * Load and display SVG icon in menu circle
   */
  async loadAndDisplaySVGIcon(circle, option) {
    try {
      const svgContent = await this.loadSVGIcon(option.icon);
      if (svgContent) {
        const iconElement = circle.querySelector('.ai-menu-icon');
        if (iconElement) {
          // Create a container for the SVG
          const svgContainer = document.createElement('div');
          svgContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          
          // Parse and modify the SVG
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
          const svgElement = svgDoc.querySelector('svg');
          
          if (svgElement) {
            // Set SVG size to 30px for glass circles
            const iconSize = 30;
            svgElement.setAttribute('width', iconSize);
            svgElement.setAttribute('height', iconSize);
            svgElement.setAttribute('viewBox', svgElement.getAttribute('viewBox') || '0 0 48 48');
            
            // Style the SVG with dark color for contrast against glass
            svgElement.style.cssText = `
              width: ${iconSize}px;
              height: ${iconSize}px;
              fill: #000000;
              color: #000000;
            `;
            
            svgContainer.appendChild(svgElement);
            iconElement.innerHTML = '';
            iconElement.appendChild(svgContainer);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to load and display SVG icon ${option.icon}:`, error);
    }
  }

  // Initialize Siri WebM animation for main bubble
  async initializeSiriAnimation() {
    if (typeof window.LottieLoader === 'undefined') {
      console.warn('⚠️ WebM Loader not available, skipping Siri animation initialization');
      return;
    }

    try {
      const iconContainer = document.getElementById('main-bubble-icon');
      if (!iconContainer) {
        console.warn('⚠️ Main bubble icon container not found');
        return;
      }
      
      // Create and load Siri WebM animation with proper size for 56px bubble
      const siriAnimation = await window.LottieLoader.createSiriAnimation({ width: '56' });
      
      // Replace the content with the animation
      iconContainer.innerHTML = '';
      iconContainer.appendChild(siriAnimation);
      
      // Ensure the animation is visible
      if (siriAnimation.style) {
        siriAnimation.style.display = 'block';
        siriAnimation.style.width = '100%';
        siriAnimation.style.height = '100%';
        siriAnimation.style.opacity = '1';
      }
      
      // Bubble background is already transparent
    } catch (error) {
      console.error('❌ Failed to initialize Siri animation:', error);
    }
  }

  // Initialize Voice WebM animation for voice mode menu item
  async initializeVoiceWebMAnimation(circle, option) {
    if (typeof window.LottieLoader === 'undefined') {
      console.warn('⚠️ WebM Loader not available, using fallback emoji for voice mode');
      const iconElement = circle.querySelector('.ai-menu-icon');
      if (iconElement) {
        iconElement.textContent = this.voiceModeEnabled ? '🎤' : '🔇';
      }
      return;
    }

    try {
      const iconElement = circle.querySelector('.ai-menu-icon');
      if (!iconElement) {
        console.warn('⚠️ Voice mode icon element not found');
        return;
      }

  // Create and load Voice WebM animation with bigger size for better visibility
  const animationSize = option.iconSize || Math.max(option.size * 1.3, 48);
  const voiceAnimation = await window.LottieLoader.createVoiceAnimation({ width: String(animationSize) });
      
      // Set the animation state based on voice mode
      if (voiceAnimation.setSpeed) {
        voiceAnimation.setSpeed(this.voiceModeEnabled ? 1 : 0);
      }
      
      // Replace the content with the animation
      iconElement.innerHTML = '';
      iconElement.appendChild(voiceAnimation);

      // Ensure parent has no padding and uses border-box so child can fill exactly
      iconElement.style.padding = '0';
      iconElement.style.boxSizing = 'border-box';
  // Ensure parent is positioned to allow absolute-fill child
  iconElement.style.position = iconElement.style.position || 'relative';
  // Explicitly ensure the parent has the intended pixel size (defensive)
  const targetSize = option.iconSize || option.size;
  iconElement.style.width = `${targetSize}px`;
  iconElement.style.height = `${targetSize}px`;
  iconElement.style.lineHeight = '0';

      // Normalize the appended animation to fill the parent (video or container)
      try {
        // Measure parent size and apply explicit pixel dimensions to avoid percent-based rounding issues
        const parentW = iconElement.clientWidth || iconElement.offsetWidth || parseInt(getComputedStyle(iconElement).width) || targetSize;
        const parentH = iconElement.clientHeight || iconElement.offsetHeight || parseInt(getComputedStyle(iconElement).height) || targetSize;

        // Clear any max constraints
        if (voiceAnimation && voiceAnimation.style) {
          voiceAnimation.style.maxWidth = 'none';
          voiceAnimation.style.maxHeight = 'none';
        }

        // If the returned element is a video, style it directly with explicit pixels
        if (voiceAnimation && voiceAnimation.tagName === 'VIDEO') {
          voiceAnimation.style.position = 'absolute';
          voiceAnimation.style.left = '0';
          voiceAnimation.style.top = '0';
          // Use explicit pixels to avoid percent/rounding mismatch
          voiceAnimation.style.width = parentW + 'px';
          voiceAnimation.style.height = parentH + 'px';
          voiceAnimation.style.objectFit = 'cover';
          voiceAnimation.style.display = 'block';

          // Re-apply sizing once video data is loaded (handles race conditions)
          voiceAnimation.addEventListener('loadeddata', function _onLoad() {
            try {
              this.style.width = parentW + 'px';
              this.style.height = parentH + 'px';
            } catch (e) {}
            this.removeEventListener('loadeddata', _onLoad);
          });

        } else if (voiceAnimation && typeof voiceAnimation.querySelector === 'function') {
          // If it's a container, try to find a video inside and style it to absolute-fill
          const innerVideo = voiceAnimation.querySelector('video');
          if (innerVideo) {
            innerVideo.style.position = 'absolute';
            innerVideo.style.left = '0';
            innerVideo.style.top = '0';
            // Explicit pixels
            innerVideo.style.width = parentW + 'px';
            innerVideo.style.height = parentH + 'px';
            innerVideo.style.objectFit = 'cover';
            innerVideo.style.display = 'block';

            // Re-apply sizing once inner video data is loaded
            innerVideo.addEventListener('loadeddata', function _onInnerLoad() {
              try {
                this.style.width = parentW + 'px';
                this.style.height = parentH + 'px';
              } catch (e) {}
              this.removeEventListener('loadeddata', _onInnerLoad);
            });
          }

          // Force the container to match parent size and be positioned
          voiceAnimation.style.position = 'absolute';
          voiceAnimation.style.left = '0';
          voiceAnimation.style.top = '0';
          voiceAnimation.style.width = parentW + 'px';
          voiceAnimation.style.height = parentH + 'px';
          voiceAnimation.style.display = 'flex';
          voiceAnimation.style.alignItems = 'center';
          voiceAnimation.style.justifyContent = 'center';
        }
      } catch (e) {
      }

      // Store reference for state updates
      circle.voiceAnimation = voiceAnimation;
    } catch (error) {
      console.error('❌ Failed to initialize Voice animation:', error);
      // Fallback to emoji
      const iconElement = circle.querySelector('.ai-menu-icon');
      if (iconElement) {
        iconElement.textContent = this.voiceModeEnabled ? '🎤' : '🔇';
      }
    }
  }

  /**
   * Set up voice interaction requirement handler
   */
  setupVoiceInteractionHandler() {
    const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
    if (!mcpVoiceInterface) return;
    
    // Listen for voice interaction requirement events
    mcpVoiceInterface.addEventListener('voice-interaction-required', (event) => {
      this.showVoiceInteractionPopup(event.detail);
    });
    
    // Note: voice-skipped event handling moved to showVoiceInteractionPopup
  }

  /**
   * Voice state machine with transition validation - 3-state model
   */
  isValidStateTransition(fromState, toState) {
    const VALID_TRANSITIONS = {
      'idle': ['listening'],
      'listening': ['processing'],
      'processing': ['speaking'],
      'speaking': ['listening']
    };
    
    return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
  }

  /**
   * Set voice state with validation - simplified 3-state model
   */
  setVoiceState(newState) {
    const oldState = this.voiceState;
    
    // Validate state transition for 3-state model
    if (!this.isValidStateTransition(oldState, newState)) {
      console.warn(`⚠️ Invalid state transition: ${oldState} -> ${newState}`);
      return false;
    }
    
    this.voiceState = newState;
    
    return true;
  }

  /**
   * Unified voice UI method - compact and modern design
   */
  showVoiceUI(state, message) {
    // Remove existing voice UI
    this.hideVoiceListening();
    
    // State-based configuration
    const stateConfig = {
      listening: { icon: '🎤', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
      processing: { icon: '🧠', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
      speaking: { icon: '🔊', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
      error: { icon: '⚠️', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
    };
    
    const config = stateConfig[state] || stateConfig.listening;
    
    // Create compact voice UI
    this.voiceListeningIndicator = this.domUtils.createElement('div', {
      className: 'ai-voice-ui',
      styles: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        minWidth: '180px',
        maxWidth: '250px',
        padding: '8px 12px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${config.color}40`,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: this.domUtils.getHighZIndex() + 10,
        fontSize: '12px',
        fontWeight: '500',
        color: 'white',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      },
      innerHTML: `
        <div class="voice-icon" style="font-size: 16px; color: ${config.color};">${config.icon}</div>
        <div class="voice-message" style="flex: 1; font-size: 12px;">${message}</div>
        <button class="voice-cancel" style="
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        ">×</button>
      `
    });
    
    // Add cancel functionality
    const cancelBtn = this.voiceListeningIndicator.querySelector('.voice-cancel');
    cancelBtn.addEventListener('click', () => {
      if (this.currentRecognition) {
        this.currentRecognition.abort();
      }
      this.hideVoiceListening();
    });
    
    // Add hover effect for cancel button
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.color = 'white';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    });
    
    document.body.appendChild(this.voiceListeningIndicator);
    
    // Add pulse animation for listening state
    if (state === 'listening') {
      const icon = this.voiceListeningIndicator.querySelector('.voice-icon');
      icon.style.animation = 'voice-pulse 2s infinite';
      
      // Add CSS animation if not already added
      if (!document.querySelector('#voice-pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'voice-pulse-animation';
        style.textContent = `
          @keyframes voice-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Update voice status with new state and message
   */
  updateVoiceStatus(message, icon = '🎤') {
    // Add null check
    if (!this.voiceListeningIndicator) {
      console.warn('⚠️ Voice UI not initialized');
      return;
    }
    
    const messageEl = this.voiceListeningIndicator.querySelector('.voice-message');
    const iconEl = this.voiceListeningIndicator.querySelector('.voice-icon');
    
    if (messageEl) messageEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
  }

  /**
   * Start continuous voice listening for MCP conversation
   */
  startContinuousVoiceListening() {
    if (!this.mcpConversationActive) {
      console.warn('🎤 Cannot start continuous listening - no MCP conversation active');
      return;
    }

    // Check if we're already listening
    if (this.currentRecognition || this.wakeWordListening) {
      return;
    }

    // Don't start if already listening AND recognition is active
    if (this.voiceState === 'listening' && this.currentRecognition) {
      return;
    }

    // If we're in listening state but no recognition, we need to start
    if (this.voiceState === 'listening' && !this.currentRecognition) {
    }
    
    // Only set state if not already listening
    if (this.voiceState !== 'listening') {
      this.setVoiceState('listening');
    }
    this.showVoiceUI('listening', 'Listening... Speak clearly');
    
    // Enhanced debouncing mechanism to prevent duplicate processing
    this.lastProcessedTranscript = '';
    this.lastProcessedTime = 0;
    this.processingDebounce = 500; // Reduced to 500ms for faster response
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.currentRecognition = new SpeechRecognition();
    
    this.currentRecognition.continuous = true;
    this.currentRecognition.interimResults = true; // Enable interim results for silence detection
    this.currentRecognition.lang = 'en-US';
    this.currentRecognition.maxAlternatives = 1;
    
    this.currentRecognition.onstart = () => {
      this.updateVoiceStatus('Listening... Speak clearly', '🎤');
    };
    
    this.currentRecognition.onresult = async (event) => {
      // Only process when in listening state
      if (this.voiceState !== 'listening') {
        return; // Ignore STT output during processing/speaking
      }
      
      // Process all results to accumulate transcript
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (transcript) {
          finalTranscript = transcript; // Use the latest transcript
        }
      }
      
      // Skip empty or very short transcripts
      if (!finalTranscript || finalTranscript.length < 2) {
        return;
      }
      
      // Reset silence timer on any speech
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
      }
      
      // Wait 1 second of silence before processing or ending conversation
      this.silenceTimer = setTimeout(async () => {
        if (finalTranscript && this.voiceState === 'listening') {
          
          // Enhanced debouncing - track last 3 transcripts
          if (this.lastTranscripts.length >= 3) {
            this.lastTranscripts.shift();
          }
          
          // Check if transcript is duplicate or substring of recent transcripts
          const isDuplicate = this.lastTranscripts.some(prev => 
            finalTranscript === prev || finalTranscript.includes(prev) || prev.includes(finalTranscript)
          );
          
          const now = Date.now();
          if (isDuplicate && (now - this.lastProcessedTime) < this.processingDebounce) {
            return;
          }
          
          this.lastTranscripts.push(finalTranscript);
          this.lastProcessedTime = now;
          
          // Clear silence timer before processing
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          
          this.setVoiceState('processing');
          this.updateVoiceStatus('Processing...', '🧠');
          
          try {
            // Process with MCP Voice Agent
            await this.processVoiceWithMCP(finalTranscript);
          } catch (error) {
            console.error('❌ Voice processing failed:', error);
            this.setVoiceState('listening'); // Return to listening on error
            this.updateVoiceStatus('Error occurred', '⚠️');
          }
        } else if (this.voiceState === 'listening' && !finalTranscript) {
          // 1 second of complete silence - end conversation
          this.showTemporaryMessage('Ending voice session due to inactivity', '⏱️', 2000);
          setTimeout(() => {
            this.endMCPConversation();
          }, 2000);
        }
        }, 1000);
    };
    
    this.currentRecognition.onerror = (event) => {
      console.error('🎤 Continuous voice recognition error:', event.error);
      
      // Only handle fatal errors - recognition should never stop
      const fatalErrors = ['not-allowed', 'service-not-allowed'];
      
      if (fatalErrors.includes(event.error)) {
        // Fatal error - disable voice mode
        console.error('❌ Fatal voice error:', event.error);
        this.updateVoiceStatus('Microphone permission denied', '⚠️');
        this.showTemporaryMessage('Voice mode disabled due to permission issue', '❌', 5000);
        setTimeout(() => this.endMCPConversation(), 1000);
        return;
      }
      
      // For all other errors, just log and continue
    };
    
    this.currentRecognition.onend = () => {
      this.currentRecognition = null;
      
      // Don't restart here - TTS completion handles restart
      // This only fires if recognition stops unexpectedly
    };
    
    // Start recognition - it runs continuously
    this.currentRecognition.start();
  }

  /**
   * Process voice input with MCP
   */
  async processVoiceWithMCP(transcript) {
    if (!this.mcpConversationActive) {
      console.warn('🎤 Cannot process voice - no MCP conversation active');
      return;
    }

    // Check completion cooldown to ignore stray STT results
    if (this.completionCooldown) {
      return;
    }

    const mcpVoiceAgent = window.ChromeAIStudio?.mcpVoiceAgent;
    if (!mcpVoiceAgent) {
      console.warn('🎤 MCP Voice Agent not available');
      return;
    }

    try {
      // Reset conversation timeout
      this.resetConversationTimeout();
      
      // Process with MCP Voice Agent
      const response = await mcpVoiceAgent.processVoiceInput(transcript);
      
      if (response && response.trim()) {
        
        // Set state to speaking
        this.setVoiceState('speaking');
        
        // Stop recognition cleanly before TTS (prevents echo)
        if (this.currentRecognition) {
          this.currentRecognition.stop(); // Clean stop
          this.currentRecognition = null;
        }
        
        // Clear any pending silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        
        this.updateVoiceStatus('Speaking...', '🔊');
        
        // Use the voice interface to speak
        const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
        if (mcpVoiceInterface) {
          try {
            await mcpVoiceInterface.speak(response);
          } catch (speakError) {
            console.error('❌ Speech synthesis failed:', speakError);
            // Return to listening on error
            this.setVoiceState('listening');
          }
        } else {
          console.warn('🎤 MCP Voice Interface not available');
          this.setVoiceState('listening');
        }
      } else {
        this.setVoiceState('listening');
      }
    } catch (error) {
      console.error('❌ MCP voice processing failed:', error);
      this.setVoiceState('listening'); // Return to listening on error
      this.updateVoiceStatus('Processing failed', '⚠️');
    }
  }

  /**
   * End MCP conversation and return to wake word mode
   */
  async endMCPConversation() {
    
    // Mark conversation as ending
    this.mcpConversationActive = false;
    
    // Set completion cooldown to ignore stray STT results
    this.completionCooldown = true;
    if (this.completionCooldownTimeout) {
      clearTimeout(this.completionCooldownTimeout);
    }
    this.completionCooldownTimeout = setTimeout(() => {
      this.completionCooldown = false;
    }, 3000); // 3 second cooldown
    
    // Clear conversation timeout
    if (this.conversationTimeoutId) {
      clearTimeout(this.conversationTimeoutId);
      this.conversationTimeoutId = null;
    }
    
    // Stop any TTS
    speechSynthesis.cancel();
    
    // End MCP agent conversation
    const mcpAgent = window.ChromeAIStudio?.mcpVoiceAgent;
    if (mcpAgent) {
      mcpAgent.endConversation();
    }
    
    // Reset state
    this.voiceState = 'idle';
    
    // Hide voice UI
    this.hideVoiceListening();
    
    // Restart wake word if voice mode still enabled
    if (this.voiceModeEnabled && this.wakeWordEnabled) {
      setTimeout(() => {
        if (!this.mcpConversationActive) {
          this.startWakeWordListening();
        }
      }, 500);
    }
  }

  /**
   * Reset conversation timeout (10 seconds)
   */
  resetConversationTimeout() {
    // Clear existing timeout
    if (this.conversationTimeoutId) {
      clearTimeout(this.conversationTimeoutId);
    }
    
    // Set 10 second timeout (per user requirement)
    this.conversationTimeoutId = setTimeout(() => {
      if (this.mcpConversationActive && this.voiceState === 'idle') {
        this.showTemporaryMessage('Voice session timed out due to inactivity', '⏱️');
        this.endMCPConversation();
      }
    }, 10000); // 10 seconds per user requirement
  }

  /**
   * Start conversation timeout
   */
  startConversationTimeout() {
    this.resetConversationTimeout();
  }

  /**
   * Restore voice mode state on page load
   */
  async restoreVoiceModeOnLoad() {
    if (!this.voiceModeEnabled) return;
    
    try {
      // Check if we still have microphone permission
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission.granted) {
        this.voiceModeEnabled = false;
        this.saveVoiceModeState();
        return;
      }
      
      // Initialize voice mode
      await this.initializeVoiceMode();
      
    } catch (error) {
      console.error('❌ Failed to restore voice mode:', error);
      this.voiceModeEnabled = false;
      this.saveVoiceModeState();
    }
  }

  /**
   * Show popup for voice interaction requirement
   */
  showVoiceInteractionPopup(detail) {
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'chromeai-studio voice-interaction-popup';
    popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.9); color: white; padding: 24px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); z-index: 2147483648; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);';
    
    popup.innerHTML = '<div style="margin-bottom: 16px;"><div style="font-size: 48px; margin-bottom: 8px;">🎤</div><h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Voice Interaction Required</h3><p style="margin: 0; font-size: 14px; opacity: 0.8; line-height: 1.4;">Your browser requires user interaction before speech synthesis can work. Click the button below to enable voice responses.</p></div><div style="display: flex; gap: 12px; justify-content: center;"><button id="enable-voice-btn" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;">Enable Voice</button><button id="skip-voice-btn" style="background: transparent; color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">Skip Voice</button></div>';
    
    document.body.appendChild(popup);
    
    // Add hover effects
    const enableBtn = popup.querySelector('#enable-voice-btn');
    const skipBtn = popup.querySelector('#skip-voice-btn');
    
    enableBtn.addEventListener('mouseenter', () => {
      enableBtn.style.background = '#0056b3';
    });
    enableBtn.addEventListener('mouseleave', () => {
      enableBtn.style.background = '#007bff';
    });
    
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      skipBtn.style.color = 'white';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'transparent';
      skipBtn.style.color = 'rgba(255, 255, 255, 0.7)';
    });
    
    // Handle enable voice button
    enableBtn.addEventListener('click', async () => {
      
      // Try to retry speech synthesis
      const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
      if (mcpVoiceInterface && detail.utterance) {
        try {
          await mcpVoiceInterface.retrySpeechAfterInteraction(detail.utterance);
        } catch (error) {
          console.error('❌ Speech synthesis retry failed:', error);
        }
      }
      
      // Remove popup
      popup.remove();
    });
    
    // Handle skip voice button
    skipBtn.addEventListener('click', () => {
      
      // Call directly instead of dispatching event
      this.restartRecognitionAfterSpeech();
      
      // Remove popup
      popup.remove();
    });
    
    // Auto-remove popup after 30 seconds
    setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.remove();
      }
    }, 30000);
  }
}

// Create and export singleton instance
const floatingActionBubble = new FloatingActionBubble();

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.floatingActionBubble = floatingActionBubble;
  
  // Add console helpers for voice mode management
  window.ChromeAIStudio.enableVoiceMode = () => {
    if (!floatingActionBubble.voiceModeEnabled) {
      floatingActionBubble.toggleVoiceMode();
    } else {
    }
  };
  
  window.ChromeAIStudio.disableVoiceMode = () => {
    if (floatingActionBubble.voiceModeEnabled) {
      floatingActionBubble.toggleVoiceMode();
    } else {
    }
  };
  
  window.ChromeAIStudio.getVoiceModeStatus = () => {
  };
}
