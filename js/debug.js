// Debug diagnostics script for GContactsCast
// This file should only be included on the debug.html page, not in the main app

// Global Debug Console object
const DiagnosticTool = {
    // Log storage
    logs: [],
    maxLogs: 200,
    
    // Initialize the diagnostic tool
    init: function() {
        console.log('Initializing GContactsCast diagnostic tool...');
        this.addLogEntry('Diagnostic tool initialized');
        
        // Check for any saved logs in session storage
        this.loadSavedLogs();
        
        // Automatically run environment checks
        this.checkEnvironment();
    },
    
    // Add entry to the debug log
    addLogEntry: function(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp: timestamp,
            message: message,
            type: type
        };
        
        // Add to logs array
        this.logs.push(entry);
        
        // Trim if over max size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Add to debug log display if available
        const logElement = document.getElementById('debug-log');
        if (logElement) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'log-entry';
            
            // Format timestamp to show only time
            const timeString = timestamp.split('T')[1].substring(0, 8);
            
            // Color-code based on type
            let typeClass = '';
            switch (type) {
                case 'error':
                    typeClass = 'status-error';
                    break;
                case 'warning':
                    typeClass = 'status-warning';
                    break;
                case 'success':
                    typeClass = 'status-ok';
                    break;
                default:
                    typeClass = '';
            }
            
            entryDiv.innerHTML = `[${timeString}] <span class="${typeClass}">${message}</span>`;
            logElement.appendChild(entryDiv);
            
            // Auto-scroll to bottom
            logElement.scrollTop = logElement.scrollHeight;
        }
        
        // Save logs to session storage
        this.saveLogs();
        
        // Also log to console for browser developer tools
        console.log(`[${timestamp}] ${message}`);
    },
    
    // Save logs to session storage
    saveLogs: function() {
        try {
            // Only store last 100 logs to save space
            const logsToSave = this.logs.slice(-100);
            sessionStorage.setItem('diagnosticLogs', JSON.stringify(logsToSave));
        } catch (error) {
            console.warn('Failed to save logs to session storage:', error);
        }
    },
    
    // Load saved logs from session storage
    loadSavedLogs: function() {
        try {
            const savedLogs = sessionStorage.getItem('diagnosticLogs');
            if (savedLogs) {
                const parsedLogs = JSON.parse(savedLogs);
                this.logs = parsedLogs;
                
                // Add saved logs to the display
                const logElement = document.getElementById('debug-log');
                if (logElement) {
                    parsedLogs.forEach(entry => {
                        const entryDiv = document.createElement('div');
                        entryDiv.className = 'log-entry';
                        
                        // Format timestamp
                        const timeString = entry.timestamp.split('T')[1].substring(0, 8);
                        
                        // Determine type class
                        let typeClass = '';
                        switch (entry.type) {
                            case 'error':
                                typeClass = 'status-error';
                                break;
                            case 'warning':
                                typeClass = 'status-warning';
                                break;
                            case 'success':
                                typeClass = 'status-ok';
                                break;
                            default:
                                typeClass = '';
                        }
                        
                        entryDiv.innerHTML = `[${timeString}] <span class="${typeClass}">${entry.message}</span>`;
                        logElement.appendChild(entryDiv);
                    });
                    
                    logElement.scrollTop = logElement.scrollHeight;
                }
                
                this.addLogEntry('Loaded ' + parsedLogs.length + ' saved log entries');
            }
        } catch (error) {
            console.warn('Failed to load saved logs:', error);
        }
    },
    
    // Clear logs
    clearLogs: function() {
        this.logs = [];
        
        // Clear log display
        const logElement = document.getElementById('debug-log');
        if (logElement) {
            logElement.innerHTML = '';
        }
        
        // Clear saved logs
        sessionStorage.removeItem('diagnosticLogs');
        
        this.addLogEntry('Logs cleared');
    },
    
    // Check environment
    checkEnvironment: function() {
        this.addLogEntry('Checking environment...', 'info');
        
        // Browser capabilities
        const crypto = window.crypto && window.crypto.subtle;
        this.addLogEntry(`Web Crypto API: ${crypto ? 'Available' : 'Not available'}`, 
                         crypto ? 'success' : 'error');
        
        this.addLogEntry(`LocalStorage: ${typeof localStorage !== 'undefined' ? 'Available' : 'Not available'}`,
                         typeof localStorage !== 'undefined' ? 'success' : 'error');
        
        this.addLogEntry(`SessionStorage: ${typeof sessionStorage !== 'undefined' ? 'Available' : 'Not available'}`,
                         typeof sessionStorage !== 'undefined' ? 'success' : 'error');
        
        this.addLogEntry(`Online Status: ${navigator.onLine ? 'Online' : 'Offline'}`, 
                         navigator.onLine ? 'success' : 'warning');
        
        // Required Google APIs
        const gapiLoaded = typeof gapi !== 'undefined';
        this.addLogEntry(`Google API (gapi): ${gapiLoaded ? 'Loaded' : 'Not loaded'}`,
                         gapiLoaded ? 'success' : 'error');
        
        if (gapiLoaded) {
            this.addLogEntry(`- gapi.client: ${typeof gapi.client !== 'undefined' ? 'Available' : 'Not available'}`,
                             typeof gapi.client !== 'undefined' ? 'success' : 'error');
            
            this.addLogEntry(`- gapi.load: ${typeof gapi.load === 'function' ? 'Available' : 'Not available'}`,
                             typeof gapi.load === 'function' ? 'success' : 'error');
        }
        
        const gisLoaded = typeof google !== 'undefined' && 
                         typeof google.accounts !== 'undefined' && 
                         typeof google.accounts.oauth2 !== 'undefined';
        
        this.addLogEntry(`Google Identity Services: ${gisLoaded ? 'Loaded' : 'Not loaded'}`,
                         gisLoaded ? 'success' : 'error');
        
        // Check application scripts
        this.addLogEntry(`CONFIG: ${typeof CONFIG !== 'undefined' ? 'Loaded' : 'Not loaded'}`,
                         typeof CONFIG !== 'undefined' ? 'success' : 'error');
        
        if (typeof CONFIG !== 'undefined') {
            try {
                // Just check if the getters work without logging the actual values
                const clientIdValid = CONFIG.CLIENT_ID && 
                                      CONFIG.CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' && 
                                      CONFIG.CLIENT_ID !== 'MISSING_CREDENTIAL';
                
                const apiKeyValid = CONFIG.API_KEY && 
                                   CONFIG.API_KEY !== 'YOUR_GOOGLE_API_KEY' && 
                                   CONFIG.API_KEY !== 'MISSING_CREDENTIAL';
                
                this.addLogEntry(`- CLIENT_ID: ${clientIdValid ? 'Valid' : 'Invalid or missing'}`,
                                 clientIdValid ? 'success' : 'error');
                
                this.addLogEntry(`- API_KEY: ${apiKeyValid ? 'Valid' : 'Invalid or missing'}`,
                                 apiKeyValid ? 'success' : 'error');
                
                this.addLogEntry(`- VERSION: ${CONFIG.VERSION || 'Not set'}`);
            } catch (error) {
                this.addLogEntry(`Error accessing CONFIG: ${error.message}`, 'error');
            }
        }
        
        this.addLogEntry(`StorageService: ${typeof StorageService !== 'undefined' ? 'Loaded' : 'Not loaded'}`,
                         typeof StorageService !== 'undefined' ? 'success' : 'error');
        
        this.addLogEntry(`ContactsService: ${typeof ContactsService !== 'undefined' ? 'Loaded' : 'Not loaded'}`,
                         typeof ContactsService !== 'undefined' ? 'success' : 'error');
        
        // Storage analysis
        if (typeof localStorage !== 'undefined') {
            let contactsCount = 0;
            let syncCount = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('contacts_')) {
                    contactsCount++;
                } else if (key.startsWith('last_sync_')) {
                    syncCount++;
                }
            }
            
            this.addLogEntry(`Local Storage Analysis: ${localStorage.length} total items`);
            this.addLogEntry(`- Contact datasets: ${contactsCount}`);
            this.addLogEntry(`- Sync records: ${syncCount}`);
            
            // Calculate storage usage
            let totalBytes = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                totalBytes += key.length + localStorage.getItem(key).length;
            }
            
            const usageKb = (totalBytes / 1024).toFixed(2);
            const usageMb = (totalBytes / (1024 * 1024)).toFixed(2);
            
            this.addLogEntry(`- Total storage usage: ${usageKb} KB (${usageMb} MB)`);
            
            // Check if approaching storage limits
            const estimatedLimit = 5 * 1024 * 1024; // 5MB is a common limit
            const usagePercent = ((totalBytes / estimatedLimit) * 100).toFixed(1);
            
            if (totalBytes > estimatedLimit * 0.8) {
                this.addLogEntry(`- Storage usage: ${usagePercent}% of 5MB limit (HIGH)`, 'warning');
            } else {
                this.addLogEntry(`- Storage usage: ${usagePercent}% of 5MB limit`, 'info');
            }
        }
        
        this.addLogEntry('Environment check completed', 'success');
    },
    
    // Test Web Crypto functionality
    testCrypto: async function() {
        this.addLogEntry('Testing Web Crypto API...', 'info');
        
        try {
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API not available in this browser');
            }
            
            // Test key generation
            this.addLogEntry('Generating test encryption key...', 'info');
            
            const testData = new TextEncoder().encode('Test data for encryption');
            const salt = 'test-salt';
            
            const keyMaterial = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode('test-user-id' + salt)
            );
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyMaterial,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
            
            this.addLogEntry('Key generation successful', 'success');
            
            // Test encryption
            this.addLogEntry('Testing encryption...', 'info');
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                testData
            );
            
            this.addLogEntry(`Encryption successful (${encryptedData.byteLength} bytes)`, 'success');
            
            // Test decryption
            this.addLogEntry('Testing decryption...', 'info');
            
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                encryptedData
            );
            
            const decryptedText = new TextDecoder().decode(decryptedData);
            
            if (decryptedText === 'Test data for encryption') {
                this.addLogEntry('Decryption successful - data matches original', 'success');
                return true;
            } else {
                this.addLogEntry('Decryption failed - data does not match original', 'error');
                return false;
            }
        } catch (error) {
            this.addLogEntry(`Crypto test failed: ${error.message}`, 'error');
            return false;
        }
    },
    
    // Test StorageService functionality
    testStorageService: async function() {
        this.addLogEntry('Testing StorageService...', 'info');
        
        if (typeof StorageService === 'undefined') {
            this.addLogEntry('StorageService not available', 'error');
            return false;
        }
        
        try {
            // Initialize with test user ID
            const testUserId = 'test-user-' + Date.now();
            this.addLogEntry(`Initializing StorageService with test ID: ${testUserId}`, 'info');
            
            await StorageService.init(testUserId);
            this.addLogEntry('StorageService initialized', 'success');
            
            // Test encryption/decryption
            const testData = {
                name: 'Test Contact',
                email: 'test@example.com',
                phone: '123-456-7890',
                timestamp: Date.now()
            };
            
            this.addLogEntry('Testing encryption...', 'info');
            const encrypted = await StorageService.encrypt(testData);
            
            if (!encrypted || encrypted.length < 10) {
                throw new Error('Encryption produced invalid output');
            }
            
            this.addLogEntry(`Encryption successful (${encrypted.length} characters)`, 'success');
            
            // Test decryption
            this.addLogEntry('Testing decryption...', 'info');
            const decrypted = await StorageService.decrypt(encrypted);
            
            if (JSON.stringify(decrypted) === JSON.stringify(testData)) {
                this.addLogEntry('Decryption successful - data matches original', 'success');
            } else {
                throw new Error('Decrypted data does not match original');
            }
            
            // Test storage/retrieval
            this.addLogEntry('Testing contact storage...', 'info');
            
            const testContacts = [
                { resourceName: 'test1', names: [{ displayName: 'Test Contact 1' }] },
                { resourceName: 'test2', names: [{ displayName: 'Test Contact 2' }] }
            ];
            
            await StorageService.saveContacts(testContacts, testUserId);
            this.addLogEntry('Contacts saved to storage', 'success');
            
            // Test loading
            this.addLogEntry('Testing contact retrieval...', 'info');
            const loadedContacts = await StorageService.loadContacts(testUserId);
            
            if (loadedContacts && loadedContacts.length === 2) {
                this.addLogEntry(`Retrieved ${loadedContacts.length} contacts successfully`, 'success');
            } else {
                throw new Error('Failed to retrieve contacts correctly');
            }
            
            // Test last sync time
            this.addLogEntry('Testing sync time functions...', 'info');
            const syncTime = StorageService.getLastSyncTime(testUserId);
            
            if (syncTime) {
                this.addLogEntry(`Last sync time retrieved: ${new Date(syncTime).toISOString()}`, 'success');
            } else {
                throw new Error('Failed to retrieve sync time');
            }
            
            // Clean up test data
            this.addLogEntry('Cleaning up test data...', 'info');
            StorageService.clearUserData(testUserId);
            
            const verifyCleared = await StorageService.loadContacts(testUserId);
            if (!verifyCleared) {
                this.addLogEntry('Test data cleaned up successfully', 'success');
            } else {
                throw new Error('Failed to clean up test data');
            }
            
            return true;
        } catch (error) {
            this.addLogEntry(`StorageService test failed: ${error.message}`, 'error');
            return false;
        }
    },
    
    // Test Google API availability and initialization
    testGoogleAPIs: async function() {
        this.addLogEntry('Testing Google APIs...', 'info');
        
        // Check GAPI
        if (typeof gapi === 'undefined') {
            this.addLogEntry('Google API (gapi) not loaded', 'error');
            return false;
        }
        
        try {
            // Test gapi.load functionality
            this.addLogEntry('Testing gapi.load...', 'info');
            
            const loadClient = () => {
                return new Promise((resolve, reject) => {
                    gapi.load('client', {
                        callback: resolve,
                        onerror: reject,
                        timeout: 5000,
                        ontimeout: () => reject(new Error('Timeout loading gapi.client'))
                    });
                });
            };
            
            try {
                await loadClient();
                this.addLogEntry('Successfully loaded gapi.client', 'success');
            } catch (loadError) {
                throw new Error(`Failed to load gapi.client: ${loadError.message}`);
            }
            
            // Test client initialization (without actual API key to avoid revealing in logs)
            this.addLogEntry('Testing client initialization...', 'info');
            
            if (typeof CONFIG === 'undefined' || !CONFIG.DISCOVERY_DOC) {
                throw new Error('CONFIG or DISCOVERY_DOC not available');
            }
            
            if (typeof gapi.client.init !== 'function') {
                throw new Error('gapi.client.init is not a function');
            }
            
            this.addLogEntry('GAPI client available for initialization', 'success');
            
            // Check GIS availability (without testing actual auth)
            if (typeof google === 'undefined' || 
                typeof google.accounts === 'undefined' || 
                typeof google.accounts.oauth2 === 'undefined') {
                throw new Error('Google Identity Services not fully loaded');
            }
            
            if (typeof google.accounts.oauth2.initTokenClient !== 'function') {
                throw new Error('google.accounts.oauth2.initTokenClient is not a function');
            }
            
            this.addLogEntry('Google Identity Services available for authentication', 'success');
            
            this.addLogEntry('Google APIs test completed successfully', 'success');
            return true;
        } catch (error) {
            this.addLogEntry(`Google APIs test failed: ${error.message}`, 'error');
            return false;
        }
    },
    
    // Inspect all localStorage data
    inspectLocalStorage: function() {
        this.addLogEntry('Inspecting localStorage contents...', 'info');
        
        try {
            if (typeof localStorage === 'undefined') {
                throw new Error('localStorage is not available in this browser');
            }
            
            const itemCount = localStorage.length;
            if (itemCount === 0) {
                this.addLogEntry('localStorage is empty', 'info');
                return [];
            }
            
            const items = [];
            let totalSize = 0;
            
            this.addLogEntry(`Found ${itemCount} items in localStorage`, 'info');
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = (key.length + value.length) * 2; // Rough estimate of UTF-16 encoding size
                totalSize += size;
                
                // Determine if it's likely encrypted data
                let valueType = 'text';
                if (value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value)) {
                    valueType = 'encrypted';
                } else if (value.startsWith('{') && value.endsWith('}')) {
                    try {
                        JSON.parse(value);
                        valueType = 'json';
                    } catch (e) {
                        // Not valid JSON
                    }
                }
                
                // Create item info (without revealing actual data)
                const item = {
                    key: key,
                    type: valueType,
                    length: value.length,
                    size: size,
                    preview: valueType === 'encrypted' ? 
                        `[ENCRYPTED DATA] (${value.length} chars)` :
                        (value.length > 50 ? value.substring(0, 47) + '...' : value)
                };
                
                items.push(item);
                
                // Log basic info without revealing data
                this.addLogEntry(`Item ${i + 1}: Key "${key}", Type: ${valueType}, Size: ${(size / 1024).toFixed(2)} KB`);
            }
            
            this.addLogEntry(`Total localStorage size: ${(totalSize / 1024).toFixed(2)} KB`, 'info');
            
            return items;
        } catch (error) {
            this.addLogEntry(`Error inspecting localStorage: ${error.message}`, 'error');
            return [];
        }
    },
    
    // Clear all localStorage data
    clearLocalStorage: function() {
        this.addLogEntry('Clearing all localStorage data...', 'warning');
        
        try {
            const itemCount = localStorage.length;
            localStorage.clear();
            this.addLogEntry(`Cleared ${itemCount} items from localStorage`, 'success');
            return true;
        } catch (error) {
            this.addLogEntry(`Error clearing localStorage: ${error.message}`, 'error');
            return false;
        }
    },
    
    // Generate summary report of app status
    generateReport: function() {
        this.addLogEntry('Generating diagnostic report...', 'info');
        
        const report = {
            timestamp: new Date().toISOString(),
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                onLine: navigator.onLine,
                cookiesEnabled: navigator.cookieEnabled
            },
            features: {
                localStorage: typeof localStorage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                webCrypto: Boolean(window.crypto && window.crypto.subtle),
                indexedDB: typeof indexedDB !== 'undefined'
            },
            libraries: {
                gapi: typeof gapi !== 'undefined',
                gapiClient: typeof gapi !== 'undefined' && typeof gapi.client !== 'undefined',
                googleAuth: typeof google !== 'undefined' && typeof google.accounts !== 'undefined'
            },
            app: {
                config: typeof CONFIG !== 'undefined',
                storageService: typeof StorageService !== 'undefined',
                contactsService: typeof ContactsService !== 'undefined'
            },
            storage: {
                totalItems: localStorage ? localStorage.length : 0
            }
        };
        
        if (typeof localStorage !== 'undefined') {
            let contactsCount = 0;
            let syncCount = 0;
            let totalSize = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                totalSize += (key.length + value.length) * 2; // Rough estimate
                
                if (key.startsWith('contacts_')) {
                    contactsCount++;
                } else if (key.startsWith('last_sync_')) {
                    syncCount++;
                }
            }
            
            report.storage.contactDatasets = contactsCount;
            report.storage.syncRecords = syncCount;
            report.storage.sizeInKB = (totalSize / 1024).toFixed(2);
            report.storage.percentUsed = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);
        }
        
        this.addLogEntry('Diagnostic report generated', 'success');
        return report;
    }
};

