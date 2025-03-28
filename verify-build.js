// Update the verification of config.js in verify-build.js
// For config.js, check that it contains actual values, not defaults
if (file.path === 'js/config.js') {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // For the new obfuscated format
  if (content.includes('deobfuscate(')) {
    // Check for empty encoding strings
    if (content.includes(`encodedClientId = '';`) || 
        content.includes(`encodedApiKey = '';`) ||
        content.includes(`'{{ENCODED_CLIENT_ID}}'`) ||
        content.includes(`'{{ENCODED_API_KEY}}'`)) {
      console.error('❌ ERROR: config.js contains empty credential placeholders!');
      missingCriticalFiles = true;
    } else {
      // Check that encoded credentials exist and are non-trivial
      const clientIdMatch = content.match(/encodedClientId\s*=\s*['"]([^'"]+)['"]/);
      const apiKeyMatch = content.match(/encodedApiKey\s*=\s*['"]([^'"]+)['"]/);
      
      if (!clientIdMatch || clientIdMatch[1].length < 10) {
        console.error('❌ ERROR: config.js has missing or invalid CLIENT_ID!');
        missingCriticalFiles = true;
      }
      
      if (!apiKeyMatch || apiKeyMatch[1].length < 10) {
        console.error('❌ ERROR: config.js has missing or invalid API_KEY!');
        missingCriticalFiles = true;
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
      console.error('❌ ERROR: config.js contains default placeholder values!');
      missingCriticalFiles = true;
    } else {
      console.log('✅ config.js contains non-default values (old format)');
    }
  }
}
