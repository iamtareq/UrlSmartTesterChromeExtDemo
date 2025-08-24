// Options page script for UrlSmartTester Chrome Extension
// Handles configuration settings

document.addEventListener('DOMContentLoaded', function() {
  console.log('Options page loaded');
  
  // Get form elements
  const allowDomainsTextarea = document.getElementById('allowDomains');
  const maxFieldsInput = document.getElementById('maxFields');
  const timeoutInput = document.getElementById('timeout');
  const sameOriginOnlyCheckbox = document.getElementById('sameOriginOnly');
  const includeSqlInjectionCheckbox = document.getElementById('includeSqlInjection');
  const includeXssCheckbox = document.getElementById('includeXss');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const statusDiv = document.getElementById('status');
  
  // Default values
  const defaultConfig = {
    allowDomains: ['localhost', '127.0.0.1', 'example.com'],
    maxFields: 6,
    timeout: 15000,
    sameOriginOnly: true,
    includeSqlInjection: true,
    includeXss: true
  };
  
  // Load saved settings
  loadSettings();
  
  // Event listeners
  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', resetSettings);
  
  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'allowDomains', 
        'maxFields', 
        'timeout', 
        'sameOriginOnly', 
        'includeSqlInjection', 
        'includeXss'
      ]);
      
      // Populate form fields
      const allowDomains = result.allowDomains || defaultConfig.allowDomains;
      allowDomainsTextarea.value = Array.isArray(allowDomains) 
        ? allowDomains.join(', ') 
        : allowDomains;
      
      maxFieldsInput.value = result.maxFields || defaultConfig.maxFields;
      timeoutInput.value = result.timeout || defaultConfig.timeout;
      sameOriginOnlyCheckbox.checked = result.sameOriginOnly !== false; // Default true
      includeSqlInjectionCheckbox.checked = result.includeSqlInjection !== false; // Default true  
      includeXssCheckbox.checked = result.includeXss !== false; // Default true
      
      console.log('Settings loaded:', result);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('সেটিংস লোড করতে ব্যর্থ: ' + error.message, 'error');
    }
  }
  
  // Save settings to storage
  async function saveSettings() {
    try {
      // Validate inputs
      const maxFields = parseInt(maxFieldsInput.value);
      const timeout = parseInt(timeoutInput.value);
      
      if (isNaN(maxFields) || maxFields < 1 || maxFields > 20) {
        throw new Error('ফিল্ড সংখ্যা ১-২০ এর মধ্যে হতে হবে');
      }
      
      if (isNaN(timeout) || timeout < 5000 || timeout > 60000) {
        throw new Error('টাইমআউট ৫০০০-৬০০০০ মিলিসেকেন্ড এর মধ্যে হতে হবে');
      }
      
      // Parse domains
      const domainsText = allowDomainsTextarea.value.trim();
      if (!domainsText) {
        throw new Error('অন্তত একটি ডোমেইন যোগ করুন');
      }
      
      const allowDomains = domainsText
        .split(',')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);
      
      if (allowDomains.length === 0) {
        throw new Error('বৈধ ডোমেইন যোগ করুন');
      }
      
      // Validate domains
      for (const domain of allowDomains) {
        if (!/^[a-zA-Z0-9\-\.]+$/.test(domain)) {
          throw new Error(`অবৈধ ডোমেইন: ${domain}`);
        }
      }
      
      // Prepare settings object
      const settings = {
        allowDomains: allowDomains,
        maxFields: maxFields,
        timeout: timeout,
        sameOriginOnly: sameOriginOnlyCheckbox.checked,
        includeSqlInjection: includeSqlInjectionCheckbox.checked,
        includeXss: includeXssCheckbox.checked
      };
      
      // Save to storage
      await chrome.storage.sync.set(settings);
      
      console.log('Settings saved:', settings);
      showStatus('✅ সেটিংস সফলভাবে সংরক্ষিত হয়েছে', 'success');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        hideStatus();
      }, 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('❌ সেটিংস সংরক্ষণে ব্যর্থ: ' + error.message, 'error');
    }
  }
  
  // Reset settings to defaults
  async function resetSettings() {
    if (!confirm('সব সেটিংস ডিফল্ট অবস্থায় ফিরিয়ে আনবেন?')) {
      return;
    }
    
    try {
      // Clear all settings
      await chrome.storage.sync.clear();
      
      // Set default values in form
      allowDomainsTextarea.value = defaultConfig.allowDomains.join(', ');
      maxFieldsInput.value = defaultConfig.maxFields;
      timeoutInput.value = defaultConfig.timeout;
      sameOriginOnlyCheckbox.checked = defaultConfig.sameOriginOnly;
      includeSqlInjectionCheckbox.checked = defaultConfig.includeSqlInjection;
      includeXssCheckbox.checked = defaultConfig.includeXss;
      
      // Save defaults to storage
      await chrome.storage.sync.set(defaultConfig);
      
      console.log('Settings reset to defaults');
      showStatus('✅ সেটিংস রিসেট করা হয়েছে', 'success');
      
      // Auto-hide message after 3 seconds
      setTimeout(() => {
        hideStatus();
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('❌ সেটিংস রিসেট করতে ব্যর্থ: ' + error.message, 'error');
    }
  }
  
  // Show status message
  function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Scroll to status message
    statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Hide status message
  function hideStatus() {
    statusDiv.style.display = 'none';
  }
  
  // Add input validation
  allowDomainsTextarea.addEventListener('blur', function() {
    const value = this.value.trim();
    if (value) {
      // Clean up formatting
      const domains = value.split(',').map(d => d.trim()).filter(d => d);
      this.value = domains.join(', ');
    }
  });
  
  maxFieldsInput.addEventListener('input', function() {
    const value = parseInt(this.value);
    if (isNaN(value) || value < 1) {
      this.value = 1;
    } else if (value > 20) {
      this.value = 20;
    }
  });
  
  timeoutInput.addEventListener('input', function() {
    const value = parseInt(this.value);
    if (isNaN(value) || value < 5000) {
      this.value = 5000;
    } else if (value > 60000) {
      this.value = 60000;
    }
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        saveSettings();
      } else if (e.key === 'r') {
        e.preventDefault();
        resetSettings();
      }
    }
  });
  
  // Show keyboard shortcuts hint
  console.log('Keyboard shortcuts: Ctrl+S to save, Ctrl+R to reset');
});

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

console.log('Options page script initialized');