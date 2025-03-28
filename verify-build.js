// Verification script for GContactsCast build
// Checks that critical files exist and are properly configured
const fs = require('fs');
const path = require('path');

console.log('=== Verifying GContactsCast Build ===');

// Critical files that must exist after build
const requiredFiles = [
  {path: 'js/config.js', critical: true},
  {path: 'js/app.js', critical: true},
  {path: 'js/contacts-service.js', critical: true},
  {path: 'js/storage-service.js', critical: true},
  {path: 'index.html', critical: true},
  {path: 'css/styles.css', critical: true}
];

let missingCriticalFiles = false;

// Check each required file
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file.path} (${stats.size} bytes)`);
    
    // For config.js, check that it contains actual values, not defaults
    if (file.path === 'js/config.js') {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes(`encodedClientId = '';`) || 
          content.includes(`encodedApiKey = '';`) ||
          content.includes(`'{{ENCODED_CLIENT_ID}}'`) ||
          content.includes(`'{{ENCODED_API_KEY}}'`)) {
        console.warn('⚠️ WARNING: config.js contains empty credential placeholders!');
      }
    }
  } else {
    if (file.critical) {
      console.error(`❌ CRITICAL: ${file.path} is missing!`);
      missingCriticalFiles = true;
    } else {
      console.warn(`⚠️ ${file.path} is missing`);
    }
  }
});

// Create fallback config.js if missing
const configPath = path.join(__dirname, 'js', 'config.js');
if (!fs.existsSync(configPath)) {
  console.log('Creating emergency fallback config.js...');
  
  try {
    // Ensure js directory exists
    const jsDir = path.join(__dirname, 'js');
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    // Write a default config as fallback
    const fallbackConfig = `// FALLBACK CONFIG - CREATED BY VERIFY SCRIPT
window.CONFIG = {
    CLIENT_ID: '${process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID_CHECK_ENV_VARS'}',
    API_KEY: '${process.env.GOOGLE_API_KEY || 'MISSING_API_KEY_CHECK_ENV_VARS'}',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
    VERSION: 'fallback-${new Date().toISOString()}',
    isValid: function() {
        return this.CLIENT_ID !== 'MISSING_CLIENT_ID_CHECK_ENV_VARS' && 
               this.API_KEY !== 'MISSING_API_KEY_CHECK_ENV_VARS';
    }
};`;
    
    fs.writeFileSync(configPath, fallbackConfig);
    console.log('✅ Created emergency fallback config.js');
  } catch (error) {
    console.error('Failed to create fallback config:', error);
  }
}

if (missingCriticalFiles) {
  console.error('BUILD VERIFICATION FAILED: Critical files are missing!');
  process.exit(1);
} else {
  console.log('✅ Build verification completed successfully!');
}
