# UrlSmartTester Chrome Extension

**UrlSmartTester** is a Chrome Extension (Manifest V3) designed for comprehensive form testing and security vulnerability assessment on web applications.

## 🎯 Features

### Core Functionality
- **Field Detection**: Automatically detects all visible input/select/textarea fields on a page
- **Mutation Testing**: Generates comprehensive test datasets for different input types
- **Security Testing**: Includes SQL injection, XSS, and path traversal payloads
- **Form Submission**: Uses intelligent heuristics to submit forms automatically
- **Result Capture**: Screenshots, logs, and detailed JSON reports

### Security Payloads
- **SQL Injection**: `' OR 1=1 --`, `'; DROP TABLE users; --`, `" OR ""=""`
- **XSS**: `<script>alert(1)</script>`, `"><svg onload=alert(1)>`
- **Path Traversal**: `../../../etc/passwd`, `..\\..\\..\\windows\\system32\\drivers\\etc\\hosts`
- **Unicode/RTL**: Bangla text (আমি বাংলায় লিখি), Arabic RTL, emoji testing

### Dataset Generation
- **Strings**: Empty, single char, max length, overflow, whitespace, Unicode, security payloads
- **Numbers**: Negative, zero, overflow, locale formatting, precision testing
- **Dates**: Epoch, leap days, invalid dates, future/past extremes
- **Email**: Valid/invalid formats, IDN domains, length testing
- **Phone**: Various international formats, invalid patterns

### Safety Features
- **Domain Allowlist**: Only test on approved domains (localhost, 127.0.0.1, example.com by default)
- **Same-Origin Policy**: Optional restriction to same origin only
- **Field Limits**: Configurable maximum fields per page (default: 6)
- **Timeouts**: Configurable operation timeouts (default: 15 seconds)

## 📁 Extension Structure

```
UrlSmartTesterChromeExtDemo/
├── manifest.json              # Extension manifest (v3)
├── background.js              # Service worker for orchestration
├── content.js                 # Content script for page interaction
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup functionality
├── options.html               # Configuration page
├── options.js                 # Options page logic
├── styles.css                 # UI styling
├── config.js                  # Configuration management
├── dataset.js                 # Mutation dataset generation
├── security_payloads.js       # Security testing payloads
├── utils.js                   # Utility functions
├── testpage.html              # Demo login form for testing
├── _locales/bn/messages.json  # Bangla localization
└── icons/                     # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your toolbar

## 📖 Usage

### Quick Start
1. Open the demo page: `testpage.html` in your browser
2. Click the extension icon in the toolbar
3. Click "▶️ প্রোব চালান" (Run Probe) button
4. Check your Downloads/artifacts folder for results

### Configuration
1. Click "⚙️ সেটিংস" (Settings) in the popup
2. Configure allowed domains, field limits, timeouts
3. Enable/disable SQL injection and XSS testing
4. Save settings

### Results
After running a probe, you'll find these files in `Downloads/artifacts/{timestamp}/`:
- `result.json` - Complete test results and metadata
- `dataset.json` - Mutation data used for testing
- `console.log` - Console errors captured during testing
- `after-submit.png` - Screenshot after form submission

## ⚠️ Security Warning

**⚠️ IMPORTANT**: This tool is designed for security testing and research purposes only.

- **Only use on websites you own or have explicit permission to test**
- **Never use on production systems without proper authorization**
- **Some payloads may trigger security alerts or logging**
- **Always follow responsible disclosure practices**

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Uses modern Chrome extension APIs
- **Service Worker**: Background orchestration and artifact management
- **Content Scripts**: Injected into pages for form interaction
- **Message Passing**: Communication between extension components

### Permissions Required
- `scripting` - Inject content scripts
- `storage` - Save configuration settings
- `downloads` - Save test artifacts
- `activeTab` - Access current page
- `tabs` - Tab management
- `webRequest` - Monitor network errors
- `<all_urls>` - Test on any domain (restricted by allowlist)

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, etc.)

## 🌐 Localization

The extension interface is fully localized in **Bangla (বাংলা)**:
- All user-facing text in Bengali
- All code comments in English
- Follows Chrome extension i18n best practices

## 🔧 Development

### File Descriptions

**Core Modules:**
- `config.js` - Default settings and configuration management
- `dataset.js` - Mutation data generation algorithms
- `security_payloads.js` - Security testing payload definitions
- `utils.js` - Field detection, form submission, error collection

**Extension Components:**
- `background.js` - Service worker handling orchestration, downloads
- `content.js` - Page interaction, field testing, result collection
- `popup.js` - Main UI functionality and probe initiation
- `options.js` - Configuration page with validation

### Testing the Extension

1. Load the extension in Chrome
2. Navigate to `testpage.html` 
3. Open the extension popup
4. Verify field detection shows 2 fields
5. Run the probe and check artifacts are generated

### Demo Page

The included `testpage.html` provides a simple login form for testing:
- Email field (validates for @ symbol)
- Password field  
- Submit button with validation
- Perfect for testing mutation datasets and security payloads

## 📝 License

This project is for educational and security research purposes. Please use responsibly and ethically.

## 🤝 Contributing

Contributions welcome! Please ensure:
- All user-facing text remains in Bangla
- Code comments in English
- Follow existing code style
- Test thoroughly before submitting

---

**Made for security researchers and web developers to test form validation and security.**