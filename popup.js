// Popup script for UrlSmartTester Chrome Extension
// Provides the main UI for starting probes

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Popup loaded');
  
  // Get UI elements
  const runButton = document.getElementById('runProbe');
  const statusDiv = document.getElementById('status');
  const optionsButton = document.getElementById('openOptions');
  const warningDiv = document.getElementById('warning');
  const fieldCountSpan = document.getElementById('fieldCount');
  const urlSpan = document.getElementById('currentUrl');
  
  // Load current configuration
  let currentConfig = null;
  
  try {
    const stored = await chrome.storage.sync.get([
      'allowDomains', 'maxFields', 'timeout', 'sameOriginOnly', 
      'includeSqlInjection', 'includeXss'
    ]);
    
    currentConfig = {
      allowDomains: stored.allowDomains || ['localhost', '127.0.0.1', 'example.com'],
      maxFields: stored.maxFields || 6,
      timeout: stored.timeout || 15000,
      sameOriginOnly: stored.sameOriginOnly !== false, // Default true
      includeSqlInjection: stored.includeSqlInjection !== false, // Default true
      includeXss: stored.includeXss !== false // Default true
    };
    
    console.log('Loaded config:', currentConfig);
  } catch (error) {
    console.error('Error loading config:', error);
    updateStatus(chrome.i18n.getMessage('error') + ': ' + error.message, 'error');
    return;
  }
  
  // Get current tab information
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      updateStatus(chrome.i18n.getMessage('error') + ': No active tab', 'error');
      return;
    }
    
    // Update URL display
    if (urlSpan) {
      urlSpan.textContent = tab.url;
    }
    
    console.log('Current tab:', tab.url);
    
    // Check if domain is allowed
    const hostname = new URL(tab.url).hostname;
    const isAllowed = currentConfig.allowDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      updateStatus(chrome.i18n.getMessage('domainNotAllowed'), 'warning');
      if (warningDiv) {
        warningDiv.style.display = 'block';
      }
    }
    
    // Check for Chrome internal pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      updateStatus('Cannot run probe on Chrome internal pages', 'error');
      runButton.disabled = true;
      return;
    }
    
    // Try to detect fields on current page
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectFields' });
      if (response && response.success) {
        if (fieldCountSpan) {
          fieldCountSpan.textContent = response.fieldCount;
        }
        
        if (response.fieldCount === 0) {
          updateStatus(chrome.i18n.getMessage('noFieldsFound'), 'warning');
        } else {
          updateStatus(`${chrome.i18n.getMessage('testingFields')}: ${response.fieldCount}`, 'info');
        }
      }
    } catch (error) {
      // Content script not injected yet, this is normal
      console.log('Content script not ready, will inject when needed');
      updateStatus(chrome.i18n.getMessage('loading'), 'info');
    }
    
  } catch (error) {
    console.error('Error getting tab info:', error);
    updateStatus(chrome.i18n.getMessage('error') + ': ' + error.message, 'error');
  }
  
  // Set up event listeners
  if (runButton) {
    runButton.addEventListener('click', handleRunProbe);
  }
  
  if (optionsButton) {
    optionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Handle probe run
  async function handleRunProbe() {
    console.log('Run probe clicked');
    
    try {
      // Disable button and show running status
      runButton.disabled = true;
      runButton.textContent = chrome.i18n.getMessage('probeRunning');
      updateStatus(chrome.i18n.getMessage('probeRunning'), 'info');
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab');
      }
      
      // Start probe
      const response = await chrome.runtime.sendMessage({
        action: 'startProbe',
        config: currentConfig,
        tabId: tab.id
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Probe failed');
      }
      
      // Success
      updateStatus(chrome.i18n.getMessage('probeComplete'), 'success');
      
      // Show results summary
      const result = response.result;
      if (result) {
        let summary = `✅ ${chrome.i18n.getMessage('probeComplete')}\n`;
        summary += `📊 Fields tested: ${result.dataset?.totalFields || 0}\n`;
        summary += `⚠️ Errors found: ${(result.visibleErrors?.length || 0) + (result.consoleErrors?.length || 0)}\n`;
        summary += `📁 ${chrome.i18n.getMessage('artifactsSaved')}\n`;
        
        updateStatus(summary, 'success');
      }
      
    } catch (error) {
      console.error('Probe failed:', error);
      updateStatus(chrome.i18n.getMessage('probeError') + ': ' + error.message, 'error');
    } finally {
      // Re-enable button
      runButton.disabled = false;
      runButton.textContent = chrome.i18n.getMessage('runProbe');
    }
  }
  
  // Update status display
  function updateStatus(message, type = 'info') {
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    console.log(`Status: ${message} (${type})`);
  }
  
  // Check probe status on load
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const statusResponse = await chrome.runtime.sendMessage({
        action: 'getProbeStatus',
        tabId: tab.id
      });
      
      if (statusResponse.success) {
        const status = statusResponse.status;
        if (status === 'running') {
          runButton.disabled = true;
          runButton.textContent = chrome.i18n.getMessage('probeRunning');
          updateStatus(chrome.i18n.getMessage('probeRunning'), 'info');
        } else if (status === 'completed') {
          updateStatus(chrome.i18n.getMessage('probeComplete'), 'success');
        } else if (status === 'failed') {
          updateStatus(chrome.i18n.getMessage('probeError'), 'error');
        }
      }
    }
  } catch (error) {
    console.log('Could not get probe status:', error);
  }
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'probeStatusUpdate') {
    const statusDiv = document.getElementById('status');
    const runButton = document.getElementById('runProbe');
    
    if (message.status === 'completed') {
      if (statusDiv) statusDiv.textContent = chrome.i18n.getMessage('probeComplete');
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = chrome.i18n.getMessage('runProbe');
      }
    } else if (message.status === 'failed') {
      if (statusDiv) statusDiv.textContent = chrome.i18n.getMessage('probeError');
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = chrome.i18n.getMessage('runProbe');
      }
    }
  }
});

console.log('Popup script initialized');