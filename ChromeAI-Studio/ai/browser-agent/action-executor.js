/**
 * Action Executor - Perform browser automation actions
 * Used by Autonomous Agent to execute planned steps
 * 
 * Features:
 * - Smart element finding with AI
 * - Reliable click/type/navigate actions
 * - Automatic scrolling and wait conditions
 * - Form filling and data entry
 * - Error recovery
 */

class ActionExecutor {
  constructor(domExtractor) {
    this.domExtractor = domExtractor;
    this.options = {
      typeDelay: 50, // ms between keystrokes
      clickDelay: 100, // ms before click
      scrollSpeed: 'smooth',
      defaultTimeout: 10000
    };
    
    this.actionHistory = [];
    
    
  }

  /**
   * Navigate to URL (uses dedicated automation window)
   */
  async navigate(url) {
    try {
      
      
      // Normalize URL
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.')) {
          fullUrl = `https://${url}`;
        } else {
          fullUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
      }
      
      
      
      // Get taskId from memory (if available)
      const taskId = window.ChromeAIStudio?.agentMemory?.currentTask?.description || 
                     'task_' + Date.now();
      
      // Send message to background script to navigate in automation window
      const response = await chrome.runtime.sendMessage({
        type: 'NAVIGATE_AUTOMATION_WINDOW',
        taskId: taskId,
        url: fullUrl
      });
      
      if (response.success) {
        
        
        this.recordAction('navigate', true, fullUrl);
        
        // Wait for tab to load (longer for slow sites like news/ranking sites)
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        return { 
          success: true, 
          url: fullUrl, 
          tabId: response.tabId,
          windowId: response.windowId,
          message: `Opened ${fullUrl} in automation window`
        };
      } else {
        throw new Error(response.error || 'Failed to navigate in automation window');
      }
      
    } catch (error) {
      console.error('❌ Navigate failed:', error);
      this.recordAction('navigate', false, null, error.message);
      throw error;
    }
  }

  /**
   * Smart click - Find element by description and click
   */
  async smartClick(description) {
    try {
      
      
      // Find element using DOM extractor + AI
      const elementData = await this.domExtractor.findElementByDescription(description);
      
      if (!elementData) {
        throw new Error(`Element not found: "${description}"`);
      }
      
      const element = document.querySelector(elementData.selector);
      if (!element) {
        throw new Error(`Could not locate element with selector: ${elementData.selector}`);
      }
      
      // Verify element is clickable
      if (!elementData.state.isClickable || !elementData.state.isVisible) {
        throw new Error(`Element found but not clickable: ${description}`);
      }
      
      // Scroll into view if needed
      if (!elementData.state.isInViewport) {
        element.scrollIntoView({ behavior: this.options.scrollSpeed, block: 'center' });
        await this.wait(300);
      }
      
      // Delay before click
      if (this.options.clickDelay > 0) {
        await this.wait(this.options.clickDelay);
      }
      
      // Click
      element.click();
      
      // Also dispatch events for frameworks
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      const result = `Clicked: ${element.textContent?.substring(0, 50) || description}`;
      
      
      this.recordAction('click', true, result);
      return { success: true, message: result };
      
    } catch (error) {
      console.error('❌ Smart click failed:', error);
      this.recordAction('click', false, null, error.message);
      throw error;
    }
  }

  /**
   * Smart type - Find input field and type text
   */
  async smartType(fieldDescription, text) {
    try {
      // Convert text to string
      const textStr = String(text || '');
      
      
      
      // Find input field
      const elementData = await this.domExtractor.findElementByDescription(fieldDescription);
      
      if (!elementData) {
        throw new Error(`Input field not found: "${fieldDescription}"`);
      }
      
      const element = document.querySelector(elementData.selector);
      if (!element) {
        throw new Error(`Could not locate field: ${elementData.selector}`);
      }
      
      // Focus element
      element.focus();
      await this.wait(100);
      
      // Clear existing value
      element.value = '';
      
      // Type character by character
      for (let char of textStr) {
        element.value += char;
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: char
        }));
        
        if (this.options.typeDelay > 0) {
          await this.wait(this.options.typeDelay);
        }
      }
      
      // Dispatch change event
      element.dispatchEvent(new Event('change', {
        bubbles: true,
        cancelable: true
      }));
      
      const result = `Typed: "${text}" into ${element.tagName}`;
      
      
      this.recordAction('type', true, result);
      return { success: true, message: result };
      
    } catch (error) {
      console.error('❌ Smart type failed:', error);
      this.recordAction('type', false, null, error.message);
      throw error;
    }
  }

  /**
   * Search using Google (ALWAYS navigates to Google, never uses current page)
   */
  async search(query) {
    try {
      
      // ALWAYS use Google for searches (more reliable than current page's search)
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      
      // Get taskId from memory (same as navigate())
      const taskId = window.ChromeAIStudio?.agentMemory?.currentTask?.description || 
                     'task_' + Date.now();
      
      
      
      // Send message to background script to open in automation window
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'NAVIGATE_AUTOMATION_WINDOW',
          taskId: taskId,  // ✅ ADDED taskId!
          url: googleUrl
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Failed to search:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response?.success) {
            
            this.recordAction('search', true, `Searched: ${query}`);
            
            // Wait for page to load (longer for Google to render all results)
            setTimeout(() => {
              resolve({ 
                success: true, 
                message: `Searched Google for: ${query}`,
                tabId: response.tabId,
                windowId: response.windowId,
                url: googleUrl
              });
            }, 3000);
          } else {
            const error = response?.error || 'Unknown error';
            console.error('❌ Search failed:', error);
            this.recordAction('search', false, null, error);
            reject(new Error(error));
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      this.recordAction('search', false, null, error.message);
      throw error;
    }
  }

  /**
   * Scroll page
   */
  async scroll(direction, amount = 500) {
    try {
      
      
      switch (direction.toLowerCase()) {
        case 'down':
          window.scrollBy({ top: amount, behavior: this.options.scrollSpeed });
          break;
        case 'up':
          window.scrollBy({ top: -amount, behavior: this.options.scrollSpeed });
          break;
        case 'top':
          window.scrollTo({ top: 0, behavior: this.options.scrollSpeed });
          break;
        case 'bottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: this.options.scrollSpeed });
          break;
        default:
          throw new Error(`Unknown scroll direction: ${direction}`);
      }
      
      await this.wait(300); // Wait for scroll to complete
      
      const result = `Scrolled: ${direction}`;
      this.recordAction('scroll', true, result);
      return { success: true, message: result };
      
    } catch (error) {
      console.error('❌ Scroll failed:', error);
      this.recordAction('scroll', false, null, error.message);
      throw error;
    }
  }

  /**
   * Wait for condition or duration
   */
  async wait(msOrCondition) {
    if (typeof msOrCondition === 'number') {
      return new Promise(resolve => setTimeout(resolve, msOrCondition));
    } else if (typeof msOrCondition === 'function') {
      const startTime = Date.now();
      
      while (Date.now() - startTime < this.options.defaultTimeout) {
        if (await msOrCondition()) {
          return true;
        }
        await this.wait(100);
      }
      
      throw new Error('Wait condition timeout');
    } else if (typeof msOrCondition === 'string') {
      // Wait for element to appear
      return this.waitForElement(msOrCondition);
    }
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(description, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const element = await this.domExtractor.findElementByDescription(description);
        if (element && element.state.isVisible) {
          return element;
        }
      } catch (e) {
        // Continue waiting
      }
      
      await this.wait(500);
    }
    
    throw new Error(`Element not found within ${timeout}ms: ${description}`);
  }

  /**
   * Fill form with data object
   */
  async fillForm(formData) {
    try {
      
      
      const results = [];
      
      for (const [fieldName, value] of Object.entries(formData)) {
        try {
          await this.smartType(fieldName, value.toString());
          results.push({ field: fieldName, success: true, value });
        } catch (error) {
          console.warn(`⚠️ Failed to fill field ${fieldName}:`, error);
          results.push({ field: fieldName, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const result = `Filled ${successCount}/${results.length} form fields`;
      
      this.recordAction('fillForm', true, result);
      return { success: true, results, message: result };
      
    } catch (error) {
      console.error('❌ Fill form failed:', error);
      this.recordAction('fillForm', false, null, error.message);
      throw error;
    }
  }

  /**
   * Record action in history
   */
  recordAction(action, success, result = null, error = null) {
    this.actionHistory.push({
      action,
      success,
      result,
      error,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    // Limit history size
    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }
  }

  /**
   * Get action history
   */
  getHistory() {
    return this.actionHistory;
  }

  /**
   * Clear action history
   */
  clearHistory() {
    this.actionHistory = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActionExecutor;
} else if (typeof window !== 'undefined') {
  window.ActionExecutor = ActionExecutor;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  if (window.ChromeAIStudio.enhancedDOMExtractor) {
    window.ChromeAIStudio.actionExecutor = new ActionExecutor(window.ChromeAIStudio.enhancedDOMExtractor);
    
  }
}
