// Build script for Google Contacts Viewer
const fs = require('fs-extra');
const path = require('path');

console.log('Running build process...');

// Function to encode a string for obfuscation
function encodeForObfuscation(str) {
    if (!str) return '';
    return Buffer.from(str).toString('base64').split('').reverse().join('');
}

// Get environment variables with enhanced validation and trim any whitespace
const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : '';
const buildVersion = new Date().toISOString();

// More detailed validation of environment variables
if (!clientId) {
    console.error('❌ ERROR: GOOGLE_CLIENT_ID environment variable is not set');
} else if (clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.length < 20) {
    console.error('❌ ERROR: GOOGLE_CLIENT_ID appears to be invalid or a placeholder');
} else {
    console.log(`✅ GOOGLE_CLIENT_ID found (${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)})`);
}

if (!apiKey) {
    console.error('❌ ERROR: GOOGLE_API_KEY environment variable is not set');
} else if (apiKey.includes('YOUR_GOOGLE_API_KEY') || apiKey.length < 20) {
    console.error('❌ ERROR: GOOGLE_API_KEY appears to be invalid or a placeholder');
} else {
    console.log(`✅ GOOGLE_API_KEY found (${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)})`);
}

// Paths
const configPath = path.join(__dirname, 'js', 'config.js');
const configTemplatePath = path.join(__dirname, 'js', 'config.template.js');

// First check if we should use a template or update existing file
let configTemplate;

if (fs.existsSync(configTemplatePath)) {
    console.log('Using config template file');
    configTemplate = fs.readFileSync(configTemplatePath, 'utf8');
} else if (fs.existsSync(configPath)) {
    console.log('Using existing config.js as template');
    configTemplate = fs.readFileSync(configPath, 'utf8');
} else {
    console.log('No existing config file found, creating from scratch');
    configTemplate = `// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    console.log('Loading CONFIG module...');
    
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded) {
        // Check if the encoded string is empty
        if (!encoded || encoded === '') {
            console.error('Missing encoded credentials. Check build configuration.');
            return 'MISSING_CREDENTIAL';
        }
        
        try {
            // First check if we're dealing with directly injected values (fallback mode)
            if (encoded.includes('_') && (
                encoded.includes('GOCSP') || 
                encoded.includes('AIza')
            )) {
                console.log('Using direct credential (detected valid format)');
                return encoded; // Return the value directly if it looks like a valid credential
            }
            
            // Special case for development placeholder values
            if (encoded === 'MISSING_CLIENT_ID_CHECK_ENV_VARS' ||
                encoded === 'MISSING_API_KEY_CHECK_ENV_VARS') {
                console.error('Using development placeholder value:', encoded);
                return encoded;
            }
            
            // Otherwise try to decode the obfuscated value
            console.log('Attempting to decode obfuscated credential...');
            const decoded = atob(encoded.split('').reverse().join(''));
            
            // Validate the decoded value looks reasonable
            if (decoded.length > 10) {
                return decoded;
            } else {
                console.error('Decoded credential appears invalid (too short)');
                return 'INVALID_CREDENTIAL';
            }
        } catch (error) {
            console.error('Failed to decode credential:', error);
            
            // If decoding fails, check if the raw value might be usable
            if (encoded.length > 20) {
                console.log('Using raw credential value as fallback');
                return encoded; // Use the raw value as fallback
            }
            
            return 'INVALID_CREDENTIAL';
        }
    }
    
    // These values will be replaced during build
    // Default empty strings will be replaced during build process
    const encodedClientId = '{{ENCODED_CLIENT_ID}}';
    const encodedApiKey = '{{ENCODED_API_KEY}}';
    
    // Direct fallback credentials from environment (used in development)
    // These should be empty in the source file
    const directClientId = '{{CLIENT_ID}}';
    const directApiKey = '{{API_KEY}}';
    
    // Public interface with getters that decode only when needed
    return {
        // Client ID getter with detailed validation
        get CLIENT_ID() {
            console.log('CONFIG: Getting CLIENT_ID...');
            
            // Try encoded value first
            if (encodedClientId && encodedClientId !== '{{ENCODED_CLIENT_ID}}') {
                const decoded = deobfuscate(encodedClientId);
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directClientId && directClientId !== '{{CLIENT_ID}}') {
                console.log('Using direct CLIENT_ID from environment');
                return directClientId;
            }
            
            console.error('No valid CLIENT_ID found in any source');
            return 'MISSING_CREDENTIAL';
        },
        
        // API Key getter with detailed validation
        get API_KEY() {
            console.log('CONFIG: Getting API_KEY...');
            
            // Try encoded value first
            if (encodedApiKey && encodedApiKey !== '{{ENCODED_API_KEY}}') {
                const decoded = deobfuscate(encodedApiKey);
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directApiKey && directApiKey !== '{{API_KEY}}') {
                console.log('Using direct API_KEY from environment');
                return directApiKey;
            }
            
            console.error('No valid API_KEY found in any source');
            return 'MISSING_CREDENTIAL';
        },
        
        // Constants that don't need to be hidden
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '{{BUILD_VERSION}}'
    };
})();

// Log that config is loaded (but don't expose credentials)
console.log('Config loaded, version: ' + CONFIG.VERSION);`;
}

