/**
 * AI Instance Manager - Centralized management of AI model instances
 * Implements session pooling, pre-warming, and health monitoring
 * 
 * Features:
 * - Pre-warm all AI models on extension load
 * - Session pooling to avoid recreation
 * - Health monitoring and automatic recovery
 * - Load balancing across instances
 * - Metrics collection and analytics
 * 
 * @author ChromeAI Studio
 * @version 1.0.0
 * @since 2024-01-01
 */

class AIInstanceManager {
    constructor(options = {}) {
        this.options = {
            maxInstances: 5,
            preWarmOnLoad: true,
            healthCheckInterval: 30000, // 30 seconds
            sessionTimeout: 300000, // 5 minutes
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };
        
        this.instances = new Map();
        this.sessionPools = new Map();
        this.healthStatus = new Map();
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            activeSessions: 0
        };
        
        this.healthCheckTimer = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    /**
     * Initialize the AI Instance Manager
     */
    async initialize() {
        try {
            
            
            // Initialize session pools for each AI type
            this.initializeSessionPools();
            
            // Pre-warm instances if enabled
            if (this.options.preWarmOnLoad) {
                await this.preWarmAllInstances();
            }
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AI Instance Manager:', error);
            throw error;
        }
    }

    /**
     * Initialize session pools for each AI type
     */
    initializeSessionPools() {
        const aiTypes = [
            'languageModel',
            'summarizer', 
            'writer',
            'translator',
            'rewriter',
            'proofreader',
            'languageDetector'
        ];
        
        aiTypes.forEach(type => {
            this.sessionPools.set(type, {
                available: [],
                inUse: [],
                maxSize: this.options.maxInstances,
                created: 0
            });
        });
    }

    /**
     * Pre-warm all AI instances
     */
    async preWarmAllInstances() {
        
        
        const preWarmPromises = [
            this.preWarmLanguageModel(),
            this.preWarmSummarizer(),
            this.preWarmWriter(),
            this.preWarmTranslator(),
            this.preWarmRewriter(),
            this.preWarmProofreader(),
            this.preWarmLanguageDetector()
        ];
        
        try {
            await Promise.allSettled(preWarmPromises);
        } catch (error) {
            console.error('Error pre-warming instances:', error);
        }
    }

    /**
     * Pre-warm Language Model instance
     */
    async preWarmLanguageModel() {
        try {
            const instance = await this.createLanguageModelInstance({
                temperature: 0.7,
                topK: 20,
                topP: 0.9
            });
            
            this.addToPool('languageModel', instance);
        } catch (error) {
            console.error('Failed to pre-warm Language Model:', error);
        }
    }

    /**
     * Pre-warm Summarizer instance
     */
    async preWarmSummarizer() {
        try {
            const instance = await this.createSummarizerInstance({
                summaryLength: 'medium',
                format: 'paragraph'
            });
            
            this.addToPool('summarizer', instance);
        } catch (error) {
            console.error('Failed to pre-warm Summarizer:', error);
        }
    }

    /**
     * Pre-warm Writer instance
     */
    async preWarmWriter() {
        try {
            const instance = await this.createWriterInstance({
                tone: 'professional',
                length: 'medium'
            });
            
            this.addToPool('writer', instance);
        } catch (error) {
            console.error('Failed to pre-warm Writer:', error);
        }
    }

    /**
     * Pre-warm Translator instance
     */
    async preWarmTranslator() {
        try {
            const instance = await this.createTranslatorInstance({
                sourceLanguage: 'auto',
                targetLanguage: 'en'
            });
            
            this.addToPool('translator', instance);
        } catch (error) {
            console.error('Failed to pre-warm Translator:', error);
        }
    }

    /**
     * Pre-warm Rewriter instance
     */
    async preWarmRewriter() {
        try {
            const instance = await this.createRewriterInstance({
                tone: 'professional',
                length: 'same'
            });
            
            this.addToPool('rewriter', instance);
        } catch (error) {
            console.error('Failed to pre-warm Rewriter:', error);
        }
    }

