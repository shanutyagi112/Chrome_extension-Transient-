let settings = {};
let translationPopup = null;
let textbarIcons = new Map();
let originalTexts = new WeakMap();
let isExtensionReady = false;


const iconBase64Blue = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHJ4PSI4IiBmaWxsPSIjMWYxZjFmIiBzdHJva2U9IiM1ODY1ZjIiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yMiAyMkg0MlYzM0wzNSAyNkwyOCAzM0wyOCAyMkgyMloiIHN0cm9rZT0iIzU4NjVmMiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTIyIDQwSDQyVjQ0SDIyVjQwWiIgc3Ryb2tlPSIjNTg2NWYyIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=";

const iconBase64White = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHJ4PSI4IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yMiAyMkg0MlYzM0wzNSAyNkwyOCAzM0wyOCAyMkgyMloiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMiA0MEg0MlY0NEgyMlY0MFoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==";

const iconBase64Gray = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHJ4PSI4IiBmaWxsPSIjMWYxZjFmIiBzdHJva2U9IiNiOWJiYmUiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yMiAyMkg0MlYzM0wzNSAyNkwyOCAzM0wyOCAyMkgyMloiIHN0cm9rZT0iI2I5YmJiZSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTIyIDQwSDQyVjQ0SDIyVjQwWiIgc3Ryb2tlPSIjYjliYmJlIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=";

// Initialize
setTimeout(() => {
  isExtensionReady = true;
  loadSettings();
  setupSelectionTranslation();
  setupTextbarIcons();
  console.log('Transient: Advanced translation tool loaded');
}, 1000);

// Load settings
function loadSettings() {
  chrome.storage.sync.get([
    'selectTranslation',
    'selectTargetLang', 
    'textbarTranslation',
    'textbarSourceLang',
    'textbarTargetLang',
    'serviceType',
    'freeService',
    'paidService',
    'microsoftApiKey',
    'geminiApiKey'
  ], (result) => {
    settings = result;
    updateFeatures();
  });
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsUpdated') {
    settings = request.settings;
    updateFeatures();
    sendResponse({ received: true });
  }
});

function updateFeatures() {
  if (!isExtensionReady) return;
  
  if (settings.selectTranslation) {
    enableSelectionTranslation();
  } else {
    disableSelectionTranslation();
  }
  
  if (settings.textbarTranslation) {
    enableTextbarIcons();
  } else {
    disableTextbarIcons();
  }
}

// === SELECTION TRANSLATION ===
let selectionTimeout = null;

function setupSelectionTranslation() {
  document.removeEventListener('mouseup', handleSelection, true);
  document.addEventListener('mouseup', handleSelection, true);
}

function handleSelection(event) {
  if (!settings.selectTranslation || !isExtensionReady) return;
  
  if (selectionTimeout) clearTimeout(selectionTimeout);
  
  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText || selectedText.length < 2 || selectedText.length > 1000) {
      hideTranslationPopup();
      return;
    }
    
    if (event.target?.closest('.translator-popup, .translator-textbar-icon, .translator-language-menu')) {
      return;
    }
    
    showTranslationPopup(selectedText, selection);
  }, 200);
}

