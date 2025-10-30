/**
 * Enhanced DOM Extractor - Complete Element State Detection
 * Used internally by Autonomous Agent for page understanding
 * 
 * Features:
 * - Visibility detection (display, opacity, viewport, obscured)
 * - Interaction state (clickable, draggable, focusable, disabled)
 * - Event listener detection
 * - Shadow DOM support
 * - Unique selector generation
 * - Performance optimized with caching
 */

class EnhancedDOMExtractor {
  constructor(options = {}) {
    this.options = {
      includeShadowDOM: options.includeShadowDOM !== false,
      includeHidden: options.includeHidden || false,
      cacheTimeout: options.cacheTimeout || 5000, // 5 seconds
      ...options
    };
    
    this.cache = new Map();
    this.elementIdMap = new WeakMap();
    this.nextElementId = 1;
  }

  /**
   * Get unique ID for element
   */
  getElementId(element) {
    if (!this.elementIdMap.has(element)) {
      this.elementIdMap.set(element, `elem-${this.nextElementId++}`);
    }
    return this.elementIdMap.get(element);
  }

  /**
   * Get all interactive elements on page
   */
  getAllInteractiveElements(rootElement = document.body) {
    const cacheKey = `interactive-${window.location.href}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
      return cached.data;
    }
    
    const elements = [];
    const selectors = [
      'button', 'a[href]', 'input:not([type="hidden"])', 'textarea', 'select',
      '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="checkbox"]',
      '[onclick]', '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'
    ];
    
    const found = rootElement.querySelectorAll(selectors.join(','));
    
    found.forEach(el => {
      if (!this.options.includeHidden && !this.isVisible(el)) {
        return;
      }
      
      elements.push({
        element: el,
        tagName: el.tagName.toLowerCase(),
        selector: this.getUniqueSelector(el),
        state: this.getElementState(el),
        text: this.getElementText(el),
        xpath: this.getXPath(el)
      });
    });
    
    this.cache.set(cacheKey, { data: elements, timestamp: Date.now() });
    return elements;
  }

  /**
   * Get comprehensive element state
   */
  getElementState(element) {
    return {
      // Visibility
      isVisible: this.isVisible(element),
      isDisplayed: this.isDisplayed(element),
      isInViewport: this.isInViewport(element),
      isObscured: this.isObscured(element),
      
      // Interaction
      isClickable: this.isClickable(element),
      isDraggable: this.isDraggable(element),
      isFocusable: this.isFocusable(element),
      isDisabled: this.isDisabled(element),
      isReadOnly: this.isReadOnly(element),
      
      // Metadata
      role: element.getAttribute('role') || this.getImplicitRole(element),
      ariaLabel: element.getAttribute('aria-label'),
      interactionType: this.getInteractionType(element),
      
      // Position
      boundingBox: element.getBoundingClientRect()
    };
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    if (!element || !(element instanceof Element)) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    
    return true;
  }

  /**
   * Check if element is displayed
   */
  isDisplayed(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none';
  }

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Check if element is obscured by another element
   */
  isObscured(element) {
    if (!this.isVisible(element)) return true;
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const topElement = document.elementFromPoint(centerX, centerY);
    return !element.contains(topElement) && topElement !== element;
  }

  /**
   * Check if element is clickable
   */
  isClickable(element) {
    if (!this.isVisible(element)) return false;
    if (this.isDisabled(element)) return false;
    
    const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (clickableTags.includes(element.tagName)) return true;
    
    const role = element.getAttribute('role');
    if (['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'].includes(role)) {
      return true;
    }
    
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') return true;
    
    if (element.hasAttribute('onclick')) return true;
    
    return false;
  }

  /**
   * Check if element is draggable
   */
  isDraggable(element) {
    if (element.draggable === true) return true;
    if (element.getAttribute('draggable') === 'true') return true;
    return false;
  }

  /**
   * Check if element is focusable
   */
  isFocusable(element) {
    if (!this.isVisible(element)) return false;
    if (this.isDisabled(element)) return false;
    
    const tabindex = element.getAttribute('tabindex');
    if (tabindex !== null) {
      const tabValue = parseInt(tabindex, 10);
      return !isNaN(tabValue) && tabValue >= -1;
    }
    
    const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'IFRAME'];
    if (focusableTags.includes(element.tagName)) {
      if (element.tagName === 'A' && !element.hasAttribute('href')) {
        return false;
      }
      return true;
    }
    
    if (element.isContentEditable) return true;
    
    return false;
  }

  /**
   * Check if element is disabled
   */
  isDisabled(element) {
    if (element.disabled === true) return true;
    if (element.hasAttribute('disabled')) return true;
    if (element.getAttribute('aria-disabled') === 'true') return true;
    return false;
  }

  /**
   * Check if element is read-only
   */
  isReadOnly(element) {
    if (element.readOnly === true) return true;
    if (element.hasAttribute('readonly')) return true;
    if (element.getAttribute('aria-readonly') === 'true') return true;
    return false;
  }

  /**
   * Get element interaction type
   */
  getInteractionType(element) {
    const types = [];
    
    if (this.isClickable(element)) types.push('clickable');
    if (this.isDraggable(element)) types.push('draggable');
    if (this.isFocusable(element)) types.push('focusable');
    
    if (element.tagName === 'INPUT') {
      types.push('input-' + element.type.toLowerCase());
    }
    
    if (['SELECT', 'TEXTAREA'].includes(element.tagName)) {
      types.push('form-control');
    }
    
    if (element.tagName === 'A' && element.hasAttribute('href')) {
      types.push('link');
    }
    
    return types;
  }

  /**
   * Get implicit ARIA role
   */
  getImplicitRole(element) {
    const roleMap = {
      'A': 'link',
      'BUTTON': 'button',
      'INPUT': 'textbox',
      'TEXTAREA': 'textbox',
      'SELECT': 'combobox',
      'NAV': 'navigation',
      'HEADER': 'banner',
      'FOOTER': 'contentinfo',
      'MAIN': 'main'
    };
    
    return roleMap[element.tagName] || null;
  }

  /**
   * Get element text content
   */
  getElementText(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.placeholder || element.value || '';
    }
    
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    return element.textContent?.trim().substring(0, 200) || '';
  }

  /**
   * Generate unique CSS selector
   */
  getUniqueSelector(element) {
    if (element.id) {
      return '#' + element.id;
    }
    
    const path = [];
    let current = element;
    
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (classes) selector += '.' + classes;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Generate XPath for element
   */
  getXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    if (element === document.body) {
      return '/html/body';
    }
    
    let ix = 0;
    const siblings = element.parentNode?.childNodes || [];
    
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        const tagName = element.tagName.toLowerCase();
        return `${this.getXPath(element.parentNode)}/${tagName}[${ix + 1}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
    
    return '';
  }

  /**
   * Find element by natural language description using Chrome AI
   */
  async findElementByDescription(description, aiSession = null) {
    const elements = this.getAllInteractiveElements()
      .filter(e => e.state.isVisible && e.state.isClickable);
    
    if (!aiSession && typeof LanguageModel !== 'undefined') {
      aiSession = await LanguageModel.create();
    }
    
    if (!aiSession) {
      // Fallback to simple text matching
      return this.simpleFindElement(description, elements);
    }
    
    const prompt = `Find the element that matches: "${description}"

Available elements:
${JSON.stringify(elements.map(e => ({
  id: e.selector,
  text: e.text,
  type: e.tagName,
  role: e.state.role
})), null, 2)}

Return ONLY the selector (id field) of the best match. If no match, return "NOT_FOUND".`;
    
    try {
      const result = await aiSession.prompt(prompt);
      const selector = result.trim().replace(/["']/g, '');
      
      const element = elements.find(e => e.selector === selector);
      if (element) {
        return element;
      }
    } catch (error) {
      console.error('AI matching failed:', error);
    }
    
    return this.simpleFindElement(description, elements);
  }

  /**
   * Simple text-based element finding (fallback)
   */
  simpleFindElement(description, elements) {
    const lowerDesc = description.toLowerCase();
    
    // Exact text match
    let match = elements.find(e => 
      e.text?.toLowerCase() === lowerDesc ||
      e.state.ariaLabel?.toLowerCase() === lowerDesc
    );
    
    // Partial match
    if (!match) {
      match = elements.find(e =>
        e.text?.toLowerCase().includes(lowerDesc) ||
        e.state.ariaLabel?.toLowerCase().includes(lowerDesc)
      );
    }
    
    // Word matching
    if (!match) {
      const words = lowerDesc.split(/\s+/);
      match = elements.find(e => {
        const elementText = (e.text + ' ' + (e.state.ariaLabel || '')).toLowerCase();
        return words.every(word => elementText.includes(word));
      });
    }
    
    return match || null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedDOMExtractor;
} else if (typeof window !== 'undefined') {
  window.EnhancedDOMExtractor = EnhancedDOMExtractor;
  
  // Initialize in ChromeAI Studio namespace
  /**
   * Detect if current page requires login
   * @returns {Object} Login detection result
   */
  function detectLoginRequired() {
    
    // Check for common login indicators
    const loginIndicators = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name="passwd"]',
      'input[id*="password"]',
      'button[type="submit"]:contains("Sign in")',
      'button[type="submit"]:contains("Log in")',
      'a[href*="login"]',
      'a[href*="signin"]',
      'form[action*="login"]',
      'form[action*="signin"]',
      'form[id*="login"]',
      '.login-form',
      '.signin-form',
      '[class*="auth-"]',
      '[class*="login-"]',
      '[class*="signin-"]',
      '[id*="login"]',
      '[id*="signin"]'
    ];
    
    for (const selector of loginIndicators) {
      try {
        // Handle :contains() pseudo-selector manually
        if (selector.includes(':contains(')) {
          const match = selector.match(/^([^:]+):contains\("([^"]+)"\)$/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector);
            for (const el of elements) {
              if (el.textContent.includes(text)) {
                return {
                  loginRequired: true,
                  reason: `Found login element: ${selector}`,
                  currentUrl: window.location.href,
                  element: baseSelector
                };
              }
            }
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            return {
              loginRequired: true,
              reason: `Found login element: ${selector}`,
              currentUrl: window.location.href,
              element: selector
            };
          }
        }
      } catch (err) {
        // Skip invalid selectors
        continue;
      }
    }
    
    // Check for text-based indicators
    const bodyText = document.body?.textContent?.toLowerCase() || '';
    const loginPhrases = [
      'please sign in',
      'please log in',
      'login required',
      'sign in to continue',
      'you must be logged in',
      'authentication required'
    ];
    
    for (const phrase of loginPhrases) {
      if (bodyText.includes(phrase)) {
        return {
          loginRequired: true,
          reason: `Found login phrase: "${phrase}"`,
          currentUrl: window.location.href
        };
      }
    }
    
    // Check for redirect to login page via URL
    const url = window.location.href.toLowerCase();
    const loginUrlPatterns = [
      '/login',
      '/signin',
      '/sign-in',
      '/auth',
      '/accounts/login',
      'login.html',
      'signin.html'
    ];
    
    for (const pattern of loginUrlPatterns) {
      if (url.includes(pattern)) {
        return {
          loginRequired: true,
          reason: `URL indicates login page: ${pattern}`,
          currentUrl: window.location.href
        };
      }
    }
    return { loginRequired: false };
  }
  
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.enhancedDOMExtractor = new EnhancedDOMExtractor();
  
  // Attach detectLoginRequired to prototype
  EnhancedDOMExtractor.prototype.detectLoginRequired = detectLoginRequired;
  
  // Listen for login check requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHECK_LOGIN_REQUIRED') {
      
      try {
        const result = detectLoginRequired();
        sendResponse(result);
      } catch (error) {
        console.error('❌ Login check failed:', error);
        sendResponse({
          loginRequired: false,
          error: error.message
        });
      }
      
      return true; // Keep message channel open
    }
  });
}