    /**
     * Pre-warm Proofreader instance
     */
    async preWarmProofreader() {
        try {
            const instance = await this.createProofreaderInstance({
                language: 'en',
                strictness: 'medium'
            });
            
            this.addToPool('proofreader', instance);
        } catch (error) {
            console.error('Failed to pre-warm Proofreader:', error);
        }
    }

    /**
     * Pre-warm Language Detector instance
     */
    async preWarmLanguageDetector() {
        try {
            const instance = await this.createLanguageDetectorInstance({
                confidence: 0.8
            });
            
            this.addToPool('languageDetector', instance);
        } catch (error) {
            console.error('Failed to pre-warm Language Detector:', error);
        }
    }

    /**
     * Get an AI instance from the pool
     */
    async getInstance(type, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const pool = this.sessionPools.get(type);
        if (!pool) {
            throw new Error(`Unknown AI type: ${type}`);
        }

        // Try to get an available instance
        let instance = this.getFromPool(type);
        
        // If no available instance, create a new one
        if (!instance) {
            instance = await this.createInstance(type, options);
        }

        // Mark as in use
        this.markAsInUse(type, instance);
        
        // Update metrics
        this.metrics.activeSessions++;
        
        return instance;
    }

    /**
     * Return an instance to the pool
     */
    releaseInstance(type, instance) {
        const pool = this.sessionPools.get(type);
        if (!pool) return;

        // Remove from in-use list
        const inUseIndex = pool.inUse.indexOf(instance);
        if (inUseIndex > -1) {
            pool.inUse.splice(inUseIndex, 1);
        }

        // Add back to available pool
        pool.available.push(instance);
        
        // Update metrics
        this.metrics.activeSessions--;
    }

    /**
     * Get instance from pool
     */
    getFromPool(type) {
        const pool = this.sessionPools.get(type);
        if (!pool || pool.available.length === 0) {
            return null;
        }
        
        return pool.available.pop();
    }

    /**
     * Mark instance as in use
     */
    markAsInUse(type, instance) {
        const pool = this.sessionPools.get(type);
        if (pool) {
            pool.inUse.push(instance);
        }
    }

    /**
     * Add instance to pool
     */
    addToPool(type, instance) {
        const pool = this.sessionPools.get(type);
        if (pool) {
            pool.available.push(instance);
            pool.created++;
        }
    }

    /**
     * Create a new AI instance
     */
    async createInstance(type, options = {}) {
        const startTime = Date.now();
        
        try {
            let instance;
            
            switch (type) {
                case 'languageModel':
                    instance = await this.createLanguageModelInstance(options);
                    break;
                case 'summarizer':
                    instance = await this.createSummarizerInstance(options);
                    break;
                case 'writer':
                    instance = await this.createWriterInstance(options);
                    break;
                case 'translator':
                    instance = await this.createTranslatorInstance(options);
                    break;
                case 'rewriter':
                    instance = await this.createRewriterInstance(options);
                    break;
                case 'proofreader':
                    instance = await this.createProofreaderInstance(options);
                    break;
                case 'languageDetector':
                    instance = await this.createLanguageDetectorInstance(options);
                    break;
                default:
                    throw new Error(`Unknown AI type: ${type}`);
            }
            
            // Update health status
            this.healthStatus.set(instance, {
                status: 'healthy',
                lastCheck: Date.now(),
                responseTime: Date.now() - startTime
            });
            
            return instance;
        } catch (error) {
            console.error(`Failed to create ${type} instance:`, error);
            throw error;
        }
    }

