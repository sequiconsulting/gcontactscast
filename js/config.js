// Improved Configuration file for GContactsCast
// Handles credential obfuscation with enhanced security
const CONFIG = (function() {
    // Initialize with debug level that doesn't expose credentials
    const debugLevel = 1; // 0 = none, 1 = basic, 2 = verbose (be careful with level 2)
    
    // Private logging function that doesn't expose credentials
    const _secureLog = function(message, level = 1) {
        if (level <= debugLevel) {
            console.log(`[Config] ${message}`);
        }
    };
    
    _secureLog('Loading CONFIG module...', 1);
    
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded, type) {
        if (!encoded || encoded === '' || encoded === '{{ENCODED_CLIENT_ID}}' || encoded === '{{ENCODED_API_KEY}}') {
            _secureLog(`Missing encoded ${type}. Check build configuration.`, 1);
            return 'MISSING_CREDENTIAL';
        }
        
        try {
            // First check if we're dealing with directly injected values (fallback mode)
            if ((type === 'CLIENT_ID' && encoded.includes('apps.googleusercontent.com')) || 
                (type === 'API_KEY' && encoded.startsWith('AIza'))) {
                _secureLog(`Using direct ${type} (detected valid format)`, 1);
                return encoded;
            }
            
            // Special case for development placeholder values
            if (encoded === 'MISSING_CLIENT_ID_CHECK_ENV_VARS' ||
                encoded === 'MISSING_API_KEY_CHECK_ENV_VARS') {
                _secureLog(`Using development placeholder value for ${type}`, 1);
                return encoded;
            }
            
            // Otherwise try to decode the obfuscated value
            _secureLog(`Decoding obfuscated ${type}...`, 1);
            
            // Reverse the string and decode from base64
            const decoded = atob(encoded.split('').reverse().join(''));
            
            // Validate the decoded value looks reasonable
            if (decoded.length > 10) {
                _secureLog(`Successfully decoded ${type}`, 1);
                return decoded;
            } else {
                _secureLog(`Decoded ${type} appears invalid (too short)`, 1);
                return 'INVALID_CREDENTIAL';
            }
        } catch (error) {
            _secureLog(`Failed to decode ${type}: ${error.message}`, 1);
            
            // If decoding fails, check if the raw value might be usable
            if (encoded.length > 20) {
                _secureLog(`Using raw ${type} value as fallback`, 1);
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
            
            // No hardcoded values here, only in development builds
            
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
            
            // No hardcoded values here, only in development builds
            
            _secureLog('No valid API_KEY found in any source', 1);
            return 'MISSING_CREDENTIAL';
        },
        
        // Constants that don't need to be hidden
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: 'v1.0.2-' + new Date().toISOString().split('T')[0],
        
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
    _secureLog(`Config loaded successfully, version: ${config.VERSION}`, 1);
    _secureLog(`Configuration validity: ${config.isValid() ? 'Valid' : 'Invalid - check environment variables'}`, 1);
    
    return config;
})();
