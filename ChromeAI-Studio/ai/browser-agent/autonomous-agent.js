/**
 * Autonomous Agent - Main brain for fully automated browser tasks
 * 
 * Vision: User says "Research top 10 schools in India and save to Google Docs"
 * Agent: Plans, executes, and completes the task autonomously
 * 
 * Features:
 * - Chrome AI-powered task planning
 * - Multi-step task execution
 * - Smart element finding (no hardcoding)
 * - Voice progress updates
 * - Error recovery and replanning
 * - Data extraction and storage
 */

class AutonomousAgent {
  constructor(options = {}) {
    this.domExtractor = window.ChromeAIStudio?.enhancedDOMExtractor;
    this.actionExecutor = window.ChromeAIStudio?.actionExecutor;
    this.dataExtractor = window.ChromeAIStudio?.dataExtractor;
    this.memory = window.ChromeAIStudio?.agentMemory;
    this.voiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
    this.progressUI = window.ChromeAIStudio?.agentProgressUI;
    
    this.options = {
      maxRetries: 3,
      stepTimeout: 30000,
      voiceProgress: true,
      showProgressUI: true,
      closeWindowOnComplete: false, // Keep window open during task execution
      maxSteps: 20, // Prevent infinite loops
      // Enforce ultra-fast main workflow by default (search → urlsToMarkdown → complete)
      forceUltraFastWorkflow: true,
      ...options
    };
    
    this.isExecuting = false;
    this.isPaused = false;
    this.pausedState = null;
    this.resumed = false;
    this.activeTab = null;
    this.currentAutomationTabId = null;
    this.currentStep = 0;
    this.aiSession = null; // Persistent AI session for iterative decisions
    
    // Performance optimization constants
    this.MAX_SOURCES = 10;
    this.MAX_PER_SOURCE_CHARS = 20000;
    this.SUMMARIZER_INPUT_BUDGET = 6000;
    this.TOP_K_ITEMS = 10;
  }

  /**
   * Sanitize summary text to avoid UI artifacts and noisy markdown
   */
  sanitizeSummary(text) {
    try {
      if (!text) return '';
      let cleaned = String(text);
      // Remove streaming cursor glyphs
      cleaned = cleaned.replace(/▊/g, '');
      // Remove accidental clipboard/toolbar labels if leaked into text
      cleaned = cleaned.replace(/^\s*Copy\s+Copied!\s*/i, '');
      // Collapse excessive blank lines
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      // Trim stray spaces
      cleaned = cleaned.trim();
      return cleaned;
    } catch (e) {
      return text;
    }
  }

  /**
   * Enforce character budget by truncating text
   */
  enforceCharBudget(text, limit) {
    if (!text || text.length <= limit) return text;
    return text.slice(0, limit);
  }

  /**
   * Compress data to top items only
   */
  async compressDataToTopItems(dataContext, topK) {
    try {
      const session = await LanguageModel.create({ 
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const prompt = `Extract ONLY the TOP ${topK} most relevant items from this data. Rank by relevance and quantitative evidence.

Data to compress:
${dataContext}

Return only the top ${topK} items with their key details. Format as:
1. [Item Name] - [Key Metric] - [Source]
2. [Item Name] - [Key Metric] - [Source]
...

Keep only the most important ${topK} items.`;
      
      const compressed = await session.prompt(prompt);
      await session.destroy();
      return compressed;
      
    } catch (error) {
      console.error('❌ Failed to compress data:', error);
      // Fallback: truncate to budget
      return this.enforceCharBudget(dataContext, this.SUMMARIZER_INPUT_BUDGET);
    }
  }
  async selectTopUrlsFromSearchResults(searchResults, k = 10) {
    if (!searchResults || searchResults.length === 0) return [];
    
    // For now, return first k results (can be enhanced with AI-based relevance scoring)
    const selected = searchResults.slice(0, k);
    selected.forEach((result, i) => {
    });
    
    return selected;
  }
  async executeTask(taskDescription) {
    if (this.isExecuting) {
      throw new Error('Agent is already executing a task');
    }
    
    this.isExecuting = true;
    
    try {
      
      // Store current task for reference
      this.currentTask = taskDescription;
      
      // Initialize memory
      this.memory.startTask(taskDescription);
      
      // Create dedicated automation window
      
      const message = {
        type: 'CREATE_AUTOMATION_WINDOW',
        taskId: taskDescription,
        url: 'about:blank',
        options: {
          state: 'minimized',  // Start minimized!
          focused: false,      // Don't steal focus
          width: 1280,
          height: 720
        }
      };
      
      let windowResult;
      try {
        windowResult = await chrome.runtime.sendMessage(message);
      } catch (error) {
        console.error('🔍 DEBUG: [Content] Message send failed:', error);
        console.error('🔍 DEBUG: [Content] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
      
      if (!windowResult || !windowResult.success) {
        throw new Error('Failed to create automation window: ' + (windowResult?.error || 'No response'));
      }
      this.automationWindowId = windowResult.windowId;
      
      // Show enhanced progress UI
      if (this.options.showProgressUI && this.progressUI) {
        this.progressUI.show(taskDescription);
        this.progressUI.updateStatus('🧠 Planning research strategy...');
      }
      
      // Voice: Starting task - concise and natural
      const shortenedTask = taskDescription.length > 50 
        ? taskDescription.substring(0, 50) + '...'
        : taskDescription;
      await this.reportProgress(`I've started your research. Working on it now...`);
      
      // ITERATIVE EXECUTION - AI decides next step after each action
      let stepCount = 0;
      const maxSteps = 15; // Safety limit
      let isComplete = false;
      
      if (this.progressUI) {
        this.progressUI.updateStatus('🤖 AI is planning and executing...');
      }
      
      while (!isComplete && stepCount < maxSteps) {
        stepCount++;
        
        // Ask AI: What should I do next?
        const decision = await this.decideNextAction(taskDescription);
        
        // Check if task is complete
        if (decision.action === 'complete' || decision.action === 'finish') {
          isComplete = true;
          break;
        }
        
        // Add step to UI with consolidated descriptions (only 3 main steps)
        if (this.progressUI) {
          let stepDescription = '';
          let stepDetails = '';
          let stepNumber = '';
          
          if (decision.action === 'search') {
            stepNumber = 'Step 1';
            stepDescription = 'Step 1: 🔍 Searching the web';
            stepDetails = 'Finding relevant sources and information';
          } else if (decision.action === 'urlsToMarkdown' || decision.action === 'urlstomarkdown' || decision.action === 'converttomarkdown') {
            stepNumber = 'Step 2';
            stepDescription = 'Step 2: 📄 Reading and analyzing websites';
            stepDetails = 'Converting web pages to readable format';
          } else if (decision.action === 'complete' || decision.action === 'finish') {
            stepNumber = 'Step 3';
            stepDescription = 'Step 3: 📝 Summarizing findings';
            stepDetails = 'Generating comprehensive research summary';
          } else {
            // For other actions, don't create new steps, just update existing ones
            continue;
          }
          
          // Only add step if it's one of the 3 main steps and not already added
          const existingStep = this.progressUI.steps.find(step => step.description.startsWith(stepNumber));
          if (!existingStep) {
            this.progressUI.addStep(stepDescription, 'running', stepDetails);
          }
        }
        
        // Add step to memory
        this.memory.addStep(decision);
        
        // Voice progress - only for key steps, concise
        if (decision.description && stepCount <= 3) {
          const conciseDesc = decision.description.length > 60 
            ? decision.description.substring(0, 60) + '...'
            : decision.description;
          await this.reportProgress(conciseDesc);
        }
        
        // Execute the decided step
        try {
          const result = await this.executeStepWithRetry(decision);
          
          // Safely extract message from result
          const resultMessage = (result && typeof result === 'object' && result.message) 
            ? result.message 
            : (result ? String(result) : 'Done');
          
          // Update UI with success - update the appropriate consolidated step
          if (this.progressUI) {
            let stepToUpdate = '';
            if (decision.action === 'search') {
              stepToUpdate = 'Step 1: 🔍 Searching the web';
            } else if (decision.action === 'urlsToMarkdown' || decision.action === 'urlstomarkdown' || decision.action === 'converttomarkdown') {
              stepToUpdate = 'Step 2: 📄 Reading and analyzing websites';
            } else if (decision.action === 'complete' || decision.action === 'finish') {
              stepToUpdate = 'Step 3: 📝 Summarizing findings';
            }
            
            if (stepToUpdate) {
              const step = this.progressUI.steps.find(s => s.description === stepToUpdate);
              if (step) {
                this.progressUI.updateStep(step.id, 'completed', resultMessage);
              }
            }
          }
          
          // Record result with success status
          this.memory.recordStepResult(stepCount - 1, {
            ...result,
            success: result.success !== false, // Default to true unless explicitly false
            tabId: this.currentAutomationTabId
          });
          
          // Update the step in memory with success status
          const steps = this.memory.getStepsHistory();
          if (steps && steps[stepCount - 1]) {
            steps[stepCount - 1].success = result.success !== false;
            steps[stepCount - 1].tabId = this.currentAutomationTabId;
            if (result.error) {
              steps[stepCount - 1].error = result.error;
            }
          }
          
          // No automatic workflow - let AI decide everything
          
        } catch (error) {
          console.error(`❌ Step ${stepCount} failed:`, error);
          
          // Record failure in memory
          this.memory.recordStepResult(stepCount - 1, {
            success: false,
            error: error.message,
            tabId: this.currentAutomationTabId
          });
          
          // Update the step in memory with failure status
          const steps = this.memory.getStepsHistory();
          if (steps && steps[stepCount - 1]) {
            steps[stepCount - 1].success = false;
            steps[stepCount - 1].error = error.message;
          }
          
          // Update UI with error
          if (this.progressUI) {
            this.progressUI.updateLastStep('failed', error.message);
          }
          
          // Ask AI if we should continue or abort
          const errorDecision = await this.decideAfterError(taskDescription, error.message);
          
          if (errorDecision.action === 'abort') {
            throw error;
          }
          // Otherwise continue to next iteration
        }
        
        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (stepCount >= maxSteps) {
        console.warn(`⚠️ Reached max steps (${maxSteps}). Stopping.`);
      }
      
      // 3. Ask AI to compile final summary
      
      // Add final summarization step
      if (this.progressUI) {
        this.progressUI.addStep('📝 Summarizing Research Findings', 'running', 'Generating comprehensive research report');
        this.progressUI.addMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, 'Analyzing collected data', 'running');
      }
      
      console.info('🧠 Compiling final result with AI (chunked summaries preferred)');
      const summary = await this.compileFinalResultWithAI(taskDescription);
      console.info('✅ Final summary compiled. Length:', summary ? summary.length : 0);
      
      // Update mini step
      if (this.progressUI) {
        this.progressUI.updateMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, this.progressUI.steps[this.progressUI.steps.length - 1].id, 'completed', 'Data analyzed');
        this.progressUI.addMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, 'Generating comprehensive summary', 'running');
      }
      
      // 4. AI decides presentation method
      const presentation = await this.decideFinalPresentation(summary, taskDescription);
      
      // Update mini step
      if (this.progressUI) {
        this.progressUI.updateMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, this.progressUI.steps[this.progressUI.steps.length - 1].id, 'completed', 'Summary generated');
        this.progressUI.addMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, 'Preparing results for display', 'running');
      }
      
      // 5. Present results based on AI decision
      if (presentation.method === 'sidebar' || presentation.method === 'both') {
        console.info('🪟 Displaying results in sidebar (streaming if available)');
        await this.displayInSidebar(this.sanitizeSummary(summary), this.memory.getAllExtractedData());
        
        // Update mini step
        if (this.progressUI) {
          this.progressUI.updateMiniStep(this.progressUI.steps[this.progressUI.steps.length - 1].id, this.progressUI.steps[this.progressUI.steps.length - 1].id, 'completed', 'Results displayed in sidebar');
        }
      }
      
      if (presentation.method === 'google-docs' || presentation.method === 'both') {
        await this.actionExecutor.navigate('https://docs.google.com/document/create');
        // Note: User will need to manually paste/save - automation stops here
        await this.reportProgress('Opening Google Docs for you now.');
      }
      
      // Update UI with completion
      if (this.progressUI) {
        // Complete the final summarization step
        const finalStep = this.progressUI.steps.find(s => s.description === 'Step 3: 📝 Summarizing findings');
        if (finalStep) {
          this.progressUI.updateStep(finalStep.id, 'completed', 'Research completed successfully');
        }
        this.progressUI.setComplete('🎉 Research completed successfully!');
      }
      
      // Voice: Completion - concise and natural
      await this.reportProgress(`Your research is complete! Check the sidebar to see the results.`);
      
      // End task in memory
      this.memory.endTask('completed', summary);
      
      this.isExecuting = false;
      
      return {
        success: true,
        summary: summary,
        extractedData: this.memory.getAllExtractedData(),
        steps: stepCount
      };
      
    } catch (error) {
      console.error('🤖 Task execution failed:', error);
      
      // Show error in UI
      if (this.progressUI) {
        this.progressUI.setError(error.message);
      }
      
      this.memory.recordError(error);
      this.memory.endTask('failed', error.message);
      
      await this.reportProgress(`Research couldn't complete. ${error.message.substring(0, 50)}`);
      
      this.isExecuting = false;
      
      throw error;
      
    } finally {
      // Clean up automation window (if option is enabled)
      if (this.automationWindowId && this.options.closeWindowOnComplete) {
        
        try {
          await chrome.runtime.sendMessage({
            type: 'CLOSE_AUTOMATION_WINDOW',
            taskId: this.memory.currentTask?.description || 'unknown'
          });
        } catch (e) {
          console.warn('Failed to close automation window:', e);
        }
        
        this.automationWindowId = null;
      } else {
      }
    }
  }

  /**
   * AI decides next action based on current progress (ITERATIVE)
   */
  async decideNextAction(taskDescription) {
    try {
      // Get current progress
      const completedSteps = this.memory.getStepsHistory();
      const extractedData = this.memory.getAllExtractedData();
      
      // Deterministic ultra-fast workflow (search → urlsToMarkdown → complete)
      if (this.options && this.options.forceUltraFastWorkflow) {
        const hasSearchResults = Array.isArray(extractedData.search_results) && extractedData.search_results.length > 0;
        const hasMarkdown = extractedData.markdown_data && extractedData.markdown_data.length > 0;
        const hasChunked = extractedData.chunked_summaries && extractedData.chunked_summaries.length > 0;
        const hasBatch = extractedData.batch_extraction_results && extractedData.batch_extraction_results.length > 0;
        const searchesDone = completedSteps.filter(s => s.action === 'search').length;

        // If nothing yet, allow one search only
        if (!hasSearchResults && !hasMarkdown && !hasChunked && !hasBatch && searchesDone === 0) {
          return {
            action: 'search',
            target: taskDescription,
            parameters: {},
            description: 'Starting with Google search (ULTRA-FAST path)'
          };
        }

        // If we have search results but no markdown yet, convert top URLs to markdown
        if (hasSearchResults && !hasMarkdown && !hasChunked && !hasBatch) {
          return {
            action: 'urlsToMarkdown',
            target: '',
            parameters: { limit: 10 },
            description: 'Converting top URLs to markdown (ULTRA-FAST path)'
          };
        }

        // If we have markdown (or chunked summaries), proceed to complete
        if (hasMarkdown || hasChunked || hasBatch) {
          return {
            action: 'complete',
            target: '',
            parameters: {},
            description: 'Summarizing collected markdown data (ULTRA-FAST path)'
          };
        }
      }
      
      // CRITICAL: Check if we already have markdown data - if so, go directly to complete
      
      if (extractedData.markdown_data && extractedData.markdown_data.length > 0) {
        return {
          action: 'complete',
          target: '',
          parameters: {},
          description: 'Summarize all collected markdown data',
          thinking: 'I already have markdown data from previous urlsToMarkdown step. I should summarize it instead of repeating the conversion.'
        };
      }
      
      // CRITICAL: Check if we already have batch extraction results - if so, go directly to complete
      
      if (extractedData.batch_extraction_results && extractedData.batch_extraction_results.length > 0) {
        return {
          action: 'complete',
          target: '',
          parameters: {},
          description: 'Summarize all collected batch extraction data',
          thinking: 'I already have batch extraction data from previous batchExtract step. I should summarize it instead of repeating the extraction.'
        };
      }
      
      const session = await LanguageModel.create({
        temperature: 0.4,
        topK: 20,
        outputLanguage: 'en'
      });
      
      // Get current page URL from automation window
      let currentPageUrl = 'unknown';
      try {
        if (this.currentAutomationTabId) {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_TAB_URL',
            tabId: this.currentAutomationTabId
          });
          currentPageUrl = response?.url || 'unknown';
        }
      } catch (e) {
        console.warn('Could not get current page URL:', e);
      }
      
