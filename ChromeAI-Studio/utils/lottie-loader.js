/**
 * ChromeAI Studio - WebM Animation Loader
 * Utility for loading and managing WebM video animations
 */

class WebMLoader {
  constructor() {
    this.loadedAnimations = new Map();
    this.extensionPath = chrome?.runtime?.getURL ? chrome.runtime.getURL('') : '';
    this.isExtensionContext = !!chrome?.runtime?.getURL;
    this.addFallbackAnimations();
  }

  /**
   * Create animated CSS-based icon as fallback when Lottie files aren't available
   */
  createAnimatedFallback(type, size = 24) {
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    if (type === 'siri') {
      // Animated pulsing Siri-like icon
      container.innerHTML = `
        <div style="
          width: ${size * 0.8}px;
          height: ${size * 0.8}px;
          background: linear-gradient(45deg, #007AFF, #5856D6);
          border-radius: 50%;
          animation: siri-pulse 2s infinite ease-in-out;
          position: relative;
        ">
          <div style="
            width: 60%;
            height: 60%;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: siri-inner-pulse 2s infinite ease-in-out;
          "></div>
        </div>
      `;
    } else if (type === 'voice') {
      // Animated microphone icon
      container.innerHTML = `
        <div style="
          font-size: ${size * 0.7}px;
          animation: voice-bounce 1.5s infinite ease-in-out;
        ">🎤</div>
      `;
    }

    // Add CSS animations if not already present
    this.addFallbackAnimations();
    
    return container;
  }

  /**
   * Add CSS animations for fallback icons
   */
  addFallbackAnimations() {
    if (!document.getElementById('lottie-fallback-animations')) {
      const style = document.createElement('style');
      style.id = 'lottie-fallback-animations';
      style.textContent = `
        @keyframes siri-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes siri-inner-pulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.6;
          }
        }
        
        @keyframes siri-enhanced {
          0% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: hue-rotate(0deg) brightness(1);
          }
          25% { 
            transform: scale(1.05) rotate(90deg);
            opacity: 0.9;
            filter: hue-rotate(90deg) brightness(1.1);
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 0.8;
            filter: hue-rotate(180deg) brightness(1.2);
          }
          75% { 
            transform: scale(1.05) rotate(270deg);
            opacity: 0.9;
            filter: hue-rotate(270deg) brightness(1.1);
          }
          100% { 
            transform: scale(1) rotate(360deg);
            opacity: 1;
            filter: hue-rotate(360deg) brightness(1);
          }
        }
        
        @keyframes voice-bounce {
          0%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translateY(-2px) scale(1.05);
            opacity: 0.9;
          }
        }
        
        @keyframes voice-pulse {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            transform: scale(1.1);
            filter: brightness(1.2);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Create enhanced Siri animation with more sophisticated effects
   */
  createEnhancedSiriAnimation(size = 24) {
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    // Main orb
    const mainOrb = document.createElement('div');
    mainOrb.style.cssText = `
      width: ${size * 0.8}px;
      height: ${size * 0.8}px;
      background: linear-gradient(45deg, #007AFF, #5856D6, #AF52DE, #FF2D92);
      background-size: 400% 400%;
      border-radius: 50%;
      animation: siri-enhanced 4s infinite ease-in-out;
      position: relative;
      box-shadow: 0 0 ${size * 0.2}px rgba(0, 122, 255, 0.4);
    `;

    // Inner glow
    const innerGlow = document.createElement('div');
    innerGlow.style.cssText = `
      width: 60%;
      height: 60%;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: siri-inner-pulse 2s infinite ease-in-out;
    `;

    mainOrb.appendChild(innerGlow);
    container.appendChild(mainOrb);
    
    return container;
  }

  /**
   * Create a Lottie animation element
   * @param {string} animationPath - Path to the .lottie file
   * @param {Object} options - Animation options
   */
  createLottieElement(animationPath, options = {}) {
    const {
      width = '24px',
      height = '24px',
      autoplay = true,
      loop = true,
      className = '',
      style = {}
    } = options;

    const lottieElement = document.createElement('lottie-player');
    lottieElement.setAttribute('src', animationPath);
    lottieElement.setAttribute('background', 'transparent');
    lottieElement.setAttribute('speed', '1');
    
    if (autoplay) lottieElement.setAttribute('autoplay', '');
    if (loop) lottieElement.setAttribute('loop', '');
    
    // Set dimensions
    lottieElement.style.width = width;
    lottieElement.style.height = height;
    
    // Apply additional styles
    Object.assign(lottieElement.style, style);
    
    if (className) {
      lottieElement.className = className;
    }

    return lottieElement;
  }

  /**
   * Create a Siri-style animation using WebM video
   */
  async createSiriAnimation(options = {}) {
    const size = parseInt(options.width || '56') || 56;
    
    if (this.isExtensionContext) {
      try {
        // Try to use WebM video file
        const siriPath = chrome.runtime.getURL('icons/Siri.webm');
        
        // Create video element
        const video = document.createElement('video');
        video.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          object-fit: cover;
          background: transparent;
          border-radius: 50%;
          pointer-events: none;
        `;
        
        video.src = siriPath;
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        
        // Add error handling
        video.onerror = () => {
          console.warn('⚠️ Failed to load Siri WebM, using CSS fallback');
          // Replace with CSS animation if video fails
          const fallback = this.createEnhancedSiriAnimation(size);
          if (video.parentNode) {
            video.parentNode.replaceChild(fallback, video);
          }
        };
        
        video.onloadeddata = () => {
          video.play().catch(e => console.warn('Video autoplay failed:', e));
        };
        
        // Add callback to hide bubble background when video loads
        video.onWebMLoaded = (callback) => {
          video.addEventListener('loadeddata', callback);
        };
        
        this.loadedAnimations.set('siri', video);
        return video;
        
      } catch (error) {
        console.warn('⚠️ Failed to load Siri WebM file:', error);
      }
    }
    
    // Fallback to enhanced CSS animation  
    const animation = this.createEnhancedSiriAnimation(size);
    this.loadedAnimations.set('siri', animation);
    
    return animation;
  }

