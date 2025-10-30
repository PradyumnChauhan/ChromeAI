/**
 * ChromeAI Studio - Theme Manager
 * Handles theme detection and switching based on Chrome's light/dark mode
 * Uses INVERSE logic: dark theme when Chrome is light, light theme when Chrome is dark
 */

class ChromeAIThemeManager {
  constructor() {
    this.currentTheme = 'auto';
    this.mediaQuery = null;
    this.initialized = false;
    
    // Theme configuration
    this.themes = {
      // When Chrome is in LIGHT mode, use DARK theme
      dark: {
        // Background colors
        '--ai-bg': '#1a1a1a',
        '--ai-bg-secondary': '#2d2d2d',
        '--ai-bg-tertiary': '#404040',
        '--ai-surface': '#242424',
        '--ai-surface-elevated': '#333333',
        
        // Text colors
        '--ai-text': '#ffffff',
        '--ai-text-primary': '#ffffff',
        '--ai-text-secondary': '#b3b3b3',
        '--ai-text-muted': '#888888',
        '--ai-text-inverse': '#1a1a1a',
        
        // Border colors
        '--ai-border': '#404040',
        '--ai-border-light': '#333333',
        '--ai-border-focus': '#4285f4',
        
        // Interactive states
        '--ai-hover': '#333333',
        '--ai-hover-light': '#404040',
        '--ai-active': '#4285f4',
        '--ai-focus': '#4285f4',
        
        // Shadows
        '--ai-shadow': 'rgba(0, 0, 0, 0.5)',
        '--ai-shadow-light': 'rgba(0, 0, 0, 0.3)',
        '--ai-shadow-elevated': '0 8px 32px rgba(0, 0, 0, 0.6)',
        
        // Backdrop filters
        '--ai-backdrop': 'rgba(26, 26, 26, 0.9)',
        '--ai-backdrop-blur': 'blur(20px)',
        
        // Component specific
        '--ai-input-bg': '#333333',
        '--ai-input-border': '#555555',
        '--ai-button-secondary-bg': '#333333',
        '--ai-button-secondary-hover': '#404040',
        '--ai-card-bg': '#242424',
        '--ai-tooltip-bg': '#333333',
        '--ai-overlay-bg': 'rgba(0, 0, 0, 0.8)'
      },
      
      // When Chrome is in DARK mode, use LIGHT theme  
      light: {
        // Background colors
        '--ai-bg': '#ffffff',
        '--ai-bg-secondary': '#f8f9fa',
        '--ai-bg-tertiary': '#e8eaed',
        '--ai-surface': '#ffffff',
        '--ai-surface-elevated': '#ffffff',
        
        // Text colors
        '--ai-text': '#202124',
        '--ai-text-primary': '#202124',
        '--ai-text-secondary': '#5f6368',
        '--ai-text-muted': '#9aa0a6',
        '--ai-text-inverse': '#ffffff',
        
        // Border colors
        '--ai-border': '#dadce0',
        '--ai-border-light': '#e8eaed',
        '--ai-border-focus': '#4285f4',
        
        // Interactive states
        '--ai-hover': '#f8f9fa',
        '--ai-hover-light': '#e8eaed',
        '--ai-active': '#4285f4',
        '--ai-focus': '#4285f4',
        
        // Shadows
        '--ai-shadow': 'rgba(60, 64, 67, 0.3)',
        '--ai-shadow-light': 'rgba(60, 64, 67, 0.15)',
        '--ai-shadow-elevated': '0 8px 32px rgba(60, 64, 67, 0.2)',
        
        // Backdrop filters
        '--ai-backdrop': 'rgba(255, 255, 255, 0.9)',
        '--ai-backdrop-blur': 'blur(20px)',
        
        // Component specific
        '--ai-input-bg': '#ffffff',
        '--ai-input-border': '#dadce0',
        '--ai-button-secondary-bg': '#f8f9fa',
        '--ai-button-secondary-hover': '#e8eaed',
        '--ai-card-bg': '#ffffff',
        '--ai-tooltip-bg': '#333333',
        '--ai-overlay-bg': 'rgba(0, 0, 0, 0.5)'
      }
    };
  }

  init() {
    if (this.initialized) return;
    
    // Create media query for system theme detection
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Apply initial theme (inverse logic)
    this.applyTheme();
    
    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', () => {
      this.applyTheme();
    });
    
    // Listen for manual theme overrides (if needed)
    window.addEventListener('chromeai-theme-change', (event) => {
      this.currentTheme = event.detail.theme;
      this.applyTheme();
    });
    
    this.initialized = true;
  }

  applyTheme() {
    let targetTheme;
    
    if (this.currentTheme === 'auto') {
      // INVERSE LOGIC: Use opposite of system preference
      // If system is dark, use light theme
      // If system is light, use dark theme
      targetTheme = this.mediaQuery.matches ? 'light' : 'dark';
    } else {
      targetTheme = this.currentTheme;
    }
    
    // Apply theme variables to document root
    const root = document.documentElement;
    const themeVars = this.themes[targetTheme];
    
    Object.entries(themeVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Add theme class to body for CSS selectors
    document.body.classList.remove('chromeai-theme-light', 'chromeai-theme-dark');
    document.body.classList.add(`chromeai-theme-${targetTheme}`);
    
    // Store current theme for components
    localStorage.setItem('chromeai-current-theme', targetTheme);
    
    // Dispatch theme change event for components that need to react
    window.dispatchEvent(new CustomEvent('chromeai-theme-applied', {
      detail: { theme: targetTheme, isInverse: this.currentTheme === 'auto' }
    }));
  }

  getCurrentTheme() {
    return this.currentTheme === 'auto' 
      ? (this.mediaQuery.matches ? 'light' : 'dark')
      : this.currentTheme;
  }

  setTheme(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      console.warn('Invalid theme:', theme);
      return;
    }
    
    this.currentTheme = theme;
    this.applyTheme();
  }

  // Utility method for components to get theme-aware colors
  getThemeColor(colorKey) {
    const currentTheme = this.getCurrentTheme();
    return this.themes[currentTheme][colorKey] || colorKey;
  }

  // Helper to check if current theme is dark
  isDarkTheme() {
    return this.getCurrentTheme() === 'dark';
  }
}

// Create global instance
window.ChromeAIThemeManager = new ChromeAIThemeManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ChromeAIThemeManager.init();
  });
} else {
  window.ChromeAIThemeManager.init();
}