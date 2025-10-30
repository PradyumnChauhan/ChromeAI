/**
 * ChromeAI Studio - Smart Sidebar Chat Module
 * Handles chat functionality, message processing, and AI interactions
 */

class SidebarChat {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.isProcessing = false;
    this.currentConversation = null;
    this.messageQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Initialize chat functionality
   */
  async init() {
    try {
      // Set up message processing
      this.setupMessageProcessing();
      
      // Set up error handling
      this.setupErrorHandling();
    } catch (error) {
      console.error('Failed to initialize SidebarChat:', error);
    }
  }

  /**
   * Send a message
   */
  async sendMessage(content, options = {}) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.warn('Empty message content');
      return;
    }

    if (this.isProcessing) {
      console.warn('Already processing a message');
      return;
    }

    try {
      this.isProcessing = true;
      this.sidebar.state.setProcessing(true);

      // Add user message to state
      this.sidebar.state.addMessage(content, 'user');

      // Add user message to UI
      this.sidebar.ui.addMessage(content, 'user');

      // Add processing indicator
      this.sidebar.ui.addProcessingIndicator();

      // Process the message
      await this.processMessage(content, options);

    } catch (error) {
      console.error('Failed to send message:', error);
      this.handleError(error);
    } finally {
      this.isProcessing = false;
      this.sidebar.state.setProcessing(false);
      // Remove processing indicator
      this.sidebar.ui.removeProcessingIndicator();
    }
  }

  /**
   * Process a message with AI
   */
  async processMessage(content, options = {}) {
    try {
      const mode = this.sidebar.state.getState().currentMode;
      
      // Add user message to UI and state first
      this.sidebar.state.addMessage(content, 'user', { mode });
      this.sidebar.ui.addMessage(content, 'user');
      
      // Check for @mentions and handle them directly
      const mentionResult = await this.handleMentions(content);
      if (mentionResult) {
        // Handle streaming responses
        if (mentionResult.type === 'stream') {
          // Create streaming message in UI
          const messageElement = this.sidebar.ui.addStreamingMessage();
          
          // Stream the response
          const fullResponse = await this.consumeStream(
            mentionResult.stream,
            (chunk, fullText) => {
              // Update message in real-time
              this.sidebar.ui.updateStreamingMessage(messageElement, fullText);
            },
            (finalText) => {
              // Mark as complete
              this.sidebar.ui.completeStreamingMessage(messageElement);
              // Add to state
              this.sidebar.state.addMessage(finalText, 'assistant', { mode, mention: true, feature: mentionResult.feature });
            },
            (error) => {
              // Handle error
              this.sidebar.ui.errorStreamingMessage(messageElement, error.message);
            }
          );
        } else {
          // Regular response
          this.sidebar.state.addMessage(mentionResult, 'assistant', { mode, mention: true });
          this.sidebar.ui.addMessage(mentionResult, 'assistant');
        }
        return;
      }
      
      // Get AI response based on mode (handles its own message creation)
      const response = await this.getAIResponse(content, mode, options);
      
      // getAIResponse now handles its own message creation and state updates
      // No need to add messages here as it's already done in the streaming callback

    } catch (error) {
      console.error('Failed to process message:', error);
      throw error;
    }
  }

  /**
   * Handle @mentions and call appropriate Chrome AI APIs
   */
  async handleMentions(content) {
    try {
      const aiManager = this.sidebar.aiManager;
      if (!aiManager) {
        console.warn('AI Manager not available for mentions');
        return null;
      }

      // Check for specific @mentions
      if (content.includes('@writer')) {
        const prompt = content.replace(/@writer\s*/gi, '').trim();
        if (!prompt) {
          return "Please provide a writing prompt after @writer. For example: @writer write me a poem about nature";
        }
        
        // Use streaming for better UX
        const response = await aiManager.writeStreaming(prompt);
        if (response.success) {
          // Return the stream for processing
          return { type: 'stream', stream: response.result, feature: 'writer' };
        } else {
          return `Writer API error: ${response.error?.message || 'Unknown error'}`;
        }
      }
      
      if (content.includes('@summary')) {
        const text = content.replace(/@summary\s*/gi, '').trim();
        if (!text) {
          // Use page content if no text provided
          const pageContent = document.body.innerText || document.body.textContent || '';
          const textToSummarize = pageContent.substring(0, 10000); // Limit to 10k chars
          if (!textToSummarize.trim()) {
            return "Please provide text to summarize after @summary, or I'll summarize the current page content.";
          }
          const response = await aiManager.summarizeStreaming(textToSummarize);
          if (response.success) {
            return { type: 'stream', stream: response.result, feature: 'summary' };
          } else {
            return `Summarizer API error: ${response.error?.message || 'Unknown error'}`;
          }
        } else {
          const response = await aiManager.summarizeStreaming(text);
          if (response.success) {
            return { type: 'stream', stream: response.result, feature: 'summary' };
          } else {
            return `Summarizer API error: ${response.error?.message || 'Unknown error'}`;
          }
        }
      }
      
      if (content.includes('@translate')) {
        const text = content.replace(/@translate\s*/gi, '').trim();
        if (!text) {
          return "Please provide text to translate after @translate. For example: @translate Hello world to Spanish";
        }
        
        // Extract target language if specified
        const languageMatch = text.match(/to\s+(\w+)/i);
        const targetLanguage = languageMatch ? languageMatch[1] : 'es'; // Default to Spanish
        
        const textToTranslate = text.replace(/\s+to\s+\w+/i, '').trim();
        if (!textToTranslate) {
          return "Please provide text to translate. For example: @translate Hello world to Spanish";
        }
        
        const response = await aiManager.translateStreaming(textToTranslate, 'en', targetLanguage);
        if (response.success) {
          return { type: 'stream', stream: response.result, feature: 'translate' };
        } else {
          return `Translator API error: ${response.error?.message || 'Unknown error'}`;
        }
      }
      
      if (content.includes('@explain')) {
        const text = content.replace(/@explain\s*/gi, '').trim();
        if (!text) {
          return "Please provide something to explain after @explain. For example: @explain quantum computing";
        }
        
        const prompt = `Explain this in simple, easy-to-understand terms: ${text}`;
        const response = await aiManager.promptStreaming(prompt);
        if (response.success) {
          return { type: 'stream', stream: response.result, feature: 'explain' };
        } else {
          return `Explanation error: ${response.error?.message || 'Unknown error'}`;
        }
      }
      
      if (content.includes('@code')) {
        const text = content.replace(/@code\s*/gi, '').trim();
        if (!text) {
          return "Please provide code or a coding question after @code. For example: @code How do I create a React component?";
        }
        
        const prompt = `You are a coding assistant. Help with this programming question or code: ${text}`;
        const response = await aiManager.promptStreaming(prompt);
        if (response.success) {
          return { type: 'stream', stream: response.result, feature: 'code' };
        } else {
          return `Code assistance error: ${response.error?.message || 'Unknown error'}`;
        }
      }
      
      if (content.includes('@rewrite')) {
        const text = content.replace(/@rewrite\s*/gi, '').trim();
        if (!text) {
          return "Please provide text to rewrite after @rewrite. For example: @rewrite This is a poorly written sentence";
        }
        
        const response = await aiManager.rewriteStreaming(text);
        if (response.success) {
          return { type: 'stream', stream: response.result, feature: 'rewrite' };
        } else {
          return `Rewriter API error: ${response.error?.message || 'Unknown error'}`;
        }
      }
      
      if (content.includes('@proofread')) {
        const text = content.replace(/@proofread\s*/gi, '').trim();
        if (!text) {
          return "Please provide text to proofread after @proofread. For example: @proofread This text has some erors";
        }
        
        const result = await aiManager.proofread(text);
        if (result.success) {
          return result.result;
        } else {
          return `Proofreader API error: ${result.error?.message || 'Unknown error'}`;
        }
      }
      
      // No recognized mentions found
      return null;
      
    } catch (error) {
      console.error('Error handling mentions:', error);
      return `Error processing mention: ${error.message}`;
    }
  }

  /**
   * Get AI response based on mode
   */
  async getAIResponse(content, mode, options = {}) {
    try {
      const aiManager = this.sidebar.aiManager;
      if (!aiManager) {
        throw new Error('AI Manager not available');
      }

      // Get mode-specific prompt
      const prompt = this.buildModePrompt(content, mode);
      
      // Use streaming for AI response
      const result = await aiManager.promptStreaming(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
        ...options
      });

      if (result.success) {
        // Create streaming message for non-mention responses
        const messageElement = this.sidebar.ui.addStreamingMessage();
        
        // Stream the response
        const fullResponse = await this.consumeStream(
          result.result,
          (chunk, fullText) => {
            // Update message in real-time
            this.sidebar.ui.updateStreamingMessage(messageElement, fullText);
          },
          (finalText) => {
            // Mark as complete
            this.sidebar.ui.completeStreamingMessage(messageElement);
            // Add to state
            this.sidebar.state.addMessage(finalText, 'assistant', { mode });
          },
          (error) => {
            // Handle error
            this.sidebar.ui.errorStreamingMessage(messageElement, error.message);
          }
        );
        
        return this.processAIResponse(fullResponse, mode);
      } else {
        throw new Error(result.error?.message || 'AI request failed');
      }

    } catch (error) {
      console.error('AI response error:', error);
      return this.getFallbackResponse(mode);
    }
  }

  /**
   * Consume a ReadableStream
   */
  async consumeStream(stream, onChunk, onComplete, onError) {
    try {
      let fullResult = '';
      for await (const chunk of stream) {
        fullResult += chunk;
        if (onChunk) onChunk(chunk, fullResult);
      }
      if (onComplete) onComplete(fullResult);
      return fullResult;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Build mode-specific prompt
   */
  buildModePrompt(content, mode) {
    // Check if this is an @AI mention for prompt summarizer
    if (content.includes('@AI') || content.includes('@ai')) {
      return `You are an AI prompt summarizer and optimizer. Your task is to:
1. Analyze the given prompt or request
2. Identify the key objectives and requirements
3. Suggest improvements for clarity and effectiveness
4. Provide a concise summary
5. Offer alternative phrasings if needed

Original prompt: ${content.replace(/@AI\s*/gi, '').trim()}

Please provide a structured response with:
- Summary of the request
- Key points identified
- Suggested improvements
- Optimized version of the prompt`;
    }

    const modePrompts = {
      student: `You are a helpful AI tutor. Give clear, simple answers. Be encouraging and educational.
Question: ${content}`,
      
      developer: `You are a coding assistant. Help with programming, debugging, and best practices. Keep answers practical and concise.
Question: ${content}`,
      
      creator: `You are a creative assistant. Help with writing, design, and creative projects. Be inspiring and practical.
Request: ${content}`,
      
      researcher: `You are a research assistant. Help with research, analysis, and fact-checking. Be accurate and thorough.
Question: ${content}`
    };

    return modePrompts[mode] || modePrompts.student;
  }

  /**
   * Process AI response
   */
  processAIResponse(response, mode) {
    if (!response || typeof response !== 'string') {
      return this.getFallbackResponse(mode);
    }

    // Clean up response
    let cleanedResponse = response.trim();
    
    // Remove any unwanted prefixes
    cleanedResponse = cleanedResponse.replace(/^(AI:|Assistant:|Response:)/i, '').trim();
    
    // Ensure response is not too long
    if (cleanedResponse.length > 2000) {
      cleanedResponse = cleanedResponse.substring(0, 2000) + '...';
    }

    return cleanedResponse;
  }

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(mode) {
    const fallbackResponses = {
      student: "I'm sorry, I'm having trouble processing your question right now. Please try again or rephrase your question.",
      developer: "I'm experiencing technical difficulties. Please try your coding question again in a moment.",
      creator: "I'm having trouble with the creative process right now. Please try your request again.",
      researcher: "I'm unable to process your research question at the moment. Please try again."
    };

    return fallbackResponses[mode] || fallbackResponses.student;
  }

  /**
   * Set up message processing
   */
  setupMessageProcessing() {
    // Handle message queue
    this.processMessageQueue();
  }

  /**
   * Process message queue
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    const message = this.messageQueue.shift();
    try {
      await this.processMessage(message.content, message.options);
    } catch (error) {
      console.error('Queue processing error:', error);
      // Retry if attempts remaining
      if (message.retries < this.retryAttempts) {
        message.retries = (message.retries || 0) + 1;
        setTimeout(() => {
          this.messageQueue.unshift(message);
          this.processMessageQueue();
        }, this.retryDelay);
      }
    }

    // Process next message
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 100);
    }
  }

  /**
   * Add message to queue
   */
  queueMessage(content, options = {}) {
    this.messageQueue.push({
      content,
      options,
      retries: 0,
      timestamp: Date.now()
    });
  }

  /**
   * Set up error handling
   */
  setupErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('AI')) {
        console.error('Unhandled AI error:', event.reason);
        this.handleError(event.reason);
      }
    });
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Chat error:', error);
    
    // Add error message to UI
    const errorMessage = this.getErrorMessage(error);
    this.sidebar.state.addMessage(errorMessage, 'system');
    this.sidebar.ui.addMessage(errorMessage, 'system');
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message) {
      if (error.message.includes('quota')) {
        return "I've reached my usage limit. Please try again later.";
      } else if (error.message.includes('network')) {
        return "I'm having trouble connecting. Please check your internet connection.";
      } else if (error.message.includes('timeout')) {
        return "The request timed out. Please try again.";
      }
    }
    
    return "I'm sorry, something went wrong. Please try again.";
  }

  /**
   * Clear current conversation
   */
  clearConversation() {
    this.sidebar.state.clearChatHistory();
    
    // Clear UI
    const chatArea = this.sidebar.ui.sidebarElement?.querySelector('.chromeai-chat-area');
    if (chatArea) {
      chatArea.innerHTML = '';
      // Add welcome message back
      chatArea.appendChild(this.createWelcomeMessage());
    }
  }

  /**
   * Create welcome message
   */
  createWelcomeMessage() {
    const welcome = document.createElement('div');
    welcome.className = 'chromeai-welcome-message';
    welcome.innerHTML = `
      <div style="text-align: center; color: var(--chromeai-text-secondary, #6b7280);">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">Welcome to ChromeAI Studio</h3>
        <p style="margin: 0; font-size: 14px;">Select a mode and start chatting with AI!</p>
      </div>
    `;
    return welcome;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(mode = null) {
    return this.sidebar.state.getChatHistory(mode);
  }

  /**
   * Export conversation
   */
  exportConversation(mode = null) {
    const history = this.getConversationHistory(mode);
    return {
      mode: mode || this.sidebar.state.getState().currentMode,
      timestamp: Date.now(),
      messages: history
    };
  }

  /**
   * Import conversation
   */
  importConversation(conversation) {
    if (!conversation || !conversation.messages) {
      throw new Error('Invalid conversation format');
    }

    // Clear current conversation
    this.clearConversation();

    // Add imported messages
    conversation.messages.forEach(msg => {
      this.sidebar.state.addMessage(msg.content, msg.type, msg.metadata);
      this.sidebar.ui.addMessage(msg.content, msg.type);
    });
  }

  /**
   * Check if processing
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      retryAttempts: this.retryAttempts
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.messageQueue = [];
    this.isProcessing = false;
    this.currentConversation = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarChat;
} else if (typeof window !== 'undefined') {
  window.SidebarChat = SidebarChat;
}

