// Pre-build script that loads environment variables
// and triggers the main build process
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

console.log('Starting build process...');

// Load environment variables from .env file if it exists
try {
  const result = dotenv.config();
  if (result.parsed) {
    console.log('✅ Loaded environment variables from .env file');
    
    // Log masked values to verify they're set
    const clientId = process.env.GOOGLE_CLIENT_ID || 'NOT_SET';
    const apiKey = process.env.GOOGLE_API_KEY || 'NOT_SET';
    
    console.log(`CLIENT_ID: ${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3) || 'NOT_SET'}`);
    console.log(`API_KEY: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3) || 'NOT_SET'}`);
  }
} catch (error) {
  console.warn('⚠️ Could not load .env file, will use system environment variables');
}

// Check for required environment variables
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️ WARNING: Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Application may not function correctly without these variables.');
} else {
  console.log('✅ All required environment variables are set');
}

// Run the main build script
try {
  console.log('Running main build script...');
  execSync('node build.js', { stdio: 'inherit' });
  console.log('✅ Build script completed successfully');
} catch (error) {
  console.error('❌ ERROR: Build script failed:', error.message);
  process.exit(1);
}

// Run the verification script
try {
  console.log('Running verification script...');
  execSync('node verify-build.js', { stdio: 'inherit' });
  console.log('✅ Verification completed successfully');
} catch (error) {
  console.error('❌ ERROR: Verification failed:', error.message);
  process.exit(1);
}

console.log('✅ Build process completed successfully');
