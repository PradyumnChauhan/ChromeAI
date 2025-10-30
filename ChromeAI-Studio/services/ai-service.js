/**
 * ChromeAI Studio - AI Service
 * Business logic layer for AI operations with event-driven architecture
 */

// Logger will be available globally

class AIService {
  constructor(aiManager, eventBus, logger) {
    this.ai = aiManager;
    this.eventBus = eventBus;
    this.logger = logger || new window.ChromeAIStudio.Logger('AIService');
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for AI operations
   */
  setupEventListeners() {
    if (!this.eventBus) return;

    // Listen for AI requests
    this.eventBus.on('ai:request', this.handleAIRequest.bind(this));
    
    // Listen for mode changes
    this.eventBus.on('mode:changed', (mode) => {
      this.logger.debug('Mode changed to:', mode);
      this.clearCache(); // Clear cache on mode change
    });
  }

  /**
   * Handle AI requests from UI components
   */
  async handleAIRequest(request) {
    const { operation, text, options = {}, source } = request;
    
    this.logger.info(`AI request: ${operation} from ${source}`);
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(operation, text, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached result');
        this.eventBus.emit('ai:response', {
          ...cached,
          cached: true,
          source
        });
        return cached;
      }

      // Process the request
      const result = await this.processAIRequest(operation, text, options);
      
      // Cache successful results
      if (result.success) {
        this.setCache(cacheKey, result);
      }
      
      // Emit response event
      this.eventBus.emit('ai:response', {
        ...result,
        operation,
        source,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      this.logger.error(`AI request failed: ${operation}`, error);
      
      const errorResult = {
        success: false,
        result: null,
        error: {
          message: error.message || 'AI operation failed',
          code: 'AI_SERVICE_ERROR',
          operation
        },
        source,
        timestamp: Date.now()
      };
      
      this.eventBus.emit('ai:response', errorResult);
      return errorResult;
    }
  }

  /**
   * Process AI request based on operation type
   */
  async processAIRequest(operation, text, options) {
    switch (operation) {
      case 'prompt':
        return await this.ai.prompt(text, options);
      case 'summarize':
        return await this.ai.summarize(text, options);
      case 'write':
        return await this.ai.write(text, options);
      case 'rewrite':
        return await this.ai.rewrite(text, options);
      case 'translate':
        return await this.ai.translate(text, options.sourceLanguage, options.targetLanguage);
      case 'proofread':
        return await this.ai.proofread(text, options);
      case 'detect-language':
        return await this.ai.detectLanguage(text, options);
      default:
        throw new Error(`Unknown AI operation: ${operation}`);
    }
  }

  /**
   * Process AI request with streaming support
   */
  async processAIRequestStreaming(operation, text, options, onChunk, onComplete, onError) {
    try {
      let result;
      
      switch (operation) {
        case 'prompt':
          result = await this.ai.promptStreaming(text, options);
          break;
        case 'summarize':
          result = await this.ai.summarizeStreaming(text, options);
          break;
        case 'write':
          result = await this.ai.writeStreaming(text, options);
          break;
        case 'rewrite':
          result = await this.ai.rewriteStreaming(text, options);
          break;
        case 'translate':
          result = await this.ai.translateStreaming(text, options.sourceLanguage, options.targetLanguage);
          break;
        default:
          throw new Error(`Streaming not supported for operation: ${operation}`);
      }
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Streaming failed');
      }
      
      // Consume the stream
      let fullResult = '';
      for await (const chunk of result.result) {
        fullResult += chunk;
        if (onChunk) onChunk(chunk, fullResult);
      }
      
      if (onComplete) onComplete(fullResult);
      
      return {
        success: true,
        result: fullResult,
        operation,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error(`Streaming AI request failed: ${operation}`, error);
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Get cache key for request
   */
  getCacheKey(operation, text, options) {
    const textHash = this.hashString(text);
    const optionsHash = this.hashString(JSON.stringify(options));
    return `${operation}:${textHash}:${optionsHash}`;
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.AIService = AIService;
}
