/**
 * ChromeAI Studio - Mode Features
 * Fallback implementations for mode-specific features using Chrome AI APIs
 */

class ModeFeatures {
  constructor(aiManager) {
    this.ai = aiManager;
  }

  /**
   * Generic AI prompt with context
   */
  async aiPrompt(text, context = '') {
    const prompt = context ? `${context}\n\n${text}` : text;
    const result = await this.ai.prompt(prompt);
    return result.success ? result.result : `Error: ${result.error?.message || 'Unknown error'}`;
  }
}

/**
 * Student Mode Features
 */
class StudentModeFeatures extends ModeFeatures {
  async conceptExplainer(text) {
    return this.aiPrompt(text, 
      'You are a helpful tutor. Explain this concept in simple, clear terms suitable for a student:');
  }

  async smartPageSummarizer(text) {
    const result = await this.ai.summarize(text, {
      type: 'key-points',
      format: 'markdown',
      length: 'medium'
    });
    return result.success ? result.result : `Error: ${result.error?.message || 'Summarization failed'}`;
  }

  async interactiveQuizGenerator(text) {
    return this.aiPrompt(text,
      'Create 5 multiple-choice quiz questions based on this content. Format each question with 4 options (A, B, C, D) and mark the correct answer:');
  }

  async smartNoteTaker(text) {
    return this.aiPrompt(text,
      'Create organized study notes from this content. Use bullet points, headings, and highlight key concepts:');
  }

  async multiLanguageTranslator(text, targetLanguage = 'es') {
    // Try language detection first
    const detection = await this.ai.detectLanguage(text);
    const sourceLang = detection.success ? detection.result : 'en';
    
    const result = await this.ai.translate(text, sourceLang, targetLanguage);
    return result.success ? result.result : `Error: ${result.error?.message || 'Translation failed'}`;
  }

  async flashcardCreator(text) {
    return this.aiPrompt(text,
      'Create flashcards from this content. Format as:\nFront: [Question]\nBack: [Answer]\n\nCreate 5-7 flashcards:');
  }

  async difficultyAdapter(text, level = 'beginner') {
    return this.aiPrompt(text,
      `Rewrite this content for a ${level} level understanding. Use simpler language and clearer explanations:`);
  }

  async learningPathSuggester(text) {
    return this.aiPrompt(text,
      'Based on this content, suggest a learning path with topics to study in order:');
  }

  startStudySession() {
    return 'Study session started! Use the sidebar to interact with AI for study help.';
  }
}

/**
 * Developer Mode Features
 */
class DeveloperModeFeatures extends ModeFeatures {
  async codeExplainer(code) {
    return this.aiPrompt(code,
      'Explain this code in detail. Describe what it does, how it works, and any important concepts:');
  }

  async codeDocumenter(code) {
    return this.aiPrompt(code,
      'Generate comprehensive documentation for this code including JSDoc comments, parameter descriptions, and usage examples:');
  }

  async bugAnalyzer(code) {
    return this.aiPrompt(code,
      'Analyze this code for potential bugs, errors, or issues. Suggest fixes:');
  }

  async codeQualityChecker(code) {
    return this.aiPrompt(code,
      'Review this code for quality, best practices, performance issues, and security concerns:');
  }

  async languageConverter(code, targetLanguage = 'python') {
    return this.aiPrompt(code,
      `Convert this code to ${targetLanguage}. Maintain the same functionality:`);
  }

  async performanceOptimizer(code) {
    return this.aiPrompt(code,
      'Suggest performance optimizations for this code. Explain the improvements:');
  }

  async testGenerator(code) {
    return this.aiPrompt(code,
      'Generate unit tests for this code. Include edge cases and error handling:');
  }

  async apiDocGenerator(code) {
    return this.aiPrompt(code,
      'Generate API documentation for this code with endpoints, parameters, and examples:');
  }
}

/**
 * Creator Mode Features
 */
class CreatorModeFeatures extends ModeFeatures {
  async seoContentOptimizer(text) {
    return this.aiPrompt(text,
      'Optimize this content for SEO. Improve readability, keyword usage, and engagement:');
  }

  async audienceToneAdapter(text, audience = 'general') {
    return this.aiPrompt(text,
      `Rewrite this content for a ${audience} audience with appropriate tone and style:`);
  }

  async hashtagGenerator(text) {
    return this.aiPrompt(text,
      'Generate 8-12 relevant hashtags for this content. Mix popular and niche tags:');
  }

