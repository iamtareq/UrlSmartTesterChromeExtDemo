// Utility functions for UrlSmartTester Chrome Extension

// Generate timestamp string for file naming
function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

// Create artifact directory name
function createArtifactDirectoryName(prefix = 'artifacts') {
  return `${prefix}/${generateTimestamp()}`;
}

// Detect all visible input fields on page
function detectInputFields() {
  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
  const elements = document.querySelectorAll(selector);
  
  // Filter to only visible elements
  return Array.from(elements).filter(element => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  });
}

// Find submit buttons using heuristics
function findSubmitButtons() {
  const submitButtons = [];
  
  // Look for explicit submit buttons
  submitButtons.push(...document.querySelectorAll('button[type="submit"], input[type="submit"]'));
  
  // Look for buttons with submit-like text (case insensitive, multiple languages)
  const submitTexts = [
    'submit', 'send', 'login', 'signin', 'sign in', 'log in',
    'সাবমিট', 'পাঠান', 'লগইন', 'সাইন ইন',
    'إرسال', '发送', 'Отправить', 'Enviar'
  ];
  
  const allButtons = document.querySelectorAll('button, input[type="button"]');
  for (const button of allButtons) {
    const text = (button.textContent || button.value || '').toLowerCase().trim();
    if (submitTexts.some(submitText => text.includes(submitText))) {
      submitButtons.push(button);
    }
  }
  
  return submitButtons;
}

// Submit form using various strategies
async function submitForm(inputElements, timeout = 5000) {
  return new Promise((resolve) => {
    let submitted = false;
    
    // Set timeout
    const timer = setTimeout(() => {
      if (!submitted) {
        submitted = true;
        resolve({ success: false, method: 'timeout', error: 'Submission timeout' });
      }
    }, timeout);
    
    // Strategy 1: Find and click submit buttons
    const submitButtons = findSubmitButtons();
    if (submitButtons.length > 0 && !submitted) {
      try {
        const button = submitButtons[0];
        button.click();
        
        // Wait a bit to see if form submission happened
        setTimeout(() => {
          if (!submitted) {
            submitted = true;
            clearTimeout(timer);
            resolve({ success: true, method: 'button_click', element: button.tagName + (button.type ? `[type="${button.type}"]` : '') });
          }
        }, 1000);
        return;
      } catch (error) {
        console.error('Error clicking submit button:', error);
      }
    }
    
    // Strategy 2: Press Enter on first input field
    if (inputElements.length > 0 && !submitted) {
      try {
        const firstInput = inputElements[0];
        firstInput.focus();
        
        // Create and dispatch Enter key event
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        
        firstInput.dispatchEvent(enterEvent);
        
        setTimeout(() => {
          if (!submitted) {
            submitted = true;
            clearTimeout(timer);
            resolve({ success: true, method: 'enter_key', element: firstInput.tagName });
          }
        }, 1000);
        return;
      } catch (error) {
        console.error('Error pressing Enter:', error);
      }
    }
    
    // Strategy 3: Try form.submit() on parent form
    if (inputElements.length > 0 && !submitted) {
      try {
        const form = inputElements[0].closest('form');
        if (form) {
          form.submit();
          
          setTimeout(() => {
            if (!submitted) {
              submitted = true;
              clearTimeout(timer);
              resolve({ success: true, method: 'form_submit', element: 'form' });
            }
          }, 1000);
          return;
        }
      } catch (error) {
        console.error('Error calling form.submit():', error);
      }
    }
    
    // If no strategy worked
    if (!submitted) {
      submitted = true;
      clearTimeout(timer);
      resolve({ success: false, method: 'no_strategy', error: 'No suitable submission method found' });
    }
  });
}

// Collect console errors from the page
function collectConsoleErrors() {
  // This will be populated by content script listening to console events
  return window.urlSmartTesterConsoleErrors || [];
}

// Find visible error messages on the page
function findVisibleErrors() {
  const errorSelectors = [
    '.error', '.err', '.validation-error', '.field-error', '.form-error',
    '.alert-danger', '.alert-error', '.text-danger', '.text-error',
    '[class*="error"]', '[class*="invalid"]', '[role="alert"]'
  ];
  
  const errorElements = [];
  
  for (const selector of errorSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const text = element.textContent?.trim();
      
      if (
        text &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        errorElements.push({
          selector: selector,
          text: text,
          element: element.tagName
        });
      }
    }
  }
  
  return errorElements;
}

// Fill form field with value, respecting maxlength
function fillFormField(element, value) {
  try {
    // Clear existing value
    element.value = '';
    element.focus();
    
    // For select elements
    if (element.tagName.toLowerCase() === 'select') {
      // Try to find matching option
      const option = Array.from(element.options).find(opt => 
        opt.value === value || opt.textContent.trim() === value
      );
      if (option) {
        element.selectedIndex = option.index;
      }
      return;
    }
    
    // For other input types, set value and trigger events
    let finalValue = String(value);
    
    // Respect maxlength attribute
    if (element.maxLength > 0 && finalValue.length > element.maxLength) {
      finalValue = finalValue.substring(0, element.maxLength);
    }
    
    element.value = finalValue;
    
    // Trigger input events to notify any listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
  } catch (error) {
    console.error('Error filling field:', error);
  }
}

// Wait for specified time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if URL is same origin
function isSameOrigin(url1, url2) {
  try {
    const origin1 = new URL(url1).origin;
    const origin2 = new URL(url2).origin;
    return origin1 === origin2;
  } catch (error) {
    return false;
  }
}

// Sanitize filename for saving
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Create artifact data structure
function createArtifactData(url, dataset, result, consoleErrors, visibleErrors, networkErrors = []) {
  return {
    timestamp: new Date().toISOString(),
    url: url,
    dataset: dataset,
    result: result,
    consoleErrors: consoleErrors,
    visibleErrors: visibleErrors,
    networkErrors: networkErrors,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateTimestamp,
    createArtifactDirectoryName,
    detectInputFields,
    findSubmitButtons,
    submitForm,
    collectConsoleErrors,
    findVisibleErrors,
    fillFormField,
    sleep,
    isSameOrigin,
    sanitizeFilename,
    createArtifactData
  };
} else {
  // Browser environment - attach to window
  window.UrlSmartTesterUtils = {
    generateTimestamp,
    createArtifactDirectoryName,
    detectInputFields,
    findSubmitButtons,
    submitForm,
    collectConsoleErrors,
    findVisibleErrors,
    fillFormField,
    sleep,
    isSameOrigin,
    sanitizeFilename,
    createArtifactData
  };
}