function showTranslationPopup(text, selection) {
  hideTranslationPopup();
  
  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    translationPopup = document.createElement('div');
    translationPopup.className = 'translator-popup';
    translationPopup.innerHTML = `
      <div style="
        padding: 12px 16px;
        background: #2f3136;
        color: #ffffff;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        border-bottom: 1px solid #40444b;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${iconBase64Blue}" width="14" height="14" alt="Transient" style="display:block;">
          <span>Translating</span>
        </div>
        <button style="
          background: none;
          border: none;
          color: #b9bbbe;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          width: 24px;
          height: 24px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        " class="popup-close" onmouseover="this.style.background='#40444b'; this.style.color='#ffffff';" onmouseout="this.style.background='none'; this.style.color='#b9bbbe';">×</button>
      </div>
      <div style="
        padding: 16px; 
        line-height: 1.5; 
        background: #36393f; 
        color: #dcddde; 
        border-radius: 0 0 8px 8px;
        min-height: 40px;
        display: flex;
        align-items: center;
        font-size: 14px;
        font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        word-wrap: break-word;
        overflow-wrap: break-word;
      " class="popup-body">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid #5865f2;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: discordSpin 1s linear infinite;
          margin-right: 10px;
          flex-shrink: 0;
        "></div>
        <span>Loading...</span>
      </div>
    `;
    
    // Add Discord-style CSS animations
    if (!document.getElementById('transient-discord-styles')) {
      const style = document.createElement('style');
      style.id = 'transient-discord-styles';
      style.textContent = `
        @keyframes discordSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes discordSlideIn {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .translator-popup {
          animation: discordSlideIn 0.2s cubic-bezier(0.2, 0, 0, 1);
        }
        
        .translator-popup .popup-body div::-webkit-scrollbar {
          width: 6px;
        }
        .translator-popup .popup-body div::-webkit-scrollbar-track {
          background: #2f3136;
          border-radius: 3px;
        }
        .translator-popup .popup-body div::-webkit-scrollbar-thumb {
          background: #5865f2;
          border-radius: 3px;
        }
        .translator-popup .popup-body div::-webkit-scrollbar-thumb:hover {
          background: #4752c4;
        }
      `;
      document.head.appendChild(style);
    }
    
    // FIXED: Dynamic sizing based on text length
    const textLength = text.length;
    let popupWidth, maxHeight;
    
    if (textLength <= 50) {
      // Short text - compact popup
      popupWidth = Math.max(280, Math.min(400, textLength * 6 + 200));
      maxHeight = 150;
    } else if (textLength <= 150) {
      // Medium text - wider popup
      popupWidth = Math.max(400, Math.min(500, textLength * 4 + 200));
      maxHeight = 200;
    } else if (textLength <= 300) {
      // Long text - large popup
      popupWidth = Math.max(500, Math.min(600, textLength * 3 + 200));
      maxHeight = 250;
    } else {
      // Very long text - maximum size with scrolling
      popupWidth = Math.min(650, window.innerWidth - 40);
      maxHeight = 300;
    }
    
    // Ensure popup doesn't exceed viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    popupWidth = Math.min(popupWidth, viewportWidth - 40);
    maxHeight = Math.min(maxHeight, viewportHeight - 100);
    
    // Smart positioning
    let left = Math.max(20, Math.min(rect.left, viewportWidth - popupWidth - 20));
    let top = rect.bottom + window.scrollY + 10;
    
    // If popup would go below viewport, show it above the selection
    if (rect.bottom + maxHeight > viewportHeight - 20) {
      top = Math.max(window.scrollY + 20, rect.top + window.scrollY - maxHeight - 10);
    }
    
    translationPopup.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      z-index: 2147483647;
      width: ${popupWidth}px;
      max-height: ${maxHeight}px;
      background: #2f3136;
      border: none;
      border-radius: 8px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    document.body.appendChild(translationPopup);
    
    translationPopup.querySelector('.popup-close').onclick = hideTranslationPopup;
    
    setTimeout(() => {
      const closeOnOutside = (e) => {
        if (translationPopup && !translationPopup.contains(e.target)) {
          hideTranslationPopup();
          document.removeEventListener('click', closeOnOutside, true);
        }
      };
      document.addEventListener('click', closeOnOutside, true);
    }, 100);
    
    translateText(text, 'auto', settings.selectTargetLang || 'en')
      .then(translation => {
        if (translationPopup) {
          const body = translationPopup.querySelector('.popup-body');
          
          // FIXED: Dynamic content with proper scrolling for long text
          const translationLength = translation.length;
          let bodyMaxHeight;
          
          if (translationLength <= 100) {
            bodyMaxHeight = 'auto';
          } else if (translationLength <= 300) {
            bodyMaxHeight = '150px';
          } else {
            bodyMaxHeight = '200px';
          }
          
          body.innerHTML = `
            <div style="
              color: #dcddde; 
              font-weight: 500; 
              line-height: 1.5;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              max-height: ${bodyMaxHeight};
              overflow-y: ${bodyMaxHeight === 'auto' ? 'visible' : 'auto'};
              padding-right: ${bodyMaxHeight === 'auto' ? '0' : '8px'};
            ">
              ${translation}
            </div>
          `;
          
          // FIXED: Adjust popup size after translation is loaded
          setTimeout(() => {
            if (translationPopup) {
              const actualHeight = translationPopup.offsetHeight;
              const newTop = rect.bottom + window.scrollY + 10;
              
              // Reposition if popup would go below viewport
              if (newTop + actualHeight > window.scrollY + viewportHeight - 20) {
                const adjustedTop = Math.max(
                  window.scrollY + 20, 
                  rect.top + window.scrollY - actualHeight - 10
                );
                translationPopup.style.top = `${adjustedTop}px`;
              }
            }
          }, 50);
        }
      })
      .catch(error => {
        if (translationPopup) {
          const errorBody = translationPopup.querySelector('.popup-body');
          errorBody.innerHTML = `
            <div style="color: #f04747; word-wrap: break-word;">
              Error: ${error.message}
            </div>
          `;
        }
      });
      
  } catch (error) {
    console.error('Translation popup error:', error);
  }
}

