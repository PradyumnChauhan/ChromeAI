/**
 * ChromeAI Studio - Input Validator Utility
 * Centralized input validation for all AI operations
 */

class InputValidator {
  /**
   * Validate text input
   * @param {string} text - Text to validate
   * @param {number} maxLength - Maximum allowed length
   * @param {string} fieldName - Name of the field for error messages
   * @returns {string} - Validated text
   * @throws {Error} - If validation fails
   */
  static validateText(text, maxLength = null, fieldName = 'Text') {
    if (typeof text !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    
    if (text.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }
    
    if (maxLength && text.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }
    
    return text;
  }

  /**
   * Validate language code (BCP 47 format)
   * @param {string} code - Language code to validate
   * @returns {string} - Validated language code
   * @throws {Error} - If validation fails
   */
  static validateLanguageCode(code) {
    if (typeof code !== 'string') {
      throw new Error('Language code must be a string');
    }
    
    // BCP 47 language code validation
    const validPattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    if (!validPattern.test(code)) {
      throw new Error(`Invalid language code: ${code}. Expected format: 'en', 'es', 'en-US', etc.`);
    }
    
    return code;
  }

  /**
   * Validate options object against a schema
   * @param {Object} options - Options to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} - Validated options
   * @throws {Error} - If validation fails
   */
  static validateOptions(options, schema) {
    if (typeof options !== 'object' || options === null) {
      throw new Error('Options must be an object');
    }
    
    const validated = {};
    
    for (const [key, config] of Object.entries(schema)) {
      const value = options[key];
      
      // Required check
      if (config.required && value === undefined) {
        throw new Error(`Missing required option: ${key}`);
      }
      
      // Type check
      if (value !== undefined && config.type && typeof value !== config.type) {
        throw new Error(`Invalid type for ${key}: expected ${config.type}, got ${typeof value}`);
      }
      
      // Enum check
      if (value !== undefined && config.enum && !config.enum.includes(value)) {
        throw new Error(`Invalid value for ${key}: must be one of ${config.enum.join(', ')}`);
      }
      
      // Range check
      if (value !== undefined && config.range) {
        const [min, max] = config.range;
        if (value < min || value > max) {
          throw new Error(`Value for ${key} must be between ${min} and ${max}`);
        }
      }
      
      validated[key] = value !== undefined ? value : config.default;
    }
    
    return validated;
  }

  /**
   * Validate API-specific options
   * @param {string} apiName - Name of the API
   * @param {Object} options - Options to validate
   * @returns {Object} - Validated options
   */
  static validateAPIOptions(apiName, options) {
    const schemas = {
      prompt: {
        temperature: { type: 'number', range: [0, 2], default: 0.7 },
        topK: { type: 'number', range: [1, 100], default: 20 },
        outputLanguage: { type: 'string', default: 'en' }
      },
      summarizer: {
        type: { type: 'string', enum: ['key-points', 'paragraph', 'bullet-points'], default: 'key-points' },
        format: { type: 'string', enum: ['markdown', 'plain-text'], default: 'markdown' },
        length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' }
      },
      writer: {
        tone: { type: 'string', enum: ['casual', 'formal', 'friendly', 'professional'], default: 'casual' },
        format: { type: 'string', enum: ['plain-text', 'markdown'], default: 'plain-text' },
        length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' }
      },
      translator: {
        sourceLanguage: { type: 'string', required: true },
        targetLanguage: { type: 'string', required: true }
      },
      proofreader: {
        includeCorrectionTypes: { type: 'boolean', default: true },
        includeCorrectionExplanations: { type: 'boolean', default: true },
        expectedInputLanguages: { type: 'object', default: ['en'] }
      }
    };

    const schema = schemas[apiName];
    if (!schema) {
      throw new Error(`Unknown API: ${apiName}`);
    }

    return this.validateOptions(options, schema);
  }

  /**
   * Truncate text to maximum length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  static truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Sanitize text input
   * @param {string} text - Text to sanitize
   * @returns {string} - Sanitized text
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  /**
   * Validate file input
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {File} - Validated file
   * @throws {Error} - If validation fails
   */
  static validateFile(file, options = {}) {
    if (!(file instanceof File)) {
      throw new Error('Input must be a File object');
    }

    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    } = options;

    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (allowedExtensions && !allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed`);
    }

    return file;
  }
}

// Make InputValidator available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.InputValidator = InputValidator;
}