/**
 * ChromeAI Studio - API Wrapper
 * Production-ready wrapper for Chrome's built-in AI APIs with validation and error handling
 * Based on working code examples from Chrome AI documentation
 */

// Import utilities (will be available globally)
// Note: These will be available after the utilities are loaded

class AIManager {
  constructor() {
    // Track API instances
    this.languageModel = null;
    this.summarizer = null;
    this.writer = null;
    this.translator = null;
    this.rewriter = null;
    this.proofreader = null;
    this.languageDetector = null;
    
    // Session pooling for performance
    this.sessionPool = {
      languageModel: [],
      summarizer: [],
      writer: [],
      translator: [],
      rewriter: [],
      proofreader: [],
      languageDetector: []
    };
    this.maxPoolSize = 3;
    this.sessionTimeouts = new Map();
    
    // Track initialization status
    this.initialized = false;
    this.ready = false;
    
    // Initialize logger
    this.logger = new window.ChromeAIStudio.Logger('AIManager');
    
    // Initialize event bus
    this.eventBus = window.ChromeAIStudio?.eventBus;
    
    this.logger.info('AIManager initialized - ready to create AI sessions with pooling');
    
    // Load cached sessions on initialization
    this.loadCachedSessions();
  }

  /**
   * Eagerly preload all AI sessions with detailed debug logs
   */
  async preloadAll() {
    const tasks = [
      { name: 'Summarizer', fn: () => this.createSummarizer() },
      { name: 'Writer', fn: () => this.createWriter() },
      { name: 'Translator(en→es)', fn: () => this.createTranslator('en', 'es') },
      { name: 'Rewriter', fn: () => this.createRewriter() },
      { name: 'Proofreader', fn: () => this.createProofreader() },
      { name: 'LanguageDetector', fn: () => this.createLanguageDetector() }
    ];
    this.logger.info('[INIT] Preloading AI sessions...');
    const results = await Promise.allSettled(tasks.map(t => t.fn()));
    results.forEach((res, i) => {
      const label = tasks[i].name;
      if (res.status === 'fulfilled') {
        this.logger.info(`[INIT] ${label} ready`);
      } else {
        this.logger.warn(`[INIT] ${label} failed:`, res.reason && (res.reason.message || String(res.reason)));
      }
    });
    await this.saveSessions();
    return results;
  }

  isReady() {
    return !!this.ready;
  }

  /**
   * Load cached sessions from storage
   */
  async loadCachedSessions() {
    try {
      const cached = await chrome.storage.local.get('ai_sessions');
      if (cached.ai_sessions) {
        // Store session metadata for faster recreation
        this.cachedSessions = cached.ai_sessions;
      } else {
        this.cachedSessions = {};
      }
    } catch (error) {
      console.warn('Could not load cached sessions:', error);
      this.cachedSessions = {};
    }
  }

