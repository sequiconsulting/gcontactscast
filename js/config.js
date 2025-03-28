// Configuration file for Google Contacts Viewer
const CONFIG = (function() {
    // Obfuscation function to hide credentials from casual inspection
    function deobfuscate(encoded) {
        return atob(encoded.split('').reverse().join(''));
    }
    
    // Encode credentials at build time - these will be replaced by the build script
    const encodedClientId = '{{ENCODED_CLIENT_ID}}'; // Will be replaced during build
    const encodedApiKey = '{{ENCODED_API_KEY}}';     // Will be replaced during build
    
    return {
        // Credentials are only decoded when needed through accessor methods
        get CLIENT_ID() {
            return deobfuscate(encodedClientId);
        },
        get API_KEY() {
            return deobfuscate(encodedApiKey);
        },
        SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
        DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
        VERSION: '{{BUILD_VERSION}}'
    };
})();
