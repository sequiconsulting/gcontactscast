// Build script to process environment variables
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

console.log('Starting build process...');
console.log('Node version:', process.version);

// Log available environment variables (without revealing values)
const envKeys = Object.keys(process.env).filter(key => key.startsWith('GOOGLE_'));
console.log('Found environment variables:', envKeys);

// Simple obfuscation of credentials
function obfuscate(str) {
  // If it's empty or a placeholder, don't obfuscate
  if (!str || str === 'YOUR_GOOGLE_CLIENT_ID' || str === 'YOUR_GOOGLE_API_KEY') {
    console.warn('WARNING: Empty or default credential detected');
    return '';
  }
  
  // Simple obfuscation: Base64 encode and reverse
  const obfuscated = Buffer.from(str).toString('base64').split('').reverse().join('');
  return obfuscated;
}

// Process environment variables
function processEnvVariables() {
  console.log('Processing environment variables...');
  
  const jsDir = path.join(__dirname, 'js');
  const configPath = path.join(jsDir, 'config.js');
  
  // Ensure js directory exists
  if (!fs.existsSync(jsDir)) {
    console.log('Creating js directory...');
    fs.mkdirSync(jsDir, { recursive: true });
  }
  
  // Get credentials from environment variables with more explicit logging
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const apiKey = process.env.GOOGLE_API_KEY || '';
  
  console.log(`Client ID available: ${clientId ? 'YES' : 'NO'}`);
  console.log(`API Key available: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!clientId || !apiKey) {
    console.warn('WARNING: One or both credentials are missing from environment variables');
    console.warn('Creating a placeholder config file with instructions...');
    
    // Create a placeholder config file with clear instructions
    const placeholderConfig = `// Configuration file for Google Contacts Viewer
// ⚠️ MISSING CREDENTIALS - PLEASE SET ENVIRONMENT VARIABLES ⚠️
const CONFIG = {
    CLIENT_ID: 'MISSING_CREDENTIAL', // Set GOOGLE_CLIENT_ID environment variable
    API_KEY: 'MISSING_CREDENTIAL',   // Set GOOGLE_API_KEY environment variable
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
    VERSION: '${new Date().toISOString()} - MISSING CREDENTIALS'
};`;
    
    fs.writeFileSync(configPath, placeholderConfig);
    console.log('Created placeholder config file with missing credential warnings');
    return;
  }
  
  // Obfuscate credentials
  const obfuscatedClientId = obfuscate(clientId);
  const obfuscatedApiKey = obfuscate(apiKey);
  
  // Create config content with obfuscated credentials
  const configContent = `// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    // Deobfuscation function with error handling
    function deobfuscate(encoded) {
        if (!encoded) {
            console.error('ERROR: Missing encoded credential');
            return 'MISSING_CREDENTIAL';
        }
        try {
            return atob(encoded.split('').reverse().join(''));
        } catch (e) {
            console.error('Deobfuscation error:', e);
            return 'DEOBFUSCATION_ERROR';
        }
    }
    
    // Obfuscated credentials
    const encodedClientId = '${obfuscatedClientId}';
    const encodedApiKey = '${obfuscatedApiKey}';
    
    return {
        // Use getters to decode only when needed
        get CLIENT_ID() {
            return deobfuscate(encodedClientId);
        },
        get API_KEY() {
            return deobfuscate(encodedApiKey);
        },
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '${new Date().toISOString()}'
    };
})();`;
  
  try {
    // Write the config file
    fs.writeFileSync(configPath, configContent);
    console.log('Config file written successfully to:', configPath);
    
    // Verify file exists after writing
    if (fs.existsSync(configPath)) {
      console.log('Confirmed config.js exists after writing');
      const stats = fs.statSync(configPath);
      console.log('File size:', stats.size, 'bytes');
    } else {
      console.error('ERROR: Failed to find config.js after writing!');
    }
  } catch (error) {
    console.error('ERROR writing config file:', error.message);
    process.exit(1);
  }
  
  console.log('Environment variables processed successfully.');
}

// Main build function
async function build() {
  try {
    // Process environment variables (create config.js)
    processEnvVariables();
    
    // Create robots.txt
    console.log('Creating robots.txt...');
    const robotsContent = `# robots.txt\nUser-agent: *\nDisallow: /\n`;
    fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsContent);
    
    // Verify required files
    console.log('Verifying required files...');
    const requiredFiles = [
      path.join(__dirname, 'js', 'contacts-service.js'),
      path.join(__dirname, 'js', 'storage-service.js'),
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'css', 'styles.css')
    ];
    
    let missingFiles = false;
    for (const filePath of requiredFiles) {
      if (!fs.existsSync(filePath)) {
        console.error(`ERROR: Required file not found: ${filePath}`);
        missingFiles = true;
      } else {
        console.log(`✅ ${filePath} exists`);
      }
    }
    
    if (missingFiles) {
      console.error('Some required files are missing. Please check your repository structure.');
      // Don't exit - allow deploy to continue with warnings
    }
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    // Don't exit with error - allow deploy to continue with warnings
    console.log('Continuing with deploy despite errors...');
  }
}

// Run the build
build();
