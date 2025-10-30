/**
 * Agent Progress UI - Shows real-time progress of autonomous tasks
 * Displays as a floating panel with step-by-step updates
 */

class AgentProgressUI {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.steps = [];
  }

  /**
   * Show progress panel
   */
  show(taskDescription) {
    if (this.panel) {
      this.panel.remove();
    }
    
    this.panel = this.createPanel(taskDescription);
    document.body.appendChild(this.panel);
    
    // Animate in
    requestAnimationFrame(() => {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateY(0)';
    });
    
    this.isVisible = true;
    this.steps = [];
  }

  /**
   * Hide progress panel
   */
  hide() {
    if (!this.panel) return;
    
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      if (this.panel) {
        this.panel.remove();
        this.panel = null;
      }
    }, 300);
    
    this.isVisible = false;
  }

  /**
   * Add step to progress with enhanced UI
   */
  addStep(stepDescription, status = 'running', details = null) {
    const step = {
      description: stepDescription,
      status: status, // 'running', 'completed', 'failed'
      timestamp: Date.now(),
      details: details,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.steps.push(step);
    this.updateStepsDisplay();
    
    // Auto-scroll to show new step
    setTimeout(() => {
      const stepsContainer = this.panel?.querySelector('.agent-steps');
      if (stepsContainer) {
        stepsContainer.scrollTo({
          top: stepsContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  /**
   * Update last step status with enhanced details
   */
  updateLastStep(status, result = null, details = null) {
    if (this.steps.length === 0) return;
    
    const lastStep = this.steps[this.steps.length - 1];
    lastStep.status = status;
    lastStep.result = result;
    if (details) lastStep.details = details;
    
    this.updateStepsDisplay();
    
    // Auto-scroll to show updated step
    setTimeout(() => {
      const stepsContainer = this.panel?.querySelector('.agent-steps');
      if (stepsContainer) {
        stepsContainer.scrollTo({
          top: stepsContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  /**
   * Add mini step for detailed progress
   */
  addMiniStep(parentStepId, miniDescription, status = 'running') {
    const parentStep = this.steps.find(step => step.id === parentStepId);
    if (!parentStep) return;
    
    if (!parentStep.miniSteps) parentStep.miniSteps = [];
    
    const miniStep = {
      description: miniDescription,
      status: status,
      timestamp: Date.now(),
      id: `mini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    parentStep.miniSteps.push(miniStep);
    this.updateStepsDisplay();
  }

  /**
   * Update mini step status
   */
  updateMiniStep(parentStepId, miniStepId, status, result = null) {
    const parentStep = this.steps.find(step => step.id === parentStepId);
    if (!parentStep || !parentStep.miniSteps) return;
    
    const miniStep = parentStep.miniSteps.find(step => step.id === miniStepId);
    if (!miniStep) return;
    
    miniStep.status = status;
    miniStep.result = result;
    this.updateStepsDisplay();
  }

  /**
   * Update specific step by ID
   */
  updateStep(stepId, status, result = null) {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return;
    
    step.status = status;
    if (result) step.result = result;
    
    this.updateStepsDisplay();
  }

  /**
   * Set completion message
   */
  setComplete(message) {
    if (!this.panel) return;
    
    const statusDiv = this.panel.querySelector('.agent-status');
    if (statusDiv) {
      statusDiv.textContent = '✅ ' + message;
      statusDiv.style.color = '#10b981';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hide(), 5000);
  }

  /**
   * Set error message
   */
  setError(message) {
    if (!this.panel) return;
    
    const statusDiv = this.panel.querySelector('.agent-status');
    if (statusDiv) {
      statusDiv.textContent = '❌ ' + message;
      statusDiv.style.color = '#ef4444';
    }
    
    // Auto-hide after 8 seconds
    setTimeout(() => this.hide(), 8000);
  }

  /**
   * Create enhanced progress panel for Research Assistant
   */
  createPanel(taskDescription) {
    const panel = document.createElement('div');
    panel.className = 'chromeai-agent-progress';
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 420px;
      max-height: 600px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    `;
    
    panel.innerHTML = `
      <div style="padding: 20px;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="agent-icon-container" style="
              width: 32px;
              height: 32px;
              border-radius: 8px;
              overflow: hidden;
              flex-shrink: 0;
            ">
              <video autoplay loop playsinline muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                <source src="${chrome.runtime.getURL('icons/Siri.webm')}" type="video/webm">
              </video>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">Research Assistant</h3>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">AI-Powered Research</div>
            </div>
          </div>
          <button class="agent-close-btn" style="
            background: #f1f5f9;
            border: none;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            cursor: pointer;
            color: #64748b;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          " onmouseover="this.style.background='#e2e8f0'; this.style.color='#475569'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'">×</button>
        </div>
        
        <!-- Task Description - Shows actual research topic -->
        <div class="agent-task" style="
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          padding: 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          line-height: 1.5;
          color: #1e40af;
          border-left: 4px solid #3b82f6;
          font-weight: 600;
        ">📋 Researching: ${taskDescription}</div>
        
        <!-- Status -->
        <div class="agent-status" style="
          font-size: 14px;
          margin-bottom: 16px;
          color: #475569;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <div class="agent-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #e2e8f0;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: agent-spin 1s linear infinite;
          "></div>
          Starting Research Task...
        </div>
        
        <!-- Steps Container -->
        <div class="agent-steps" style="
          background: #f8fafc;
          border-radius: 10px;
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
        ">
          <div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 20px;">Waiting for research steps...</div>
        </div>
      </div>
      
      <style>
        @keyframes agent-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes mini-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .agent-steps::-webkit-scrollbar {
          width: 4px;
        }
        
        .agent-steps::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }
        
        .agent-steps::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        
        .agent-steps::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .step-mini-loading {
          animation: mini-spin 1s linear infinite;
        }
        
        .step-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      </style>
    `;
    
    // Close button
    const closeBtn = panel.querySelector('.agent-close-btn');
    closeBtn.addEventListener('click', () => this.hide());
    
    return panel;
  }

  /**
   * Update steps display with enhanced research UI
   */
  updateStepsDisplay() {
    if (!this.panel) return;
    
    const stepsContainer = this.panel.querySelector('.agent-steps');
    if (!stepsContainer) return;
    
    if (this.steps.length === 0) {
      stepsContainer.innerHTML = '<div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 20px;">Waiting for research steps...</div>';
      return;
    }
    
    stepsContainer.innerHTML = this.steps.map((step, index) => {
      let icon = '🔄';
      let color = '#64748b';
      let bgColor = '#f8fafc';
      let borderColor = '#e2e8f0';
      let textColor = '#475569';
      let spinner = '';
      
      if (step.status === 'completed') {
        icon = '✅';
        color = '#059669';
        bgColor = '#ecfdf5';
        borderColor = '#10b981';
        textColor = '#047857';
      } else if (step.status === 'failed') {
        icon = '❌';
        color = '#dc2626';
        bgColor = '#fef2f2';
        borderColor = '#ef4444';
        textColor = '#b91c1c';
      } else if (step.status === 'running') {
        spinner = '<div class="step-mini-loading" style="width: 12px; height: 12px; border: 2px solid #e2e8f0; border-top: 2px solid #3b82f6; border-radius: 50%; margin-right: 6px;"></div>';
      }
      
      // Format step description with proper capitalization
      const formattedDescription = this.formatStepDescription(step.description);
      
      return `
        <div style="
          margin-bottom: 12px;
          padding: 14px;
          background: ${bgColor};
          border-radius: 8px;
          border-left: 4px solid ${borderColor};
          border: 1px solid ${borderColor};
          transition: all 0.3s ease;
        ">
          <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <span style="font-size: 14px;">${icon}</span>
              ${spinner}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 600; color: ${textColor}; line-height: 1.4;">
                ${formattedDescription}
              </div>
              ${step.details ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">${step.details}</div>` : ''}
              ${step.result ? `<div style="font-size: 11px; color: #64748b; margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.05); border-radius: 4px;">${step.result}</div>` : ''}
            </div>
          </div>
          ${step.miniSteps && step.miniSteps.length > 0 ? this.renderMiniSteps(step.miniSteps) : ''}
        </div>
      `;
    }).join('');
    
    // Auto-scroll to bottom with smooth animation
    stepsContainer.scrollTo({
      top: stepsContainer.scrollHeight,
      behavior: 'smooth'
    });
  }

  /**
   * Format step description with proper capitalization
   */
  formatStepDescription(description) {
    // Capitalize first letter and common research terms
    let formatted = description.charAt(0).toUpperCase() + description.slice(1);
    
    // Common research step patterns
    const patterns = {
      'search': '🔍 Searching',
      'reading': '📖 Reading',
      'analyzing': '🔬 Analyzing',
      'summarizing': '📝 Summarizing',
      'converting': '🔄 Converting',
      'extracting': '📤 Extracting',
      'filtering': '🎯 Filtering',
      'processing': '⚙️ Processing',
      'compiling': '📊 Compiling',
      'generating': '✨ Generating'
    };
    
    // Check for patterns and format accordingly
    for (const [key, value] of Object.entries(patterns)) {
      if (formatted.toLowerCase().includes(key)) {
        return value + ' ' + formatted.replace(new RegExp(key, 'gi'), '').trim();
      }
    }
    
    return formatted;
  }

  /**
   * Render mini steps
   */
  renderMiniSteps(miniSteps) {
    return `
      <div style="margin-top: 8px; padding-left: 20px; border-left: 2px solid #e2e8f0;">
        ${miniSteps.map(miniStep => {
          let miniIcon = '⏳';
          let miniColor = '#64748b';
          
          if (miniStep.status === 'completed') {
            miniIcon = '✓';
            miniColor = '#059669';
          } else if (miniStep.status === 'failed') {
            miniIcon = '✗';
            miniColor = '#dc2626';
          } else if (miniStep.status === 'running') {
            miniIcon = '<div class="step-mini-loading" style="width: 8px; height: 8px; border: 1px solid #e2e8f0; border-top: 1px solid #3b82f6; border-radius: 50%; display: inline-block;"></div>';
          }
          
          return `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 4px;
              font-size: 11px;
              color: ${miniColor};
            ">
              <span style="flex-shrink: 0;">${miniIcon}</span>
              <span style="flex: 1;">${miniStep.description}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Update status message
   */
  updateStatus(message) {
    if (!this.panel) return;
    
    const statusDiv = this.panel.querySelector('.agent-status');
    if (statusDiv) {
      statusDiv.textContent = message;
    }
  }
  
  /**
   * Show login choice UI with 3 options: Try, Skip, Login
   * Returns a Promise that resolves with user choice: 'try', 'skip', or 'login'
   */
  showLoginChoice(url, collectedData) {
    if (!this.panel) return Promise.resolve('skip');
    
    const stepsContainer = this.panel.querySelector('.agent-steps');
    if (!stepsContainer) return Promise.resolve('skip');
    
    // Remove any existing choice section
    const existing = this.panel.querySelector('.agent-login-choice');
    if (existing) existing.remove();
    
    return new Promise((resolve) => {
      const choiceSection = document.createElement('div');
      choiceSection.className = 'agent-login-choice';
      choiceSection.innerHTML = `
        <div style="background: linear-gradient(135deg, #FF9A56 0%, #FF6B6B 100%); border-radius: 12px; padding: 16px; margin: 12px 0; box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: white; display: flex; align-items: center; gap: 8px;">
            ⚠️ Optional Login Detected
          </div>
          <div style="font-size: 13px; color: white; margin-bottom: 12px; line-height: 1.5; opacity: 0.95;">
            This site may have a login prompt, but it could be optional.
            <br><br>
            <strong>URL:</strong> <span style="opacity: 0.8;">${new URL(url).hostname}</span>
            <br><br>
            What would you like to do?
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <button class="agent-choice-try" style="
              background: white;
              color: #FF6B6B;
              border: none;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              flex: 1;
              min-width: 100px;
              transition: all 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              ✓ Try Anyway
            </button>
            <button class="agent-choice-skip" style="
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: 2px solid white;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              flex: 1;
              min-width: 100px;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              ⏭️ Skip URL
            </button>
            <button class="agent-choice-login" style="
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: 2px solid white;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              flex: 1;
              min-width: 100px;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              🔐 Let Me Login
            </button>
          </div>
          <div style="font-size: 11px; color: white; opacity: 0.8; line-height: 1.4;">
            <strong>Try:</strong> Continue extraction (login is optional)<br>
            <strong>Skip:</strong> Try a different URL from search results<br>
            <strong>Login:</strong> Pause task, I'll login manually then resume
          </div>
        </div>
      `;
      
      stepsContainer.appendChild(choiceSection);
      
      // Attach button handlers
      const tryBtn = choiceSection.querySelector('.agent-choice-try');
      const skipBtn = choiceSection.querySelector('.agent-choice-skip');
      const loginBtn = choiceSection.querySelector('.agent-choice-login');
      
      tryBtn.addEventListener('click', () => {
        choiceSection.remove();
        resolve('try');
      });
      
      skipBtn.addEventListener('click', () => {
        choiceSection.remove();
        resolve('skip');
      });
      
      loginBtn.addEventListener('click', () => {
        choiceSection.remove();
        resolve('login');
      });
    });
  }
  
  /**
   * Show login pause UI with resume button
   */
  showLoginPause(url, collectedData) {
    if (!this.panel) return;
    
    // Update status
    this.updateStatus('⏸️ Login required - paused');
    
    const stepsContainer = this.panel.querySelector('.agent-steps');
    if (!stepsContainer) return;
    
    // Remove any existing resume section
    const existing = this.panel.querySelector('.agent-resume-section');
    if (existing) existing.remove();
    
    // Add resume section
    const resumeSection = document.createElement('div');
    resumeSection.className = 'agent-resume-section';
    resumeSection.innerHTML = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin: 12px 0;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #856404;">🔐 Login Required</div>
        <div style="font-size: 13px; color: #856404; margin-bottom: 12px;">
          Please login at: <a href="${url}" target="_blank" style="color: #007bff; text-decoration: underline;">${new URL(url).hostname}</a>
        </div>
        <div style="font-size: 12px; margin-bottom: 8px; color: #856404;">
          Data collected so far: ${Object.keys(collectedData || {}).length} items
        </div>
        <button class="agent-resume-btn" style="
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">
          ▶️ Resume Task After Login
        </button>
      </div>
    `;
    
    stepsContainer.appendChild(resumeSection);
    
    // Attach resume handler
    const resumeBtn = resumeSection.querySelector('.agent-resume-btn');
    resumeBtn.addEventListener('click', async () => {
      this.updateStatus('🔄 Resuming task...');
      resumeSection.remove();
      
      // Trigger resume in agent
      const agent = window.ChromeAIStudio?.autonomousAgent;
      if (agent) {
        try {
          await agent.resumeTask();
        } catch (error) {
          console.error('Failed to resume task:', error);
          this.setError('Failed to resume: ' + error.message);
        }
      } else {
        console.error('Autonomous agent not found');
        this.setError('Agent not available');
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentProgressUI;
} else if (typeof window !== 'undefined') {
  window.AgentProgressUI = AgentProgressUI;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.agentProgressUI = new AgentProgressUI();
}

