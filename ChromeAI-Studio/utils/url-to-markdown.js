/**
 * Professional URL to Markdown Converter
 * Integrates Turndown.js, Mozilla Readability, and advanced table handling
 * 
 * Architecture:
 * 1. Chrome Tab API - Browser automation
 * 2. Mozilla Readability - Content extraction and cleaning
 * 3. Turndown.js - Professional HTML→Markdown conversion
 * 4. HTML Table Converter - Advanced table handling with width calculation
 * 5. Domain Filters - Site-specific content cleaning
 */

class URLToMarkdown {
  constructor() {
    
    // Debug: Verify all dependencies are loaded
    this.verifyDependencies();
    
    // Initialize Turndown.js with professional configuration
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      br: '  '
    });
    
    // Initialize table converter
    this.tableConverter = new HTMLTableConverter(96);
    
    // Initialize domain filters
    this.domainFilters = new DomainFilters();
    
    // Setup custom Turndown rules
    this.setupTurndownRules();
  }

  /**
   * Verify all required dependencies are loaded
   */
  verifyDependencies() {
    
    const dependencies = {
      'TurndownService': typeof TurndownService !== 'undefined',
      'HTMLTableConverter': typeof HTMLTableConverter !== 'undefined',
      'DomainFilters': typeof DomainFilters !== 'undefined',
      'Readability': typeof Readability !== 'undefined',
      'DOMParser': typeof DOMParser !== 'undefined'
    };
    
    let allLoaded = true;
    for (const [name, loaded] of Object.entries(dependencies)) {
      if (loaded) {
      } else {
        console.error(`❌ ${name} NOT loaded`);
        allLoaded = false;
      }
    }
    
    if (allLoaded) {
    } else {
      console.error('⚠️ Some dependencies are missing - conversion may fail');
    }
    
    return allLoaded;
  }

  /**
   * Setup custom Turndown rules for enhanced conversion
   */
  setupTurndownRules() {
    // Custom table rule using our HTML table converter
    this.turndownService.addRule('tables', {
      filter: 'table',
      replacement: (content, node) => {
        return this.tableConverter.convert(node.outerHTML);
      }
    });

    // Enhanced code block rule with language detection
    this.turndownService.addRule('codeBlocks', {
      filter: function(node) {
        return node.nodeName === 'PRE' && 
               node.firstChild && 
               node.firstChild.nodeName === 'CODE';
      },
      replacement: function(content, node) {
        const className = node.firstChild.className || '';
        const language = (className.match(/language-(\S+)/) || [null, ''])[1];
        return '\n\n```' + language + '\n' + 
               node.firstChild.textContent + 
               '\n```\n\n';
      }
    });
  }

  /**
   * Convert a single URL to markdown using professional libraries
   * 
   * @param {string} url - The URL to convert
   * @param {number} windowId - Optional window ID to use
   * @returns {Promise<{success: boolean, markdown: string, title: string, url: string}>}
   */
  async convertUrl(url, windowId = null) {
    let tabId = null;
    
    try {
      
      // STAGE 1: Browser Automation (Chrome Tab API)
      tabId = await this.createAndWaitForTab(url, windowId);
      
      // Get raw HTML from tab
      const htmlContent = await this.getTabHTML(tabId);
      
      if (!htmlContent || htmlContent.length < 100) {
        throw new Error('HTML content too short or empty - page may not have loaded properly');
      }
      
      // Close tab early to free resources
      await this.closeTab(tabId);
      tabId = null;
      
      // STAGE 2: Readability Extraction
      const article = await this.processWithReadability(htmlContent, url);
      
      if (!article) {
        console.warn('⚠️ Readability parsing failed, using fallback method...');
        // Fallback: use raw HTML content
        const fallbackArticle = {
          title: this.extractTitleFromHTML(htmlContent) || 'Untitled',
          content: htmlContent,
          byline: null,
          excerpt: null,
          siteName: this.extractSiteName(url)
        };
        return await this.processArticle(fallbackArticle, url);
      }
      
      return await this.processArticle(article, url);
      
    } catch (error) {
      console.error(`❌ Failed to convert ${url}:`, error);
      
      // Clean up tab if still open
      if (tabId) {
        try {
          await this.closeTab(tabId);
        } catch (e) {
          console.warn('Could not close tab:', e);
        }
      }
      
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }

  /**
   * Process article through Turndown conversion
   */
  async processArticle(article, url) {
    try {
      // STAGE 3: Turndown Conversion
      let markdown = this.turndownService.turndown(article.content);
      
      // Apply domain filters
      markdown = this.domainFilters.filter(url, markdown);
      
      // Add metadata header
      markdown = this.addMetadataHeader(article, url, markdown);
      
      const charCount = markdown.length;
      const wordCount = markdown.split(/\s+/).length;
      
      return {
        success: true,
        markdown: markdown,
        title: article.title,
        url: url,
        stats: {
          chars: charCount,
          words: wordCount,
          extractedSections: this.countMarkdownSections(markdown)
        }
      };
    } catch (error) {
      console.error('❌ Turndown conversion failed:', error);
      throw error;
    }
  }

  /**
   * Extract title from HTML as fallback
   */
  extractTitleFromHTML(html) {
    try {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Extract site name from URL
   */
  extractSiteName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return null;
    }
  }

  /**
   * Create tab and wait for page load
   */
  async createAndWaitForTab(url, windowId) {
    const createResponse = await chrome.runtime.sendMessage({
      type: 'CREATE_TAB_IN_WINDOW',
      windowId: windowId,
      url: url
    });
    
    if (!createResponse?.success) {
      throw new Error('Failed to create tab');
    }
    
    const tabId = createResponse.tabId;
    
    // Wait for page to load
    await chrome.runtime.sendMessage({
      type: 'WAIT_FOR_PAGE_LOAD',
      tabId: tabId,
      timeout: 8000
    });
    
    return tabId;
  }

  /**
   * Get HTML content from tab
   */
  async getTabHTML(tabId) {
    
    const extractResponse = await chrome.runtime.sendMessage({
      type: 'EXTRACT_FROM_TAB',
      tabId: tabId,
      dataType: 'html' // Get raw HTML
    });
    
    if (!extractResponse?.success) {
      throw new Error(`Failed to extract HTML from tab: ${extractResponse?.error || 'Unknown error'}`);
    }
    
    // Handle the new data structure from data extractor
    const htmlData = extractResponse.data;
    if (!htmlData || !htmlData.html) {
      throw new Error('No HTML content found in extraction response');
    }
    return htmlData.html;
  }

  /**
   * Close tab
   */
  async closeTab(tabId) {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TAB',
        tabId: tabId
      });
    } catch (e) {
      // Fallback to direct tab removal
      try {
        await chrome.tabs.remove(tabId);
      } catch (e2) {
        console.warn('Could not close tab:', e2);
      }
    }
  }

  /**
   * Process HTML with Mozilla Readability
   */
  async processWithReadability(htmlContent, url) {
    try {
      // Create a DOM from HTML string
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Use full Mozilla Readability
      const reader = new Readability(doc, {
        debug: false,
        maxElemsToParse: 0,
        nbTopCandidates: 5,
        charThreshold: 500
      });
      
      const article = reader.parse();
      
      if (!article) {
        console.warn('Readability parsing failed, falling back to raw HTML');
        return {
          title: doc.title || 'Untitled',
          byline: null,
          excerpt: null,
          content: htmlContent,
          textContent: doc.body?.textContent || '',
          siteName: null
        };
      }
      
      return {
        title: article.title,
        byline: article.byline,
        excerpt: article.excerpt,
        content: article.content, // Clean HTML ready for Turndown
        textContent: article.textContent,
        siteName: article.siteName
      };
      
    } catch (error) {
      console.error('Readability processing failed:', error);
      return null;
    }
  }

  /**
   * Add metadata header to markdown
   */
  addMetadataHeader(article, url, markdown) {
    let header = `# ${this.escapeMarkdown(article.title || 'Untitled')}\n\n`;
    header += `**Source:** ${url}\n\n`;
    
    if (article.byline) {
      header += `**Author:** ${this.escapeMarkdown(article.byline)}\n\n`;
    }
    
    if (article.excerpt) {
      header += `> ${this.escapeMarkdown(article.excerpt)}\n\n`;
    }
    
    if (article.siteName) {
      header += `**Site:** ${this.escapeMarkdown(article.siteName)}\n\n`;
    }
    
    header += `---\n\n`;
    
    return header + markdown;
  }

  /**
   * Escape markdown special characters
   */
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
  }

  /**
   * Count sections in markdown for stats
   */
  countMarkdownSections(markdown) {
    return {
      headings: (markdown.match(/^#{1,6}\s/gm) || []).length,
      paragraphs: (markdown.match(/\n\n/g) || []).length + 1,
      lists: (markdown.match(/^[-*+]\s/gm) || []).length,
      numberedLists: (markdown.match(/^\d+\.\s/gm) || []).length,
      tables: (markdown.match(/\|.*\|/g) || []).length / 2, // Approx
      links: (markdown.match(/\[.*?\]\(.*?\)/g) || []).length,
      codeBlocks: (markdown.match(/```[\s\S]*?```/g) || []).length
    };
  }

  /**
   * Convert multiple URLs to markdown in parallel
   * @param {Array<string>} urls - Array of URLs
   * @param {number} windowId - Optional window ID
   * @returns {Promise<Array>}
   */
  async convertMultipleUrls(urls, windowId = null) {
    
    // Process in batches of 3 to avoid overwhelming the browser
    const batchSize = 3;
    const results = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(urlData => {
        const url = typeof urlData === 'string' ? urlData : urlData.url;
        return this.convertUrl(url, windowId);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.success) {
          results.push(result.value);
        } else if (result.status === 'fulfilled') {
          console.warn(`⚠️ Failed to convert: ${result.value?.url}`);
        }
      });
      
      // Small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  /**
   * Quick method: Convert text to markdown (no URL processing)
   * @param {string} text - Text content
   * @param {string} title - Document title
   * @param {string} url - Source URL
   * @returns {string} - Markdown content
   */
  textToMarkdown(text, title = 'Document', url = '') {
    let markdown = '';
    
    markdown += `# ${this.escapeMarkdown(title)}\n\n`;
    if (url) {
      markdown += `**Source:** ${url}\n\n`;
    }
    markdown += `---\n\n`;
    
    // Split into paragraphs and format
    const paragraphs = text.split('\n\n');
    paragraphs.forEach(para => {
      if (para.trim().length > 0) {
        markdown += `${para.trim()}\n\n`;
      }
    });
    
    return markdown;
  }

  /**
   * Get library versions for debugging
   */
  getLibraryVersions() {
    return {
      turndown: '7.1.3 (browser)',
      readability: 'Mozilla Readability (browser)',
      tableConverter: '1.0.0 (custom)',
      domainFilters: '1.0.0 (custom)'
    };
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.urlToMarkdown = new URLToMarkdown();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLToMarkdown;
}