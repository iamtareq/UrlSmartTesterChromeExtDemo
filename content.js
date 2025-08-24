// Content script for UrlSmartTester Chrome Extension
// Detects form fields, fills with test data, submits forms, and collects results

// Initialize console error collection
window.urlSmartTesterConsoleErrors = [];

// Override console.error to capture errors
const originalConsoleError = console.error;
console.error = function(...args) {
  window.urlSmartTesterConsoleErrors.push({
    timestamp: new Date().toISOString(),
    message: args.map(arg => typeof arg === 'string' ? arg : String(arg)).join(' '),
    stack: new Error().stack
  });
  originalConsoleError.apply(console, args);
};

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'runProbe') {
    runSmartProbe(message.config)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'detectFields') {
    const fields = window.UrlSmartTesterUtils.detectInputFields();
    sendResponse({ success: true, fieldCount: fields.length });
    return false;
  }
  
  if (message.action === 'ping') {
    sendResponse({ success: true, url: window.location.href });
    return false;
  }
});

// Main probe function
async function runSmartProbe(config) {
  try {
    console.log('Starting UrlSmartTester probe with config:', config);
    
    // Check domain allowlist
    if (!window.UrlSmartTesterConfig.isDomainAllowed(window.location.href, config.allowDomains)) {
      throw new Error('Domain not in allowlist');
    }
    
    // Check same origin if enabled
    if (config.sameOriginOnly) {
      const referrer = document.referrer || window.location.href;
      if (!window.UrlSmartTesterUtils.isSameOrigin(window.location.href, referrer)) {
        throw new Error('Same origin policy violation');
      }
    }
    
    // Detect input fields
    const inputFields = window.UrlSmartTesterUtils.detectInputFields();
    console.log(`Found ${inputFields.length} input fields`);
    
    if (inputFields.length === 0) {
      throw new Error('No input fields found on page');
    }
    
    // Limit fields based on configuration
    const limitedFields = inputFields.slice(0, config.maxFields || 6);
    console.log(`Testing ${limitedFields.length} fields (limited by maxFields)`);
    
    // Generate mutation dataset
    const dataset = window.UrlSmartTesterDataset.generateMultiFieldDataset(limitedFields, config);
    console.log('Generated mutation dataset:', dataset);
    
    // Clear previous console errors
    window.urlSmartTesterConsoleErrors = [];
    
    // Capture initial state
    const initialErrors = window.UrlSmartTesterUtils.findVisibleErrors();
    const initialUrl = window.location.href;
    
    // Fill fields with test data and submit
    const testResults = [];
    
    for (let i = 0; i < dataset.datasets.length; i++) {
      const fieldDataset = dataset.datasets[i];
      const element = limitedFields[i];
      
      console.log(`Testing field ${i + 1}/${dataset.datasets.length}: ${fieldDataset.fieldName}`);
      
      // Test first few mutations for this field
      const mutationsToTest = fieldDataset.mutations.slice(0, 5); // Limit for performance
      
      for (let j = 0; j < mutationsToTest.length; j++) {
        const mutation = mutationsToTest[j];
        
        try {
          // Fill field with mutation data
          window.UrlSmartTesterUtils.fillFormField(element, mutation);
          
          // Short delay to let any validation run
          await window.UrlSmartTesterUtils.sleep(100);
          
          // Collect any immediate errors
          const fieldErrors = window.UrlSmartTesterUtils.findVisibleErrors();
          const newErrors = fieldErrors.filter(err => 
            !initialErrors.some(initial => initial.text === err.text)
          );
          
          testResults.push({
            fieldName: fieldDataset.fieldName,
            mutation: mutation,
            mutationIndex: j,
            errors: newErrors,
            consoleErrors: window.urlSmartTesterConsoleErrors.slice()
          });
          
        } catch (error) {
          console.error(`Error testing mutation ${j} on field ${fieldDataset.fieldName}:`, error);
          testResults.push({
            fieldName: fieldDataset.fieldName,
            mutation: mutation,
            mutationIndex: j,
            error: error.message,
            errors: [],
            consoleErrors: []
          });
        }
      }
    }
    
    // Fill all fields with final test data for submission
    console.log('Filling all fields for final submission');
    for (let i = 0; i < limitedFields.length; i++) {
      const element = limitedFields[i];
      const fieldDataset = dataset.datasets[i];
      
      // Use first mutation that's likely to cause interesting behavior
      const finalMutation = fieldDataset.mutations.find(m => m.includes('<') || m.includes('\'') || m === '') || 
                           fieldDataset.mutations[0] || 
                           'test';
      
      window.UrlSmartTesterUtils.fillFormField(element, finalMutation);
    }
    
    // Wait for any validation
    await window.UrlSmartTesterUtils.sleep(500);
    
    // Attempt form submission
    console.log('Attempting form submission');
    const submissionResult = await window.UrlSmartTesterUtils.submitForm(limitedFields, config.timeout || 15000);
    console.log('Submission result:', submissionResult);
    
    // Wait for any response/redirection
    await window.UrlSmartTesterUtils.sleep(1000);
    
    // Collect final state
    const finalErrors = window.UrlSmartTesterUtils.findVisibleErrors();
    const finalConsoleErrors = window.urlSmartTesterConsoleErrors.slice();
    const finalUrl = window.location.href;
    const urlChanged = finalUrl !== initialUrl;
    
    // Create result data
    const result = window.UrlSmartTesterUtils.createArtifactData(
      initialUrl,
      dataset,
      {
        submission: submissionResult,
        urlChanged: urlChanged,
        finalUrl: finalUrl,
        testResults: testResults
      },
      finalConsoleErrors,
      finalErrors
    );
    
    console.log('Probe completed successfully', result);
    
    // Send result to background script for artifact saving
    chrome.runtime.sendMessage({
      action: 'saveArtifacts',
      result: result,
      config: config
    });
    
    return result;
    
  } catch (error) {
    console.error('Probe failed:', error);
    
    // Create error result
    const errorResult = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      error: error.message,
      consoleErrors: window.urlSmartTesterConsoleErrors,
      visibleErrors: window.UrlSmartTesterUtils.findVisibleErrors()
    };
    
    // Send error result to background
    chrome.runtime.sendMessage({
      action: 'saveArtifacts',
      result: errorResult,
      config: config,
      isError: true
    });
    
    throw error;
  }
}

// Capture network errors (if available)
if (typeof PerformanceObserver !== 'undefined') {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('http') && entry.responseStart === 0) {
          // Network error detected
          if (!window.urlSmartTesterNetworkErrors) {
            window.urlSmartTesterNetworkErrors = [];
          }
          window.urlSmartTesterNetworkErrors.push({
            timestamp: new Date().toISOString(),
            url: entry.name,
            type: 'network_error'
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.warn('Could not set up network error monitoring:', error);
  }
}

// Inject required scripts if not already present
if (!window.UrlSmartTesterUtils) {
  // Load required modules
  const requiredScripts = ['config.js', 'utils.js', 'dataset.js', 'security_payloads.js'];
  
  for (const script of requiredScripts) {
    try {
      // Create script element
      const scriptElement = document.createElement('script');
      scriptElement.src = chrome.runtime.getURL(script);
      scriptElement.onload = () => console.log(`Loaded ${script}`);
      scriptElement.onerror = () => console.error(`Failed to load ${script}`);
      
      // Add to head
      (document.head || document.documentElement).appendChild(scriptElement);
    } catch (error) {
      console.error(`Error loading ${script}:`, error);
    }
  }
}

console.log('UrlSmartTester content script loaded');