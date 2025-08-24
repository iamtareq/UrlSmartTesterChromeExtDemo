// Security payloads for testing input validation and security vulnerabilities
const SECURITY_PAYLOADS = {
  // SQL Injection payloads - common patterns used to test for SQL injection vulnerabilities
  sqlInjection: [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    '" OR ""=""',
    "' OR 'x'='x",
    "admin'--",
    "1' UNION SELECT null,null,null--",
    "'; INSERT INTO users VALUES('hacker','pass'); --",
    "' AND 1=CONVERT(int, (SELECT @@version))--"
  ],

  // Cross-Site Scripting (XSS) payloads - test for script injection vulnerabilities  
  xss: [
    "<script>alert(1)</script>",
    "\"><svg onload=alert(1)>",
    "javascript:alert(1)",
    "<img src=x onerror=alert(1)>",
    "<iframe src=\"javascript:alert(1)\"></iframe>",
    "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
    "\";alert('XSS');//",
    "<body onload=alert('XSS')>"
  ],

  // Path traversal payloads - test for directory traversal vulnerabilities
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc//passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd"
  ],

  // Command injection payloads
  commandInjection: [
    "; ls -la",
    "| cat /etc/passwd",
    "&& dir",
    "; cat /etc/passwd #",
    "`whoami`",
    "$(whoami)"
  ],

  // LDAP injection payloads
  ldapInjection: [
    "*",
    "*)(&",
    "*))%00",
    "*()|%26'",
    "admin*)((|userpassword=*)"
  ]
};

// Special characters and edge cases for general input testing
const EDGE_CASE_PAYLOADS = {
  // Unicode and special character tests
  unicode: [
    "আমি বাংলায় লিখছি", // Bangla text
    "مرحبا بالعالم", // Arabic RTL text  
    "🙂😀🎉💯", // Emoji
    "Ñiño café naïve résumé", // Accented characters
    "中文测试", // Chinese characters
    "Тест на русском" // Cyrillic characters
  ],

  // Whitespace and control characters
  whitespace: [
    " ", // Single space
    "  ", // Multiple spaces
    "\t", // Tab
    "\n", // Newline
    "\r\n", // CRLF
    "\u00A0", // Non-breaking space
    "\u2000\u2001\u2002", // Various Unicode spaces
    ""  // Empty string
  ],

  // Long strings for buffer overflow testing
  longStrings: [
    "A".repeat(1000), // 1000 A's
    "💯".repeat(500), // 500 emoji (may be multi-byte)
    "বাংলা".repeat(250) // Bangla text repetition
  ],

  // Format strings and injection attempts
  formatStrings: [
    "%s%s%s%s%s%s%s",
    "%x%x%x%x%x%x%x",
    "{{7*7}}",
    "${7*7}",
    "#{7*7}",
    "%{7*7}"
  ]
};

// Get security payloads based on configuration
function getSecurityPayloads(config) {
  let payloads = [];
  
  if (config.includeSqlInjection) {
    payloads = payloads.concat(SECURITY_PAYLOADS.sqlInjection);
  }
  
  if (config.includeXss) {
    payloads = payloads.concat(SECURITY_PAYLOADS.xss);
  }
  
  // Always include some edge cases
  payloads = payloads.concat(
    EDGE_CASE_PAYLOADS.unicode.slice(0, 2),
    EDGE_CASE_PAYLOADS.whitespace.slice(0, 3),
    SECURITY_PAYLOADS.pathTraversal.slice(0, 2)
  );
  
  return payloads;
}

// Get all available payload categories
function getAllPayloadCategories() {
  return {
    ...SECURITY_PAYLOADS,
    ...EDGE_CASE_PAYLOADS
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    SECURITY_PAYLOADS, 
    EDGE_CASE_PAYLOADS, 
    getSecurityPayloads, 
    getAllPayloadCategories 
  };
} else {
  // Browser environment - attach to window
  window.UrlSmartTesterPayloads = { 
    SECURITY_PAYLOADS, 
    EDGE_CASE_PAYLOADS, 
    getSecurityPayloads, 
    getAllPayloadCategories 
  };
}