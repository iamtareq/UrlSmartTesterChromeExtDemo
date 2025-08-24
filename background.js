// Background service worker for UrlSmartTester Chrome Extension
// Orchestrates probe runs, handles artifact saving, and manages extension state

// Track active probe runs
let activeProbeTabs = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('UrlSmartTester installed');
  
  // Set up default configuration
  chrome.storage.sync.get(['allowDomains'], (result) => {
    if (!result.allowDomains) {
      chrome.storage.sync.set({
        allowDomains: ['localhost', '127.0.0.1', 'example.com'],
        maxFields: 6,
        timeout: 15000,
        sameOriginOnly: true,
        includeSqlInjection: true,
        includeXss: true
      });
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  switch (message.action) {
    case 'startProbe':
      handleStartProbe(message.config, sender.tab)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open
      
    case 'saveArtifacts':
      handleSaveArtifacts(message.result, message.config, message.isError)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open
      
    case 'getProbeStatus':
      const status = activeProbeTabs.get(sender.tab?.id || message.tabId);
      sendResponse({ success: true, status: status || 'idle' });
      break;
      
    case 'cancelProbe':
      const tabId = sender.tab?.id || message.tabId;
      if (activeProbeTabs.has(tabId)) {
        activeProbeTabs.set(tabId, 'cancelled');
        sendResponse({ success: true, cancelled: true });
      } else {
        sendResponse({ success: false, error: 'No active probe' });
      }
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle tab updates to clean up probe status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear probe status when tab starts loading new page
    if (activeProbeTabs.has(tabId)) {
      activeProbeTabs.delete(tabId);
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeProbeTabs.delete(tabId);
});

// Start probe on specified tab
async function handleStartProbe(config, tab) {
  if (!tab) {
    throw new Error('No target tab specified');
  }
  
  const tabId = tab.id;
  
  // Check if probe is already running on this tab
  if (activeProbeTabs.get(tabId) === 'running') {
    throw new Error('Probe already running on this tab');
  }
  
  try {
    // Mark probe as running
    activeProbeTabs.set(tabId, 'running');
    
    console.log(`Starting probe on tab ${tabId} with URL: ${tab.url}`);
    
    // Check if we can access the tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot run probe on Chrome internal pages');
    }
    
    // Send message to content script to run probe
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'runProbe',
      config: config
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Probe failed');
    }
    
    // Mark as completed
    activeProbeTabs.set(tabId, 'completed');
    
    console.log('Probe completed successfully');
    return result.result;
    
  } catch (error) {
    // Mark as failed
    activeProbeTabs.set(tabId, 'failed');
    
    console.error('Probe failed:', error);
    
    // Try to inject content script if not present
    if (error.message.includes('Could not establish connection')) {
      try {
        await injectContentScript(tabId);
        
        // Retry the probe
        const retryResult = await chrome.tabs.sendMessage(tabId, {
          action: 'runProbe', 
          config: config
        });
        
        if (retryResult.success) {
          activeProbeTabs.set(tabId, 'completed');
          return retryResult.result;
        }
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
      }
    }
    
    throw error;
  }
}

// Inject content script into tab
async function injectContentScript(tabId) {
  const scripts = [
    'config.js',
    'utils.js',
    'dataset.js', 
    'security_payloads.js',
    'content.js'
  ];
  
  for (const script of scripts) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [script]
    });
  }
}

// Save artifacts to downloads folder
async function handleSaveArtifacts(result, config, isError = false) {
  try {
    console.log('Saving artifacts...', { isError, result });
    
    // Generate timestamp and directory name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const dirName = `artifacts/${timestamp}`;
    
    // Create artifacts data
    const artifacts = [];
    
    // 1. Save result.json
    const resultBlob = new Blob([JSON.stringify(result, null, 2)], { 
      type: 'application/json' 
    });
    const resultUrl = URL.createObjectURL(resultBlob);
    
    artifacts.push({
      filename: `${dirName}/result.json`,
      url: resultUrl
    });
    
    // 2. Save dataset.json if available
    if (result.dataset) {
      const datasetBlob = new Blob([JSON.stringify(result.dataset, null, 2)], { 
        type: 'application/json' 
      });
      const datasetUrl = URL.createObjectURL(datasetBlob);
      
      artifacts.push({
        filename: `${dirName}/dataset.json`,
        url: datasetUrl
      });
    }
    
    // 3. Save console.log if console errors exist
    if (result.consoleErrors && result.consoleErrors.length > 0) {
      const consoleContent = result.consoleErrors.map(err => 
        `[${err.timestamp}] ${err.message}\n${err.stack || ''}\n`
      ).join('\n---\n');
      
      const consoleBlob = new Blob([consoleContent], { 
        type: 'text/plain' 
      });
      const consoleUrl = URL.createObjectURL(consoleBlob);
      
      artifacts.push({
        filename: `${dirName}/console.log`,
        url: consoleUrl
      });
    }
    
    // 4. Take screenshot
    try {
      const activeTab = await getCurrentActiveTab();
      if (activeTab) {
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
          activeTab.windowId, 
          { format: 'png', quality: 90 }
        );
        
        artifacts.push({
          filename: `${dirName}/after-submit.png`,
          url: screenshotDataUrl
        });
      }
    } catch (screenshotError) {
      console.error('Failed to capture screenshot:', screenshotError);
      
      // Add error info to result
      if (!result.errors) result.errors = [];
      result.errors.push({
        type: 'screenshot_error',
        message: screenshotError.message
      });
    }
    
    // Download all artifacts
    const downloadIds = [];
    
    for (const artifact of artifacts) {
      try {
        const downloadId = await chrome.downloads.download({
          url: artifact.url,
          filename: artifact.filename,
          saveAs: false // Don't prompt user for each file
        });
        
        downloadIds.push(downloadId);
        console.log(`Started download: ${artifact.filename} (ID: ${downloadId})`);
        
      } catch (downloadError) {
        console.error(`Failed to download ${artifact.filename}:`, downloadError);
      }
    }
    
    // Clean up blob URLs after a delay
    setTimeout(() => {
      artifacts.forEach(artifact => {
        if (artifact.url.startsWith('blob:')) {
          URL.revokeObjectURL(artifact.url);
        }
      });
    }, 10000); // 10 seconds delay
    
    return {
      timestamp: timestamp,
      directoryName: dirName,
      artifactCount: artifacts.length,
      downloadIds: downloadIds
    };
    
  } catch (error) {
    console.error('Error saving artifacts:', error);
    throw error;
  }
}

// Get current active tab
async function getCurrentActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Listen for download completion
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log(`Download ${delta.id} completed`);
  } else if (delta.state && delta.state.current === 'interrupted') {
    console.error(`Download ${delta.id} failed`);
  }
});

// Monitor for network errors (basic implementation)
let networkErrors = [];

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (activeProbeTabs.has(details.tabId)) {
      networkErrors.push({
        timestamp: new Date().toISOString(),
        url: details.url,
        error: details.error,
        method: details.method
      });
    }
  },
  { urls: ['<all_urls>'] }
);

// Add webRequest permission handling
chrome.runtime.onStartup.addListener(() => {
  console.log('UrlSmartTester service worker started');
});

console.log('UrlSmartTester background service worker loaded');