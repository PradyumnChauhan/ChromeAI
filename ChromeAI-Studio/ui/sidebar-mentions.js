/**
 * ChromeAI Studio - Smart Sidebar Mentions Module
 * Handles @mentions, context awareness, and smart suggestions
 */

class SidebarMentions {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.mentions = new Map();
    this.contextCache = new Map();
    this.suggestionCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize mentions functionality
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Set up mention detection
      this.setupMentionDetection();
      
      // Set up context analysis
      this.setupContextAnalysis();
      
      // Set up suggestion system
      this.setupSuggestionSystem();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SidebarMentions:', error);
    }
  }

  /**
   * Set up mention detection
   */
  setupMentionDetection() {
    const input = this.sidebar.ui.sidebarElement?.querySelector('.chromeai-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value, e.target.selectionStart);
    });

    input.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }

  /**
   * Handle input change for mention detection
   */
  handleInputChange(value, cursorPosition) {
    const mentionMatch = this.detectMention(value, cursorPosition);
    
    if (mentionMatch) {
      this.showMentionSuggestions(mentionMatch);
    } else {
      this.hideMentionSuggestions();
    }
  }

  /**
   * Detect @mention in text
   */
  detectMention(text, cursorPosition) {
    const beforeCursor = text.substring(0, cursorPosition);
    const mentionRegex = /@(\w*)$/;
    const match = beforeCursor.match(mentionRegex);
    
    if (match) {
      return {
        fullMatch: match[0],
        mentionText: match[1],
        startPosition: cursorPosition - match[0].length,
        endPosition: cursorPosition
      };
    }
    
    return null;
  }

  /**
   * Show mention suggestions
   */
  showMentionSuggestions(mentionMatch) {
    const suggestions = this.getMentionSuggestions(mentionMatch.mentionText);
    
    if (suggestions.length > 0) {
      this.renderMentionSuggestions(suggestions, mentionMatch);
    }
  }

  /**
   * Get mention suggestions
   */
  getMentionSuggestions(mentionText) {
    const allMentions = this.getAllMentions();
    
    return allMentions.filter(mention => 
      mention.name.toLowerCase().includes(mentionText.toLowerCase()) ||
      mention.keywords.some(keyword => 
        keyword.toLowerCase().includes(mentionText.toLowerCase())
      )
    ).slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get all available mentions
   */
  getAllMentions() {
    return [
      {
        id: 'writer',
        name: 'Writer',
        description: 'Generate creative content, poems, stories, articles',
        keywords: ['write', 'poem', 'story', 'article', 'content', 'creative'],
        type: 'action'
      },
      {
        id: 'summary',
        name: 'Summary',
        description: 'Summarize text or page content',
        keywords: ['summary', 'overview', 'abstract', 'summarize'],
        type: 'action'
      },
      {
        id: 'translate',
        name: 'Translate',
        description: 'Translate text to different languages',
        keywords: ['translate', 'language', 'translation'],
        type: 'action'
      },
      {
        id: 'explain',
        name: 'Explain',
        description: 'Explain concepts in simple terms',
        keywords: ['explain', 'simplify', 'clarify', 'understand'],
        type: 'action'
      },
      {
        id: 'code',
        name: 'Code',
        description: 'Get coding help and analysis',
        keywords: ['code', 'programming', 'debug', 'development'],
        type: 'action'
      },
      {
        id: 'rewrite',
        name: 'Rewrite',
        description: 'Rewrite and improve text',
        keywords: ['rewrite', 'improve', 'edit', 'refine'],
        type: 'action'
      },
      {
        id: 'proofread',
        name: 'Proofread',
        description: 'Check grammar and spelling',
        keywords: ['proofread', 'grammar', 'spelling', 'correct'],
        type: 'action'
      },
      {
        id: 'page-content',
        name: 'Page Content',
        description: 'Reference current page content',
        keywords: ['page', 'content', 'text', 'article'],
        type: 'context'
      },
      {
        id: 'selected-text',
        name: 'Selected Text',
        description: 'Reference selected text',
        keywords: ['selected', 'highlighted', 'selection'],
        type: 'context'
      },
      {
        id: 'url',
        name: 'Current URL',
        description: 'Reference current page URL',
        keywords: ['url', 'link', 'website'],
        type: 'context'
      },
      {
        id: 'title',
        name: 'Page Title',
        description: 'Reference page title',
        keywords: ['title', 'heading'],
        type: 'context'
      }
    ];
  }

  /**
   * Render mention suggestions
   */
  renderMentionSuggestions(suggestions, mentionMatch) {
    // Remove existing suggestions
    this.hideMentionSuggestions();
    
    const input = this.sidebar.ui.sidebarElement?.querySelector('.chromeai-input');
    if (!input) return;

    // Create suggestions container
    const container = document.createElement('div');
    container.className = 'chromeai-mention-suggestions';
    container.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: var(--chromeai-bg-primary, #ffffff);
      border: 1px solid var(--chromeai-border, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      max-height: 200px;
      overflow-y: auto;
      /* Hide scrollbar */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    `;

    // Add suggestions
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'chromeai-mention-item';
      item.style.cssText = `
        padding: 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--chromeai-border, #e5e7eb);
        transition: background-color 0.2s;
      `;
      
      if (index === suggestions.length - 1) {
        item.style.borderBottom = 'none';
      }

      item.innerHTML = `
        <div style="font-weight: 500; color: var(--chromeai-text-primary, #111827);">
          @${suggestion.name}
        </div>
        <div style="font-size: 12px; color: var(--chromeai-text-secondary, #6b7280); margin-top: 2px;">
          ${suggestion.description}
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectMention(suggestion, mentionMatch);
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--chromeai-bg-secondary, #f9fafb)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });

      container.appendChild(item);
    });

    // Position container
    const inputRect = input.getBoundingClientRect();
    const sidebarRect = this.sidebar.ui.sidebarElement.getBoundingClientRect();
    
    container.style.position = 'fixed';
    container.style.left = `${inputRect.left}px`;
    container.style.bottom = `${window.innerHeight - inputRect.top + 8}px`;
    container.style.width = `${inputRect.width}px`;

    // Add to DOM
    document.body.appendChild(container);
    this.currentSuggestions = container;
  }

  /**
   * Hide mention suggestions
   */
  hideMentionSuggestions() {
    if (this.currentSuggestions) {
      this.currentSuggestions.remove();
      this.currentSuggestions = null;
    }
  }

  /**
   * Select a mention
   */
  selectMention(suggestion, mentionMatch) {
    const input = this.sidebar.ui.sidebarElement?.querySelector('.chromeai-input');
    if (!input) return;

    const beforeMention = input.value.substring(0, mentionMatch.startPosition);
    const afterMention = input.value.substring(mentionMatch.endPosition);
    const newValue = beforeMention + `@${suggestion.name} ` + afterMention;

    input.value = newValue;
    input.focus();
    
    // Position cursor after the mention
    const newCursorPosition = beforeMention.length + suggestion.name.length + 2;
    input.setSelectionRange(newCursorPosition, newCursorPosition);

    this.hideMentionSuggestions();
  }

  /**
   * Handle key down events
   */
  handleKeyDown(e) {
    if (!this.currentSuggestions) return;

    const items = this.currentSuggestions.querySelectorAll('.chromeai-mention-item');
    const currentActive = this.currentSuggestions.querySelector('.chromeai-mention-item.active');
    let activeIndex = -1;

    if (currentActive) {
      activeIndex = Array.from(items).indexOf(currentActive);
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        this.setActiveSuggestion(items[activeIndex]);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        this.setActiveSuggestion(items[activeIndex]);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (currentActive) {
          currentActive.click();
        }
        break;
        
      case 'Escape':
        this.hideMentionSuggestions();
        break;
    }
  }

  /**
   * Set active suggestion
   */
  setActiveSuggestion(item) {
    // Remove active class from all items
    this.currentSuggestions?.querySelectorAll('.chromeai-mention-item').forEach(i => {
      i.classList.remove('active');
      i.style.backgroundColor = 'transparent';
    });

    // Add active class to selected item
    if (item) {
      item.classList.add('active');
      item.style.backgroundColor = 'var(--chromeai-bg-secondary, #f9fafb)';
    }
  }

  /**
   * Set up context analysis
   */
  setupContextAnalysis() {
    // Analyze page context when sidebar opens
    this.sidebar.state.addStateListener((newState, oldState) => {
      if (newState.isVisible && !oldState.isVisible) {
        this.analyzePageContext();
      }
    });
  }

  /**
   * Analyze page context
   */
  async analyzePageContext() {
    try {
      const context = {
        url: window.location.href,
        title: document.title,
        content: this.extractPageContent(),
        selectedText: this.getSelectedText(),
        timestamp: Date.now()
      };

      this.contextCache.set('current', context);
    } catch (error) {
      console.error('Failed to analyze page context:', error);
    }
  }

  /**
   * Extract page content
   */
  extractPageContent() {
    // Simple content extraction
    const content = document.body.innerText || document.body.textContent || '';
    return content.substring(0, 1000); // Limit to 1000 characters
  }

  /**
   * Get selected text
   */
  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  /**
   * Set up suggestion system
   */
  setupSuggestionSystem() {
    // Generate suggestions based on context
    this.generateContextualSuggestions();
  }

  /**
   * Generate contextual suggestions
   */
  generateContextualSuggestions() {
    const context = this.contextCache.get('current');
    if (!context) return;

    const suggestions = [];

    // URL-based suggestions
    if (context.url.includes('github.com')) {
      suggestions.push('@code', '@explain');
    } else if (context.url.includes('stackoverflow.com')) {
      suggestions.push('@explain', '@code');
    } else if (context.url.includes('wikipedia.org')) {
      suggestions.push('@summary', '@explain');
    }

    // Content-based suggestions
    if (context.content.includes('function') || context.content.includes('class')) {
      suggestions.push('@code');
    }

    if (context.content.length > 500) {
      suggestions.push('@summary');
    }

    this.suggestionCache.set('contextual', suggestions);
  }

  /**
   * Get contextual suggestions
   */
  getContextualSuggestions() {
    return this.suggestionCache.get('contextual') || [];
  }

  /**
   * Process mention in message
   */
  processMention(mention, message) {
    const context = this.contextCache.get('current');
    if (!context) return message;

    switch (mention) {
      case 'page-content':
        return `${message}\n\nPage content: ${context.content}`;
      case 'selected-text':
        return `${message}\n\nSelected text: ${context.selectedText}`;
      case 'url':
        return `${message}\n\nCurrent URL: ${context.url}`;
      case 'title':
        return `${message}\n\nPage title: ${context.title}`;
      case 'writer':
        return `${message}\n\n@writer - Generate creative content, poems, stories, articles`;
      case 'summary':
        return `${message}\n\n@summary - Summarize text or page content`;
      case 'translate':
        return `${message}\n\n@translate - Translate text to different languages`;
      case 'explain':
        return `${message}\n\n@explain - Explain concepts in simple terms`;
      case 'code':
        return `${message}\n\n@code - Get coding help and analysis`;
      case 'rewrite':
        return `${message}\n\n@rewrite - Rewrite and improve text`;
      case 'proofread':
        return `${message}\n\n@proofread - Check grammar and spelling`;
      default:
        return message;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.hideMentionSuggestions();
    this.mentions.clear();
    this.contextCache.clear();
    this.suggestionCache.clear();
    this.isInitialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarMentions;
} else if (typeof window !== 'undefined') {
  window.SidebarMentions = SidebarMentions;
}

