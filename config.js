// Default configuration values for UrlSmartTester Chrome Extension
const DEFAULT_CONFIG = {
  // Domain allowlist - domains that are safe to test
  allowDomains: ['localhost', '127.0.0.1', 'example.com'],
  
  // Maximum number of fields to test per page
  maxFields: 6,
  
  // Global timeout for operations (milliseconds)
  timeout: 15000,
  
  // Only test forms on same origin as current page
  sameOriginOnly: true,
  
  // Include SQL injection payloads in testing
  includeSqlInjection: true,
  
  // Include XSS payloads in testing
  includeXss: true,
  
  // Screenshot format
  screenshotFormat: 'png',
  
  // Artifact directory prefix
  artifactDirPrefix: 'artifacts'
};

// Load configuration from chrome storage, merge with defaults
async function loadConfig() {
  try {
    const stored = await chrome.storage.sync.get(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG, ...stored };
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

// Save configuration to chrome storage
async function saveConfig(config) {
  try {
    await chrome.storage.sync.set(config);
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Check if current domain is allowed for testing
function isDomainAllowed(url, allowDomains) {
  try {
    const hostname = new URL(url).hostname;
    return allowDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (error) {
    console.error('Error checking domain:', error);
    return false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_CONFIG, loadConfig, saveConfig, isDomainAllowed };
} else {
  // Browser environment - attach to window
  window.UrlSmartTesterConfig = { DEFAULT_CONFIG, loadConfig, saveConfig, isDomainAllowed };
}