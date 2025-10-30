/**
 * ChromeAI Studio - Permission Manager
 * Handles microphone and speech synthesis permissions proactively
 */

class PermissionManager {
  constructor() {
    this.permissionStates = {
      microphone: 'unknown',
      speechSynthesis: 'unknown'
    };
    
    this.permissionModal = null;
    this.permissionCallback = null;
    
    
  }

  /**
   * Check permissions without showing modal (for initialization)
   */
  async checkPermissionsSilently() {
    try {
      
      
      // Check current permission states
      await this.checkCurrentPermissions();
      
      // Log current states but don't show modal
      
      
      if (this.areAllPermissionsGranted()) {
        
      } else {
        
      }
      
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
    }
  }

  /**
   * Request all necessary permissions for voice features (manual trigger only)
   */
  async requestAllPermissions() {
    try {
      
      // Check if user previously declined permissions and if decline period expired
      const userDeclined = localStorage.getItem('chromeai-permissions-declined');
      const declineExpiry = localStorage.getItem('chromeai-permissions-declined-expiry');
      
      if (userDeclined === 'true') {
        // Check if decline period has expired
        if (declineExpiry) {
          const expiryDate = new Date(declineExpiry);
          const now = new Date();
          
          if (now < expiryDate) {
            
            return false;
          } else {
            
            localStorage.removeItem('chromeai-permissions-declined');
            localStorage.removeItem('chromeai-permissions-declined-expiry');
          }
        } else {
          
          return false;
        }
      }
      
      // Check current permission states
      await this.checkCurrentPermissions();
      
      // Only show modal if permissions are actually needed
      const needsPermissions = this.permissionStates.microphone !== 'granted' || 
                              this.permissionStates.speechSynthesis !== 'granted';
      
      if (needsPermissions) {
        
        const granted = await this.showPermissionRequestModal();
        
        // Save user's decision
        if (!granted) {
          localStorage.setItem('chromeai-permissions-declined', 'true');
          // Set expiry for 7 days (ask again after a week)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);
          localStorage.setItem('chromeai-permissions-declined-expiry', expiryDate.toISOString());
        } else {
          localStorage.removeItem('chromeai-permissions-declined');
          localStorage.removeItem('chromeai-permissions-declined-expiry');
        }
        
        return granted;
      } else {
        
        return true;
      }
      
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Check current permission states
   */
  async checkCurrentPermissions() {
    // Check microphone permission
    try {
      if ('permissions' in navigator) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        this.permissionStates.microphone = micPermission.state;
        
      } else {
        // Fallback: try to access microphone to check permission
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (stream) {
            this.permissionStates.microphone = 'granted';
            stream.getTracks().forEach(track => track.stop());
            
          }
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            this.permissionStates.microphone = 'denied';
            
          } else {
            this.permissionStates.microphone = 'prompt';
            
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not check microphone permission:', error);
      this.permissionStates.microphone = 'prompt';
    }

    // Check if speech synthesis was previously tested and working
    const speechPreviouslyWorking = localStorage.getItem('chromeai-speech-synthesis-working');
    if (speechPreviouslyWorking === 'true') {
      this.permissionStates.speechSynthesis = 'granted';
      
    } else {
      this.permissionStates.speechSynthesis = 'prompt';
      
    }

    // Additional check: if we have a stored permission state, use it
    const storedMicPermission = localStorage.getItem('chromeai-microphone-permission');
    if (storedMicPermission && storedMicPermission === 'granted') {
      this.permissionStates.microphone = 'granted';
      
    }
  }

  /**
   * Show permission request modal
   */
  async showPermissionRequestModal() {
    return new Promise((resolve) => {
      // Don't show modal if already showing
      if (this.permissionModal) {
        resolve(false);
        return;
      }

      

      // Create modal overlay
      this.permissionModal = document.createElement('div');
      this.permissionModal.className = 'chromeai-permission-modal';
      this.permissionModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      `;

      modalContent.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🎤</div>
        <h2 style="color: #333; margin-bottom: 16px; font-size: 24px;">Enable Voice Assistant</h2>
        <p style="color: #666; margin-bottom: 32px; line-height: 1.5;">
          ChromeAI Studio needs microphone and speech permissions to provide voice assistance.
          <br><br>
          <strong>What you'll get:</strong><br>
          • Wake word detection ("Hey Assistant")<br>
          • Voice commands and responses<br>
          • Hands-free browsing help
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="enablePermissions" style="
            background: #4285f4;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
          ">Enable Voice Features</button>
          <button id="skipPermissions" style="
            background: #f1f3f4;
            color: #5f6368;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s ease;
          ">Skip for Now</button>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          You can always enable these later in the extension menu
        </p>
      `;

      this.permissionModal.appendChild(modalContent);

      // Add button event listeners
      const enableBtn = modalContent.querySelector('#enablePermissions');
      const skipBtn = modalContent.querySelector('#skipPermissions');

      enableBtn.addEventListener('click', async () => {
        enableBtn.textContent = 'Requesting permissions...';
        enableBtn.disabled = true;
        
        try {
          const success = await this.requestPermissionsWithUserInteraction();
          
          if (success) {
            modalContent.innerHTML = `
              <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
              <h2 style="color: #333; margin-bottom: 16px;">Voice Features Enabled!</h2>
              <p style="color: #666;">You can now use wake words and voice commands.</p>
            `;
            
            setTimeout(() => {
              this.hidePermissionModal();
              resolve(true);
            }, 2000);
          } else {
            enableBtn.textContent = 'Permission Denied';
            enableBtn.style.background = '#ea4335';
            setTimeout(() => {
              this.hidePermissionModal();
              resolve(false);
            }, 2000);
          }
        } catch (error) {
          console.error('Permission request failed:', error);
          this.hidePermissionModal();
          resolve(false);
        }
      });

      skipBtn.addEventListener('click', () => {
        this.hidePermissionModal();
        resolve(false);
      });

      // Add to DOM
      document.body.appendChild(this.permissionModal);

      // Animate in
      setTimeout(() => {
        this.permissionModal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
      }, 10);
    });
  }

  /**
   * Request permissions with user interaction
   */
  async requestPermissionsWithUserInteraction() {
    try {
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stream) {
        // Stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        this.permissionStates.microphone = 'granted';
        // Store permission state for future checks
        localStorage.setItem('chromeai-microphone-permission', 'granted');
      }

      // Test speech synthesis
      
      await this.testSpeechSynthesis();
      
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Test speech synthesis with user interaction
   */
  async testSpeechSynthesis() {
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance('Voice features enabled');
        utterance.volume = 0.3; // Quiet test
        utterance.rate = 1.5; // Fast test
        
        utterance.onstart = () => {
          this.permissionStates.speechSynthesis = 'granted';
          localStorage.setItem('chromeai-speech-synthesis-working', 'true'); // Save working state
          
          resolve(true);
        };
        
        utterance.onerror = (error) => {
          console.warn('⚠️ Speech synthesis error:', error);
          this.permissionStates.speechSynthesis = 'denied';
          localStorage.removeItem('chromeai-speech-synthesis-working'); // Clear working state
          resolve(false); // Don't reject, just mark as not available
        };
        
        utterance.onend = () => {
          resolve(true);
        };
        
        speechSynthesis.speak(utterance);
        
        // Timeout fallback
        setTimeout(() => {
          if (this.permissionStates.speechSynthesis === 'prompt') {
            this.permissionStates.speechSynthesis = 'denied';
            resolve(false);
          }
        }, 3000);
        
      } catch (error) {
        console.error('Speech synthesis test failed:', error);
        this.permissionStates.speechSynthesis = 'denied';
        resolve(false);
      }
    });
  }

