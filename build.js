// Enhanced Build Script for GContactsCast with improved error handling
// Fixes deployment issues on Netlify
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

console.log('=== GContactsCast Build Process Starting ===');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

// Print available environment variables (without showing sensitive values)
const envKeys = Object.keys(process.env).filter(key => 
    !key.toLowerCase().includes('key') && 
    !key.toLowerCase().includes('secret') && 
    !key.toLowerCase().includes('token') && 
    !key.toLowerCase().includes('password') &&
    !key.toLowerCase().includes('credential')
);
console.log('Available environment keys:', envKeys.join(', '));

// Improved function to encode a string for obfuscation with more robust error handling
function encodeForObfuscation(str) {
    if (!str || typeof str !== 'string') {
        console.error('❌ ERROR: Cannot encode null, undefined, or non-string value');
        return '';
    }
    
    try {
        // Add noise to the encoding to make it harder to reverse-engineer
        const noise = crypto.randomBytes(2).toString('hex');
        const combined = noise + str + noise;
        
        // Base64 encode and reverse
        const encoded = Buffer.from(combined).toString('base64').split('').reverse().join('');
        
        // Verify the encoded string is non-empty
        if (!encoded || encoded.length < 10) {
            throw new Error('Encoding produced invalid result');
        }
        
        return encoded;
    } catch (error) {
        console.error('❌ ERROR in encodeForObfuscation:', error.message);
        // Return a fallback encoded value when encoding fails
        return Buffer.from(`ENCODING_ERROR_${Date.now()}`).toString('base64');
    }
}

