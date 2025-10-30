/**
 * Agent Memory - Track task state, progress, and extracted data
 * Used by Autonomous Agent to maintain context across steps
 * 
 * Features:
 * - Current task tracking
 * - Extracted data storage
 * - Visited pages history
 * - Step progress tracking
 * - Error logging
 */

class AgentMemory {
  constructor() {
    this.currentTask = null;
    this.extractedData = {};
    this.visitedPages = [];
    this.taskProgress = [];
    this.errors = [];
    this.stepResults = [];
  }

  /**
   * Start new task
   */
  startTask(taskDescription) {
    this.currentTask = {
      description: taskDescription,
      startTime: Date.now(),
      status: 'running',
      steps: []
    };
    
    // Clear previous task data
    this.extractedData = {};
    this.visitedPages = [];
    this.taskProgress = [];
    this.errors = [];
    this.stepResults = [];
  }

  /**
   * End current task
   */
  endTask(status = 'completed', summary = null) {
    if (!this.currentTask) return;
    
    this.currentTask.status = status;
    this.currentTask.endTime = Date.now();
    this.currentTask.duration = this.currentTask.endTime - this.currentTask.startTime;
    this.currentTask.summary = summary;
  }

  /**
   * Add step to current task
   */
  addStep(step) {
    if (!this.currentTask) return;
    
    this.currentTask.steps.push({
      ...step,
      timestamp: Date.now()
    });
    
    this.taskProgress.push({
      step: step.action,
      description: step.description,
      timestamp: Date.now()
    });
  }

  /**
   * Record step result
   */
  recordStepResult(stepIndex, result) {
    this.stepResults.push({
      stepIndex,
      result,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  /**
   * Store extracted data
   */
  storeExtractedData(key, data) {
    this.extractedData[key] = {
      data: data,
      timestamp: Date.now(),
      url: window.location.href
    };
  }

  /**
   * Get extracted data
   */
  getExtractedData(key) {
    return this.extractedData[key]?.data || null;
  }

  /**
   * Get all extracted data
   */
  getAllExtractedData() {
    return Object.fromEntries(
      Object.entries(this.extractedData).map(([key, value]) => [key, value.data])
    );
  }

  /**
   * Get steps history (for AI decision making)
   */
  getStepsHistory() {
    if (!this.currentTask || !this.currentTask.steps) {
      return [];
    }
    return this.currentTask.steps;
  }

  /**
   * Record page visit
   */
  recordPageVisit(url, purpose = null) {
    this.visitedPages.push({
      url: url || window.location.href,
      purpose,
      timestamp: Date.now()
    });
  }

  /**
   * Record error
   */
  recordError(error, context = null) {
    this.errors.push({
      error: error.message || String(error),
      context,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    console.error(`🧠 Error recorded: ${error.message}`);
  }

  /**
   * Get current task status
   */
  getTaskStatus() {
    if (!this.currentTask) {
      return { hasTask: false };
    }
    
    return {
      hasTask: true,
      description: this.currentTask.description,
      status: this.currentTask.status,
      stepsCompleted: this.currentTask.steps.length,
      duration: Date.now() - this.currentTask.startTime,
      currentUrl: window.location.href
    };
  }

  /**
   * Get task summary
   */
  getTaskSummary() {
    if (!this.currentTask) return null;
    
    return {
      task: this.currentTask.description,
      status: this.currentTask.status,
      stepsCompleted: this.currentTask.steps.length,
      pagesVisited: this.visitedPages.length,
      dataExtracted: Object.keys(this.extractedData).length,
      errors: this.errors.length,
      duration: this.currentTask.duration || (Date.now() - this.currentTask.startTime)
    };
  }

  /**
   * Get task context for AI planning
   */
  getContextForPlanning() {
    return {
      currentTask: this.currentTask?.description || null,
      stepsCompleted: this.taskProgress.map(p => p.description),
      extractedData: this.getAllExtractedData(),
      visitedPages: this.visitedPages.map(p => p.url),
      recentErrors: this.errors.slice(-3).map(e => e.error),
      currentUrl: window.location.href
    };
  }

  /**
   * Clear all memory
   */
  clearAll() {
    this.currentTask = null;
    this.extractedData = {};
    this.visitedPages = [];
    this.taskProgress = [];
    this.errors = [];
    this.stepResults = [];
  }

  /**
   * Export memory state as JSON
   */
  exportState() {
    return {
      currentTask: this.currentTask,
      extractedData: this.getAllExtractedData(),
      visitedPages: this.visitedPages,
      taskProgress: this.taskProgress,
      errors: this.errors,
      stepResults: this.stepResults
    };
  }

  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      tasksCompleted: this.currentTask ? 1 : 0,
      stepsExecuted: this.taskProgress.length,
      pagesVisited: this.visitedPages.length,
      dataPointsExtracted: Object.keys(this.extractedData).length,
      errorsEncountered: this.errors.length,
      memoryUsage: JSON.stringify(this.exportState()).length + ' bytes'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentMemory;
} else if (typeof window !== 'undefined') {
  window.AgentMemory = AgentMemory;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.agentMemory = new AgentMemory();
}

