/**
 * ChromeAI Studio - Content Extractor
 * Intelligent content extraction for different types of web content
 */

class ContentExtractor {
  constructor() {
    this.extractors = {
      article: this.extractArticle.bind(this),
      social: this.extractSocialPost.bind(this),
      video: this.extractVideoInfo.bind(this),
      code: this.extractCodeContent.bind(this),
      shopping: this.extractProductInfo.bind(this),
      email: this.extractEmailContent.bind(this),
      search: this.extractSearchResults.bind(this),
      form: this.extractFormContent.bind(this),
      table: this.extractTableData.bind(this),
      generic: this.extractGenericContent.bind(this)
    };
  }

  /**
   * Main extraction method - intelligently determines content type and extracts accordingly
   */
  async extractContent(options = {}) {
    try {
      const url = window.location.href;
      const domain = window.location.hostname;
      
      // Determine content type
      const contentType = this.detectContentType(url, domain);
      
      // Use specific extractor or fallback to generic
      const extractor = this.extractors[contentType] || this.extractors.generic;
      const content = await extractor(options);
      
      return {
        success: true,
        contentType,
        url,
        domain,
        timestamp: Date.now(),
        ...content
      };
    } catch (error) {
      console.error('Content extraction failed:', error);
      return {
        success: false,
        error: error.message,
        contentType: 'unknown',
        url: window.location.href
      };
    }
  }

  /**
   * Detect content type based on URL and page structure
   */
  detectContentType(url, domain) {
    // Social media platforms
    if (/twitter|x\.com|facebook|instagram|linkedin|reddit|tiktok/.test(domain)) {
      return 'social';
    }
    
    // Video platforms
    if (/youtube|vimeo|twitch|netflix|hulu/.test(domain)) {
      return 'video';
    }
    
    // Code platforms
    if (/github|gitlab|bitbucket|codepen|jsfiddle|repl\.it|codesandbox/.test(domain)) {
      return 'code';
    }
    
    // Shopping platforms
    if (/amazon|ebay|shopify|etsy|walmart|target/.test(domain)) {
      return 'shopping';
    }
    
    // Email services
    if (/gmail|outlook|yahoo|protonmail/.test(domain)) {
      return 'email';
    }
    
    // Search engines
    if (/google|bing|duckduckgo|yahoo/.test(domain) && /search|query/.test(url)) {
      return 'search';
    }
    
    // Check for article indicators
    if (this.hasArticleStructure()) {
      return 'article';
    }
    
    // Check for form-heavy pages
    if (this.hasFormStructure()) {
      return 'form';
    }
    
    // Check for table-heavy pages
    if (this.hasTableStructure()) {
      return 'table';
    }
    
    return 'generic';
  }

  /**
   * Extract article content (news, blogs, etc.)
   */
  async extractArticle(options = {}) {
    const result = {
      type: 'article',
      title: '',
      content: '',
      author: '',
      publishDate: '',
      readTime: '',
      summary: '',
      tags: [],
      images: []
    };
    
    // Extract title
    result.title = this.extractTitle();
    
    // Extract main content
    result.content = this.extractMainContent();
    
    // Extract metadata
    result.author = this.extractAuthor();
    result.publishDate = this.extractPublishDate();
    result.readTime = this.estimateReadTime(result.content);
    
    // Extract images
    result.images = this.extractImages();
    
    // Extract tags/categories
    result.tags = this.extractTags();
    
    // Generate summary if requested
    if (options.includeSummary && result.content) {
      result.summary = this.generateQuickSummary(result.content);
    }
    
    return result;
  }

  /**
   * Extract social media post content
   */
  async extractSocialPost(options = {}) {
    const result = {
      type: 'social',
      platform: '',
      author: '',
      handle: '',
      content: '',
      timestamp: '',
      metrics: {},
      hashtags: [],
      mentions: [],
      links: []
    };
    
    const domain = window.location.hostname;
    
    if (domain.includes('twitter') || domain.includes('x.com')) {
      return this.extractTwitterContent(result);
    } else if (domain.includes('facebook')) {
      return this.extractFacebookContent(result);
    } else if (domain.includes('linkedin')) {
      return this.extractLinkedInContent(result);
    } else if (domain.includes('reddit')) {
      return this.extractRedditContent(result);
    }
    
    // Generic social extraction
    result.platform = domain;
    result.content = this.extractVisibleText();
    
    return result;
  }