function hideTranslationPopup() {
  if (translationPopup) {
    translationPopup.remove();
    translationPopup = null;
  }
}

function enableSelectionTranslation() {
  setupSelectionTranslation();
}

function disableSelectionTranslation() {
  hideTranslationPopup();
  document.removeEventListener('mouseup', handleSelection, true);
}

// === TEXTBAR TRANSLATION ===
function setupTextbarIcons() {
  const observer = new MutationObserver(() => {
    if (settings.textbarTranslation && isExtensionReady) {
      addTextbarIcons();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  setTimeout(() => addTextbarIcons(), 2000);
  setInterval(() => addTextbarIcons(), 5000);
}

function addTextbarIcons() {
  // Discord-specific selectors
  const discordSelectors = [
    '[data-slate-editor="true"]',
    '[role="textbox"][data-slate-editor]',
    '.markup[role="textbox"]',
    '[data-slate-node="element"][role="textbox"]'
  ];
  
  // Generic selectors for other sites
  const genericSelectors = [
    'input[type="text"]',
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]'
  ];
  
  const allSelectors = [...discordSelectors, ...genericSelectors];
  
  document.querySelectorAll(allSelectors.join(',')).forEach(input => {
    if (!textbarIcons.has(input) && isInputVisible(input)) {
      createTranslationIcon(input);
    }
  });
  
  // Clean up icons for removed elements
  cleanupRemovedIcons();
}

function isInputVisible(input) {
  const rect = input.getBoundingClientRect();
  return rect.width > 30 && rect.height > 20;
}

function cleanupRemovedIcons() {
  textbarIcons.forEach((icon, input) => {
    if (!document.contains(input)) {
      try {
        icon.remove();
        textbarIcons.delete(input);
      } catch (e) {
        console.log('Error cleaning up icon:', e);
      }
    }
  });
}

function createTranslationIcon(input) {
  const icon = document.createElement('div');
  icon.className = 'translator-icon';
  
  // Using your custom icon
  icon.innerHTML = `<img src="${iconBase64Gray}" width="16" height="16" alt="Transient" style="display:block;">`;
  
  icon.title = 'Transient • Click to translate • Hold for settings';
  
  textbarIcons.set(input, icon);
  updateIconPosition(icon, input);
  
  // Discord-style interaction
  let pressTimer = null;
  let isLongPress = false;
  let isMenuOpen = false;
  let menuInstance = null;
  
  // Click for translation
  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLongPress && !isMenuOpen) {
      console.log('Short click - translating');
      handleTranslation(input);
    }
  });
  
  // Mouse down - start long press timer
  icon.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isLongPress = false;
    
    // Discord-style press feedback
    icon.style.transform = 'scale(0.95)';
    icon.style.background = '#40444b';
    
    if (pressTimer) {
      clearTimeout(pressTimer);
    }
    
    pressTimer = setTimeout(() => {
      isLongPress = true;
      isMenuOpen = true;
      
      // Discord-style vibration effect
      icon.style.transform = 'scale(1.05)';
      icon.style.background = '#5865f2';
      
      setTimeout(() => {
        menuInstance = showLanguageMenu(icon, input);
      }, 100);
    }, 500);
  });
  
  // Mouse up
  icon.addEventListener('mouseup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    
    if (!isMenuOpen) {
      isLongPress = false;
      icon.style.transform = 'scale(1)';
      icon.style.background = '#2f3136';
    } else {
      icon.style.transform = 'scale(1)';
      icon.style.background = '#40444b';
    }
  });
  
  // Mouse leave
  icon.addEventListener('mouseleave', (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    
    if (!isMenuOpen) {
      isLongPress = false;
      icon.style.transform = 'scale(1)';
      icon.style.background = '#2f3136';
    }
  });
  
  // Touch events
  icon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    isLongPress = false;
    icon.style.transform = 'scale(0.95)';
    icon.style.background = '#40444b';
    
    if (pressTimer) {
      clearTimeout(pressTimer);
    }
    
    pressTimer = setTimeout(() => {
      isLongPress = true;
      isMenuOpen = true;
      
      icon.style.transform = 'scale(1.05)';
      icon.style.background = '#5865f2';
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      setTimeout(() => {
        menuInstance = showLanguageMenu(icon, input);
      }, 100);
    }, 500);
  }, { passive: false });
  
  icon.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    
    if (!isLongPress && !isMenuOpen) {
      handleTranslation(input);
      icon.style.transform = 'scale(1)';
      icon.style.background = '#2f3136';
    } else if (!isMenuOpen) {
      icon.style.transform = 'scale(1)';
      icon.style.background = '#2f3136';
    } else {
      icon.style.transform = 'scale(1)';
      icon.style.background = '#40444b';
    }
  }, { passive: false });
  
  // Reset menu state
  icon._resetMenuState = () => {
    isMenuOpen = false;
    isLongPress = false;
    menuInstance = null;
    icon.style.transform = 'scale(1)';
    icon.style.background = '#2f3136';
  };
  
  document.body.appendChild(icon);
  
  const updatePos = () => updateIconPosition(icon, input);
  window.addEventListener('scroll', updatePos, { passive: true });
  window.addEventListener('resize', updatePos, { passive: true });
}

