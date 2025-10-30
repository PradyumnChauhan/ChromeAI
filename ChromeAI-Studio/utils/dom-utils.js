/**
 * ChromeAI Studio - DOM Utilities
 * Helper functions for DOM manipulation and content extraction
 */

class DOMUtils {
  constructor() {
    this.namespace = 'chromeai-studio';
    this.mutationObserver = null;
    this.injectedElements = new Set();
  }

  /**
   * Safely inject CSS into the page
   */
  injectCSS(css, id = null) {
    try {
      const existingStyle = id ? document.getElementById(id) : null;
      if (existingStyle) {
        existingStyle.textContent = css;
        return existingStyle;
      }

      const style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = css;
      
      if (id) {
        style.id = id;
      }
      
      document.head.appendChild(style);
      this.injectedElements.add(style);
      
      return style;
    } catch (error) {
      console.error('Failed to inject CSS:', error);
      return null;
    }
  }

  /**
   * Create element with namespace and classes
   */
  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    // Add namespace class
    element.classList.add(this.namespace);
    
    // Add custom classes
    if (options.className) {
      const classes = options.className.split(' ').filter(cls => cls.trim() !== '');
      if (classes.length > 0) {
        element.classList.add(...classes);
      }
    }
    
    // Set attributes
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    // Set content
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    
    // Set styles
    if (options.styles) {
      Object.assign(element.style, options.styles);
    }
    
    // Add event listeners
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        element.addEventListener(event, handler);
      });
    }
    
    return element;
  }

  /**
   * Find optimal position for floating elements
   */
  findOptimalPosition(element, preferredPosition = 'bottom-right') {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check for available space in different positions
    const positions = {
      'top-left': { top: 20, left: 20 },
      'top-right': { top: 20, right: 20 },
      'bottom-left': { bottom: 20, left: 20 },
      'bottom-right': { bottom: 20, right: 20 },
      'center': { 
        top: (viewportHeight - rect.height) / 2, 
        left: (viewportWidth - rect.width) / 2 
      }
    };
    
    // Try preferred position first
    if (positions[preferredPosition]) {
      const pos = positions[preferredPosition];
      if (this.isPositionClear(pos, rect)) {
        return pos;
      }
    }
    
    // Try other positions
    for (const [name, pos] of Object.entries(positions)) {
      if (name !== preferredPosition && this.isPositionClear(pos, rect)) {
        return pos;
      }
    }
    
    // Fallback to preferred position
    return positions[preferredPosition] || positions['bottom-right'];
  }

  /**
   * Check if position is clear of other elements
   */
  isPositionClear(position, elementRect) {
    // This is a simplified check - in production, you might want more sophisticated collision detection
    const buffer = 10;
    let testX, testY;
    
    if (position.left !== undefined) {
      testX = position.left;
    } else if (position.right !== undefined) {
      testX = window.innerWidth - position.right - elementRect.width;
    } else {
      testX = position.left || 0;
    }
    
    if (position.top !== undefined) {
      testY = position.top;
    } else if (position.bottom !== undefined) {
      testY = window.innerHeight - position.bottom - elementRect.height;
    } else {
      testY = position.top || 0;
    }
    
    // Check if position is within viewport
    return testX >= 0 && 
           testY >= 0 && 
           testX + elementRect.width <= window.innerWidth &&
           testY + elementRect.height <= window.innerHeight;
  }

  /**
   * Safely remove element from DOM
   */
  removeElement(element) {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
        this.injectedElements.delete(element);
      }
    } catch (error) {
      console.error('Failed to remove element:', error);
    }
  }

  /**
   * Add smooth animations to elements
   */
  animateIn(element, animation = 'fadeIn') {
    const animations = {
      fadeIn: [
        { opacity: 0, transform: 'scale(0.9)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      slideInFromRight: [
        { transform: 'translateX(100%)' },
        { transform: 'translateX(0)' }
      ],
      slideInFromBottom: [
        { transform: 'translateY(100%)' },
        { transform: 'translateY(0)' }
      ],
      bounceIn: [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.1)', opacity: 1, offset: 0.8 },
        { transform: 'scale(1)', opacity: 1 }
      ]
    };
    
    const keyframes = animations[animation] || animations.fadeIn;
    
    return element.animate(keyframes, {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
  }

  /**
   * Add smooth exit animations
   */
  animateOut(element, animation = 'fadeOut') {
    const animations = {
      fadeOut: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.9)' }
      ],
      slideOutToRight: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(100%)' }
      ],
      slideOutToBottom: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(100%)' }
      ]
    };
    
    const keyframes = animations[animation] || animations.fadeOut;
    
    const animationInstance = element.animate(keyframes, {
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    
    animationInstance.onfinish = () => {
      this.removeElement(element);
    };
    
    return animationInstance;
  }

  /**
   * Get high z-index that won't interfere with page elements
   */
  getHighZIndex() {
    // Use cached value if available and recent
    if (this._cachedZIndex && (Date.now() - this._zIndexCacheTime) < 5000) {
      return this._cachedZIndex;
    }
    
    // Use maximum z-index for ChromeAI elements
    const maxZIndex = 2147483647;
    
    this._cachedZIndex = maxZIndex;
    this._zIndexCacheTime = Date.now();
    
    return maxZIndex;
  }

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  /**
   * Scroll element into view smoothly
   */
  scrollIntoView(element, options = {}) {
    const defaultOptions = {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
  }

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Setup mutation observer for dynamic content
   */
  observeChanges(callback, options = {}) {
    const defaultOptions = {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false
    };
    
    this.mutationObserver = new MutationObserver(callback);
    this.mutationObserver.observe(document.body, { ...defaultOptions, ...options });
    
    return this.mutationObserver;
  }

  /**
   * Stop observing changes
   */
  stopObserving() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * Check if extension UI should be shown on current page
   */
  shouldShowUI() {
    // Don't show on extension pages, about pages, etc.
    const skipPatterns = [
      /chrome-extension:/,
      /moz-extension:/,
      /about:/,
      /chrome:/,
      /edge:/,
      /opera:/,
      /vivaldi:/,
      /brave:/
    ];
    
    const url = window.location.href;
    return !skipPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Clean up all injected elements
   */
  cleanup() {
    this.injectedElements.forEach(element => {
      this.removeElement(element);
    });
    this.injectedElements.clear();
    this.stopObserving();
  }

  /**
   * Wait for element to exist in DOM
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Timeout after specified time
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Create backdrop for modals
   */
  createBackdrop(options = {}) {
    const backdrop = this.createElement('div', {
      className: 'ai-backdrop',
      styles: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: options.color || 'rgba(0, 0, 0, 0.5)',
        zIndex: options.zIndex || this.getHighZIndex(),
        opacity: '0',
        transition: 'opacity 0.3s ease'
      },
      events: {
        click: options.onClick || (() => {})
      }
    });
    
    document.body.appendChild(backdrop);
    
    // Fade in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
    });
    
    return backdrop;
  }

  /**
   * Create loading spinner
   */
  createSpinner(size = 'medium') {
    const sizes = {
      small: '16px',
      medium: '24px',
      large: '32px'
    };
    
    const spinner = this.createElement('div', {
      className: 'ai-spinner',
      styles: {
        width: sizes[size],
        height: sizes[size],
        border: '2px solid var(--ai-border)',
        borderTop: '2px solid var(--ai-primary)',
        borderRadius: '50%',
        animation: 'ai-spin 0.8s linear infinite'
      }
    });
    
    return spinner;
  }
}

// Create and export singleton instance
const domUtils = new DOMUtils();

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.domUtils = domUtils;
}