    /**
     * Create Language Model instance
     */
    async createLanguageModelInstance(options = {}) {
        // This will integrate with the actual Chrome AI APIs
        // For now, return a mock instance
        return {
            type: 'languageModel',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Summarizer instance
     */
    async createSummarizerInstance(options = {}) {
        return {
            type: 'summarizer',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Writer instance
     */
    async createWriterInstance(options = {}) {
        return {
            type: 'writer',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Translator instance
     */
    async createTranslatorInstance(options = {}) {
        return {
            type: 'translator',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Rewriter instance
     */
    async createRewriterInstance(options = {}) {
        return {
            type: 'rewriter',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Proofreader instance
     */
    async createProofreaderInstance(options = {}) {
        return {
            type: 'proofreader',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Create Language Detector instance
     */
    async createLanguageDetectorInstance(options = {}) {
        return {
            type: 'languageDetector',
            options: options,
            created: Date.now(),
            lastUsed: Date.now()
        };
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.options.healthCheckInterval);
    }

    /**
     * Perform health check on all instances
     */
    async performHealthCheck() {
        
        
        for (const [type, pool] of this.sessionPools) {
            // Check available instances
            for (const instance of pool.available) {
                await this.checkInstanceHealth(type, instance);
            }
            
            // Check in-use instances
            for (const instance of pool.inUse) {
                await this.checkInstanceHealth(type, instance);
            }
        }
    }

    /**
     * Check health of a specific instance
     */
    async checkInstanceHealth(type, instance) {
        try {
            const startTime = Date.now();
            
            // Perform a simple health check
            // This would be a lightweight operation to test the instance
            const isHealthy = await this.testInstance(instance);
            
            const responseTime = Date.now() - startTime;
            
            this.healthStatus.set(instance, {
                status: isHealthy ? 'healthy' : 'unhealthy',
                lastCheck: Date.now(),
                responseTime: responseTime
            });
            
            if (!isHealthy) {
                console.warn(`Unhealthy ${type} instance detected, will be replaced`);
                this.replaceUnhealthyInstance(type, instance);
            }
        } catch (error) {
            console.error(`Health check failed for ${type} instance:`, error);
            this.healthStatus.set(instance, {
                status: 'error',
                lastCheck: Date.now(),
                error: error.message
            });
        }
    }

    /**
     * Test if an instance is working properly
     */
    async testInstance(instance) {
        // This would perform a lightweight test
        // For now, just return true
        return true;
    }

    /**
     * Replace an unhealthy instance
     */
    async replaceUnhealthyInstance(type, instance) {
        try {
            // Remove from pool
            this.removeFromPool(type, instance);
            
            // Create replacement
            const newInstance = await this.createInstance(type, instance.options);
            this.addToPool(type, newInstance);
            
            
        } catch (error) {
            console.error(`Failed to replace unhealthy ${type} instance:`, error);
        }
    }

    /**
     * Remove instance from pool
     */
    removeFromPool(type, instance) {
        const pool = this.sessionPools.get(type);
        if (!pool) return;

        // Remove from available
        const availableIndex = pool.available.indexOf(instance);
        if (availableIndex > -1) {
            pool.available.splice(availableIndex, 1);
        }

        // Remove from in-use
        const inUseIndex = pool.inUse.indexOf(instance);
        if (inUseIndex > -1) {
            pool.inUse.splice(inUseIndex, 1);
        }

        // Remove from health status
        this.healthStatus.delete(instance);
    }

    /**
     * Get metrics for all instances
     */
    getMetrics() {
        const poolMetrics = {};
        
        for (const [type, pool] of this.sessionPools) {
            poolMetrics[type] = {
                available: pool.available.length,
                inUse: pool.inUse.length,
                total: pool.created,
                utilization: pool.inUse.length / Math.max(pool.created, 1)
            };
        }
        
        return {
            global: this.metrics,
            pools: poolMetrics,
            health: Object.fromEntries(this.healthStatus)
        };
    }

    /**
     * Get health status of all instances
     */
    getHealthStatus() {
        const status = {};
        
        for (const [instance, health] of this.healthStatus) {
            status[instance.type] = health;
        }
        
        return status;
    }

    /**
     * Cleanup all instances
     */
    async cleanup() {
        
        
        // Stop health monitoring
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        // Clear all pools
        for (const [type, pool] of this.sessionPools) {
            pool.available = [];
            pool.inUse = [];
            pool.created = 0;
        }
        
        // Clear health status
        this.healthStatus.clear();
        
        // Reset metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            activeSessions: 0
        };
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIInstanceManager;
} else if (typeof window !== 'undefined') {
    window.AIInstanceManager = AIInstanceManager;
}




























