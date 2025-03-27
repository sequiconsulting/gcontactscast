// Build script to process environment variables
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Process environment variables
function processEnvVariables() {
  console.log('Processing environment variables...');
  
  const configPath = path.join(__dirname, 'js', 'config.js');
  
  // Create a new CONFIG object with environment variables
  const newConfig = `// Configuration file for Google Contacts Viewer
const CONFIG = {
    CLIENT_ID: '${process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}',
    API_KEY: '${process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY'}',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1'
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

// Main build function
async function build() {
  try {
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
