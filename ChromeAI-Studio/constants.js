/**
 * ChromeAI Studio - Constants
 * Central configuration and constants for the extension
 */

// API Availability States
const API_STATES = {
  UNAVAILABLE: 'unavailable',
  DOWNLOADABLE: 'after-download',
  READY: 'readily'
};

// Error Codes
const ERROR_CODES = {
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SESSION_DESTROYED: 'SESSION_DESTROYED',
  DETECTION_FAILED: 'DETECTION_FAILED',
  DETECTION_ERROR: 'DETECTION_ERROR',
  PROOFREAD_ERROR: 'PROOFREAD_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// API Default Options
const API_DEFAULTS = {
  PROMPT: {
    temperature: 0.7,
    topK: 20
  },
  SUMMARIZER: {
    type: 'key-points',
    format: 'markdown',
    length: 'medium'
  },
  WRITER: {
    tone: 'casual',
    format: 'plain-text',
    length: 'medium'
  },
  REWRITER: {
    tone: 'as-is',
    format: 'plain-text',
    length: 'as-is'
  },
  PROOFREADER: {
    includeCorrectionTypes: true,
    includeCorrectionExplanations: true,
    expectedInputLanguages: ['en']
  }
};

// Maximum Input Sizes (in bytes)
const MAX_INPUT_SIZES = {
  PROMPT: 32 * 1024, // 32KB
  SUMMARIZER: 100 * 1024, // 100KB
  WRITER: 10 * 1024, // 10KB
  TRANSLATOR: 50 * 1024, // 50KB
  REWRITER: 50 * 1024, // 50KB
  PROOFREADER: 50 * 1024 // 50KB
};

// UI Constants
const UI_CONSTANTS = {
  SIDEBAR_MIN_WIDTH: 320,
  SIDEBAR_MAX_WIDTH: 600,
  SIDEBAR_DEFAULT_WIDTH: 400,
  Z_INDEX_BASE: 999999,
  ANIMATION_DURATION: 400 // ms
};

// Supported Languages for Translation
const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' }
];

// Event Types
const EVENT_TYPES = {
  AI_REQUEST: 'ai:request',
  AI_RESPONSE: 'ai:response',
  AI_SUCCESS: 'ai:success',
  AI_ERROR: 'ai:error',
  UI_SIDEBAR_OPEN: 'ui:sidebar:open',
  UI_SIDEBAR_CLOSE: 'ui:sidebar:close',
  UI_SIDEBAR_TOGGLE: 'ui:sidebar:toggle',
  UI_BUBBLE_SHOW: 'ui:bubble:show',
  UI_BUBBLE_HIDE: 'ui:bubble:hide',
  UI_BUBBLE_MOVE: 'ui:bubble:move',
  UI_SELECTION_START: 'ui:selection:start',
  UI_SELECTION_END: 'ui:selection:end',
  MODE_CHANGED: 'mode:changed',
  ERROR_SHOW: 'error:show',
  SUCCESS_SHOW: 'success:show',
  CHROMEAI_READY: 'chromeai:ready'
};

// Make constants available globally
if (typeof window !== 'undefined') {
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.constants = {
    API_STATES,
    ERROR_CODES,
    API_DEFAULTS,
    MAX_INPUT_SIZES,
    UI_CONSTANTS,
    SUPPORTED_LANGUAGES,
    EVENT_TYPES
  };
}