      // Format extracted data with clear info about url_analysis and failed extractions
      let dataInfo = 'None yet';
      let hasFailedExtraction = false;
      
      if (Object.keys(extractedData).length > 0) {
        dataInfo = Object.keys(extractedData).map(key => {
          const data = extractedData[key];
          
          // Special handling for url_analysis
          if (key === 'url_analysis' && data.urls) {
            return `- ${key}: ${data.urls.length} URLs selected for visiting\n  URLs to visit: ${data.urls.slice(0, 3).join(', ')}${data.urls.length > 3 ? '...' : ''}`;
          }
          
          // Check for failed extractions (empty objects/arrays)
          const isEmpty = (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) ||
                         (Array.isArray(data) && data.length === 0);
          
          if (isEmpty && key !== 'url_analysis') {
            hasFailedExtraction = true;
            return `- ${key}: FAILED (empty data) ❌`;
          }
          
          const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1);
          const preview = Array.isArray(data) && data.length > 0 ? `\n  Sample: ${data.slice(0, 2).map(item => 
            typeof item === 'object' ? (item.title || item.domain || JSON.stringify(item).slice(0, 50)) : item
          ).join(', ')}` : '';
          return `- ${key}: ${count} items${preview}`;
        }).join('\n');
      }
      
      // Count how many times we extracted from the current page
      const extractionsFromCurrentPage = completedSteps.filter(
        s => s.action === 'extract' && s.description && s.description.includes(currentPageUrl)
      ).length;
      
      const prompt = `You are an autonomous web browsing agent completing tasks intelligently.

=== TASK OBJECTIVE ===
${taskDescription}

=== BROWSER CONTEXT ===
🪟 Automation Window ID: ${this.automationWindowId || 'Not created yet'}
📑 Current Tab ID: ${this.currentAutomationTabId || 'None'}
📍 Current Page URL: ${currentPageUrl}
🔢 Total Steps Taken: ${completedSteps.length}
📊 Data Collections: ${Object.keys(extractedData).length}

=== COMPLETE STEP HISTORY ===
${completedSteps.length > 0 ? completedSteps.map((step, i) => {
  const status = step.success === false ? '❌ FAILED' : '✅ SUCCESS';
  const errorInfo = step.error ? ` | Error: ${step.error}` : '';
  const tabInfo = step.tabId ? ` | Tab: ${step.tabId}` : '';
  return `Step ${i + 1} [${status}]: ${step.action} - ${step.description}${errorInfo}${tabInfo}`;
}).join('\n') : '(No steps completed yet - starting fresh)'}

=== DATA COLLECTED SO FAR ===
${Object.keys(extractedData).length > 0 ? Object.keys(extractedData).map(key => {
  const data = extractedData[key];
  
  // Check if data is empty/null/failed
  const isEmpty = !data || 
                  (Array.isArray(data) && data.length === 0) || 
                  (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
  
  if (isEmpty) {
    return `❌ ${key}: EMPTY/FAILED - extraction returned no usable data`;
  }
  
  // Count items
  const count = Array.isArray(data) ? data.length : 
                (typeof data === 'object' ? Object.keys(data).length : 1);
  
  // Preview sample data
  let preview = '';
  if (Array.isArray(data) && data.length > 0) {
    const samples = data.slice(0, 2).map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.title || item.name || item.domain || item.url || 
               JSON.stringify(item).slice(0, 50);
      }
      return String(item).slice(0, 50);
    });
    preview = `\n   📋 Sample: ${samples.join(', ')}${data.length > 2 ? '...' : ''}`;
  }
  
  return `✅ ${key}: ${count} items${preview}`;
}).join('\n') : '(No data collected yet)'}

${extractedData.search_results && Array.isArray(extractedData.search_results) && extractedData.search_results.length > 0 ? `
=== 🔍 SEARCH RESULTS (URLs AVAILABLE TO VISIT) ===

You have ${extractedData.search_results.length} search results from Google. When you need to navigate, you MUST choose URLs from this list:

${extractedData.search_results.map((result, i) => `
${i + 1}. ${result.title}
   Domain: ${result.domain}
   URL: ${result.url}
   Snippet: ${result.snippet || 'No snippet'}
`).join('')}

⚠️ CRITICAL URL SELECTION RULES:

**HOW TO ANALYZE URL RELEVANCE:**

For EACH URL in the search results, ask yourself:

1. **Domain-Topic Match:**
   - Does the domain name relate to the task topic?
   - Extract key topics from task (e.g., "cricket academies" → topics: cricket, academies, sports training)
   - Check if domain contains or specializes in these topics
   - ❌ REJECT if domain is about a DIFFERENT unrelated topic
   - ✅ ACCEPT if domain is specialized in the relevant field

2. **Snippet-Task Match:**
   - Does the snippet mention keywords from the task?
   - Does the snippet context match what we're looking for?
   - ❌ REJECT if snippet talks about unrelated things
   - ✅ ACCEPT if snippet clearly discusses the task topic

3. **URL Path Analysis:**
   - Does the URL path indicate relevant content?
   - Example: /rankings, /top-10, /best-of, /academy-list are good signals
   - ❌ REJECT generic paths like /home, /about, /index
   - ✅ ACCEPT specific paths that match task intent

4. **Authority & Credibility:**
   - Is this a reputable source for this topic?
   - Official organizations, news sites, industry leaders = good
   - Random blogs, spam sites, unrelated sites = bad

**GENERAL ANALYSIS FRAMEWORK:**

Task keywords: [Extract from "${taskDescription}"]
For each URL, check:
- Domain topic ∈ Task keywords? 
- Snippet mentions task keywords?
- URL path relevant to task?
- Source credible for this topic?

If 2+ checks pass → ✅ RELEVANT URL
If 0-1 checks pass → ❌ IRRELEVANT URL (skip it)