function updateIconPosition(icon, input) {
  const rect = input.getBoundingClientRect();
  
  if (!isInputVisible(input)) {
    icon.style.display = 'none';
    return;
  }
  
  icon.style.cssText = `
    position: fixed;
    right: ${window.innerWidth - rect.right + 8}px;
    top: ${rect.top + (rect.height - 28) / 2}px;
    z-index: 2147483646;
    width: 28px;
    height: 28px;
    background: #2f3136;
    color: #b9bbbe;
    border: 1px solid #40444b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    user-select: none;
    transition: all 0.15s ease;
    font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  `;
  
  // Discord-style hover effects
  icon.onmouseenter = () => {
    if (!icon.classList.contains('pressed')) {
      icon.style.transform = 'scale(1.1)';
      icon.style.background = '#40444b';
      icon.style.color = '#ffffff';
      icon.style.borderColor = '#5865f2';
      icon.style.boxShadow = '0 4px 15px rgba(88, 101, 242, 0.3)';
      
      // Change to white icon on hover
      const img = icon.querySelector('img');
      if (img) {
        img.src = iconBase64White;
      }
    }
  };
  
  icon.onmouseleave = () => {
    if (!icon.classList.contains('pressed')) {
      icon.style.transform = 'scale(1)';
      icon.style.background = '#2f3136';
      icon.style.color = '#b9bbbe';
      icon.style.borderColor = '#40444b';
      icon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      
      // Change back to gray icon
      const img = icon.querySelector('img');
      if (img) {
        img.src = iconBase64Gray;
      }
    }
  };
}

// === DISCORD-SPECIFIC TEXT REPLACEMENT WITH ORIGINAL TEXT TRACKING ===
function handleTranslation(input) {
  const originalText = getDiscordText(input);
  
  if (!originalText?.trim()) {
    alert('No text to translate');
    return;
  }
  
  console.log('=== STARTING TRANSIENT TRANSLATION ===');
  console.log('Original text:', originalText);
  console.log('Input type:', getInputType(input));
  
  // Store the original text for restoration
  originalTexts.set(input, originalText);
  
  // Set up backspace restoration listener
  setupBackspaceRestoration(input);
  
  translateText(originalText, settings.textbarSourceLang || 'auto', settings.textbarTargetLang || 'en')
    .then(translation => {
      console.log('Translation received:', translation);
      replaceTextInDiscord(input, translation);
    })
    .catch(error => {
      console.error('Translation failed:', error);
      alert('Translation failed: ' + error.message);
    });
}

