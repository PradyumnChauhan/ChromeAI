/**
 * ChromeAI Studio - Background Service Worker
 * Handles cross-tab communication, settings management, and background tasks
 */

class ChromeAIBackground {
  constructor() {
    this.activeConnections = new Map();
    this.settings = {
      autoDetectMode: true,
      showFloatingBubble: true,
      keyboardShortcuts: true,
      theme: 'auto',
      position: 'bottom-right',
      currentMode: 'student'
    };
    
    // Voice state management
    this.voiceState = {
      voiceModeEnabled: false,
      lastUpdated: null,
      activeTabId: null
    };
    
    // Per-origin permission tracking
    this.originPermissions = {};
    
    // Automation window management
    this.automationWindows = new Map(); // Map<taskId, {windowId, tabs, originTabId}>
    
    this.init();
  }

  async init() {

    // Load settings
    await this.loadSettings();

    // Load voice state
    await this.loadVoiceState();

    // Set up event listeners
    this.setupEventListeners();

    // Set up context menu
    await this.setupContextMenu();

    // Set up keyboard shortcuts
    this.setupKeyboardCommands();
  }

  setupEventListeners() {
    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle connections from content scripts
    chrome.runtime.onConnect.addListener((port) => {
      this.handleConnection(port);
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.onTabUpdated(tabId, changeInfo, tab);
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.onTabActivated(activeInfo);
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.onStorageChanged(changes, areaName);
    });
  }

