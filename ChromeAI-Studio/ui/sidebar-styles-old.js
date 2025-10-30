/**
 * ChromeAI Studio - Smart Sidebar Styles Module (Old Implementation)
 * Exact copy of styles from the old smart-sidebar.js
 */

class SidebarStylesOld {
  constructor(sidebar) {
    this.sidebar = sidebar;
    this.injectedStyles = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize styles system
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      this.injectStyles();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SidebarStylesOld:', error);
    }
  }

  /**
   * Apply theme (required method)
   */
  applyTheme(theme) {
    // Theme application logic - basic implementation
    // The old implementation doesn't have complex theming
    // This is just to prevent the error
  }

  /**
   * Inject sidebar styles - copied from old implementation
   */
  injectStyles() {
    const styles = `
      .ai-sidebar {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: var(--ai-surface);
        border-left: 1px solid var(--ai-border);
        box-shadow: var(--ai-shadow-elevated);
        backdrop-filter: var(--ai-backdrop-blur);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }
      
      .ai-workspace {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ai-surface);
      }
      
      .ai-sidebar * {
        box-sizing: border-box;
      }
      
      .ai-sidebar-header {
        padding: var(--space-5) var(--space-6);
        background: var(--ai-bg-secondary);
        color: var(--ai-text-primary);
        border-bottom: 1px solid var(--ai-border-light);
        flex-shrink: 0;
      }
      
      .ai-sidebar-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .ai-sidebar-logo {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--ai-text-primary);
      }
      
      .ai-sidebar-logo svg {
        width: 24px;
        height: 24px;
        color: var(--ai-text-secondary);
      }
      
      .ai-sidebar-close {
        background: var(--ai-button-secondary-bg);
        border: 1px solid var(--ai-border);
        border-radius: var(--radius-lg);
        color: var(--ai-text-secondary);
        cursor: pointer;
        padding: var(--space-2);
        transition: all var(--transition-base);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-sidebar-close:hover {
        background: var(--ai-button-secondary-hover);
        color: var(--ai-text-primary);
      }
      
      .ai-sidebar-close:active {
        transform: scale(0.95);
      }

      .ai-content-area {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .ai-workspace {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
      }

      .ai-chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #ffffff;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        padding: 0 10px;
      }
      
      .ai-welcome-message {
        text-align: center;
        padding: 40px 20px;
        color: #6b7280;
        max-width: 320px;
        margin: 0 auto;
      }
      
      .welcome-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: float 3s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      
      .ai-welcome-message h3 {
        margin: 0 0 12px 0;
        font-size: 24px;
        font-weight: 600;
        color: #111827;
      }
      
      .ai-welcome-message p {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: #6b7280;
      }
      
      .ai-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
        position: sticky;
        bottom: 0;
        z-index: 2147483646 !important;
        box-shadow: 0 -6px 12px rgba(16,24,40,0.03);
        flex-shrink: 0;
      }
      
      .ai-input-wrapper-with-mentions {
        position: relative;
        flex: 1;
      }
      
      .ai-mention-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 200px;
        overflow-y: auto;
        z-index: 2147483647 !important;
        margin-bottom: 4px;
        /* Hide scrollbar */
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* Internet Explorer 10+ */
      }
      
      .ai-mention-dropdown::-webkit-scrollbar {
        display: none; /* WebKit browsers */
      }
      
      .ai-mention-item {
        padding: 10px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid #f3f4f6;
        transition: background 0.2s ease;
      }
      
      .ai-mention-item:hover, .ai-mention-item.selected {
        background: #f8fafc;
      }
      
      .ai-mention-item:last-child {
        border-bottom: none;
      }
      
      .mention-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: 600;
      }
      
      .mention-icon.promptai { background: #6366f1; }
      .mention-icon.writer { background: #10b981; }
      .mention-icon.rewriter { background: #f59e0b; }
      .mention-icon.summarizer { background: #8b5cf6; }
      .mention-icon.translator { background: #ef4444; }
      
      .mention-details {
        flex: 1;
      }
      
      .mention-name {
        font-weight: 600;
        color: #111827;
        font-size: 14px;
      }
      
      .mention-desc {
        font-size: 12px;
        color: #6b7280;
        margin-top: 2px;
      }

      .ai-input-wrapper {
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }
      
      .ai-input-field {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        transition: all 0.2s ease;
        background: #ffffff;
        color: #111827;
        font-family: inherit;
        min-height: 40px;
        max-height: 100px;
      }
      
      .ai-input-field:focus {
        outline: none;
        border-color: #9ca3af;
        box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
      }
      
      .ai-input-field::placeholder {
        color: #9ca3af;
      }
      
      .ai-send-button {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        color: #6b7280;
        cursor: pointer;
        padding: 10px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        height: 40px;
      }
      
      .ai-send-button:hover:not(:disabled) {
        background: #e5e7eb;
        color: #374151;
      }
      
      .ai-send-button:active:not(:disabled) {
        transform: scale(0.95);
      }
      
      .ai-send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .ai-send-button svg {
        width: 16px;
        height: 16px;
      }
      
      .ai-message {
        margin-bottom: 16px;
        opacity: 0;
        animation: slideIn 0.3s ease forwards;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(15px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .ai-message-user {
        background: #f3f4f6;
        color: #111827;
        padding: 12px 16px;
        border-radius: 16px 16px 4px 16px;
        margin: 8px 20px 8px 60px;
        border: 1px solid #e5e7eb;
        font-size: 14px;
        line-height: 1.5;
        max-width: calc(100% - 80px);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .ai-message-user .message-content {
        /* Trim user message to one line */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      
      .ai-message-ai {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 20px;
        border-radius: 16px 16px 16px 4px;
        margin: 8px 20px 8px 60px;
        position: relative;
        font-size: 14px;
        line-height: 1.6;
        color: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        max-width: calc(100% - 80px);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .ai-message-ai::before {
        content: '🤖';
        position: absolute;
        left: -32px;
        top: 16px;
        font-size: 16px;
        background: #ffffff;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #e5e7eb;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Streaming message styles */
      .ai-message-streaming .streaming-indicator {
        font-size: 13px;
        font-weight: 600;
        opacity: 0.8;
        margin-left: 6px;
        color: #4285f4;
      }

      .ai-message-streaming .streaming-cursor {
        display: inline-block;
        animation: blink 1s infinite;
        margin-left: 2px;
        color: var(--ai-primary, #3b82f6);
      }

      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }

      .ai-message-error {
        border-left: 3px solid var(--ai-error, #ef4444);
      }

      .ai-message-error .message-header {
        color: var(--ai-error, #ef4444);
      }

      /* AI Message with Avatar Layout */
      .ai-message[data-has-avatar="true"] {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
        margin-right: 16px;
        margin-left: 16px;
      }

      .ai-message-avatar {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .siri-avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .ai-message-content-wrapper {
        flex: 1;
        min-width: 0;
      }

      .ai-message[data-has-avatar="true"] .message-header {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .ai-message[data-has-avatar="true"] .message-content {
        background: #f8fafc;
        color: #1f2937;
        padding: 16px 20px;
        border-radius: 18px 18px 18px 4px;
        margin-right: 0;
        margin-left: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
        line-height: 1.7;
        font-size: 15px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        /* Make content broader and better structured */
        max-width: 100%;
        width: 100%;
        min-height: 60px;
        /* Better spacing for comprehensive content */
        text-align: left;
        position: relative;
      }

      /* Dark theme adjustments for AI messages */
      .ai-sidebar[data-theme="dark"] .ai-message[data-has-avatar="true"] .message-content {
        background: #374151;
        color: #f9fafb;
        border-color: #4b5563;
      }

      .ai-sidebar[data-theme="dark"] .ai-message[data-has-avatar="true"] .message-header {
        color: #9ca3af;
      }

      /* AI Thinking State in Avatar */
      .ai-message-avatar.ai-thinking {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        font-size: 11px;
        font-weight: 700;
        text-align: center;
        padding: 12px;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        min-width: 48px;
        min-height: 48px;
      }

      .thinking-dots {
        display: flex;
        gap: 3px;
        margin-bottom: 6px;
      }

      .thinking-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
        animation: thinkingPulse 1.2s infinite ease-in-out;
        box-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
      }

      .thinking-dot:nth-child(1) {
        animation-delay: -0.24s;
      }

      .thinking-dot:nth-child(2) {
        animation-delay: -0.12s;
      }

      .thinking-dot:nth-child(3) {
        animation-delay: 0s;
      }

      .thinking-text {
        font-size: 10px;
        font-weight: 700;
        opacity: 0.95;
        white-space: nowrap;
        color: white;
        margin-top: 2px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      @keyframes thinkingPulse {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      
      .typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #9ca3af;
        animation: typingPulse 1.4s infinite;
      }
      
      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes typingPulse {
        0%, 60%, 100% { 
          opacity: 0.4; 
        }
        30% { 
          opacity: 1; 
        }
      }
      
      .message-header {
        font-weight: 700;
        color: #111827;
        margin-bottom: 16px;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
    .message-content {
      line-height: 1.8;
      color: #374151;
      font-size: 15px;
      font-weight: 500;
      padding: 20px 24px;
      background: #f8f9fa;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      min-height: 80px;
      /* FIX: Remove flex, use block for proper text flow */
      display: block;
      /* FIX: Add proper text wrapping */
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      /* Make content broader and better structured */
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      /* Better spacing for longer content */
      margin: 0;
      /* Enhanced readability */
      text-align: left;
      /* Better structure for comprehensive content */
      position: relative;
    }
      
      .message-content h1,
      .message-content h2,
      .message-content h3 {
        color: #111827;
        margin: 16px 0 8px 0;
        font-weight: 600;
      }
      
      .message-content h1 { font-size: 18px; }
      .message-content h2 { font-size: 16px; }
      .message-content h3 { font-size: 14px; }
      
      .message-content p {
        margin: 0 0 12px 0;
      }
      
      .message-content ul,
      .message-content ol {
        margin: 12px 0;
        padding-left: 20px;
      }
      
      .message-content li {
        margin-bottom: 6px;
      }
      
      .message-content strong {
        font-weight: 600;
        color: #111827;
      }
      
      .message-content code {
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        border: 1px solid #e5e7eb;
        color: #374151;
      }
      
      .message-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .action-btn {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
        color: #6b7280;
        font-weight: 500;
      }
      
      .action-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .action-btn svg {
        width: 14px;
        height: 14px;
      }
      
      .ai-sidebar-logo svg {
        width: 24px;
        height: 24px;
      }

      .ai-sidebar-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
      
      /* Modern Header Styling */
      .ai-header {
        padding: 20px 24px 16px 24px;
        border-bottom: 1px solid #f0f0f0;
        background: #ffffff;
      }
      
      .ai-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .ai-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .ai-logo svg {
        width: 20px;
        height: 20px;
        color: #4f46e5;
      }
      
      .ai-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
  z-index: 1;
      }
      
.ai-settings-btn,
.ai-sidebar-close {
        width: 36px;
        height: 36px;
        border: none;
        background: none;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
  color: #111827;
  opacity: 1;
  pointer-events: auto;
      }
      
      .ai-settings-btn:hover,
      .ai-sidebar-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
.ai-settings-btn svg,
.ai-sidebar-close svg {
        width: 18px;
        height: 18px;
  display: block;
      }
      
      /* Modern Welcome Section */
      .ai-welcome-section {
        padding: 40px 32px 32px 32px;
        max-width: 100%;
      }
      
      .ai-greeting {
        margin-bottom: 32px;
        text-align: left;
      }
      
      .ai-greeting h2 {
        font-size: 32px;
        font-weight: 400;
        color: #1a1a1a;
        margin: 0 0 8px 0;
        line-height: 1.2;
      }
      
      .ai-greeting p {
        font-size: 18px;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
      }
      
      /* Modern Action Cards */
      .ai-action-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }
      
      .ai-action-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        position: relative;
      }
      
      .ai-action-card:hover {
        border-color: #d1d5db;
        background: #f9fafb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      
      .ai-action-card svg {
        width: 20px;
        height: 20px;
        color: #6b7280;
        flex-shrink: 0;
      }
      
      .ai-action-card span {
        flex: 1;
      }
      
      .ai-guide-card {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        border: none;
      }
      
      .ai-guide-card svg {
        color: #ffffff;
      }
      
      .ai-guide-card .arrow-icon {
        width: 16px;
        height: 16px;
        opacity: 0.8;
      }
      
      .ai-guide-card:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
      }
      
      .ai-content-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .ai-quick-actions-panel {
        background: var(--ai-background);
        border: 1px solid var(--ai-border);
        border-radius: 12px;
        padding: 16px;
      }
      
      .ai-panel-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ai-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ai-panel-title svg {
        width: 16px;
        height: 16px;
        color: var(--ai-primary);
      }
      
      .ai-quick-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .ai-quick-action {
        padding: 12px;
        border: 1px solid var(--ai-border);
        border-radius: 8px;
        background: var(--ai-surface);
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      
      .ai-quick-action:hover {
        background: var(--ai-hover);
        border-color: var(--ai-primary);
        transform: translateY(-1px);
      }
      
      .ai-quick-action.processing {
        pointer-events: none;
        opacity: 0.7;
      }
      
      .ai-quick-action-icon {
        width: 20px;
        height: 20px;
        color: var(--ai-primary);
      }
      
      .ai-quick-action-text {
        font-size: 12px;
        font-weight: 500;
        color: var(--ai-text-primary);
      }
      
      .ai-context-panel {
        background: var(--ai-background);
        border: 1px solid var(--ai-border);
        border-radius: 12px;
        padding: 16px;
      }
      
      .ai-context-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--ai-surface);
        border-radius: 8px;
        margin-bottom: 12px;
      }
      
      .ai-context-icon {
        width: 24px;
        height: 24px;
        padding: 4px;
        background: var(--ai-primary-light);
        border-radius: 6px;
        color: var(--ai-primary);
        flex-shrink: 0;
      }
      
      .ai-context-details h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--ai-text-primary);
      }
      
      .ai-context-details p {
        margin: 0;
        font-size: 12px;
        color: var(--ai-text-secondary);
        line-height: 1.4;
      }
      
      .ai-work-area {
        background: var(--ai-background);
        border: 1px solid var(--ai-border);
        border-radius: 12px;
        padding: 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 200px;
      }
      
      .ai-input-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .ai-input-field {
        width: 100%;
        min-height: 80px;
        padding: 12px;
        border: 1px solid var(--ai-border);
        border-radius: 8px;
        background: var(--ai-surface);
        color: var(--ai-text-primary);
        font-family: inherit;
        font-size: 14px;
        line-height: 1.4;
        resize: vertical;
        transition: border-color 0.2s ease;
      }
      
      .ai-input-field:focus {
        outline: none;
        border-color: var(--ai-primary);
        box-shadow: 0 0 0 2px var(--ai-primary-light);
      }
      
      .ai-input-field::placeholder {
        color: var(--ai-text-secondary);
      }
      
      .ai-action-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .ai-output-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .ai-output-area {
        flex: 1;
        padding: 16px;
        background: var(--ai-surface);
        border: 1px solid var(--ai-border);
        border-radius: 8px;
        min-height: 120px;
        color: var(--ai-text-primary);
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-y: auto;
      }
      
      .ai-output-area.empty {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ai-text-secondary);
        font-style: italic;
      }
      
      .ai-output-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .ai-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        cursor: ew-resize;
        background: transparent;
        z-index: 2147483646 !important;
      }
      
      .ai-resize-handle:hover,
      .ai-resize-handle.resizing {
        background: var(--ai-primary);
      }
      
      .ai-processing-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647 !important;
      }
      
      .ai-processing-content {
        text-align: center;
        color: var(--ai-text-primary);
      }
      
      .ai-processing-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--ai-border);
        border-top: 3px solid var(--ai-primary);
        border-radius: 50%;
        animation: ai-spin 1s linear infinite;
        margin: 0 auto 12px;
      }
      
      .ai-processing-text {
        font-size: 14px;
        font-weight: 500;
      }
      
      @keyframes ai-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .ai-sidebar {
          width: 100vw !important;
          left: 0;
        }
        
        .ai-quick-actions-grid {
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        }
      }
      
      /* Modern Input Area */
      .ai-input-area {
        padding: 20px 24px 24px 24px;
        border-top: 1px solid #f0f0f0;
        background: #ffffff;
        flex-shrink: 0;
        margin-top: auto;
      }
      
      .ai-input-container {
        display: flex;
        align-items: flex-end;
        gap: 12px;
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        background: #ffffff;
        transition: all 0.2s ease;
        margin-bottom: 12px;
      }
      
      .ai-input-container:focus-within {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }
      
      .ai-input-field {
        flex: 1;
        border: none;
        outline: none;
        resize: none;
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
        background: transparent;
        min-height: 20px;
        max-height: 120px;
        font-family: inherit;
      }
      
      .ai-input-field::placeholder {
        color: #9ca3af;
      }
      
      .ai-send-button {
        width: 32px;
        height: 32px;
        border: none;
        background: #4f46e5;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .ai-send-button:hover:not(:disabled) {
        background: #4338ca;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }
      
      .ai-send-button:disabled {
        background: #d1d5db;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      
      .ai-send-button svg {
        width: 16px;
        height: 16px;
        color: #ffffff;
      }

      .ai-footer-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 12px;
        color: #6b7280;
        text-decoration: none;
      }
      
      .ai-footer-btn:hover {
        border-color: #d1d5db;
        background: #f9fafb;
      }
      
      .ai-footer-btn svg {
        width: 14px;
        height: 14px;
      }

      /* Chat Messages Layout - Clean centered design */
      .ai-chat-messages {
        flex: 1 1 auto;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 20px 12px 140px 12px; /* reserve space so sticky input doesn't overlap content */
        scroll-behavior: smooth;
        box-sizing: border-box;
      }
      
      .ai-message {
        max-width: 75%;
        padding: 10px 14px;
        border-radius: 18px;
        margin: 0;
        line-height: 1.4;
        font-size: 14px;
        word-wrap: break-word;
        position: relative;
      }
      
      .ai-message-user {
        background: #f8f9fa;
        color: #374151;
        margin: 8px 30px 8px auto;
        border-radius: 18px 18px 4px 18px;
        font-size: 15px;
        line-height: 1.5;
        padding: 12px 16px;
        max-width: calc(100% - 80px);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .ai-message-user .message-content {
        /* Trim user message to one line */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      
      .ai-message-ai-response {
        background: #f0f0f0;
        color: #000;
        padding: 14px 18px;
        border-radius: 18px 18px 18px 4px;
        margin: 8px 30px 8px 60px;
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
        font-size: 15px;
        line-height: 1.55;
        max-width: calc(100% - 80px);
      }
      
      .ai-message-ai-response[data-has-avatar]::before {
        content: 'AI';
        position: absolute;
        left: -32px;
        top: 12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #6366f1;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* AI Assistant messages - prevent overflow */
      .ai-message-assistant {
        background: #f8f9fa;
        color: #000;
        padding: 16px 20px;
        border-radius: 18px 18px 18px 4px;
        margin: 8px 30px 8px 60px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      /* Enhanced streaming message styling */
      .ai-message-streaming {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        border: 2px solid #4285f4;
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
        font-size: 15px;
        line-height: 1.55;
        max-width: calc(100% - 80px);
        white-space: pre-wrap;
        overflow: hidden;
      }

      /* Message content formatting */
      .message-content {
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        max-width: 100%;
        overflow: hidden;
      }

      .message-header {
        font-weight: 600;
        margin-bottom: 8px;
        color: #6366f1;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Settings Panel Styles */
      .ai-settings-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
        z-index: 2147483646 !important;
        overflow-y: auto;
        padding: 20px;
      }
      
      .ai-settings-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }
      
      .ai-back-btn {
        background: none;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: all 0.2s ease;
      }
      
      .ai-back-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .ai-back-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .ai-settings-header h2 {
        margin: 0;
        flex: 1;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      .ai-reset-btn {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .ai-reset-btn:hover {
        background: #dc2626;
      }
      
      .ai-settings-content {
        flex: 1;
        overflow-y: auto;
        padding: 0 0 20px 0;
      }
      
      .ai-settings-section {
        padding: 20px;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .ai-settings-section:last-child {
        border-bottom: none;
      }
      
      .ai-settings-section h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ai-setting-item {
        margin-bottom: 16px;
      }
      
      .ai-setting-item:last-child {
        margin-bottom: 0;
      }
      
      .ai-setting-item label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 6px;
      }
      
      .ai-setting-item input[type="checkbox"] {
        margin-right: 8px;
      }
      
      .ai-setting-item input[type="range"] {
        width: 100%;
        margin: 8px 0;
      }
      
      .ai-setting-item select,
      .ai-setting-item input[type="text"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        color: #111827;
      }
      
      .ai-setting-item select:focus,
      .ai-setting-item input[type="text"]:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .ai-setting-item small {
        color: #6b7280;
        font-size: 12px;
        display: block;
        margin-top: 4px;
      }
      
      .wake-words-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .wake-word-item {
        display: flex;
        align-items: center;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 4px 8px 4px 12px;
        font-size: 12px;
        color: #374151;
      }
      
      .remove-wake-word {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        margin-left: 6px;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .remove-wake-word:hover {
        color: #ef4444;
      }
      
      .add-wake-word {
        display: flex;
        gap: 8px;
      }
      
      .add-wake-word input {
        flex: 1;
        font-size: 12px;
        padding: 6px 10px;
      }
      
      .add-wake-word button {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
      }
      
      .add-wake-word button:hover {
        background: #2563eb;
      }
      
      .ai-export-btn, .ai-import-btn {
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin-right: 12px;
        transition: all 0.2s ease;
      }
      
      .ai-export-btn:hover, .ai-import-btn:hover {
        background: #4b5563;
      }
      
      .ai-import-btn {
        background: #059669;
      }
      
      .ai-import-btn:hover {
        background: #047857;
      }

      /* Modern Settings Panel Styles */
      .ai-settings-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
        z-index: 2147483646 !important;
        overflow-y: auto;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
      
      .ai-settings-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        border-bottom: 1px solid #e9ecef;
        background: #ffffff;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      .ai-back-btn {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #6c757d;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        font-weight: 500;
      }
      
      .ai-back-btn:hover {
        background: #e9ecef;
        color: #495057;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .ai-back-btn svg {
        width: 16px;
        height: 16px;
        transition: transform 0.3s ease;
      }
      
      .ai-back-btn:hover svg {
        transform: translateX(-2px);
      }
      
      .ai-settings-title {
        margin: 0;
        flex: 1;
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .ai-reset-btn {
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-reset-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
      }
      
      .ai-settings-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        background: #f8f9fa;
      }
      
      /* Settings Cards */
      .ai-settings-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-settings-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
      
      .ai-settings-card-header {
        display: block;
        padding: 20px 24px;
        background: #ffffff;
        border-bottom: 1px solid #e9ecef;
        cursor: default;
      }
      
      .ai-settings-section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ai-settings-toggle {
        display: none !important;
      }
      
      .ai-settings-card-content {
        padding: 0 24px;
        overflow: visible;
        max-height: none !important;
        transition: none;
      }
      
      /* Setting Items */
      .ai-setting-item {
        padding: 20px 0;
        border-bottom: 1px solid #f1f3f4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      
      .ai-setting-item:last-child {
        border-bottom: none;
      }
      
      .ai-setting-label {
        flex: 1;
        min-width: 0;
      }
      
      .ai-setting-item label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
      }
      
      .setting-description {
        font-size: 12px;
        color: #6c757d;
        line-height: 1.4;
        margin-top: 4px;
      }
      
      /* Modern Select Styling */
      .ai-select-wrapper {
        position: relative;
        min-width: 140px;
      }
      
      .ai-select {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        background: #ffffff;
        color: #1a1a1a;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
      }
      
      .ai-select:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      
      .ai-select:hover {
        border-color: #d1d5db;
      }
      
      .ai-select-arrow {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: #6c757d;
        pointer-events: none;
        transition: transform 0.3s ease;
      }
      
      .ai-select-wrapper:hover .ai-select-arrow {
        color: #495057;
      }
      
      /* Modern Slider Styling */
      .ai-slider-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 200px;
      }
      
      .ai-slider {
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: #e9ecef;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        transition: all 0.3s ease;
      }
      
      .ai-slider::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6366f1;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }
      
      .ai-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6366f1;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
      }
      
      .ai-slider-track {
        position: absolute;
        top: 0;
        left: 0;
        height: 6px;
        background: #6366f1;
        border-radius: 3px;
        transition: width 0.3s ease;
        pointer-events: none;
      }
      
      .ai-slider-value {
        font-size: 14px;
        font-weight: 600;
        color: #6366f1;
        min-width: 50px;
        text-align: right;
      }
      
      /* Toggle Switch Styling */
      .ai-toggle-switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 24px;
      }
      
      .ai-toggle-input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .ai-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #e9ecef;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 24px;
      }
      
      .ai-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .ai-toggle-input:checked + .ai-toggle-slider {
        background-color: #6366f1;
      }
      
      .ai-toggle-input:checked + .ai-toggle-slider:before {
        transform: translateX(24px);
      }
      
      .ai-toggle-input:focus + .ai-toggle-slider {
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      
      /* Toggle Group Styling */
      .ai-toggle-group {
        display: flex;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 4px;
        gap: 4px;
      }
      
      .ai-toggle-group input[type="radio"] {
        display: none;
      }
      
      .ai-toggle-option {
        flex: 1;
        padding: 10px 16px;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        color: #6c757d;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-toggle-group input[type="radio"]:checked + .ai-toggle-option {
        background: #6366f1;
        color: white;
        box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
      }
      
      .ai-toggle-option:hover {
        color: #495057;
      }
      
      /* Button Styling */
      .ai-secondary-btn {
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-secondary-btn:hover {
        background: #5a6268;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
      }
      
      .ai-danger-btn {
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-danger-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
      }
      
      .ai-file-input {
        padding: 10px 16px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        background: #ffffff;
        color: #1a1a1a;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ai-file-input:hover {
        border-color: #d1d5db;
      }
      
      .ai-file-input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      
      /* Responsive Design */
      @media (max-width: 768px) {
        .ai-settings-content {
          padding: 16px;
        }
        
        .ai-settings-card-header {
          padding: 16px 20px;
        }
        
        .ai-setting-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        
        .ai-slider-wrapper {
          width: 100%;
          min-width: auto;
        }
        
        .ai-select-wrapper {
          width: 100%;
          min-width: auto;
        }
      }
      
      /* Smooth Animations */
      .ai-settings-panel * {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Focus States */
      .ai-settings-panel *:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      
      /* Loading States */
      .ai-settings-card.loading {
        opacity: 0.6;
        pointer-events: none;
      }
      
      .ai-settings-card.loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #e9ecef;
        border-top: 2px solid #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.id = 'chromeai-sidebar-styles-old';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.SidebarStylesOld = SidebarStylesOld;
}
