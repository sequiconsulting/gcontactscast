// Build script to process environment variables
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Simple obfuscation of credentials
function obfuscate(str) {
  // If it's empty or a placeholder, don't obfuscate
  if (!str || str === 'YOUR_GOOGLE_CLIENT_ID' || str === 'YOUR_GOOGLE_API_KEY') {
    return '';
  }
  // Simple obfuscation: Base64 encode and reverse
  return Buffer.from(str).toString('base64').split('').reverse().join('');
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
  
  // Get credentials from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const apiKey = process.env.GOOGLE_API_KEY || '';
  
  // Obfuscate credentials
  const obfuscatedClientId = obfuscate(clientId);
  const obfuscatedApiKey = obfuscate(apiKey);
  
  // Create config content with obfuscated credentials
  const configContent = `// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    // Deobfuscation function
    function deobfuscate(encoded) {
        if (!encoded) return 'YOUR_GOOGLE_CLIENT_ID';
        return atob(encoded.split('').reverse().join(''));
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

// Create robots.txt
function createRobotsTxt() {
  console.log('Creating robots.txt...');
  const robotsContent = `# robots.txt
User-agent: *
Disallow: /
`;
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsContent);
  console.log('robots.txt created successfully.');
}

// Verify all required files exist
function verifyFiles() {
  console.log('Verifying required files...');
  const requiredFiles = [
    path.join(__dirname, 'js', 'app.js'),
    path.join(__dirname, 'js', 'contacts-service.js'),
    path.join(__dirname, 'js', 'storage-service.js'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'css', 'styles.css')
  ];
  
  let allFilesExist = true;
  
  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: Required file not found: ${filePath}`);
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    console.warn('One or more required files are missing, but continuing build...');
  } else {
    console.log('All required files verified successfully.');
  }
  
  // List all files in the js directory
  const jsDir = path.join(__dirname, 'js');
  if (fs.existsSync(jsDir)) {
    console.log('Files in js directory:');
    const files = fs.readdirSync(jsDir);
    files.forEach(file => console.log(`  - ${file}`));
  } else {
    console.log('js directory not found!');
  }
}

// Main build function
async function build() {
  try {
    console.log('Starting build process...');
    console.log('Current directory:', __dirname);
    
    // Process environment variables (create config.js)
    processEnvVariables();
    
    // Create robots.txt
    createRobotsTxt();
    
    // Verify required files
    verifyFiles();
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();
