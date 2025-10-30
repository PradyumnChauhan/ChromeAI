/**
 * Domain-Specific Filters for URL-to-Markdown
 * Adapted from urltomarkdown/url_to_markdown_common_filters.js
 * 
 * Features:
 * - Wikipedia-specific cleaning (citations, edit links, audio files)
 * - Medium.com image optimization
 * - StackOverflow navigation cleanup
 * - Global filters (relative URLs, unwanted spacing)
 * - Browser-compatible (no Node.js dependencies)
 */

class DomainFilters {
  constructor() {
    this.filterRules = [
      {
        domain: /.*/, // Apply global filters to all domains
        remove: [
          /\[¶\]\(#[^\s]+\s+"[^"]+"\)/g
        ],
        replace: [
          {
            // Unwanted spacing in links
            find: /\[[\n\s]*([^\]\n]*)[\n\s]*\]\(([^\)]*)\)/g,
            replacement: '[$1]($2)'
          },
          {
            // Links stuck together
            find: /\)\[/g,
            replacement: ')\n['
          },
          {
            // Missing URI scheme
            find: /\[([^\]]*)\]\(\/\/([^\)]*)\)/g,
            replacement: '[$1](https://$2)'
          }
        ]
      },
      {
        domain: /.*\.wikipedia\.org/,
        remove: [
          /\*\*\[\^\]\(#cite_ref[^\)]+\)\*\*/g,
          /(?:\\\[)?\[edit\]\([^\s]+\s+"[^"]+"\)(?:\\\])?/ig,
          /\^\s\[Jump up to[^\)]*\)/ig,
          /\[[^\]]*\]\(#cite_ref[^\)]+\)/g,
          /\[\!\[Edit this at Wikidata\].*/g,
          /\[\!\[Listen to this article\]\([^\)]*\)\]\([^\)]*\.(mp3|ogg|oga|flac)[^\)]*\)/g,
          /\[This audio file\]\([^\)]*\).*/g,
          /\!\[Spoken Wikipedia icon\]\([^\)]*\)/g,
          /\[.*\]\(.*Play audio.*\).*/g
        ],
        replace: [
          {
            // Optimize Wikipedia image URLs
            find: /\(https:\/\/upload.wikimedia.org\/wikipedia\/([^\/]+)\/thumb\/([^\)]+\..{3,4})\/[^\)]+\)/ig,
            replacement: '(https://upload.wikimedia.org/wikipedia/$1/$2)'
          },
          {
            // Fix Wikipedia section formatting
            find: /\n(.+)\n\-{32,}\n/ig,
            replacement: (match, title) => {
              return '\n' + title + '\n' + '-'.repeat(title.length) + '\n'
            }
          }
        ]
      },
      {
        domain: /(?:.*\.)?medium\.com/,
        replace: [
          {
            // Optimize Medium image URLs
            find: '(https://miro.medium.com/max/60/',
            replacement: '(https://miro.medium.com/max/600/'
          },
          {
            // Fix Medium image formatting
            find: /\s*\[\s*!\[([^\]]+)\]\(([^\)]+)\)\s*\]\(([^\?\)]*)\?[^\)]*\)\s*/g,
            replacement: '\n![$1]($2)\n[$1]($3)\n\n'
          }
        ]
      },
      {
        domain: /(?:.*\.)?stackoverflow\.com/,
        remove: [
          /\* +Links(.|\r|\n)*Three +\|/g
        ]
      }
    ];
  }

  /**
   * Strip style and script blocks from HTML
   * Browser-compatible version
   */
  stripStyleAndScriptBlocks(html) {
    html = html.replace(/<style[\s\S]*?<\/style>/g, "");
    return html.replace(/<script[\s\S]*?<\/script>/g, "");
  }

  /**
   * Apply domain-specific filters to markdown content
   * @param {string} url - The source URL
   * @param {string} markdown - The markdown content to filter
   * @param {boolean} ignoreLinks - Whether to remove inline links
   * @returns {string} - Filtered markdown content
   */
  filter(url, markdown, ignoreLinks = false) {
    let domain = '';
    let base_address = '';
    
    if (url) {
      try {
        const urlObj = new URL(url);
        base_address = urlObj.protocol + "//" + urlObj.hostname;
        domain = urlObj.hostname;
      } catch (e) {
        console.warn('Invalid URL:', url);
        return markdown;
      }
    }

    // Apply domain-specific filters
    for (let i = 0; i < this.filterRules.length; i++) {
      const rule = this.filterRules[i];
      
      if (domain.match(rule.domain)) {
        // Apply remove patterns
        if (rule.remove) {
          for (let j = 0; j < rule.remove.length; j++) {
            markdown = markdown.replace(rule.remove[j], "");
          }
        }
        
        // Apply replace patterns
        if (rule.replace) {
          for (let j = 0; j < rule.replace.length; j++) {
            const replacement = rule.replace[j];
            if (typeof replacement.replacement === 'function') {
              markdown = markdown.replace(replacement.find, replacement.replacement);
            } else {
              markdown = markdown.replace(replacement.find, replacement.replacement);
            }
          }
        }
      }
    }

    // Make relative URLs absolute
    markdown = markdown.replace(/\[([^\]]*)\]\(\/([^\/][^\)]*)\)/g, (match, title, address) => {
      return "[" + title + "](" + base_address + "/" + address + ")";
    });

    // Remove inline links and refs if requested
    if (ignoreLinks) {
      markdown = markdown.replace(/\[\[?([^\]]+\]?)\]\([^\)]+\)/g, '$1');
      markdown = markdown.replace(/[\\\[]+([0-9]+)[\\\]]+/g, '[$1]');
    }

    return markdown;
  }

  /**
   * Get filter statistics for debugging
   * @param {string} url - The source URL
   * @returns {object} - Filter statistics
   */
  getFilterStats(url) {
    let domain = '';
    let applicableRules = 0;
    
    if (url) {
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch (e) {
        return { domain: 'invalid', applicableRules: 0 };
      }
    }

    for (let i = 0; i < this.filterRules.length; i++) {
      const rule = this.filterRules[i];
      if (domain.match(rule.domain)) {
        applicableRules++;
      }
    }

    return {
      domain: domain,
      applicableRules: applicableRules,
      totalRules: this.filterRules.length
    };
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.DomainFilters = DomainFilters;
}

// Export for Node.js use (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DomainFilters;
}