  async setupContextMenu() {
    try {
      // Remove existing context menus
      await chrome.contextMenus.removeAll();

      // Main context menu
      chrome.contextMenus.create({
        id: 'chromeai-main',
        title: 'ChromeAI Studio',
        contexts: ['page', 'selection']
      });

      // Quick actions submenu
      chrome.contextMenus.create({
        id: 'chromeai-explain',
        parentId: 'chromeai-main',
        title: 'Explain this',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'chromeai-summarize',
        parentId: 'chromeai-main',
        title: 'Summarize',
        contexts: ['page', 'selection']
      });

      chrome.contextMenus.create({
        id: 'chromeai-translate',
        parentId: 'chromeai-main',
        title: 'Translate',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'chromeai-improve',
        parentId: 'chromeai-main',
        title: 'Improve writing',
        contexts: ['selection']
      });

      // Separator
      chrome.contextMenus.create({
        id: 'separator1',
        parentId: 'chromeai-main',
        type: 'separator',
        contexts: ['page', 'selection']
      });

      // Mode switching
      chrome.contextMenus.create({
        id: 'chromeai-mode-student',
        parentId: 'chromeai-main',
        title: 'Switch to Student Mode',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'chromeai-mode-developer',
        parentId: 'chromeai-main',
        title: 'Switch to Developer Mode',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'chromeai-mode-creator',
        parentId: 'chromeai-main',
        title: 'Switch to Creator Mode',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'chromeai-mode-researcher',
        parentId: 'chromeai-main',
        title: 'Switch to Researcher Mode',
        contexts: ['page']
      });

      // Separator
      chrome.contextMenus.create({
        id: 'separator2',
        parentId: 'chromeai-main',
        type: 'separator',
        contexts: ['page']
      });

      // Settings and help
      chrome.contextMenus.create({
        id: 'chromeai-toggle-sidebar',
        parentId: 'chromeai-main',
        title: 'Toggle Sidebar',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'chromeai-settings',
        parentId: 'chromeai-main',
        title: 'Settings',
        contexts: ['page']
      });

      // Handle context menu clicks
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        this.handleContextMenuClick(info, tab);
      });

    } catch (error) {
      console.error('Failed to setup context menu:', error);
    }
  }

  setupKeyboardCommands() {
    // Handle keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });
  }

  async onInstalled(details) {

    if (details.reason === 'install') {
      // First installation
      await this.showWelcomeMessage();
    } else if (details.reason === 'update') {
      // Extension updated
    }

    // Initialize default settings
    await this.initializeDefaultSettings();
  }

  async showWelcomeMessage() {
    try {
      // Create a new tab with welcome message
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('welcome/welcome.html'),
        active: true
      });
    } catch (error) {
      console.error('Failed to show welcome message:', error);
    }
  }

  async initializeDefaultSettings() {
    try {
      const result = await chrome.storage.local.get('chromeai_settings');
      
      if (!result.chromeai_settings) {
        await chrome.storage.local.set({
          chromeai_settings: this.settings
        });
      }
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {

      switch (message.type) {
        case 'GET_SETTINGS':
          sendResponse({ settings: this.settings });
          break;

        case 'UPDATE_SETTINGS':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'GET_TAB_INFO':
          const tabInfo = await this.getTabInfo(sender.tab.id);
          sendResponse(tabInfo);
          break;

        case 'ANALYZE_CONTENT':
          const analysis = await this.analyzeContent(message.content, sender.tab);
          sendResponse(analysis);
          break;

        case 'CROSS_TAB_MESSAGE':
          await this.broadcastToTabs(message.data, sender.tab.id);
          sendResponse({ success: true });
          break;

        case 'CHECK_AI_AVAILABILITY':
          const availability = await this.checkAIAvailability();
          sendResponse(availability);
          break;

        case 'LOG_USAGE':
          await this.logUsage(message.action, message.mode, sender.tab);
          sendResponse({ success: true });
          break;

        case 'GET_VOICE_MODE_STATE':
          const origin = sender.tab?.url ? new URL(sender.tab.url).origin : null;
          const response = {
            voiceModeEnabled: this.voiceState.voiceModeEnabled,
            microphoneGranted: origin ? this.originPermissions[origin]?.micGranted || false : false,
            activeTabId: this.voiceState.activeTabId,
            lastUpdated: this.voiceState.lastUpdated
          };
          sendResponse(response);
          break;

        case 'SAVE_VOICE_MODE_STATE':
          await this.saveVoiceState({
            voiceModeEnabled: message.voiceModeEnabled,
            activeTabId: sender.tab?.id || null
          });
          
          // Notify other tabs about voice mode change
          await this.broadcastToTabs({
            type: 'VOICE_MODE_CHANGED_OTHER_TAB',
            voiceModeEnabled: message.voiceModeEnabled,
            tabId: sender.tab?.id,
            origin: sender.tab?.url ? new URL(sender.tab.url).origin : null
          }, sender.tab?.id);
          
          sendResponse({ success: true });
          break;

        case 'SAVE_MIC_PERMISSION':
          const tabOrigin = sender.tab?.url ? new URL(sender.tab.url).origin : null;
          if (tabOrigin) {
            this.originPermissions[tabOrigin] = {
              micGranted: message.granted,
              timestamp: Date.now()
            };
            await this.saveOriginPermissions();
          }
          sendResponse({ success: true });
          break;

        case 'CHECK_ORIGIN_PERMISSION':
          const checkOrigin = sender.tab?.url ? new URL(sender.tab.url).origin : null;
          const hasPermission = checkOrigin ? this.originPermissions[checkOrigin]?.micGranted || false : false;
          sendResponse({ hasPermission, origin: checkOrigin });
          break;

        case 'CREATE_AUTOMATION_WINDOW':
          
          try {
            const windowResult = await this.createAutomationWindow(
              message.taskId,
              message.url,
              message.options,
              sender.tab?.id
            );
            sendResponse(windowResult);
          } catch (error) {
            console.error('🔍 DEBUG: [Background] Window creation failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'NAVIGATE_AUTOMATION_WINDOW':
          const navResult = await this.navigateAutomationWindow(
            message.taskId,
            message.url
          );
          sendResponse(navResult);
          break;
        
        case 'GET_TAB_URL':
          try {
            const tab = await chrome.tabs.get(message.tabId);
            sendResponse({ success: true, url: tab.url, title: tab.title });
          } catch (error) {
            sendResponse({ success: false, error: error.message, url: 'unknown' });
          }
          break;

        case 'CLOSE_AUTOMATION_WINDOW':
          const closeResult = await this.closeAutomationWindow(message.taskId);
          sendResponse(closeResult);
          break;

        case 'GET_AUTOMATION_WINDOW':
          const windowInfo = this.automationWindows.get(message.taskId);
          sendResponse(windowInfo || { exists: false });
          break;
        
        case 'CREATE_TAB_IN_WINDOW':
          // Create a new tab in the specified window
          try {
            const newTab = await chrome.tabs.create({
              windowId: message.windowId,
              url: message.url,
              active: false // Open in background
            });
            sendResponse({ success: true, tabId: newTab.id });
          } catch (error) {
            console.error(`❌ [Background] Failed to create tab:`, error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        
        case 'WAIT_FOR_PAGE_LOAD':
          // Wait for a tab to finish loading
          this.waitForTabLoad(message.tabId, message.timeout || 10000)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep channel open for async response

        case 'EXTRACT_FROM_TAB':
          // Forward extraction request to specific tab
          this.extractFromTab(message.tabId, message.dataType).then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // Keep channel open for async response
        
        case 'EXTRACT_SEARCH_RESULTS_FROM_TAB':
          // Forward search result extraction request to specific tab
          
          chrome.tabs.sendMessage(message.tabId, { type: 'EXTRACT_SEARCH_RESULTS' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error(`❌ [Background] Error sending message to tab ${message.tabId}:`, chrome.runtime.lastError.message);
              sendResponse({ 
                success: false, 
                error: chrome.runtime.lastError.message,
                results: [],
                debug: { error: chrome.runtime.lastError.message }
              });
            } else {
              
              // Log debug info if present
              if (response?.debug) {
                if (response.debug.hasRecaptcha) console.warn(`   ⚠️ CAPTCHA detected!`);
                if (response.debug.elementCounts) {
                }
              }
              
              // Forward complete response including debug info
              sendResponse(response || { success: false, results: [], debug: { error: 'No response from tab' } });
            }
          });
          return true; // Keep channel open for async response

        case 'OPEN_YOUTUBE_AND_PLAY':
          // Fast YouTube auto-play: extract URL and navigate directly
          
          // Handle this case asynchronously
          (async () => {
            try {
              // Create tab for YouTube search (background - we'll close it after extraction)
              const searchTab = await chrome.tabs.create({
                url: message.url,
                active: false  // Search in background - video will open in foreground
              });
              
              // Set up tab load listener to detect when search page is ready
              let extractionAttempted = false;
              const tabLoadListener = async (tabId, changeInfo, tab) => {
                if (tabId === searchTab.id && changeInfo.status === 'complete' && !extractionAttempted) {
                  extractionAttempted = true;
                  
                  try {
                    // Extract first video URL from search results with retries
                    
                    let extractionResult = null;
                    let attempts = 0;
                    const maxAttempts = 50; // Try up to 10 times
                    
                    while (attempts < maxAttempts && (!extractionResult || !extractionResult[0]?.result?.success)) {
                      attempts++;
                      
                      extractionResult = await chrome.scripting.executeScript({
                        target: { tabId: searchTab.id },
                        func: () => {
                          
                          // Try multiple selectors to find the first video
                          const selectors = [
                            'ytd-video-renderer a#video-title',
                            'ytd-video-renderer #video-title',
                            'ytd-video-renderer a[href^="/watch"]',
                            'a#video-title',
                            '#video-title',
                            'a[href^="/watch?v="]'
                          ];
                          
                          let firstVideo = null;
                          let selectorUsed = '';
                          
                          for (const selector of selectors) {
                            const element = document.querySelector(selector);
                            if (element && element.href) {
                              firstVideo = element;
                              selectorUsed = selector;
                              break;
                            }
                          }
                          
                          if (firstVideo && firstVideo.href) {
                            const videoTitle = firstVideo.textContent?.trim() || firstVideo.getAttribute('aria-label') || 'Unknown';
                            let videoUrl = firstVideo.href;
                            
                            // Ensure full URL
                            if (!videoUrl.startsWith('http')) {
                              videoUrl = `https://www.youtube.com${videoUrl}`;
                            }
                            
                            return {
                              success: true,
                              videoUrl: videoUrl,
                              videoTitle: videoTitle,
                              selectorUsed: selectorUsed
                            };
                          } else {
                            console.error('🎵 [Extract] Could not find any video element');
                            
                            // Fallback: try to get any video link
                            const allVideos = document.querySelectorAll('a[href^="/watch"]');
                            
                            if (allVideos.length > 0) {
                              const first = allVideos[0];
                              let videoUrl = first.href;
                              if (!videoUrl.startsWith('http')) {
                                videoUrl = `https://www.youtube.com${videoUrl}`;
                              }
                              return {
                                success: true,
                                videoUrl: videoUrl,
                                videoTitle: first.textContent?.trim() || 'Unknown',
                                selectorUsed: 'fallback'
                              };
                            }
                            
                            return { success: false, error: 'No video elements found', retry: true };
                          }
                        }
                      });
                      
                      // Check if we got a successful result
                      if (extractionResult && extractionResult[0]?.result?.success) {
                        break; // Success!
                      }
                      
                      // Wait a bit before retrying (except on last attempt)
                      if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
                      }
                    }
                    
                    if (extractionResult && extractionResult.length > 0 && extractionResult[0].result?.success) {
                      const { videoUrl, videoTitle } = extractionResult[0].result;
                      
                      // Close the search tab and open video URL in a new foreground tab
                      
                      // Create new tab for video (foreground)
                      const videoTab = await chrome.tabs.create({
                        url: videoUrl,
                        active: true  // Open in foreground
                      });
                      
                      // Close the search tab
                      chrome.tabs.remove(searchTab.id);
                      
                      // User will click play button manually - no auto-play needed
                      
                    } else {
                      console.error('🎵 [Background] Failed to extract video URL');
                      console.error('🎵 [Background] Extraction result structure:', extractionResult);
                      sendResponse({ success: false, error: 'Could not find video in search results' });
                    }
                    
                  } catch (error) {
                    console.error('🎵 [Background] Failed to extract video URL:', error);
                    sendResponse({ success: false, error: error.message });
                  }
                  
                  // Remove the tab load listener
                  chrome.tabs.onUpdated.removeListener(tabLoadListener);
                }
              };
              
              // Remove existing listener first to prevent duplicates
              chrome.tabs.onUpdated.removeListener(tabLoadListener);
              // Add the tab load listener (only one instance)
              chrome.tabs.onUpdated.addListener(tabLoadListener);
              
              // Also remove the listener after successful completion or timeout
              setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(tabLoadListener);
              }, 30000); // 30 seconds timeout
              
              sendResponse({ success: true, tabId: searchTab.id, message: `Playing ${message.query}` });
            } catch (error) {
              console.error('🎵 [Background] Failed to open YouTube:', error);
              console.error('🎵 [Background] Error details:', error.message);
              sendResponse({ success: false, error: error.message });
            }
          })();
          return true; // Keep channel open for async response
        
        case 'CHECK_LOGIN':
          // Check if tab requires login
          this.checkLoginInTab(message.tabId).then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ loginRequired: false, error: error.message });
          });
          return true; // Keep channel open for async response

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  handleConnection(port) {
    const tabId = port.sender.tab?.id;
    
    if (tabId) {
      this.activeConnections.set(tabId, port);
      
      port.onDisconnect.addListener(() => {
        this.activeConnections.delete(tabId);
      });
    }
  }

  onTabUpdated(tabId, changeInfo, tab) {
    // Handle tab updates (e.g., navigation)
    if (changeInfo.status === 'complete' && tab.url) {
      // Notify content script about tab update
      this.sendToTab(tabId, {
        type: 'TAB_UPDATED',
        url: tab.url,
        title: tab.title
      });
    }
  }

  onTabActivated(activeInfo) {
    // Handle tab activation
  }

  onStorageChanged(changes, areaName) {
    if (areaName === 'local' && changes.chromeai_settings) {
      // Settings changed, update local copy and broadcast to tabs
      this.settings = { ...this.settings, ...changes.chromeai_settings.newValue };
      
      this.broadcastToTabs({
        type: 'SETTINGS_CHANGED',
        settings: this.settings
      });
    }
  }

  async handleContextMenuClick(info, tab) {
    try {

      const message = {
        type: 'CONTEXT_MENU_ACTION',
        action: info.menuItemId,
        selectionText: info.selectionText,
        pageUrl: info.pageUrl
      };

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, message);

    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }

  async handleCommand(command) {
    try {

      // Get active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab) return;

      const message = {
        type: 'KEYBOARD_COMMAND',
        command: command
      };

      // Send command to content script
      await chrome.tabs.sendMessage(activeTab.id, message);

    } catch (error) {
      console.error('Error handling command:', error);
    }
  }

  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      
      await chrome.storage.local.set({
        chromeai_settings: this.settings
      });

      // Broadcast settings change to all tabs
      this.broadcastToTabs({
        type: 'SETTINGS_CHANGED',
        settings: this.settings
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('chromeai_settings');
      
      if (result.chromeai_settings) {
        this.settings = { ...this.settings, ...result.chromeai_settings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async getTabInfo(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId
      };
    } catch (error) {
      console.error('Failed to get tab info:', error);
      return null;
    }
  }

  async analyzeContent(content, tab) {
    try {
      // This would integrate with the AI APIs to analyze content
      // For now, return basic analysis
      
      const analysis = {
        contentType: this.detectContentType(content, tab.url),
        language: await this.detectLanguage(content),
        complexity: this.analyzeComplexity(content),
        suggestedMode: this.suggestMode(content, tab.url)
      };

      return analysis;
    } catch (error) {
      console.error('Failed to analyze content:', error);
      return null;
    }
  }

  detectContentType(content, url) {
    // Simple content type detection
    if (url.includes('github.com') || url.includes('gitlab.com')) {
      return 'code';
    }
    
    if (url.includes('stackoverflow.com') || url.includes('developer.mozilla.org')) {
      return 'technical';
    }
    
    if (content.length < 500) {
      return 'short';
    }
    
    if (content.includes('function') || content.includes('class') || content.includes('import')) {
      return 'code';
    }
    
    return 'article';
  }

  async detectLanguage(content) {
    // Simple language detection - in production, use Chrome's built-in API
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.detectLanguage(content);
      }
    } catch (error) {
      console.error('Language detection failed:', error);
    }
    
    return 'en'; // Default to English
  }

  analyzeComplexity(content) {
    // Simple complexity analysis
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (avgWordsPerSentence > 20) return 'high';
    if (avgWordsPerSentence > 10) return 'medium';
    return 'low';
  }

  suggestMode(content, url) {
    // Suggest appropriate mode based on content and URL
    if (url.includes('github.com') || content.includes('function') || content.includes('code')) {
      return 'developer';
    }
    
    if (url.includes('wikipedia.org') || url.includes('research') || url.includes('study')) {
      return 'researcher';
    }
    
    if (url.includes('blog') || url.includes('medium.com') || content.length > 2000) {
      return 'creator';
    }
    
    return 'student'; // Default
  }

  async broadcastToTabs(message, excludeTabId = null) {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.id !== excludeTabId) {
          try {
            await chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // Tab might not have content script injected, ignore
          }
        }
      }
    } catch (error) {
      console.error('Failed to broadcast to tabs:', error);
    }
  }

  async sendToTab(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      // Tab might not have content script injected, ignore
      console.warn('Failed to send message to tab:', tabId, error.message);
    }
  }

  async checkAIAvailability() {
    try {
      // Check if Chrome's built-in AI APIs are available
      const availability = {
        prompt: false,
        summarizer: false,
        writer: false,
        rewriter: false,
        translator: false,
        languageDetector: false
      };

      // This would check actual API availability
      // For now, assume they're available in supported browsers
      if (typeof chrome !== 'undefined') {
        availability.prompt = true;
        availability.summarizer = true;
        availability.writer = true;
        availability.rewriter = true;
        availability.translator = true;
        availability.languageDetector = true;
      }

      return availability;
    } catch (error) {
      console.error('Failed to check AI availability:', error);
      return {};
    }
  }

  async logUsage(action, mode, tab) {
    try {
      // Log usage statistics for analytics
      const logEntry = {
        timestamp: Date.now(),
        action: action,
        mode: mode,
        url: tab?.url,
        title: tab?.title
      };

      // Store in local storage (could also send to analytics service)
      const result = await chrome.storage.local.get('chromeai_usage_logs');
      const logs = result.chromeai_usage_logs || [];
      
      logs.push(logEntry);
      
      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await chrome.storage.local.set({
        chromeai_usage_logs: logs
      });
    } catch (error) {
      console.error('Failed to log usage:', error);
    }
  }

  // Voice state persistence methods
  async loadVoiceState() {
    try {
      const result = await chrome.storage.local.get(['chromeai_voice_state', 'chromeai_origin_permissions']);
      
      if (result.chromeai_voice_state) {
        this.voiceState = { ...this.voiceState, ...result.chromeai_voice_state };
      }
      
      if (result.chromeai_origin_permissions) {
        this.originPermissions = result.chromeai_origin_permissions;
      }
    } catch (error) {
      console.error('❌ Failed to load voice state:', error);
    }
  }

  async saveVoiceState(newState) {
    try {
      this.voiceState = { 
        ...this.voiceState, 
        ...newState,
        lastUpdated: Date.now()
      };
      
      await chrome.storage.local.set({
        chromeai_voice_state: this.voiceState
      });
    } catch (error) {
      console.error('❌ Failed to save voice state:', error);
    }
  }

  async saveOriginPermissions() {
    try {
      await chrome.storage.local.set({
        chromeai_origin_permissions: this.originPermissions
      });
    } catch (error) {
      console.error('❌ Failed to save origin permissions:', error);
    }
  }

  // Automation Window Management
  async createAutomationWindow(taskId, initialUrl, options = {}, originTabId) {
    try {
      
      // Check if automation window already exists for this task
      if (this.automationWindows.has(taskId)) {
        const existing = this.automationWindows.get(taskId);
        try {
          // Verify window still exists
          await chrome.windows.get(existing.windowId);
          return { success: true, windowId: existing.windowId, reused: true };
        } catch (e) {
          // Window was closed, remove from map
          this.automationWindows.delete(taskId);
        }
      }
      
      // Create new window with options
      const windowOptions = {
        url: initialUrl || 'about:blank',
        type: 'normal',
        focused: false,  // Never steal focus
        width: options.width || 1280,
        height: options.height || 720,
        state: 'normal'  // Must create as normal, then minimize
      };
      
      const window = await chrome.windows.create(windowOptions);
      
      // Minimize window if requested (Chrome doesn't allow creating minimized directly)
      if (options.state === 'minimized' || options.minimized) {
        try {
          await chrome.windows.update(window.id, { state: 'minimized' });
        } catch (e) {
          console.warn('Could not minimize window:', e);
          // Continue anyway - window is still usable
        }
      }
      
      // Store window reference
      this.automationWindows.set(taskId, {
        windowId: window.id,
        tabs: [window.tabs[0].id],
        originTabId: originTabId,
        created: Date.now(),
        taskId: taskId
      });
      
      return {
        success: true,
        windowId: window.id,
        tabId: window.tabs[0].id,
        reused: false
      };
      
    } catch (error) {
      console.error('❌ Failed to create automation window:', error);
      return { success: false, error: error.message };
    }
  }
  
  async navigateAutomationWindow(taskId, url) {
    try {
      
      const windowInfo = this.automationWindows.get(taskId);
      
      if (!windowInfo) {
        console.error('🔍 DEBUG: [Background] No window found for taskId:', taskId);
        console.error('🔍 DEBUG: [Background] Available taskIds:', Array.from(this.automationWindows.keys()));
        throw new Error(`No automation window found for task: ${taskId}`);
      }
      
      // Create new tab in automation window
      const tab = await chrome.tabs.create({
        windowId: windowInfo.windowId,
        url: url,
        active: false  // Don't activate the tab
      });
      
      // Add tab to tracking
      windowInfo.tabs.push(tab.id);
      
      return {
        success: true,
        tabId: tab.id,
        windowId: windowInfo.windowId
      };
      
    } catch (error) {
      console.error('❌ Failed to navigate automation window:', error);
      return { success: false, error: error.message };
    }
  }
  
  async closeAutomationWindow(taskId) {
    try {
      const windowInfo = this.automationWindows.get(taskId);
      
      if (!windowInfo) {
        console.warn(`No automation window found for task: ${taskId}`);
        return { success: true, message: 'Window already closed' };
      }
      
      try {
        await chrome.windows.remove(windowInfo.windowId);
      } catch (e) {
        console.warn('Window already closed or not found');
      }
      
      // Remove from tracking
      this.automationWindows.delete(taskId);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to close automation window:', error);
      return { success: false, error: error.message };
    }
  }
  
  async waitForTabLoad(tabId, timeout = 10000) {
    try {
      
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let checkCount = 0;
        
        const checkTab = async () => {
          try {
            checkCount++;
            const tab = await chrome.tabs.get(tabId);
            
            // Check if tab is fully loaded
            if (tab.status === 'complete') {
              resolve({ success: true, tabId: tabId, url: tab.url });
              return;
            }
            
            // Check timeout
            if (Date.now() - startTime > timeout) {
              console.warn(`⏰ [Background] Tab ${tabId} load timeout after ${timeout}ms (status: ${tab.status})`);
              resolve({ success: true, tabId: tabId, url: tab.url, timeout: true });
              return;
            }
            
            // Check again after a short delay
            setTimeout(checkTab, 100);
            
          } catch (error) {
            console.error(`❌ [Background] Error checking tab ${tabId}:`, error);
            reject(error);
          }
        };
        
        // Start checking
        checkTab();
      });
      
    } catch (error) {
      console.error(`❌ [Background] Failed to wait for tab load:`, error);
      return { success: false, error: error.message };
    }
  }

  // Check if tab requires login
  async checkLoginInTab(tabId) {
    try {
      
      // Wait for tab to be ready
      const tab = await chrome.tabs.get(tabId);
      if (tab.status !== 'complete') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Send login check request to tab
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CHECK_LOGIN_REQUIRED'
      });
      return response || { loginRequired: false };
      
    } catch (error) {
      console.error(`❌ Login check failed for tab ${tabId}:`, error);
      return {
        loginRequired: false,
        error: error.message
      };
    }
  }
  
  // Extract data from specific tab (used by autonomous agent)
  async extractFromTab(tabId, dataType) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        
        // Check if tab exists and is loaded
        const tab = await chrome.tabs.get(tabId);
        
        if (!tab) {
          throw new Error(`Tab ${tabId} not found`);
        }
        
        if (tab.status !== 'complete') {
          
          // Wait for tab to load
          await new Promise((resolve, reject) => {
            const listener = (updatedTabId, changeInfo) => {
              if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
            
            // Timeout after 15 seconds
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve(); // Continue anyway
            }, 15000);
          });
        }
        
        // Give content script more time to initialize (especially on first load)
        const waitTime = attempt === 1 ? 1500 : 500;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Send extraction request to target tab
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'EXTRACT_DATA',
          dataType: dataType
        });
        
        // Verify response is valid
        if (!response) {
          throw new Error('No response received from content script');
        }
        
        if (response.success === false) {
          throw new Error(response.error || 'Extraction failed in content script');
        }
        return response;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed for tab ${tabId}:`, error);
        lastError = error;
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const backoffTime = 1000 * attempt;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // All attempts failed
    console.error(`❌ All ${maxRetries} extraction attempts failed for tab ${tabId}`);
    return {
      success: false,
      error: lastError?.message || 'Extraction failed after multiple attempts',
      data: null
    };
  }

  // Cleanup methods
  async cleanup() {
    // Clean up old data, logs, etc.
    try {
      const result = await chrome.storage.local.get(['chromeai_usage_logs']);
      
      if (result.chromeai_usage_logs) {
        const logs = result.chromeai_usage_logs;
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
        
        const filteredLogs = logs.filter(log => log.timestamp > cutoffTime);
        
        await chrome.storage.local.set({
          chromeai_usage_logs: filteredLogs
        });
      }
      
      // Clean up stale automation windows (older than 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const [taskId, windowInfo] of this.automationWindows.entries()) {
        if (windowInfo.created < oneHourAgo) {
          await this.closeAutomationWindow(taskId);
        }
      }
      
    } catch (error) {
      console.error('Failed to cleanup:', error);
    }
  }
}

// Initialize background service worker
const chromeAIBackground = new ChromeAIBackground();

// Schedule periodic cleanup
setInterval(() => {
  chromeAIBackground.cleanup();
}, 24 * 60 * 60 * 1000); // Once per day

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChromeAIBackground;
}