// Initialize DiagnosticTool when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for the diagnostic page
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Hide all tabs and deactivate buttons
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab and activate button
            document.getElementById(`${tabId}-tab`).classList.add('active');
            this.classList.add('active');
        });
    });
    
    // Runtime test buttons
    document.getElementById('test-crypto-btn').addEventListener('click', async function() {
        const resultEl = document.getElementById('test-results');
        resultEl.innerHTML = '<p>Running Web Crypto API test...</p>';
        
        const success = await DiagnosticTool.testCrypto();
        
        resultEl.innerHTML = success 
            ? '<p class="test-success">✓ Web Crypto API test passed!</p>'
            : '<p class="test-failure">✗ Web Crypto API test failed. Check logs for details.</p>';
    });
    
    document.getElementById('test-gapi-btn').addEventListener('click', async function() {
        const resultEl = document.getElementById('test-results');
        resultEl.innerHTML = '<p>Running Google API test...</p>';
        
        const success = await DiagnosticTool.testGoogleAPIs();
        
        resultEl.innerHTML = success 
            ? '<p class="test-success">✓ Google API test passed!</p>'
            : '<p class="test-failure">✗ Google API test failed. Check logs for details.</p>';
    });
    
    document.getElementById('test-storage-btn').addEventListener('click', async function() {
        const resultEl = document.getElementById('test-results');
        resultEl.innerHTML = '<p>Running Storage test...</p>';
        
        const success = await DiagnosticTool.testStorageService();
        
        resultEl.innerHTML = success 
            ? '<p class="test-success">✓ Storage test passed!</p>'
            : '<p class="test-failure">✗ Storage test failed. Check logs for details.</p>';
    });
    
    document.getElementById('test-gis-btn').addEventListener('click', function() {
        const resultEl = document.getElementById('test-results');
        
        const gisAvailable = typeof google !== 'undefined' && 
                           typeof google.accounts !== 'undefined' && 
                           typeof google.accounts.oauth2 !== 'undefined';
        
        if (gisAvailable) {
            resultEl.innerHTML = '<p class="test-success">✓ Google Identity Services are available</p>';
        } else {
            resultEl.innerHTML = '<p class="test-failure">✗ Google Identity Services are not properly loaded</p>';
        }
    });
    
    // Storage inspection tools
    document.getElementById('inspect-storage-btn').addEventListener('click', function() {
        DiagnosticTool.inspectLocalStorage();
        
        const storageDetails = document.getElementById('storage-details');
        
        // Create formatted display of storage items
        if (localStorage.length === 0) {
            storageDetails.textContent = 'Local storage is empty';
            storageDetails.style.display = 'block';
            return;
        }
        
        let content = '';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            let value = localStorage.getItem(key);
            
            // Mask sensitive data
            let displayValue = value;
            if (value.length > 30 && /^[A-Za-z0-9+/=]+$/.test(value)) {
                displayValue = `[ENCRYPTED DATA] (${value.length} characters)`;
            } else if (value.length > 100) {
                displayValue = value.substring(0, 100) + '... (truncated)';
            }
            
            content += `Key: ${key}\nType: ${key.startsWith('contacts_') ? 'Contacts Data' : 
                                            key.startsWith('last_sync_') ? 'Sync Timestamp' : 'Other'}\n`;
            content += `Size: ${(key.length + value.length) / 1024}KB\n`;
            content += `Value: ${displayValue}\n\n`;
        }
        
        storageDetails.textContent = content;
        storageDetails.style.display = 'block';
    });
    
    document.getElementById('clear-storage-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear ALL localStorage data? This will remove all saved contacts!')) {
            DiagnosticTool.clearLocalStorage();
            
            // Update storage info
            const storageDetails = document.getElementById('storage-details');
            storageDetails.textContent = 'Local storage is empty';
            storageDetails.style.display = 'block';
            
            // Update counts in storage tab
            document.getElementById('storage-info').innerHTML = `
                <p>Contact datasets found: 0</p>
                <p>Sync records found: 0</p>
                <p>Total localStorage usage: 0 KB</p>
                <p>Total localStorage items: 0</p>
            `;
        }
    });
    
    // Log management
    document.getElementById('clear-logs-btn').addEventListener('click', function() {
        DiagnosticTool.clearLogs();
    });
    
    document.getElementById('test-log-btn').addEventListener('click', function() {
        DiagnosticTool.addLogEntry(`Test log entry created at ${new Date().toISOString()}`, 'info');
    });
    
    // Initialize DiagnosticTool
    DiagnosticTool.init();
});