function setupBackspaceRestoration(input) {
  console.log('Setting up backspace restoration for input');
  
  // Remove existing listener if any
  if (input._backspaceHandler) {
    input.removeEventListener('keydown', input._backspaceHandler, true);
  }
  
  // Create new backspace handler
  const backspaceHandler = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      console.log('Backspace/Delete detected on translated input');
      
      // Small delay to let the deletion happen first
      setTimeout(() => {
        const currentText = getDiscordText(input);
        const originalText = originalTexts.get(input);
        
        // If text is being edited (not empty), restore original
        if (currentText !== undefined && originalText && currentText.length < originalText.length) {
          console.log('Restoring original text due to backspace');
          restoreOriginalText(input, originalText);
          
          // Remove the restoration listener after use
          input.removeEventListener('keydown', backspaceHandler, true);
          delete input._backspaceHandler;
          originalTexts.delete(input);
        }
      }, 10);
    }
  };
  
  // Store reference and add listener
  input._backspaceHandler = backspaceHandler;
  input.addEventListener('keydown', backspaceHandler, true);
  
  // Also listen for any input changes
  const inputHandler = (e) => {
    const currentText = getDiscordText(input);
    const originalText = originalTexts.get(input);
    
    // If user starts typing new content, remove restoration
    if (originalText && currentText && currentText.length > originalText.length) {
      console.log('User typing new content, removing restoration listener');
      input.removeEventListener('keydown', backspaceHandler, true);
      input.removeEventListener('input', inputHandler, true);
      delete input._backspaceHandler;
      delete input._inputHandler;
      originalTexts.delete(input);
    }
  };
  
  input._inputHandler = inputHandler;
  input.addEventListener('input', inputHandler, true);
  
  // Auto-cleanup after 30 seconds
  setTimeout(() => {
    if (input._backspaceHandler) {
      input.removeEventListener('keydown', input._backspaceHandler, true);
      input.removeEventListener('input', input._inputHandler, true);
      delete input._backspaceHandler;
      delete input._inputHandler;
      originalTexts.delete(input);
    }
  }, 30000);
}

function restoreOriginalText(input, originalText) {
  console.log('Restoring original text:', originalText);
  
  const inputType = getInputType(input);
  
  if (inputType.includes('discord-slate')) {
    restoreInDiscordSlate(input, originalText);
  } else {
    restoreInStandardInput(input, originalText);
  }
}

function restoreInDiscordSlate(input, originalText) {
  console.log('Restoring original text in Discord Slate editor');
  
  const editor = input.hasAttribute('data-slate-editor') ? input : input.closest('[data-slate-editor]');
  
  if (!editor) {
    restoreInStandardInput(input, originalText);
    return;
  }
  
  // Use the same replacement method but with original text
  replaceViaClipboard(editor, originalText, true);
}

function restoreInStandardInput(input, originalText) {
  console.log('Restoring original text in standard input');
  
  input.focus();
  
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    input.value = originalText;
  } else {
    input.textContent = originalText;
  }
  
  // Trigger events
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: originalText
  });
  
  input.dispatchEvent(inputEvent);
  
  // Position cursor at end
  setTimeout(() => {
    input.focus();
    
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  }, 50);
}

function getInputType(input) {
  if (input.hasAttribute('data-slate-editor')) return 'discord-slate';
  if (input.closest('[data-slate-editor]')) return 'discord-slate-child';
  if (input.tagName === 'INPUT') return 'input';
  if (input.tagName === 'TEXTAREA') return 'textarea';
  if (input.hasAttribute('contenteditable')) return 'contenteditable';
  return 'unknown';
}

function replaceTextInDiscord(input, newText) {
  console.log('=== DISCORD TEXT REPLACEMENT ===');
  
  const inputType = getInputType(input);
  console.log('Input type detected:', inputType);
  
  if (inputType.includes('discord-slate')) {
    replaceInDiscordSlate(input, newText);
  } else {
    replaceInStandardInput(input, newText);
  }
}

function replaceInDiscordSlate(input, newText) {
  console.log('Replacing text in Discord Slate editor');
  
  // Find the actual Discord editor element
  const editor = input.hasAttribute('data-slate-editor') ? input : input.closest('[data-slate-editor]');
  
  if (!editor) {
    console.log('Discord editor not found');
    replaceInStandardInput(input, newText);
    return;
  }
  
  // Focus the editor first
  editor.focus();
  
  // Use Discord's own mechanisms
  try {
    // Method 1: Use the clipboard to replace text (most reliable for Discord)
    replaceViaClipboard(editor, newText, false);
  } catch (error) {
    console.log('Clipboard method failed, trying direct replacement');
    replaceDirectInSlate(editor, newText);
  }
}

function replaceViaClipboard(editor, newText, isRestoration = false) {
  console.log('Using clipboard method for Discord', isRestoration ? '(restoration)' : '(translation)');
  
  // Step 1: Select all content
  selectAllInSlate(editor);
  
  // Step 2: Copy translation to clipboard and paste
  navigator.clipboard.writeText(newText).then(() => {
    console.log('Text copied to clipboard, now pasting');
    
    // Trigger paste event
    setTimeout(() => {
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      
      // Add text to clipboard data
      pasteEvent.clipboardData.setData('text/plain', newText);
      
      // Dispatch paste event
      editor.dispatchEvent(pasteEvent);
      
      // Also try Ctrl+V simulation
      const ctrlV = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      
      editor.dispatchEvent(ctrlV);
      
      // Ensure editor remains focused and editable
      setTimeout(() => {
        ensureDiscordEditorReady(editor, isRestoration);
      }, 200);
      
    }, 100);
    
  }).catch(error => {
    console.log('Clipboard API failed:', error);
    replaceDirectInSlate(editor, newText);
  });
}