  /**
   * Hide permission modal
   */
  hidePermissionModal() {
    if (this.permissionModal) {
      this.permissionModal.style.opacity = '0';
      setTimeout(() => {
        if (this.permissionModal && this.permissionModal.parentNode) {
          this.permissionModal.remove();
        }
        this.permissionModal = null;
      }, 300);
    }
  }

  /**
   * Get current permission states
   */
  getPermissionStates() {
    return { ...this.permissionStates };
  }

  /**
   * Check if all permissions are granted
   */
  areAllPermissionsGranted() {
    return this.permissionStates.microphone === 'granted' && 
           this.permissionStates.speechSynthesis === 'granted';
  }

  /**
   * Manually request permissions (called from UI)
   */
  async requestPermissionsManually() {
    
    
    // Clear any previous decline state
    localStorage.removeItem('chromeai-permissions-declined');
    localStorage.removeItem('chromeai-permissions-declined-expiry');
    
    // Show permission modal
    return await this.showPermissionRequestModal();
  }

  /**
   * Reset permission decline state (for testing or user request)
   */
  resetPermissionDeclineState() {
    localStorage.removeItem('chromeai-permissions-declined');
    localStorage.removeItem('chromeai-permissions-declined-expiry');
    
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.hidePermissionModal();
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.PermissionManager = PermissionManager;
  
  // Initialize in ChromeAI Studio namespace
  window.ChromeAIStudio = window.ChromeAIStudio || {};
}