  /**
   * Create a Voice animation using WebM video
   */
  async createVoiceAnimation(options = {}) {
  // Match the menu circle size (default 60px)
  const size = parseInt(options.width || '60') || 60;
    
    if (this.isExtensionContext) {
      try {
        // Try to use WebM video file
        const voicePath = chrome.runtime.getURL('icons/Voice.webm');
        
        // Create video element sized exactly to the menu circle (explicit pixels)
        const video = document.createElement('video');
        video.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          object-fit: cover;
          background: transparent;
          transition: opacity 0.3s ease, filter 0.3s ease;
          pointer-events: none;
          display: block;
        `;
        
  video.src = voicePath;
        video.loop = true;
        video.muted = true;
        video.autoplay = false; // Start paused for voice mode
        video.playsInline = true;
        
        // Add control methods without overriding native video methods
        video.playVoice = () => {
          video.play().catch(e => console.warn('Voice video play failed:', e));
          video.style.opacity = '1';
          video.style.filter = 'brightness(1)';
        };
        
        video.pauseVoice = () => {
          video.pause();
          video.style.opacity = '0.7';
          video.style.filter = 'brightness(0.7)';
        };
        
        video.setSpeed = (speed) => {
          if (speed > 0) {
            video.playbackRate = speed;
            video.play().catch(e => console.warn('Voice video play failed:', e));
            video.style.opacity = '1';
            video.style.filter = 'brightness(1)';
          } else {
            video.pause();
            video.style.opacity = '0.7';
            video.style.filter = 'brightness(0.7)';
          }
        };
        
        // Add error handling
        video.onerror = () => {
          console.warn('⚠️ Failed to load Voice WebM, using CSS fallback');
          // Replace with CSS animation if video fails
          const fallback = this.createVoiceAnimatedElement(size);
          if (video.parentNode) {
            video.parentNode.replaceChild(fallback, video);
          }
        };
        
        video.onloadeddata = () => {
        };
        
        this.loadedAnimations.set('voice', video);
        return video;
        
      } catch (error) {
        console.warn('⚠️ Failed to load Voice WebM file:', error);
      }
    }
    
    // Fallback to controllable CSS animation
    const animation = this.createVoiceAnimatedElement(size);
    this.loadedAnimations.set('voice', animation);
    
    return animation;
  }

  /**
   * Create controllable voice animation element
   */
  createVoiceAnimatedElement(size = 24) {
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    const voiceIcon = document.createElement('div');
    voiceIcon.style.cssText = `
      font-size: ${size * 0.7}px;
      transition: all 0.3s ease;
      animation: voice-bounce 1.5s infinite ease-in-out;
      animation-play-state: paused;
    `;
    voiceIcon.textContent = '🎤';
    
    container.appendChild(voiceIcon);
    
    // Add control methods
    container.play = () => {
      voiceIcon.style.animationPlayState = 'running';
      voiceIcon.style.filter = 'brightness(1.2)';
    };
    
    container.pause = () => {
      voiceIcon.style.animationPlayState = 'paused';
      voiceIcon.style.filter = 'brightness(0.7)';
      voiceIcon.textContent = '🔇';
    };
    
    container.setSpeed = (speed) => {
      voiceIcon.style.animationDuration = speed > 0 ? '1.5s' : '0s';
      if (speed > 0) {
        voiceIcon.textContent = '🎤';
        voiceIcon.style.animationPlayState = 'running';
        voiceIcon.style.filter = 'brightness(1.2)';
      } else {
        voiceIcon.textContent = '🔇';
        voiceIcon.style.animationPlayState = 'paused';
        voiceIcon.style.filter = 'brightness(0.7)';
      }
    };
    
    this.addFallbackAnimations();
    
    return container;
  }

  /**
   * Legacy method - keeping for compatibility
   */
  createLottieElement(path, options = {}) {
    // This method is now deprecated - use createSiriAnimation or createVoiceAnimation instead
    console.warn('⚠️ createLottieElement is deprecated, using WebM or CSS animation');
    
    const size = parseInt(options.width || '20') || 20;
    return this.createAnimatedFallback('siri', size);
  }

  /**
   * Start voice animation (for when voice is active)
   */
  startVoiceAnimation(element) {
    if (element && element.tagName === 'VIDEO') {
      element.play().catch(e => console.warn('Video play failed:', e));
      element.style.opacity = '1';
      element.style.filter = 'brightness(1)';
    } else if (element && element.play) {
      element.play();
    } else if (element) {
      // Fallback for custom elements
      const icon = element.querySelector('div');
      if (icon) {
        icon.style.animationPlayState = 'running';
        icon.style.filter = 'brightness(1.2)';
      }
    }
  }

  /**
   * Stop voice animation (for when voice is inactive)
   */
  stopVoiceAnimation(element) {
    if (element && element.tagName === 'VIDEO') {
      element.pause();
      element.style.opacity = '0.7';
      element.style.filter = 'brightness(0.7)';
    } else if (element && element.pause) {
      element.pause();
    } else if (element) {
      // Fallback for custom elements
      const icon = element.querySelector('div');
      if (icon) {
        icon.style.animationPlayState = 'paused';
        icon.style.filter = 'brightness(0.7)';
      }
    }
  }

  /**
   * Create fallback SVG if Lottie fails to load
   */
  createFallbackIcon(type = 'siri') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    
    if (type === 'siri') {
      // AI/Assistant icon
      svg.innerHTML = `
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="7.5,4.21 12,6.81 16.5,4.21"/>
        <polyline points="7.5,19.79 7.5,14.6 3,12"/>
        <polyline points="21,12 16.5,14.6 16.5,19.79"/>
      `;
    } else if (type === 'voice') {
      // Microphone icon
      svg.innerHTML = `
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      `;
    }
    
    return svg;
  }

  /**
   * Replace an existing icon with a WebM animation
   */
  async replaceIconWithWebM(targetElement, animationType, options = {}) {
    try {
      let animationElement;
      if (animationType === 'siri') {
        animationElement = await this.createSiriAnimation(options);
      } else if (animationType === 'voice') {
        animationElement = await this.createVoiceAnimation(options);
      }
      
      if (animationElement && targetElement) {
        // Replace the target element with the animation element
        targetElement.replaceWith(animationElement);
        return animationElement;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load WebM animation, using fallback:', error);
      // Use fallback SVG icon
      const fallbackIcon = this.createFallbackIcon(animationType);
      if (targetElement) {
        targetElement.replaceWith(fallbackIcon);
      }
      return fallbackIcon;
    }
  }
}

// Create global instance with both names for compatibility
window.WebMLoader = new WebMLoader();
window.LottieLoader = window.WebMLoader; // Keep old name for compatibility

// Also make it available on ChromeAIStudio namespace
window.ChromeAIStudio = window.ChromeAIStudio || {};
window.ChromeAIStudio.lottieLoader = window.WebMLoader;
window.ChromeAIStudio.webmLoader = window.WebMLoader;