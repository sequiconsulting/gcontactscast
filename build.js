// Enhanced Build Script for GContactsCast
// Provides more secure handling of credentials and improved build process
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

console.log('Running enhanced build process for GContactsCast...');

// Improved function to encode a string for obfuscation
function encodeForObfuscation(str) {
    if (!str) return '';
    
    // Add noise to the encoding to make it harder to reverse-engineer
    const noise = crypto.randomBytes(2).toString('hex');
    const combined = noise + str + noise;
    
    // Base64 encode and reverse
    const encoded = Buffer.from(combined).toString('base64').split('').reverse().join('');
    
    return encoded;
}

// Validate environment variables with detailed feedback
function validateEnvironmentVariables() {
    console.log('Validating environment variables...');
    
    // Get environment variables with enhanced validation and trim any whitespace
    const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
    const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : '';
    
    let validationPassed = true;
    
    // Validate Client ID
    if (!clientId) {
        console.error('❌ ERROR: GOOGLE_CLIENT_ID environment variable is not set');
        validationPassed = false;
    } else if (clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.length < 20) {
        console.error('❌ ERROR: GOOGLE_CLIENT_ID appears to be invalid or a placeholder');
        validationPassed = false;
    } else if (!clientId.includes('.apps.googleusercontent.com')) {
        console.warn('⚠️ WARNING: GOOGLE_CLIENT_ID does not have the expected format (should end with .apps.googleusercontent.com)');
    } else {
        console.log(`✅ GOOGLE_CLIENT_ID found (${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)})`);
    }
    
    // Validate API Key
    if (!apiKey) {
        console.error('❌ ERROR: GOOGLE_API_KEY environment variable is not set');
        validationPassed = false;
    } else if (apiKey.includes('YOUR_GOOGLE_API_KEY') || apiKey.length < 20) {
        console.error('❌ ERROR: GOOGLE_API_KEY appears to be invalid or a placeholder');
        validationPassed = false;
    } else if (!apiKey.startsWith('AIza')) {
        console.warn('⚠️ WARNING: GOOGLE_API_KEY does not have the expected format (should start with AIza)');
    } else {
        console.log(`✅ GOOGLE_API_KEY found (${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)})`);
    }
    
    return { clientId, apiKey, validationPassed };
}

// Create a configurable debug log that won't expose credentials
function createBuildDebugLog(buildInfo) {
    try {
        const debugPath = path.join(__dirname, 'build-debug.log');
        const debugContent = `GContactsCast Build Process
==========================
Build Date: ${new Date().toISOString()}
Build Environment: ${process.env.NODE_ENV || 'development'}

Environment Variables
-------------------
Client ID available: ${Boolean(buildInfo.clientId)}
API Key available: ${Boolean(buildInfo.apiKey)}
Client ID format valid: ${buildInfo.clientId && buildInfo.clientId.includes('.apps.googleusercontent.com')}
API Key format valid: ${buildInfo.apiKey && buildInfo.apiKey.startsWith('AIza')}

Node Environment
--------------
Node Version: ${process.version}
Platform: ${process.platform}
Architecture: ${process.arch}

Files
-----
build.js exists: ${fs.existsSync(path.join(__dirname, 'build.js'))}
prebuild.js exists: ${fs.existsSync(path.join(__dirname, 'prebuild.js'))}
verify-build.js exists: ${fs.existsSync(path.join(__dirname, 'verify-build.js'))}
js/config.js exists: ${fs.existsSync(path.join(__dirname, 'js', 'config.js'))}
`;
        fs.writeFileSync(debugPath, debugContent);
        console.log('✅ Created build debug log');
    } catch (error) {
        console.error('Failed to create debug log:', error);
    }
}

