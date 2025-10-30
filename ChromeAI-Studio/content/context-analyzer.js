/**
 * ChromeAI Studio - Context Detection Engine
 * Intelligent system to detect website context and determine optimal AI mode
 */

class ContextDetector {
  constructor() {
    // URL pattern matching for different contexts
    this.patterns = {
      educational: [
        /wikipedia\.org/i,
        /\.edu\//i,
        /coursera\.org/i,
        /edx\.org/i,
        /khanacademy\.org/i,
        /udemy\.com/i,
        /skillshare\.com/i,
        /pluralsight\.com/i,
        /lynda\.com/i,
        /codecademy\.com/i,
        /freecodecamp\.org/i,
        /docs\./i,
        /tutorial/i,
        /learn/i,
        /course/i,
        /lesson/i,
        /education/i,
        /study/i,
        /academic/i,
        /university/i,
        /college/i,
        /school/i
      ],
      development: [
        /github\.com/i,
        /gitlab\.com/i,
        /bitbucket\.org/i,
        /stackoverflow\.com/i,
        /stackexchange\.com/i,
        /developer\./i,
        /dev\./i,
        /api\./i,
        /docs\./i,
        /documentation/i,
        /reference/i,
        /npm\.com/i,
        /pypi\.org/i,
        /packagist\.org/i,
        /rubygems\.org/i,
        /crates\.io/i,
        /maven\.org/i,
        /codepen\.io/i,
        /jsfiddle\.net/i,
        /repl\.it/i,
        /codesandbox\.io/i,
        /jsbin\.com/i,
        /hackernews\.com/i,
        /reddit\.com\/r\/(programming|webdev|javascript|python|coding)/i
      ],
      creative: [
        /instagram\.com/i,
        /twitter\.com/i,
        /facebook\.com/i,
        /linkedin\.com/i,
        /pinterest\.com/i,
        /behance\.net/i,
        /dribbble\.com/i,
        /medium\.com/i,
        /wordpress\.com/i,
        /blogger\.com/i,
        /tumblr\.com/i,
        /tiktok\.com/i,
        /youtube\.com/i,
        /vimeo\.com/i,
        /canva\.com/i,
        /figma\.com/i,
        /sketch\.com/i,
        /adobe\.com/i,
        /unsplash\.com/i,
        /pexels\.com/i,
        /shutterstock\.com/i,
        /getty/i,
        /cms/i,
        /blog/i,
        /content/i,
        /social/i,
        /marketing/i,
        /design/i
      ],
      research: [
        /scholar\.google/i,
        /pubmed\.ncbi\.nlm\.nih\.gov/i,
        /arxiv\.org/i,
        /researchgate\.net/i,
        /academia\.edu/i,
        /jstor\.org/i,
        /springer\.com/i,
        /sciencedirect\.com/i,
        /wiley\.com/i,
        /nature\.com/i,
        /science\.org/i,
        /plos\.org/i,
        /ieee\.org/i,
        /acm\.org/i,
        /ncbi\.nlm\.nih\.gov/i,
        /nih\.gov/i,
        /research/i,
        /journal/i,
        /paper/i,
        /publication/i,
        /academic/i,
        /scientific/i,
        /study/i,
        /analysis/i,
        /review/i,
        /library/i,
        /archive/i
      ]
    };

    // Content keywords for context analysis
    this.contentKeywords = {
      educational: [
        'learn', 'learning', 'tutorial', 'course', 'lesson', 'study', 'education',
        'teach', 'teaching', 'student', 'instructor', 'professor', 'class',
        'homework', 'assignment', 'exam', 'quiz', 'test', 'grade', 'diploma',
        'certificate', 'university', 'college', 'school', 'academic', 'curriculum',
        'syllabus', 'lecture', 'seminar', 'workshop', 'training', 'skill',
        'knowledge', 'concept', 'theory', 'practice', 'example', 'exercise'
      ],
      development: [
        'code', 'coding', 'programming', 'developer', 'development', 'software',
        'function', 'method', 'class', 'variable', 'array', 'object', 'api',
        'framework', 'library', 'package', 'module', 'import', 'export',
        'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
        'html', 'css', 'sql', 'database', 'server', 'client', 'frontend',
        'backend', 'fullstack', 'git', 'github', 'repository', 'commit',
        'pull request', 'merge', 'branch', 'deploy', 'build', 'test', 'debug',
        'error', 'bug', 'fix', 'solution', 'stackoverflow', 'documentation'
      ],
      creative: [
        'design', 'creative', 'content', 'visual', 'graphic', 'art', 'photo',
        'image', 'video', 'audio', 'music', 'brand', 'logo', 'color',
        'typography', 'font', 'layout', 'composition', 'style', 'aesthetic',
        'blog', 'post', 'article', 'story', 'narrative', 'copy', 'copywriting',
        'marketing', 'advertising', 'campaign', 'social media', 'instagram',
        'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok', 'influencer',
        'engagement', 'audience', 'follower', 'like', 'share', 'comment',
        'hashtag', 'viral', 'trending', 'portfolio', 'showcase', 'gallery'
      ],
      research: [
        'research', 'study', 'analysis', 'paper', 'journal', 'article',
        'publication', 'academic', 'scientific', 'scholar', 'citation',
        'reference', 'bibliography', 'methodology', 'hypothesis', 'data',
        'statistics', 'experiment', 'observation', 'findings', 'results',
        'conclusion', 'abstract', 'introduction', 'literature review',
        'discussion', 'peer review', 'conference', 'symposium', 'thesis',
        'dissertation', 'doctorate', 'phd', 'master', 'bachelor', 'degree',
        'university', 'institution', 'laboratory', 'field work', 'survey'
      ]
    };

    // DOM element selectors that indicate context
    this.domSelectors = {
      educational: [
        '[class*="course"]', '[class*="lesson"]', '[class*="tutorial"]',
        '[class*="learn"]', '[class*="education"]', '[class*="study"]',
        '.video-player', '.quiz', '.exercise', '.assignment',
        'h1, h2, h3', '.content', '.article', '.documentation'
      ],
      development: [
        'pre', 'code', '.highlight', '.code-block', '.syntax',
        '[class*="code"]', '[class*="snippet"]', '[class*="example"]',
        '.repository', '.commit', '.diff', '.pull-request',
        '.issue', '.documentation', '.api-reference', '.readme'
      ],
      creative: [
        'img', 'video', 'canvas', 'svg', '.gallery', '.portfolio',
        '[class*="image"]', '[class*="photo"]', '[class*="visual"]',
        '[class*="design"]', '[class*="creative"]', '[class*="art"]',
        '.post', '.blog', '.article', '.story', '.content',
        '.social', '.share', '.like', '.comment', '.hashtag'
      ],
      research: [
        '.abstract', '.citation', '.reference', '.bibliography',
        '[class*="paper"]', '[class*="journal"]', '[class*="research"]',
        '[class*="academic"]', '[class*="scientific"]', '[class*="study"]',
        '.author', '.publication', '.doi', '.pmid', '.issn',
        'table', 'figure', 'chart', '.data', '.statistics'
      ]
    };
  }

