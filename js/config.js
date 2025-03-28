// Configuration file for GContactsCast with robust initialization
(function(global) {
    // Enhanced logging function
    function log(message, level = 'info') {
        const levels = {
            'error': console.error,
            'warn': console.warn,
            'info': console.log
        };
        
        const logFunc = levels[level] || console.log;
        logFunc(`[CONFIG] ${message}`);
    }
    
    // Robust deobfuscation function with detailed error handling
    function deobfuscate(encoded, type = 'credential') {
        if (!encoded || encoded === '{{ENCODED_' + type.toUpperCase() + '_ID}}') {
            log(`Missing encoded ${type}`, 'error');
            return 'MISSING_CREDENTIAL';
        }
        
        try {
            // Decode from base64 and reverse the string
            const decoded = atob(encoded.split('').reverse().join(''));
            
            if (!decoded || decoded.length < 10) {
                log(`Invalid decoded ${type}`, 'error');
                return 'INVALID_CREDENTIAL';
            }
            
            return decoded;
        } catch (error) {
            log(`Decoding error for ${type}: ${error.message}`, 'error');
            return 'INVALID_CREDENTIAL';
        }
    }
    
    // Configuration with enhanced error checking and initialization
    const CONFIG = {
        // These values will be replaced by the build script
        _encodedClientId: '{{ENCODED_CLIENT_ID}}',
        _encodedApiKey: '{{ENCODED_API_KEY}}',
        
        // Getter for Client ID with error handling
        get CLIENT_ID() {
            const clientId = deobfuscate(this._encodedClientId, 'client');
            
            // Additional validation
            if (clientId === 'MISSING_CREDENTIAL' || clientId === 'INVALID_CREDENTIAL') {
                log('Client ID is not valid', 'error');
                return clientId;
            }
            
            // Optional additional checks (e.g., format validation)
            if (!clientId.includes('.apps.googleusercontent.com')) {
                log('Client ID format may be incorrect', 'warn');
            }
            
            return clientId;
        },
        
        // Getter for API Key with error handling
        get API_KEY() {
            const apiKey = deobfuscate(this._encodedApiKey, 'api');
            
            // Additional validation
            if (apiKey === 'MISSING_CREDENTIAL' || apiKey === 'INVALID_CREDENTIAL') {
                log('API Key is not valid', 'error');
                return apiKey;
            }
            
            // Optional additional checks
            if (!apiKey.startsWith('AIza')) {
                log('API Key format may be incorrect', 'warn');
            }
            
            return apiKey;
        },
        
        // Constants
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        
        // Dynamic version with current date
        VERSION: `v1.0.5-${new Date().toISOString().split('T')[0]}`,
        
        // Comprehensive configuration validation
        isValid: function() {
            const clientId = this.CLIENT_ID;
            const apiKey = this.API_KEY;
            
            // Detailed validation checks
            const clientIdValid = 
                clientId !== 'MISSING_CREDENTIAL' && 
                clientId !== 'INVALID_CREDENTIAL' &&
                clientId.includes('.apps.googleusercontent.com');
            
            const apiKeyValid = 
                apiKey !== 'MISSING_CREDENTIAL' && 
                apiKey !== 'INVALID_CREDENTIAL' &&
                apiKey.startsWith('AIza');
            
            const isValid = clientIdValid && apiKeyValid;
            
            if (!isValid) {
                log('Configuration validation failed', 'error');
                log(`Client ID valid: ${clientIdValid}`, 'warn');
                log(`API Key valid: ${apiKeyValid}`, 'warn');
            }
            
            return isValid;
        }
    };
    
    // Attach to global scope ensuring it's always available
    global.CONFIG = CONFIG;
    
    // Log configuration status on initialization
    log('Configuration module initialized');
})(typeof window !== 'undefined' ? window : global);
