/**
 * ChromeAI Studio - Advanced MCP Tools
 * Extended browser automation and AI-powered tools for MCP Voice Agent
 * High-level operations for enhanced voice assistant capabilities
 */

class AdvancedMCPTools {
  constructor() {
    this.toolsCache = new Map();
    this.activeOperations = new Map();
  }

  /**
   * Get advanced MCP tools for voice agent
   */
  getAdvancedTools() {
    return [
      // Smart Navigation Tools
      {
        name: "smartNavigate",
        description: "Intelligently navigate to websites with smart URL completion and search fallback",
        inputSchema: {
          type: "object",
          properties: {
            destination: {
              type: "string",
              description: "Website name, domain, or search query"
            },
            newTab: {
              type: "boolean",
              description: "Open in new tab (default: false)"
            }
          },
          required: ["destination"]
        },
        async execute({ destination, newTab = false }) {
          try {
            let url = destination.toLowerCase().trim();
            
            // Smart URL mapping for common sites
            const siteMap = {
              'youtube': 'https://youtube.com',
              'gmail': 'https://gmail.com',
              'github': 'https://github.com',
              'twitter': 'https://twitter.com',
              'facebook': 'https://facebook.com',
              'instagram': 'https://instagram.com',
              'linkedin': 'https://linkedin.com',
              'reddit': 'https://reddit.com',
              'stackoverflow': 'https://stackoverflow.com',
              'amazon': 'https://amazon.com',
              'netflix': 'https://netflix.com',
              'spotify': 'https://spotify.com'
            };
            
            // Special handling for YouTube with search queries
            if (url.includes('youtube.com/results?search_query=')) {
              url = destination; // Use as-is if it's already a YouTube search URL
            }
            // Handle YouTube search queries (let AI decide the search terms)
            else if (destination.includes('youtube.com/results?search_query=')) {
              url = destination; // Use the AI-provided YouTube search URL directly
            }
            // Check if it's a mapped site
            else if (siteMap[url]) {
              url = siteMap[url];
            } 
            // Check if it looks like a domain
            else if (url.includes('.') && !url.includes(' ')) {
              url = url.startsWith('http') ? url : `https://${url}`;
            }
            // Otherwise treat as search query
            else {
              url = `https://www.google.com/search?q=${encodeURIComponent(destination)}`;
            }
            
            if (newTab) {
              window.open(url, '_blank');
              return `Opened ${destination} in new tab`;
            } else {
              window.location.href = url;
              return `Navigating to ${destination}`;
            }
            
          } catch (error) {
            return `Failed to navigate to ${destination}: ${error.message}`;
          }
        }
      },

      // YouTube Music Player
      {
        name: "playYouTubeMusic",
        description: "Play music or videos on YouTube with search functionality",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Song name, artist, or search query for YouTube"
            },
            newTab: {
              type: "boolean",
              description: "Open in new tab (default: true for music)"
            }
          },
          required: ["query"]
        },
        async execute({ query, newTab = true }) {
          try {
            // The AI should pass in a meaningful search query
            // Just clean up basic command words but let AI decide the content
            let searchQuery = query.trim();
            
            // Remove obvious command prefixes but preserve the AI's intent
            searchQuery = searchQuery
              .replace(/^(play|can you play|please play)\s+/i, '')
              .replace(/\s+on youtube$/i, '')
              .replace(/\s+please$/i, '')
              .trim();
            
            // If query is too short or empty, let the AI know it needs to be more specific
            if (!searchQuery || searchQuery.length < 2) {
              throw new Error('Search query too vague - AI should provide specific music to search for');
            }
            
            const youtubeURL = `https://youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            
            if (newTab) {
              window.open(youtubeURL, '_blank');
              return `Playing "${searchQuery}" on YouTube in new tab`;
            } else {
              window.location.href = youtubeURL;
              return `Searching for "${searchQuery}" on YouTube`;
            }
            
          } catch (error) {
            return `Failed to play music on YouTube: ${error.message}`;
          }
        }
      },

      // Advanced Media Control
      {
        name: "advancedMediaControl",
        description: "Advanced media control with smart detection and batch operations",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play_all", "pause_all", "stop_all", "mute_all", "unmute_all", "volume_up", "volume_down", "next", "previous", "seek", "fullscreen"],
              description: "Advanced media control action"
            },
            value: {
              type: "number",
              description: "Value for actions like volume or seek (optional)"
            }
          },
          required: ["action"]
        },
        async execute({ action, value }) {
          try {
            const mediaElements = document.querySelectorAll('audio, video');
            const results = [];
            
            if (mediaElements.length === 0) {
              return "No media elements found on this page";
            }
            
            mediaElements.forEach((media, index) => {
              try {
                switch (action) {
                  case 'play_all':
                    media.play();
                    results.push(`Playing media ${index + 1}`);
                    break;
                  case 'pause_all':
                    media.pause();
                    results.push(`Paused media ${index + 1}`);
                    break;
                  case 'stop_all':
                    media.pause();
                    media.currentTime = 0;
                    results.push(`Stopped media ${index + 1}`);
                    break;
                  case 'mute_all':
                    media.muted = true;
                    results.push(`Muted media ${index + 1}`);
                    break;
                  case 'unmute_all':
                    media.muted = false;
                    results.push(`Unmuted media ${index + 1}`);
                    break;
                  case 'volume_up':
                    media.volume = Math.min(1, media.volume + 0.1);
                    results.push(`Volume up on media ${index + 1}: ${Math.round(media.volume * 100)}%`);
                    break;
                  case 'volume_down':
                    media.volume = Math.max(0, media.volume - 0.1);
                    results.push(`Volume down on media ${index + 1}: ${Math.round(media.volume * 100)}%`);
                    break;
                  case 'seek':
                    if (value !== undefined) {
                      media.currentTime = Math.max(0, Math.min(media.duration || 0, value));
                      results.push(`Seeked media ${index + 1} to ${value}s`);
                    }
                    break;
                  case 'fullscreen':
                    if (media.requestFullscreen) {
                      media.requestFullscreen();
                      results.push(`Fullscreen media ${index + 1}`);
                    }
                    break;
                }
              } catch (err) {
                results.push(`Error with media ${index + 1}: ${err.message}`);
              }
            });
            
            return results.join(', ');
            
          } catch (error) {
            return `Advanced media control failed: ${error.message}`;
          }
        }
      },

      // Page Content Analysis
      {
        name: "analyzePageContent",
        description: "Analyze and extract structured information from the current page",
        inputSchema: {
          type: "object",
          properties: {
            analysis: {
              type: "string",
              enum: ["summary", "headings", "forms", "buttons", "media", "scripts", "meta", "performance"],
              description: "Type of content analysis to perform"
            }
          },
          required: ["analysis"]
        },
        async execute({ analysis }) {
          try {
            switch (analysis) {
              case 'summary':
                const title = document.title;
                const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
                const wordCount = document.body.innerText.split(/\s+/).length;
                const linkCount = document.querySelectorAll('a[href]').length;
                const imageCount = document.querySelectorAll('img').length;
                return `Page: "${title}" - ${wordCount} words, ${linkCount} links, ${imageCount} images. Description: ${metaDesc.substring(0, 100)}`;
                
              case 'headings':
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                  .map(h => `${h.tagName}: ${h.textContent.trim()}`)
                  .slice(0, 10)
                  .join(', ');
                return `Page headings: ${headings}`;
                
              case 'forms':
                const forms = Array.from(document.querySelectorAll('form'))
                  .map((form, i) => {
                    const inputs = form.querySelectorAll('input, select, textarea').length;
                    const action = form.action || 'no action';
                    return `Form ${i + 1}: ${inputs} fields, action: ${action}`;
                  })
                  .join(', ');
                return forms || 'No forms found';
                
              case 'buttons':
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
                  .map(btn => btn.textContent?.trim() || btn.value || 'unnamed button')
                  .slice(0, 10)
                  .join(', ');
                return `Buttons: ${buttons}`;
                
              case 'media':
                const videos = document.querySelectorAll('video').length;
                const audios = document.querySelectorAll('audio').length;
                const images = document.querySelectorAll('img').length;
                return `Media: ${videos} videos, ${audios} audio files, ${images} images`;
                
              case 'scripts':
                const scripts = document.querySelectorAll('script').length;
                const external = document.querySelectorAll('script[src]').length;
                return `Scripts: ${scripts} total (${external} external)`;
                
              case 'meta':
                const charset = document.characterSet;
                const viewport = document.querySelector('meta[name="viewport"]')?.content || 'not set';
                const canonical = document.querySelector('link[rel="canonical"]')?.href || 'not set';
                return `Meta: charset=${charset}, viewport=${viewport}, canonical=${canonical}`;
                
              case 'performance':
                const loadTime = Math.round(performance.now());
                const resources = performance.getEntriesByType('navigation')[0];
                const domComplete = resources ? Math.round(resources.domComplete) : 'unknown';
                return `Performance: Page loaded in ${loadTime}ms, DOM complete in ${domComplete}ms`;
                
              default:
                return `Unknown analysis type: ${analysis}`;
            }
          } catch (error) {
            return `Page analysis failed: ${error.message}`;
          }
        }
      },

      // Advanced Tab Management
      {
        name: "advancedTabControl",
        description: "Advanced tab and window management operations",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["duplicate", "pin", "bookmark", "print", "share", "screenshot", "zoom_in", "zoom_out", "zoom_reset", "find_in_page"],
              description: "Advanced tab control action"
            },
            query: {
              type: "string", 
              description: "Search query for find_in_page action"
            }
          },
          required: ["action"]
        },
        async execute({ action, query }) {
          try {
            switch (action) {
              case 'duplicate':
                window.open(window.location.href, '_blank');
                return 'Duplicated current tab';
                
              case 'bookmark':
                // Try to add bookmark (may not work in all browsers due to security)
                try {
                  if (window.external?.AddFavorite) {
                    window.external.AddFavorite(window.location.href, document.title);
                    return 'Bookmark added';
                  } else {
                    return 'Bookmark feature not available - use Ctrl+D to bookmark manually';
                  }
                } catch (e) {
                  return 'Please use Ctrl+D to bookmark this page';
                }
                
              case 'print':
                window.print();
                return 'Print dialog opened';
                
              case 'share':
                if (navigator.share) {
                  await navigator.share({
                    title: document.title,
                    url: window.location.href
                  });
                  return 'Shared page successfully';
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  return 'Page URL copied to clipboard';
                }
                
              case 'screenshot':
                return 'Screenshot feature requires browser extension - use Ctrl+Shift+S or browser screenshot tool';
                
              case 'zoom_in':
                document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString();
                return 'Zoomed in';
                
              case 'zoom_out':
                document.body.style.zoom = Math.max(0.5, parseFloat(document.body.style.zoom || 1) - 0.1).toString();
                return 'Zoomed out';
                
              case 'zoom_reset':
                document.body.style.zoom = '1';
                return 'Zoom reset to 100%';
                
              case 'find_in_page':
                if (query) {
                  // Use browser's find functionality
                  if (window.find) {
                    const found = window.find(query, false, false, true);
                    return found ? `Found "${query}" on page` : `"${query}" not found on page`;
                  } else {
                    return 'Find functionality not available - use Ctrl+F to search';
                  }
                } else {
                  return 'Search query required for find_in_page action';
                }
                
              default:
                return `Unknown tab action: ${action}`;
            }
          } catch (error) {
            return `Advanced tab control failed: ${error.message}`;
          }
        }
      },

      // AI-powered Content Generation
      {
        name: "generateContent",
        description: "Generate content using AI for forms, text areas, or page content",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              enum: ["fill_form", "write_email", "create_summary", "translate_page", "explain_content"],
              description: "Content generation task"
            },
            target: {
              type: "string",
              description: "CSS selector for target element (optional)"
            },
            prompt: {
              type: "string",
              description: "Custom prompt or instruction"
            }
          },
          required: ["task"]
        },
        async execute({ task, target, prompt }) {
          try {
            switch (task) {
              case 'fill_form':
                const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
                if (textInputs.length === 0) {
                  return 'No form fields found to fill';
                }
                
                let filled = 0;
                textInputs.forEach(input => {
                  const placeholder = input.placeholder || input.name || '';
                  if (placeholder.toLowerCase().includes('name')) {
                    input.value = 'John Doe';
                    filled++;
                  } else if (placeholder.toLowerCase().includes('email')) {
                    input.value = 'john.doe@example.com';
                    filled++;
                  }
                });
                
                return `Filled ${filled} form fields with sample data`;
                
              case 'write_email':
                const emailFields = document.querySelectorAll('textarea, input[type="text"]');
                const emailContent = prompt || 'Hello,\n\nI hope this message finds you well.\n\nBest regards';
                
                if (emailFields.length > 0) {
                  emailFields[0].value = emailContent;
                  return 'Email content generated and inserted';
                }
                return 'No suitable field found for email content';
                
              case 'create_summary':
                const pageText = document.body.innerText.substring(0, 1000);
                const words = pageText.split(' ');
                const summary = words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');
                return `Page summary: ${summary}`;
                
              case 'translate_page':
                return 'Page translation would require translation API - consider using browser translate feature';
                
              case 'explain_content':
                const content = target ? 
                  document.querySelector(target)?.textContent?.substring(0, 200) || 'Content not found' :
                  document.body.innerText.substring(0, 200);
                return `Content explanation: This appears to be ${content.includes('form') ? 'a form page' : 
                       content.includes('article') ? 'an article' : 
                       content.includes('video') ? 'a video page' : 'web content'} with ${content.length} characters of text.`;
                
              default:
                return `Unknown content generation task: ${task}`;
            }
          } catch (error) {
            return `Content generation failed: ${error.message}`;
          }
        }
      },

      // System Monitoring
      {
        name: "monitorSystem",
        description: "Monitor browser performance, memory, and system status",
        inputSchema: {
          type: "object",
          properties: {
            metric: {
              type: "string",
              enum: ["performance", "memory", "network", "battery", "location", "device"],
              description: "System metric to monitor"
            }
          },
          required: ["metric"]
        },
        async execute({ metric }) {
          try {
            switch (metric) {
              case 'performance':
                const timing = performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
                return `Performance: Page loaded in ${loadTime}ms, DOM ready in ${domReady}ms`;
                
              case 'memory':
                if (performance.memory) {
                  const memory = performance.memory;
                  const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                  const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                  const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                  return `Memory: ${used}MB used, ${total}MB allocated, ${limit}MB limit`;
                }
                return 'Memory information not available';
                
              case 'network':
                if (navigator.connection) {
                  const conn = navigator.connection;
                  return `Network: ${conn.effectiveType || 'unknown'} connection, ${conn.downlink || 'unknown'}Mbps down, ${conn.rtt || 'unknown'}ms RTT`;
                }
                return 'Network information not available';
                
              case 'battery':
                if (navigator.getBattery) {
                  const battery = await navigator.getBattery();
                  const level = Math.round(battery.level * 100);
                  const charging = battery.charging ? 'charging' : 'not charging';
                  return `Battery: ${level}% (${charging})`;
                }
                return 'Battery information not available';
                
              case 'location':
                return 'Location access requires user permission - use navigator.geolocation API';
                
              case 'device':
                const info = {
                  platform: navigator.platform,
                  userAgent: navigator.userAgent.split(' ')[0],
                  language: navigator.language,
                  cookieEnabled: navigator.cookieEnabled,
                  onLine: navigator.onLine
                };
                return `Device: ${info.platform}, ${info.userAgent}, Language: ${info.language}, Online: ${info.onLine}`;
                
              default:
                return `Unknown system metric: ${metric}`;
            }
          } catch (error) {
            return `System monitoring failed: ${error.message}`;
          }
        }
      }
    ];
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.AdvancedMCPTools = AdvancedMCPTools;
  
  // Add to ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
  window.ChromeAIStudio.advancedMCPTools = new AdvancedMCPTools();
}