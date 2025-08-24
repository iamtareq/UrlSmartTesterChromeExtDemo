// Dataset generation for mutation testing of form fields
// Generates comprehensive test data for different input types

// Import security payloads if available
const getSecurityPayloads = (typeof window !== 'undefined' && window.UrlSmartTesterPayloads) 
  ? window.UrlSmartTesterPayloads.getSecurityPayloads 
  : null;

// Base string mutations for text inputs
function generateStringMutations(maxLength = 255, includeSecurityPayloads = true) {
  const mutations = [];
  
  // Basic string tests
  mutations.push(""); // Empty string
  mutations.push("a"); // Single character
  
  if (maxLength > 1) {
    mutations.push("A".repeat(Math.max(1, maxLength - 1))); // Max length - 1
    mutations.push("B".repeat(maxLength)); // Exact max length
    
    if (maxLength < 1000) {
      mutations.push("C".repeat(maxLength + 1)); // Max length + 1 (will be truncated)
    }
  }
  
  // Whitespace variations
  mutations.push(" "); // Single space
  mutations.push("   "); // Multiple spaces  
  mutations.push("\t"); // Tab
  mutations.push("  test  "); // Surrounded by spaces
  
  // Unicode and special characters
  mutations.push("আমি বাংলায় লিখি"); // Bangla Unicode
  mutations.push("🙂😀🎉"); // Emoji
  mutations.push("مرحبا"); // RTL Arabic text
  mutations.push("Ñiño café"); // Accented characters
  
  // Mixed case
  mutations.push("Test");
  mutations.push("TEST");
  mutations.push("test");
  mutations.push("tEsT");
  
  // Security payloads if enabled and function available
  if (includeSecurityPayloads && getSecurityPayloads) {
    try {
      const securityPayloads = getSecurityPayloads({ 
        includeSqlInjection: true, 
        includeXss: true 
      });
      mutations.push(...securityPayloads.slice(0, 5)); // Limit to first 5 for performance
    } catch (error) {
      console.warn('Could not load security payloads:', error);
    }
  }
  
  return mutations;
}

// Number mutations for numeric inputs
function generateNumberMutations() {
  return [
    "", // Empty
    "0", // Zero
    "-1", // Negative
    "1", // Positive
    "9999999999", // Large number
    "1.5", // Decimal
    "1,234", // Locale formatting with comma
    "1.234567890123", // High precision decimal
    "-999999999", // Large negative
    "1e10", // Scientific notation
    "Infinity", // Infinity
    "-Infinity", // Negative infinity
    "NaN", // Not a number
    "0x1F", // Hex
    "0777", // Octal
    "1.0000000000000001" // Floating point precision test
  ];
}

// Date mutations for date inputs  
function generateDateMutations() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return [
    "", // Empty
    "1970-01-01", // Unix epoch
    "2024-02-29", // Leap day
    "2023-02-29", // Invalid leap day
    "2024-01-31", // Month end
    "2024-04-31", // Invalid month end (April has 30 days)
    yesterday.toISOString().split('T')[0], // Today - 1
    today.toISOString().split('T')[0], // Today
    tomorrow.toISOString().split('T')[0], // Today + 1
    "9999-12-31", // Far future
    "0001-01-01", // Far past
    "invalid-date", // Invalid format
    "32/13/2024", // Invalid date
    "2024-13-45" // Invalid month/day
  ];
}

// Email mutations for email inputs
function generateEmailMutations(maxLength = 255) {
  const mutations = [
    "", // Empty
    "a", // Too short
    "test@", // Missing domain
    "@test.com", // Missing local part
    "test@test.com", // Valid basic email
    "user.name+tag@example.co.uk", // Complex valid email
    "বাংলা@example.com", // IDN local part
    "test@বাংলা.com", // IDN domain (if supported)
    "test@test", // No TLD
    "test@@test.com", // Double @
    "test@test..com", // Double dot
    ".test@test.com", // Starting with dot
    "test.@test.com", // Ending with dot
    "test@test.com.", // Trailing dot in domain
    "test@[192.168.1.1]", // IP address domain
    '"test test"@test.com', // Quoted local part
    "test@" + "a".repeat(250) + ".com" // Very long domain
  ];
  
  // Add very long email if maxLength allows
  if (maxLength > 50) {
    const longLocal = "a".repeat(Math.min(64, maxLength - 20));
    mutations.push(`${longLocal}@test.com`);
  }
  
  // Add email that exceeds maxLength
  if (maxLength < 200) {
    const tooLong = "a".repeat(maxLength + 1);
    mutations.push(`${tooLong}@test.com`);
  }
  
  return mutations;
}

// Phone number mutations
function generatePhoneMutations() {
  return [
    "", // Empty
    "1", // Too short
    "123-456-7890", // US format
    "(123) 456-7890", // US format with parentheses
    "+1-123-456-7890", // International format
    "01712345678", // Bangladesh mobile
    "+8801712345678", // Bangladesh international
    "123", // Too short
    "12345678901234567890", // Too long
    "phone-number", // Invalid text
    "123-ABC-7890", // Mixed alphanumeric
    "++1-123-456-7890", // Double plus
    "123 456 7890", // Space separated
    "123.456.7890", // Dot separated
    "+৮৮০১৭১২৩৪৫৬৭৮" // Bangla numerals
  ];
}

// Generate mutations based on input type
function generateMutationDataset(element, config = {}) {
  const mutations = [];
  const inputType = (element.type || 'text').toLowerCase();
  const maxLength = parseInt(element.maxLength) || 255;
  const fieldName = element.name || element.id || 'unknown';
  
  // Determine mutation type based on input type and attributes
  switch (inputType) {
    case 'email':
      mutations.push(...generateEmailMutations(maxLength));
      break;
      
    case 'tel':
    case 'phone':
      mutations.push(...generatePhoneMutations());
      break;
      
    case 'number':
    case 'range':
      mutations.push(...generateNumberMutations());
      break;
      
    case 'date':
      mutations.push(...generateDateMutations());
      break;
      
    case 'password':
    case 'text':
    case 'search':
    case 'url':
    default:
      mutations.push(...generateStringMutations(maxLength, config.includeSecurityPayloads !== false));
      break;
  }
  
  // For select elements, also include some values not in options
  if (element.tagName?.toLowerCase() === 'select') {
    mutations.push('invalid-option', '', '999', 'null', 'undefined');
  }
  
  // Truncate mutations that exceed maxLength
  const truncatedMutations = mutations.map(value => {
    if (typeof value === 'string' && maxLength > 0 && value.length > maxLength) {
      return value.substring(0, maxLength);
    }
    return value;
  });
  
  return {
    fieldName,
    inputType,
    maxLength,
    mutations: truncatedMutations,
    totalMutations: truncatedMutations.length
  };
}

// Generate dataset for multiple fields
function generateMultiFieldDataset(elements, config = {}) {
  const datasets = [];
  const limitedElements = elements.slice(0, config.maxFields || 6);
  
  for (const element of limitedElements) {
    datasets.push(generateMutationDataset(element, config));
  }
  
  return {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    totalFields: limitedElements.length,
    datasets
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateStringMutations,
    generateNumberMutations,
    generateDateMutations,
    generateEmailMutations,
    generatePhoneMutations,
    generateMutationDataset,
    generateMultiFieldDataset
  };
} else {
  // Browser environment - attach to window
  window.UrlSmartTesterDataset = {
    generateStringMutations,
    generateNumberMutations,
    generateDateMutations,
    generateEmailMutations,
    generatePhoneMutations,
    generateMutationDataset,
    generateMultiFieldDataset
  };
}