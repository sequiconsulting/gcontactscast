// Build script to process environment variables
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Helper function to safely escape JS string values
const escapeJS = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\\'"]/g, '\\$&');
};

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
  
  // Check for required environment variables
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('WARNING: GOOGLE_CLIENT_ID environment variable is not set!');
  }
  
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('WARNING: GOOGLE_API_KEY environment variable is not set!');
  }
  
  // Create a new CONFIG object with environment variables (safely escaped)
  const newConfig = `// Configuration file for Google Contacts Viewer
const CONFIG = {
    CLIENT_ID: '${escapeJS(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID')}',
    API_KEY: '${escapeJS(process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY')}',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
    VERSION: '${new Date().toISOString()}'
};`;
  
  try {
    // Write the processed file
    fs.writeFileSync(configPath, newConfig);
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
    
    // Try writing to the root as a fallback
    const rootConfigPath = path.join(__dirname, 'config.js');
    try {
      fs.writeFileSync(rootConfigPath, newConfig);
      console.log('Fallback: wrote config to root directory:', rootConfigPath);
    } catch (fallbackError) {
      console.error('CRITICAL ERROR: Could not write config file anywhere:', fallbackError.message);
      process.exit(1);
    }
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

// List all files in build directory (for debugging)
function listBuildFiles() {
  console.log('Listing all files in build directory:');
  
  function listDir(dir, indent = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        console.log(`${indent}${file}/`);
        listDir(filePath, indent + '  ');
      } else {
        console.log(`${indent}${file} (${stats.size} bytes)`);
      }
    });
  }
  
  try {
    listDir(__dirname);
  } catch (error) {
    console.error('Error listing files:', error);
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
    
    // List all files for debugging
    listBuildFiles();
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();