function selectAllInSlate(editor) {
  console.log('Selecting all content in Slate editor');
  
  // Method 1: Use selection API
  const selection = window.getSelection();
  const range = document.createRange();
  
  try {
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    console.warn('Selection API failed:', e);
  }
  
  // Method 2: Send Ctrl+A
  const selectAll = new KeyboardEvent('keydown', {
    key: 'a',
    code: 'KeyA',
    ctrlKey: true,
    bubbles: true,
    cancelable: true
  });
  
  editor.dispatchEvent(selectAll);
}

function replaceDirectInSlate(editor, newText) {
  console.log('Direct replacement in Slate editor');
  
  // Clear existing content
  selectAllInSlate(editor);
  
  // Send delete key
  const deleteKey = new KeyboardEvent('keydown', {
    key: 'Delete',
    code: 'Delete',
    bubbles: true,
    cancelable: true
  });
  
  editor.dispatchEvent(deleteKey);
  
  // Clear content directly
  const textNodes = editor.querySelectorAll('[data-slate-node="text"]');
  textNodes.forEach(node => {
    node.textContent = '';
  });
  
  // Insert new text
  setTimeout(() => {
    insertTextInSlate(editor, newText);
  }, 50);
}

function insertTextInSlate(editor, text) {
  console.log('Inserting text in Slate editor:', text);
  
  // Method 1: Try insertText command
  const insertSuccess = document.execCommand('insertText', false, text);
  
  if (insertSuccess) {
    console.log('insertText successful');
    setTimeout(() => ensureDiscordEditorReady(editor), 100);
    return;
  }
  
  // Method 2: Create proper Slate structure
  createSlateTextStructure(editor, text);
}

function createSlateTextStructure(editor, text) {
  console.log('Creating Slate text structure');
  
  // Clear existing content
  editor.innerHTML = '';
  
  // Create the structure Discord expects
  const paragraph = document.createElement('span');
  paragraph.setAttribute('data-slate-node', 'element');
  paragraph.setAttribute('data-slate-type', 'line');
  
  const textLeaf = document.createElement('span');
  textLeaf.setAttribute('data-slate-node', 'text');
  textLeaf.setAttribute('data-slate-leaf', 'true');
  
  const textNode = document.createTextNode(text);
  textLeaf.appendChild(textNode);
  paragraph.appendChild(textLeaf);
  editor.appendChild(paragraph);
  
  // Trigger events
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: text
  });
  
  editor.dispatchEvent(inputEvent);
  
  // Ensure editor is ready
  setTimeout(() => ensureDiscordEditorReady(editor), 100);
}

function ensureDiscordEditorReady(editor, isRestoration = false) {
  console.log('Ensuring Discord editor is ready for editing', isRestoration ? '(after restoration)' : '');
  
  // Focus the editor
  editor.focus();
  
  // Position cursor at end with proper error handling
  try {
    const selection = window.getSelection();
    
    if (!selection) {
      console.log('Selection API not available');
      return;
    }
    
    const range = document.createRange();
    const lastTextNode = editor.querySelector('[data-slate-node="text"]');
    
    if (lastTextNode && lastTextNode.firstChild && lastTextNode.firstChild.nodeType === Node.TEXT_NODE) {
      const textLength = lastTextNode.textContent.length;
      range.setStart(lastTextNode.firstChild, Math.min(textLength, lastTextNode.firstChild.textContent.length));
      range.setEnd(lastTextNode.firstChild, Math.min(textLength, lastTextNode.firstChild.textContent.length));
    } else if (editor.childNodes.length > 0) {
      range.setStart(editor, editor.childNodes.length);
      range.setEnd(editor, editor.childNodes.length);
    } else {
      range.setStart(editor, 0);
      range.setEnd(editor, 0);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    
  } catch (e) {
    console.log('Cursor positioning skipped - editor will still function normally');
  }
  
  // Trigger focus and click events
  try {
    const focusEvent = new FocusEvent('focus', { bubbles: true });
    const clickEvent = new MouseEvent('click', { bubbles: true });
    
    editor.dispatchEvent(focusEvent);
    editor.dispatchEvent(clickEvent);
  } catch (e) {
    console.log('Event dispatching had minor issues, but editor should still work');
  }
  
  // Send a dummy key to "activate" the editor
  setTimeout(() => {
    try {
      const dummyKey = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        code: 'ArrowRight',
        bubbles: true
      });
      
      editor.dispatchEvent(dummyKey);
    } catch (e) {
      console.log('Dummy key event skipped');
    }
  }, 50);
  
  console.log('Discord editor setup completed');
}

