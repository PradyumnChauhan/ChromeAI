/**
 * MCP Voice Interface - Complete voice interaction system
 * Handles speech recognition, synthesis, and MCP agent integration
 * 
 * Features:
 * - Wake word detection
 * - Speech recognition with fallback
 * - Text-to-speech synthesis
 * - MCP agent integration
 * - Error handling and recovery
 */

class MCPVoiceInterface {
    constructor(options = {}) {
        this.options = {
            wakeWords: ['hey assistant', 'computer', 'hey computer', 'assistant'],
            language: 'en-US',
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            ...options
        };
        
        this.isListening = false;
        this.isSpeaking = false;
        this.currentRecognition = null;
        this.conversationHistory = [];
        this.wakeWordDetected = false;
        this.lastWakeWordTime = 0;
        this.wakeWordCooldown = 2000; // 2 seconds
        this.mcpAgent = null;
        this.isInitialized = false;
        
        // Event listeners for cleanup
        this.eventListeners = [];
        this.timeouts = [];
        
        // Event system for external listeners
        this.eventTarget = document.createElement('div');
    }

    /**
     * Initialize the voice interface
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            
            // Check for speech recognition support
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported in this browser');
            }
            
            // Check for speech synthesis support
            if (!('speechSynthesis' in window)) {
                throw new Error('Speech synthesis not supported in this browser');
            }
            
            // Get MCP agent reference
            this.mcpAgent = window.ChromeAIStudio?.mcpVoiceAgent;
            if (!this.mcpAgent) {
                console.warn('⚠️ MCP Voice Agent not found, voice commands will be limited');
            }
            
            // Initialize wake word detection
            this.initializeWakeWordDetection();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize voice interface:', error);
            throw error;
        }
    }

    /**
     * Initialize wake word detection system
     */
    initializeWakeWordDetection() {
        // Wake word detection is handled in the floating bubble
        // This is just a placeholder for future enhancement
    }

    /**
     * Set up event listeners for voice interface
     */
    setupEventListeners() {
        // Listen for voice mode changes
        window.addEventListener('chromeai-voice-mode-changed', (e) => {
            if (e.detail.enabled) {
                this.enableVoiceMode();
            } else {
                this.disableVoiceMode();
            }
        });
    }

    /**
     * Enable voice mode
     */
    enableVoiceMode() {
        // Voice mode is controlled by the floating bubble
    }

    /**
     * Disable voice mode
     */
    disableVoiceMode() {
        this.stopListening();
        this.stopSpeaking();
    }

    /**
     * Start listening for voice input
     */
    async startListening() {
        if (this.isListening) {
            console.warn('Already listening');
            return;
        }

        try {
            this.isListening = true;
            this.currentRecognition = this.createSpeechRecognition();
            this.setupRecognitionHandlers();
            this.currentRecognition.start();
        } catch (error) {
            console.error('❌ Failed to start listening:', error);
            this.isListening = false;
            throw error;
        }
    }

    /**
     * Stop listening for voice input
     */
    stopListening() {
        if (!this.isListening) {
            return;
        }

        try {
            if (this.currentRecognition) {
                this.currentRecognition.stop();
                this.currentRecognition = null;
            }
            this.isListening = false;
        } catch (error) {
            console.error('❌ Failed to stop listening:', error);
        }
    }

    /**
     * Create speech recognition instance
     */
    createSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = this.options.continuous;
        recognition.interimResults = this.options.interimResults;
        recognition.lang = this.options.language;
        recognition.maxAlternatives = this.options.maxAlternatives;
        