  /**
   * Main context analysis method - public interface
   * @returns {Object} Context analysis results
   */
  async analyzeContext(url = window.location.href, content = '', dom = document, userActivity = {}) {
    return await this.detectContext(url, content, dom, userActivity);
  }

  /**
   * Main method to detect context and suggest mode
   * @param {string} url - Current page URL
   * @param {string} content - Page text content
   * @param {Document} dom - DOM document
   * @param {Object} userActivity - User activity patterns
   * @returns {Object} Context analysis results
   */
  async detectContext(url = window.location.href, content = '', dom = document, userActivity = {}) {
    try {
      
      // Analyze different context indicators
      const urlAnalysis = this._analyzeURL(url);
      const contentAnalysis = await this._analyzeContent(content || this._extractPageContent(dom));
      const domAnalysis = this._analyzeDOMStructure(dom);
      const metaAnalysis = this._analyzeMetadata(dom);
      
      // Combine all analyses
      const combinedScores = this._combineAnalyses(urlAnalysis, contentAnalysis, domAnalysis, metaAnalysis);
      
      // Determine primary context and confidence
      const primaryContext = this._getPrimaryContext(combinedScores);
      const confidence = this._calculateConfidence(combinedScores, primaryContext);
      const suggestedMode = this._suggestMode(primaryContext, confidence, userActivity);
      
      const result = {
        primaryContext,
        confidence,
        suggestedMode,
        scores: combinedScores,
        analyses: {
          url: urlAnalysis,
          content: contentAnalysis,
          dom: domAnalysis,
          meta: metaAnalysis
        },
        timestamp: Date.now()
      };
      return result;
      
    } catch (error) {
      console.error('❌ Context detection error:', error);
      return this._getDefaultContext();
    }
  }

