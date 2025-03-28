// Configuration file for Google Contacts Viewer
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
    const encodedClientId = '{{WILL_BE_REPLACED_BY_BUILD}}';
    const encodedApiKey = '{{WILL_BE_REPLACED_BY_BUILD}}';
    
    // Direct fallback credentials from environment (used in development)
    // These should be empty in the source file
    const directClientId = '';
    const directApiKey = '';
    
    // Public interface with getters that decode only when needed
    const config = {
        // Client ID getter with detailed validation
        get CLIENT_ID() {
            console.log('CONFIG: Getting CLIENT_ID...');
            
            // Try encoded value first
            if (encodedClientId && encodedClientId !== '{{WILL_BE_REPLACED_BY_BUILD}}') {
                const decoded = deobfuscate(encodedClientId);
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directClientId && directClientId !== '') {
                console.log('Using direct CLIENT_ID from environment');
                return directClientId;
            }
            
            // If hardcoded in this file (only for development/testing)
            // WARNING: Do not put real credentials here in production!
            const hardcodedClientId = '';  // Only for development testing
            if (hardcodedClientId && hardcodedClientId !== '') {
                console.warn('Using hardcoded CLIENT_ID - NOT FOR PRODUCTION');
                return hardcodedClientId;
            }
            
            console.error('No valid CLIENT_ID found in any source');
            return 'MISSING_CREDENTIAL';
        },
        
        // API Key getter with detailed validation
        get API_KEY() {
            console.log('CONFIG: Getting API_KEY...');
            
            // Try encoded value first
            if (encodedApiKey && encodedApiKey !== '{{WILL_BE_REPLACED_BY_BUILD}}') {
                const decoded = deobfuscate(encodedApiKey);
                if (decoded !== 'MISSING_CREDENTIAL' && decoded !== 'INVALID_CREDENTIAL') {
                    return decoded;
                }
            }
            
            // Try direct value as fallback
            if (directApiKey && directApiKey !== '') {
                console.log('Using direct API_KEY from environment');
                return directApiKey;
            }
            
            // If hardcoded in this file (only for development/testing)
            // WARNING: Do not put real credentials here in production!
            const hardcodedApiKey = '';  // Only for development testing
            if (hardcodedApiKey && hardcodedApiKey !== '') {
                console.warn('Using hardcoded API_KEY - NOT FOR PRODUCTION');
                return hardcodedApiKey;
            }
            
            console.error('No valid API_KEY found in any source');
            return 'MISSING_CREDENTIAL';
        },
        
        // Constants that don't need to be hidden
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: 'v1.0.1-' + new Date().toISOString().split('T')[0]
    };
    
    console.log('CONFIG module loaded successfully');
    return config;
})();

// Log that config is loaded (but don't expose credentials)
console.log('Config loaded, version:', CONFIG.VERSION);