  /**
   * Extract video information
   */
  async extractVideoInfo(options = {}) {
    const result = {
      type: 'video',
      platform: '',
      title: '',
      description: '',
      duration: '',
      author: '',
      publishDate: '',
      viewCount: '',
      tags: [],
      transcript: ''
    };
    
    const domain = window.location.hostname;
    
    if (domain.includes('youtube')) {
      return this.extractYouTubeContent(result);
    } else if (domain.includes('vimeo')) {
      return this.extractVimeoContent(result);
    }
    
    // Generic video extraction
    result.platform = domain;
    result.title = this.extractTitle();
    result.description = this.extractDescription();
    
    return result;
  }

  /**
   * Extract code content (GitHub, etc.)
   */
  async extractCodeContent(options = {}) {
    const result = {
      type: 'code',
      platform: '',
      repository: '',
      filename: '',
      language: '',
      code: '',
      description: '',
      lines: 0,
      author: '',
      lastModified: ''
    };
    
    const domain = window.location.hostname;
    const url = window.location.href;
    
    if (domain.includes('github')) {
      return this.extractGitHubContent(result, url);
    } else if (domain.includes('codepen')) {
      return this.extractCodePenContent(result);
    }
    
    // Generic code extraction
    result.platform = domain;
    result.code = this.extractCodeBlocks();
    result.description = this.extractDescription();
    
    return result;
  }

  /**
   * Extract product information (e-commerce)
   */
  async extractProductInfo(options = {}) {
    const result = {
      type: 'shopping',
      name: '',
      price: '',
      description: '',
      rating: '',
      reviews: '',
      availability: '',
      images: [],
      specifications: {},
      seller: ''
    };
    
    // Product name
    result.name = this.extractProductName();
    
    // Price
    result.price = this.extractPrice();
    
    // Description
    result.description = this.extractProductDescription();
    
    // Rating and reviews
    result.rating = this.extractRating();
    result.reviews = this.extractReviewCount();
    
    // Images
    result.images = this.extractProductImages();
    
    // Specifications
    result.specifications = this.extractSpecifications();
    
    return result;
  }

  /**
   * Extract email content
   */
  async extractEmailContent(options = {}) {
    const result = {
      type: 'email',
      subject: '',
      sender: '',
      recipient: '',
      content: '',
      timestamp: '',
      attachments: [],
      isThread: false
    };
    
    // Implementation depends on email provider
    result.subject = this.extractEmailSubject();
    result.sender = this.extractEmailSender();
    result.content = this.extractEmailBody();
    result.timestamp = this.extractEmailTimestamp();
    
    return result;
  }

  /**
   * Extract search results
   */
  async extractSearchResults(options = {}) {
    const result = {
      type: 'search',
      query: '',
      results: [],
      totalResults: '',
      suggestions: []
    };
    
    // Extract search query
    result.query = this.extractSearchQuery();
    
    // Extract search results
    result.results = this.extractSearchResultItems();
    
    // Extract total results count
    result.totalResults = this.extractResultsCount();
    
    return result;
  }

