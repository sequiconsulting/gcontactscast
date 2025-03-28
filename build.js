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
  
  const configPath = path.join(__dirname, 'js', 'config.js');
  
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
  
  // Write the processed file
  fs.writeFileSync(configPath, newConfig);
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
    throw new Error('One or more required files are missing.');
  }
  
  console.log('All required files verified successfully.');
}

// Main build function
async function build() {
  try {
    // Verify required files
    verifyFiles();
    
    // Process environment variables
    processEnvVariables();
    
    // Create robots.txt
    createRobotsTxt();
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();
