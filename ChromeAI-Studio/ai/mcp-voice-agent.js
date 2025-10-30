/**
 * ChromeAI Studio - MCP Voice Agent
 * Advanced conversational AI agent with Model Context Protocol (MCP) tools
 * Optimized for low-latency voice interactions with browser automation
 */

class MCPVoiceAgent {
  constructor() {
    this.session = null;
    this.isInitialized = false;
    this.isConversationActive = false;
    this.conversationHistory = [];
    this.currentRecognition = null;
    this.isSpeaking = false;
    this.turnCount = 0;
    
    // Performance optimizations
    this.preWarmedSessions = new Map();
    this.toolsCache = new Map();
    this.cachedTools = null; // Cache for MCP tools to avoid recreation
    this.toolsLastCreated = 0;
    this.toolsCacheTimeout = 1800000; // 30 minutes cache timeout
    
    // Pre-compile regex patterns for faster tool matching ✅
    this.toolPatterns = {
      music: /play\s+(?:music|song|trending|any)|play\s+.*on\s+youtube|play\s+.*by\s+/i,
      website: /(?:open|go to|visit)\s+(\w+)/i,
      search: /(?:search for|google)\s+(.+)/i,
      summarize: /(?:summarize|summary of|sum up|what's|what is).+(?:page|article|this)/i,
      scroll: /(?:scroll|move)\s+(?:up|down|to top|to bottom)/i,
      read: /(?:read|tell me|what does it say)/i,
      click: /(?:click|press|tap)\s+(?:on\s+)?(.+)/i,
      autonomousTask: /(?:research|find|compare|compile|create|get|extract|list|analyze|investigate|study|explore|look up|gather|collect)/i
    };
    
  }

  /**
   * Pre-warm the session for faster response (called on page load)
   */
  async preWarmSession() {
    if (this.isInitialized) {
      return;
    }

    try {
      
      // Use requestIdleCallback to avoid blocking page load
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          await this.initialize();
        }, { timeout: 2000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => this.initialize(), 1000);
      }
    } catch (error) {
      console.warn('⚠️ Pre-warming failed:', error);
    }
  }

  /**
   * Initialize the MCP Voice Agent with tools
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      
      // Check if LanguageModel API is available
      if (typeof LanguageModel === 'undefined') {
        console.warn('⚠️ LanguageModel API not available, using fallback mode');
        this.isInitialized = true;
        return;
      }
      
      // Create optimized session with system prompt and tools
      this.session = await LanguageModel.create({
        temperature: 0.7,
        topK: 20,
        outputLanguage: 'en',
        initialPrompts: [
          {
            role: "system",
            content: `You are an advanced AI voice assistant with comprehensive browser automation capabilities. 

PERSONALITY:
- Be conversational, helpful, and concise
- Respond in 1-2 sentences maximum for voice interactions  
- Use tools proactively when users request actions
- Think creatively about what users need

CORE CAPABILITIES:
- Execute complex multi-step tasks autonomously (research, data collection, comparisons, forms)
- Summarize web pages with progress updates
- Control browser navigation and tabs
- Control media playback
- Search the web
- Scroll and read page content
- Click elements and fill forms
- Extract and process data
- Get system information

AUTONOMOUS TASK EXECUTION:
- Use executeAutonomousTask for complex requests requiring multiple steps
- The agent plans and executes automatically
- Provides voice progress updates throughout
- Fully automated from start to finish

PAGE SUMMARIZATION:
- Use summarizePage tool when users request summaries
- Choose format based on request: brief, detailed, or bullet-points
- System provides automatic progress updates for long pages

INTELLIGENT TOOL USAGE:
- Interpret user intent creatively
- Choose appropriate tools based on the task
- Be specific with queries and search terms
- Think about what would best satisfy the user's request

VOICE INTERACTION:
- Keep responses brief (1-2 sentences max)
- Be proactive - interpret intent without asking for clarification
- Always respond in English
- Natural, conversational tone

You have powerful browser automation tools. Use them efficiently to help users!`
          }
        ],
        tools: await this.getMCPTools()
      });

      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP Voice Agent:', error);
      // Don't throw error, just mark as not initialized
      this.isInitialized = false;
    }
  }

  /**
   * Get cached MCP tools or create new ones if cache is expired
   */
  async getMCPTools() {
    const now = Date.now();
    
    // Return cached tools if they exist and are not expired
    if (this.cachedTools && (now - this.toolsLastCreated) < this.toolsCacheTimeout) {
      return this.cachedTools;
    }
    
    // Create new tools and cache them
    this.cachedTools = await this.createMCPTools();
    this.toolsLastCreated = now;
    
    return this.cachedTools;
  }

  /**
   * Create MCP tools for browser automation
   */
  async createMCPTools() {
    // Get basic tools
    const basicTools = [
      // Web Navigation Tools
      {
        name: "openWebsite",
        description: "Open a website in the current tab or new tab",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to open (can be domain name or full URL)"
            },
            newTab: {
              type: "boolean", 
              description: "Whether to open in new tab (default: false)"
            }
          },
          required: ["url"]
        },
        async execute({ url, newTab = false }) {
          try {
            // Smart URL handling
            let fullUrl = url;
            if (!url.startsWith('http')) {
              fullUrl = url.includes('.') ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
            
            if (newTab) {
              window.open(fullUrl, '_blank');
              return `Opened ${url} in a new tab`;
            } else {
              window.location.href = fullUrl;
              return `Opening ${url} in current tab`;
            }
          } catch (error) {
            return `Failed to open ${url}: ${error.message}`;
          }
        }
      },

      // Media Control Tools  
      {
        name: "controlAudio",
        description: "Control audio playback on the current page",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play", "pause", "toggle", "mute", "unmute"],
              description: "The audio control action to perform"
            },
            volume: {
              type: "number",
              description: "Set volume level (0-1), optional"
            }
          },
          required: ["action"]
        },
        async execute({ action, volume }) {
          try {
            const audioElements = document.querySelectorAll('audio, video');
            let results = [];
            
            audioElements.forEach((media, index) => {
              switch (action) {
                case 'play':
                  media.play();
                  results.push(`Playing audio ${index + 1}`);
                  break;
                case 'pause':
                  media.pause();
                  results.push(`Paused audio ${index + 1}`);
                  break;
                case 'toggle':
                  if (media.paused) {
                    media.play();
                    results.push(`Playing audio ${index + 1}`);
                  } else {
                    media.pause();
                    results.push(`Paused audio ${index + 1}`);
                  }
                  break;
                case 'mute':
                  media.muted = true;
                  results.push(`Muted audio ${index + 1}`);
                  break;
                case 'unmute':
                  media.muted = false;
                  results.push(`Unmuted audio ${index + 1}`);
                  break;
              }
              
              if (volume !== undefined) {
                media.volume = Math.max(0, Math.min(1, volume));
                results.push(`Set volume to ${Math.round(volume * 100)}%`);
              }
            });
            
            return results.length > 0 ? results.join(', ') : 'No audio/video elements found on this page';
          } catch (error) {
            return `Audio control failed: ${error.message}`;
          }
        }
      },

      // Tab Management
      {
        name: "manageTab",
        description: "Manage browser tabs (close, refresh, go back/forward)",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["close", "refresh", "back", "forward", "reload"],
              description: "The tab action to perform"
            }
          },
          required: ["action"]
        },
        async execute({ action }) {
          try {
            switch (action) {
              case 'close':
                window.close();
                return 'Closing current tab';
              case 'refresh':
              case 'reload':
                window.location.reload();
                return 'Refreshing page';
              case 'back':
                window.history.back();
                return 'Going back';
              case 'forward':
                window.history.forward();
                return 'Going forward';
              default:
                return `Unknown tab action: ${action}`;
            }
          } catch (error) {
            return `Tab management failed: ${error.message}`;
          }
        }
      },

      // Search and Navigation
      {
        name: "searchWeb",
        description: "Search the web using Google",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            newTab: {
              type: "boolean",
              description: "Whether to open search in new tab (default: false)"
            }
          },
          required: ["query"]
        },
        async execute({ query, newTab = false }) {
          try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            
            if (newTab) {
              window.open(searchUrl, '_blank');
              return `Searching for "${query}" in new tab`;
            } else {
              window.location.href = searchUrl;
              return `Searching for "${query}"`;
            }
          } catch (error) {
            return `Search failed: ${error.message}`;
          }
        }
      },

      // Page Information
      {
        name: "getPageInfo",
        description: "Get information about the current page",
        inputSchema: {
          type: "object",
          properties: {
            info: {
              type: "string",
              enum: ["title", "url", "text", "links", "images"],
              description: "Type of information to retrieve"
            }
          },
          required: ["info"]
        },
        async execute({ info }) {
          try {
            switch (info) {
              case 'title':
                return `Page title: ${document.title}`;
              case 'url':
                return `Current URL: ${window.location.href}`;
              case 'text':
                const text = document.body.innerText.substring(0, 500);
                return `Page text preview: ${text}${text.length >= 500 ? '...' : ''}`;
              case 'links':
                const links = Array.from(document.querySelectorAll('a[href]'))
                  .slice(0, 10)
                  .map(a => a.textContent.trim() + ' (' + a.href + ')')
                  .join(', ');
                return `Links: ${links}`;
              case 'images':
                const images = Array.from(document.querySelectorAll('img[src]'))
                  .slice(0, 5)
                  .map(img => img.alt || img.src)
                  .join(', ');
                return `Images: ${images}`;
              default:
                return `Unknown info type: ${info}`;
            }
          } catch (error) {
            return `Failed to get page info: ${error.message}`;
          }
        }
      },

      // Browser Storage
      {
        name: "browserStorage",
        description: "Manage browser storage (localStorage, sessionStorage)",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["get", "set", "remove", "clear"],
              description: "Storage action to perform"
            },
            storage: {
              type: "string", 
              enum: ["local", "session"],
              description: "Which storage to use (default: local)"
            },
            key: {
              type: "string",
              description: "Storage key"
            },
            value: {
              type: "string",
              description: "Value to store (for set action)"
            }
          },
          required: ["action"]
        },
        async execute({ action, storage = "local", key, value }) {
          try {
            const storageObj = storage === "session" ? sessionStorage : localStorage;
            
            switch (action) {
              case 'get':
                if (!key) return 'Key required for get action';
                const item = storageObj.getItem(key);
                return item ? `${key}: ${item}` : `No value found for key: ${key}`;
              case 'set':
                if (!key || value === undefined) return 'Key and value required for set action';
                storageObj.setItem(key, value);
                return `Stored ${key} in ${storage} storage`;
              case 'remove':
                if (!key) return 'Key required for remove action';
                storageObj.removeItem(key);
                return `Removed ${key} from ${storage} storage`;
              case 'clear':
                storageObj.clear();
                return `Cleared all ${storage} storage`;
              default:
                return `Unknown storage action: ${action}`;
            }
          } catch (error) {
            return `Storage operation failed: ${error.message}`;
          }
        }
      },

      // System Information
      {
        name: "getSystemInfo",
        description: "Get browser and system information",
        inputSchema: {
          type: "object",
          properties: {
            info: {
              type: "string",
              enum: ["browser", "screen", "connection", "performance", "time"],
              description: "Type of system info to retrieve"
            }
          },
          required: ["info"]
        },
        async execute({ info }) {
          try {
            switch (info) {
              case 'browser':
                return `Browser: ${navigator.userAgent.split(' ')[0]} on ${navigator.platform}`;
              case 'screen':
                return `Screen: ${screen.width}x${screen.height}, Available: ${screen.availWidth}x${screen.availHeight}`;
              case 'connection':
                const conn = navigator.connection;
                return conn ? `Connection: ${conn.type || 'unknown'}, Speed: ${conn.downlink || 'unknown'}Mbps` : 'Connection info not available';
              case 'performance':
                const perf = performance.now();
                return `Page loaded ${Math.round(perf)}ms ago, Memory: ${navigator.deviceMemory || 'unknown'}GB`;
              case 'time':
                return `Current time: ${new Date().toLocaleString()}`;
              default:
                return `Unknown system info: ${info}`;
            }
          } catch (error) {
            return `Failed to get system info: ${error.message}`;
          }
        }
      },

      // Page Summarization with Progress Updates
      {
        name: "summarizePage",
        description: "Summarize the content of the current page with progress updates for long pages",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["brief", "detailed", "bullet-points"],
              description: "Summary format (default: brief)"
            }
          }
        },
        async execute({ format = "brief" }) {
          try {
            
            // Announce start
            const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
            if (mcpVoiceInterface) {
              await mcpVoiceInterface.speak("I'm analyzing this page. Please wait while I generate a summary.");
            }
            
            // Extract page content (same as floating bubble)
            const extractPageContent = () => {
              const title = document.title;
              const mainContent = document.querySelector('article, main, [role="main"], .content, #content');
              let text = '';
              
              if (mainContent) {
                text = mainContent.innerText;
              } else {
                const paragraphs = document.querySelectorAll('p, h1, h2, h3, li');
                text = Array.from(paragraphs)
                  .map(p => p.innerText)
                  .filter(t => t.trim().length > 20)
                  .join('\n');
              }
              
              return `Page Title: ${title}\n\nContent:\n${text}`;
            };
            
            const pageContent = extractPageContent();
            
            if (!pageContent || pageContent.length < 100) {
              return 'This page does not have enough content to summarize.';
            }
            
            
            // Check content length and provide updates for long content
            const isLongContent = pageContent.length > 5000;
            let updateInterval = null;
            
            if (isLongContent && mcpVoiceInterface) {
              let updateCount = 0;
              const updates = [
                "Still working on the summary...",
                "Almost done analyzing the page...",
                "Generating your summary now..."
              ];
              
              updateInterval = setInterval(async () => {
                if (updateCount < updates.length) {
                  await mcpVoiceInterface.speak(updates[updateCount]);
                  updateCount++;
                }
              }, 5000); // Update every 5 seconds
            }
            
            try {
              // Try to use AI for summarization
              let summary = '';
              
              // Try Chrome AI Summarizer API first
              if (typeof window.ai?.summarizer !== 'undefined') {
                const summarizer = await window.ai.summarizer.create({
                  type: format === 'brief' ? 'tl;dr' : 'key-points',
                  format: format === 'bullet-points' ? 'markdown' : 'plain-text',
                  length: format === 'detailed' ? 'long' : 'medium'
                });
                
                summary = await summarizer.summarize(pageContent);
                await summarizer.destroy();
              }
              // Fallback to LanguageModel API
              else if (typeof LanguageModel !== 'undefined') {
                const session = await LanguageModel.create({
                  temperature: 0.5,
                  topK: 20,
                  outputLanguage: 'en'
                });
                
                const prompt = format === 'bullet-points' 
                  ? `Summarize the following page content in bullet points:\n\n${pageContent.slice(0, 8000)}`
                  : `Provide a ${format} summary of the following page:\n\n${pageContent.slice(0, 8000)}`;
                
                summary = await session.prompt(prompt);
                await session.destroy();
              }
              // Final fallback: extract key sentences
              else {
                const sentences = pageContent.split(/[.!?]+/).filter(s => s.trim().length > 30);
                summary = sentences.slice(0, 5).join('. ') + '.';
              }
              
              // Clear update interval
              if (updateInterval) {
                clearInterval(updateInterval);
              }
              
              
              return summary || 'Unable to generate summary for this page.';
              
            } catch (error) {
              if (updateInterval) {
                clearInterval(updateInterval);
              }
              console.error('📄 Summarization error:', error);
              return `Failed to summarize page: ${error.message}`;
            }
          } catch (error) {
            console.error('📄 Page summary tool error:', error);
            return `Error summarizing page: ${error.message}`;
          }
        }
      },

      // Scroll Control
      {
        name: "scrollPage",
        description: "Scroll the page up, down, to top, or to bottom",
        inputSchema: {
          type: "object",
          properties: {
            direction: {
              type: "string",
              enum: ["up", "down", "top", "bottom"],
              description: "Scroll direction"
            },
            amount: {
              type: "number",
              description: "Scroll amount in pixels (optional, for up/down)"
            }
          },
          required: ["direction"]
        },
        async execute({ direction, amount = 500 }) {
          try {
            switch (direction) {
              case 'up':
                window.scrollBy({ top: -amount, behavior: 'smooth' });
                return `Scrolled up ${amount} pixels`;
              case 'down':
                window.scrollBy({ top: amount, behavior: 'smooth' });
                return `Scrolled down ${amount} pixels`;
              case 'top':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return 'Scrolled to top of page';
              case 'bottom':
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                return 'Scrolled to bottom of page';
              default:
                return `Unknown scroll direction: ${direction}`;
            }
          } catch (error) {
            return `Scroll failed: ${error.message}`;
          }
        }
      },

      // Read Page Content
      {
        name: "readPageContent",
        description: "Read and return specific content from the current page",
        inputSchema: {
          type: "object",
          properties: {
            contentType: {
              type: "string",
              enum: ["headings", "paragraphs", "all-text", "first-paragraph", "main-content"],
              description: "Type of content to read"
            },
            maxLength: {
              type: "number",
              description: "Maximum characters to return (default: 1000)"
            }
          },
          required: ["contentType"]
        },
        async execute({ contentType, maxLength = 1000 }) {
          try {
            let content = '';
            
            switch (contentType) {
              case 'headings':
                const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                  .map(h => h.textContent.trim())
                  .filter(t => t.length > 0)
                  .slice(0, 10);
                content = headings.join('; ');
                break;
              
              case 'paragraphs':
                const paragraphs = Array.from(document.querySelectorAll('p'))
                  .map(p => p.textContent.trim())
                  .filter(t => t.length > 50)
                  .slice(0, 5);
                content = paragraphs.join(' ');
                break;
              
              case 'first-paragraph':
                const firstP = document.querySelector('p');
                content = firstP ? firstP.textContent.trim() : 'No paragraph found';
                break;
              
              case 'main-content':
                const main = document.querySelector('article, main, [role="main"]');
                content = main ? main.textContent.trim() : document.body.textContent.trim();
                break;
              
              case 'all-text':
                content = document.body.textContent.trim();
                break;
              
              default:
                return `Unknown content type: ${contentType}`;
            }
            
            // Truncate if needed
            if (content.length > maxLength) {
              content = content.substring(0, maxLength) + '...';
            }
            
            return content || 'No content found';
          } catch (error) {
            return `Failed to read page content: ${error.message}`;
          }
        }
      },

      // Find and Click Elements
      {
        name: "clickElement",
        description: "Find and click an element on the page by text content or selector",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text content to find and click"
            },
            selector: {
              type: "string",
              description: "CSS selector (alternative to text)"
            },
            elementType: {
              type: "string",
              enum: ["button", "link", "any"],
              description: "Type of element to click (default: any)"
            }
          }
        },
        async execute({ text, selector, elementType = "any" }) {
          try {
            let element = null;
            
            if (selector) {
              element = document.querySelector(selector);
            } else if (text) {
              // Search for element by text
              const searchSelectors = {
                button: 'button, [role="button"], input[type="button"], input[type="submit"]',
                link: 'a',
                any: 'button, a, [role="button"], input[type="button"], input[type="submit"]'
              };
              
              const elements = document.querySelectorAll(searchSelectors[elementType]);
              element = Array.from(elements).find(el => 
                el.textContent.toLowerCase().includes(text.toLowerCase())
              );
            }
            
            if (element) {
              element.click();
              return `Clicked element: ${element.textContent?.substring(0, 50) || selector || text}`;
            } else {
              return `Element not found: ${text || selector}`;
            }
          } catch (error) {
            return `Click failed: ${error.message}`;
          }
        }
      },

      // Screenshot/Capture Page
      {
        name: "capturePage",
        description: "Get information about what's visible on the current page",
        inputSchema: {
          type: "object",
          properties: {
            detail: {
              type: "string",
              enum: ["basic", "detailed"],
              description: "Level of detail to capture (default: basic)"
            }
          }
        },
        async execute({ detail = "basic" }) {
          try {
            const info = {
              title: document.title,
              url: window.location.href,
              scrollPosition: window.scrollY,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              }
            };
            
            if (detail === 'detailed') {
              info.visibleHeadings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .filter(h => {
                  const rect = h.getBoundingClientRect();
                  return rect.top >= 0 && rect.top <= window.innerHeight;
                })
                .map(h => h.textContent.trim())
                .slice(0, 5);
              
              info.visibleImages = Array.from(document.querySelectorAll('img'))
                .filter(img => {
                  const rect = img.getBoundingClientRect();
                  return rect.top >= 0 && rect.top <= window.innerHeight;
                })
                .map(img => img.alt || img.src)
                .slice(0, 3);
            }
            
            return JSON.stringify(info, null, 2);
          } catch (error) {
            return `Failed to capture page info: ${error.message}`;
          }
        }
      },

      // Form Interaction
      {
        name: "fillForm",
        description: "Fill form fields on the current page",
        inputSchema: {
          type: "object",
          properties: {
            fieldName: {
              type: "string",
              description: "Name or label of the form field"
            },
            value: {
              type: "string",
              description: "Value to fill in the field"
            }
          },
          required: ["fieldName", "value"]
        },
        async execute({ fieldName, value }) {
          try {
            // Try to find input by name, id, or associated label
            let input = document.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
            
            if (!input) {
              input = document.getElementById(fieldName);
            }
            
            if (!input) {
              // Search by label text
              const labels = Array.from(document.querySelectorAll('label'));
              const label = labels.find(l => l.textContent.toLowerCase().includes(fieldName.toLowerCase()));
              if (label && label.htmlFor) {
                input = document.getElementById(label.htmlFor);
              }
            }
            
            if (input) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return `Filled "${fieldName}" with "${value}"`;
            } else {
              return `Form field not found: ${fieldName}`;
            }
          } catch (error) {
            return `Failed to fill form: ${error.message}`;
          }
        }
      },

      // YouTube Music Playback with Trending Support
      {
        name: "playYouTubeMusic",
        description: "Play music on YouTube - either from trending charts or search for specific songs",
        inputSchema: {
          type: "object",
          properties: {
            song: {
              type: "string",
              description: "Song name to play (optional - if not provided, plays a random trending song)"
            },
            useTrending: {
              type: "boolean",
              description: "Whether to use trending songs chart (default: true if song not specified)"
            }
          }
        },
          async execute({ song, useTrending = true }) {
            try {
              
              // If no song specified or "play music/trending", use trending chart
              if (!song || useTrending || ['play music', 'play trending', 'trending', 'play song'].some(cmd => 
                !song || song.toLowerCase().includes(cmd))) {
                
                
                // Direct navigation to YouTube Music trending (no CORS issues)
                window.open('https://www.youtube.com/@YouTube/charts/music/MUSIC', '_blank');
                return `Opening YouTube Music trending for you!`;
              }
              
              // Specific song - Search YouTube for the song and auto-click first result
              const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`;
              
              
              // Use Chrome API to open tab and auto-click first video
              try {
                // Request background script to open YouTube and click first video
                const response = await chrome.runtime.sendMessage({
                  type: 'OPEN_YOUTUBE_AND_PLAY',
                  query: song,
                  url: searchUrl
                });
                
                
                if (response && response.success) {
                  return `Playing "${song}" on YouTube!`;
                } else {
                  console.warn(`⚠️ Background returned failure:`, response);
                }
              } catch (error) {
                console.warn('⚠️ Chrome Tabs API not available, using window.open fallback:', error);
                console.error('❌ Error details:', error.message, error.stack);
              }
              
              // Fallback: just open search results
              window.open(searchUrl, '_blank');
              return `Searching YouTube for "${song}" and opening results...`;
              
            } catch (error) {
              console.error('❌ YouTube music playback failed:', error);
              return `Failed to play music: ${error.message}`;
            }
          }
      },

      // Autonomous Task Execution - Multi-step browser automation
      {
        name: "executeAutonomousTask",
        description: "Execute complex multi-step browser automation tasks autonomously (e.g., research and save, compare prices, fill forms)",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "High-level task description (e.g., 'research top 10 schools in India and save to Google Docs')"
            }
          },
          required: ["task"]
        },
        async execute({ task }) {
          try {
            
            const agent = window.ChromeAIStudio?.autonomousAgent;
            const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
            
            if (!agent) {
              return 'Autonomous agent not available. Please reload the page.';
            }
            
            // Voice feedback: Starting (don't await - run in background)
            if (mcpVoiceInterface) {
              mcpVoiceInterface.speak(`Starting autonomous task: ${task}`).catch(err => {
                console.warn('Voice feedback failed:', err);
              });
            }
            
            // Execute task autonomously
            const result = await agent.executeTask(task);
            
            // Voice feedback: Completion - concise and natural
            if (mcpVoiceInterface) {
              await mcpVoiceInterface.speak(`Research complete! Check the sidebar for results.`, { endConversation: true });
              
              // End the MCP conversation after completion
              const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
              if (floatingBubble && floatingBubble.endMCPConversation) {
                setTimeout(() => {
                  floatingBubble.endMCPConversation();
                }, 2000); // Wait 2 seconds after speech completes
              }
            }
            
            
            return result.summary;
            
          } catch (error) {
            console.error(`❌ Autonomous task failed:`, error);
            console.error('Error stack:', error.stack);
            
            const mcpVoiceInterface = window.ChromeAIStudio?.mcpVoiceInterface;
            if (mcpVoiceInterface) {
              await mcpVoiceInterface.speak(`Task failed: ${error.message}`);
            }
            
            return `Task failed: ${error.message}`;
          }
        }
      }
    ];

    // Get advanced tools if available
    let advancedTools = [];
    if (window.ChromeAIStudio?.advancedMCPTools) {
      try {
        advancedTools = window.ChromeAIStudio.advancedMCPTools.getAdvancedTools();
      } catch (error) {
        console.warn('⚠️ Failed to load advanced MCP tools:', error);
      }
    }

    // Combine basic and advanced tools
    const allTools = [...basicTools, ...advancedTools];
    
    return allTools;
  }

  /**
   * Build contextual prompt with conversation history
   */
  buildContextualPrompt(currentTranscript) {
    // Limit to last 10 turns to avoid token limits
    const recentHistory = this.conversationHistory.slice(-10);
    
    if (recentHistory.length === 0) {
      return currentTranscript;
    }
    
    // Build context from recent history
    let context = "Previous conversation:\n";
    recentHistory.forEach(turn => {
      if (turn.role === 'user') {
        context += `User: ${turn.content}\n`;
      } else if (turn.role === 'assistant') {
        context += `Assistant: ${turn.content}\n\n`;
      }
    });
    
    context += `Current request: ${currentTranscript}`;
    
    return context;
  }

  /**
   * Start a voice conversation with MCP capabilities
   */
  async startConversation() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.isConversationActive = true;
    this.turnCount = 0;
    this.conversationHistory = [];
    
    return true;
  }

  /**
   * Alias for startConversation for backward compatibility
   */
  async startVoiceConversation() {
    return this.startConversation();
  }

  /**
   * Process voice input with MCP tools
   */
  async processVoiceInput(transcript) {
    if (!this.isConversationActive) {
      throw new Error('Voice conversation not active');
    }
    
    // Store last transcript for fallback
    this.lastTranscript = transcript;

    // Validate input
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      console.warn('🎤 Empty or invalid transcript received, skipping processing');
      throw new Error('Empty transcript provided');
    }

    try {
      this.turnCount++;
      
      // Check for end conversation commands
      const lowerTranscript = transcript.toLowerCase().trim();
      const endCommands = ['stop listening', 'end conversation', 'goodbye', 'bye', 'that\'s all', 'stop', 'exit'];
      
      if (endCommands.some(cmd => lowerTranscript.includes(cmd))) {
        
        // Call floating bubble's endMCPConversation method
        const floatingBubble = window.ChromeAIStudio?.floatingActionBubble;
        if (floatingBubble && floatingBubble.endMCPConversation) {
          setTimeout(() => {
            floatingBubble.endMCPConversation();
          }, 2000); // After goodbye message
        }
        
        return 'Goodbye! I\'ll return to wake word mode. Just say "Hey Assistant" or "Computer" when you need me again.';
      }
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        turn: this.turnCount,
        timestamp: Date.now()
      });

      let finalResponse = '';

      // Try to use LanguageModel API if available
      if (this.session && this.isInitialized) {
        try {
          // Build contextual prompt with conversation history
          const contextualPrompt = this.buildContextualPrompt(transcript);
          
          // Get AI response with tool capabilities (parallel processing)
          const [response, toolResult] = await Promise.all([
            this.session.prompt(contextualPrompt),
            this.executeToolsForRequest(transcript, '') // Start tool check in parallel ✅
          ]);
          
          // Use tool result if available, otherwise use AI response
          finalResponse = toolResult || response;
        } catch (error) {
          console.warn('⚠️ LanguageModel API failed, falling back to tool processing:', error);
          finalResponse = await this.executeToolsForRequest(transcript, '') || this.getFallbackResponse(transcript);
        }
      } else {
        // Fallback: use tools directly or simple responses
        finalResponse = await this.executeToolsForRequest(transcript, '') || this.getFallbackResponse(transcript);
      }
      
      // CRITICAL: Parse and execute tool calls from AI response
      const toolExecutionResult = await this.parseAndExecuteToolsFromResponse(finalResponse);
      if (toolExecutionResult) {
        finalResponse = toolExecutionResult; // Replace with actual tool result
      }
      
      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant', 
        content: finalResponse,
        turn: this.turnCount,
        timestamp: Date.now()
      });

      return finalResponse;
      
    } catch (error) {
      console.error('❌ MCP voice processing failed:', error);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Parse and execute tool calls from AI response
   */
  async parseAndExecuteToolsFromResponse(response) {
    try {
      // Look for tool_code blocks
      const toolCodeMatch = response.match(/```tool_code\s*\n([\s\S]*?)\n```/);
      
      if (!toolCodeMatch) {
        return null; // No tool call found
      }
      
      let toolCode = toolCodeMatch[1].trim();
      // Strip common wrappers like print()
      const wrapperMatch = toolCode.match(/print\(([\s\S]*?)\)/);
      if (wrapperMatch) {
        toolCode = wrapperMatch[1].trim();
      }
      
      // Parse tool name and parameters
      // Format: toolName(param='value', param2='value2') or toolName(param="value")
      const toolMatch = toolCode.match(/(\w+)\((.*)\)/s);
      
      if (!toolMatch) {
        console.warn('⚠️ Could not parse tool call format');
        return null;
      }
      
      const toolName = toolMatch[1];
      const paramsString = toolMatch[2];
      
      
      // Parse parameters (simple key=value parsing)
      const params = {};
      if (paramsString) {
        // Match key='value' or key="value" patterns
        const paramMatches = paramsString.matchAll(/(\w+)\s*=\s*['"]([^'"]*)['"]/g);
        for (const match of paramMatches) {
          let paramName = match[1];
          const paramValue = match[2];
          
          // Map common parameter name variations
          if (paramName === 'task_description') {
            paramName = 'task';
          } else if (paramName === 'search_query' || paramName === 'query_string') {
            paramName = 'query';
          } else if (paramName === 'url_address' || paramName === 'website') {
            paramName = 'url';
          }
          
          params[paramName] = paramValue;
        }
      }
      
      
      // For executeAutonomousTask, extract task from the original response if params are empty
      if (toolName === 'executeAutonomousTask' && !params.task && !params.task_description) {
        // Try to extract task from the full response
        const taskMatch = response.match(/task_description\s*[:=]\s*['"]([^'"]+)['"]/i) 
          || response.match(/task\s*[:=]\s*['"]([^'"]+)['"]/i)
          || response.match(/(?:research|find|get|search for)[\s:]+(['"]([^'"]+)['"])/i);
        
        if (taskMatch) {
          const taskValue = taskMatch[1] || taskMatch[2];
          params.task = taskValue;
        } else {
          // Last resort: use the user's original transcript
          params.task = this.lastTranscript || 'Unknown task';
        }
      }
      
      // Get the tool
      const tools = await this.getMCPTools();
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        console.error(`❌ Tool not found: ${toolName}`);
        return null;
      }
      
      // Execute the tool
      const result = await tool.execute(params);
      
      
      return result;
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error);
      return null;
    }
  }

  /**
   * Get fallback response when LanguageModel API is not available
   */
  getFallbackResponse(transcript) {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi')) {
      return 'Hello! I\'m your voice assistant. How can I help you today?';
    } else if (lowerTranscript.includes('time')) {
      const time = new Date().toLocaleTimeString();
      return `The current time is ${time}`;
    } else if (lowerTranscript.includes('date')) {
      const date = new Date().toLocaleDateString();
      return `Today's date is ${date}`;
    } else if (lowerTranscript.includes('help') || lowerTranscript.includes('what can you do')) {
      return 'I can summarize pages, scroll, read content, click elements, play music, open websites, search the web, and much more. Just ask!';
    } else if (lowerTranscript.includes('capabilities') || lowerTranscript.includes('features')) {
      return 'I have browser automation powers! I can summarize pages, navigate websites, control playback, scroll pages, read content aloud, and interact with page elements.';
    } else {
      return 'I heard you say: ' + transcript + '. I\'m here to help! What would you like me to do?';
    }
  }

  /**
   * Execute tools based on user request
   */
  async executeToolsForRequest(transcript, aiResponse) {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Skip if transcript is empty or too short
    if (!lowerTranscript || lowerTranscript.length < 3) {
      return null;
    }
    
    try {
      // Get cached tools (no logging after first time) ✅
      const tools = await this.getMCPTools();
      
      // Only log tools on first turn to reduce console spam
      if (this.turnCount === 1) {
      } else {
        // Silent operation for subsequent turns
      }
      
      // Quick pattern matching using pre-compiled regex (faster than AI parsing)
      
      // Autonomous multi-step tasks (highest priority)
      if (this.toolPatterns.autonomousTask.test(lowerTranscript)) {
        const tool = tools.find(t => t.name === 'executeAutonomousTask');
        if (tool) {
          const result = await tool.execute({ task: transcript });
          return result;
        }
      }
      
      // Page summarization
      if (this.toolPatterns.summarize.test(lowerTranscript)) {
        const tool = tools.find(t => t.name === 'summarizePage');
        if (tool) {
          const format = lowerTranscript.includes('detail') ? 'detailed' : 
                        lowerTranscript.includes('bullet') || lowerTranscript.includes('point') ? 'bullet-points' : 'brief';
          const result = await tool.execute({ format });
          return result;
        }
      }
      
      // Scroll control
      if (this.toolPatterns.scroll.test(lowerTranscript)) {
        const tool = tools.find(t => t.name === 'scrollPage');
        if (tool) {
          let direction = 'down';
          if (lowerTranscript.includes('up')) direction = 'up';
          else if (lowerTranscript.includes('top')) direction = 'top';
          else if (lowerTranscript.includes('bottom')) direction = 'bottom';
          
          const result = await tool.execute({ direction });
          return `Done! ${result}`;
        }
      }
      
      // Read page content
      if (this.toolPatterns.read.test(lowerTranscript)) {
        const tool = tools.find(t => t.name === 'readPageContent');
        if (tool) {
          let contentType = 'main-content';
          if (lowerTranscript.includes('heading')) contentType = 'headings';
          else if (lowerTranscript.includes('paragraph')) contentType = 'paragraphs';
          else if (lowerTranscript.includes('first')) contentType = 'first-paragraph';
          
          const result = await tool.execute({ contentType, maxLength: 500 });
          return result;
        }
      }
      
      // Click element
      if (this.toolPatterns.click.test(lowerTranscript)) {
        const clickMatch = lowerTranscript.match(this.toolPatterns.click);
        if (clickMatch) {
          const tool = tools.find(t => t.name === 'clickElement');
          if (tool) {
            const text = clickMatch[1];
            const result = await tool.execute({ text });
            return `Done! ${result}`;
          }
        }
      }
      
      // Music handling - YouTube Music
      if (this.toolPatterns.music.test(lowerTranscript)) {
        const musicTool = tools.find(t => t.name === 'playYouTubeMusic');
        if (musicTool) {
          
          // Extract song name if specified
          let songName = null;
          
          // Check for specific patterns
          // Pattern 1: "play Taki Taki" or "play Taki Taki on YouTube"
          const specificSongMatch = lowerTranscript.match(/play\s+(.+?)(?:\s+on\s+youtube)?$/i);
          if (specificSongMatch && specificSongMatch[1]) {
            const extracted = specificSongMatch[1].trim();
            // Filter out generic terms
            if (!['music', 'song', 'trending', 'any', 'some', 'can'].includes(extracted.toLowerCase())) {
              songName = extracted;
            }
          }
          
          // Pattern 2: "play songs by The Weeknd"
          if (!songName && lowerTranscript.includes('by ')) {
            const parts = lowerTranscript.split('by ');
            songName = parts[parts.length - 1].trim();
          }
          
          // If no specific song, use trending
          if (!songName) {
          }
          
          const result = await musicTool.execute({ 
            song: songName, 
            useTrending: !songName 
          });
          
          return `Great! ${result}`;
        }
      }
      
      // Website navigation
      const websiteMatch = lowerTranscript.match(this.toolPatterns.website);
      if (websiteMatch) {
        const site = websiteMatch[1];
        const smartTool = tools.find(t => t.name === 'smartNavigate');
        const websiteTool = tools.find(t => t.name === 'openWebsite');
        
        if (smartTool) {
          const result = await smartTool.execute({ destination: site, newTab: true });
          return `I've opened ${site} for you! ${result}`;
        } else if (websiteTool) {
          const result = await websiteTool.execute({ url: site, newTab: true });
          return `I've opened ${site} for you! ${result}`;
        }
      }
      
      // Search handling
      const searchMatch = lowerTranscript.match(this.toolPatterns.search);
      if (searchMatch) {
        const query = searchMatch[1];
        const tool = tools.find(t => t.name === 'searchWeb');
        if (tool) {
          const result = await tool.execute({ query: query.trim(), newTab: true });
          return `I've searched for "${query}" for you! ${result}`;
        }
      }
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error);
    }
    
    return null;
  }

  // Add helper method for music query extraction
  extractMusicQuery(transcript, aiResponse) {
    // Try to extract from AI response first
    if (aiResponse) {
      const musicMatches = [
        aiResponse.match(/(?:play|playing|search for)[\s"']([^"'\n]+(?:hits|songs|music|album))/i),
        aiResponse.match(/(?:I'll play|let me play|playing)[\s"']([^"'\n]+)/i),
        aiResponse.match(/"([^"]+(?:hits|songs|music|greatest|popular|best))"/i)
      ];
      
      for (const match of musicMatches) {
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    // Fallback to intelligent choices
    const intelligentChoices = [
      "Billboard Hot 100 hits",
      "Ed Sheeran greatest hits", 
      "Taylor Swift popular songs",
      "The Weeknd best songs",
      "Dua Lipa hits"
    ];
    return intelligentChoices[Math.floor(Math.random() * intelligentChoices.length)];
  }

  /**
   * End voice conversation
   */
  endConversation() {
    this.isConversationActive = false;
    this.turnCount = 0;
    this.conversationHistory = [];
    
    // Stop any active recognition
    if (this.currentRecognition) {
      this.currentRecognition.abort();
      this.currentRecognition = null;
    }
    
    // Stop any active speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    this.isSpeaking = false;
  }

  /**
   * Alias for endConversation for backward compatibility
   */
  endVoiceConversation() {
    this.endConversation();
  }

  /**
   * Get conversation summary
   */
  getConversationSummary() {
    return {
      active: this.isConversationActive,
      turns: this.turnCount,
      historyLength: this.conversationHistory.length,
      initialized: this.isInitialized
    };
  }

  /**
   * Cleanup and destroy session
   */
  async cleanup() {
    
    this.endConversation();
    
    if (this.session) {
      try {
        await this.session.destroy();
      } catch (error) {
        console.warn('⚠️ Error destroying MCP session:', error);
      }
      this.session = null;
    }
    
    this.preWarmedSessions.clear();
    this.toolsCache.clear();
    this.isInitialized = false;
    
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.MCPVoiceAgent = MCPVoiceAgent;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.mcpVoiceAgent = new MCPVoiceAgent();
  
}