  /**
   * Extract form content
   */
  async extractFormContent(options = {}) {
    const result = {
      type: 'form',
      title: '',
      fields: [],
      requiredFields: [],
      formData: {}
    };
    
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      const formInfo = {
        index,
        action: form.action,
        method: form.method,
        fields: this.extractFormFields(form)
      };
      
      result.fields.push(formInfo);
    });
    
    return result;
  }

  /**
   * Extract table data
   */
  async extractTableData(options = {}) {
    const result = {
      type: 'table',
      tables: []
    };
    
    const tables = document.querySelectorAll('table');
    
    tables.forEach((table, index) => {
      const tableData = {
        index,
        headers: this.extractTableHeaders(table),
        rows: this.extractTableRows(table),
        caption: table.caption?.textContent || ''
      };
      
      result.tables.push(tableData);
    });
    
    return result;
  }

  /**
   * Generic content extraction
   */
  async extractGenericContent(options = {}) {
    const result = {
      type: 'generic',
      title: '',
      content: '',
      links: [],
      images: [],
      headings: [],
      metadata: {}
    };
    
    result.title = this.extractTitle();
    result.content = this.extractVisibleText();
    result.links = this.extractLinks();
    result.images = this.extractImages();
    result.headings = this.extractHeadings();
    result.metadata = this.extractMetadata();
    
    return result;
  }

  // Helper methods for extraction

  extractTitle() {
    // Try multiple selectors for title
    const selectors = [
      'h1',
      '[data-testid="tweet-text"]',
      '.post-title',
      '.article-title',
      'title',
      '[property="og:title"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return document.title || '';
  }

  extractMainContent() {
    // Try to find main content area
    const selectors = [
      'article',
      '.post-content',
      '.article-content',
      '.content',
      'main',
      '[role="main"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent);
      }
    }
    
    // Fallback to body content (filtered)
    return this.extractVisibleText();
  }

  extractVisibleText() {
    // Get all text nodes that are visible
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip script, style, and hidden elements
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip certain tag types
          const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'META'];
          if (skipTags.includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let text = '';
    let node;
    
    while (node = walker.nextNode()) {
      text += node.textContent + ' ';
    }
    
    return this.cleanText(text);
  }

  extractImages() {
    const images = [];
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach(img => {
      if (img.src && img.src.startsWith('http')) {
        images.push({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        });
      }
    });
    
    return images;
  }

  extractAuthor() {
    // Try various author selectors
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '.post-author',
      '.article-author',
      '[itemprop="author"]',
      '.author-name',
      '.by-author'
    ];
    
    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    // Try meta tags
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      return authorMeta.getAttribute('content');
    }
    
    return null;
  }

  extractPublishDate() {
    // Try various date selectors
    const dateSelectors = [
      'time[datetime]',
      '.publish-date',
      '.post-date',
      '.article-date',
      '[itemprop="datePublished"]',
      '.date'
    ];
    
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const dateTime = element.getAttribute('datetime') || element.textContent.trim();
        if (dateTime) {
          const date = new Date(dateTime);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }
    
    return null;
  }

  extractTags() {
    const tags = [];
    
    // Try various tag selectors
    const tagSelectors = [
      '.tags a',
      '.post-tags a',
      '.article-tags a',
      '.categories a',
      '.tag',
      '[rel="tag"]'
    ];
    
    for (const selector of tagSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const tag = el.textContent.trim();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
    
    return tags;
  }

  estimateReadTime(content) {
    if (!content) return 0;
    
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  extractLinks() {
    const links = [];
    const linkElements = document.querySelectorAll('a[href]');
    
    linkElements.forEach(link => {
      if (link.href && link.textContent.trim()) {
        links.push({
          url: link.href,
          text: link.textContent.trim(),
          title: link.title || ''
        });
      }
    });
    
    return links;
  }

  extractHeadings() {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach(heading => {
      headings.push({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent.trim(),
        id: heading.id || ''
      });
    });
    
    return headings;
  }

  extractMetadata() {
    const metadata = {};
    
    // Meta tags
    document.querySelectorAll('meta').forEach(meta => {
      if (meta.name && meta.content) {
        metadata[meta.name] = meta.content;
      } else if (meta.property && meta.content) {
        metadata[meta.property] = meta.content;
      }
    });
    
    // JSON-LD structured data
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        metadata.structuredData = data;
      } catch (e) {
        // Ignore invalid JSON
      }
    });
    
    return metadata;
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  estimateReadTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }

  generateQuickSummary(text, maxLength = 200) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) break;
      summary += sentence.trim() + '. ';
    }
    
    return summary.trim() || text.substring(0, maxLength) + '...';
  }

  // Platform-specific extraction methods would go here
  // (extractTwitterContent, extractGitHubContent, etc.)
  
  hasArticleStructure() {
    return !!(
      document.querySelector('article') ||
      document.querySelector('.post-content') ||
      document.querySelector('.article-content') ||
      (document.querySelector('h1') && document.querySelector('p'))
    );
  }

  hasFormStructure() {
    const forms = document.querySelectorAll('form');
    return forms.length > 0 && forms[0].querySelectorAll('input, textarea, select').length > 2;
  }

  hasTableStructure() {
    const tables = document.querySelectorAll('table');
    return tables.length > 0 && tables[0].querySelectorAll('tr').length > 3;
  }
}

// Create and export singleton instance
const contentExtractor = new ContentExtractor();

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.contentExtractor = contentExtractor;
}