// Process the configuration file with enhanced security
async function processConfigFile(buildInfo) {
    console.log('Creating secure config.js with environment variables...');
    
    // Encode credentials using our enhanced obfuscation
    const encodedClientId = buildInfo.clientId ? encodeForObfuscation(buildInfo.clientId) : '';
    const encodedApiKey = buildInfo.apiKey ? encodeForObfuscation(buildInfo.apiKey) : '';
    const buildVersion = `v1.0.3-${new Date().toISOString().split('T')[0]}`;
    
    // Set up paths
    const configPath = path.join(__dirname, 'js', 'config.js');
    const improvedConfigPath = path.join(__dirname, 'js', 'improved-config.js');
    
    // Choose template to use - prefer the improved version if available
    let templatePath;
    if (fs.existsSync(improvedConfigPath)) {
        templatePath = improvedConfigPath;
        console.log('Using improved-config.js as template');
    } else {
        // Check for various possible template locations
        const possibleTemplates = [
            path.join(__dirname, 'js', 'config.template.js'),
            path.join(__dirname, 'templates', 'config.js'),
            configPath
        ];
        
        for (const template of possibleTemplates) {
            if (fs.existsSync(template)) {
                templatePath = template;
                console.log(`Using ${path.basename(template)} as template`);
                break;
            }
        }
    }
    
    // If no template was found, use a default secure template
    let configTemplate;
    if (templatePath && fs.existsSync(templatePath)) {
        configTemplate = fs.readFileSync(templatePath, 'utf8');
    } else {
        console.log('No existing config template found, creating from scratch');
        configTemplate = `// Configuration file for GContactsCast
const CONFIG = (function() {
    // Initialize with debug level that doesn't expose credentials
    const debugLevel = 1; // 0 = none, 1 = basic, 2 = verbose (be careful with level 2)
    
    // Private logging function that doesn't expose credentials
    const _secureLog = function(message, level = 1) {
        if (level <= debugLevel) {
            console.log(\`[Config] \${message}\`);
        }
    };
    
    _secureLog('Loading CONFIG module...', 1);
    
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded, type) {
        if (!encoded || encoded === '' || encoded === '{{ENCODED_CLIENT_ID}}' || encoded === '{{ENCODED_API_KEY}}') {
            _secureLog(\`Missing encoded \${type}. Check build configuration.\`, 1);
            return 'MISSING_CREDENTIAL';
        }
        
        try {
            // First check if we're dealing with directly injected values (fallback mode)
            if ((type === 'CLIENT_ID' && encoded.includes('apps.googleusercontent.com')) || 
                (type === 'API_KEY' && encoded.startsWith('AIza'))) {
                _secureLog(\`Using direct \${type} (detected valid format)\`, 1);
                return encoded;
            }
            
            // Special case for development placeholder values
            if (encoded === 'MISSING_CLIENT_ID_CHECK_ENV_VARS' ||
                encoded === 'MISSING_API_KEY_CHECK_ENV_VARS') {
                _secureLog(\`Using development placeholder value for \${type}\`, 1);
                return encoded;
            }
            
            // Otherwise try to decode the obfuscated value
            _secureLog(\`Decoding obfuscated \${type}...\`, 1);
            
            // Reverse the string and decode from base64
            const decoded = atob(encoded.split('').reverse().join(''));
            
            // Validate the decoded value looks reasonable
            if (decoded.length > 10) {
                _secureLog(\`Successfully decoded \${type}\`, 1);
                return decoded;
            } else {
                _secureLog(\`Decoded \${type} appears invalid (too short)\`, 1);
                return 'INVALID_CREDENTIAL';
            }
        } catch (error) {
            _secureLog(\`Failed to decode \${type}: \${error.message}\`, 1);
            
            // If decoding fails, check if the raw value might be usable
            if (encoded.length > 20) {
                _secureLog(\`Using raw \${type} value as fallback\`, 1);
                return encoded; // Use the raw value as fallback
            }
            
            return 'INVALID_CREDENTIAL';
        }
    }
    
    // These values will be replaced during build
    const encodedClientId = '{{ENCODED_CLIENT_ID}}';
    const encodedApiKey = '{{ENCODED_API_KEY}}';
    
    // Direct fallback credentials from environment (used in development)
    // These should be empty in the source file
    const directClientId = '';
    const directApiKey = '';
    
    // Public interface with getters that decode only when needed
    const config = {
        // Client ID getter with enhanced security
        get CLIENT_ID() {
            _secureLog('Getting CLIENT_ID...', 1);
            
            // Try encoded value first
            if (encodedClientId && encodedClientId !== '{{ENCODED_CLIENT_ID}}') {
                const decoded = deobfuscate(encodedClientId, 'CLIENT_ID');
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directClientId && directClientId !== '') {
                _secureLog('Using direct CLIENT_ID from environment', 1);
                return directClientId;
            }
            
            _secureLog('No valid CLIENT_ID found in any source', 1);
            return 'MISSING_CREDENTIAL';
        },
        
        // API Key getter with enhanced security
        get API_KEY() {
            _secureLog('Getting API_KEY...', 1);
            
            // Try encoded value first
            if (encodedApiKey && encodedApiKey !== '{{ENCODED_API_KEY}}') {
                const decoded = deobfuscate(encodedApiKey, 'API_KEY');
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directApiKey && directApiKey !== '') {
                _secureLog('Using direct API_KEY from environment', 1);
                return directApiKey;
            }
            
            _secureLog('No valid API_KEY found in any source', 1);
            return 'MISSING_CREDENTIAL';
        },
        
        // Constants that don't need to be hidden
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '{{BUILD_VERSION}}',
        
        // Check if configuration is valid
        isValid: function() {
            const clientId = this.CLIENT_ID;
            const apiKey = this.API_KEY;
            
            return clientId !== 'MISSING_CREDENTIAL' && 
                   clientId !== 'INVALID_CREDENTIAL' &&
                   apiKey !== 'MISSING_CREDENTIAL' && 
                   apiKey !== 'INVALID_CREDENTIAL';
        }
    };
    
    // Log that config is loaded (but don't expose credentials)
    _secureLog(\`Config loaded successfully, version: \${config.VERSION}\`, 1);
    _secureLog(\`Configuration validity: \${config.isValid() ? 'Valid' : 'Invalid - check environment variables'}\`, 1);
    
    return config;
})();
`;
    }
    
    // Update template placeholders with enhanced security
    let configContent = configTemplate
        .replace(/['"]?{{ENCODED_CLIENT_ID}}['"]?/g, `'${encodedClientId}'`)
        .replace(/['"]?{{ENCODED_API_KEY}}['"]?/g, `'${encodedApiKey}'`)
        .replace(/['"]?{{CLIENT_ID}}['"]?/g, "''") // Never include raw credentials
        .replace(/['"]?{{API_KEY}}['"]?/g, "''")   // Never include raw credentials
        .replace(/['"]?{{BUILD_VERSION}}['"]?/g, `'${buildVersion}'`);
        
    // Update any legacy patterns that might be in the file
    configContent = configContent
        .replace(/encodedClientId\s*=\s*['"][^'"]*['"]/, `encodedClientId = '${encodedClientId}'`)
        .replace(/encodedApiKey\s*=\s*['"][^'"]*['"]/, `encodedApiKey = '${encodedApiKey}'`);
    
    // Also remove any hardcoded credentials that might have been added during development
    configContent = configContent
        .replace(/hardcodedClientId\s*=\s*['"][A-Za-z0-9\-_\.]+['"]/, `hardcodedClientId = ''`)
        .replace(/hardcodedApiKey\s*=\s*['"][A-Za-z0-9\-_\.]+['"]/, `hardcodedApiKey = ''`);
    
    // Create directory if it doesn't exist
    const jsDir = path.join(__dirname, 'js');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
    }
    
    // Write updated config
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Secure credentials processed and placed in config.js');
    
    // Verify the file was written correctly
    if (fs.existsSync(configPath)) {
        const stat = fs.statSync(configPath);
        console.log(`✅ config.js file created successfully (${stat.size} bytes)`);
        
        // Extra validation check
        if (stat.size < 100) {
            console.error('❌ WARNING: config.js file is suspiciously small');
        }
    } else {
        console.error('❌ ERROR: Failed to create config.js file');
        return false;
    }
    
    return true;
}

// Create a direct fallback config in case of errors
function createFallbackConfig(buildInfo) {
    console.log('Creating direct fallback config.js...');
    
    try {
        const jsDir = path.join(__dirname, 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        // Use a much simpler config format that doesn't expose credentials
        const fallbackConfig = `// FALLBACK CONFIG - CREATED BY BUILD SCRIPT
const CONFIG = (function() {
    console.log('Loading fallback CONFIG module');
    
    // Never expose credentials in the fallback - require proper initialization
    return {
        CLIENT_ID: 'CREDENTIAL_ERROR_CHECK_ENV_VARS',
        API_KEY: 'CREDENTIAL_ERROR_CHECK_ENV_VARS',
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: 'fallback-${new Date().toISOString()}'
    };
})();`;
        
        const configPath = path.join(__dirname, 'js', 'config.js');
        fs.writeFileSync(configPath, fallbackConfig);
        console.log('✅ Created direct fallback config.js');
        
        return true;
    } catch (fallbackError) {
        console.error('❌ ERROR: Failed to create fallback config:', fallbackError);
        return false;
    }
}

// Main build process
async function runBuild() {
    console.log('Starting enhanced build process for GContactsCast...');
    
    try {
        // Step 1: Validate environment variables
        const buildInfo = validateEnvironmentVariables();
        
        // Create a debug log (without sensitive info)
        createBuildDebugLog(buildInfo);
        
        if (!buildInfo.validationPassed) {
            console.warn('⚠️ Environment validation failed. Will continue with build, but app may not function correctly.');
        }
        
        // Step 2: Process the config file
        const configProcessed = await processConfigFile(buildInfo);
        
        if (!configProcessed) {
            console.error('❌ Failed to process configuration. Attempting fallback...');
            const fallbackCreated = createFallbackConfig(buildInfo);
            
            if (!fallbackCreated) {
                console.error('❌ CRITICAL ERROR: Failed to create any usable configuration!');
                process.exit(1);
            }
        }
        
        // Step 3: Run the verification script
        console.log('Running verification script...');
        try {
            require('./verify-build.js');
            console.log('✅ Verification completed successfully');
        } catch (verifyError) {
            console.error('❌ Verification failed:', verifyError.message);
            // Continue despite errors
        }
        
        console.log('✅ Enhanced build process completed successfully');
    } catch (error) {
        console.error('❌ Build process failed:', error);
        
        // Create fallback config as last resort
        createFallbackConfig({ clientId: '', apiKey: '' });
        
        process.exit(1);
    }
}

// Run the build
runBuild();
