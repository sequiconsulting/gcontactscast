// Configuration Verification Script for GContactsCast
(function() {
    console.log('Config Check Script Loaded');

    // Function to check configuration status with improved error handling
    function checkConfiguration() {
        console.log('Running configuration check...');

        // Wait for CONFIG to potentially be defined
        if (typeof window.CONFIG === 'undefined') {
            console.warn('[CONFIG CHECK] Waiting for CONFIG to be defined...');
            
            // Last resort: create a fallback CONFIG object
            window.CONFIG = {
                CLIENT_ID: 'MISSING_CREDENTIAL',
                API_KEY: 'MISSING_CREDENTIAL',
                SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
                DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1',
                VERSION: `fallback-${new Date().toISOString().split('T')[0]}`,
                isValid: function() { return false; }
            };
        }

        // Check if CONFIG is valid
        try {
            const isValid = window.CONFIG.isValid();
            
            // Detailed configuration check
            const clientIdStatus = window.CONFIG.CLIENT_ID !== 'MISSING_CREDENTIAL' && 
                                   window.CONFIG.CLIENT_ID !== 'INVALID_CREDENTIAL';
            const apiKeyStatus = window.CONFIG.API_KEY !== 'MISSING_CREDENTIAL' && 
                                 window.CONFIG.API_KEY !== 'INVALID_CREDENTIAL';

            const result = {
                status: isValid ? 'success' : 'error',
                clientIdValid: clientIdStatus,
                apiKeyValid: apiKeyStatus,
                version: window.CONFIG.VERSION,
                message: isValid 
                    ? 'Configuration is valid' 
                    : 'Configuration contains invalid credentials'
            };

            console.log('[CONFIG CHECK] Result:', result);
            return result;
        } catch (error) {
            console.error('[CONFIG CHECK] Error checking configuration:', error);
            return {
                status: 'error',
                message: 'Error validating configuration: ' + error.message
            };
        }
    }

    // Expose configuration check globally
    window.configCheck = checkConfiguration;

    // Automatically run check and log results with improved detection
    function runConfigCheck() {
        // Wait a short time to ensure all scripts have loaded
        setTimeout(() => {
            const result = checkConfiguration();
            
            // Update config status element if it exists
            const configStatusEl = document.getElementById('config-status');
            if (configStatusEl) {
                configStatusEl.textContent = result.message;
                configStatusEl.classList.add('config-status-' + result.status);
                
                // Add visual indicator
                if (result.status === 'error') {
                    configStatusEl.style.color = 'red';
                    configStatusEl.innerHTML += ` <a href="diagnostic.html">Troubleshoot</a>`;
                }
            }

            // Additional logging for debugging
            console.log('[CONFIG CHECK] Configuration check completed');
        }, 500); // Short delay to allow other scripts to load
    }

    // Ensure the script runs after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runConfigCheck);
    } else {
        runConfigCheck();
    }
})();