  /**
   * Check if a cached session metadata is still valid
   */
  async isSessionValid(type, sessionData) {
    // Check if session was created recently (within 24 hours)
    if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
      return false;
    }
    // Just check if metadata exists and is recent
    return sessionData.timestamp;
  }

  /**
   * Save current sessions to storage
   */
  async saveSessions() {
    const sessions = {};
    if (this.languageModel) sessions.languageModel = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.summarizer) sessions.summarizer = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.writer) sessions.writer = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.translator) sessions.translator = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.rewriter) sessions.rewriter = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.proofreader) sessions.proofreader = { 
      timestamp: Date.now(),
      created: true
    };
    if (this.languageDetector) sessions.languageDetector = { 
      timestamp: Date.now(),
      created: true
    };
    
    try {
      await chrome.storage.local.set({ ai_sessions: sessions });
    } catch (error) {
      console.warn('Could not save sessions:', error);
    }
  }

  /**
   * Get session from pool or create new one
   */
  async getSession(type, options = {}) {
    const pool = this.sessionPool[type];
    if (!pool) {
      throw new Error(`Unknown session type: ${type}`);
    }
    
    // Try to get existing session from pool
    if (pool.length > 0) {
      const session = pool.pop();
      this.logger.debug(`Reusing ${type} session from pool`);
      return session;
    }
    
    // Create new session if pool is empty
    this.logger.debug(`Creating new ${type} session`);
    return await this.createSession(type, options);
  }

  /**
   * Return session to pool
   */
  returnSession(type, session) {
    const pool = this.sessionPool[type];
    if (!pool || pool.length >= this.maxPoolSize) {
      // Pool is full, don't add session
      this.logger.debug(`Pool full for ${type}, discarding session`);
      return;
    }
    
    pool.push(session);
    this.logger.debug(`Returned ${type} session to pool (${pool.length}/${this.maxPoolSize})`);
    
    // Set timeout to clean up old sessions
    this.setSessionTimeout(type, session);
  }

  /**
   * Set timeout for session cleanup
   */
  setSessionTimeout(type, session) {
    const timeoutId = setTimeout(() => {
      this.cleanupSession(type, session);
    }, 300000); // 5 minutes
    
    this.sessionTimeouts.set(session, timeoutId);
  }

  /**
   * Clean up session from pool
   */
  cleanupSession(type, session) {
    const pool = this.sessionPool[type];
    if (pool) {
      const index = pool.indexOf(session);
      if (index > -1) {
        pool.splice(index, 1);
        this.logger.debug(`Cleaned up ${type} session from pool`);
      }
    }
    
    // Clear timeout
    const timeoutId = this.sessionTimeouts.get(session);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.sessionTimeouts.delete(session);
    }
  }

  /**
   * Create session based on type
   */
  async createSession(type, options = {}) {
    switch (type) {
      case 'languageModel':
        return await this.createLanguageModel(options);
      case 'summarizer':
        return await this.createSummarizer(options);
      case 'writer':
        return await this.createWriter(options);
      case 'translator':
        return await this.createTranslator(options);
      case 'rewriter':
        return await this.createRewriter(options);
      case 'proofreader':
        return await this.createProofreader(options);
      case 'languageDetector':
        return await this.createLanguageDetector(options);
      default:
        throw new Error(`Unknown session type: ${type}`);
    }
  }

  /**
   * Initialize the AI manager
   */
  async init() {
    if (this.initialized) return;
    
    this.logger.info('Initializing AI Manager with direct API access...');
    
    // Check if APIs are available in global scope
    const apiChecks = {
      LanguageModel: typeof LanguageModel !== 'undefined',
      Summarizer: typeof Summarizer !== 'undefined',
      Writer: typeof Writer !== 'undefined',
      Translator: typeof Translator !== 'undefined',
      Rewriter: typeof Rewriter !== 'undefined',
      Proofreader: typeof Proofreader !== 'undefined',
      LanguageDetector: typeof LanguageDetector !== 'undefined'
    };
    
    this.logger.info('API Availability Check:', apiChecks);
    
    // Pre-warm language model in background for faster MCP responses
    if (apiChecks.LanguageModel) {
      this.logger.info('Pre-warming language model for faster voice responses...');
      try {
        // Create and immediately destroy a lightweight session to warm up the model
        const warmupSession = await LanguageModel.create({
          temperature: 0.7,
          topK: 20,
          outputLanguage: 'en'
        });
        // Test prompt to ensure model is loaded
        await warmupSession.prompt('Hello');
        warmupSession.destroy();
        this.logger.info('Language model pre-warmed successfully');
      } catch (error) {
        this.logger.warn('Language model pre-warming failed (will work normally):', error);
      }
    }
    // Eagerly create other sessions (best-effort)
    try {
      await this.preloadAll();
    } catch (e) {
      this.logger.warn('Preload all failed (continuing):', e && e.message ? e.message : String(e));
    }

    this.initialized = true;
    this.ready = true;
    const readyPayload = {
      apiChecks,
      timestamp: Date.now(),
      sessions: {
        languageModel: !!this.languageModel,
        summarizer: !!this.summarizer,
        writer: !!this.writer,
        translator: !!this.translator,
        rewriter: !!this.rewriter,
        proofreader: !!this.proofreader,
        languageDetector: !!this.languageDetector
      }
    };
    this.logger.info('[INIT] ai:ready emitted', readyPayload);
    this.eventBus?.emit('ai:initialized', { apiChecks });
    this.eventBus?.emit('ai:ready', readyPayload);
    return true;
  }

  /**
   * Create standardized API response
   * @private
   * @param {boolean} success - Whether the operation succeeded
   * @param {any} result - The result data
   * @param {Object|null} error - Error information
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Standardized response
   */
  _createResponse(success, result = null, error = null, metadata = {}) {
    const response = {
      success,
      result,
      error,
      timestamp: Date.now(),
      ...metadata
    };

    // Emit event for successful operations
    if (success && this.eventBus) {
      this.eventBus.emit('ai:success', response);
    } else if (!success && this.eventBus) {
      this.eventBus.emit('ai:error', response);
    }

    return response;
  }

  /**
   * Handle API errors consistently
   * @private
   * @param {Error} error - The error object
   * @param {string} operation - The operation that failed
   * @param {string} code - Error code
   * @returns {Object} - Standardized error response
   */
  _handleError(error, operation, code = 'UNKNOWN_ERROR') {
    const errorMessage = error?.message || String(error);
    this.logger.error(`${operation} failed:`, errorMessage);

    return this._createResponse(false, null, {
      message: errorMessage,
      code,
      operation,
      stack: error?.stack
    });
  }

  // =============================================================================
  // LANGUAGE MODEL API - Based on: const session = await LanguageModel.create();
  // =============================================================================

  /**
   * Create a language model session
   * Based on: const session = await LanguageModel.create();
   */
  async createLanguageModel(options = {}) {
    // Check if we already have a valid session
    if (this.languageModel) {
      return this.languageModel;
    }
    
    // Check if we have cached metadata (skip download progress)
    const hasCachedMetadata = this.cachedSessions?.languageModel?.created;
    
    try {
      const defaultOptions = {
        monitor: options.monitor || (hasCachedMetadata ? undefined : ((m) => {
          m.addEventListener('downloadprogress', (e) => {
          });
        })),
        temperature: options.temperature || 0.7,
        topK: options.topK || 20,
        outputLanguage: options.outputLanguage || 'en'
      };

      // Merge with user options - supports initialPrompts, temperature, topK
      const sessionOptions = { ...defaultOptions, ...options };
      
      if (hasCachedMetadata) {
      } else {
      }
      
      this.languageModel = await LanguageModel.create(sessionOptions);
      
      // Save to cache
      await this.saveSessions();
      
      return this.languageModel;
    } catch (error) {
      console.error('❌ Failed to create LanguageModel:', error);
      // Don't throw - return null so callers can handle gracefully
      return null;
    }
  }

  /**
   * Prompt the language model
   * Based on: const result = await session.prompt("Write me a poem.");
   * @param {string} text - Text to prompt with
   * @param {Object} options - Prompt options
   * @returns {Promise<Object>} - Standardized response
   */
  async prompt(text, options = {}) {
    let session = null;
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 32 * 1024, 'Prompt text');
      }

      // Get session from pool
      session = await this.getSession('languageModel', options);

      if (!session) {
        return this._createResponse(false, null, {
          message: 'LanguageModel API not available',
          code: 'API_UNAVAILABLE'
        });
      }

      // Log input size for debugging quota issues
      const inputSize = new TextEncoder().encode(text).length;
      this.logger.debug(`LanguageModel input size: ${inputSize} bytes`);
      
      // Check input size limit
      const maxPromptSize = 32 * 1024; // 32KB
      if (inputSize > maxPromptSize) {
        this.logger.warn(`Input size (${inputSize} bytes) exceeds recommended limit (${maxPromptSize} bytes)`);
        text = window.ChromeAIStudio?.InputValidator ? window.ChromeAIStudio.InputValidator.truncateText(text, maxPromptSize) : text.substring(0, Math.floor(maxPromptSize / 2));
        this.logger.info('Input truncated to prevent quota error');
      }
      
      this.logger.info('Prompting LanguageModel:', text.substring(0, 50) + '...');
      
      try {
        // Ensure outputLanguage is specified per-request
        const reqOptions = { outputLanguage: 'en', ...options };
        const result = await session.prompt(text, reqOptions);
        this.logger.info('LanguageModel response received');
        
        // Return session to pool
        this.returnSession('languageModel', session);
        
        return this._createResponse(true, result, null, {
          inputSize,
          operation: 'prompt'
        });
      } catch (error) {
        // Return session to pool even on error
        this.returnSession('languageModel', session);
        
        if (error && error.name === 'QuotaExceededError') {
          this.logger.error('LanguageModel quota error:', {
            inputSize,
            errorDetails: error.message,
            suggestion: 'Try reducing input size or using streaming API'
          });
          
          return this._createResponse(false, null, {
            message: 'Input is too large. Please try with a smaller selection.',
            code: 'QUOTA_EXCEEDED',
            inputSize,
            suggestion: 'Try reducing input size or using streaming API'
          });
        }
        
        return this._handleError(error, 'LanguageModel prompt', 'UNKNOWN_ERROR');
      }
    } catch (error) {
      return this._handleError(error, 'LanguageModel prompt', 'INVALID_INPUT');
    }
  }

  /**
   * Stream prompt responses (simulated - Chrome AI LanguageModel doesn't support streaming)
   * Based on: const stream = session.promptStreaming(text);
   */
  async promptStreaming(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 32 * 1024, 'Prompt text for streaming');
      }

      if (!this.languageModel) {
        await this.createLanguageModel(options);
      }

      if (!this.languageModel) {
        return this._createResponse(false, null, {
          message: 'LanguageModel API not available',
          code: 'API_UNAVAILABLE'
        });
      }
      
      // ✅ Use REAL Chrome AI streaming API - returns ReadableStream directly!
      const reqOptions = { outputLanguage: 'en', ...options };
      const stream = this.languageModel.promptStreaming(text, reqOptions);
      return this._createResponse(true, stream, null, {
        operation: 'promptStreaming'
      });
    } catch (error) {
      console.error('❌ LanguageModel streaming failed:', error);
      return this._handleError(error, 'LanguageModel streaming', 'STREAMING_ERROR');
    }
  }

  // ✅ All fake streaming helpers removed - now using REAL Chrome AI streaming APIs!

  /**
   * Get language model parameters
   * Based on: const params = await LanguageModel.params();
   */
  async getLanguageModelParams() {
    try {
      const params = await LanguageModel.params();
      return params;
    } catch (error) {
      console.error('❌ Failed to get LanguageModel params:', error);
      throw error;
    }
  }

  // =============================================================================
  // SUMMARIZER API - Based on: const summarizer = await Summarizer.create(options);
  // =============================================================================

  /**
   * Create a summarizer instance
   * Based on: const summarizer = await Summarizer.create(options);
   */
  async createSummarizer(options = {}) {
      if (typeof Summarizer === 'undefined') {
        console.error('❌ Summarizer API not available');
        return null;
      }
      
      // Check if we already have a valid session
      if (this.summarizer) {
        return this.summarizer;
      }
      
      // Check if we have cached metadata (skip download progress)
      const hasCachedMetadata = this.cachedSessions?.summarizer?.created;
      
      try {
        const defaultOptions = {
          sharedContext: 'This content needs to be summarized',
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
          monitor: options.monitor || (hasCachedMetadata ? undefined : ((m) => {
            m.addEventListener('downloadprogress', (e) => {
            });
          }))
        };
        const summarizerOptions = { ...defaultOptions, ...options };
        
        if (hasCachedMetadata) {
        } else {
        }
        
        this.summarizer = await Summarizer.create(summarizerOptions);
        
        // Save to cache
        await this.saveSessions();
        
        return this.summarizer;
      } catch (error) {
        console.error('❌ Failed to create Summarizer:', error);
        return null;
      }
  }

  /**
   * Summarize text
   * Based on: const result = await summarizer.summarize(text);
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @returns {Promise<Object>} - Standardized response
   */
  async summarize(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 100 * 1024, 'Text to summarize');
      }

      if (!this.summarizer) {
        await this.createSummarizer(options);
      }

      if (!this.summarizer) {
        return this._createResponse(false, null, {
          message: 'Summarizer API not available',
          code: 'API_UNAVAILABLE'
        });
      }

      this.logger.info('Summarizing text:', text.substring(0, 50) + '...');
      const result = await this.summarizer.summarize(text, options);
      this.logger.info('Summary completed');
      
      return this._createResponse(true, result, null, {
        operation: 'summarize',
        inputLength: text.length
      });
    } catch (error) {
      return this._handleError(error, 'Summarization', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Stream summarization
   * Based on: const stream = summarizer.summarizeStreaming(longText, { context: '...' });
   */
  async summarizeStreaming(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 100 * 1024, 'Text to summarize (streaming)');
      }

      if (!this.summarizer) {
        await this.createSummarizer(options);
      }

      if (!this.summarizer) {
        return this._createResponse(false, null, {
          message: 'Summarizer API not available',
          code: 'API_UNAVAILABLE'
        });
      }
      
      // ✅ Use REAL Chrome AI streaming API - returns ReadableStream directly!
      const stream = this.summarizer.summarizeStreaming(text, options);
      return this._createResponse(true, stream, null, {
        operation: 'summarizeStreaming'
      });
    } catch (error) {
      console.error('❌ Streaming summarization failed:', error);
      return this._handleError(error, 'Summarization streaming', 'STREAMING_ERROR');
    }
  }

  // =============================================================================
  // WRITER API - Based on: const writer = await Writer.create();
  // =============================================================================

  /**
   * Create a writer instance
   * Based on: const writer = await Writer.create();
   */
  async createWriter(options = {}) {
    // 🔥 ADD REUSE CHECK
    if (this.writer) {
      return this.writer;
    }
    
    try {
      const defaultOptions = {
        sharedContext: 'This is content creation assistance',
        tone: 'casual',
        format: 'plain-text',
        length: 'medium',
        monitor: options.monitor || ((m) => {
          m.addEventListener('downloadprogress', (e) => {
          });
        })
      };

      const writerOptions = { ...defaultOptions, ...options };
      this.writer = await Writer.create(writerOptions);
      
      // Save to cache
      await this.saveSessions();
      
      return this.writer;
    } catch (error) {
      console.error('❌ Failed to create Writer:', error);
      return null;
    }
  }

  /**
   * Write content
   * Based on: const result = await writer.write(prompt);
   * @param {string} prompt - Writing prompt
   * @param {Object} options - Writing options
   * @returns {Promise<Object>} - Standardized response
   */
  async write(prompt, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        prompt = window.ChromeAIStudio.InputValidator.validateText(prompt, 10 * 1024, 'Writing prompt');
      }

      if (!this.writer) {
        await this.createWriter(options);
      }

      if (!this.writer) {
        return this._createResponse(false, null, {
          message: 'Writer API not available',
          code: 'API_UNAVAILABLE'
        });
      }

      this.logger.info('Writing content for:', prompt.substring(0, 50) + '...');
      const result = await this.writer.write(prompt, options);
      this.logger.info('Writing completed');
      
      return this._createResponse(true, result, null, {
        operation: 'write',
        promptLength: prompt.length
      });
    } catch (error) {
      return this._handleError(error, 'Writing', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Stream writing
   * Based on: const stream = writer.writeStreaming(prompt, { context: "..." });
   */
  async writeStreaming(prompt, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        prompt = window.ChromeAIStudio.InputValidator.validateText(prompt, 10 * 1024, 'Writing prompt (streaming)');
      }

      if (!this.writer) {
        await this.createWriter(options);
      }

      if (!this.writer) {
        return this._createResponse(false, null, {
          message: 'Writer API not available',
          code: 'API_UNAVAILABLE'
        });
      }
      
      // ✅ Use REAL Chrome AI streaming API - returns ReadableStream directly!
      const stream = this.writer.writeStreaming(prompt, options);
      return this._createResponse(true, stream, null, {
        operation: 'writeStreaming'
      });
    } catch (error) {
      console.error('❌ Streaming writing failed:', error);
      return this._handleError(error, 'Writing streaming', 'STREAMING_ERROR');
    }
  }

  // =============================================================================
  // TRANSLATOR API - Based on: const translator = await Translator.create({ sourceLanguage: 'en', targetLanguage: 'fr' });
  // =============================================================================

  /**
   * Create a translator instance
   * Based on: const translator = await Translator.create({ sourceLanguage: 'en', targetLanguage: 'fr' });
   */
  async createTranslator(sourceLanguage = 'en', targetLanguage = 'fr', options = {}) {
      if (typeof Translator === 'undefined') {
        console.error('❌ Translator API not available');
        return null;
      }
      
      // 🔥 ADD REUSE CHECK HERE (Line 801)
      if (this.translator) {
        return this.translator;
      }
      
      try {
        const translatorOptions = {
          sourceLanguage,
          targetLanguage,
          ...options
        };
        this.translator = await Translator.create(translatorOptions);
        
        // Save to cache
        await this.saveSessions();
        
        return this.translator;
      } catch (error) {
        console.error('❌ Failed to create Translator:', error);
        return null;
      }
  }

  /**
   * Translate text
   * Based on: await translator.translate('Where is the next bus stop, please?');
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} - Standardized response
   */
  async translate(text, sourceLanguage = 'en', targetLanguage = 'fr') {
    try {
      // Validate inputs
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 50 * 1024, 'Text to translate');
        sourceLanguage = window.ChromeAIStudio.InputValidator.validateLanguageCode(sourceLanguage);
        targetLanguage = window.ChromeAIStudio.InputValidator.validateLanguageCode(targetLanguage);
      }

      if (!this.translator || this.translator.sourceLanguage !== sourceLanguage || this.translator.targetLanguage !== targetLanguage) {
        await this.createTranslator(sourceLanguage, targetLanguage);
      }

      if (!this.translator) {
        return this._createResponse(false, null, {
          message: 'Translator API not available',
          code: 'API_UNAVAILABLE'
        });
      }

      this.logger.info(`Translating (${sourceLanguage} → ${targetLanguage}):`, text.substring(0, 50) + '...');
      const result = await this.translator.translate(text);
      this.logger.info('Translation completed');
      
      return this._createResponse(true, result, null, {
        operation: 'translate',
        sourceLanguage,
        targetLanguage,
        inputLength: text.length
      });
    } catch (error) {
      return this._handleError(error, 'Translation', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Stream translation
   * Based on: const stream = translator.translateStreaming(longText);
   */
  async translateStreaming(text, sourceLanguage = 'en', targetLanguage = 'fr') {
    try {
      // Validate inputs
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 50 * 1024, 'Text to translate (streaming)');
        sourceLanguage = window.ChromeAIStudio.InputValidator.validateLanguageCode(sourceLanguage);
        targetLanguage = window.ChromeAIStudio.InputValidator.validateLanguageCode(targetLanguage);
      }

      if (!this.translator || this.translator.sourceLanguage !== sourceLanguage || this.translator.targetLanguage !== targetLanguage) {
        await this.createTranslator(sourceLanguage, targetLanguage);
      }

      if (!this.translator) {
        return this._createResponse(false, null, {
          message: 'Translator API not available',
          code: 'API_UNAVAILABLE'
        });
      }
      
      // ✅ Use REAL Chrome AI streaming API - returns ReadableStream directly!
      const stream = this.translator.translateStreaming(text);
      return this._createResponse(true, stream, null, {
        operation: 'translateStreaming',
        sourceLanguage,
        targetLanguage
      });
    } catch (error) {
      console.error('❌ Streaming translation failed:', error);
      return this._handleError(error, 'Translation streaming', 'STREAMING_ERROR');
    }
  }

  // =============================================================================
  // REWRITER API - Based on similar pattern to Writer API
  // =============================================================================

  /**
   * Create a rewriter instance
   * Based on similar pattern to Writer API
   */
  async createRewriter(options = {}) {
    // 🔥 ADD REUSE CHECK HERE (Line 922)
    if (this.rewriter) {
      return this.rewriter;
    }
    
    try {
      const defaultOptions = {
        sharedContext: 'This is content rewriting assistance',
        tone: 'as-is',
        format: 'plain-text',
        length: 'as-is',
        monitor: options.monitor || ((m) => {
          m.addEventListener('downloadprogress', (e) => {
          });
        })
      };

      const rewriterOptions = { ...defaultOptions, ...options };
      this.rewriter = await Rewriter.create(rewriterOptions);
      
      // Save to cache
      await this.saveSessions();
      
      return this.rewriter;
    } catch (error) {
      console.error('❌ Failed to create Rewriter:', error);
      return null;
    }
  }

  /**
   * Rewrite content
   * @param {string} text - Text to rewrite
   * @param {Object} options - Rewriting options
   * @returns {Promise<Object>} - Standardized response
   */
  async rewrite(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 50 * 1024, 'Text to rewrite');
      }

      if (!this.rewriter) {
        await this.createRewriter(options);
      }

      if (!this.rewriter) {
        return this._createResponse(false, null, {
          message: 'Rewriter API not available',
          code: 'API_UNAVAILABLE'
        });
      }

      this.logger.info('Rewriting content:', text.substring(0, 50) + '...');
      const result = await this.rewriter.rewrite(text, options);
      this.logger.info('Rewriting completed');
      
      return this._createResponse(true, result, null, {
        operation: 'rewrite',
        inputLength: text.length
      });
    } catch (error) {
      return this._handleError(error, 'Rewriting', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Stream rewriting
   */
  async rewriteStreaming(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 50 * 1024, 'Text to rewrite (streaming)');
      }

      if (!this.rewriter) {
        await this.createRewriter(options);
      }

      if (!this.rewriter) {
        return this._createResponse(false, null, {
          message: 'Rewriter API not available',
          code: 'API_UNAVAILABLE'
        });
      }
      
      // ✅ Use REAL Chrome AI streaming API - returns ReadableStream directly!
      const stream = this.rewriter.rewriteStreaming(text, options);
      return this._createResponse(true, stream, null, {
        operation: 'rewriteStreaming'
      });
    } catch (error) {
      console.error('❌ Streaming rewriting failed:', error);
      return this._handleError(error, 'Rewriting streaming', 'STREAMING_ERROR');
    }
  }

  /**
   * Generate a response using the language model (alias for prompt method)
   * This method is expected by the voice assistant
   * @param {string} text - Input text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Standardized response
   */
  async generateResponse(text, options = {}) {
    this.logger.info('Generating response via LanguageModel...');
    return await this.prompt(text, options);
  }

  /**
   * Get simple status for UI display
   */
  getStatus() {
    return {
      initialized: this.initialized,
      languageModel: !!this.languageModel,
      summarizer: !!this.summarizer,
      writer: !!this.writer,
      translator: !!this.translator,
      rewriter: !!this.rewriter,
      proofreader: !!this.proofreader,
      languageDetector: !!this.languageDetector
    };
  }

  /**
   * Clean up all sessions
   */
  async cleanup() {
    this.logger.info('Cleaning up AI sessions...');
    
    const cleanupPromises = [];
    
    if (this.languageModel) {
      cleanupPromises.push(
        this.languageModel.destroy().catch(e => this.logger.warn('Failed to destroy language model:', e))
      );
      this.languageModel = null;
    }
    
    if (this.summarizer) {
      cleanupPromises.push(
        this.summarizer.destroy().catch(e => this.logger.warn('Failed to destroy summarizer:', e))
      );
      this.summarizer = null;
    }
    
    if (this.writer) {
      cleanupPromises.push(
        this.writer.destroy().catch(e => this.logger.warn('Failed to destroy writer:', e))
      );
      this.writer = null;
    }
    
    if (this.translator) {
      cleanupPromises.push(
        this.translator.destroy().catch(e => this.logger.warn('Failed to destroy translator:', e))
      );
      this.translator = null;
    }
    
    if (this.rewriter) {
      cleanupPromises.push(
        this.rewriter.destroy().catch(e => this.logger.warn('Failed to destroy rewriter:', e))
      );
      this.rewriter = null;
    }
    
    if (this.proofreader) {
      cleanupPromises.push(
        this.proofreader.destroy().catch(e => this.logger.warn('Failed to destroy proofreader:', e))
      );
      this.proofreader = null;
    }
    
    if (this.languageDetector) {
      cleanupPromises.push(
        this.languageDetector.destroy().catch(e => this.logger.warn('Failed to destroy language detector:', e))
      );
      this.languageDetector = null;
    }
    
    await Promise.all(cleanupPromises);
    this.logger.info('AI sessions cleaned up');
    
    this.eventBus?.emit('ai:cleanup', { timestamp: Date.now() });
  }

  // =============================================================================
  // PROOFREADER API - Based on: const proofreader = await Proofreader.create(options);
  // =============================================================================

  /**
   * Create a proofreader instance
   * Based on: const proofreader = await Proofreader.create(options);
   */
  async createProofreader(options = {}) {
    // 🔥 ADD REUSE CHECK HERE (Line 1132)
    if (this.proofreader) {
      return this.proofreader;
    }
    
    try {
      const defaultOptions = {
        includeCorrectionTypes: true,
        includeCorrectionExplanations: true,
        expectedInputLanguages: ['en'],
        correctionExplanationLanguage: 'en',
        // Be more sensitive to detect more types of errors
        monitor: options.monitor || ((m) => {
          m.addEventListener('downloadprogress', (e) => {
          });
        })
      };

      const proofreaderOptions = { ...defaultOptions, ...options };
      this.proofreader = await Proofreader.create(proofreaderOptions);
      
      // Save to cache
      await this.saveSessions();
      
      return this.proofreader;
    } catch (error) {
      console.error('❌ Failed to create Proofreader:', error);
      return null;
    }
  }

  /**
   * Proofread text
   * Based on: const corrections = await proofreader.proofread(text);
   */
  async proofread(text, options = {}) {
    try {
      // Validate input
      if (window.ChromeAIStudio?.InputValidator) {
        text = window.ChromeAIStudio.InputValidator.validateText(text, 50 * 1024, 'Text to proofread');
      }

      if (!this.proofreader) {
        await this.createProofreader(options);
      }

      if (!this.proofreader) {
        console.error('❌ Proofreader API not available');
        return { success: false, result: null, error: { message: 'Proofreader API not available', code: 'API_UNAVAILABLE' } };
      }
      const apiResult = await this.proofreader.proofread(text);
      
      // Prefer correctedInput when available (object form)
      if (apiResult && typeof apiResult === 'object' && ('correctedInput' in apiResult || 'corrections' in apiResult)) {
        const correctedInput = apiResult.correctedInput || text;
        const corrections = Array.isArray(apiResult.corrections) ? apiResult.corrections : [];
        const sanitized = this.sanitizeCorrectedText(correctedInput);
        return {
          success: true,
          result: sanitized,
          corrections,
          originalText: text,
          error: null
        };
      }
      
      // Legacy array-only form
      const rawCorrections = Array.isArray(apiResult) ? apiResult : [];
      const merged = this.mergeOverlappingAndAdjacentCorrections(rawCorrections);
      let correctedText = this.applyCorrections(text, merged);
      correctedText = this.sanitizeCorrectedText(correctedText);
      
      return {
        success: true,
        result: correctedText,
        corrections: merged,
        originalText: text,
        error: null
      };
    } catch (error) {
      console.error('❌ Proofreading failed:', error);
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error && error.message ? error.message : String(error),
          code: 'PROOFREAD_ERROR'
        }
      };
    }
  }

  /**
   * Apply proofreading corrections to text
   * @param {string} text - Original text
   * @param {Array} corrections - Array of correction objects
   * @returns {string} - Corrected text
   */
  applyCorrections(text, corrections) {
    if (!corrections || corrections.length === 0) return text;
    
    let correctedText = text;
    // Apply corrections in reverse order to maintain indices
    const sortedCorrections = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
    
    for (const correction of sortedCorrections) {
      correctedText = 
        correctedText.substring(0, correction.startIndex) +
        correction.correction +
        correctedText.substring(correction.endIndex);
    }
    
    return correctedText;
  }

  sanitizeCorrectedText(t) {
    try {
      if (!t) return t;
      let out = t;
      // Iteratively collapse repeated tokens with optional whitespace: handles "the the" and "thethe"
      const repeatRe = /\b([A-Za-z]+)\s*\1\b/gi;
      let guard = 0;
      while (repeatRe.test(out) && guard < 10) {
        out = out.replace(repeatRe, '$1');
        guard++;
      }
      // Normalize whitespace and punctuation spacing
      out = out
        .replace(/\s{3,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([\(\[“])\s+/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      return out;
    } catch (_) {
      return t;
    }
  }

  mergeOverlappingAndAdjacentCorrections(corrections) {
    if (!Array.isArray(corrections) || corrections.length <= 1) return corrections || [];
    const sorted = [...corrections].sort((a, b) => a.startIndex - b.startIndex);
    const merged = [];
    let current = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      // Overlap or adjacency: next.start <= current.end
      if (next.startIndex <= current.endIndex) {
        current.endIndex = Math.max(current.endIndex, next.endIndex);
        // Prefer next.correction end-to-end when overlapping; simple concat is risky
        // Keep current.correction as final by default; advanced merging can be added later
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  // =============================================================================
  // AVAILABILITY CHECKING METHODS
  // =============================================================================

  /**
   * Check LanguageModel availability
   * Based on: const availability = await LanguageModel.availability();
   * @returns {Promise<string>} - Availability status
   */
  async checkLanguageModelAvailability() {
    try {
      const availability = await LanguageModel.availability();
      this.logger.debug('LanguageModel availability:', availability);
      return availability;
    } catch (error) {
      this.logger.error('Failed to check LanguageModel availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check Summarizer availability
   */
  async checkSummarizerAvailability() {
    try {
      const availability = await Summarizer.availability();
      return availability;
    } catch (error) {
      console.error('❌ Failed to check Summarizer availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check Writer availability
   */
  async checkWriterAvailability() {
    try {
      const availability = await Writer.availability();
      return availability;
    } catch (error) {
      console.error('❌ Failed to check Writer availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check Translator availability
   */
  async checkTranslatorAvailability(sourceLanguage = 'en', targetLanguage = 'fr') {
    try {
      const availability = await Translator.availability({
        sourceLanguage,
        targetLanguage
      });
      return availability;
    } catch (error) {
      console.error('❌ Failed to check Translator availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check Rewriter availability
   */
  async checkRewriterAvailability() {
    try {
      const availability = await Rewriter.availability();
      return availability;
    } catch (error) {
      console.error('❌ Failed to check Rewriter availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check Proofreader availability
   */
  async checkProofreaderAvailability(options = {}) {
    try {
      const defaultOptions = {
        includeCorrectionTypes: true,
        expectedInputLanguages: ['en']
      };
      const checkOptions = { ...defaultOptions, ...options };
      
      const availability = await Proofreader.availability(checkOptions);
      return availability;
    } catch (error) {
      console.error('❌ Failed to check Proofreader availability:', error);
      return 'unavailable';
    }
  }

  // =============================================================================
  // LANGUAGE DETECTOR API - Based on: const detector = await LanguageDetector.create();
  // =============================================================================

  /**
   * Create a language detector instance
   * Based on: const detector = await LanguageDetector.create();
   */
  async createLanguageDetector(options = {}) {
    if (typeof LanguageDetector === 'undefined') {
      console.error('❌ LanguageDetector API not available');
      return null;
    }
    
    try {
      const defaultOptions = {
        monitor: options.monitor || ((m) => {
          m.addEventListener('downloadprogress', (e) => {
          });
        })
      };
      
      const detectorOptions = { ...defaultOptions, ...options };
      this.languageDetector = await LanguageDetector.create(detectorOptions);
      
      // Save to cache
      await this.saveSessions();
      
      return this.languageDetector;
    } catch (error) {
      console.error('❌ Failed to create LanguageDetector:', error);
      return null;
    }
  }

  /**
   * Detect language of text
   * Based on: const results = await detector.detect(text);
   */
  async detectLanguage(text, options = {}) {
    try {
      if (!this.languageDetector) {
        await this.createLanguageDetector(options);
      }
      
      if (!this.languageDetector) {
        return { 
          success: false, 
          result: null, 
          error: { 
            message: 'LanguageDetector API not available',
            code: 'API_UNAVAILABLE'
          }
        };
      }
      const results = await this.languageDetector.detect(text);
      
      // Return top result
      const topResult = results && results.length > 0 ? results[0] : null;
      
      if (topResult) {
        
        return { 
          success: true,
          result: topResult.detectedLanguage,
          confidence: topResult.confidence,
          allResults: results,
          error: null
        };
      } else {
        return { 
          success: false,
          result: null,
          error: {
            message: 'Could not detect language',
            code: 'DETECTION_FAILED'
          }
        };
      }
    } catch (error) {
      console.error('❌ Language detection failed:', error);
      return { 
        success: false,
        result: null,
        error: {
          message: error && error.message ? error.message : String(error),
          code: 'DETECTION_ERROR'
        }
      };
    }
  }

  /**
   * Check LanguageDetector availability
   */
  async checkLanguageDetectorAvailability() {
    try {
      if (typeof LanguageDetector === 'undefined') {
        return 'unavailable';
      }
      const availability = await LanguageDetector.availability();
      return availability;
    } catch (error) {
      console.error('❌ Failed to check LanguageDetector availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Check all API availability at once
   * @returns {Promise<Object>} - Availability status for all APIs
   */
  async checkAllAvailability() {
    const results = {
      languageModel: await this.checkLanguageModelAvailability(),
      summarizer: await this.checkSummarizerAvailability(),
      writer: await this.checkWriterAvailability(),
      translator: await this.checkTranslatorAvailability(),
      rewriter: await this.checkRewriterAvailability(),
      proofreader: await this.checkProofreaderAvailability(),
      languageDetector: await this.checkLanguageDetectorAvailability()
    };
    
    this.logger.info('All API availability:', results);
    this.eventBus?.emit('ai:availability-checked', results);
    return results;
  }

  /**
   * Check if Chrome AI APIs are available (alias for backwards compatibility)
   */
  async isAvailable() {
    const availability = await this.checkLanguageModelAvailability();
    return availability === 'readily' || availability === 'after-download';
  }

  /**
   * Cleanup all sessions and resources
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up AI Manager...');
      
      // Clear all session timeouts
      for (const [session, timeoutId] of this.sessionTimeouts) {
        clearTimeout(timeoutId);
      }
      this.sessionTimeouts.clear();
      
      // Clear all session pools
      for (const [type, pool] of Object.entries(this.sessionPool)) {
        pool.length = 0;
        this.logger.debug(`Cleared ${type} session pool`);
      }
      
      // Clear instance references
      this.languageModel = null;
      this.summarizer = null;
      this.writer = null;
      this.translator = null;
      this.rewriter = null;
      this.proofreader = null;
      this.languageDetector = null;
      
      this.initialized = false;
      this.logger.info('AI Manager cleaned up successfully');
      
    } catch (error) {
      this.logger.error('Error during AI Manager cleanup:', error);
    }
  }
}

// Export for both browser and potential module environments
if (typeof window !== 'undefined') {
  window.AIManager = AIManager;
  
  // Initialize ChromeAI Studio namespace and create AI Manager instance
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.aiManager = new AIManager();
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIManager;
}