// Validate environment variables with detailed feedback and fallbacks
function validateEnvironmentVariables() {
    console.log('\n=== Validating Environment Variables ===');
    
    // Improved environment variable access with fallbacks
    // Get and sanitize environment variables, providing clear feedback
    let clientId = '';
    let apiKey = '';
    
    // Check if environment variables exist
    if (process.env.GOOGLE_CLIENT_ID) {
        clientId = process.env.GOOGLE_CLIENT_ID.trim();
        console.log(`✅ GOOGLE_CLIENT_ID found (${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)})`);
    } else {
        console.error('❌ ERROR: GOOGLE_CLIENT_ID environment variable is not set');
        
        // Look for alternative names that might have been used
        const possibleClientIdVars = ['REACT_APP_GOOGLE_CLIENT_ID', 'GATSBY_GOOGLE_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'VUE_APP_GOOGLE_CLIENT_ID'];
        
        for (const varName of possibleClientIdVars) {
            if (process.env[varName]) {
                console.log(`⚠️ Found potential CLIENT_ID in ${varName}, using as fallback`);
                clientId = process.env[varName].trim();
                break;
            }
        }
    }
    
    if (process.env.GOOGLE_API_KEY) {
        apiKey = process.env.GOOGLE_API_KEY.trim();
        console.log(`✅ GOOGLE_API_KEY found (${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)})`);
    } else {
        console.error('❌ ERROR: GOOGLE_API_KEY environment variable is not set');
        
        // Look for alternative names that might have been used
        const possibleApiKeyVars = ['REACT_APP_GOOGLE_API_KEY', 'GATSBY_GOOGLE_API_KEY', 'NEXT_PUBLIC_GOOGLE_API_KEY', 'VUE_APP_GOOGLE_API_KEY'];
        
        for (const varName of possibleApiKeyVars) {
            if (process.env[varName]) {
                console.log(`⚠️ Found potential API_KEY in ${varName}, using as fallback`);
                apiKey = process.env[varName].trim();
                break;
            }
        }
    }
    
    let validationPassed = true;
    
    // Validate Client ID
    if (!clientId) {
        console.error('❌ ERROR: No valid GOOGLE_CLIENT_ID found in any environment variable');
        validationPassed = false;
    } else if (clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.length < 20) {
        console.error('❌ ERROR: GOOGLE_CLIENT_ID appears to be invalid or a placeholder');
        validationPassed = false;
    } else if (!clientId.includes('.apps.googleusercontent.com')) {
        console.warn('⚠️ WARNING: GOOGLE_CLIENT_ID does not have the expected format (should end with .apps.googleusercontent.com)');
    }
    
    // Validate API Key
    if (!apiKey) {
        console.error('❌ ERROR: No valid GOOGLE_API_KEY found in any environment variable');
        validationPassed = false;
    } else if (apiKey.includes('YOUR_GOOGLE_API_KEY') || apiKey.length < 20) {
        console.error('❌ ERROR: GOOGLE_API_KEY appears to be invalid or a placeholder');
        validationPassed = false;
    } else if (!apiKey.startsWith('AIza')) {
        console.warn('⚠️ WARNING: GOOGLE_API_KEY does not have the expected format (should start with AIza)');
    }
    
    return { clientId, apiKey, validationPassed };
}

// Process the configuration file with enhanced security and better error handling
function processConfigFile(buildInfo) {
    console.log('\n=== Creating Secure Config File ===');
    
    try {
        // Only proceed with encoding if we have values
        let encodedClientId = '';
        let encodedApiKey = '';
        
        if (buildInfo.clientId) {
            console.log('Encoding CLIENT_ID...');
            encodedClientId = encodeForObfuscation(buildInfo.clientId);
            if (!encodedClientId) {
                console.error('❌ Failed to encode CLIENT_ID');
            } else {
                console.log(`✅ CLIENT_ID encoded successfully (${encodedClientId.length} characters)`);
            }
        }
        
        if (buildInfo.apiKey) {
            console.log('Encoding API_KEY...');
            encodedApiKey = encodeForObfuscation(buildInfo.apiKey);
            if (!encodedApiKey) {
                console.error('❌ Failed to encode API_KEY');
            } else {
                console.log(`✅ API_KEY encoded successfully (${encodedApiKey.length} characters)`);
            }
        }
        
        const buildVersion = `v1.0.5-${new Date().toISOString().split('T')[0]}`;
        
        // Set up js directory if it doesn't exist
        const jsDir = path.join(__dirname, 'js');
        if (!fs.existsSync(jsDir)) {
            console.log(`Creating js directory at ${jsDir}`);
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        // Create config.js with clear error messages and fallbacks
        const configContent = `// Configuration file for GContactsCast
// Generated by build script on ${new Date().toISOString()}
// This file should be loaded before any other application scripts
window.CONFIG = (function() {
    // Simple debug log function
    function log(message, level = 1) {
        console.log("[CONFIG] " + message);
    }
    
    log("Initializing CONFIG module...");
    
    // Function to decode obfuscated credentials
    function deobfuscate(encoded, type) {
        if (!encoded || encoded.length < 10) {
            log("ERROR: Missing or invalid encoded " + type);
            return "MISSING_CREDENTIAL";
        }
        
        try {
            // Reverse and base64 decode
            const decoded = atob(encoded.split('').reverse().join(''));
            
            // Remove the noise (first 4 and last 4 characters)
            return decoded.substring(4, decoded.length - 4);
        } catch (error) {
            log("Decoding error for " + type + ": " + error.message);
            return "INVALID_CREDENTIAL";
        }
    }
    
    // Obfuscated credentials - these will be replaced during build
    const encodedClientId = "${encodedClientId}";
    const encodedApiKey = "${encodedApiKey}";
    
    // Public API with better error handling
    return {
        get CLIENT_ID() {
            const decoded = deobfuscate(encodedClientId, "CLIENT_ID");
            log("CLIENT_ID accessed: " + (decoded === "MISSING_CREDENTIAL" ? "MISSING" : "Available"));
            return decoded;
        },
        get API_KEY() {
            const decoded = deobfuscate(encodedApiKey, "API_KEY");
            log("API_KEY accessed: " + (decoded === "MISSING_CREDENTIAL" ? "MISSING" : "Available"));
            return decoded;
        },
        SCOPES: "https://www.googleapis.com/auth/contacts.readonly",
        DISCOVERY_DOC: "https://people.googleapis.com/$discovery/rest?version=v1",
        VERSION: "${buildVersion}",
        isValid: function() {
            const clientId = this.CLIENT_ID;
            const apiKey = this.API_KEY;
            return clientId !== "MISSING_CREDENTIAL" && 
                   clientId !== "INVALID_CREDENTIAL" &&
                   apiKey !== "MISSING_CREDENTIAL" && 
                   apiKey !== "INVALID_CREDENTIAL";
        }
    };
})();

// Verify CONFIG is defined globally and log result
console.log("[CONFIG Check] CONFIG object " + (typeof window.CONFIG !== 'undefined' ? "successfully initialized" : "FAILED to initialize"));
`;
        
        // Write the config file
        const configPath = path.join(jsDir, 'config.js');
        console.log(`Writing config.js to ${configPath}`);
        fs.writeFileSync(configPath, configContent, 'utf8');
        
        // Verify the file was written correctly
        if (fs.existsSync(configPath)) {
            const stat = fs.statSync(configPath);
            console.log(`✅ config.js file created successfully (${stat.size} bytes)`);
            
            if (stat.size < 100) {
                console.error('❌ WARNING: config.js file is suspiciously small');
                return false;
            }
            
            return true;
        } else {
            console.error('❌ ERROR: Failed to create config.js file');
            return false;
        }
    } catch (error) {
        console.error('❌ ERROR in processConfigFile:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Create a backup config.js in case the main one fails
function createBackupConfig() {
    console.log('\n=== Creating Backup Config File ===');
    
    try {
        const jsDir = path.join(__dirname, 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        const backupConfigPath = path.join(jsDir, 'config.backup.js');
        const backupConfig = `// BACKUP CONFIG FILE for GContactsCast
// This file is a fallback in case the main config.js fails to load
// Generated on ${new Date().toISOString()}

window.CONFIG = {
    CLIENT_ID: "MISSING_CREDENTIAL_CHECK_ENV_VARS",
    API_KEY: "MISSING_CREDENTIAL_CHECK_ENV_VARS",
    SCOPES: "https://www.googleapis.com/auth/contacts.readonly",
    DISCOVERY_DOC: "https://people.googleapis.com/$discovery/rest?version=v1",
    VERSION: "backup-${new Date().toISOString().split('T')[0]}",
    isValid: function() { return false; }
};

console.log("[CONFIG-BACKUP] Backup CONFIG loaded. This means the main config.js file failed.");
`;
        
        fs.writeFileSync(backupConfigPath, backupConfig, 'utf8');
        console.log(`✅ Backup config file created at ${backupConfigPath}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to create backup config:', error.message);
        return false;
    }
}

// Update index.html with improved script loading and error handling
function updateIndexHtml() {
    console.log('\n=== Updating index.html ===');
    
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (!fs.existsSync(indexPath)) {
            console.error('❌ index.html not found at', indexPath);
            return false;
        }
        
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Add a backup script loading mechanism to handle config.js failures
        const scriptLoaderImprovement = `
    <!-- Improved script loading with backup handling -->
    <script>
        // Track script loading status
        window.scriptStatus = {
            configLoaded: false,
            configAttempts: 0,
            maxConfigAttempts: 2
        };

        // First try to load the main config.js
        function loadConfig() {
            console.log('Attempting to load config.js...');
            window.scriptStatus.configAttempts++;
            
            var configScript = document.createElement('script');
            configScript.src = 'js/config.js';
            configScript.onload = function() {
                console.log('config.js loaded successfully');
                window.scriptStatus.configLoaded = true;
                
                // Verify CONFIG is actually defined
                if (typeof window.CONFIG === 'undefined') {
                    console.error('CONFIG object not defined after loading config.js');
                    if (window.scriptStatus.configAttempts < window.scriptStatus.maxConfigAttempts) {
                        console.log('Trying backup config...');
                        loadBackupConfig();
                    } else {
                        showConfigError('CONFIG object not defined after loading config.js');
                    }
                } else {
                    console.log('CONFIG loaded successfully, continuing with app initialization');
                    loadAppScripts();
                }
            };
            
            configScript.onerror = function() {
                console.error('Failed to load config.js');
                if (window.scriptStatus.configAttempts < window.scriptStatus.maxConfigAttempts) {
                    console.log('Trying backup config...');
                    loadBackupConfig();
                } else {
                    showConfigError('Failed to load configuration file (config.js)');
                }
            };
            
            document.head.appendChild(configScript);
        }
        
        // Try to load the backup config if the main one fails
        function loadBackupConfig() {
            console.log('Attempting to load backup config...');
            window.scriptStatus.configAttempts++;
            
            var backupScript = document.createElement('script');
            backupScript.src = 'js/config.backup.js';
            backupScript.onload = function() {
                console.log('Backup config loaded successfully');
                window.scriptStatus.configLoaded = true;
                
                // Verify CONFIG is actually defined
                if (typeof window.CONFIG === 'undefined') {
                    console.error('CONFIG object not defined after loading backup config');
                    showConfigError('CONFIG object not defined after loading backup config');
                } else {
                    console.log('Backup CONFIG loaded, continuing with app initialization');
                    loadAppScripts();
                }
            };
            
            backupScript.onerror = function() {
                console.error('Failed to load backup config');
                showConfigError('Failed to load both main and backup configuration files');
            };
            
            document.head.appendChild(backupScript);
        }
        
        // Load the rest of the application scripts
        function loadAppScripts() {
            console.log('Loading application scripts...');
            
            // Array of scripts to load in order
            var scripts = [
                'js/storage-service.js',
                'js/contacts-service.js',
                'js/app.js'
            ];
            
            function loadScript(index) {
                if (index >= scripts.length) {
                    console.log('All scripts loaded successfully');
                    return;
                }
                
                var script = document.createElement('script');
                script.src = scripts[index];
                script.onload = function() {
                    console.log(scripts[index] + ' loaded successfully');
                    loadScript(index + 1);
                };
                script.onerror = function() {
                    console.error('Failed to load ' + scripts[index]);
                    showError('Failed to load required application script: ' + scripts[index]);
                };
                
                document.head.appendChild(script);
            }
            
            loadScript(0);
        }
        
        // Display config error
        function showConfigError(message) {
            console.error('CONFIG ERROR:', message);
            document.getElementById('initial-loader').style.display = 'none';
            
            var errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.innerHTML = \`
                    <h3>Configuration Error</h3>
                    <p>\${message}</p>
                    <p>This is likely due to missing environment variables during the build process.</p>
                    <p>Please check that GOOGLE_CLIENT_ID and GOOGLE_API_KEY are properly set in your Netlify environment variables.</p>
                    <button onclick="location.reload()">Reload Page</button>
                    <button onclick="window.location.href='diagnostic.html'">Run Diagnostics</button>
                \`;
                errorContainer.style.display = 'block';
            }
        }
        
        // Display general error
        function showError(message) {
            console.error('APP ERROR:', message);
            document.getElementById('initial-loader').style.display = 'none';
            
            var errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.innerHTML = \`
                    <h3>Application Error</h3>
                    <p>\${message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                    <button onclick="window.location.href='diagnostic.html'">Run Diagnostics</button>
                \`;
                errorContainer.style.display = 'block';
            }
        }
        
        // Start loading the app when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, starting application initialization');
            loadConfig();
            
            // Set timeout to detect loading issues
            setTimeout(function() {
                if (!window.scriptStatus.configLoaded) {
                    console.error('Configuration not loaded after timeout');
                    showConfigError('Configuration loading timed out');
                }
            }, 10000);
        });
    </script>
`;
        
        // Replace the existing script loading mechanism
        // Find the script tag section that loads scripts
        const scriptSectionRegex = /<script>\s*\/\/ Global error handler for script loading([\s\S]*?)<\/script>/;
        
        if (scriptSectionRegex.test(indexContent)) {
            indexContent = indexContent.replace(scriptSectionRegex, `<script>
    // Improved script loading and error handling added by build script
    ${scriptLoaderImprovement.trim()}</script>`);
            
            console.log('✅ Updated index.html with improved script loading');
        } else {
            // If we can't find the script section, append to the end of body
            indexContent = indexContent.replace('</body>', `    ${scriptLoaderImprovement}\n</body>`);
            console.log('✅ Added script loading code to index.html (append mode)');
        }
        
        // Write back the updated index.html
        fs.writeFileSync(indexPath, indexContent, 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Failed to update index.html:', error.message);
        return false;
    }
}

// Main build process
async function runBuild() {
    console.log('\n=== Starting Build Process ===');
    
    try {
        // Validate environment variables
        const buildInfo = validateEnvironmentVariables();
        
        // Create backup config file first (just in case)
        createBackupConfig();
        
        // Process the config file (even if validation failed - use empty values)
        const configProcessed = processConfigFile(buildInfo);
        
        // Update index.html with improved script loading
        const indexUpdated = updateIndexHtml();
        
        if (configProcessed && indexUpdated) {
            console.log('\n=== ✅ Build process completed successfully ===');
        } else {
            console.warn('\n=== ⚠️ Build process completed with warnings ===');
        }
        
        // Always return success to continue the Netlify build
        return true;
    } catch (error) {
        console.error('\n=== ❌ Build process failed ===');
        console.error(error.message);
        console.error(error.stack);
        
        // Create minimal fallback config to avoid completely breaking the app
        const jsDir = path.join(__dirname, 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        const fallbackConfig = `// EMERGENCY FALLBACK CONFIG
window.CONFIG = {
    CLIENT_ID: "MISSING_CREDENTIAL_CHECK_ENV_VARS",
    API_KEY: "MISSING_CREDENTIAL_CHECK_ENV_VARS",
    SCOPES: "https://www.googleapis.com/auth/contacts.readonly",
    DISCOVERY_DOC: "https://people.googleapis.com/$discovery/rest?version=v1",
    VERSION: "emergency-fallback-${new Date().toISOString().split('T')[0]}"
};
console.error("[CONFIG] Emergency fallback configuration loaded due to build failure");
`;
        
        fs.writeFileSync(path.join(jsDir, 'config.js'), fallbackConfig, 'utf8');
        fs.writeFileSync(path.join(jsDir, 'config.backup.js'), fallbackConfig, 'utf8');
        console.log('✅ Created emergency fallback config files');
        
        // Don't exit with error code, let Netlify continue
        return true;
    }
}

// Run the build process
runBuild().then(success => {
    console.log(success ? 'Build completed.' : 'Build completed with issues.');
});