function replaceInStandardInput(input, newText) {
  console.log('Replacing text in standard input');
  
  input.focus();
  
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    input.select();
    input.value = newText;
  } else {
    const range = document.createRange();
    const selection = window.getSelection();
    
    try {
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {}
    
    input.textContent = newText;
  }
  
  // Trigger events
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: newText
  });
  
  input.dispatchEvent(inputEvent);
  
  // Position cursor at end
  setTimeout(() => {
    input.focus();
    
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  }, 50);
}

function getDiscordText(input) {
  const inputType = getInputType(input);
  
  if (inputType.includes('discord-slate')) {
    // Get text from Discord Slate editor
    const editor = input.hasAttribute('data-slate-editor') ? input : input.closest('[data-slate-editor]');
    
    if (editor) {
      const textNodes = editor.querySelectorAll('[data-slate-node="text"]');
      if (textNodes.length > 0) {
        return Array.from(textNodes).map(node => node.textContent).join('');
      }
      
      return editor.textContent || '';
    }
  }
  
  // Standard input handling
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    return input.value || '';
  }
  
  return input.textContent || input.innerText || '';
}

// === DISCORD-STYLE LANGUAGE MENU ===
function showLanguageMenu(icon, input) {
  // Remove any existing menus
  document.querySelectorAll('.translator-language-menu').forEach(m => m.remove());
  
  console.log('Showing Discord-style language menu');
  
  const menu = document.createElement('div');
  menu.className = 'translator-language-menu';
  menu.innerHTML = `
    <div style="
      padding: 16px;
      background: #5865f2;
      color: white;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img src="${iconBase64White}" width="16" height="16" alt="Transient" style="display:block;">
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 600;">Transient</div>
          <div style="font-size: 12px; opacity: 0.9;">Translation Settings</div>
        </div>
      </div>
      <button style="
        background: #ef4444;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        font-weight: bold;
      " class="menu-close" title="Close menu">×</button>
    </div>
    
    <div style="padding: 16px; background: #2f3136;">
      <div style="margin-bottom: 16px;">
        <label style="
          display: block;
          margin: 0 0 8px 0;
          font-weight: 600;
          color: #b9bbbe;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        ">FROM LANGUAGE</label>
        <select id="quickFromLang" style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #40444b;
          border-radius: 3px;
          font-size: 14px;
          background: #40444b;
          color: #dcddde;
          cursor: pointer;
          transition: border-color 0.15s ease-in-out;
          font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          appearance: menulist;
        ">
          <option value="auto">🔍 Auto-detect</option>
          <option value="en">🇺🇸 English</option>
          <option value="es">🇪🇸 Spanish</option>
          <option value="fr">🇫🇷 French</option>
          <option value="de">🇩🇪 German</option>
          <option value="it">🇮🇹 Italian</option>
          <option value="pt">🇵🇹 Portuguese</option>
          <option value="ru">🇷🇺 Russian</option>
          <option value="ja">🇯🇵 Japanese</option>
          <option value="ko">🇰🇷 Korean</option>
          <option value="zh">🇨🇳 Chinese</option>
          <option value="ar">🇸🇦 Arabic</option>
          <option value="hi">🇮🇳 Hindi</option>
        </select>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="
          display: block;
          margin: 0 0 8px 0;
          font-weight: 600;
          color: #b9bbbe;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        ">TO LANGUAGE</label>
        <select id="quickToLang" style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #40444b;
          border-radius: 3px;
          font-size: 14px;
          background: #40444b;
          color: #dcddde;
          cursor: pointer;
          transition: border-color 0.15s ease-in-out;
          font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          appearance: menulist;
        ">
          <option value="en">🇺🇸 English</option>
          <option value="es">🇪🇸 Spanish</option>
          <option value="fr">🇫🇷 French</option>
          <option value="de">🇩🇪 German</option>
          <option value="it">🇮🇹 Italian</option>
          <option value="pt">🇵🇹 Portuguese</option>
          <option value="ru">🇷🇺 Russian</option>
          <option value="ja">🇯🇵 Japanese</option>
          <option value="ko">🇰🇷 Korean</option>
          <option value="zh">🇨🇳 Chinese</option>
          <option value="ar">🇸🇦 Arabic</option>
          <option value="hi">🇮🇳 Hindi</option>
        </select>
      </div>
      
      <div style="
        background: #1e2328;
        padding: 10px;
        border-radius: 3px;
        text-align: center;
        color: #00d26a;
        font-size: 14px;
        font-weight: 500;
        font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      ">
        ✓ Settings automatically saved
      </div>
    </div>
  `;
  
  // Discord-style positioning
  const iconRect = icon.getBoundingClientRect();
  const menuWidth = 300;
  let left = iconRect.left - menuWidth + 40;
  let top = iconRect.bottom + 10;
  
  if (left < 10) left = iconRect.right + 10;
  if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
  if (top + 250 > window.innerHeight - 10) top = iconRect.top - 260;
  
  menu.style.cssText = `
    position: fixed;
    left: ${left}px;
    top: ${top}px;
    z-index: 2147483648;
    width: ${menuWidth}px;
    background: #2f3136;
    border: none;
    border-radius: 8px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
    font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 14px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  `;
  
  document.body.appendChild(menu);
  
  // Discord-style animation
  requestAnimationFrame(() => {
    menu.style.opacity = '1';
    menu.style.transform = 'translateY(0) scale(1)';
  });
  
  // Set current values
  menu.querySelector('#quickFromLang').value = settings.textbarSourceLang || 'auto';
  menu.querySelector('#quickToLang').value = settings.textbarTargetLang || 'en';
  
  // Discord-style close button
  menu.querySelector('.menu-close').onclick = (e) => {
    e.stopPropagation();
    closeLanguageMenu(menu, icon);
  };
  
  // Discord-style hover effects
  const closeBtn = menu.querySelector('.menu-close');
  closeBtn.onmouseenter = () => {
    closeBtn.style.background = '#d73502';
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.background = '#ef4444';
  };
  
  // Discord-style select focus
  const selects = menu.querySelectorAll('select');
  selects.forEach(select => {
    select.onfocus = () => {
      select.style.borderColor = '#5865f2';
    };
    select.onblur = () => {
      select.style.borderColor = '#40444b';
    };
  });
  
  // Auto-save on change
  menu.querySelector('#quickFromLang').addEventListener('change', (e) => {
    const newFromLang = e.target.value;
    settings.textbarSourceLang = newFromLang;
    
    chrome.storage.sync.set({
      textbarSourceLang: newFromLang
    });
    
    console.log('Auto-saved FROM language:', newFromLang);
  });
  
  menu.querySelector('#quickToLang').addEventListener('change', (e) => {
    const newToLang = e.target.value;
    settings.textbarTargetLang = newToLang;
    
    chrome.storage.sync.set({
      textbarTargetLang: newToLang
    });
    
    console.log('Auto-saved TO language:', newToLang);
  });
  
  // Prevent menu from closing when clicking inside
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  menu.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  menu.addEventListener('mouseup', (e) => {
    e.stopPropagation();
  });
  
  console.log('Discord-style menu created');
  
  // Return menu reference for external control
  return menu;
}

