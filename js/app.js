// Google Contacts Viewer App
// Main application logic

// Main app controller
const GoogleContactsApp = {
    // App state
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false,
        contacts: [],
        userId: null,
        isSyncing: false,
        isInitialized: false,
        syncMaxPages: 50, // Safety limit for pagination
        syncTimeoutMs: 60000 // 1 minute timeout for sync operations
    },

    // DOM elements
    elements: {},

    // Initialize the application
    init: function() {
        console.log('Initializing Google Contacts App');
        
        // Ensure all required dependencies are loaded
        if (!this.checkDependencies()) {
            // Set a retry mechanism if libraries aren't loaded yet
            setTimeout(() => this.init(), 500);
            return;
        }
        
        // Initialize DOM element references to prevent null reference errors
        this.initDomElements();
        
        this.setupEventListeners();
        this.loadGapiClient();
        this.loadGisClient();
        this.showDebugInfo();
        
        // Mark app as initialized
        this.state.isInitialized = true;
    },
    
    // Check if required dependencies are loaded
    checkDependencies: function() {
        // Check for gapi and google identity services
        if (typeof gapi === 'undefined') {
            console.warn('Google API client not loaded yet');
            return false;
        }
        
        if (typeof google === 'undefined' || typeof google.accounts === 'undefined' || 
            typeof google.accounts.oauth2 === 'undefined') {
            console.warn('Google Identity Services not loaded yet');
            return false;
        }
        
        // Check for CONFIG
        if (typeof CONFIG === 'undefined') {
            console.error('CONFIG object not defined. Please check config.js');
            this.showFatalError('Configuration error: CONFIG object not found');
            return false;
        }
        
        // Check for services
        if (typeof StorageService === 'undefined' || typeof ContactsService === 'undefined') {
            console.error('Required services not loaded');
            this.showFatalError('Required JavaScript files not loaded. Please check the console.');
            return false;
        }
        
        return true;
    },
    
    // Initialize all DOM element references
    initDomElements: function() {
        // Get all UI element references
        this.elements = {
            signinButton: document.getElementById('signin-button'),
            signoutButton: document.getElementById('signout-button'),
            syncButton: document.getElementById('sync-button'),
            authStatus: document.getElementById('auth-status'),
            userInfo: document.getElementById('user-info'),
            contactsCard: document.getElementById('contacts-card'),
            contactsContainer: document.getElementById('contacts-container'),
            userName: document.getElementById('user-name'),
            loader: document.getElementById('loader'),
            searchInput: document.getElementById('search-input'),
            syncStatus: document.getElementById('sync-status'),
            contactCount: document.getElementById('contact-count'),
            lastSyncTime: document.getElementById('last-sync-time'),
            debugInfo: document.getElementById('debug-info'),
            errorContainer: document.getElementById('error-container')
        };
    },

    // Show fatal error that prevents app from working
    showFatalError: function(message) {
        console.error('FATAL ERROR:', message);
        
        // Create error element if it doesn't exist
        if (!this.elements.errorContainer) {
            const errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'fatal-error-message';
            document.body.insertBefore(errorContainer, document.body.firstChild);
            this.elements.errorContainer = errorContainer;
        }
        
        this.elements.errorContainer.innerHTML = `
            <h2>Critical Error</h2>
            <p>${this.sanitizeHTML(message)}</p>
            <p>Please try reloading the page. If the problem persists, contact support.</p>
            <button onclick="location.reload()">Reload Page</button>
        `;
        this.elements.errorContainer.style.display = 'block';
    },

    // Set up event listeners
    setupEventListeners: function() {
        // Add event listeners only if elements exist
        if (this.elements.signinButton) {
            this.elements.signinButton.addEventListener('click', this.handleAuthClick.bind(this));
        }
        
        if (this.elements.signoutButton) {
            this.elements.signoutButton.addEventListener('click', this.handleSignoutClick.bind(this));
        }
        
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        // Add sync button listener
        if (this.elements.syncButton) {
            this.elements.syncButton.addEventListener('click', this.handleSyncClick.bind(this));
        }
        
        // Add window offline/online listeners
        window.addEventListener('online', () => {
            console.log('Application is online');
            if (this.elements.syncStatus) {
                this.elements.syncStatus.textContent = 'Connection restored. Ready to sync.';
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('Application is offline');
            if (this.elements.syncStatus) {
                this.elements.syncStatus.textContent = 'Offline mode. Using cached contacts.';
            }
        });
        
        // Handle browser storage errors
        window.addEventListener('error', (event) => {
            // Check if the error is related to quota exceeded (storage full)
            if (event.message && (
                event.message.includes('QuotaExceededError') || 
                event.message.includes('quota_exceeded') ||
                event.message.includes('localStorage is not available')
            )) {
                this.showError('Storage limit exceeded. Please clear browser data or use private browsing mode.');
            }
        });
    },

    // Load the Google API client
    loadGapiClient: function() {
        console.log('Loading GAPI client...');
        gapi.load('client', this.initializeGapiClient.bind(this));
    },

    // Initialize the Google API client
    initializeGapiClient: async function() {
        console.log('Initializing GAPI client...');
        try {
            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: [CONFIG.DISCOVERY_DOC],
            });
            this.state.gapiInited = true;
            console.log('GAPI client initialized successfully');
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Failed to initialize Google API client:', error);
            this.showError('Failed to initialize Google API client: ' + error.message);
        }
    },

    // Load the Google Identity Services client
    loadGisClient: function() {
        console.log('Loading GIS client...');
        if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
            console.error('Invalid CLIENT_ID. Please check your configuration.');
            this.showError('Invalid CLIENT_ID configuration. Please check the console for details.');
            return;
        }
        
        try {
            // Define callback immediately to avoid race conditions
            const tokenCallback = (resp) => {
                if (resp.error !== undefined) {
                    // Handle specific errors
                    if (resp.error === 'popup_closed_by_user') {
                        this.showError('Sign in was cancelled. Please try again.');
                    } else {
                        this.showError('Authentication error: ' + resp.error);
                    }
                    return;
                }
                
                this.onSuccessfulAuth();
            };
            
            this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: tokenCallback,
                error_callback: (err) => {
                    this.showError('Authentication initialization error: ' + err.type);
                }
            });
            
            this.state.gisInited = true;
            console.log('GIS client initialized successfully');
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Failed to initialize Google Identity Services client:', error);
            this.showError('Failed to initialize Google Identity Services: ' + error.message);
        }
    },

    // Enable buttons when both clients are loaded
    maybeEnableButtons: function() {
        console.log('Checking if button should be enabled - GAPI:', this.state.gapiInited, 'GIS:', this.state.gisInited);
        if (this.state.gapiInited && this.state.gisInited) {
            console.log('Enabling signin button');
            if (this.elements.signinButton) {
                this.elements.signinButton.disabled = false;
            }
        }
    },

    // Show debug information
    showDebugInfo: function() {
        // Make sure the debug info element exists
        if (this.elements.debugInfo) {
            let debugContent = '';
            
            // Check for empty/default credentials
            if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
                debugContent += '<p class="error-message">CLIENT_ID is missing or using default value.</p>';
            }
            
            if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_GOOGLE_API_KEY') {
                debugContent += '<p class="error-message">API_KEY is missing or using default value.</p>';
            }
            
            // Add build version info
            if (CONFIG.VERSION) {
                debugContent += `<p>Build version: ${CONFIG.VERSION}</p>`;
            }
            
            if (debugContent) {
                this.elements.debugInfo.innerHTML = debugContent;
                this.elements.debugInfo.style.display = 'block';
            }
        }
    },

    // Handle successful authentication
    onSuccessfulAuth: async function() {
        // Hide auth card, show user info and contacts card
        if (this.elements.authStatus) {
            this.elements.authStatus.style.display = 'none';
        }
        
        if (this.elements.userInfo) {
            this.elements.userInfo.style.display = 'block';
        }
        
        if (this.elements.contactsCard) {
            this.elements.contactsCard.style.display = 'block';
        }
        
        await this.initializeUserSession();
    },

    // Handle authentication click
    handleAuthClick: function() {
        // Check for token first
        const hasToken = gapi.client.getToken() !== null;
        
        // Request access token with appropriate prompt
        this.state.tokenClient.requestAccessToken({
            prompt: hasToken ? '' : 'consent'
        });
    },

    // Initialize user session after successful auth
    initializeUserSession: async function() {
        try {
            if (this.elements.loader) {
                this.elements.loader.style.display = 'block';
            }
            
            // Get user info and display user name
            await this.getUserInfo();
            
            // Get user ID for storage
            this.state.userId = await ContactsService.getUserId();
            console.log('User ID:', this.state.userId);
            
            // Initialize storage service
            try {
                await StorageService.init(this.state.userId);
            } catch (error) {
                console.error('Error initializing storage service:', error);
                this.showError('Browser encryption is not supported. Please use a modern browser.');
                return;
            }
            
            // Check if we have contacts in storage and whether we need to sync
            let storedContacts = null;
            try {
                storedContacts = await StorageService.loadContacts(this.state.userId);
            } catch (error) {
                console.error('Error loading contacts from storage:', error);
                // Continue to sync as fallback
            }
            
            const needsSync = !storedContacts || StorageService.needsSync(this.state.userId);
            
            if (storedContacts && !needsSync) {
                // We have contacts and don't need to sync
                console.log(`Using ${storedContacts.length} contacts from local storage`);
                this.state.contacts = storedContacts;
                this.renderContacts(storedContacts);
                this.updateSyncStatus();
            } else {
                // Need to sync - check if we're online
                if (navigator.onLine) {
                    console.log('Initiating contact sync...');
                    await this.syncContacts();
                } else {
                    console.log('Offline - using cached contacts if available');
                    if (storedContacts) {
                        this.state.contacts = storedContacts;
                        this.renderContacts(storedContacts);
                        this.updateSyncStatus('Offline mode. Using cached contacts.');
                    } else {
                        this.showError('You are offline and no cached contacts are available.');
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing user session:', error);
            this.showError('Error initializing user session: ' + error.message);
        } finally {
            if (this.elements.loader) {
                this.elements.loader.style.display = 'none';
            }
        }
    },

    // Handle sign-out click
    handleSignoutClick: function() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked successfully');
            });
            gapi.client.setToken('');
            this.resetAppState();
        }
    },
    
    // Reset app state after logout
    resetAppState: function() {
        if (this.elements.authStatus) {
            this.elements.authStatus.style.display = 'block';
        }
        
        if (this.elements.userInfo) {
            this.elements.userInfo.style.display = 'none';
        }
        
        if (this.elements.contactsCard) {
            this.elements.contactsCard.style.display = 'none';
        }
        
        if (this.elements.contactsContainer) {
            this.elements.contactsContainer.innerHTML = '';
        }
        
        // Clear state
        this.state.contacts = [];
        
        // Clear encrypted user data
        if (this.state.userId) {
            StorageService.clearUserData(this.state.userId);
            this.state.userId = null;
        }
    },

    // Handle sync button click
    handleSyncClick: async function() {
        if (this.state.isSyncing) {
            return; // Prevent multiple syncs at once
        }
        
        // Check if online
        if (!navigator.onLine) {
            this.showError('Cannot sync while offline. Please check your internet connection.');
            return;
        }
        
        try {
            await this.syncContacts();
        } catch (error) {
            console.error('Error during manual sync:', error);
            this.showError('Error during contact sync: ' + error.message);
        }
    },

    // Sync contacts with Google
    syncContacts: async function() {
        if (this.state.isSyncing) {
            return; // Prevent multiple syncs at once
        }
        
        this.state.isSyncing = true;
        
        if (this.elements.loader) {
            this.elements.loader.style.display = 'block';
        }
        
        if (this.elements.syncStatus) {
            this.elements.syncStatus.textContent = 'Syncing contacts...';
        }
        
        // Setup sync timeout - abort if it takes too long
        const syncTimeout = setTimeout(() => {
            if (this.state.isSyncing) {
                this.state.isSyncing = false;
                if (this.elements.loader) {
                    this.elements.loader.style.display = 'none';
                }
                this.showError('Sync operation timed out. Please try again later.');
                console.error('Sync operation timed out after', this.state.syncTimeoutMs / 1000, 'seconds');
            }
        }, this.state.syncTimeoutMs);
        
        try {
            // Fetch all contacts using pagination
            const updateProgress = (message) => {
                if (this.elements.syncStatus) {
                    this.elements.syncStatus.textContent = message;
                }
            };
            
            const allContacts = await ContactsService.fetchAllContacts(
                updateProgress, 
                this.state.syncMaxPages
            );
            
            // Clear timeout since sync completed successfully
            clearTimeout(syncTimeout);
            
            // Process contacts for storage
            const processedContacts = ContactsService.processContacts(allContacts);
            
            // Verify we have contacts before saving
            if (!processedContacts || processedContacts.length === 0) {
                this.showError('No contacts found in your Google account.');
                this.state.isSyncing = false;
                if (this.elements.loader) {
                    this.elements.loader.style.display = 'none';
                }
                return;
            }
            
            // Save to local encrypted storage
            try {
                await StorageService.saveContacts(processedContacts, this.state.userId);
            } catch (error) {
                // Handle storage errors (e.g., quota exceeded)
                console.error('Error saving contacts to storage:', error);
                if (error.name === 'QuotaExceededError' || 
                    error.message.includes('storage full') || 
                    error.message.includes('quota')) {
                    this.showError('Storage limit exceeded. The app will work but contacts won\'t be saved offline.');
                } else {
                    throw error; // Re-throw other errors
                }
            }
            
            // Update state
            this.state.contacts = processedContacts;
            
            // Render contacts
            this.renderContacts(processedContacts);
            
            // Update UI with sync info
            this.updateSyncStatus();
            
            console.log(`Synced ${processedContacts.length} contacts`);
        } catch (error) {
            console.error('Error syncing contacts:', error);
            this.showError('Error syncing contacts: ' + error.message);
        } finally {
            clearTimeout(syncTimeout);
            this.state.isSyncing = false;
            if (this.elements.loader) {
                this.elements.loader.style.display = 'none';
            }
        }
    },

    // Update the sync status display
    updateSyncStatus: function(customMessage = null) {
        if (this.elements.syncStatus && this.elements.lastSyncTime && this.elements.contactCount) {
            const lastSync = StorageService.getLastSyncTime(this.state.userId);
            
            if (customMessage) {
                this.elements.syncStatus.textContent = customMessage;
            } else {
                this.elements.syncStatus.textContent = 'Contacts synced successfully';
            }
            
            if (lastSync) {
                const lastSyncDate = new Date(lastSync);
                this.elements.lastSyncTime.textContent = lastSyncDate.toLocaleString();
            } else {
                this.elements.lastSyncTime.textContent = 'Never';
            }
            
            this.elements.contactCount.textContent = this.state.contacts.length;
        }
    },

    // Get user profile information
    getUserInfo: async function() {
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses',
            });
            
            const person = response.result;
            const userName = person.names && person.names.length > 0 
                ? this.sanitizeHTML(person.names[0].displayName) : 'Unknown';
                
            if (this.elements.userName) {
                this.elements.userName.textContent = userName;
            }
        } catch (err) {
            this.showError('Error fetching user profile: ' + err.message);
        }
    },
    
    // Render contacts to DOM
    renderContacts: function(contacts) {
        if (!this.elements.contactsContainer) return;
        
        this.elements.contactsContainer.innerHTML = '';
        
        if (!contacts || contacts.length === 0) {
            this.elements.contactsContainer.innerHTML = '<p>No contacts found.</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        contacts.forEach((person) => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            
            // Name
            const name = person.names && person.names.length > 0
                ? this.sanitizeHTML(person.names[0].displayName) : 'Unknown';
            const nameElem = document.createElement('div');
            nameElem.className = 'contact-name';
            nameElem.textContent = name;
            contactDiv.appendChild(nameElem);
            
            // Email
            if (person.emailAddresses && person.emailAddresses.length > 0) {
                const emailElem = document.createElement('div');
                emailElem.className = 'contact-email';
                emailElem.textContent = this.sanitizeHTML(person.emailAddresses[0].value);
                contactDiv.appendChild(emailElem);
            }
            
            // Phone
            if (person.phoneNumbers && person.phoneNumbers.length > 0) {
                const phoneElem = document.createElement('div');
                phoneElem.className = 'contact-phone';
                phoneElem.textContent = this.sanitizeHTML(person.phoneNumbers[0].value);
                contactDiv.appendChild(phoneElem);
            }
            
            fragment.appendChild(contactDiv);
        });
        
        this.elements.contactsContainer.appendChild(fragment);
    },
    
    // Handle search functionality
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        if (!this.state.contacts.length) {
            return;
        }
        
        const filteredContacts = this.state.contacts.filter(person => {
            // Search by name
            const name = person.names && person.names.length > 0
                ? person.names[0].displayName.toLowerCase() : '';
                
            // Search by email
            const email = person.emailAddresses && person.emailAddresses.length > 0
                ? person.emailAddresses[0].value.toLowerCase() : '';
                
            // Search by phone
            const phone = person.phoneNumbers && person.phoneNumbers.length > 0
                ? person.phoneNumbers[0].value.toLowerCase() : '';
                
            return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
        });
        
        // Clear and re-render
        if (this.elements.contactsContainer) {
            this.elements.contactsContainer.innerHTML = '';
            
            if (filteredContacts.length === 0) {
                this.elements.contactsContainer.innerHTML = '<p>No matching contacts found.</p>';
            } else {
                this.renderContacts(filteredContacts);
            }
        }
    },
    
    // Show error message
    showError: function(message) {
        console.error(message);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Remove any existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(element => {
            // Only remove error messages that are children of contacts container
            if (element.parentNode === this.elements.contactsContainer) {
                element.remove();
            }
        });
        
        // Insert at the top of contacts container
        if (this.elements.contactsContainer) {
            if (this.elements.contactsContainer.firstChild) {
                this.elements.contactsContainer.insertBefore(errorDiv, this.elements.contactsContainer.firstChild);
            } else {
                this.elements.contactsContainer.appendChild(errorDiv);
            }
            
            // Auto-dismiss error after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode === this.elements.contactsContainer) {
                    errorDiv.style.opacity = '0';
                    setTimeout(() => {
                        if (errorDiv.parentNode === this.elements.contactsContainer) {
                            errorDiv.remove();
                        }
                    }, 1000);
                }
            }, 10000);
        }
    },
    
    // Security: Sanitize HTML to prevent XSS
    sanitizeHTML: function(text) {
        if (!text) return '';
        
        const element = document.createElement('div');
        element.textContent = text;
        return element.innerHTML;
    }
};

// Initialize the app after the page has fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    GoogleContactsApp.init();
});

// Add error handling for script loading
window.addEventListener('error', function(event) {
    // Check if error is from script loading
    if (event.target && event.target.tagName === 'SCRIPT') {
        console.error('Script loading error:', event.target.src);
        
        // Check if app is already initialized
        if (typeof GoogleContactsApp !== 'undefined' && !GoogleContactsApp.state.isInitialized) {
            // Create a basic error message if app isn't initialized yet
            const errorContainer = document.createElement('div');
            errorContainer.style.color = 'red';
            errorContainer.style.padding = '20px';
            errorContainer.style.margin = '20px';
            errorContainer.style.backgroundColor = '#fff0f0';
            errorContainer.style.border = '1px solid red';
            errorContainer.style.borderRadius = '5px';
            
            errorContainer.innerHTML = `
                <h2>Application Error</h2>
                <p>Failed to load required scripts: ${event.target.src}</p>
                <p>Please try reloading the page.</p>
                <button onclick="location.reload()">Reload Page</button>
            `;
            
            // Add to document body
            document.body.insertBefore(errorContainer, document.body.firstChild);
        }
    }
}, true);
