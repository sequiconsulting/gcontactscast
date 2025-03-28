// Diagnostic script for Google Contacts Viewer
// Place this file in your js directory and add a script tag to load it in index.html
// <script src="js/diagnostic.js"></script>

(function() {
  console.log('Diagnostic script running...');
  
  // Create a visible diagnostic panel
  function createDiagnosticPanel() {
    const panel = document.createElement('div');
    panel.id = 'diagnostic-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.width = '400px';
    panel.style.maxHeight = '300px';
    panel.style.overflowY = 'auto';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    panel.style.color = '#fff';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '9999';
    
    const header = document.createElement('div');
    header.textContent = 'Diagnostic Log';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '5px';
    panel.appendChild(header);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.padding = '3px 5px';
    closeBtn.style.backgroundColor = '#555';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.borderRadius = '3px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = function() { panel.style.display = 'none'; };
    panel.appendChild(closeBtn);
    
    const content = document.createElement('div');
    content.id = 'diagnostic-content';
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    return content;
  }
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const diagContent = createDiagnosticPanel();
    
    function logToDiagnostic(message) {
      console.log(message);
      const line = document.createElement('div');
      line.textContent = `[${new Date().toISOString().substr(11, 8)}] ${message}`;
      diagContent.appendChild(line);
    }
    
    // Start diagnostics
    logToDiagnostic('Starting diagnostics...');
    
    // Check for essential DOM elements
    const essentialElements = [
      'initial-loader',
      'signin-button',
      'error-container',
      'auth-status'
    ];
    
    essentialElements.forEach(id => {
      const element = document.getElementById(id);
      logToDiagnostic(`Element '${id}': ${element ? 'Found' : 'MISSING'}`);
    });
    
    // Check for external scripts
    logToDiagnostic('Checking for external scripts...');
    
    // Check GAPI
    logToDiagnostic(`Google API (gapi): ${typeof gapi !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    if (typeof gapi !== 'undefined') {
      logToDiagnostic(`- gapi.client: ${typeof gapi.client !== 'undefined' ? 'Available' : 'Not available'}`);
      logToDiagnostic(`- gapi.load: ${typeof gapi.load === 'function' ? 'Available' : 'Not available'}`);
    }
    
    // Check Google Identity Services
    logToDiagnostic(`Google Identity Services: ${typeof google !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    if (typeof google !== 'undefined') {
      logToDiagnostic(`- google.accounts: ${typeof google.accounts !== 'undefined' ? 'Available' : 'Not available'}`);
      if (typeof google.accounts !== 'undefined') {
        logToDiagnostic(`- google.accounts.oauth2: ${typeof google.accounts.oauth2 !== 'undefined' ? 'Available' : 'Not available'}`);
      }
    }
    
    // Check app scripts
    logToDiagnostic(`CONFIG: ${typeof CONFIG !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    if (typeof CONFIG !== 'undefined') {
      try {
        // Don't log actual credentials, just check if they appear valid
        const clientIdValid = CONFIG.CLIENT_ID && 
                              CONFIG.CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' && 
                              CONFIG.CLIENT_ID !== 'MISSING_CREDENTIAL';
        
        const apiKeyValid = CONFIG.API_KEY && 
                           CONFIG.API_KEY !== 'YOUR_GOOGLE_API_KEY' && 
                           CONFIG.API_KEY !== 'MISSING_CREDENTIAL';
        
        logToDiagnostic(`- CLIENT_ID: ${clientIdValid ? 'Valid format' : 'INVALID'}`);
        logToDiagnostic(`- API_KEY: ${apiKeyValid ? 'Valid format' : 'INVALID'}`);
      } catch (e) {
        logToDiagnostic(`- Error accessing CONFIG: ${e.message}`);
      }
    }
    
    logToDiagnostic(`StorageService: ${typeof StorageService !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    logToDiagnostic(`ContactsService: ${typeof ContactsService !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    logToDiagnostic(`App: ${typeof App !== 'undefined' ? 'Loaded' : 'Not loaded'}`);
    
    // Check browser features
    logToDiagnostic('Checking browser features...');
    logToDiagnostic(`- localStorage: ${typeof localStorage !== 'undefined' ? 'Available' : 'Not available'}`);
    logToDiagnostic(`- crypto.subtle: ${window.crypto && window.crypto.subtle ? 'Available' : 'Not available'}`);
    
    // Check if buttons are enabled correctly
    setTimeout(() => {
      const signinButton = document.getElementById('signin-button');
      if (signinButton) {
        logToDiagnostic(`Signin button disabled: ${signinButton.disabled}`);
      }
      
      if (typeof App !== 'undefined' && App.state) {
        logToDiagnostic(`App state - gapiInited: ${App.state.gapiInited}, gisInited: ${App.state.gisInited}`);
      }
      
      logToDiagnostic('Diagnostics complete');
    }, 3000);
  });
})();