        return recognition;
    }

    /**
     * Set up recognition event handlers
     */
    setupRecognitionHandlers() {
        if (!this.currentRecognition) return;

        this.currentRecognition.onstart = () => {
            this.dispatchEvent('voice-listening-started');
        };

        this.currentRecognition.onresult = (event) => {
            this.handleRecognitionResult(event);
        };

        this.currentRecognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };

        this.currentRecognition.onend = () => {
            this.handleRecognitionEnd();
        };
    }

    /**
     * Handle speech recognition results
     */
    handleRecognitionResult(event) {
        try {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            
            if (confidence > 0.7) { // Only process high-confidence results
                this.processVoiceInput(transcript);
            } else {
            }
        } catch (error) {
            console.error('❌ Error processing recognition result:', error);
        }
    }

    /**
     * Handle recognition errors
     */
    handleRecognitionError(event) {
        console.error('❌ Speech recognition error:', event.error);
        this.isListening = false;
        this.dispatchEvent('voice-error', { error: event.error });
        
        // Implement retry logic for certain errors
        if (event.error === 'network') {
            const timeoutId = setTimeout(() => {
                this.startListening();
            }, 1000);
            this.timeouts.push(timeoutId);
        }
    }

    /**
     * Handle recognition end
     */
    handleRecognitionEnd() {
        this.isListening = false;
        this.dispatchEvent('voice-listening-ended');
    }

    /**
     * Process voice input and trigger appropriate actions
     */
    async processVoiceInput(transcript) {
        try {
            
            // Add to conversation history
            this.conversationHistory.push({
                type: 'user',
                text: transcript,
                timestamp: Date.now()
            });
            
            // Get MCP agent from global namespace if not set
            if (!this.mcpAgent) {
                this.mcpAgent = window.ChromeAIStudio?.mcpVoiceAgent;
            }

            // Process with MCP agent if available
            if (this.mcpAgent && this.mcpAgent.isInitialized) {
                try {
                    const response = await this.mcpAgent.processVoiceInput(transcript);
                    
                    if (response) {
                        await this.speak(response);
                    }
                } catch (error) {
                    console.error('❌ MCP Agent processing failed:', error);
                    await this.speak('Sorry, I encountered an error processing your request.');
                }
            } else {
                // Fallback: simple command processing
                await this.handleSimpleVoiceCommand(transcript);
            }
            
        } catch (error) {
            console.error('❌ Error processing voice input:', error);
            await this.speak('Sorry, I had trouble understanding that.');
        }
    }

    /**
     * Handle simple voice commands (fallback when MCP agent is not available)
     */
    async handleSimpleVoiceCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi')) {
            await this.speak('Hello! How can I help you today?');
        } else if (lowerTranscript.includes('time')) {
            const time = new Date().toLocaleTimeString();
            await this.speak(`The current time is ${time}`);
        } else if (lowerTranscript.includes('date')) {
            const date = new Date().toLocaleDateString();
            await this.speak(`Today's date is ${date}`);
        } else if (lowerTranscript.includes('stop') || lowerTranscript.includes('goodbye')) {
            await this.speak('Goodbye! Have a great day!');
            this.stopListening();
        } else {
            await this.speak('I heard you say: ' + transcript + '. I\'m still learning, so I may not understand everything yet.');
        }
    }

    /**
     * Speak text using speech synthesis
     */
    async speak(text, options = {}) {
        if (this.isSpeaking) {
            console.warn('⚠️ Already speaking, stopping current speech');
            this.stopSpeaking();
        }

        return new Promise((resolve, reject) => {
            let isResolved = false; // Prevent multiple resolve calls
            let timeoutId = null;
            
            try {
                this.isSpeaking = true;
                
      // Sync with floating bubble - SET ttsInProgress flag
      const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
      if (floatingBubble) {
        floatingBubble.isTTSSpeaking = true;
        floatingBubble.ttsInProgress = true; // NEW
        floatingBubble.ttsStartTimestamp = Date.now(); // NEW
      }
                
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Configure utterance options
                utterance.rate = options.rate || 1.0;
                utterance.pitch = options.pitch || 1.0;
                utterance.volume = options.volume || 0.8;
                utterance.lang = options.lang || this.options.language;
                
                // Helper function to resolve once
                const resolveOnce = (result) => {
                    if (!isResolved) {
                        isResolved = true;
                        this.isSpeaking = false;
                        
                        // Sync with floating bubble - CLEAR flags
                        const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
                        if (floatingBubble) {
                            floatingBubble.isTTSSpeaking = false;
                            floatingBubble.ttsInProgress = false; // NEW
                        }
                        
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                        resolve(result);
                    }
                };
                
                // Set up event handlers
                utterance.onstart = () => {
                    this.dispatchEvent('voice-speaking-started', { text });
                };
                
                utterance.onend = () => {
                    this.dispatchEvent('voice-speaking-ended', { text });
                    
                    // Check if this is an end conversation speech
                    if (options.endConversation) {
                        resolveOnce();
                        return;
                    }
                    
                    // Directly transition to listening and restart STT
                    const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
                    if (floatingBubble && floatingBubble.mcpConversationActive) {
                        // Small delay for audio cleanup
                        setTimeout(() => {
                            // Only set state if not already listening
                            if (floatingBubble.voiceState !== 'listening') {
                                floatingBubble.setVoiceState('listening');
                            }
                            floatingBubble.startContinuousVoiceListening();
                        }, 250); // 250ms delay for cleaner audio separation
                    }
                    resolveOnce();
                };
                
                utterance.onerror = (event) => {
                    if (event.error === 'not-allowed') {
                        console.warn('⚠️ Speech synthesis not allowed');
                        this.dispatchEvent('voice-interaction-required', { 
                            error: event.error, 
                            text: text,
                            utterance: utterance 
                        });
                        return;
                    }
                    
                    console.error('❌ Speech synthesis error:', event.error);
                    
                    // Restart STT on error
                    const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
                    if (floatingBubble && floatingBubble.mcpConversationActive) {
                        setTimeout(() => {
                            // Only set state if not already listening
                            if (floatingBubble.voiceState !== 'listening') {
                                floatingBubble.setVoiceState('listening');
                            }
                            floatingBubble.startContinuousVoiceListening();
                        }, 250);
                    }
                    
                    this.dispatchEvent('voice-error', { error: event.error });
                    resolveOnce();
                };
                
                // Speak the text
                speechSynthesis.speak(utterance);
                
                // Set a generous timeout as fallback only
                const timeoutDuration = Math.max(10000, Math.min(text.length * 100, 30000)); // 10-30 seconds max
                timeoutId = setTimeout(() => {
                    if (this.isSpeaking && !isResolved) {
                        console.warn('⚠️ Speech synthesis timeout, forcing completion');
                        this.stopSpeaking();
                        resolveOnce();
                    }
                }, timeoutDuration);
                
                // Add to conversation history
                this.conversationHistory.push({
                    type: 'assistant',
                    text: text,
                    timestamp: Date.now()
                });
                
            } catch (error) {
                console.error('❌ Failed to speak text:', error);
                if (!isResolved) {
                    isResolved = true;
                    this.isSpeaking = false;
                    // Clear flags on exception
                    const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
                    if (floatingBubble) {
                        floatingBubble.isTTSSpeaking = false;
                        floatingBubble.ttsInProgress = false;
                    }
                    resolve();
                }
            }
        });
    }

    /**
     * Stop current speech synthesis
     */
    stopSpeaking() {
        if (this.isSpeaking) {
            speechSynthesis.cancel();
            this.isSpeaking = false;
            this.dispatchEvent('voice-speaking-stopped');
        }
    }

    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }

    /**
     * Get conversation history
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Clear conversation history
     */
    clearConversationHistory() {
        this.conversationHistory = [];
    }

    /**
     * Check if currently listening
     */
    isCurrentlyListening() {
        return this.isListening;
    }

    /**
     * Check if currently speaking
     */
    isCurrentlySpeaking() {
        return this.isSpeaking;
    }

    /**
     * Update voice interface options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            hasMCPAgent: !!this.mcpAgent,
            conversationLength: this.conversationHistory.length
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        
        this.stopListening();
        this.stopSpeaking();
        this.clearConversationHistory();
        
        // Clear all timeouts
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts = [];
        
        // Remove event listeners
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        this.isInitialized = false;
    }

    /**
     * Add event listener
     */
    addEventListener(event, handler) {
        this.eventTarget.addEventListener(event, handler);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, handler) {
        this.eventTarget.removeEventListener(event, handler);
    }

    /**
     * Dispatch event
     */
    dispatchEvent(event, detail) {
        const customEvent = new CustomEvent(event, { detail });
        this.eventTarget.dispatchEvent(customEvent);
    }

    /**
     * Retry speech synthesis after user interaction
     */
    retrySpeechAfterInteraction(utterance) {
        
        // Create a new utterance to avoid issues with the previous one
        const newUtterance = new SpeechSynthesisUtterance(utterance.text);
        newUtterance.rate = utterance.rate || 1;
        newUtterance.pitch = utterance.pitch || 1;
        newUtterance.volume = utterance.volume || 1;
        newUtterance.voice = utterance.voice;
        
        return this.speak(newUtterance.text, {
            rate: newUtterance.rate,
            pitch: newUtterance.pitch,
            volume: newUtterance.volume,
            voice: newUtterance.voice
        });
    }

    /**
     * Speak periodic updates during long operations
     * Returns an interval ID that should be cleared when operation completes
     */
    startProgressUpdates(messages, intervalMs = 8000) {
        let messageIndex = 0;
        
        const intervalId = setInterval(async () => {
            if (messageIndex < messages.length) {
                await this.speak(messages[messageIndex]);
                messageIndex++;
            } else {
                // Loop back to first message if operation is still running
                messageIndex = 0;
            }
        }, intervalMs);
        return intervalId;
    }

    /**
     * Stop progress updates
     */
    stopProgressUpdates(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }

    /**
     * Execute a long-running operation with automatic progress updates
     */
    async withProgressUpdates(operation, progressMessages, intervalMs = 8000) {
        const intervalId = this.startProgressUpdates(progressMessages, intervalMs);
        
        try {
            const result = await operation();
            this.stopProgressUpdates(intervalId);
            return result;
        } catch (error) {
            this.stopProgressUpdates(intervalId);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPVoiceInterface;
} else if (typeof window !== 'undefined') {
    window.MCPVoiceInterface = MCPVoiceInterface;
    
    // Initialize in ChromeAI Studio namespace
    window.ChromeAIStudio = window.ChromeAIStudio || {};
    window.ChromeAIStudio.mcpVoiceInterface = new MCPVoiceInterface();
}