// Close language menu function
function closeLanguageMenu(menu, icon) {
  if (!menu || !menu.parentNode) {
    console.log('Menu already closed or removed');
    return;
  }
  
  console.log('Closing Discord-style language menu');
  
  menu.style.opacity = '0';
  menu.style.transform = 'translateY(-4px) scale(0.98)';
  
  setTimeout(() => {
    if (menu.parentNode) {
      menu.remove();
    }
    // Reset icon state
    if (icon._resetMenuState) {
      icon._resetMenuState();
    }
  }, 150);
}

function enableTextbarIcons() {
  addTextbarIcons();
}

function disableTextbarIcons() {
  textbarIcons.forEach((icon) => {
    try {
      icon.remove();
    } catch (e) {}
  });
  textbarIcons.clear();
  
  // Clear original texts storage
  originalTexts = new WeakMap();
}

// Translation API function
function translateText(text, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      sourceLang: sourceLang,
      targetLang: targetLang
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response?.success) {
        resolve(response.translation);
      } else {
        reject(new Error(response?.error || 'Translation failed'));
      }
    });
  });
}

// Cleanup
window.addEventListener('beforeunload', () => {
  disableTextbarIcons();
  hideTranslationPopup();
});

console.log('Transient: Advanced translation tool loaded by imshanutyagi');