  async contentOptimizer(text, type = 'engagement') {
    return this.aiPrompt(text,
      `Optimize this content for ${type}. Make it more compelling and effective:`);
  }

  async multiFormatExporter(text) {
    const result = await this.ai.rewrite(text, {
      tone: 'as-is',
      format: 'markdown',
      length: 'as-is'
    });
    return result.success ? result.result : `Error: ${result.error?.message || 'Rewrite failed'}`;
  }

  async socialMediaFormatter(text, platform = 'twitter') {
    return this.aiPrompt(text,
      `Adapt this content for ${platform}. Follow platform best practices and character limits:`);
  }

  async contentIdeasGenerator(topic) {
    return this.aiPrompt(topic,
      'Generate 10 creative content ideas based on this topic. Include titles and brief descriptions:');
  }

  async headlineGenerator(text) {
    return this.aiPrompt(text,
      'Generate 5 compelling headlines for this content. Make them attention-grabbing and click-worthy:');
  }
}

/**
 * Researcher Mode Features
 */
class ResearcherModeFeatures extends ModeFeatures {
  async factChecker(text) {
    return this.aiPrompt(text,
      'Fact-check this content. Identify claims that need verification and highlight potential inaccuracies:');
  }

  async sourceCredibilityAnalyzer(text) {
    return this.aiPrompt(text,
      'Analyze the credibility of this content. Look for bias, authority, and reliability indicators:');
  }

  async sourceFinder(text) {
    return this.aiPrompt(text,
      'Suggest reliable sources and references related to this topic. Include academic and authoritative sources:');
  }

  async citationGenerator(text, style = 'APA') {
    return this.aiPrompt(text,
      `Generate ${style} citations for this content. Format properly according to ${style} guidelines:`);
  }

  async crossSourceSynthesizer(sources) {
    const combined = Array.isArray(sources) ? sources.join('\n\n---\n\n') : sources;
    return this.aiPrompt(combined,
      'Synthesize information from these sources. Identify common themes, contradictions, and key insights:');
  }

  async researchGapIdentifier(text) {
    return this.aiPrompt(text,
      'Identify gaps in this research or topic. Suggest areas that need further investigation:');
  }

  async literatureReviewer(text) {
    return this.aiPrompt(text,
      'Provide a literature review summary of this content. Highlight key findings and methodologies:');
  }

  async dataAnalyzer(text) {
    return this.aiPrompt(text,
      'Analyze this data or research findings. Identify patterns, trends, and significant results:');
  }

  async researchTimelineBuilder(text) {
    return this.aiPrompt(text,
      'Create a research timeline from this information. Organize chronologically with key dates and events:');
  }

  async literatureReviewCreator(text) {
    return this.aiPrompt(text,
      'Create a comprehensive literature review. Summarize key findings, methodologies, and gaps:');
  }

  async dataPatternIdentifier(text) {
    return this.aiPrompt(text,
      'Identify patterns, trends, and anomalies in this data. Provide statistical insights:');
  }

  async hypothesisGenerator(text) {
    return this.aiPrompt(text,
      'Generate research hypotheses based on this information. Include testable predictions:');
  }

  async collaborationHub(text) {
    return 'Collaboration hub feature coming soon. Use the sidebar to share research notes.';
  }

  async researchExportManager(text) {
    return 'Research export feature coming soon. Use browser print/save for now.';
  }
}

// Initialize and attach to global namespace
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  
  // Wait for AI Manager to be available
  const initModeFeatures = () => {
    const aiManager = window.ChromeAIStudio.aiManager;
    if (!aiManager) {
      console.warn('⚠️ AI Manager not available yet, mode features will be limited');
      return;
    }

    window.ChromeAIStudio.studentModeFeatures = new StudentModeFeatures(aiManager);
    window.ChromeAIStudio.developerModeFeatures = new DeveloperModeFeatures(aiManager);
    window.ChromeAIStudio.creatorModeFeatures = new CreatorModeFeatures(aiManager);
    window.ChromeAIStudio.researcherModeFeatures = new ResearcherModeFeatures(aiManager);
  };

  // Try to initialize immediately if AI Manager exists
  if (window.ChromeAIStudio?.aiManager) {
    initModeFeatures();
  } else {
    // Otherwise wait for AI Manager
    window.addEventListener('chromeai-ready', initModeFeatures);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StudentModeFeatures,
    DeveloperModeFeatures,
    CreatorModeFeatures,
    ResearcherModeFeatures
  };
}

