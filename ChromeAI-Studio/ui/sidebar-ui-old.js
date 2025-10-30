/**
 * ChromeAI Studio - Smart Sidebar UI Module (Old Implementation)
 * Exact copy of UI structure from the old smart-sidebar.js
 */

class SidebarUIOld {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.sidebarElement = null;
    this.resizeHandle = null;
    this.currentWidth = 460;
    this.minWidth = 400;
    this.maxWidth = 600;
    this.isResizing = false;
  }

  /**
   * Create the main sidebar element
   */
  createSidebarElement() {
    const sidebar = document.createElement('div');
    sidebar.className = 'ai-sidebar';
    sidebar.setAttribute('data-ai-component', 'sidebar');
    sidebar.setAttribute('data-mode', this.sidebar.state?.getState()?.currentMode || 'student');
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: ${this.currentWidth}px;
      height: 100vh;
      background: var(--ai-surface, #ffffff);
      border-left: 1px solid var(--ai-border, #e5e7eb);
      box-shadow: var(--ai-shadow-elevated, -4px 0 20px rgba(0, 0, 0, 0.1));
      backdrop-filter: var(--ai-backdrop-blur, blur(20px));
      z-index: 2147483647 !important;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    `;

    // Create content using old structure
    sidebar.appendChild(this.createSidebarContent());

    this.sidebarElement = sidebar;
    return sidebar;
  }

  /**
   * Create sidebar content - exact copy from old implementation
   */
  createSidebarContent() {
    const content = document.createElement('div');
    content.className = 'ai-sidebar-content';
    content.innerHTML = `
      <div class="ai-header">
        <div class="ai-header-content">
          <div class="ai-logo">
            <video class="ai-siri-icon" autoplay loop muted playsinline title="ChromeAI Studio">
              <source src="chrome-extension://${chrome.runtime.id}/icons/Siri.webm" type="video/webm">
            </video>
            ChromeAI Studio
          </div>
          <div class="ai-header-actions">
            <button class="ai-settings-btn" title="Settings" aria-label="Open settings" tabindex="0">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
              </svg>
            </button>
            <button class="ai-sidebar-close" title="Close Sidebar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="ai-main-content">
        <div id="chat-container" class="ai-chat-container">
          <div class="ai-welcome-section">
            <div class="ai-greeting">
              <h2>Hi,</h2>
              <p>How can I assist you today?</p>
            </div>
            
          </div>
        </div>
      </div>
      
      <div class="ai-input-area">
        <div class="ai-input-container">
          <div class="ai-input-wrapper-with-mentions">
            <textarea 
              id="ai-input" 
              class="ai-input-field" 
              placeholder="Ask anything... @"
              rows="1"
              data-current-model="promptai"
            ></textarea>
            <div class="ai-mention-dropdown" id="ai-mention-dropdown" style="display: none;">
              <!-- AI model suggestions will appear here -->
            </div>
          </div>
          <button id="ai-send" class="ai-send-button" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Set up event listeners
    this.setupEventListeners(content);
    this.setupExternalEventListeners();

    // Initialize AI mention system after element is created
    setTimeout(() => {
      this.initializeAIMentionSystem();
    }, 100);

    return content;
  }

  /**
   * Set up event listeners - copied from old implementation
   */
  setupEventListeners(content) {
    // Send button
    const sendBtn = content.querySelector('#ai-send');
    const inputField = content.querySelector('#ai-input');
    
    if (sendBtn && inputField) {
      sendBtn.addEventListener('click', () => this.sendMessage());
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Auto-resize textarea
      inputField.addEventListener('input', () => this.autoResizeTextarea(inputField));
    }

    // Settings button
    const settingsBtn = content.querySelector('.ai-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }

    // Close button
    const closeBtn = content.querySelector('.ai-sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // AI mention system will be initialized after element is added to DOM
  }

  /**
   * Set up external event listeners
   */
  setupExternalEventListeners() {
    // Listen for events from floating bubble
    window.addEventListener('chromeai-mode-switch', this.handleModeSwitch.bind(this));
    window.addEventListener('chromeai-action', this.handleAction.bind(this));
  }

  /**
   * Auto-resize textarea
   */
  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  /**
   * Initialize AI mention system
   */
  initializeAIMentionSystem() {
    const inputField = this.sidebarElement?.querySelector('#ai-input');
    const dropdown = this.sidebarElement?.querySelector('#ai-mention-dropdown');
    
    // Debug logs only show when debug mode is enabled
    
    if (!inputField || !dropdown) {
      console.warn('⚠️ Missing input field or dropdown for mention system');
      return;
    }

    // AI models for mentions
    this.aiModels = {
      promptai: { name: 'PromptAI', description: 'General AI assistant', color: '#6366f1' },
      writer: { name: 'Writer', description: 'Content writing specialist', color: '#10b981' },
      rewriter: { name: 'Rewriter', description: 'Text improvement expert', color: '#f59e0b' },
      summarizer: { name: 'Summarizer', description: 'Content summarization', color: '#8b5cf6' },
      translator: { name: 'Translator', description: 'Multi-language translation', color: '#ef4444' }
    };

    inputField.addEventListener('input', (e) => this.handleMentionInput(e));
    inputField.addEventListener('keydown', (e) => this.handleMentionKeydown(e));
  }

  /**
   * Handle mention input
   */
  handleMentionInput(e) {
    const input = e.target;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        this.showMentionDropdown(input, textAfterAt);
        return;
      }
    }
    
    this.hideMentionDropdown();
  }

  /**
   * Show mention dropdown
   */
  showMentionDropdown(input, query) {
    const dropdown = this.sidebarElement?.querySelector('#ai-mention-dropdown');
    if (!dropdown) return;

    const matches = this.getMentionMatches(query);
    
    if (matches.length === 0) {
      this.hideMentionDropdown();
      return;
    }

    dropdown.innerHTML = matches.map(model => `
      <div class="ai-mention-item" data-model="${model.key}">
        <div class="mention-icon ${model.key}" style="background: ${model.color}">
          ${model.name.charAt(0)}
        </div>
        <div class="mention-details">
          <div class="mention-name">${model.name}</div>
          <div class="mention-desc">${model.description}</div>
        </div>
      </div>
    `).join('');

    dropdown.style.display = 'block';
    
    // Add click handlers
    dropdown.querySelectorAll('.ai-mention-item').forEach(item => {
      item.addEventListener('click', () => this.selectMention(item.dataset.model));
    });
  }

  /**
   * Get mention matches
   */
  getMentionMatches(query) {
    return Object.entries(this.aiModels)
      .filter(([key, model]) => 
        model.name.toLowerCase().includes(query.toLowerCase()) ||
        key.toLowerCase().includes(query.toLowerCase())
      )
      .map(([key, model]) => ({ key, ...model }));
  }

  /**
   * Hide mention dropdown
   */
  hideMentionDropdown() {
    const dropdown = this.sidebarElement?.querySelector('#ai-mention-dropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  /**
   * Handle mention keydown
   */
  handleMentionKeydown(e) {
    const dropdown = this.sidebarElement?.querySelector('#ai-mention-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;

    const items = dropdown.querySelectorAll('.ai-mention-item');
    const selected = dropdown.querySelector('.ai-mention-item.selected');
    let selectedIndex = -1;

    if (selected) {
      selectedIndex = Array.from(items).indexOf(selected);
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        this.updateMentionSelection(items, selectedIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.updateMentionSelection(items, selectedIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (selected) {
          this.selectMention(selected.dataset.model);
        }
        break;
      case 'Escape':
        this.hideMentionDropdown();
        break;
    }
  }

  /**
   * Update mention selection
   */
  updateMentionSelection(items, index) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
  }

  /**
   * Select mention
   */
  selectMention(modelName) {
    const input = this.sidebarElement?.querySelector('#ai-input');
    if (!input) return;

    const cursorPos = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPos);
    const textAfterCursor = input.value.substring(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
      const newText = beforeAt + '@' + modelName + ' ' + textAfterCursor;
      input.value = newText;
      input.focus();
      input.setSelectionRange(beforeAt.length + modelName.length + 2, beforeAt.length + modelName.length + 2);
    }

    this.hideMentionDropdown();
    this.updateCurrentModel(modelName);
  }

  /**
   * Update current model
   */
  updateCurrentModel(modelName) {
    const input = this.sidebarElement?.querySelector('#ai-input');
    if (input) {
      input.dataset.currentModel = modelName;
    }
  }

  /**
   * Show settings
   */
  showSettings() {
    // Hide main content with smooth transition
    const mainContent = this.sidebarElement?.querySelector('.ai-main-content');
    if (mainContent) {
      mainContent.style.transition = 'opacity 0.3s ease-in-out';
      mainContent.style.opacity = '0';
      
      setTimeout(() => {
        mainContent.style.display = 'none';
      }, 300);
    }
    
    // Create or show settings panel
    let settingsPanel = this.sidebarElement?.querySelector('.ai-settings-panel');
    if (!settingsPanel) {
      settingsPanel = this.createSettingsPanel();
      this.sidebarElement?.appendChild(settingsPanel);
    }
    
    // Show settings panel with smooth transition
    settingsPanel.style.display = 'flex';
    requestAnimationFrame(() => {
      settingsPanel.classList.add('show');
    });
    
    // Attach listeners only once
    if (settingsPanel && settingsPanel.dataset.listenersAttached !== 'true') {
      this.setupSettingsEventListeners(settingsPanel);
    }
  }

  /**
   * Create settings panel
   */
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'ai-settings-panel';
    panel.innerHTML = `
      <div class="ai-settings-header">
        <button class="ai-back-btn" id="settings-back" title="Back to main view">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Back</span>
        </button>
        <h2 class="ai-settings-title">Settings</h2>
        <button class="ai-reset-btn" id="settings-reset">Reset</button>
      </div>
      
      <div class="ai-settings-content">
        <!-- General Settings Card -->
        <div class="ai-settings-card">
          <div class="ai-settings-card-header">
            <h3 class="ai-settings-section-title">⚙️ General</h3>
            <button class="ai-settings-toggle" data-section="general">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
              </svg>
            </button>
          </div>
          <div class="ai-settings-card-content" data-section="general">
            <div class="ai-setting-item">
              <label for="mode-select">Active Mode</label>
              <div class="ai-select-wrapper">
                <select id="mode-select" class="ai-select">
                  <option value="student">Student</option>
                  <option value="developer">Developer</option>
                  <option value="creator">Creator</option>
                  <option value="researcher">Researcher</option>
                </select>
                <svg class="ai-select-arrow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                </svg>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="theme-select">Theme</label>
              <div class="ai-select-wrapper">
                <select id="theme-select" class="ai-select">
                  <option value="light">Light</option>
                  <option value="auto">Auto (System)</option>
                </select>
                <svg class="ai-select-arrow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                </svg>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="sidebar-width">Sidebar Width</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="sidebar-width" class="ai-slider" min="300" max="800" step="10" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="width-value">400px</span>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="sidebar-position">Sidebar Position</label>
              <div class="ai-toggle-group">
                <input type="radio" id="position-right" name="sidebar-position" value="right" checked />
                <label for="position-right" class="ai-toggle-option">Right</label>
                <input type="radio" id="position-left" name="sidebar-position" value="left" />
                <label for="position-left" class="ai-toggle-option">Left</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Voice & Audio Settings Card -->
        <div class="ai-settings-card">
          <div class="ai-settings-card-header">
            <h3 class="ai-settings-section-title">🎤 Voice & Audio</h3>
            <button class="ai-settings-toggle" data-section="voice">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
              </svg>
            </button>
          </div>
          <div class="ai-settings-card-content" data-section="voice">
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="voice-enabled">Voice Assistant</label>
                <span class="setting-description">Enable voice commands and responses</span>
              </div>
              <div class="ai-toggle-switch">
                <input type="checkbox" id="voice-enabled" class="ai-toggle-input" />
                <span class="ai-toggle-slider"></span>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="voice-rate">Speech Rate</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="voice-rate" class="ai-slider" min="0.5" max="2.0" step="0.1" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="voice-rate-value">1.4x</span>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="voice-pitch">Speech Pitch</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="voice-pitch" class="ai-slider" min="0.5" max="2.0" step="0.1" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="voice-pitch-value">1.0x</span>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="voice-volume">Volume</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="voice-volume" class="ai-slider" min="0" max="1" step="0.1" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="voice-volume-value">100%</span>
              </div>
            </div>
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="wake-word-enabled">Wake Word Detection</label>
                <span class="setting-description">Listen for wake words like "hey assistant"</span>
              </div>
              <div class="ai-toggle-switch">
                <input type="checkbox" id="wake-word-enabled" class="ai-toggle-input" />
                <span class="ai-toggle-slider"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Model Settings Card -->
        <div class="ai-settings-card">
          <div class="ai-settings-card-header">
            <h3 class="ai-settings-section-title">🤖 AI Models</h3>
            <button class="ai-settings-toggle" data-section="ai">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
              </svg>
            </button>
          </div>
          <div class="ai-settings-card-content" data-section="ai">
            <div class="ai-setting-item">
              <label for="ai-temperature">Response Creativity</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="ai-temperature" class="ai-slider" min="0" max="1" step="0.1" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="ai-temperature-value">0.7</span>
              </div>
              <span class="setting-description">Higher values = more creative, lower = more focused</span>
            </div>
            <div class="ai-setting-item">
              <label for="ai-max-tokens">Max Response Length</label>
              <div class="ai-slider-wrapper">
                <input type="range" id="ai-max-tokens" class="ai-slider" min="100" max="2000" step="50" />
                <div class="ai-slider-track">
                  <div class="ai-slider-progress"></div>
                </div>
                <span class="ai-slider-value" id="ai-max-tokens-value">1000</span>
              </div>
            </div>
            <div class="ai-setting-item">
              <label for="ai-model">Preferred Model</label>
              <div class="ai-select-wrapper">
                <select id="ai-model" class="ai-select">
                  <option value="auto">Auto (Best Available)</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5">GPT-3.5</option>
                  <option value="claude">Claude</option>
                </select>
                <svg class="ai-select-arrow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Privacy & Security Card -->
        <div class="ai-settings-card">
          <div class="ai-settings-card-header">
            <h3 class="ai-settings-section-title">🔒 Privacy & Security</h3>
            <button class="ai-settings-toggle" data-section="privacy">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
              </svg>
            </button>
          </div>
          <div class="ai-settings-card-content" data-section="privacy">
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="data-collection">Analytics & Usage Data</label>
                <span class="setting-description">Help improve ChromeAI by sharing anonymous usage data</span>
              </div>
              <div class="ai-toggle-switch">
                <input type="checkbox" id="data-collection" class="ai-toggle-input" />
                <span class="ai-toggle-slider"></span>
              </div>
            </div>
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="conversation-history">Save Conversation History</label>
                <span class="setting-description">Keep chat history for future reference</span>
              </div>
              <div class="ai-toggle-switch">
                <input type="checkbox" id="conversation-history" class="ai-toggle-input" checked />
                <span class="ai-toggle-slider"></span>
              </div>
            </div>
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="clear-data">Clear All Data</label>
                <span class="setting-description">Remove all saved conversations and settings</span>
              </div>
              <button id="clear-data-btn" class="ai-danger-btn">Clear All Data</button>
            </div>
          </div>
        </div>

        <!-- Debug Logs -->
        <div class="ai-settings-card">
          <div class="ai-settings-card-header">
            <h3 class="ai-settings-section-title">🐛 Debug Logs</h3>
          </div>
          <div class="ai-settings-card-content">
            <div class="ai-setting-item">
              <div class="ai-setting-label">
                <label for="debug-mode">Enable Debug Mode</label>
                <span class="setting-description">Show detailed logs and debugging information</span>
              </div>
              <div class="ai-toggle-switch">
                <input type="checkbox" id="debug-mode" class="ai-toggle-input" />
                <span class="ai-toggle-slider"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.setupSettingsEventListeners(panel);
    this.loadSettingsValues(panel);
    
    return panel;
  }

  /**
   * Setup settings event listeners
   */
  setupSettingsEventListeners(panel) {
    // Prevent duplicate listener attachment
    if (panel && panel.dataset.listenersAttached === 'true') {
      return;
    }
    // Back button
    const backBtn = panel.querySelector('#settings-back');
    if (backBtn) {
      // Remove any existing event listeners
      backBtn.removeEventListener('click', this.handleBackClick);
      
      // Add new event listener
      this.handleBackClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideSettings();
      };
      
      backBtn.addEventListener('click', this.handleBackClick);
    }
    
    // Reset button
    const resetBtn = panel.querySelector('#settings-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }

    // Backdrop/outer click closes settings
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.hideSettings();
      }
    });

    // ESC to close settings
    const escHandler = (evt) => {
      if (evt.key === 'Escape') {
        this.hideSettings();
      }
    };
    // Remove any prior handler to avoid duplicates
    if (this._settingsEscHandler) {
      document.removeEventListener('keydown', this._settingsEscHandler);
    }
    this._settingsEscHandler = escHandler;
    document.addEventListener('keydown', this._settingsEscHandler);

    // No collapsible sections - all settings are always visible

    // General Settings
    const modeSelect = panel.querySelector('#mode-select');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        this.updateSetting('mode', e.target.value);
        localStorage.setItem('chromeai-active-mode', e.target.value);
      });
    }

    const themeSelect = panel.querySelector('#theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.updateSetting('theme', e.target.value);
      });
    }

    const sidebarWidth = panel.querySelector('#sidebar-width');
    if (sidebarWidth) {
      sidebarWidth.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.updateSetting('sidebarWidth', value);
        panel.querySelector('#width-value').textContent = `${value}px`;
        this.updateSliderProgress(sidebarWidth);
        this.applyWidth(value);
      });
    }

    // Position radio buttons
    const positionRadios = panel.querySelectorAll('input[name="sidebar-position"]');
    positionRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateSetting('position', e.target.value);
        this.applyPosition(e.target.value);
      });
    });

    // Voice Settings
    const voiceEnabled = panel.querySelector('#voice-enabled');
    if (voiceEnabled) {
      const voiceEnabledSwitch = voiceEnabled.closest('.ai-toggle-switch');
      if (voiceEnabledSwitch) {
        voiceEnabledSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          voiceEnabled.checked = !voiceEnabled.checked;
          // Single source of truth: fire change only. The change handler will persist.
          voiceEnabled.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      voiceEnabled.addEventListener('change', (e) => {
        this.updateSetting('voiceEnabled', e.target.checked);
      });
    }

    const voiceRate = panel.querySelector('#voice-rate');
    if (voiceRate) {
      voiceRate.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.updateSetting('voiceRate', value);
        panel.querySelector('#voice-rate-value').textContent = `${value}x`;
      });
    }

    const voicePitch = panel.querySelector('#voice-pitch');
    if (voicePitch) {
      voicePitch.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.updateSetting('voicePitch', value);
        panel.querySelector('#voice-pitch-value').textContent = `${value}x`;
      });
    }

    const voiceVolume = panel.querySelector('#voice-volume');
    if (voiceVolume) {
      voiceVolume.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.updateSetting('voiceVolume', value);
        panel.querySelector('#voice-volume-value').textContent = `${Math.round(value * 100)}%`;
      });
    }

    const wakeWordEnabled = panel.querySelector('#wake-word-enabled');
    if (wakeWordEnabled) {
      const wakeWordSwitch = wakeWordEnabled.closest('.ai-toggle-switch');
      if (wakeWordSwitch) {
        wakeWordSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          wakeWordEnabled.checked = !wakeWordEnabled.checked;
          wakeWordEnabled.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      wakeWordEnabled.addEventListener('change', (e) => {
        this.updateSetting('wakeWordEnabled', e.target.checked);
      });
    }

    // AI Model Settings
    const aiTemperature = panel.querySelector('#ai-temperature');
    if (aiTemperature) {
      aiTemperature.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.updateSetting('aiTemperature', value);
        panel.querySelector('#ai-temperature-value').textContent = value.toFixed(1);
      });
    }

    const aiMaxTokens = panel.querySelector('#ai-max-tokens');
    if (aiMaxTokens) {
      aiMaxTokens.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.updateSetting('aiMaxTokens', value);
        panel.querySelector('#ai-max-tokens-value').textContent = value;
      });
    }

    const aiModel = panel.querySelector('#ai-model');
    if (aiModel) {
      aiModel.addEventListener('change', (e) => {
        this.updateSetting('preferredModel', e.target.value);
      });
    }

    // Privacy Settings
    const dataCollection = panel.querySelector('#data-collection');
    if (dataCollection) {
      const dataCollectionSwitch = dataCollection.closest('.ai-toggle-switch');
      if (dataCollectionSwitch) {
        dataCollectionSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dataCollection.checked = !dataCollection.checked;
          dataCollection.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      dataCollection.addEventListener('change', (e) => {
        this.updateSetting('dataCollection', e.target.checked);
      });
    }

    const conversationHistory = panel.querySelector('#conversation-history');
    if (conversationHistory) {
      const conversationHistorySwitch = conversationHistory.closest('.ai-toggle-switch');
      if (conversationHistorySwitch) {
        conversationHistorySwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          conversationHistory.checked = !conversationHistory.checked;
          conversationHistory.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      conversationHistory.addEventListener('change', (e) => {
        this.updateSetting('conversationHistory', e.target.checked);
      });
    }

    const clearDataBtn = panel.querySelector('#clear-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.clearAllData());
    }

    // Advanced Settings
    const debugMode = panel.querySelector('#debug-mode');
    if (debugMode) {
      const debugSwitch = debugMode.closest('.ai-toggle-switch');
      if (debugSwitch) {
        debugSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          debugMode.checked = !debugMode.checked;
          debugMode.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      debugMode.addEventListener('change', (e) => {
        this.updateSetting('debugMode', e.target.checked);
      });
    }

    // Mark listeners attached
    if (panel) {
      panel.dataset.listenersAttached = 'true';
    }
  }

  /**
   * Hide settings
   */
  hideSettings() {
    // Hide settings panel with smooth transition
    const settingsPanel = this.sidebarElement?.querySelector('.ai-settings-panel');
    if (settingsPanel) {
      settingsPanel.classList.remove('show');
      
      // Wait for transition to complete before hiding
      setTimeout(() => {
        settingsPanel.style.display = 'none';
      }, 300);
    }
    
    // Show main content with smooth transition
    const mainContent = this.sidebarElement?.querySelector('.ai-main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
      mainContent.style.visibility = 'visible';
      mainContent.style.transition = 'opacity 0.3s ease-in-out';
      mainContent.style.opacity = '0';
      
      // Trigger fade-in
      requestAnimationFrame(() => {
        mainContent.style.opacity = '1';
      });
    }
    
    // Also ensure chat container is visible
    const chatContainer = this.sidebarElement?.querySelector('#chat-container');
    if (chatContainer) {
      chatContainer.style.display = 'block';
      chatContainer.style.visibility = 'visible';
      chatContainer.style.opacity = '1';
    }
  }

  /**
   * Load settings values into the panel
   */
  loadSettingsValues(panel) {
    
    // Load from settings manager or state
    const settings = this.sidebar?.settings?.getSettingsSummary() || {};
    
    // General Settings
    const modeSelect = panel.querySelector('#mode-select');
    if (modeSelect && settings.currentMode) {
      modeSelect.value = settings.currentMode;
    }

    const themeSelect = panel.querySelector('#theme-select');
    if (themeSelect && settings.theme) {
      themeSelect.value = settings.theme;
    }

    const sidebarWidth = panel.querySelector('#sidebar-width');
    if (sidebarWidth && settings.width) {
      sidebarWidth.value = settings.width;
      panel.querySelector('#width-value').textContent = `${settings.width}px`;
    }

    // Position radio buttons
    const positionRadios = panel.querySelectorAll('input[name="sidebar-position"]');
    positionRadios.forEach(radio => {
      if (radio.value === settings.position) {
        radio.checked = true;
      }
    });

    // Voice Settings
    const voiceEnabled = panel.querySelector('#voice-enabled');
    if (voiceEnabled) {
      voiceEnabled.checked = settings.voiceEnabled || false;
    }

    const voiceRate = panel.querySelector('#voice-rate');
    if (voiceRate) {
      const rate = settings.voiceRate || 1.4;
      voiceRate.value = rate;
      panel.querySelector('#voice-rate-value').textContent = `${rate}x`;
    }

    const voicePitch = panel.querySelector('#voice-pitch');
    if (voicePitch) {
      const pitch = settings.voicePitch || 1.0;
      voicePitch.value = pitch;
      panel.querySelector('#voice-pitch-value').textContent = `${pitch}x`;
    }

    const voiceVolume = panel.querySelector('#voice-volume');
    if (voiceVolume) {
      const volume = settings.voiceVolume || 1.0;
      voiceVolume.value = volume;
      panel.querySelector('#voice-volume-value').textContent = `${Math.round(volume * 100)}%`;
    }

    const wakeWordEnabled = panel.querySelector('#wake-word-enabled');
    if (wakeWordEnabled) {
      wakeWordEnabled.checked = settings.wakeWordEnabled || false;
    }

    // AI Model Settings
    const aiTemperature = panel.querySelector('#ai-temperature');
    if (aiTemperature) {
      const temp = settings.aiTemperature || 0.7;
      aiTemperature.value = temp;
      panel.querySelector('#ai-temperature-value').textContent = temp.toFixed(1);
    }

    const aiMaxTokens = panel.querySelector('#ai-max-tokens');
    if (aiMaxTokens) {
      const tokens = settings.aiMaxTokens || 1000;
      aiMaxTokens.value = tokens;
      panel.querySelector('#ai-max-tokens-value').textContent = tokens;
    }

    const aiModel = panel.querySelector('#ai-model');
    if (aiModel && settings.preferredModel) {
      aiModel.value = settings.preferredModel;
    }

    // Chat Settings
    const autoSave = panel.querySelector('#auto-save');
    if (autoSave) {
      autoSave.checked = settings.autoSave || false;
    }

    const chatSound = panel.querySelector('#chat-sound');
    if (chatSound) {
      chatSound.checked = settings.chatSound || false;
    }

    const typingIndicator = panel.querySelector('#typing-indicator');
    if (typingIndicator) {
      typingIndicator.checked = settings.typingIndicator !== false;
    }

    // Privacy Settings
    const dataCollection = panel.querySelector('#data-collection');
    if (dataCollection) {
      dataCollection.checked = settings.dataCollection || false;
    }

    const conversationHistory = panel.querySelector('#conversation-history');
    if (conversationHistory) {
      conversationHistory.checked = settings.conversationHistory !== false;
    }

    // Advanced Settings
    const debugMode = panel.querySelector('#debug-mode');
    if (debugMode) {
      debugMode.checked = settings.debugMode || false;
    }

    const experimentalFeatures = panel.querySelector('#experimental-features');
    if (experimentalFeatures) {
      experimentalFeatures.checked = settings.experimentalFeatures || false;
    }

    // Initialize slider progress bars
    const sliders = panel.querySelectorAll('.ai-slider');
    sliders.forEach(slider => {
      this.updateSliderProgress(slider);
    });

    // All settings sections are always visible - no collapsible behavior needed
  }

  /**
   * Toggle settings section
   */
  toggleSettingsSection(sectionName) {
    const content = this.sidebarElement?.querySelector(`[data-section="${sectionName}"]`);
    const toggle = this.sidebarElement?.querySelector(`[data-section="${sectionName}"]`)?.closest('.ai-settings-card')?.querySelector('.ai-settings-toggle');
    
    if (content && toggle) {
      const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';
      
      if (isExpanded) {
        content.style.maxHeight = '0px';
        toggle.style.transform = 'rotate(0deg)';
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        toggle.style.transform = 'rotate(180deg)';
      }
    }
  }

  /**
   * Update slider progress
   */
  updateSliderProgress(slider) {
    const progress = slider.parentElement.querySelector('.ai-slider-progress');
    if (progress) {
      const percentage = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      progress.style.width = percentage + '%';
    }
  }

  /**
   * Update a setting
   */
  updateSetting(key, value) {
    // Normalize keys used by state/settings for consistency
    const normalizedKey = key === 'sidebarWidth' ? 'width' : key;

    // Log setting changes when debug mode is enabled

    // Special handling for mode
    if (normalizedKey === 'mode' && typeof value === 'string') {
      this.setMode(value);
    }

    if (this.sidebar?.settings) {
      this.sidebar.settings.updateSetting(normalizedKey, value);
    } else {
      // Fallback to localStorage
      localStorage.setItem(`chromeai-${normalizedKey}`, JSON.stringify(value));
    }
  }

  /**
   * Apply width to sidebar
   */
  applyWidth(width) {
    const sidebarElement = this.sidebarElement;
    if (sidebarElement) {
      const clampedWidth = Math.max(300, Math.min(800, width));
      sidebarElement.style.width = `${clampedWidth}px`;
      this.currentWidth = clampedWidth;
    }
  }

  /**
   * Apply position to sidebar
   */
  applyPosition(position) {
    const sidebarElement = this.sidebarElement;
    if (!sidebarElement) return;

    if (position === 'left') {
      sidebarElement.style.left = '0';
      sidebarElement.style.right = 'auto';
      sidebarElement.style.borderLeft = 'none';
      sidebarElement.style.borderRight = '1px solid var(--ai-border, #e5e7eb)';
    } else {
      sidebarElement.style.right = '0';
      sidebarElement.style.left = 'auto';
      sidebarElement.style.borderRight = 'none';
      sidebarElement.style.borderLeft = '1px solid var(--ai-border, #e5e7eb)';
    }
  }

  /**
   * Clear all data
   */
  clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('chromeai-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear Chrome storage
      if (chrome?.storage?.sync) {
        chrome.storage.sync.clear();
      }
      
      // Reset to defaults
      this.resetSettings();
      
      alert('All data has been cleared. Please refresh the page.');
    }
  }

  /**
   * Export settings
   */
  exportSettings() {
    const settings = this.sidebar?.settings?.exportSettings() || {
      settings: {},
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chromeai-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import settings
   */
  importSettings(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        if (this.sidebar?.settings) {
          this.sidebar.settings.importSettings(settings);
        }
        alert('Settings imported successfully!');
        // Reload the settings panel
        this.hideSettings();
        this.showSettings();
      } catch (error) {
        alert('Failed to import settings: ' + error.message);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Reset settings
   */
  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      if (this.sidebar?.settings) {
        this.sidebar.settings.resetToDefaults();
      } else {
        // Fallback reset
        const defaultSettings = {
          theme: 'auto',
          mode: 'student',
          sidebarWidth: 400,
          position: 'right',
          voiceEnabled: false,
          voiceRate: 1.4,
          voicePitch: 1.0,
          voiceVolume: 1.0,
          wakeWordEnabled: false,
          aiTemperature: 0.7,
          aiMaxTokens: 1000,
          preferredModel: 'auto',
          autoSave: true,
          chatSound: false,
          typingIndicator: true,
          dataCollection: false,
          conversationHistory: true,
          debugMode: false,
          experimentalFeatures: false
        };
        
        Object.keys(defaultSettings).forEach(key => {
          this.updateSetting(key, defaultSettings[key]);
        });
      }
      
      // Reload the settings panel
      this.hideSettings();
      this.showSettings();
    }
  }

  /**
   * Show result in sidebar (for text selection menu)
   */
  showResult(content, title = 'AI Response') {
    
    // Switch to main view if in settings
    this.showMainView();
    
    // Remove any existing processing indicator
    this.removeProcessingIndicator();
    
    // Get chat container
    const chatContainer = this.sidebarElement?.querySelector('#chat-container');
    if (!chatContainer) return;
    
    // Hide welcome message if it exists
    const welcomeMessage = chatContainer.querySelector('.ai-welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.opacity = '0';
      welcomeMessage.style.transform = 'translateY(-20px)';
      setTimeout(() => welcomeMessage.remove(), 300);
    }
    
    // Create messages container if it doesn't exist
    let messagesContainer = chatContainer.querySelector('.ai-chat-messages');
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'ai-chat-messages';
      chatContainer.appendChild(messagesContainer);
    }
    
    // Create AI message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-message-assistant';
    messageDiv.setAttribute('data-has-avatar', 'true');
    
    messageDiv.innerHTML = `
      <div class="ai-message-avatar">
        <video class="siri-avatar" autoplay loop muted playsinline>
          <source src="chrome-extension://${chrome.runtime.id}/icons/Siri.webm" type="video/webm">
        </video>
      </div>
      <div class="ai-message-content-wrapper">
        <div class="message-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span>${title || 'AI Response'}</span>
        </div>
        <div class="message-content">${this.renderMarkdownToHtml(content)}</div>
      </div>
    `;

    // Apply readability styles
    const contentEl = messageDiv.querySelector('.message-content');
    if (contentEl) {
      contentEl.style.fontSize = '16px';
      contentEl.style.lineHeight = '1.7';
      contentEl.querySelectorAll('h2,h3,h4,h5,h6').forEach(h => { h.style.margin = '8px 0 4px'; });
      contentEl.querySelectorAll('ul,ol').forEach(l => { l.style.margin = '6px 0 6px 18px'; });
      contentEl.querySelectorAll('li').forEach(li => { li.style.margin = '3px 0'; });
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Update status
    this.updateStatus(`Result from ${title}`);
  }

  /**
   * Start processing indicator (for text selection menu)
   */
  startProcessing(actionTitle = 'Processing') {
    
    // Switch to main view if in settings
    this.showMainView();
    
    // Update status
    this.updateStatus(actionTitle);
  }

  /**
   * Complete processing (for text selection menu)
   */
  completeProcessing(result, actionTitle = 'AI Response') {
    
    // Remove processing indicator
    this.removeProcessingIndicator();
    
    // Only show result if we have actual content to show
    if (result && result !== 'AI Response received') {
      this.showResult(result, actionTitle);
    }
  }

  /**
   * Show main view (hide settings if open)
   */
  showMainView() {
    const settingsPanel = this.sidebarElement?.querySelector('.ai-settings-panel');
    if (settingsPanel) {
      settingsPanel.classList.remove('show');
    }
    
    const mainContent = this.sidebarElement?.querySelector('.ai-main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
    }
  }

  /**
   * Start processing with proper sidebar integration
   */
  startProcessing(actionTitle = 'Processing') {
    
    // Show sidebar first
    this.show();
    
    // Switch to main view if in settings
    this.showMainView();
    
    // Clear welcome message if it exists
    const chatContainer = this.sidebarElement?.querySelector('#chat-container');
    if (chatContainer) {
      const welcomeMessage = chatContainer.querySelector('.ai-welcome-message');
      if (welcomeMessage) {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => welcomeMessage.remove(), 300);
      }
    }
    
    // Update status
    this.updateStatus(`Processing ${actionTitle}...`);
  }

  /**
   * Remove processing indicator
   */
  removeProcessingIndicator() {
    const typingIndicator = this.sidebarElement?.querySelector('#typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    // Also remove any orphaned typing indicators by class
    const allTypingIndicators = this.sidebarElement?.querySelectorAll('.ai-typing-indicator');
    if (allTypingIndicators) {
      allTypingIndicators.forEach(indicator => indicator.remove());
    }
  }

  /**
   * Send message
   */
  async sendMessage() {
    const input = this.sidebarElement?.querySelector('#ai-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Clear input first
    input.value = '';
    input.style.height = 'auto';
    
    // Use the new chat system with @mentions support
    try {
      if (this.sidebar?.chat) {
        // Use the new chat system that handles @mentions and message creation
        await this.sidebar.chat.processMessage(message);
      } else {
        // Fallback to old system
        this.addMessage(message, 'user');
        this.startProcessing('AI is thinking...');
        this.simulateStreamingResponse(null, message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('Sorry, there was an error processing your request.', 'assistant');
    }
  }

  /**
   * Simulate streaming response like text selection menu
   */
  simulateStreamingResponse(streamingMessage, userMessage) {
    if (!streamingMessage) return;

    const response = 'Hello! I received your message: "' + userMessage + '". How can I help you today?';
    const words = response.split(' ');
    let currentText = '';
    let wordIndex = 0;

    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        this.updateStreamingMessage(streamingMessage, currentText);
        wordIndex++;
      } else {
        clearInterval(streamInterval);
        // Complete the streaming message
        this.completeStreamingMessage(streamingMessage);
        // Just remove processing indicator
        this.removeProcessingIndicator();
      }
    }, 50); // Stream one word every 50ms
  }

  /**
   * Add message to chat
   */
  addMessage(content, type = 'user') {
    const chatContainer = this.sidebarElement?.querySelector('#chat-container');
    if (!chatContainer) return;

    // Remove welcome message if it exists
    const welcome = chatContainer.querySelector('.ai-welcome-section');
    if (welcome) {
      welcome.remove();
    }

    // Create messages container if it doesn't exist (same as addProcessingIndicator)
    let messagesContainer = chatContainer.querySelector('.ai-chat-messages');
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'ai-chat-messages';
      chatContainer.appendChild(messagesContainer);
    }

    const message = document.createElement('div');
    message.className = `ai-message ai-message-${type}`;
    
    if (type === 'user') {
      // Style user message properly
      message.innerHTML = `
        <div class="ai-message-content-wrapper">
          <div class="message-header">You</div>
          <div class="message-content">${this.renderMarkdownToHtml(content)}</div>
        </div>
      `;
    } else {
      // Add avatar attribute for AI messages
      message.setAttribute('data-has-avatar', 'true');
      message.innerHTML = `
        <div class="ai-message-avatar">
          <video class="siri-avatar" autoplay loop muted playsinline>
            <source src="chrome-extension://${chrome.runtime.id}/icons/Siri.webm" type="video/webm">
          </video>
        </div>
        <div class="ai-message-content-wrapper">
          <div class="message-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span>AI Response</span>
          </div>
          <div class="message-content">${this.renderMarkdownToHtml(content)}</div>
        </div>
      `;
    }

    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Apply readability styles
    const contentEl = message.querySelector('.message-content');
    if (contentEl) {
      contentEl.style.fontSize = '14px';
      contentEl.style.lineHeight = '1.6';
      contentEl.querySelectorAll('h2,h3,h4,h5,h6').forEach(h => { h.style.margin = '8px 0 4px'; });
      contentEl.querySelectorAll('ul,ol').forEach(l => { l.style.margin = '6px 0 6px 18px'; });
      contentEl.querySelectorAll('li').forEach(li => { li.style.margin = '3px 0'; });
    }
  }

  /**
   * Add a streaming message placeholder
   * @returns {HTMLElement} The message element to update
   */
  addStreamingMessage() {
    
    if (!this.sidebarElement) {
      console.warn('Sidebar element not initialized');
      return null;
    }
    
    const chatContainer = this.sidebarElement.querySelector('#chat-container');
    
    if (!chatContainer) {
      console.warn('Chat container not found in sidebar');
      return null;
    }

    // Remove welcome message if it exists
    const welcome = chatContainer.querySelector('.ai-welcome-section');
    if (welcome) {
      welcome.remove();
    }

    // Remove any existing typing indicator
    const existingTyping = chatContainer.querySelector('.ai-typing-indicator');
    if (existingTyping) {
      existingTyping.remove();
    }

    // Create messages container if it doesn't exist
    let messagesContainer = chatContainer.querySelector('.ai-chat-messages');
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'ai-chat-messages';
      chatContainer.appendChild(messagesContainer);
    }

    const message = document.createElement('div');
    message.className = 'ai-message ai-message-assistant ai-message-streaming';
    message.setAttribute('data-has-avatar', 'true');
    message.setAttribute('data-streaming', 'true');
    
    message.innerHTML = `
      <div class="ai-thinking-container">
        <div class="ai-message-avatar ai-thinking">
          <video class="siri-thinking-animation" autoplay loop muted playsinline>
            <source src="chrome-extension://${chrome.runtime.id}/icons/Siri.webm" type="video/webm">
          </video>
        </div>
        <div class="thinking-text-label">AI is thinking</div>
      </div>
      <div class="ai-message-content-wrapper">
        <div class="message-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span>AI Response</span>
          <button class="ai-copy-button" title="Copy" aria-label="Copy" style="display:none; background:transparent; border:none; padding:4px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="message-content"></div>
        <span class="streaming-cursor">▊</span>
      </div>
    `;

    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return message;
  }

  /**
   * Update streaming message with new content
   */
  updateStreamingMessage(messageElement, content) {
    
    if (!messageElement) {
      console.warn('Message element is null');
      return;
    }
    
    // Hide thinking text label when streaming starts
    const thinkingContainer = messageElement.querySelector('.ai-thinking-container');
    if (thinkingContainer) {
      const thinkingLabel = thinkingContainer.querySelector('.thinking-text-label');
      if (thinkingLabel) thinkingLabel.style.display = 'none';
    }
    
    // Transition from thinking to streaming state
    const avatar = messageElement.querySelector('.ai-message-avatar');
    if (avatar && avatar.classList.contains('ai-thinking')) {
      avatar.classList.remove('ai-thinking');
      avatar.innerHTML = `
        <video class="siri-avatar" autoplay loop muted playsinline>
          <source src="chrome-extension://${chrome.runtime.id}/icons/Siri.webm" type="video/webm">
        </video>
      `;
    }
    
    const contentDiv = messageElement.querySelector('.message-content');
    const cursor = messageElement.querySelector('.streaming-cursor');
    
    if (contentDiv) {
      // Format content and add cursor
      const formattedContent = this.renderMarkdownToHtml(content);
      contentDiv.innerHTML = formattedContent;
      // Improve readability
      contentDiv.style.fontSize = '16px';
      contentDiv.style.lineHeight = '1.7';
      // Headings and lists spacing
      contentDiv.querySelectorAll('h2,h3,h4,h5,h6').forEach(h => { h.style.margin = '8px 0 4px'; });
      contentDiv.querySelectorAll('ul,ol').forEach(l => { l.style.margin = '6px 0 6px 18px'; });
      contentDiv.querySelectorAll('li').forEach(li => { li.style.margin = '3px 0'; });
      
      // Move cursor to end
      if (cursor) {
        contentDiv.appendChild(cursor);
      }
      
      // Auto-scroll to show new content
      const messagesContainer = messageElement.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }

  /**
   * Mark streaming message as complete
   */
  completeStreamingMessage(messageElement) {
    
    if (!messageElement) {
      console.warn('Message element is null');
      return;
    }
    
    // Show copy button
    const copyButton = messageElement.querySelector('.ai-copy-button');
    if (copyButton) {
      copyButton.style.display = 'inline-flex';
      
      // Add click handler
      copyButton.addEventListener('click', async () => {
        const content = messageElement.querySelector('.message-content');
        if (content) {
          try {
            await navigator.clipboard.writeText(content.innerText);
            const prevTitle = copyButton.getAttribute('title') || 'Copy';
            copyButton.setAttribute('title', 'Copied!');
            setTimeout(() => {
              copyButton.setAttribute('title', prevTitle);
            }, 1400);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        }
      });
    }
    
    // Remove any existing typing indicator
    const typingIndicator = document.querySelector('.ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    // Remove streaming indicator
    const indicator = messageElement.querySelector('.streaming-indicator');
    if (indicator) {
      indicator.textContent = '(Complete)';
      indicator.style.color = 'var(--ai-success, #10b981)';
    }
    
    // Remove cursor
    const cursor = messageElement.querySelector('.streaming-cursor');
    if (cursor) {
      cursor.remove();
    }
    
    // Remove streaming attribute
    messageElement.removeAttribute('data-streaming');
    messageElement.classList.remove('ai-message-streaming');
  }

  /**
   * Mark streaming message as error
   */
  errorStreamingMessage(messageElement, errorMsg) {
    if (!messageElement) {
      console.warn('Message element is null');
      return;
    }
    
    // Remove any existing typing indicator
    const typingIndicator = document.querySelector('.ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    // Update indicator
    const indicator = messageElement.querySelector('.streaming-indicator');
    if (indicator) {
      indicator.textContent = `(Error: ${errorMsg})`;
      indicator.style.color = 'var(--ai-error, #ef4444)';
    }
    
    // Remove cursor
    const cursor = messageElement.querySelector('.streaming-cursor');
    if (cursor) {
      cursor.remove();
    }
    
    // Add error class
    messageElement.classList.add('ai-message-error');
  }

  /**
   * Format message content
   */
  renderMarkdownToHtml(content) {
    if (!content) return '';
    let text = String(content);
    // Remove artifacts
    text = text.replace(/▊/g, '');
    text = text.replace(/Copy(?:\s|\u00A0)+Copied!/gi, '');
    text = text.replace(/^\s*Copy\s+Copied!\s*/i, '');

    // Normalize HTML remnants to plain text so markdown parsing works
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    // Normalize heading starts if stuck to previous tokens
    text = text.replace(/\s*###/g, '\n\n###');

    // Normalize labels to ensure breaks before them
    const labelWords = ['Source:', 'Overview', 'Purpose:', 'Functionality:', 'Benefits:', 'Notes:'];
    labelWords.forEach(l => {
      const re = new RegExp(`\\n?\\s*(${l.replace(/\W/g, r=>"\\"+r)})`, 'gi');
      text = text.replace(re, `\n\n$1`);
    });

    // Convert links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Lines → HTML blocks
    const lines = text.split(/\n+/);
    const out = [];
    let inList = false;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (/^#{1,6}\s+/.test(trimmed)) {
        const levelRaw = (trimmed.match(/^#+/) || ['##'])[0].length;
        const level = Math.min(6, Math.max(2, levelRaw));
        const content = trimmed.replace(/^#+\s+/, '');
        out.push(`<h${level}>${content}</h${level}>`);
        inList = false;
      } else if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        if (!inList) { out.push('<ol>'); inList = 'ol'; }
        out.push(`<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`);
      } else if (trimmed.length === 0) {
        if (inList === true) { out.push('</ul>'); inList = false; }
        if (inList === 'ol') { out.push('</ol>'); inList = false; }
        out.push('<br>');
      } else {
        if (inList === true) { out.push('</ul>'); inList = false; }
        if (inList === 'ol') { out.push('</ol>'); inList = false; }
        // Inline formatting
        let html = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        out.push(`<p>${html}</p>`);
      }
    });
    if (inList === true) out.push('</ul>');
    if (inList === 'ol') out.push('</ol>');
    return out.join('\n');
  }

  // Backward compatibility
  formatMessageContent(content) {
    return this.renderMarkdownToHtml(content);
  }

  /**
   * Show sidebar
   */
  show() {
    if (this.sidebarElement) {
      this.sidebarElement.style.transform = 'translateX(0)';
    }
  }

  /**
   * Hide sidebar
   */
  hide() {
    if (this.sidebarElement) {
      this.sidebarElement.style.transform = 'translateX(100%)';
    }
  }

  /**
   * Toggle sidebar
   */
  toggle() {
    if (this.sidebarElement) {
      const isVisible = this.sidebarElement.style.transform === 'translateX(0px)';
      if (isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  /**
   * Handle mode switch
   */
  handleModeSwitch(event) {
    // Implement mode switching
  }

  /**
   * Handle action
   */
  handleAction(event) {
    
    const action = event.detail;
    if (action.action === 'show-ai-result') {
      // Just show the result (processing is already handled by text selection menu)
      this.showResult(action.text, action.source || 'Text Selection');
    } else if (action.action === 'add-user-message') {
      // Add user message to chat
      this.addMessage(action.text, 'user', {
        featureType: action.featureType
      });
    } else {
    }
  }

  /**
   * Show sidebar (required method)
   */
  show() {
    if (this.sidebarElement) {
      this.sidebarElement.style.transform = 'translateX(0)';
      this.sidebar.state?.setVisible(true);
    }
  }

  /**
   * Hide sidebar (required method)
   */
  hide() {
    if (this.sidebarElement) {
      this.sidebarElement.style.transform = 'translateX(100%)';
      this.sidebar.state?.setVisible(false);
    }
  }

  /**
   * Toggle sidebar (required method)
   */
  toggle() {
    if (this.sidebarElement) {
      const isVisible = this.sidebarElement.style.transform === 'translateX(0px)';
      if (isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  /**
   * Set mode (required method)
   */
  setMode(mode) {
    if (this.sidebarElement) {
      this.sidebarElement.setAttribute('data-mode', mode);
    }
    this.sidebar.state?.setMode(mode);
  }

  /**
   * Update status (required method)
   */
  updateStatus(statusText) {
    // Basic status update - can be enhanced
  }

  /**
   * Remove processing indicator (required method)
   */
  removeProcessingIndicator() {
    const indicator = this.sidebarElement?.querySelector('.ai-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Clean assistant message (required method)
   */
  cleanAssistantMessage(content) {
    if (!content || typeof content !== 'string') return content;

    let cleaned = content;

    // Remove common AI response prefixes
    cleaned = cleaned.replace(/^(AI:|Assistant:|Response:|Answer:)\s*/i, '');

    // Remove markdown code block markers
    cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```/g, '').trim();
    });

    // Remove excessive line breaks (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    // Remove common AI response suffixes
    cleaned = cleaned.replace(/\s*(Is there anything else I can help you with\?|Let me know if you need further assistance\.|Hope this helps!|Feel free to ask if you have more questions\.)\s*$/i, '');

    // Clean up bullet points and lists
    cleaned = cleaned.replace(/^[\s]*[-*•]\s*/gm, '• ');

    // Remove excessive punctuation
    cleaned = cleaned.replace(/[.]{3,}/g, '...');
    cleaned = cleaned.replace(/[!]{2,}/g, '!');
    cleaned = cleaned.replace(/[?]{2,}/g, '?');

    // Clean up quotes
    cleaned = cleaned.replace(/[""]/g, '"');
    cleaned = cleaned.replace(/['']/g, "'");

    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.SidebarUIOld = SidebarUIOld;
}