  /**
   * Analyze URL patterns
   */
  _analyzeURL(url) {
    const scores = { educational: 0, development: 0, creative: 0, research: 0 };
    
    Object.entries(this.patterns).forEach(([context, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(url)) {
          scores[context] += 1;
        }
      });
    });

    return scores;
  }

  /**
   * Analyze page content using AI
   */
  async _analyzeContent(content) {
    const scores = { educational: 0, development: 0, creative: 0, research: 0 };
    
    if (!content) return scores;
    
    // First, do keyword-based analysis
    const words = content.toLowerCase().split(/\s+/);
    
    Object.entries(this.contentKeywords).forEach(([context, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          scores[context] += matches.length * 0.1; // Weight keyword matches
        }
      });
    });

    // Try AI-enhanced content analysis if available
    try {
      if (window.ChromeAIStudio?.aiManager?.apiStatus?.prompt === 'ready') {
        const aiAnalysis = await this._aiAnalyzeContent(content);
        if (aiAnalysis) {
          // Boost scores based on AI analysis
          Object.keys(scores).forEach(context => {
            if (aiAnalysis.includes(context)) {
              scores[context] += 2;
            }
          });
        }
      }
    } catch (error) {
      console.warn('AI content analysis failed, using keyword analysis only:', error);
    }

    return scores;
  }

  /**
   * AI-powered content analysis
   */
  async _aiAnalyzeContent(content) {
    try {
      // Truncate content for AI analysis (to avoid token limits)
      const truncatedContent = content.substring(0, 2000);
      
      const prompt = `Analyze this webpage content and identify the primary context. 
      Respond with only one word: "educational", "development", "creative", or "research".
      
      Content: ${truncatedContent}`;
      
      const result = await window.ChromeAIStudio.aiManager.prompt(prompt);
      return result.toLowerCase().trim();
    } catch (error) {
      console.warn('AI content analysis failed:', error);
      return null;
    }
  }

  /**
   * Analyze DOM structure
   */
  _analyzeDOMStructure(dom) {
    const scores = { educational: 0, development: 0, creative: 0, research: 0 };
    
    Object.entries(this.domSelectors).forEach(([context, selectors]) => {
      selectors.forEach(selector => {
        try {
          const elements = dom.querySelectorAll(selector);
          scores[context] += elements.length * 0.2; // Weight DOM element presence
        } catch (error) {
          // Invalid selector, skip
        }
      });
    });

    return scores;
  }

  /**
   * Analyze page metadata
   */
  _analyzeMetadata(dom) {
    const scores = { educational: 0, development: 0, creative: 0, research: 0 };
    
    try {
      // Analyze title
      const title = dom.title.toLowerCase();
      Object.entries(this.contentKeywords).forEach(([context, keywords]) => {
        keywords.forEach(keyword => {
          if (title.includes(keyword)) {
            scores[context] += 0.5;
          }
        });
      });

      // Analyze meta description
      const metaDesc = dom.querySelector('meta[name="description"]');
      if (metaDesc) {
        const description = metaDesc.content.toLowerCase();
        Object.entries(this.contentKeywords).forEach(([context, keywords]) => {
          keywords.forEach(keyword => {
            if (description.includes(keyword)) {
              scores[context] += 0.3;
            }
          });
        });
      }

      // Analyze meta keywords
      const metaKeywords = dom.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        const keywords = metaKeywords.content.toLowerCase();
        Object.entries(this.contentKeywords).forEach(([context, contextKeywords]) => {
          contextKeywords.forEach(keyword => {
            if (keywords.includes(keyword)) {
              scores[context] += 0.4;
            }
          });
        });
      }

    } catch (error) {
      console.warn('Metadata analysis failed:', error);
    }

    return scores;
  }

  /**
   * Extract text content from page
   */
  _extractPageContent(dom) {
    try {
      // Remove script and style elements
      const clonedDom = dom.cloneNode(true);
      const scripts = clonedDom.querySelectorAll('script, style, nav, header, footer');
      scripts.forEach(el => el.remove());
      
      // Get main content areas
      const contentSelectors = ['main', 'article', '.content', '.post', '.entry', 'body'];
      let content = '';
      
      for (const selector of contentSelectors) {
        const element = clonedDom.querySelector(selector);
        if (element) {
          content = element.textContent || element.innerText || '';
          break;
        }
      }
      
      // Fallback to body text
      if (!content) {
        content = clonedDom.body?.textContent || '';
      }
      
      // Clean up text
      return content
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit content length
        
    } catch (error) {
      console.warn('Content extraction failed:', error);
      return '';
    }
  }

  /**
   * Combine all analysis results
   */
  _combineAnalyses(urlAnalysis, contentAnalysis, domAnalysis, metaAnalysis) {
    const combined = { educational: 0, development: 0, creative: 0, research: 0 };
    
    // Weight different analyses
    const weights = {
      url: 3,      // URL patterns are strong indicators
      content: 2,  // Content analysis is important
      dom: 1.5,    // DOM structure is moderately important
      meta: 1      // Metadata is helpful but less reliable
    };
    
    Object.keys(combined).forEach(context => {
      combined[context] = 
        (urlAnalysis[context] * weights.url) +
        (contentAnalysis[context] * weights.content) +
        (domAnalysis[context] * weights.dom) +
        (metaAnalysis[context] * weights.meta);
    });
    
    return combined;
  }

  /**
   * Determine primary context
   */
  _getPrimaryContext(scores) {
    const entries = Object.entries(scores);
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  /**
   * Calculate confidence level
   */
  _calculateConfidence(scores, primaryContext) {
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total === 0) return 0;
    
    const primaryScore = scores[primaryContext];
    const confidence = primaryScore / total;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Suggest appropriate mode based on context
   */
  _suggestMode(primaryContext, confidence, userActivity = {}) {
    // If confidence is low, use user's preferred mode or default
    if (confidence < 0.3) {
      return userActivity.preferredMode || 'student';
    }
    
    // Map contexts to modes
    const contextToMode = {
      educational: 'student',
      development: 'developer',
      creative: 'creator',
      research: 'researcher'
    };
    
    return contextToMode[primaryContext] || 'student';
  }

  /**
   * Get default context when detection fails
   */
  _getDefaultContext() {
    return {
      primaryContext: 'educational',
      confidence: 0.1,
      suggestedMode: 'student',
      scores: { educational: 0.1, development: 0, creative: 0, research: 0 },
      analyses: {
        url: { educational: 0, development: 0, creative: 0, research: 0 },
        content: { educational: 0, development: 0, creative: 0, research: 0 },
        dom: { educational: 0, development: 0, creative: 0, research: 0 },
        meta: { educational: 0, development: 0, creative: 0, research: 0 }
      },
      timestamp: Date.now(),
      error: true
    };
  }

  /**
   * Get readable context description
   */
  getContextDescription(context) {
    const descriptions = {
      educational: 'Educational content - learning materials, tutorials, courses',
      development: 'Development content - code, documentation, programming resources',
      creative: 'Creative content - design, social media, visual content',
      research: 'Research content - academic papers, scientific articles, studies'
    };
    
    return descriptions[context] || 'Unknown context';
  }

  /**
   * Check if context detection should run
   */
  shouldDetectContext(url) {
    // Skip detection for certain URLs
    const skipPatterns = [
      /chrome-extension:/,
      /moz-extension:/,
      /about:/,
      /file:/,
      /data:/,
      /javascript:/
    ];
    
    return !skipPatterns.some(pattern => pattern.test(url));
  }
}

// Create and export singleton instance
const contextDetector = new ContextDetector();

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.contextDetector = contextDetector;
}