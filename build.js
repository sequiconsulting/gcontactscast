// Build script to process environment variables
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Helper function to obfuscate credentials
function obfuscateCredential(credential) {
  if (typeof credential !== 'string' || !credential || credential.includes('YOUR_GOOGLE_')) {
    return ''; // Return empty string for invalid credentials
  }
  
  // Simple obfuscation: base64 encode and reverse the string
  return Buffer.from(credential).toString('base64').split('').reverse().join('');
}

// Process environment variables
function processEnvVariables() {
  console.log('Processing environment variables with credential protection...');
  
  const jsDir = path.join(__dirname, 'js');
  const configPath = path.join(jsDir, 'config.js');
  const configTemplatePath = path.join(__dirname, 'config.template.js');
  
  // Ensure js directory exists
  if (!fs.existsSync(jsDir)) {
    console.log('Creating js directory...');
    fs.mkdirSync(jsDir, { recursive: true });
  }
  
  // Check for required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    console.error('ERROR: GOOGLE_CLIENT_ID environment variable is required for deployment!');
    process.exit(1); // Fail the build
  }
  
  if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY') {
    console.error('ERROR: GOOGLE_API_KEY environment variable is required for deployment!');
    process.exit(1); // Fail the build
  }
  
  // Obfuscate the credentials
  const obfuscatedClientId = obfuscateCredential(process.env.GOOGLE_CLIENT_ID);
  const obfuscatedApiKey = obfuscateCredential(process.env.GOOGLE_API_KEY);
  const buildVersion = new Date().toISOString();
  
  let configContent;
  
  // Try to use template file if it exists
  if (fs.existsSync(configTemplatePath)) {
    console.log('Using config template file');
    configContent = fs.readFileSync(configTemplatePath, 'utf8');
    
    // Replace placeholders in template
    configContent = configContent
      .replace('{{ENCODED_CLIENT_ID}}', obfuscatedClientId)
      .replace('{{ENCODED_API_KEY}}', obfuscatedApiKey)
      .replace('{{BUILD_VERSION}}', buildVersion);
  } else {
    // Create config content directly if no template exists
    console.log('Creating config file from scratch');
    configContent = `// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded) {
        return atob(encoded.split('').reverse().join(''));
    }
    
    // Encoded credentials - obfuscated at build time
    const encodedClientId = '${obfuscatedClientId}';
    const encodedApiKey = '${obfuscatedApiKey}';
    
    return {
        // Credentials are only decoded when needed through accessor methods
        get CLIENT_ID() {
            return deobfuscate(encodedClientId);
        },
        get API_KEY() {
            return deobfuscate(encodedApiKey);
        },
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '${buildVersion}'
    };
})();`;
  }
  
  try {
    // Write the processed file
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
  
  console.log('Environment variables processed successfully with credential protection.');
}

// Create config template file for future builds
function createConfigTemplate() {
  console.log('Creating config template file...');
  const templatePath = path.join(__dirname, 'config.template.js');
  
  // Only create if it doesn't exist
  if (!fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(
      path.join(__dirname, 'js', 'config.js'),
      'utf8'
    ).replace(
      /const CONFIG = \{[\s\S]+?\};/,
      `// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded) {
        return atob(encoded.split('').reverse().join(''));
    }
    
    // Encode credentials at build time - these will be replaced by the build script
    const encodedClientId = '{{ENCODED_CLIENT_ID}}'; // Will be replaced during build
    const encodedApiKey = '{{ENCODED_API_KEY}}';     // Will be replaced during build
    
    return {
        // Credentials are only decoded when needed through accessor methods
        get CLIENT_ID() {
            return deobfuscate(encodedClientId);
        },
        get API_KEY() {
            return deobfuscate(encodedApiKey);
        },
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '{{BUILD_VERSION}}'
    };
})();`
    );
    
    fs.writeFileSync(templatePath, templateContent);
    console.log('Config template created successfully.');
  } else {
    console.log('Config template already exists, skipping creation.');
  }
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
}

// Main build function
async function build() {
  try {
    console.log('Starting build process with enhanced security...');
    console.log('Current directory:', __dirname);
    
    // Process environment variables (create config.js with obfuscation)
    processEnvVariables();
    
    // Create config template for future builds
    createConfigTemplate();
    
    // Create robots.txt
    createRobotsTxt();
    
    // Verify required files
    verifyFiles();
    
    console.log('Secure build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();