// Create config.js content with actual values
console.log('Creating config.js with environment variables...');

try {
    // Encode credentials
    const encodedClientId = clientId ? encodeForObfuscation(clientId) : '';
    const encodedApiKey = apiKey ? encodeForObfuscation(apiKey) : '';
    
    // Update template placeholders
    let configContent = configTemplate
        .replace(/['"]?{{ENCODED_CLIENT_ID}}['"]?/g, `'${encodedClientId}'`)
        .replace(/['"]?{{ENCODED_API_KEY}}['"]?/g, `'${encodedApiKey}'`)
        .replace(/['"]?{{CLIENT_ID}}['"]?/g, clientId ? `'${clientId}'` : "''")
        .replace(/['"]?{{API_KEY}}['"]?/g, apiKey ? `'${apiKey}'` : "''")
        .replace(/['"]?{{BUILD_VERSION}}['"]?/g, `'${buildVersion}'`);
        
    // Update any legacy patterns that might be in the file
    configContent = configContent
        .replace(/encodedClientId\s*=\s*['"][^'"]*['"]/, `encodedClientId = '${encodedClientId}'`)
        .replace(/encodedApiKey\s*=\s*['"][^'"]*['"]/, `encodedApiKey = '${encodedApiKey}'`);
    
    // Write updated config
    const jsDir = path.join(__dirname, 'js');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Credentials processed and placed in config.js');
    
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
    }
} catch (error) {
    console.error('❌ ERROR: Failed to process config.js:', error);
    
    // Create a direct fallback config if processing failed
    try {
        console.log('Creating direct fallback config.js...');
        
        const jsDir = path.join(__dirname, 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        const fallbackConfig = `// FALLBACK CONFIG - CREATED BY BUILD SCRIPT
const CONFIG = {
    CLIENT_ID: '${clientId || 'MISSING_CLIENT_ID_CHECK_ENV_VARS'}',
    API_KEY: '${apiKey || 'MISSING_API_KEY_CHECK_ENV_VARS'}',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
    VERSION: '${buildVersion}'
};

console.log('Loaded fallback CONFIG module');`;
        
        fs.writeFileSync(configPath, fallbackConfig);
        console.log('✅ Created direct fallback config.js');
    } catch (fallbackError) {
        console.error('❌ ERROR: Failed to create fallback config:', fallbackError);
    }
}

// Create an explicit debug trace file to help troubleshoot
try {
    const debugPath = path.join(__dirname, 'build-debug.log');
    const debugContent = `Build process ran at: ${new Date().toISOString()}
Client ID available: ${Boolean(clientId)}
API Key available: ${Boolean(apiKey)}
Client ID length: ${clientId ? clientId.length : 0}
API Key length: ${apiKey ? apiKey.length : 0}
Environment variables:
${Object.keys(process.env)
  .filter(key => !key.includes('SECRET') && !key.includes('TOKEN') && !key.includes('PASSWORD'))
  .map(key => `  ${key}: ${key.includes('KEY') || key.includes('ID') ? '***' : process.env[key]}`)
  .join('\n')}
`;
    fs.writeFileSync(debugPath, debugContent);
    console.log('✅ Created build debug log');
} catch (error) {
    console.error('Failed to create debug log:', error);
}

console.log('Build process completed');
