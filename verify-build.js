// Script to verify that the build completed successfully
const fs = require('fs-extra');
const path = require('path');

// Critical files that must exist after build
const requiredFiles = [
  {path: 'js/config.js', critical: true},
  {path: 'js/app.js', critical: true},
  {path: 'js/contacts-service.js', critical: true},
  {path: 'js/storage-service.js', critical: true},
  {path: 'index.html', critical: true},
  {path: 'css/styles.css', critical: true},
  {path: 'robots.txt', critical: false}
];

console.log('Verifying build output...');

let missingCriticalFiles = false;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file.path} (${stats.size} bytes)`);
    
    // For config.js, check that it contains actual values, not defaults
    if (file.path === 'js/config.js') {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if it's the new obfuscated format or old format
      if (content.includes('deobfuscate(')) {
        // Check for empty encoding strings
        if (content.includes(`encodedClientId = '';`) || 
            content.includes(`encodedApiKey = '';`) ||
            content.includes(`'{{ENCODED_CLIENT_ID}}'`) ||
            content.includes(`'{{ENCODED_API_KEY}}'`)) {
          console.warn('⚠️ WARNING: config.js contains empty credential placeholders!');
        } else {
          // Check that encoded credentials exist and are non-trivial
          const clientIdMatch = content.match(/encodedClientId\s*=\s*['"]([^'"]+)['"]/);
          const apiKeyMatch = content.match(/encodedApiKey\s*=\s*['"]([^'"]+)['"]/);
          
          if (!clientIdMatch || clientIdMatch[1].length < 10) {
            console.warn('⚠️ WARNING: config.js has missing or short CLIENT_ID!');
          }
          
          if (!apiKeyMatch || apiKeyMatch[1].length < 10) {
            console.warn('⚠️ WARNING: config.js has missing or short API_KEY!');
          }
          
          if (clientIdMatch && apiKeyMatch && 
              clientIdMatch[1].length >= 10 && 
              apiKeyMatch[1].length >= 10) {
            console.log('✅ config.js contains obfuscated credential values');
          }
        }
      } else {
        // Check old format
        if (content.includes('YOUR_GOOGLE_CLIENT_ID') || content.includes('YOUR_GOOGLE_API_KEY')) {
          console.warn('⚠️ WARNING: config.js contains default placeholder values!');
        } else {
          console.log('✅ config.js contains non-default values (old format)');
        }
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
const CONFIG = {
    CLIENT_ID: '${process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID_CHECK_ENV_VARS'}',
    API_KEY: '${process.env.GOOGLE_API_KEY || 'MISSING_API_KEY_CHECK_ENV_VARS'}',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
    VERSION: 'fallback-${new Date().toISOString()}'
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
  console.log('Build verification completed successfully!');
}
