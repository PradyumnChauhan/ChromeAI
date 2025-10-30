/**
 * Data Extractor - Extract information from web pages
 * Used by Autonomous Agent to gather data for tasks
 * 
 * Features:
 * - Search results extraction
 * - Table data extraction
 * - List extraction
 * - Article content extraction
 * - Price/product information
 */

class DataExtractor {
  constructor() {
  }

  /**
   * Extract Google search results
   */
  extractSearchResults(limit = 10) {
    try {
      
      const results = [];
      
      // ✨ UPDATED: Modern Google organic result selectors (2024/2025)
      // These target ONLY the main organic results (typically 10 per page)
      const selectors = [
        '.tF2Cxc',                // Primary organic result container (current Google)
        'div.g:has(.yuRUbf)',     // Organic result with main link
        '#search div.g',          // Fallback for older format
        'div.g',                  // Simple fallback
        '[data-hveid] div.g'      // Alternative with attribute
      ];
      
      let googleResults = [];
      let selectorUsed = '';
      
      for (const selector of selectors) {
        try {
          googleResults = document.querySelectorAll(selector);
          if (googleResults.length > 0) {
            selectorUsed = selector;
            break;
          } else {
          }
        } catch (err) {
          console.warn(`❌ Selector failed: ${selector}`, err);
        }
      }
      
      if (googleResults.length === 0) {
        console.warn('⚠️ No search results found with any selector');
        
        // Debug: Show first 1000 chars of page
        
        return results; // Return empty array
      }
      
      Array.from(googleResults).slice(0, limit).forEach((result, index) => {
        try {
          // ✨ Get the main organic link (the one users actually click)
          const linkEl = result.querySelector('.yuRUbf a, a[href]:has(h3), h3 a');
          const titleEl = result.querySelector('h3');
          const snippetEl = result.querySelector('.VwiC3b, .IsZvec, .yXK7lf, .s, [data-sncf], [data-content-feature="1"]');
          
          if (titleEl && linkEl && linkEl.href) {
            const url = linkEl.href;
            
            // Filter out Google internal links
            if (url.includes('google.com/search') || 
                url.includes('google.com/url') ||
                url.includes('webcache.googleusercontent') ||
                url.includes('translate.google.com') ||
                url.includes('accounts.google.com') ||
                !url.startsWith('http')) {
              return;
            }
            
            try {
              const domain = new URL(url).hostname;
              
              results.push({
                rank: results.length + 1,
                position: results.length + 1,
                title: titleEl.textContent.trim(),
                link: url,
                url: url,
                snippet: snippetEl?.textContent.trim() || '',
                domain: domain
              });
            } catch (urlError) {
              console.warn(`Invalid URL at index ${index}:`, url);
            }
          }
        } catch (err) {
          console.warn(`Failed to extract result ${index}:`, err);
        }
      });
      if (results.length > 0) {
        results.slice(0, 5).forEach(r => {
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Search extraction failed:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  }

  /**
   * Extract table data from page
   */
  extractTables() {
    try {
      
      const tables = [];
      const tableElements = document.querySelectorAll('table');
      
      tableElements.forEach((table, tableIndex) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const data = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          return cells.map(cell => cell.textContent.trim());
        });
        
        tables.push({
          index: tableIndex,
          rows: data.length,
          columns: data[0]?.length || 0,
          data: data
        });
      });
      return tables;
      
    } catch (error) {
      console.error('❌ Table extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract list data (ul/ol)
   */
  extractLists(limit = 10) {
    try {
      
      const lists = [];
      const listElements = document.querySelectorAll('ul, ol');
      
      listElements.forEach((list, listIndex) => {
        if (listIndex >= limit) return;
        
        const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
        
        if (items.length > 0) {
          lists.push({
            type: list.tagName.toLowerCase(),
            items: items
          });
        }
      });
      return lists;
      
    } catch (error) {
      console.error('❌ List extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract main article content
   */
  extractArticleContent() {
    try {
      
      // Try common article selectors
      const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.article-content',
        '.post-content',
        '#content'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const headings = Array.from(element.querySelectorAll('h1, h2, h3')).map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent.trim()
          }));
          
          const paragraphs = Array.from(element.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(text => text.length > 50);
          return {
            title: document.title,
            headings: headings,
            paragraphs: paragraphs,
            fullText: element.textContent.trim()
          };
        }
      }
      
      console.warn('⚠️ No article content found');
      return null;
      
    } catch (error) {
      console.error('❌ Article extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract product/price information (Amazon, Flipkart, etc.)
   */
  extractProductInfo() {
    try {
      
      const product = {
        title: null,
        price: null,
        rating: null,
        availability: null,
        image: null
      };
      
      // Try various price selectors
      const priceSelectors = [
        '.a-price-whole',  // Amazon
        '._30jeq3',        // Flipkart
        '.price',
        '[data-price]',
        '.product-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          product.price = element.textContent.trim();
          break;
        }
      }
      
      // Try title selectors
      const titleSelectors = [
        '#productTitle',   // Amazon
        '.B_NuCI',         // Flipkart
        'h1.product-title',
        '.product-name'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          product.title = element.textContent.trim();
          break;
        }
      }
      
      // Try rating
      const ratingSelectors = [
        '.a-icon-star-small', // Amazon
        '._3LWZlK',           // Flipkart
        '.product-rating'
      ];
      
      for (const selector of ratingSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          product.rating = element.textContent.trim();
          break;
        }
      }
      return product;
      
    } catch (error) {
      console.error('❌ Product extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract headings from page
   */
  extractHeadings() {
    try {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim()
      }));
      return headings;
      
    } catch (error) {
      console.error('❌ Heading extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract all links from page
   */
  extractLinks(limit = 50) {
    try {
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, limit)
        .map(a => ({
          text: a.textContent.trim(),
          href: a.href,
          title: a.title
        }))
        .filter(link => link.text.length > 0);
      return links;
      
    } catch (error) {
      console.error('❌ Link extraction failed:', error);
      return [];
    }
  }

  /**
   * Universal fallback extraction - works on ANY page
   * Extracts: title, headings, lists, tables, and main text
   */
  extractGenericContent() {
    try {
      
      const content = {
        url: window.location.href,
        title: document.title,
        headings: [],
        lists: [],
        tables: [],
        mainText: [],
        metadata: {}
      };
      
      // 1. Extract ALL headings (h1-h6)
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headingElements.forEach(h => {
        const text = h.textContent.trim();
        if (text.length > 0 && text.length < 300) { // Filter out noise
          content.headings.push({
            level: parseInt(h.tagName[1]),
            text: text
          });
        }
      });
      
      // 2. Extract ALL lists (ul/ol)
      const listElements = document.querySelectorAll('ul, ol');
      listElements.forEach(list => {
        const items = Array.from(list.querySelectorAll('li'))
          .map(li => li.textContent.trim())
          .filter(text => text.length > 0 && text.length < 500);
        
        if (items.length > 0 && items.length <= 100) { // Filter out navigation lists
          content.lists.push({
            type: list.tagName.toLowerCase(),
            items: items.slice(0, 20) // Limit to first 20 items
          });
        }
      });
      
      // 3. Extract ALL tables
      const tableElements = document.querySelectorAll('table');
      tableElements.forEach((table, idx) => {
        if (idx < 5) { // Limit to first 5 tables
          const rows = Array.from(table.querySelectorAll('tr')).slice(0, 20); // Limit rows
          const data = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map(cell => cell.textContent.trim());
          });
          
          if (data.length > 0) {
            content.tables.push({
              index: idx,
              rows: data.length,
              data: data
            });
          }
        }
      });
      
      // 4. Extract main content paragraphs
      const paragraphElements = document.querySelectorAll('p, article p, main p, [role="main"] p');
      paragraphElements.forEach(p => {
        const text = p.textContent.trim();
        if (text.length > 50 && text.length < 1000 && content.mainText.length < 20) {
          content.mainText.push(text);
        }
      });
      
      // 5. Extract meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        content.metadata.description = metaDesc.content;
      }
      
      return content;
      
    } catch (error) {
      console.error('❌ Universal extraction failed:', error);
      return {
        url: window.location.href,
        title: document.title,
        error: error.message
      };
    }
  }

  /**
   * Extract raw HTML content from the page
   */
  extractHTML() {
    try {
      
      // Get the full HTML content
      const html = document.documentElement.outerHTML;
      
      return {
        html: html,
        length: html.length,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ HTML extraction failed:', error);
      return null;
    }
  }

  /**
   * Smart extraction - Automatically detect and extract relevant data
   */
  async smartExtract(dataType) {
    
    const type = dataType.toLowerCase();
    let result = null;
    
    // Try specific extractors first
    if (type === 'html') {
      result = this.extractHTML();
    } else if (type.includes('search') || type.includes('results')) {
      result = this.extractSearchResults();
    } else if (type.includes('table')) {
      result = this.extractTables();
    } else if (type.includes('list')) {
      result = this.extractLists();
    } else if (type.includes('article') || type.includes('content')) {
      result = this.extractArticleContent();
    } else if (type.includes('product') || type.includes('price')) {
      result = this.extractProductInfo();
    } else if (type.includes('heading')) {
      result = this.extractHeadings();
    } else if (type.includes('link')) {
      result = this.extractLinks();
    } else if (type.includes('ranking') || type.includes('general') || type.includes('data')) {
      // For rankings and general data, use universal extraction
      result = this.extractGenericContent();
    } else {
      // Default: try URL-based detection
      const url = window.location.href;
      
      if (url.includes('google.com/search')) {
        result = this.extractSearchResults();
      } else if (url.includes('amazon.') || url.includes('flipkart.')) {
        result = this.extractProductInfo();
      } else {
        result = this.extractArticleContent();
      }
    }
    
    // ✅ UNIVERSAL FALLBACK: If specific extractor returns null/empty, use generic extraction
    const isEmpty = !result || 
                    (Array.isArray(result) && result.length === 0) ||
                    (typeof result === 'object' && Object.keys(result).length === 0);
    
    if (isEmpty) {
      result = this.extractGenericContent();
    }
    
    return result;
  }

  /**
   * Format extracted data as text summary
   */
  formatAsText(data, dataType) {
    if (!data) return 'No data extracted';
    
    if (Array.isArray(data)) {
      if (data.length === 0) return 'No items found';
      
      if (dataType?.includes('search')) {
        return data.map((item, i) => `${i + 1}. ${item.title}`).join('\n');
      } else if (dataType?.includes('list')) {
        return data.map(list => list.items.join('\n')).join('\n\n');
      } else {
        return data.map(item => JSON.stringify(item)).join('\n');
      }
    } else if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    } else {
      return String(data);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataExtractor;
} else if (typeof window !== 'undefined') {
  window.DataExtractor = DataExtractor;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.dataExtractor = new DataExtractor();
  
  /**
   * Extract links from Google search results (ORGANIC RESULTS ONLY)
   */
  function extractSearchLinks() {
    
    const searchResults = [];
    
    // ✨ UPDATED: Modern Google organic result selectors (2024/2025)
    // These target ONLY the main 10 organic results, not all links
    const organicSelectors = [
      '.tF2Cxc',                // Primary organic result container (current Google)
      'div.g:has(.yuRUbf)',     // Organic result with main link
      '#search div.g',          // Fallback for older format
      'div.g',                  // Simple fallback
      '[data-hveid] div.g',     // Alternative with attribute
      '.g'                      // Most basic fallback
    ];
    
    let resultDivs = [];
    let selectorUsed = '';
    
    for (const selector of organicSelectors) {
      try {
        resultDivs = document.querySelectorAll(selector);
        if (resultDivs.length > 0) {
          selectorUsed = selector;
          break;
        } else {
        }
      } catch (err) {
        console.warn(`❌ Selector failed: ${selector}`, err);
      }
    }
    
    if (resultDivs.length === 0) {
      console.warn('⚠️ No organic results found - Google HTML may have changed or page not loaded');
      
      return searchResults;
    }
    
    // Extract data from each organic result
    resultDivs.forEach((div, index) => {
      try {
        // ✨ Get the main link (the one users click)
        const link = div.querySelector('.yuRUbf a, a[href]:has(h3), h3 a');
        const title = div.querySelector('h3');
        
        // Get snippet/description (multiple possible selectors)
        const snippet = div.querySelector('.VwiC3b, .IsZvec, .s, [data-content-feature="1"]');
        
        // Only include if we have the essential data
        if (link && title && link.href) {
          const url = link.href;
          
          // Filter out Google internal links
          if (!url.includes('google.com/search') && 
              !url.includes('google.com/url') &&
              !url.includes('webcache.googleusercontent') &&
              !url.includes('translate.google.com') &&
              url.startsWith('http')) {
            
            try {
              searchResults.push({
                position: searchResults.length + 1, // Sequential numbering
                url: url,
                title: title.textContent.trim(),
                snippet: snippet?.textContent.trim() || '',
                domain: new URL(url).hostname
              });
            } catch (urlError) {
              console.warn(`Invalid URL for result ${index}:`, url);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to extract result ${index}:`, err);
      }
    });
    return searchResults;
  }
  
  // Listen for extraction requests from other tabs (automation window)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle EXTRACT_SEARCH_RESULTS specifically
    if (message.type === 'EXTRACT_SEARCH_RESULTS') {
      
      // Collect debug info to send back with results
      const debugInfo = {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        timestamp: new Date().toISOString()
      };
      
      // Wait a bit longer to ensure Google results are rendered
      setTimeout(() => {
        try {
          const extractor = window.ChromeAIStudio?.dataExtractor;
          
          if (!extractor) {
            console.error('❌ Data extractor not initialized yet');
            sendResponse({
              success: false,
              error: 'Data extractor not initialized',
              results: [],
              debug: debugInfo
            });
            return;
          }
          
          // Check for common Google blocking elements
          const hasRecaptcha = !!document.querySelector('#recaptcha, iframe[src*="recaptcha"]');
          const hasCookieConsent = !!document.querySelector('[aria-label*="cookie" i], [id*="cookie" i], [class*="cookie" i]');
          const hasLoginPrompt = !!document.querySelector('[href*="accounts.google.com"]');
          
          debugInfo.hasRecaptcha = hasRecaptcha;
          debugInfo.hasCookieConsent = hasCookieConsent;
          debugInfo.hasLoginPrompt = hasLoginPrompt;
          
          // Count potential result containers
          debugInfo.elementCounts = {
            'div.g': document.querySelectorAll('div.g').length,
            '.tF2Cxc': document.querySelectorAll('.tF2Cxc').length,
            '#search': document.querySelector('#search') ? 'EXISTS' : 'MISSING',
            '#main': document.querySelector('#main') ? 'EXISTS' : 'MISSING',
            'h3': document.querySelectorAll('h3').length,
            'a[href]': document.querySelectorAll('a[href]').length
          };
          
          const results = extractor.extractSearchLinks();
          
          if (results.length > 0) {
          }
          
          sendResponse({
            success: true,
            results: results,
            debug: debugInfo
          });
        } catch (error) {
          console.error('❌ Search result extraction failed:', error);
          console.error('Stack:', error.stack);
          debugInfo.extractionError = error.message;
          debugInfo.extractionStack = error.stack;
          sendResponse({
            success: false,
            error: error.message,
            results: [],
            debug: debugInfo
          });
        }
      }, 1000); // Increased to 1 second to ensure Google results are fully rendered
      
      return true; // Keep message channel open
    }
    
    if (message.type === 'EXTRACT_DATA') {
      
      // Use setTimeout to ensure async response handling
      setTimeout(() => {
        try {
          const extractor = window.ChromeAIStudio?.dataExtractor;
          
          if (!extractor) {
            throw new Error('Data extractor not initialized yet');
          }
          
          let data;
          
          // Check if this is a Google search page
          if (message.dataType === 'search results' || 
              (window.location.hostname.includes('google.com') && window.location.pathname.includes('/search'))) {
            data = extractor.extractSearchLinks();
          } else {
            data = extractor.smartExtract(message.dataType);
          }
          
          const itemCount = Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0);
          
          sendResponse({
            success: true,
            data: data,
            url: window.location.href,
            title: document.title
          });
        } catch (error) {
          console.error('❌ Extraction request failed:', error);
          console.error('Stack:', error.stack);
          sendResponse({
            success: false,
            error: error.message,
            url: window.location.href
          });
        }
      }, 0);
      
      return true; // Keep message channel open for async response
    }
  });
  
  // Attach extractSearchLinks to class
  DataExtractor.prototype.extractSearchLinks = extractSearchLinks;
}