**ONLY use URLs from the search results list above - NEVER invent URLs!**
**Visit 2-3 DIFFERENT relevant sources for comprehensive research**
` : ''}

=== CONTINUOUS THINKING FRAMEWORK ===
Before deciding your next action, systematically think through:

**1. PROGRESS ASSESSMENT**
   - What concrete progress have I made?
   - Did my last action succeed or fail?
   - Am I moving closer to completing the task?

**2. LOOP DETECTION (CRITICAL)**
   - Look at my last 2-3 steps in the history
   - Am I doing the same action repeatedly?
   - If YES → STOP! Change strategy immediately

**3. FAILURE ANALYSIS**
   - Did my last action show ❌ FAILED?
   - Why did it fail? (check error message)
   - What should I try instead?
   
   Common failures:
   - "EMPTY/FAILED" extraction → Navigate to different URL
   - Navigation error → Try different domain/URL
   - Search returned nothing → Rephrase query

**4. DATA QUALITY CHECK**
   - Do I have ✅ SUCCESS data (not ❌ EMPTY)?
   - Is the data from MULTIPLE sources (2-3 minimum for research tasks)?
   - Is the data comprehensive enough to fully answer the task?
   - What specific information am I still missing?
   
   QUALITY CRITERIA:
   - Research tasks need data from at least 2-3 different reputable sources
   - Comparison tasks need data from each item being compared
   - Single-item lookups can complete after 1 source with good data
   - Always cross-verify important information from multiple sources

**5. NEXT STEP LOGIC - FOLLOW EXACTLY**
   
   CRITICAL WORKFLOW FOR MULTI-SOURCE TASKS:
   
   🚀 ULTRA-FAST WORKFLOW (⚡ RECOMMENDED - Like Perplexity):
   Step 1: 'search' → Google search ONCE to find sources
   Step 2: 'urlsToMarkdown' → Convert ALL 10-12 URLs to markdown in parallel
   Step 3: 'complete' → Summarize all markdown data
   
   ⚡ Total: 3 steps to gather data from 10+ sources! 10x faster than opening tabs!
   
   🎯 ALTERNATIVE WORKFLOW (Fast but uses more tabs):
   Step 1: 'search' → Google search ONCE to find sources
   Step 2: 'batchOpen' → Open ALL 10-12 search result URLs at once
   Step 3: 'batchExtract' → Extract data from ALL tabs simultaneously
   Step 4: 'complete' → Compile and summarize all collected data
   
   📝 OLD SLOW WAY (Don't use unless specific URL needed):
   Step 1: 'search' → Find sources  
   Step 2: 'navigate' → Go to first source URL
   Step 3: 'extract' → Get data
   Step 4: 'navigate' → Go to second source (not search again!)
   Step 5: 'extract' → Get data
   ... repeat 10 times = SLOW! ❌
   
           DECISION TREE:
           - 🆕 Steps = 0 → Use 'search' ONCE
           - 🔍 Just searched → Use 'urlsToMarkdown' for ULTRA-FAST research (BEST!)
           - 🔍 Just searched (alternative) → Use 'batchOpen' to open all search result URLs
           - 📂 Just opened multiple tabs → Use 'batchExtract' to extract from all
           - 📄 Have markdown data → Use 'complete' to summarize (STOP HERE!)
           - 📊 Have batch extracted data → Use 'complete' to summarize (STOP HERE!)
           - 🌐 Single URL needed → Use 'navigate' + 'extract'
           - ❌ Extraction failed → Try 'urlsToMarkdown' for more sources
           
           🚫 CRITICAL: If you already have markdown_data or batch_extraction_results, 
           DO NOT repeat urlsToMarkdown or batchOpen - go directly to 'complete'!
           
           MEMORY CHECK:
           - If memory has 'markdown_data' → Use 'complete' (summarize)
           - If memory has 'batch_extraction_results' → Use 'complete' (summarize)
           - If memory has 'search_results' but no markdown → Use 'urlsToMarkdown'
           - If no data at all → Use 'search' first
           
           CURRENT MEMORY STATUS:
           Available data: ${Object.keys(extractedData).join(', ')}
           
           ⚠️ CRITICAL LOOP PREVENTION:
           - If you see 'markdown_data' in memory → Use 'complete' (DO NOT use urlsToMarkdown again!)
           - If you see 'batch_extraction_results' in memory → Use 'complete' (DO NOT use batchOpen again!)
           - If you see 'search_results' but NO markdown_data → Use 'urlsToMarkdown' (first time only!)
           - If you see 'search_results' but NO batch_extraction_results → Use 'batchOpen' (first time only!)
           
           🚫 NEVER repeat the same data collection action twice!
           
           EXAMPLE SCENARIOS:
           ✅ GOOD: Memory has ['search_results', 'markdown_data'] → Use 'complete'
           ✅ GOOD: Memory has ['search_results', 'batch_extraction_results'] → Use 'complete'
           ✅ GOOD: Memory has ['search_results'] only → Use 'urlsToMarkdown' (first time)
           ❌ BAD: Memory has ['search_results', 'markdown_data'] → Use 'urlsToMarkdown' (LOOP!)
           ❌ BAD: Memory has ['search_results', 'batch_extraction_results'] → Use 'batchOpen' (LOOP!)
   
   🚫 NEVER use 'search' more than ONCE in a task
   🚫 NEVER visit URLs one by one for research - use batch operations!
   🚫 For research tasks: ALWAYS prefer urlsToMarkdown (fastest!)

=== AVAILABLE ACTIONS & USAGE ===

**1. search** - Search Google for information
   When: ONLY at the very beginning of a task (use ONCE per task)
   Format: {"action": "search", "target": "YOUR_ACTUAL_SEARCH_TERMS", "parameters": {}}
   Example: {"action": "search", "target": "top 10 universities 2024 rankings"}
   ⚠️ CRITICAL: Put ACTUAL search terms in target, NOT the words "search query"!
   ⚠️ Use search ONLY ONCE - after that, use 'navigate' to visit specific URLs

**2. navigate** - Go to specific URL
   When: Have a URL to visit, want to see specific page
   Format: {"action": "navigate", "target": "https://example.com", "parameters": {}}
   Example: {"action": "navigate", "target": "https://www.usnews.com/rankings"}

**3. extract** - Extract data from current page
   When: On a page with useful data, need to collect information
   Format: {"action": "extract", "parameters": {"what": "data type"}}
   Example: {"action": "extract", "parameters": {"what": "university rankings"}}

**4. click** - Click element on page
   When: Need to interact with button, link, accept cookies, etc.
   Format: {"action": "click", "target": "element description", "parameters": {}}
   Example: {"action": "click", "target": "Accept cookies button"}

**5. type** - Type text into input field
   When: Need to fill search box or form field
   Format: {"action": "type", "target": "field description", "parameters": {"text": "value"}}
   Example: {"action": "type", "target": "search box", "parameters": {"text": "universities"}}

**6. fillForm** - Fill multiple form fields
   When: Need to submit form with multiple inputs
   Format: {"action": "fillForm", "parameters": {"formData": {"field": "value"}}}
   Example: {"action": "fillForm", "parameters": {"formData": {"name": "John", "email": "test@test.com"}}}

**7. scroll** - Scroll page
   When: Content below fold, need to load more, see additional items
   Format: {"action": "scroll", "parameters": {"direction": "down|up|top|bottom"}}
   Example: {"action": "scroll", "parameters": {"direction": "down"}}

**8. wait** - Wait for content to load
   When: Page loading, dynamic content needs time to appear
   Format: {"action": "wait", "parameters": {"time": 2000}}
   Example: {"action": "wait", "parameters": {"time": 3000}}

**9. urlsToMarkdown** - Convert URLs to markdown instantly (⚡ ULTRA-FAST - BEST CHOICE!)
   When: Have search results, want to extract all data FAST without opening tabs (RECOMMENDED!)
   Format: {"action": "urlsToMarkdown", "parameters": {"limit": 10}}
   Example: {"action": "urlsToMarkdown", "parameters": {"limit": 10}}
   ⚠️ Converts top 10-12 URLs to markdown in parallel - 10x faster than opening tabs!
   ⚠️ THIS IS THE BEST METHOD FOR RESEARCH TASKS!

**10. batchOpen** - Open multiple URLs at once (10-12 tabs)
   When: Have search results, want to visit all sources simultaneously (ALTERNATIVE method)
   Format: {"action": "batchOpen", "parameters": {"limit": 10}}
   Example: {"action": "batchOpen", "parameters": {"limit": 10}}
   ⚠️ This opens top 10-12 search results in parallel - slower than urlsToMarkdown

**11. batchExtract** - Extract from all open tabs in parallel
   When: Have multiple tabs open, want to extract data from all simultaneously
   Format: {"action": "batchExtract", "parameters": {"what": "data type"}}
   Example: {"action": "batchExtract", "parameters": {"what": "main content"}}
   ⚠️ This extracts from ALL tabs at once - only use after batchOpen!

**12. analyzeURLs** - AI analyzes search results and picks best URLs
   When: Have extracted search results, want smart URL selection (optional, usually skip this)
   Format: {"action": "analyzeURLs", "parameters": {}}
   Example: {"action": "analyzeURLs"}

**13. complete** - Finish task and compile results
   When: Have collected sufficient quality data to answer the task
   Format: {"action": "complete", "parameters": {}}
   Example: {"action": "complete", "description": "Collected all required data"}

=== CRITICAL ANTI-LOOP RULES ===

🚫 NEVER use 'search' action more than ONCE per task
🚫 NEVER repeat the same action type twice in a row
🚫 NEVER extract from the same page/tab multiple times
🚫 NEVER search after you already have extracted data
🚫 IF last 2 steps are both 'search' → YOU ARE IN A LOOP! Use 'navigate' instead
🚫 IF last step shows ❌ FAILED → DO NOT retry same action, try different approach
🚫 IF I see "EMPTY/FAILED" in data → DO NOT extract again, navigate elsewhere
🚫 IF on step 3+ with no ✅ SUCCESS data → Change strategy completely

REMEMBER: After first search, use ONLY 'navigate' and 'extract' to visit multiple sources!

=== YOUR DECISION PROCESS ===

**Step 1: Analyze Current State**
- What was my last action? ${completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].action : 'none (just started)'}
- Did it succeed? ${completedSteps.length > 0 ? (completedSteps[completedSteps.length - 1].success === false ? 'NO ❌' : 'YES ✅') : 'N/A'}
- Am I in a loop? (Check if last 2 actions are identical)
- How many times have I searched? ${completedSteps.filter(s => s.action === 'search').length}
- ⚠️ IF I've searched ${completedSteps.filter(s => s.action === 'search').length > 0 ? 'already' : 'never'} → ${completedSteps.filter(s => s.action === 'search').length > 0 ? 'DO NOT search again! Use navigate instead' : 'Can search once now'}

**Step 2: Determine Next Action**
- Based on my situation, what's the logical next step?
- Will this move me forward or am I repeating myself?
- Does this action make sense given where I am (URL, data collected)?

COMMON MISTAKES TO AVOID:
❌ BAD: {"action": "search", "target": "search query"} → This is a PLACEHOLDER, not real!
✅ GOOD: {"action": "search", "target": "top universities 2024"}

❌ BAD: Using navigate + extract one URL at a time (slow!)
✅ GOOD: Use urlsToMarkdown to process all URLs at once (ULTRA-FAST!)

❌ BAD: After search → navigate → extract → navigate → extract (repeating)
✅ GOOD: After search → urlsToMarkdown → complete (ULTRA-FAST - only 3 steps!)

❌ BAD: After search → batchOpen → batchExtract → complete (slower)
✅ BEST: After search → urlsToMarkdown → complete (10x faster!)

❌ BAD: Visiting 10 websites one by one (takes forever)
✅ GOOD: Convert all 10 URLs to markdown instantly with urlsToMarkdown!

**Step 3: Format Decision as JSON**

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "thinking": "My reasoning: what I'm doing and why, considering my progress and avoiding loops",
  "action": "search|navigate|extract|urlsToMarkdown|batchOpen|batchExtract|click|type|fillForm|scroll|wait|analyzeURLs|complete",
  "target": "URL, query, element description, or empty",
  "parameters": {},
  "description": "Clear description of what this step accomplishes"
}

💡 REMEMBER: For research tasks, use the ULTRA-FAST path: search → urlsToMarkdown → complete!`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      // Parse JSON response
      const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const decision = JSON.parse(cleanResponse);
      return decision;
      
    } catch (error) {
      console.error('❌ AI decision failed:', error);
      
      // Fallback: if we have no data, search
      if (this.memory.getStepsHistory().length === 0) {
        return {
          action: 'search',
          target: taskDescription,
          description: 'Starting with Google search',
          reasoning: 'First step - need to find information sources'
        };
      } else {
        // Otherwise, complete the task
        return {
          action: 'complete',
          description: 'Completing task',
          reasoning: 'Moving to summarization'
        };
      }
    }
  }

  /**
   * AI decides how to handle an error
   */
  async decideAfterError(taskDescription, errorMessage) {
    try {
      const session = await LanguageModel.create({ 
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const prompt = `Task: ${taskDescription}

Error occurred: ${errorMessage}

Should I:
1. "retry" - Try the same action again
2. "skip" - Skip this step and continue
3. "abort" - Give up on the task

Return JSON: {"action": "retry|skip|abort", "reasoning": "why"}`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanResponse);
      
    } catch (error) {
      // Default: skip and continue
      return { action: 'skip', reasoning: 'Error in error handler, skipping' };
    }
  }

  /**
   * AI analyzes search results and decides which URLs to visit
   */
  async analyzeSearchResults(searchResults, taskDescription) {
    try {
      
      const session = await LanguageModel.create({
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      // Format search results for AI
      const resultsPreview = searchResults.slice(0, 20).map((result, i) => {
        return `${i + 1}. URL: ${result.url}
   Domain: ${result.domain}
   Title: ${result.title || 'N/A'}
   Snippet: ${result.snippet ? result.snippet.substring(0, 150) : 'N/A'}`;
      }).join('\n\n');
      
      const prompt = `Task: ${taskDescription}

You have ${searchResults.length} search results. Here are the top 20:

${resultsPreview}

Analyze these URLs and decide your strategy:

1. Look at domain names - which are most authoritative/relevant?
2. Check titles and snippets - which have the best information?
3. Consider URL structure - does it indicate quality content?

Decision Options:
A) "one-by-one" - Visit and analyze each URL individually (safer, can stop early)
B) "multiple" - Visit several URLs upfront, then analyze all (faster)

Return JSON:
{
  "strategy": "one-by-one" or "multiple",
  "urls": ["url1", "url2", ...],
  "reasoning": "Why these URLs and why this strategy"
}

Choose 2-4 most relevant URLs. Order by priority (best first).`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const decision = JSON.parse(cleanResponse);
      return decision;
      
    } catch (error) {
      console.error('❌ AI URL analysis failed:', error);
      
      // Fallback: Pick top 2 URLs based on domain quality
      const goodDomains = searchResults.filter(r => 
        r && r.domain && r.url &&  // ✅ Check properties exist
        !r.domain.includes('wikipedia') && 
        !r.domain.includes('google.com')
      ).slice(0, 2);
      
      return {
        strategy: 'one-by-one',
        urls: goodDomains.map(r => r.url),
        reasoning: `Fallback: Selected ${goodDomains.length} non-Wikipedia results`
      };
    }
  }

  /**
   * AI quickly verifies if extracted data is useful
   */
  async quickCheckExtractedData(data, taskDescription) {
    try {
      
      const session = await LanguageModel.create({
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      // Format data preview
      let dataPreview = '';
      if (Array.isArray(data)) {
        dataPreview = `Array with ${data.length} items. First 3:\n`;
        data.slice(0, 3).forEach((item, i) => {
          if (typeof item === 'object') {
            dataPreview += `${i + 1}. ${JSON.stringify(item).substring(0, 200)}\n`;
          } else {
            dataPreview += `${i + 1}. ${item}\n`;
          }
        });
      } else if (typeof data === 'object') {
        dataPreview = `Object with keys: ${Object.keys(data).join(', ')}\n`;
        dataPreview += JSON.stringify(data).substring(0, 500);
      } else {
        dataPreview = String(data).substring(0, 500);
      }
      
      const prompt = `Task: ${taskDescription}

Just extracted this data:
${dataPreview}

Quick assessment:
1. Is this data relevant to the task?
2. Is there enough detail/quality?
3. Should I continue or need more?

Return JSON:
{
  "quality": "useful" | "not-useful" | "partial",
  "needMore": true | false,
  "reasoning": "Brief explanation"
}`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const assessment = JSON.parse(cleanResponse);
      return assessment;
      
    } catch (error) {
      console.error('❌ AI data assessment failed:', error);
      
      // Fallback: assume useful if we got data
      const hasData = (Array.isArray(data) && data.length > 0) || 
                      (typeof data === 'object' && Object.keys(data).length > 0);
      
      return {
        quality: hasData ? 'useful' : 'not-useful',
        needMore: false,
        reasoning: 'Fallback assessment - data exists'
      };
    }
  }

  /**
   * AI decides if data needs Summarizer API
   */
  async shouldSummarizeData(extractedData) {
    try {
      // Calculate total text length
      let totalTextLength = 0;
      let sourceCount = 0;
      
      for (const [key, data] of Object.entries(extractedData)) {
        sourceCount++;
        const dataStr = JSON.stringify(data);
        totalTextLength += dataStr.length;
      }
      
      // Decision logic
      const needsSummarization = totalTextLength > 5000 || sourceCount > 2;
      
      return needsSummarization;
      
    } catch (error) {
      console.error('❌ Failed to assess data volume:', error);
      return false; // Default: don't use Summarizer on error
    }
  }

  /**
   * AI compiles final summary from collected data
   */
  async compileFinalResultWithAI(taskDescription) {
    try {
      const extractedData = this.memory.getAllExtractedData();
      const steps = this.memory.getStepsHistory();
      
      // Validate extracted data quality
      const validation = this.validateExtractedData(extractedData);
      
      // Generate task-specific prompt and data context
      const { taskSpecificPrompt, dataContext } = await this.prepareTaskSpecificSummary(taskDescription, extractedData);
      
      let summary = '';
      
      if (validation.score < 2) {
        console.warn('⚠️ Low quality data detected, using stricter prompts');
        // Use more aggressive data extraction with lower temperature
        const session = await LanguageModel.create({ 
          temperature: 0.2, // Lower temperature for more focused extraction
          topK: 10,
          outputLanguage: 'en'
        });
        
        const strictPrompt = `${taskSpecificPrompt}

WARNING: Previous extraction was too generic. Re-extract with focus on:
- Specific names, numbers, and details
- NO generic descriptions like "this website contains"
- ONLY actual data points and facts

DATA TO RE-EXTRACT:
${dataContext}

Return structured data with actual facts and figures:`;
        
        summary = await session.prompt(strictPrompt);
        await session.destroy();
      } else {
        // Normal processing for good quality data
        const needsSummarizer = await this.shouldSummarizeData(extractedData);
        
        if (needsSummarizer) {
          
          // Get AI Manager
          const aiManager = window.ChromeAIStudio?.aiManager;
          
          if (aiManager) {
            // Use task-specific prompt for summarization
            const textToSummarize = `${taskSpecificPrompt}\n\n${dataContext}`;
            
            // Enforce 6k budget - if over, compress data first
            if (textToSummarize.length > this.SUMMARIZER_INPUT_BUDGET) {
              console.warn(`⚠️ Input too large for Summarizer (${textToSummarize.length} chars), compressing to ${this.SUMMARIZER_INPUT_BUDGET}`);
              
              // Compress data to top items only
              const compressedData = await this.compressDataToTopItems(dataContext, this.TOP_K_ITEMS);
              const compressedText = `${taskSpecificPrompt}\n\n${compressedData}`;
              const finalText = this.enforceCharBudget(compressedText, this.SUMMARIZER_INPUT_BUDGET);
              
              if (finalText.length > this.SUMMARIZER_INPUT_BUDGET) {
                console.warn(`⚠️ Still too large after compression, using LanguageModel instead`);
                summary = await this.compileSummaryWithLanguageModel(taskDescription, compressedData, steps, taskSpecificPrompt);
              } else {
                // Use Summarizer API with compressed data
                const summarizerResult = await aiManager.summarize(finalText, {
                  type: 'key-points',
                  format: 'markdown',
                  length: 'long'
                });
                
                if (summarizerResult.success) {
                  summary = summarizerResult.result;
                } else {
                  console.warn('⚠️ Summarizer failed, falling back to LanguageModel');
                  summary = await this.compileSummaryWithLanguageModel(taskDescription, compressedData, steps, taskSpecificPrompt);
                }
              }
            } else {
              // Use Summarizer API with optimal configuration for comprehensive summary
              const summarizerResult = await aiManager.summarize(textToSummarize, {
                type: 'key-points',
                format: 'markdown',
                length: 'long'
              });
              
              if (summarizerResult.success) {
                summary = summarizerResult.result;
              } else {
                console.warn('⚠️ Summarizer failed, falling back to LanguageModel');
                // Fallback to LanguageModel
                summary = await this.compileSummaryWithLanguageModel(taskDescription, dataContext, steps, taskSpecificPrompt);
              }
            }
          } else {
            console.warn('⚠️ AI Manager not available, using LanguageModel');
            summary = await this.compileSummaryWithLanguageModel(taskDescription, dataContext, steps, taskSpecificPrompt);
          }
        } else {
          summary = await this.compileSummaryWithLanguageModel(taskDescription, dataContext, steps, taskSpecificPrompt);
        }
      }
      // Post-process: sanitize summary and re-summarize if it looks like raw link-heavy content
      let finalOut = this.sanitizeSummary(summary).trim();
      const linkMatches = (finalOut.match(/https?:\/\//g) || []).length;
      const mdLinkMatches = (finalOut.match(/\]\(https?:\/\//g) || []).length;
      const totalLen = finalOut.length || 1;
      const linkRatio = (linkMatches + mdLinkMatches) / Math.max(1, totalLen / 500); // heuristic: many links per 500 chars
      if (linkRatio > 4) {
        // Too many links → likely raw markdown dump. Re-summarize with LanguageModel using chunked summaries if available
        const { taskSpecificPrompt, dataContext } = await this.prepareTaskSpecificSummary(taskDescription, {
          chunked_summaries: extractedData.chunked_summaries || [],
          markdown_data: extractedData.markdown_data || []
        });
        const reSummary = await this.compileSummaryWithLanguageModel(taskDescription, dataContext, steps, taskSpecificPrompt);
        finalOut = this.sanitizeSummary(reSummary).trim();
      }
      return finalOut;
      
    } catch (error) {
      console.error('❌ AI summary failed:', error);
      
      // Enhanced fallback: Create a basic summary from the collected data
      return await this.createFallbackSummary(taskDescription);
    }
  }

  /**
   * Prepare task-specific prompt and data context
   */
  async prepareTaskSpecificSummary(taskDescription, extractedData) {
    // Analyze task type and generate specific prompt
    const taskType = this.analyzeTaskType(taskDescription);
    const taskSpecificPrompt = this.generateTaskSpecificPrompt(taskDescription, taskType);
    
    // Format data context based on task type
    const dataContext = this.formatDataContextForTask(extractedData, taskType);
    
    return { taskSpecificPrompt, dataContext };
  }

  /**
   * Analyze the type of task to provide better summarization
   */
  analyzeTaskType(taskDescription) {
    const task = taskDescription.toLowerCase();
    
    if (task.includes('top 10') || task.includes('best 10') || task.includes('top universities') || task.includes('rankings')) {
      return 'research_list';
    } else if (task.includes('compare') || task.includes('vs') || task.includes('difference')) {
      return 'comparison';
    } else if (task.includes('research') || task.includes('find') || task.includes('information about')) {
      return 'research_comprehensive';
    } else if (task.includes('list') || task.includes('names') || task.includes('what are')) {
      return 'list_generation';
    } else {
      return 'general';
    }
  }

  /**
   * Generate task-specific prompt based on task type
   */
  generateTaskSpecificPrompt(taskDescription, taskType) {
    const basePrompt = `TASK: ${taskDescription}

CRITICAL INSTRUCTIONS:
1. Extract ONLY the TOP ${this.TOP_K_ITEMS} most relevant entities/items for the task
2. Prefer entries with strong quantitative evidence (numbers, ranks, dates, counts)
3. Include source label for each item
4. Exclude generic text and descriptions
5. If >${this.TOP_K_ITEMS} candidates appear, rank and keep the best ${this.TOP_K_ITEMS}

DATA EXTRACTION RULES (TASK-AGNOSTIC):
- Extract proper nouns (names of entities, places, people, organizations, products, etc.)
- Find numerical data (rankings, scores, prices, percentages, measurements, dates, counts)
- Capture location information (addresses, cities, countries, regions)
- Extract specific attributes (features, specifications, characteristics, requirements)
- Find comparative data (ratings, reviews, comparisons, advantages/disadvantages)
- Capture contextual details (availability, contact info, operating hours, conditions)

OUTPUT FORMAT:
Each entry MUST have actual extracted data, not descriptions:
1. **[Actual Name/Title from Data]** - [Key Metric if available]
   - [Attribute 1]: [Actual Value/Detail from data]
   - [Attribute 2]: [Actual Value/Detail from data]
   - [Attribute 3]: [Actual Value/Detail from data]
   - Source: [Source Name]

EXAMPLES OF GOOD EXTRACTION:
- "Tesla Model 3 - Price: $40,000, Range: 358 miles, 0-60mph: 3.1s, Source: CarReview.com"
- "Pizza Hut Downtown - Address: 123 Main St, Hours: 11am-11pm, Rating: 4.5/5, Source: LocalGuide"
- "Python 3.11 - Release: Oct 2022, Speed: 25% faster, New Features: Exception Groups, Source: Python.org"

EXAMPLES OF BAD EXTRACTION (DO NOT DO THIS):
- "This website discusses various car models" ❌
- "Information about restaurants is provided" ❌
- "The source contains programming language details" ❌`;

    switch (taskType) {
      case 'research_list':
        return `${basePrompt}

SPECIFIC REQUIREMENTS FOR RESEARCH LISTS:
1. Extract the TOP ${this.TOP_K_ITEMS} most relevant entities with their specific details
2. Include numerical data (rankings, scores, prices, percentages, measurements)
3. Capture location information (addresses, cities, countries, regions)
4. Extract specific attributes (features, specifications, characteristics, requirements)
5. Find comparative data (ratings, reviews, comparisons, advantages/disadvantages)
6. Format as structured lists with actual data points
7. DO NOT write "the sources mention" or "websites contain"
8. ONLY present extracted facts and figures

OUTPUT STRUCTURE:
# [Topic]

## Summary
[2-3 sentences about what was found]

## Top ${this.TOP_K_ITEMS} Findings

1. **[Name]** - [Key Metric]
   - Detail 1: [Actual Data]
   - Detail 2: [Actual Data]
   - Detail 3: [Actual Data]
   - Source: [Source Name]

2. **[Name]** - [Key Metric]
   - Detail 1: [Actual Data]
   - Detail 2: [Actual Data]
   - Source: [Source Name]

[Continue for top ${this.TOP_K_ITEMS} items only]

## Key Statistics
- [Stat 1]: [Number]
- [Stat 2]: [Number]`;

      case 'comparison':
        return `${basePrompt}

CRITICAL REQUIREMENTS FOR COMPARISONS:
1. Compare items side-by-side with specific details
2. Highlight key differences and similarities
3. Include specific metrics, rankings, or data points
4. Use actual information from the collected data
5. Format as a clear comparison table or structured comparison

EXPECTED OUTPUT FORMAT:
# Comparison: [Items Being Compared]

## Key Differences
- **Item 1:** [Specific details from data]
- **Item 2:** [Specific details from data]

## Detailed Comparison
[Structured comparison with specific data points]`;

      case 'research_comprehensive':
        return `${basePrompt}

CRITICAL REQUIREMENTS FOR COMPREHENSIVE RESEARCH:
1. Provide detailed information about the topic
2. Include all relevant facts, statistics, and details found
3. Organize information logically with clear sections
4. Use specific data from sources, not generic statements
5. Include key insights, trends, and important findings

EXPECTED OUTPUT FORMAT:
# [Topic] - Comprehensive Research Results

## Key Findings
[Detailed findings with specific data]

## Important Details
[Specific information organized by relevance]

## Additional Information
[Any other relevant details from the data]`;

      case 'list_generation':
        return `${basePrompt}

CRITICAL REQUIREMENTS FOR LISTS:
1. Create a comprehensive list of all items found
2. Include specific details for each item
3. Use actual names and information from the data
4. Organize logically (alphabetically, by ranking, or by relevance)
5. Include any additional context or details available

EXPECTED OUTPUT FORMAT:
# [Topic] - Complete List

## [Category/Type] Items
1. [Name] - [Key details]
2. [Name] - [Key details]
[Continue for all items]`;

      default:
        return `${basePrompt}

CRITICAL REQUIREMENTS:
1. Answer the task completely using the data collected
2. Be comprehensive and include all relevant details
3. Use actual information from the data, not generic statements
4. Format clearly with proper structure
5. Include specific facts, numbers, and details found in the data

EXPECTED OUTPUT:
# [Topic] - Research Results

[Comprehensive answer using all available data]`;
    }
  }

  /**
   * Format data context based on task type
   */
  formatDataContextForTask(extractedData, taskType) {
    let dataContext = '\n\nCOLLECTED DATA:\n';
    
    // Prioritize chunked summaries if available
    if (extractedData.chunked_summaries && extractedData.chunked_summaries.length > 0) {
      
      dataContext += `\n=== CHUNKED SUMMARIES (${extractedData.chunked_summaries.length} summaries) ===\n`;
      
      extractedData.chunked_summaries.forEach((chunk, index) => {
        dataContext += `\n--- Chunk ${chunk.chunkIndex}/${chunk.totalChunks} from ${chunk.source} ---\n`;
        dataContext += `URL: ${chunk.url}\n`;
        dataContext += `Summary: ${chunk.summary}\n`;
      });
    }
    // Fallback to markdown data if no chunked summaries
    else if (extractedData.markdown_data && extractedData.markdown_data.length > 0) {
      
      dataContext += `\n=== MARKDOWN SOURCES (${extractedData.markdown_data.length} sources) ===\n`;
      
      extractedData.markdown_data.forEach((result, index) => {
        dataContext += `\n--- Source ${index + 1}: ${result.title || 'Untitled'} ---\n`;
        dataContext += `URL: ${result.url}\n`;
        
        if (result.markdown) {
          // For research tasks, include more content but limit to prevent size issues
          const maxLength = taskType === 'research_list' ? 6000 : 4000; // Optimized for 6000 token limit
          if (result.markdown.length > maxLength) {
            dataContext += result.markdown.slice(0, maxLength) + '\n\n[... content truncated ...]\n';
          } else {
            dataContext += result.markdown + '\n';
          }
        }
      });
    }
    
    // Include other data sources
      for (const [key, dataObj] of Object.entries(extractedData)) {
      if (key === 'markdown_data') continue; // Already processed
        
      const data = dataObj.data || dataObj;
        dataContext += `\n\n=== ${key.toUpperCase().replace(/_/g, ' ')} ===\n`;
        
        if (Array.isArray(data) && data.length > 0) {
          dataContext += `Found ${data.length} items:\n`;
        data.slice(0, 20).forEach((item, i) => {
            if (typeof item === 'object') {
              const fields = [];
              if (item.title) fields.push(`Title: ${item.title}`);
              if (item.name) fields.push(`Name: ${item.name}`);
              if (item.rank || item.ranking) fields.push(`Rank: ${item.rank || item.ranking}`);
              if (item.score) fields.push(`Score: ${item.score}`);
              if (item.location) fields.push(`Location: ${item.location}`);
            if (item.description) fields.push(`Description: ${item.description.substring(0, 200)}`);
              if (item.domain) fields.push(`Source: ${item.domain}`);
              if (item.url) fields.push(`URL: ${item.url}`);
              
              if (fields.length > 0) {
                dataContext += `\n${i + 1}. ${fields.join(' | ')}\n`;
              } else {
              dataContext += `${i + 1}. ${JSON.stringify(item).slice(0, 200)}\n`;
              }
            } else {
              dataContext += `${i + 1}. ${item}\n`;
            }
          });
        if (data.length > 20) {
          dataContext += `\n... and ${data.length - 20} more items\n`;
          }
        } else if (typeof data === 'object' && data !== null) {
          if (data.mainText && Array.isArray(data.mainText)) {
          dataContext += `Main content:\n${data.mainText.slice(0, 10).join('\n\n')}\n`;
          }
          if (data.headings && Array.isArray(data.headings)) {
          dataContext += `\nKey headings: ${data.headings.slice(0, 15).map(h => h.text).join(', ')}\n`;
        }
        if (data.title) dataContext += `Page: ${data.title}\n`;
        if (data.url) dataContext += `Source URL: ${data.url}\n`;
      } else {
        dataContext += `${data}\n`;
      }
    }
    
    return dataContext;
  }

  /**
   * Create chunked summaries from markdown data with hierarchical processing
   */
  async createChunkedSummaries(markdownResults) {
    
    const chunkedSummaries = [];
    const CHUNK_SIZE = 8000; // Larger chunks for speed
    const MAX_CHUNKS_PER_SOURCE = 3; // Limit to 3 chunks max per source for speed
    
    // Calculate total expected chunks
    let totalExpectedChunks = 0;
    for (const result of markdownResults) {
      if (result.markdown) {
        const content = result.markdown;
        if (content.length > 20000) {
          totalExpectedChunks += 1; // Fast summary
        } else {
          const chunks = this.createContentChunks(content, CHUNK_SIZE);
          totalExpectedChunks += Math.min(chunks.length, MAX_CHUNKS_PER_SOURCE);
        }
      }
    }
    let processedChunks = 0;
    
    for (const result of markdownResults) {
      if (!result.markdown) continue;
      
      const content = result.markdown;
      const totalLength = content.length;
      
      // For very large content (>20k chars), use fast summarization
      if (totalLength > 30000) {
        processedChunks++;
        
        const fastSummary = await this.createFastSummary(content, result.title);
        
        if (fastSummary) {
          chunkedSummaries.push({
            source: result.title,
            url: result.url,
            chunkIndex: 1,
            totalChunks: 1,
            summary: fastSummary,
            originalLength: totalLength,
            isFast: true
          });
        }
      } else {
        // For smaller content, use regular chunking
        const chunks = this.createContentChunks(content, CHUNK_SIZE);
        const limitedChunks = chunks.slice(0, MAX_CHUNKS_PER_SOURCE); // Limit chunks
        
        for (let i = 0; i < limitedChunks.length; i++) {
          const chunk = limitedChunks[i];
          processedChunks++;
          
          let chunkSummary = await this.summarizeChunk(chunk, result.title, i + 1, limitedChunks.length);
          
          // Retry once if chunk summarization failed
          if (!chunkSummary) {
            console.warn(`⚠️ Chunk ${i + 1} failed, retrying once...`);
            chunkSummary = await this.summarizeChunk(chunk, result.title, i + 1, limitedChunks.length);
          }
          
          if (chunkSummary) {
            chunkedSummaries.push({
              source: result.title,
              url: result.url,
              chunkIndex: i + 1,
              totalChunks: limitedChunks.length,
              summary: chunkSummary,
              originalLength: chunk.length
            });
          } else {
            console.warn(`⚠️ Chunk ${i + 1} failed after retry, skipping`);
          }
        }
      }
    }
    
    // Store chunked summaries in memory
    this.memory.storeExtractedData('chunked_summaries', chunkedSummaries);
    chunkedSummaries.forEach((summary, index) => {
    });
    
    return chunkedSummaries;
  }

  /**
   * Filter URLs for relevance using AI
   */
  async filterRelevantUrls(markdownResults, taskDescription) {
    try {
      
      // Create a summary of each URL's content for AI analysis
      const urlSummaries = markdownResults.map((result, index) => {
        const preview = result.markdown ? result.markdown.slice(0, 500) : '';
        return {
          index,
          url: result.url,
          title: result.title,
          preview: preview,
          length: result.markdown ? result.markdown.length : 0
        };
      });
      
      const prompt = `Analyze these URLs for relevance to the task: "${taskDescription}"

URLs to analyze:
${urlSummaries.map((item, i) => `${i + 1}. ${item.title} (${item.length} chars)
   URL: ${item.url}
   Preview: ${item.preview}...`).join('\n\n')}

Task: ${taskDescription}

Select the 3 MOST RELEVANT URLs that directly relate to the task. Consider:
- Direct relevance to the task topic
- Quality and depth of content
- Authoritative sources
- Avoid irrelevant pages (like individual profiles when researching institutions/organizations)
- Focus on comprehensive lists, guides, rankings, or detailed information about the topic

Respond with ONLY the numbers (e.g., "1,3,5,7") of the most relevant URLs:`;

      const session = await LanguageModel.create({ 
        temperature: 0.2,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const response = await session.prompt(prompt);
      await session.destroy();
      
      // Parse the response to get selected indices
      const selectedIndices = this.parseSelectedIndices(response);
      
      // Filter the results based on AI selection
      const filteredResults = selectedIndices.map(index => markdownResults[index]).filter(Boolean);
      
      // Hard limit to 3 URLs maximum
      const finalResults = filteredResults.slice(0, 3);
      finalResults.forEach((result, i) => {
      });
      
      return finalResults;
      
    } catch (error) {
      console.error('❌ URL filtering failed:', error);
      // Fallback: return first 3 URLs
      return markdownResults.slice(0, 3);
    }
  }

  /**
   * Parse AI response to get selected URL indices
   */
  parseSelectedIndices(response) {
    try {
      // Extract numbers from response
      const numbers = response.match(/\d+/g);
      if (!numbers) return [0, 1, 2]; // Fallback
      
      // Convert to indices (subtract 1 since AI uses 1-based numbering)
      const indices = numbers.map(n => parseInt(n) - 1).filter(i => i >= 0);
      
      // Limit to 3 URLs max
      return indices.slice(0, 3);
    } catch (error) {
      console.error('❌ Failed to parse selected indices:', error);
      return [0, 1, 2]; // Fallback
    }
  }

  /**
   * Create fast summary for very large content (single API call)
   */
  async createFastSummary(content, sourceTitle) {
    try {
      
      // Take first 12000 chars for key info (optimized for 6000 token limit)
      const startContent = content.slice(0, 12000);
      const endContent = content.slice(-2000);
      const keyContent = startContent + '\n\n[... middle content ...]\n\n' + endContent;
      
      const prompt = `Summarize this content from "${sourceTitle}" for the research task:

${keyContent}

IMPORTANT: Keep under 1000 characters. Focus on:
1. Key entities, organizations, or institutions mentioned
2. Rankings, scores, metrics, or important data
3. Notable features, programs, or characteristics
4. Locations, contact information, or practical details
5. Any specific details relevant to the research topic

Provide a concise summary:`;

      const session = await LanguageModel.create({ 
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const summary = await session.prompt(prompt);
      await session.destroy();
      
      const limitedSummary = summary.length > 1000 ? summary.substring(0, 997) + '...' : summary;
      return limitedSummary.trim();
      
    } catch (error) {
      console.error(`❌ Fast summary failed for ${sourceTitle}:`, error);
      return null;
    }
  }

  /**
   * Create hierarchical summary for very large content
   */
  async createHierarchicalSummary(content, sourceTitle, sourceUrl) {
    try {
      
      // Step 1: Create first-level chunks - OPTIMIZED for 6000 token limit
      const firstLevelChunks = this.createContentChunks(content, 6000); // Increased to use full token budget
      
      // Step 2: Summarize each first-level chunk
      const firstLevelSummaries = [];
      for (let i = 0; i < firstLevelChunks.length; i++) {
        const chunk = firstLevelChunks[i];
        const summary = await this.summarizeChunk(chunk, sourceTitle, i + 1, firstLevelChunks.length);
        if (summary) {
          firstLevelSummaries.push(summary);
        }
      }
      
      // Step 3: If we have too many first-level summaries, create second-level chunks
      if (firstLevelSummaries.length > 5) {
        
        const combinedSummaries = firstLevelSummaries.join('\n\n');
        const secondLevelChunks = this.createContentChunks(combinedSummaries, 6000); // Increased to use full token budget
        
        const secondLevelSummaries = [];
        for (let i = 0; i < secondLevelChunks.length; i++) {
          const chunk = secondLevelChunks[i];
          const summary = await this.summarizeChunk(chunk, `${sourceTitle} (Level 2)`, i + 1, secondLevelChunks.length);
          if (summary) {
            secondLevelSummaries.push(summary);
          }
        }
        
        // Step 4: Final summary of second-level summaries
        const finalSummary = await this.createFinalHierarchicalSummary(secondLevelSummaries, sourceTitle);
        return finalSummary;
      } else {
        // Step 3: Direct final summary of first-level summaries
        const finalSummary = await this.createFinalHierarchicalSummary(firstLevelSummaries, sourceTitle);
        return finalSummary;
      }
      
    } catch (error) {
      console.error(`❌ Hierarchical summarization failed for ${sourceTitle}:`, error);
      return null;
    }
  }

  /**
   * Create final summary from hierarchical summaries with 1000 character limit
   */
  async createFinalHierarchicalSummary(summaries, sourceTitle) {
    try {
      const combinedSummaries = summaries.join('\n\n');
      
      const prompt = `Create a comprehensive and detailed summary from these hierarchical summaries of "${sourceTitle}":

${combinedSummaries}

Focus on:
1. Key universities mentioned with rankings and NIRF positions
2. Important metrics, scores, fees, and accreditation details
3. Notable programs, courses, and specializations offered
4. Location information and regional presence
5. Admission processes, eligibility criteria, and application details
6. Placement statistics, average packages, and career outcomes
7. Unique features, advantages, and distinguishing factors
8. Any specific details about universities, their history, and achievements

Create a thorough, well-structured summary that provides comprehensive information for decision-making:`;

      const session = await LanguageModel.create({ 
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const finalSummary = await session.prompt(prompt);
      await session.destroy();
      
      // Allow longer summaries for comprehensive information
      const limitedSummary = finalSummary;
      
      return limitedSummary.trim();
      
    } catch (error) {
      console.error(`❌ Final hierarchical summary failed:`, error);
      return null;
    }
  }

  /**
   * Create content chunks of specified size
   */
  createContentChunks(content, chunkSize) {
    const chunks = [];
    let start = 0;
    
    while (start < content.length) {
      let end = start + chunkSize;
      
      // Try to break at sentence boundaries
      if (end < content.length) {
        const lastPeriod = content.lastIndexOf('.', end);
        const lastNewline = content.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.7) { // Only break if we don't lose too much content
          end = breakPoint + 1;
        }
      }
      
      chunks.push(content.slice(start, end).trim());
      start = end;
    }
    
    return chunks;
  }

  /**
   * Summarize a single chunk with 1000 character limit
   */
  async summarizeChunk(chunk, sourceTitle, chunkIndex, totalChunks) {
    try {
      
      const prompt = `Extract ONLY the TOP ${this.TOP_K_ITEMS} most relevant entities/items for the task. Prefer entries with strong quantitative evidence (numbers, ranks, dates, counts). Include source label. Exclude generic text.

CRITICAL: Return exactly ${this.TOP_K_ITEMS} items maximum. If >${this.TOP_K_ITEMS} candidates appear, rank and keep the best ${this.TOP_K_ITEMS}.

Content to analyze:
${chunk}

Format as structured bullet points with actual data:
- [Entity Name]: [Specific Details with Numbers] (Source: ${sourceTitle})
- [Entity Name]: [Specific Details with Numbers] (Source: ${sourceTitle})

DO NOT write "this section discusses" or "contains information about"
ONLY extract and present actual data points.`;

      const session = await LanguageModel.create({ 
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const summary = await session.prompt(prompt);
      await session.destroy();
      
      // Allow longer summaries for comprehensive information
      const limitedSummary = summary;
      
      return limitedSummary.trim();
      
    } catch (error) {
      console.error(`❌ Failed to summarize chunk ${chunkIndex}:`, error);
      return null;
    }
  }

  /**
   * Create a fallback summary when AI summarization fails
   */
  async createFallbackSummary(taskDescription) {
    try {
      const extractedData = this.memory.getAllExtractedData();
      const taskType = this.analyzeTaskType(taskDescription);
      
      let summary = `# ${taskDescription}\n\n`;
      
      // Extract key information from markdown data
      if (extractedData.markdown_data && extractedData.markdown_data.length > 0) {
        summary += `## Research Results\n\n`;
        summary += `Based on analysis of ${extractedData.markdown_data.length} sources:\n\n`;
        
        // Extract university rankings from the data
        const universities = [];
        extractedData.markdown_data.forEach((source, index) => {
          if (source.markdown) {
            // Look for ranking patterns in the markdown
            const rankingMatches = source.markdown.match(/(\d+)\.?\s*([^,\n]+?)(?:\s*-\s*([^,\n]+?))?(?:\s*\(([^)]+)\))?/g);
            if (rankingMatches) {
              rankingMatches.slice(0, 10).forEach(match => {
                const parts = match.match(/(\d+)\.?\s*([^,\n]+?)(?:\s*-\s*([^,\n]+?))?(?:\s*\(([^)]+)\))?/);
                if (parts && parts[2]) {
                  universities.push({
                    rank: parts[1],
                    name: parts[2].trim(),
                    location: parts[3] ? parts[3].trim() : '',
                    score: parts[4] ? parts[4].trim() : ''
                  });
                }
              });
            }
          }
        });
        
        // Remove duplicates and sort by rank
        const uniqueUniversities = universities.filter((uni, index, self) => 
          index === self.findIndex(u => u.name === uni.name)
        ).sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
        
        if (uniqueUniversities.length > 0) {
          summary += `### Top Universities in India:\n\n`;
          uniqueUniversities.slice(0, 10).forEach((uni, index) => {
            summary += `${index + 1}. **${uni.name}**`;
            if (uni.location) summary += ` - ${uni.location}`;
            if (uni.score) summary += ` (Score: ${uni.score})`;
            summary += `\n`;
          });
        } else {
          // Fallback: Extract from source titles and content
          summary += `### Key Findings:\n\n`;
          extractedData.markdown_data.slice(0, 5).forEach((source, index) => {
            summary += `${index + 1}. **${source.title}**\n`;
            summary += `   Source: ${source.url}\n`;
            if (source.markdown) {
              const preview = source.markdown.substring(0, 200).replace(/\n/g, ' ').trim();
              summary += `   Preview: ${preview}...\n`;
            }
            summary += `\n`;
          });
        }
      }
      
      // Add search results if available
      if (extractedData.search_results && extractedData.search_results.length > 0) {
        summary += `\n## Additional Sources\n\n`;
        extractedData.search_results.slice(0, 5).forEach((result, index) => {
          summary += `${index + 1}. [${result.title}](${result.url})\n`;
        });
      }
      
      summary += `\n---\n*Summary generated from ${Object.keys(extractedData).length} data sources*`;
      return summary;
      
    } catch (error) {
      console.error('❌ Fallback summary failed:', error);
      const dataKeys = Object.keys(this.memory.getAllExtractedData());
      return `# ${taskDescription}\n\nTask completed. Collected data from: ${dataKeys.join(', ')}`;
    }
  }

  /**
   * Helper: Compile summary using LanguageModel (fallback)
   */
  async compileSummaryWithLanguageModel(taskDescription, dataContext, steps, taskSpecificPrompt = null) {
    try {
      const session = await LanguageModel.create({ 
        temperature: 0.5,
        topK: 20,
        outputLanguage: 'en'
      });
      
      // Use task-specific prompt if available, otherwise use generic prompt
      const prompt = taskSpecificPrompt || `TASK: ${taskDescription}

You have collected data from multiple sources. Your job is to:

1. Extract ONLY the TOP ${this.TOP_K_ITEMS} most relevant entities/items for the task
2. Prefer entries with strong quantitative evidence (numbers, ranks, dates, counts)
3. Include source label for each item
4. Exclude generic text and descriptions
5. If >${this.TOP_K_ITEMS} candidates appear, rank and keep the best ${this.TOP_K_ITEMS}

COLLECTED DATA:
${this.enforceCharBudget(dataContext, this.SUMMARIZER_INPUT_BUDGET)}

STEPS TAKEN:
${steps.map(step => `- ${step}`).join('\n')}

CRITICAL RULES:
- Find and list ONLY the TOP ${this.TOP_K_ITEMS} entities with their specific details
- Include numerical data (rankings, scores, fees, percentages)
- Create structured lists/tables, not paragraphs
- Use actual names and numbers from the data
- DO NOT write "the sources mention" or "websites contain"
- ONLY present extracted facts and figures

OUTPUT STRUCTURE:
# [Topic]

## Summary
[2-3 sentences about what was found]

## Top ${this.TOP_K_ITEMS} Findings

1. **[Name]** - [Key Metric]
   - Detail 1: [Actual Data]
   - Detail 2: [Actual Data]
   - Detail 3: [Actual Data]
   - Source: [Source Name]

2. **[Name]** - [Key Metric]
   - Detail 1: [Actual Data]
   - Detail 2: [Actual Data]
   - Source: [Source Name]

[Continue for top ${this.TOP_K_ITEMS} items only]

## Key Statistics
- [Stat 1]: [Number]
- [Stat 2]: [Number]`;

      const fullPrompt = taskSpecificPrompt ? `${taskSpecificPrompt}\n\n${dataContext}` : prompt;
      const summary = await session.prompt(fullPrompt);
      await session.destroy();
      
      return summary.trim();
      
    } catch (error) {
      console.error('❌ LanguageModel summary failed:', error);
      
      // ✅ Ultra-safe fallback
      const dataKeys = Object.keys(this.memory.getAllExtractedData());
      return `Task: ${taskDescription}. Collected: ${dataKeys.join(', ') || 'No data'}`;
    }
  }

  /**
   * AI decides how to present final results
   */
  async decideFinalPresentation(summary, taskDescription) {
    try {
      
      const session = await LanguageModel.create({
        temperature: 0.3,
        topK: 20,
        outputLanguage: 'en'
      });
      
      const prompt = `Task: ${taskDescription}

Summary ready to present:
${summary.substring(0, 500)}

User's original request was: "${taskDescription}"

Decide how to present results:
1. "sidebar" - Show in sidebar (default for most tasks)
2. "google-docs" - Save to Google Docs (ONLY if user explicitly asked to save/create/document)
3. "both" - Show in sidebar AND save to docs

Did the user explicitly request saving to Google Docs/Sheets?
Look for keywords: "save", "create document", "save to docs", "make a document"

Return JSON:
{
  "method": "sidebar" | "google-docs" | "both",
  "reasoning": "Why this presentation method"
}`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const decision = JSON.parse(cleanResponse);
      return decision;
      
    } catch (error) {
      console.error('❌ Presentation decision failed:', error);
      
      // Fallback: always show in sidebar
      return {
        method: 'sidebar',
        reasoning: 'Fallback: default to sidebar presentation'
      };
    }
  }

  /**
   * Display results in sidebar using streaming message pattern
   */
  async displayInSidebar(summary, extractedData) {
    try {
      console.info('🧾 displayInSidebar invoked');
      // Get sidebar UI (not chat - we want the direct UI for streaming)
      const sidebar = window.ChromeAIStudio?.smartSidebar;
      
      if (!sidebar) {
        console.warn('⚠️ Sidebar not available');
        return false;
      }
      
      if (!sidebar.isInitialized) {
        console.warn('⚠️ Sidebar not initialized, attempting to initialize...');
        await sidebar.init();
      }
      
      const sidebarUI = sidebar.ui;
      
      if (!sidebarUI || !sidebarUI.addStreamingMessage) {
        console.warn('⚠️ Sidebar streaming UI not available, falling back to addMessage');
        
        // Fallback: try using chat.sendMessage
        if (sidebar.chat && sidebar.chat.sendMessage) {
          const formattedMessage = `**Research Results**\n\n${summary}`;
          await sidebar.chat.sendMessage(formattedMessage, { mode: 'researcher' });
          console.info('ℹ️ Used chat.sendMessage fallback (non-streaming)');
          return true;
        }
        
        // Fallback: try using ui.addMessage
        if (sidebar.ui && sidebar.ui.addMessage) {
          sidebar.ui.addMessage(`**Research Results**\n\n${summary}`, 'assistant');
          console.info('ℹ️ Used ui.addMessage fallback (non-streaming)');
          return true;
        }
        
        return false;
      }
      
      // Open sidebar if closed and wait for animation
      if (!sidebar.isOpen) {
        sidebar.toggle();
        // Wait for sidebar animation to complete
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // Create streaming message (shows "AI is thinking" animation)
      const messageElement = sidebarUI.addStreamingMessage();
      console.info('⌨️ Streaming message started');
      
      if (!messageElement) {
        console.warn('⚠️ Failed to create streaming message element');
        return false;
      }
      
      // Sanitize summary and format as markdown
      const safeSummary = this.sanitizeSummary(summary);
      let formatted = `### 🔍 Research Complete\n\n${safeSummary}`;
      
      // Add data sources count if available
      if (extractedData && Object.keys(extractedData).length > 0) {
        const sourceCount = Object.keys(extractedData).length;
        const sources = Object.keys(extractedData).map(key => 
          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        );
        formatted += `\n\n---\n\n**📚 Sources**: ${sourceCount} (${sources.join(', ')})`;
      }
      
      // Stream the summary word-by-word
      const words = formatted.split(' ');
      let currentText = '';

      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        sidebarUI.updateStreamingMessage(messageElement, currentText);
        
        // Delay between words (adjust for speed: 30ms = fast, 50ms = medium, 80ms = slow)
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      
      // Complete the streaming message (removes cursor, shows copy button)
      sidebarUI.completeStreamingMessage(messageElement);
      console.info('✅ Streaming message completed');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to display in sidebar:', error);
      
      // Fallback: Try to open sidebar and add message directly
      try {
        const sidebar = window.ChromeAIStudio?.smartSidebar;
        if (sidebar) {
          // Force open sidebar
          if (!sidebar.isOpen) {
            sidebar.toggle();
          }
          
          // Try to add message directly
          if (sidebar.ui && sidebar.ui.addMessage) {
            const fallbackMessage = `### 🔍 Research Complete\n\n${summary}`;
            sidebar.ui.addMessage(fallbackMessage, 'assistant');
            return true;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback display also failed:', fallbackError);
      }
      
      return false;
    }
  }

  /**
   * Test sidebar display - can be called from console for debugging
   */
  async testSidebarDisplay() {
    const testSummary = "This is a test summary to verify sidebar display functionality. It should stream word by word with a nice typing animation. The cursor should blink during streaming and disappear when complete.";
    const testData = { test: "data", sources: ["source1", "source2"] };
    const result = await this.displayInSidebar(testSummary, testData);
    return result;
  }

  /**
   * Convert technical action names to user-friendly descriptions
   */
  getUserFriendlyStepDescription(decision) {
    const action = decision.action;
    const target = decision.target || '';
    
    // User-friendly action descriptions
    const actionMap = {
      'search': '🔍 Searching the web',
      'urlsToMarkdown': '📄 Reading and analyzing websites',
      'urlstomarkdown': '📄 Reading and analyzing websites',
      'converttomarkdown': '📄 Reading and analyzing websites',
      'extract': '📤 Extracting data',
      'navigate': '🌐 Visiting website',
      'scroll': '📜 Scrolling page',
      'wait': '⏳ Waiting for content',
      'complete': '📝 Summarizing findings',
      'finish': '📝 Summarizing findings'
    };
    
    // Get base description
    let description = actionMap[action] || `🔄 ${action}`;
    
    // Add target-specific details
    if (target && action === 'search') {
      description += ` for "${target}"`;
    } else if (target && action === 'navigate') {
      description += `: ${target}`;
    }
    
    return description;
  }

  /**
   * Get step details for mini steps
   */
  getStepDetails(decision) {
    const action = decision.action;
    
    const detailsMap = {
      'search': 'Finding relevant sources and information',
      'urlsToMarkdown': 'Converting web pages to readable format',
      'urlstomarkdown': 'Converting web pages to readable format',
      'converttomarkdown': 'Converting web pages to readable format',
      'extract': 'Gathering specific data from pages',
      'navigate': 'Loading website content',
      'scroll': 'Loading more content',
      'wait': 'Allowing page to load completely',
      'complete': 'Generating final research summary',
      'finish': 'Generating final research summary'
    };
    
    return detailsMap[action] || 'Processing...';
  }

  /**
   * Plan task using Chrome AI (LEGACY - now using iterative approach)
   */
  async planTask(description) {
    try {
      
      // Check if LanguageModel is available
      if (typeof LanguageModel === 'undefined') {
        throw new Error('Chrome AI LanguageModel not available');
      }
      
      const session = await LanguageModel.create({
        temperature: 0.3,  // Lower for more deterministic planning
        topK: 20
      });
      
      const prompt = `You are an autonomous browser automation agent. Plan how to complete this task:

Task: ${description}

Your Available Actions:
- search: Search Google to find relevant websites and information
- navigate: Visit a URL you discovered from search results or know exists
- extract: Extract data from the current page (tables, lists, text, search results)
- scroll: Scroll the page (parameters: {direction: "up"|"down"|"top"|"bottom"})
- wait: Wait for page to load (parameters: {time: milliseconds})

Planning Strategy:
1. If you need information, START with a Google search to find authoritative sources
2. After searching, use extract action with {what: "search results"} to get links
3. Navigate to the most relevant links from your extracted search results
4. Extract data from those pages (use {what: "table"} or {what: "list"})
5. Repeat as needed to gather comprehensive information

CORRECT Extract Examples:
- After search: {"action": "extract", "parameters": {"what": "search results"}, "description": "Get search result links"}
- From webpage: {"action": "extract", "parameters": {"what": "table"}, "description": "Extract ranking table"}
- From webpage: {"action": "extract", "parameters": {"what": "list"}, "description": "Extract university list"}

WRONG Examples:
- {"action": "extract", "parameters": {"what": "URLs"}} ❌ Use "search results" instead
- {"action": "extract", "target": "current page"} ❌ Don't specify target, use parameters.what
- {"action": "browse"} ❌ Not a valid action

For Document Creation:
- Google Doc: {"action": "navigate", "target": "https://docs.google.com/document/create"}
- Google Sheet: {"action": "navigate", "target": "https://sheets.google.com/create"}

Important Rules:
- ONLY use these 5 actions: search, navigate, extract, scroll, wait
- Do NOT use: browse, click, type, analyze (they don't exist)
- Extract "search results" after searching (not "URLs" or "links")
- Keep plans concise (4-6 steps maximum)

Return ONLY valid JSON:
{
  "goal": "clear description of what you'll achieve",
  "steps": [
    {
      "action": "search|navigate|extract|scroll|wait",
      "target": "search query OR URL",
      "parameters": {"what": "search results|table|list"},
      "description": "human-readable step description",
      "waitAfter": 1000
    }
  ]
}

Example for "research top universities":
{
  "goal": "Research top universities and gather data",
  "steps": [
    {"action": "navigate", "target": "https://www.topuniversities.com/world-university-rankings", "description": "Visit QS university rankings"},
    {"action": "extract", "parameters": {"what": "table"}, "description": "Extract ranking table"},
    {"action": "navigate", "target": "https://www.usnews.com/best-colleges", "description": "Visit US News rankings"},
    {"action": "extract", "parameters": {"what": "list"}, "description": "Extract university list"}
  ]
}

NOTE: For university rankings, education sites, tech reviews, etc., you can directly navigate to well-known sites.
For other research tasks where you don't know the URL, use search → extract → navigate.
NEVER use placeholder URLs like "FIRST_RESULT_URL" or "URL_FROM_SEARCH" - use real URLs or search first.`;
      
      const response = await session.prompt(prompt);
      await session.destroy();
      
      // Parse JSON response
      const cleaned = response.trim().replace(/```json|```/g, '');
      const plan = JSON.parse(cleaned);
      
      return plan;
      
    } catch (error) {
      console.error('❌ Planning failed:', error);
      
      // Fallback to basic plan
      return this.createFallbackPlan(description);
    }
  }

  /**
   * Execute a single step with retry logic
   */
  async executeStepWithRetry(step, retryCount = 0) {
    try {
      return await this.executeStep(step);
      
    } catch (error) {
      console.error(`❌ Step failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < this.options.maxRetries) {
        
        // Try replanning this specific step
        const newStep = await this.replanStep(step, error.message);
        
        if (newStep) {
          return await this.executeStepWithRetry(newStep, retryCount + 1);
        }
        
        // Or just retry same step
        await this.actionExecutor.wait(1000);
        return await this.executeStepWithRetry(step, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step) {
    const action = step.action; // Keep original case for camelCase actions
    const params = step.parameters || {};
    const target = step.target;
    
    // Normalize action to lowercase for comparison
    const actionLower = action.toLowerCase();
    
    switch (actionLower) {
      case 'navigate':
        const navResult = await this.actionExecutor.navigate(target || params.url);
        // Save the automation window tab ID for future extractions
        if (navResult && navResult.tabId) {
          this.currentAutomationTabId = navResult.tabId;
          
          // Check for login wall and get user's choice
          const loginChoice = await this.checkForLoginWall();
          
          if (loginChoice === 'pause') {
            // User chose to login manually - pause the task
            throw new Error('Login required - task paused for manual login');
          } else if (loginChoice === 'skip') {
            // User chose to skip this URL - signal to try different URL
            throw new Error('User chose to skip this URL - trying alternative');
          }
          // loginChoice === 'continue' or 'try' - proceed normally
        }
        return navResult;
      
      case 'search':
        // Try multiple places for query
        const query = params.query || target || step.description || 'top 10 universities 2024';
        
        // Add mini steps for search process
        if (this.progressUI) {
          this.progressUI.addMiniStep(step.id, 'Opening Google search', 'running');
        }
        
        const searchResult = await this.actionExecutor.search(query);
        
        // Save the automation tab ID from search
        if (searchResult?.tabId) {
          this.currentAutomationTabId = searchResult.tabId;
          
          // Update mini step
          if (this.progressUI) {
            this.progressUI.updateMiniStep(step.id, step.id, 'completed', 'Google search opened');
            this.progressUI.addMiniStep(step.id, 'Waiting for results to load', 'running');
          }
          
          // Automatically extract search results for AI analysis
          // Wait longer for Google search page to fully load and render results
          await new Promise(resolve => setTimeout(resolve, 4000)); // Increased to 4 seconds (3s for page + 1s for content script + extraction)
          
          // Update mini step
          if (this.progressUI) {
            this.progressUI.updateMiniStep(step.id, step.id, 'completed', 'Results loaded');
            this.progressUI.addMiniStep(step.id, 'Extracting search results', 'running');
          }
          const extractionResult = await this.extractSearchResults(searchResult.tabId);
          
          if (extractionResult.success && extractionResult.results.length > 0) {
            // Results are already stored in memory by extractSearchResults()
          } else {
            console.warn(`⚠️ Failed to extract search results (got ${extractionResult.results?.length || 0} results)`);
            console.warn(`⚠️ This might be due to Google page not fully loaded. AI will work with limited context.`);
          }
        }
        
        return searchResult;
      
      case 'click':
        return await this.actionExecutor.smartClick(target || params.element);
      
      case 'type':
        return await this.actionExecutor.smartType(target || params.field, params.text || params.value);
      
      case 'select':
        // Select option from dropdown
        if (!target && !params.selector) {
          throw new Error('Select action requires target selector');
        }
        const selector = target || params.selector;
        const value = params.value || params.option;
        
        // Find select element and set value
        const selectElement = document.querySelector(selector);
        if (selectElement && selectElement.tagName === 'SELECT') {
          selectElement.value = value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, message: `Selected "${value}" from ${selector}` };
        } else {
          throw new Error(`Select element not found: ${selector}`);
        }
      
      case 'check':
      case 'checkbox':
        // Check/uncheck a checkbox
        if (!target && !params.selector) {
          throw new Error('Check action requires target selector');
        }
        const checkSelector = target || params.selector;
        const shouldCheck = params.checked !== false; // Default to true
        
        const checkbox = document.querySelector(checkSelector);
        if (checkbox && (checkbox.type === 'checkbox' || checkbox.type === 'radio')) {
          checkbox.checked = shouldCheck;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, message: `${shouldCheck ? 'Checked' : 'Unchecked'} ${checkSelector}` };
        } else {
          throw new Error(`Checkbox element not found: ${checkSelector}`);
        }
      
      case 'extract':
        // First, validate that the page has valid content (not 404/error)
        if (this.currentAutomationTabId) {
          const validation = await this.validatePageContent(this.currentAutomationTabId);
          
          if (!validation.valid) {
            console.error(`❌ Page validation failed: ${validation.reason}`);
            return {
              success: false,
              error: `Cannot extract from this page: ${validation.reason}`,
              message: `Page "${validation.title || 'Unknown'}" appears to be an error page (${validation.reason}). Try navigating to a different URL.`
            };
          }
        }
        
        // Determine extraction type
        let dataType = params.what || params.type || target || null;
        
        // If no type specified, use smart default
        if (!dataType) {
          // Get current page URL to detect context
          try {
            const urlResponse = await chrome.runtime.sendMessage({
              type: 'GET_TAB_URL',
              tabId: this.currentAutomationTabId
            });
            const currentUrl = urlResponse?.url || '';
            
            // If on Google search, extract search results
            if (currentUrl.includes('google.com/search')) {
              dataType = 'search results';
            } else {
              // Otherwise, use general extraction
              dataType = 'rankings'; // generic data extraction
            }
          } catch (e) {
            console.warn('Could not detect page type, using general extraction');
            dataType = 'general data';
          }
        }
        
        // ALWAYS extract from automation window (where search/navigation happens)
        return await this.extractAndStore(dataType, this.currentAutomationTabId);
      
      case 'wait':
        if (params.time) {
          await this.actionExecutor.wait(params.time);
          return { success: true, message: `Waited ${params.time}ms` };
        } else if (params.element) {
          await this.actionExecutor.waitForElement(params.element);
          return { success: true, message: `Waited for element: ${params.element}` };
        } else {
          await this.actionExecutor.wait(2000);
          return { success: true, message: 'Waited 2000ms' };
        }
      
      case 'scroll':
        const scrollResult = await this.actionExecutor.scroll(params.direction || 'down');
        return { success: true, message: scrollResult.message || `Scrolled ${params.direction || 'down'}` };
      
      case 'fillForm':
        if (!params.formData) {
          throw new Error('fillForm action requires formData parameter');
        }
        const fillResult = await this.actionExecutor.fillForm(params.formData);
        return { success: true, message: fillResult.message || 'Form filled successfully' };
      
      case 'analyzeurls':
        // Analyze search results and suggest URLs to visit
        
        // Get search results from memory
        const searchResults = this.memory.getExtractedData('search_results') || 
                             this.memory.getExtractedData('search') ||
                             this.memory.getExtractedData('data');
        
        if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
          return {
            success: false,
            error: 'No search results found to analyze',
            message: 'Please extract search results first before analyzing URLs'
          };
        }
        
        // Call analyzeSearchResults with current task
        const urlAnalysis = await this.analyzeSearchResults(searchResults, step.description || 'the task');
        
        if (urlAnalysis && urlAnalysis.urls && urlAnalysis.urls.length > 0) {
          this.memory.storeExtractedData('url_analysis', urlAnalysis);
          return {
            success: true,
            message: `Analyzed search results and identified ${urlAnalysis.urls.length} promising URLs`,
            data: urlAnalysis
          };
        } else {
          return {
            success: false,
            error: 'URL analysis returned no results',
            message: 'Could not identify promising URLs from search results'
          };
        }
      
      case 'urlstomarkdown':
      case 'converttomarkdown':
        // NEW OPTIMIZED APPROACH: Convert URLs directly to markdown without opening tabs
        console.info('🚀 ULTRA-FAST PATH: urlsToMarkdown started');
        
        // Get URLs from memory (search results) or from params
        let urlsForMarkdown = params.urls || [];
        
        // Add mini steps for URL conversion with URL mapping
        if (this.progressUI) {
          this.progressUI.addMiniStep(step.id, 'Preparing URLs for conversion', 'running');
          
          // Show which URLs are being processed
          if (urlsForMarkdown.length > 0) {
            const urlList = urlsForMarkdown.slice(0, 5).map((url, index) => 
              `${index + 1}. ${url.title || url.url}`
            ).join('\n');
            const remainingCount = Math.max(0, urlsForMarkdown.length - 5);
            const urlDisplay = remainingCount > 0 ? 
              `${urlList}\n... and ${remainingCount} more URLs` : 
              urlList;
            
            this.progressUI.addMiniStep(step.id, `Processing ${urlsForMarkdown.length} URLs:\n${urlDisplay}`, 'running');
          }
        }
        
        if (urlsForMarkdown.length === 0) {
          // Get from search results
          const searchResults = this.memory.getExtractedData('search_results') || 
                               this.memory.getExtractedData('search') ||
                               [];
          
          if (searchResults.length === 0) {
            return {
              success: false,
              error: 'No URLs to convert',
              message: 'Please extract search results first'
            };
          }
          
          // Pre-filter to select only top 3 URLs before scraping
          const selectedUrls = await this.selectTopUrlsFromSearchResults(searchResults, this.MAX_SOURCES);
          urlsForMarkdown = selectedUrls;
        }
        
        // Update mini step
        if (this.progressUI) {
          this.progressUI.updateMiniStep(step.id, step.id, 'completed', `${urlsForMarkdown.length} URLs prepared`);
          this.progressUI.addMiniStep(step.id, 'Converting URLs to markdown', 'running');
          
          // Show URL processing progress
          if (urlsForMarkdown.length > 0) {
            const urlPreview = urlsForMarkdown.slice(0, 3).map((url, index) => 
              `${index + 1}. ${url.title || url.url}`
            ).join('\n');
            this.progressUI.addMiniStep(step.id, `Converting:\n${urlPreview}${urlsForMarkdown.length > 3 ? `\n... and ${urlsForMarkdown.length - 3} more` : ''}`, 'running');
          }
        }
        
        // Use the URL to Markdown converter
        const converter = window.ChromeAIStudio?.urlToMarkdown;
        if (!converter) {
          console.error('❌ URL to Markdown converter not available');
          return {
            success: false,
            error: 'Converter not available',
            message: 'URL to Markdown converter not initialized'
          };
        }
        
        const markdownResults = await converter.convertMultipleUrls(urlsForMarkdown, this.automationWindowId);
        console.info(`🧾 urlsToMarkdown: converted ${markdownResults.length} URLs`);
        
        if (markdownResults.length > 0) {
          // Update mini step
        if (this.progressUI) {
          this.progressUI.updateMiniStep(step.id, step.id, 'completed', `${markdownResults.length} URLs converted`);
          this.progressUI.addMiniStep(step.id, 'Filtering relevant URLs', 'running');
          
          // Show which URLs were converted
          if (markdownResults.length > 0) {
            const convertedUrls = markdownResults.slice(0, 3).map((result, index) => 
              `${index + 1}. ${result.title || result.url}`
            ).join('\n');
            this.progressUI.addMiniStep(step.id, `Converted:\n${convertedUrls}${markdownResults.length > 3 ? `\n... and ${markdownResults.length - 3} more` : ''}`, 'completed');
          }
        }
          
          // 🎯 Smart URL filtering: Select only 3-4 most relevant URLs
          let filteredResults;
          
          try {
            filteredResults = await this.filterRelevantUrls(markdownResults, this.currentTask);
            
            // Truncate each URL's content to 20,000 characters max
            filteredResults = filteredResults.map(result => {
              if (result.markdown && result.markdown.length > 20000) {
                return {
                  ...result,
                  markdown: result.markdown.slice(0, 20000),
                  truncated: true,
                  originalLength: result.markdown.length
                };
              }
              return result;
            });
            
            // Update mini step
          if (this.progressUI) {
            this.progressUI.updateMiniStep(step.id, step.id, 'completed', `${filteredResults.length} relevant URLs selected`);
            
            // Show which URLs were selected
            if (filteredResults.length > 0) {
              const selectedUrls = filteredResults.slice(0, 3).map((result, index) => 
                `${index + 1}. ${result.title || result.url}`
              ).join('\n');
              this.progressUI.addMiniStep(step.id, `Selected:\n${selectedUrls}${filteredResults.length > 3 ? `\n... and ${filteredResults.length - 3} more` : ''}`, 'completed');
            }
            
            this.progressUI.addMiniStep(step.id, 'Creating chunked summaries', 'running');
          }
          } catch (error) {
            console.error('❌ URL filtering failed, using fallback:', error);
            // Fallback: Take first 3 URLs
            filteredResults = markdownResults.slice(0, 3);
            
            // Update mini step
            if (this.progressUI) {
              this.progressUI.updateMiniStep(step.id, step.id, 'completed', `Using fallback: ${filteredResults.length} URLs`);
              
              // Show fallback URLs
              if (filteredResults.length > 0) {
                const fallbackUrls = filteredResults.slice(0, 3).map((result, index) => 
                  `${index + 1}. ${result.title || result.url}`
                ).join('\n');
                this.progressUI.addMiniStep(step.id, `Using:\n${fallbackUrls}${filteredResults.length > 3 ? `\n... and ${filteredResults.length - 3} more` : ''}`, 'completed');
              }
              
              this.progressUI.addMiniStep(step.id, 'Creating chunked summaries', 'running');
            }
          }
          
          if (filteredResults.length > 0) {
            // Store filtered markdown data for summarization
            this.memory.storeExtractedData('markdown_data', filteredResults);

            // 🔄 Create chunked summaries from filtered data
            const chunkedSummaries = await this.createChunkedSummaries(filteredResults);
            console.info(`🧩 Chunked summaries created: ${chunkedSummaries.length}`);
            
            // 📊 Progress tracking
            
            // 📊 Show which URLs were selected for processing
            filteredResults.forEach((result, index) => {
            });
          } else {
          }
          
          // 🔍 DEBUG: Log filtered markdown data for debugging
          filteredResults.forEach((result, index) => {
          });
          
          // 🎯 COMPLETE SCRAPED DATA LOG
          markdownResults.forEach((result, index) => {
          });
          
          return {
            success: true,
            message: `Converted ${markdownResults.length} URLs to markdown`,
            count: markdownResults.length,
            totalChars: markdownResults.reduce((sum, r) => sum + (r.markdown?.length || 0), 0)
          };
        } else {
          return {
            success: false,
            error: 'No markdown generated',
            message: 'Could not convert any URLs to markdown'
          };
        }
      
      case 'batchopen':
      case 'openurls':
        // LEGACY APPROACH: Open multiple URLs from search results
        // NOTE: urlsToMarkdown is now preferred for better performance
        console.warn('⚠️ Consider using "urlsToMarkdown" action for better performance');
        
        // Get URLs from memory (search results) or from params
        let urlsToOpen = params.urls || [];
        
        if (urlsToOpen.length === 0) {
          // Get from search results
          const searchResults = this.memory.getExtractedData('search_results') || 
                               this.memory.getExtractedData('search') ||
                               [];
          
          if (searchResults.length === 0) {
            return {
              success: false,
              error: 'No URLs to open',
              message: 'Please extract search results first'
            };
          }
          
          // Take top 10-12 results
          urlsToOpen = searchResults.slice(0, params.limit || 10);
        }
        
        const openResult = await this.openMultipleURLs(urlsToOpen);
        
        if (openResult.success && openResult.tabs.length > 0) {
          // Store opened tabs for later extraction
          this.memory.storeExtractedData('opened_tabs', openResult.tabs);
          return {
            success: true,
            message: `Opened ${openResult.count} URLs in batch`,
            tabs: openResult.tabs
          };
        } else {
          return {
            success: false,
            error: openResult.error || 'Failed to open URLs',
            message: 'Could not open URLs in batch'
          };
        }
      
      case 'batchextract':
      case 'extractall':
        // Extract from multiple tabs in parallel
        
        // Get tab IDs from memory or params
        let tabsToExtract = params.tabs || [];
        
        if (tabsToExtract.length === 0) {
          // Get from opened tabs
          const openedTabs = this.memory.getExtractedData('opened_tabs') || [];
          
          if (openedTabs.length === 0) {
            return {
              success: false,
              error: 'No tabs to extract from',
              message: 'Please open URLs first'
            };
          }
          
          tabsToExtract = openedTabs;
        }
        
        const extractionType = params.what || params.type || 'main content';
        const extractResult = await this.extractFromMultipleTabs(tabsToExtract, extractionType);
        
        if (extractResult.success) {
          return {
            success: true,
            message: `Extracted from ${extractResult.count}/${extractResult.totalAttempted} tabs`,
            results: extractResult.results
          };
        } else {
          return {
            success: false,
            error: extractResult.error || 'Failed to extract from tabs',
            message: 'Could not extract from tabs'
          };
        }
      
      case 'complete':
        // Summarize all collected data and present results
        
        // Check if we have any data to summarize
        const extractedData = this.memory.extractedData;
        const dataKeys = Object.keys(extractedData);
        
        // 🎯 COMPLETE STEP - LOG ALL SCRAPED DATA
        
        if (extractedData.markdown_data && extractedData.markdown_data.length > 0) {
          extractedData.markdown_data.forEach((result, index) => {
          });
        }
        
        if (extractedData.search_results && extractedData.search_results.length > 0) {
          extractedData.search_results.forEach((result, index) => {
          });
        }
        
        if (dataKeys.length === 0) {
          console.warn('⚠️ No data to summarize - task may have failed');
          return {
            success: false,
            error: 'No data collected to summarize',
            message: 'Please ensure data extraction was successful'
          };
        }
        
        const summary = await this.summarizeCollectedData(this.memory.currentTask);
        
        if (summary && summary.success) {
          // Store summary
          this.memory.storeExtractedData('final_summary', summary.summary);
          return {
            success: true,
            message: 'Task completed with summary',
            summary: summary.summary,
            dataCount: dataKeys.length,
            dataTypes: dataKeys
          };
        } else {
          console.error('❌ Summary generation failed:', summary?.error);
          return {
            success: false,
            error: summary?.error || 'Failed to generate summary',
            message: 'Could not complete task - summary generation failed'
          };
        }
      
      default:
        throw new Error(`Unknown action: ${action}. Available: navigate, search, click, type, fillForm, extract, scroll, wait, analyzeURLs, batchOpen, batchExtract, complete`);
    }
  }

  /**
   * Validate that a page has valid content (not 404/error page)
   */
  async validatePageContent(tabId) {
    try {
      
      // Extract basic page info
      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_FROM_TAB',
        tabId: tabId,
        dataType: 'page validation'
      });
      
      if (!response || !response.success) {
        return {
          valid: false,
          reason: 'Failed to access page',
          title: '',
          url: ''
        };
      }
      
      const data = response.data;
      const title = data.title || '';
      const url = data.url || '';
      const headings = data.headings || [];
      const mainText = data.mainText || [];
      const lists = data.lists || [];
      
      // Check for error indicators
      const titleLower = title.toLowerCase();
      const hasErrorTitle = 
        !title ||
        title.length === 0 ||
        titleLower.includes('404') ||
        titleLower.includes('not found') ||
        titleLower.includes('error') ||
        titleLower.includes('page does not exist') ||
        titleLower.includes('oops');
      
      // Check if page has only greeting heading (common error page pattern)
      const hasOnlyGreeting = 
        headings.length === 1 && 
        (headings[0].text === 'Hi,' || headings[0].text === 'Hello');
      
      // Check if page has no content
      const hasNoContent = 
        mainText.length === 0 && 
        lists.length === 0 && 
        headings.length <= 1;
      
      // Check URL for error patterns
      const urlLower = url.toLowerCase();
      const hasErrorURL = 
        urlLower.includes('/error') ||
        urlLower.includes('/404') ||
        urlLower.includes('/not-found');
      
      const isError = hasErrorTitle || hasOnlyGreeting || hasNoContent || hasErrorURL;
      
      if (isError) {
        const reasons = [];
        if (hasErrorTitle) reasons.push('error in title');
        if (hasOnlyGreeting) reasons.push('only greeting heading');
        if (hasNoContent) reasons.push('no content');
        if (hasErrorURL) reasons.push('error URL pattern');
        
        console.warn(`❌ Page validation failed: ${reasons.join(', ')}`);
        return {
          valid: false,
          reason: reasons.join(', '),
          title,
          url
        };
      }
      return {
        valid: true,
        reason: 'Page has valid content',
        title,
        url
      };
      
    } catch (error) {
      console.error('❌ Page validation error:', error);
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
        title: '',
        url: ''
      };
    }
  }

  /**
   * Extract Google search results (URLs, titles, snippets) from search page
   */
  async extractSearchResults(tabId) {
    try {
      
      // Note: We can't use chrome.tabs.get() in content script context
      // Just send the message directly - background script will handle it
      
      // Send message to extract search results
      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_SEARCH_RESULTS_FROM_TAB',
        tabId: tabId
      });
      
      // Log debug info from automation window
      if (response?.debug) {
        if (response.debug.elementCounts) {
          Object.entries(response.debug.elementCounts).forEach(([selector, count]) => {
          });
        }
        if (response.debug.extractionError) {
          console.error(`❌ Extraction error: ${response.debug.extractionError}`);
        }
      }
      
      if (response && response.success && response.results && response.results.length > 0) {
        
        // Log first few results for debugging
        response.results.slice(0, 3).forEach((r, i) => {
        });
        
        // Store in memory for AI to analyze
        this.memory.storeExtractedData('search_results', response.results);
        
        return {
          success: true,
          results: response.results,
          count: response.results.length
        };
      } else {
        console.warn('⚠️ No search results found or extraction failed');
        console.warn('Response:', response);
        
        // Provide specific troubleshooting based on debug info
        if (response?.debug) {
          if (response.debug.hasRecaptcha) {
            console.error('🚨 PROBLEM: Google CAPTCHA detected! The automation window triggered Google\'s bot detection.');
            console.error('💡 SOLUTION: Try using different user agent or cookies, or add delays between requests.');
          } else if (response.debug.hasCookieConsent) {
            console.warn('🍪 Cookie consent screen may be blocking content. Trying to extract anyway...');
          } else if (response.debug.elementCounts && response.debug.elementCounts['div.g'] === 0 && response.debug.elementCounts['.tF2Cxc'] === 0) {
            console.error('🚨 PROBLEM: No Google result containers (div.g, .tF2Cxc) found!');
            console.error(`   Current page: ${response.debug.url}`);
            console.error('💡 POSSIBLE CAUSES:');
            console.error('   1. Google changed their HTML structure');
            console.error('   2. Page redirected to a different Google domain');
            console.error('   3. Page showing error or blocking message');
          } else {
            console.warn('⚠️ This might be due to:');
            console.warn('  1. Google page not fully loaded');
            console.warn('  2. Google changed HTML structure');
            console.warn('  3. Results still rendering (try longer delay)');
          }
        } else {
          console.warn('⚠️ This might be due to:');
          console.warn('  1. Google page not fully loaded');
          console.warn('  2. Google changed HTML structure');
          console.warn('  3. Content script not injected in tab');
        }
        
        return {
          success: false,
          error: response?.error || 'No search results found',
          results: []
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to extract search results:', error);
      console.error('Stack:', error.stack);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Extract data and store in memory
   */
  async extractAndStore(dataType, tabId = null) {
    let data;
    
    if (tabId) {
      // Extract from specific tab (automation window)
      
      try {
        // Send message to BACKGROUND script to extract from target tab
        const response = await chrome.runtime.sendMessage({
          type: 'EXTRACT_FROM_TAB',
          tabId: tabId,
          dataType: dataType
        });
        
        if (response && response.success) {
          data = response.data;
        } else {
          throw new Error(response?.error || 'Failed to extract data from automation tab');
        }
      } catch (error) {
        console.error(`❌ Tab extraction failed:`, error);
        // Fallback to current page
        const extractor = this.dataExtractor || window.ChromeAIStudio?.dataExtractor;
        if (!extractor) {
          throw new Error('Data extractor not available');
        }
        data = await extractor.smartExtract(dataType);
      }
    } else {
      // Extract from current page
      const extractor = this.dataExtractor || window.ChromeAIStudio?.dataExtractor;
      if (!extractor) {
        throw new Error('Data extractor not available');
      }
      data = await extractor.smartExtract(dataType);
    }
    
    // Validate extracted data before storing
    const isEmpty = !data || 
                    (Array.isArray(data) && data.length === 0) || 
                    (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
    
    if (isEmpty) {
      console.warn(`❌ Extraction failed: No data found for "${dataType}"`);
      return {
        success: false,
        error: `No data found for "${dataType}"`,
        message: `Failed to extract ${dataType} - page returned empty results`,
        itemCount: 0
      };
    }
    
    // Store in memory with descriptive key
    const key = dataType.replace(/\s+/g, '_').toLowerCase();
    this.memory.storeExtractedData(key, data);
    
    const itemCount = Array.isArray(data) ? data.length : 
                      (typeof data === 'object' ? Object.keys(data).length : 1);
    
    return {
      success: true,
      message: `Extracted ${dataType}`,
      itemCount: itemCount
    };
  }

  /**
   * Open multiple URLs at once (batch opening for parallel extraction)
   */
  async openMultipleURLs(urls, windowId = null) {
    try {
      
      const targetWindowId = windowId || this.automationWindowId;
      if (!targetWindowId) {
        throw new Error('No automation window available');
      }
      
      const openedTabs = [];
      
      // Open all URLs in parallel
      const openPromises = urls.map(async (urlData) => {
        try {
          const url = typeof urlData === 'string' ? urlData : urlData.url;
          
          // Use background script to create tab (content scripts can't use chrome.tabs.create)
          const createResponse = await chrome.runtime.sendMessage({
            type: 'CREATE_TAB_IN_WINDOW',
            windowId: targetWindowId,
            url: url
          });
          
          if (!createResponse || !createResponse.success) {
            throw new Error(createResponse?.error || 'Failed to create tab');
          }
          
          // Wait for page to load using background script
          const loadResponse = await chrome.runtime.sendMessage({
            type: 'WAIT_FOR_PAGE_LOAD',
            tabId: createResponse.tabId,
            timeout: 8000 // 8 second timeout per page
          });
          
          if (!loadResponse || !loadResponse.success) {
            console.warn(`⚠️ Page load wait failed for ${url}:`, loadResponse?.error);
          } else if (loadResponse.timeout) {
            console.warn(`⏰ Page load timeout for ${url} (continuing anyway)`);
          } else {
          }
          
          return {
            tabId: createResponse.tabId,
            url: url,
            title: typeof urlData === 'object' ? urlData.title : null,
            position: typeof urlData === 'object' ? urlData.position : null
          };
        } catch (error) {
          console.warn(`⚠️ Failed to open URL: ${urlData}`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(openPromises);
      
      // Collect successful tabs
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          openedTabs.push(result.value);
        }
      });
      
      return {
        success: true,
        tabs: openedTabs,
        count: openedTabs.length
      };
      
    } catch (error) {
      console.error('❌ Failed to open multiple URLs:', error);
      return {
        success: false,
        error: error.message,
        tabs: []
      };
    }
  }

  /**
   * Extract data from multiple tabs in parallel
   */
  async extractFromMultipleTabs(tabIds, dataType = 'main content') {
    try {
      
      const extractPromises = tabIds.map(async (tabInfo) => {
        const tabId = typeof tabInfo === 'number' ? tabInfo : tabInfo.tabId;
        const url = typeof tabInfo === 'object' ? tabInfo.url : null;
        
        try {
          
          // Check for login wall first (but continue anyway)
          const loginCheck = await chrome.runtime.sendMessage({
            type: 'CHECK_LOGIN',
            tabId: tabId
          });
          
          if (loginCheck?.loginRequired) {
          }
          
          // Extract data
          const response = await chrome.runtime.sendMessage({
            type: 'EXTRACT_FROM_TAB',
            tabId: tabId,
            dataType: dataType
          });
          
          if (response && response.success && response.data) {
            return {
              tabId: tabId,
              url: response.url || url,
              title: response.title,
              data: response.data,
              success: true
            };
          } else {
            console.warn(`⚠️ No data extracted from tab ${tabId}`);
            return {
              tabId: tabId,
              url: url,
              success: false,
              error: response?.error || 'No data extracted'
            };
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to extract from tab ${tabId}:`, error);
          return {
            tabId: tabId,
            url: url,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(extractPromises);
      
      // Collect successful extractions
      const extractedData = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.success) {
            extractedData.push(result.value);
          }
        }
      });
      
      // Store all extracted data
      if (extractedData.length > 0) {
        this.memory.storeExtractedData('batch_extraction_results', extractedData);
      }
      
      return {
        success: true,
        results: extractedData,
        count: extractedData.length,
        totalAttempted: tabIds.length
      };
      
    } catch (error) {
      console.error('❌ Failed to extract from multiple tabs:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad(tabId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkLoad = setInterval(async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          
          if (tab.status === 'complete') {
            clearInterval(checkLoad);
            // Additional delay to ensure content script is loaded
            setTimeout(() => resolve(true), 500);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkLoad);
            console.warn(`⏱️ Page load timeout for tab ${tabId}`);
            resolve(false); // Don't reject, just resolve with false
          }
        } catch (error) {
          clearInterval(checkLoad);
          resolve(false); // Tab might have been closed
        }
      }, 100);
    });
  }

  /**
   * Summarize all collected data using AI (Perplexity-like summary)
   */
  async summarizeCollectedData(taskDescription) {
    try {
      
      const extractedData = this.memory.extractedData;
      const dataKeys = Object.keys(extractedData);
      
      if (dataKeys.length === 0) {
        console.warn('⚠️ No data to summarize');
        return {
          success: false,
          error: 'No data collected'
        };
      }
      
      // Prepare data summary for AI
      let dataContext = '';
      
      // Include markdown data if available (PRIORITY - most comprehensive)
      if (extractedData.markdown_data) {
        const markdownResults = extractedData.markdown_data;
        
        // 🔍 DEBUG: Log detailed markdown data for summarization
        markdownResults.forEach((result, index) => {
        });
        
        dataContext += `\n\nData extracted from ${markdownResults.length} sources (markdown format):\n\n`;
        
        markdownResults.forEach((result, index) => {
          dataContext += `\n========== Source ${index + 1}: ${result.title || 'Untitled'} ==========\n`;
          dataContext += `URL: ${result.url}\n\n`;
          
          if (result.markdown) {
            // Include markdown content (truncate if very long)
            const maxLength = Math.floor(6000 / markdownResults.length); // Use full 6000 token budget
            if (result.markdown.length > maxLength) {
              dataContext += result.markdown.slice(0, maxLength) + '\n\n[... content truncated ...]\n';
            } else {
              dataContext += result.markdown + '\n';
            }
          }
        });
      }
      // Include batch extraction results if available (FALLBACK method)
      else if (extractedData.batch_extraction_results) {
        const batchResults = extractedData.batch_extraction_results;
        dataContext += `\n\nData extracted from ${batchResults.length} sources:\n\n`;
        
        batchResults.forEach((result, index) => {
          dataContext += `\n--- Source ${index + 1}: ${result.title || result.url} ---\n`;
          
          if (result.data) {
            // Format the extracted data
            if (result.data.mainText && Array.isArray(result.data.mainText)) {
              dataContext += result.data.mainText.slice(0, 5).join('\n') + '\n';
            }
            if (result.data.headings && Array.isArray(result.data.headings)) {
              dataContext += 'Key topics: ' + result.data.headings.map(h => h.text).slice(0, 5).join(', ') + '\n';
            }
            if (result.data.lists && Array.isArray(result.data.lists)) {
              dataContext += `Found ${result.data.lists.length} lists with information\n`;
            }
          }
        });
      }
      
      // Include other extracted data
      dataKeys.forEach(key => {
        if (key !== 'batch_extraction_results' && key !== 'markdown_data' && key !== 'final_summary') {
          const data = extractedData[key];
          dataContext += `\n\n${key.replace(/_/g, ' ')}:\n`;
          
          if (Array.isArray(data)) {
            dataContext += data.slice(0, 10).map((item, i) => {
              if (typeof item === 'object') {
                return `${i + 1}. ${item.title || item.name || item.url || JSON.stringify(item).slice(0, 100)}`;
              }
              return `${i + 1}. ${item}`;
            }).join('\n');
          } else if (typeof data === 'object') {
            dataContext += JSON.stringify(data, null, 2).slice(0, 500);
          } else {
            dataContext += String(data).slice(0, 500);
          }
        }
      });
      
      // Limit context size
      if (dataContext.length > 15000) {
        dataContext = dataContext.slice(0, 15000) + '\n\n... (data truncated for summary)';
      }
      
      // Create AI session for summarization
      if (typeof window.LanguageModel === 'undefined') {
        console.warn('⚠️ AI Language Model not available, returning raw data');
        return {
          success: true,
          summary: `Collected data from ${dataKeys.length} sources. See extracted data for details.`
        };
      }
      
      const session = await window.LanguageModel.create({
        temperature: 0.7,
        topK: 40,
        outputLanguage: 'en'
      });
      
      const prompt = `Task: ${taskDescription}

I've collected data from multiple sources. Please create a comprehensive, well-organized summary.

${dataContext}

Create a clear, structured summary that:
1. Directly answers the original task/question
2. Synthesizes information from all sources
3. Presents key findings in an organized way
4. Includes specific details and examples
5. Is easy to read and understand

Summary:`;

      const response = await session.prompt(prompt);
      await session.destroy();
      
      return {
        success: true,
        summary: response.trim()
      };
      
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Replan a failed step using AI
   */
  async replanStep(failedStep, errorMessage) {
    try {
      
      if (typeof LanguageModel === 'undefined') {
        return null;
      }
      
      const session = await LanguageModel.create();
      
      const prompt = `This step failed:
${JSON.stringify(failedStep)}

Error: ${errorMessage}

Current page: ${window.location.href}

CRITICAL: You can ONLY use these actions: navigate, search, extract, scroll, wait
Do NOT use: browse, click, type (they won't work in automation window)

If the step was trying to extract data:
- Use "extract" with parameters: {what: "search results" | "table" | "list"}

If the step needs to find information:
- Use "search" to search Google
- Then use "extract" to get search results
- Then use "navigate" to visit a found URL

Suggest an alternative step using ONLY valid actions.
Return ONLY valid JSON in this format:
{
  "action": "navigate|search|extract|scroll|wait",
  "target": "URL or search query",
  "parameters": {},
  "description": "what this step does"
}`;
      
      const response = await session.prompt(prompt);
      await session.destroy();
      
      const cleaned = response.trim().replace(/```json|```/g, '');
      const newStep = JSON.parse(cleaned);
      
      return newStep;
      
    } catch (error) {
      console.error('❌ Replanning failed:', error);
      return null;
    }
  }

  /**
   * Compile final result summary
   */
  async compileFinalResult(taskPlan) {
    const extractedData = this.memory.getAllExtractedData();
    const summary = this.memory.getTaskSummary();
    
    // Create user-friendly summary
    let result = taskPlan.goal || 'Task completed';
    
    // Add extracted data summary
    const dataKeys = Object.keys(extractedData);
    if (dataKeys.length > 0) {
      const dataDesc = dataKeys.map(key => {
        const data = extractedData[key];
        if (Array.isArray(data)) {
          return `${data.length} ${key.replace(/_/g, ' ')}`;
        }
        return key.replace(/_/g, ' ');
      }).join(', ');
      
      result += `. Gathered: ${dataDesc}`;
    }
    
    // Check if should display in sidebar
    if (this.shouldFallbackToSidebar()) {
      await this.displayInSidebar(result, extractedData);
    }
    
    return result;
  }

  /**
   * Report progress via voice
   */
  async reportProgress(message) {
    if (!this.options.voiceProgress || !this.voiceInterface) {
      return;
    }
    
    try {
      await this.voiceInterface.speak(message);
    } catch (error) {
      console.error('❌ Voice progress failed:', error);
    }
  }

  /**
   * Fallback plan when AI planning fails
   */
  createFallbackPlan(description) {
    console.warn('⚠️ Using fallback plan');
    
    // Create basic plan based on keywords
    const steps = [];
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('search') || lowerDesc.includes('research')) {
      const query = description.replace(/research|search|for|find/gi, '').trim();
      steps.push({
        action: 'search',
        parameters: { query },
        description: `Searching for ${query}`
      });
      steps.push({
        action: 'wait',
        parameters: { time: 2000 },
        description: 'Waiting for results'
      });
      steps.push({
        action: 'extract',
        parameters: { what: 'search results' },
        description: 'Extracting search results'
      });
    }
    
    return {
      goal: description,
      steps: steps
    };
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isExecuting: this.isExecuting,
      currentTask: this.memory.getTaskStatus(),
      statistics: this.memory.getStatistics()
    };
  }

  /**
   * Stop current task
   */
  async stopTask() {
    if (!this.isExecuting) return;
    
    this.isExecuting = false;
    this.memory.endTask('stopped', 'Task stopped by user');
    
    await this.reportProgress('Task stopped');
  }
  
  /**
   * Check for login wall after navigation - AUTO-TRY mode (Perplexity-like)
   * Returns: 'continue' (always try extraction), 'skip' (never used in auto mode)
   */
  async checkForLoginWall() {
    try {
      // Request login check from automation tab
      if (!this.currentAutomationTabId) {
        return 'continue'; // No tab to check
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_LOGIN',
        tabId: this.currentAutomationTabId
      });
      
      if (response && response.loginRequired) {
        
        // In Perplexity-like mode, ALWAYS try extraction without asking user
        // This allows the agent to extract publicly available content even when login prompts exist
        return 'continue';
      }
      
      return 'continue'; // No login detected
    } catch (error) {
      console.warn('Login check failed:', error);
      return 'continue'; // Continue on error
    }
  }
  
  /**
   * Resume task after login
   */
  async resumeTask() {
    if (!this.pausedState) {
      console.warn('No paused task to resume');
      return;
    }
    
    this.isPaused = false;
    this.resumed = true;
    
    // Restore state
    this.memory.currentTask = this.pausedState.task;
    this.memory.extractedData = this.pausedState.extractedData;
    this.currentStep = this.pausedState.stepsCompleted;
    
    const pausedState = this.pausedState;
    this.pausedState = null;
    
    // Continue execution (simplified - would need full state restoration)
    await this.reportProgress('Task resumed after login');
    
    if (this.progressUI) {
      this.progressUI.updateStatus('✅ Resumed - continuing task...');
    }
  }
  
  /**
   * Select relevant links from search results using AI
   */
  async selectRelevantLinks(searchResults, taskContext) {
    if (!searchResults || searchResults.length === 0) {
      return [];
    }
    
    try {
      const session = this.aiSession || await LanguageModel.create({
        temperature: 0.3,
        topK: 20
      });
      
      const prompt = `You found these search results:
  
${searchResults.slice(0, 10).map((r, i) => `${i+1}. ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet || 'No snippet'}`).join('\n\n')}

Task: ${taskContext}

Which links (by number) should you visit to complete this task? 
Select up to 3 most relevant links that will provide the information needed.

Return JSON only:
{
  "selectedLinks": [1, 3, 5],
  "reasoning": "why these links are relevant"
}`;

      const response = await session.prompt(prompt);
      const cleaned = response.trim().replace(/```json|```/g, '');
      const decision = JSON.parse(cleaned);
      
      // Map numbers to actual URLs
      const selectedUrls = decision.selectedLinks
        .filter(num => num > 0 && num <= searchResults.length)
        .map(num => searchResults[num - 1]);
      
      return selectedUrls;
    } catch (error) {
      console.error('Link selection failed:', error);
      // Fallback: return top 3
      return searchResults.slice(0, 3);
    }
  }
  
  /**
   * Check if sidebar should show results
   */
  shouldFallbackToSidebar() {
    // Show sidebar if:
    // 1. Login was required and never resumed, OR
    // 2. User didn't ask for a document/sheet
    
    if (this.pausedState && !this.resumed) {
      return true; // Login failed, show what we got
    }
    
    const taskLower = this.memory.currentTask?.description?.toLowerCase() || '';
    const wantsDocument = taskLower.includes('document') || 
                          taskLower.includes('sheet') || 
                          taskLower.includes('doc') ||
                          taskLower.includes('save to');
    
    return !wantsDocument; // If no document requested, show in sidebar
  }

  /**
   * Format results for sidebar display
   */
  formatResultsForSidebar(summary, data) {
    let formatted = `### 🤖 Research Task Complete\n\n`;
    
    // Display the actual summary content
    if (summary && summary.trim()) {
      formatted += summary;
    } else {
      formatted += `**Task completed successfully!**\n\n`;
    }
    
    // Add data source information
    if (data && Object.keys(data).length > 0) {
      formatted += `\n\n---\n\n**Data Sources**:\n`;
      
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          formatted += `\n**${key.replace(/_/g, ' ').toUpperCase()}**: ${value.length} items\n`;
        } else if (typeof value === 'object' && value !== null) {
          formatted += `\n**${key.replace(/_/g, ' ').toUpperCase()}**: Available\n`;
        }
      }
    }
    
    return formatted;
  }

  /**
   * Validate that extracted data contains specific information
   */
  validateExtractedData(extractedData) {
    const validation = {
      hasSpecificNames: false,
      hasNumbers: false,
      hasLocations: false,
      isGeneric: false,
      score: 0
    };
    
    // Check markdown_data for actual content
    if (extractedData.markdown_data) {
      const allText = extractedData.markdown_data
        .map(d => d.markdown || '')
        .join(' ');
      
      // Check for specific patterns
      validation.hasSpecificNames = /[A-Z][a-z]+ (University|Institute|College|Academy|Company|Corporation|Inc|Ltd)/g.test(allText) ||
                                   /[A-Z][a-z]+ [A-Z][a-z]+/g.test(allText); // Proper nouns
      validation.hasNumbers = /\d+/g.test(allText);
      validation.hasLocations = /(India|USA|UK|Canada|Australia|[A-Z][a-z]+, [A-Z]{2})/g.test(allText);
      
      // Check for generic phrases (bad sign)
      const genericPhrases = [
        'this website contains',
        'information about',
        'discusses various',
        'provides details',
        'the source mentions',
        'websites contain',
        'contains information'
      ];
      validation.isGeneric = genericPhrases.some(phrase => 
        allText.toLowerCase().includes(phrase)
      );
      
      // Calculate score
      if (validation.hasSpecificNames) validation.score += 3;
      if (validation.hasNumbers) validation.score += 2;
      if (validation.hasLocations) validation.score += 1;
      if (validation.isGeneric) validation.score -= 2;
    }
    
    return validation;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutonomousAgent;
} else if (typeof window !== 'undefined') {
  window.AutonomousAgent = AutonomousAgent;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.autonomousAgent = new AutonomousAgent();
}

