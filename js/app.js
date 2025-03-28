// Main application script for Google Contacts Viewer
const App = {
    // Application state
    state: {
        gapiInited: false,
        gisInited: false,
        isSignedIn: false,
        tokenClient: null,
        contacts: [],
        filteredContacts: [],
        userId: null,
        isLoading: false,
        isOffline: false
    },
    
    // Debug mode
    DEBUG_MODE: false,
    
    // Debug logging function
    debugLog: function(message, obj) {
        if (!this.DEBUG_MODE) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        const formattedMessage = `[DEBUG ${timestamp}] ${message}`;
        
        console.log(formattedMessage);
        
        if (obj) {
            console.log(obj);
        }
        
        // Also add to debug info element if available
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.style.display = 'block';
            const logLine = document.createElement('p');
            logLine.textContent = formattedMessage;
            debugInfo.appendChild(logLine);
        }
    },
    
    // Initialize the application
    init: function() {
        console.log('Initializing application...');
        this.debugLog('Initializing application...');
        
        // Set up event listeners
        document.getElementById('signin-button').addEventListener('click', this.handleAuthClick.bind(this));
        document.getElementById('signout-button').addEventListener('click', this.handleSignoutClick.bind(this));
        document.getElementById('sync-button').addEventListener('click', this.handleSyncClick.bind(this));
        document.getElementById('search-input').addEventListener('input', this.handleSearch.bind(this));
        
        // Hide the initial loader
        document.getElementById('initial-loader').style.display = 'none';
        
        // Initialize GAPI and GIS
        this.initializeGapiClient();
        this.loadGisClient();
        
        // Check if offline
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));
        this.updateOnlineStatus();
        
        // Set app version if available
        if (typeof CONFIG !== 'undefined' && CONFIG.VERSION) {
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = CONFIG.VERSION;
            }
        }
    },
    
    // Initialize the Google API client library
    initializeGapiClient: function() {
        this.debugLog('Initializing GAPI client...');
        
        if (typeof gapi === 'undefined') {
            console.error('GAPI not loaded');
            this.showError('Google API client not loaded. Please refresh the page and try again.');
            return;
        }
        
        gapi.load('client', async () => {
            try {
                // Check that CONFIG is available
                if (typeof CONFIG === 'undefined') {
                    this.showError('Configuration not loaded. Please refresh the page.');
                    return;
                }
                
                // Get API key using the getter, which handles decoding
                const apiKey = CONFIG.API_KEY;
                
                // Check that it's valid
                if (!apiKey || 
                    apiKey === 'YOUR_GOOGLE_API_KEY' || 
                    apiKey === 'MISSING_CREDENTIAL' || 
                    apiKey === 'INVALID_CREDENTIAL') {
                    this.showError('Invalid API key configuration. Please check your environment variables.');
                    return;
                }
                
                await gapi.client.init({
                    apiKey: apiKey,
                    discoveryDocs: [CONFIG.DISCOVERY_DOC],
                });
                
                this.state.gapiInited = true;
                this.debugLog('GAPI client initialized successfully');
                this.maybeEnableButtons();
            } catch (error) {
                console.error('Error initializing GAPI client:', error);
                this.showError('Failed to initialize Google API client: ' + error.message);
            }
        });
    },
    
    // Load the Google Identity Services client
    loadGisClient: function() {
        this.debugLog('Loading GIS client...');
        
        if (typeof google === 'undefined' || 
            !google.accounts || 
            !google.accounts.oauth2) {
            console.error('Google Identity Services not loaded');
            this.showError('Google Identity Services not loaded. Please refresh the page and try again.');
            return;
        }
        
        try {
            // Check that CONFIG is available
            if (typeof CONFIG === 'undefined') {
                this.showError('Configuration not loaded. Please refresh the page.');
                return;
            }
            
            // Get client ID using the getter, which handles decoding
            const clientId = CONFIG.CLIENT_ID;
            
            // Check that it's valid
            if (!clientId || 
                clientId === 'YOUR_GOOGLE_CLIENT_ID' || 
                clientId === 'MISSING_CREDENTIAL' || 
                clientId === 'INVALID_CREDENTIAL') {
                this.showError('Invalid client ID configuration. Please check your environment variables.');
                return;
            }
            
            this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: CONFIG.SCOPES,
                callback: (resp) => {
                    if (resp.error !== undefined) {
                        console.error('Token error:', resp.error);
                        if (resp.error === 'popup_closed_by_user') {
                            this.showError('Sign in was cancelled. Please try again.');
                        } else {
                            this.showError('Authentication error: ' + resp.error);
                        }
                        return;
                    }
                    
                    this.onSuccessfulAuth();
                }
            });
            
            this.state.gisInited = true;
            this.debugLog('GIS client initialized successfully');
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Error initializing GIS client:', error);
            this.showError('Failed to initialize authentication: ' + error.message);
        }
    },
    
    // Enable sign-in button if both APIs are initialized
    maybeEnableButtons: function() {
        const signInButton = document.getElementById('signin-button');
        
        if (this.state.gapiInited && this.state.gisInited) {
            this.debugLog('Both APIs initialized, enabling signin button');
            signInButton.disabled = false;
        } else {
            this.debugLog(`APIs not fully initialized yet (GAPI: ${this.state.gapiInited}, GIS: ${this.state.gisInited})`);
        }
    },
    
    // Handle sign-in button click
    handleAuthClick: function() {
        this.debugLog('Auth button clicked');
        
        if (!this.state.tokenClient) {
            this.showError('Authentication not initialized. Please refresh the page and try again.');
            return;
        }
        
        // Get a token
        this.state.tokenClient.requestAccessToken();
    },
    
    // Handle sign-out button click
    handleSignoutClick: function() {
        this.debugLog('Signout button clicked');
        
        if (this.state.isLoading) {
            this.showError('Please wait for current operation to complete.');
            return;
        }
        
        if (this.state.userId) {
            StorageService.clearUserData(this.state.userId);
        }
        
        // Clear contacts display
        this.state.contacts = [];
        this.state.filteredContacts = [];
        this.state.userId = null;
        this.updateContactsDisplay();
        
        // Reset UI
        document.getElementById('contacts-card').style.display = 'none';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('auth-status').style.display = 'block';
        
        // Sign out
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        
        this.state.isSignedIn = false;
    },
    
    // Handle sync button click
    handleSyncClick: function() {
        this.debugLog('Sync button clicked');
        
        if (this.state.isLoading) {
            this.showError('Already syncing contacts. Please wait.');
            return;
        }
        
        if (this.state.isOffline) {
            this.showError('You are offline. Sync will be available when you reconnect.');
            return;
        }
        
        this.syncContacts();
    },
    
    // Handle search input
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        if (searchTerm === '') {
            this.filteredContacts = this.state.contacts;
        } else {
            this.state.filteredContacts = this.state.contacts.filter(contact => {
                const name = contact.name.toLowerCase();
                const email = contact.email.toLowerCase();
                const phone = contact.phone.toLowerCase();
                
                return name.includes(searchTerm) || 
                      email.includes(searchTerm) || 
                      phone.includes(searchTerm);
            });
        }
        
        this.updateContactsDisplay();
    },
    
    // Process after successful authentication
    onSuccessfulAuth: async function() {
        this.debugLog('Authentication successful');
        
        try {
            // Show that we're signed in
            this.state.isSignedIn = true;
            document.getElementById('auth-status').style.display = 'none';
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('contacts-card').style.display = 'block';
            
            // Get user info
            this.setLoadingState(true, 'Getting user info...');
            
            // Get user ID for storage
            this.state.userId = await ContactsService.getUserId();
            this.debugLog('Retrieved user ID: ' + this.state.userId);
            
            // Initialize storage service with user ID
            await StorageService.init(this.state.userId);
            
            // Get basic profile
            const profile = await this.getUserProfile();
            if (profile) {
                document.getElementById('user-name').textContent = profile.name || 'Unknown';
            }
            
            // Try to load contacts from local storage first
            const storedContacts = await StorageService.loadContacts(this.state.userId);
            
            // Update last sync time display
            this.updateLastSyncTime();
            
            // If we have stored contacts and don't need to sync, show them
            if (storedContacts && !StorageService.needsSync(this.state.userId)) {
                this.debugLog(`Loaded ${storedContacts.length} contacts from storage`);
                
                // Process contacts for display
                this.processAndDisplayContacts(storedContacts);
                this.setLoadingState(false);
                
                // Update sync status
                document.getElementById('sync-status').textContent = 'Using locally stored contacts';
            } else {
                // Otherwise, fetch fresh contacts
                this.debugLog('No stored contacts or sync needed, fetching from API');
                document.getElementById('sync-status').textContent = 'Syncing contacts...';
                await this.syncContacts();
            }
        } catch (error) {
            console.error('Error after authentication:', error);
            this.showError('Error initializing app after sign-in: ' + error.message);
            this.setLoadingState(false);
        }
    },
    
    // Fetch user profile
    getUserProfile: async function() {
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses',
            });
            
            if (response.result && response.result.names && response.result.names.length > 0) {
                return {
                    name: response.result.names[0].displayName
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },
    
    // Sync contacts with Google
    syncContacts: async function() {
        if (this.state.isLoading) return;
        
        try {
            // Show syncing overlay
            document.getElementById('syncing-overlay').style.display = 'flex';
            this.setLoadingState(true, 'Starting contact sync...');
            
            // Fetch contacts from Google API with progress updates
            const syncProgress = (message) => {
                document.getElementById('sync-message').textContent = message;
                document.getElementById('sync-status').textContent = message;
            };
            
            const contacts = await ContactsService.fetchAllContacts(syncProgress);
            
            // Process and display contacts
            this.debugLog(`Synced ${contacts.length} contacts from Google`);
            
            // Process contacts to ensure consistent format and reduce size
            const processedContacts = ContactsService.processContacts(contacts);
            
            // Save to encrypted local storage
            syncProgress('Saving contacts to encrypted storage...');
            await StorageService.saveContacts(processedContacts, this.state.userId);
            
            // Process for display
            this.processAndDisplayContacts(processedContacts);
            
            // Update last sync time display
            this.updateLastSyncTime();
            
            // Update status
            document.getElementById('sync-status').textContent = 'Contacts synced successfully';
            
            this.setLoadingState(false);
            // Hide syncing overlay
            document.getElementById('syncing-overlay').style.display = 'none';
        } catch (error) {
            console.error('Error syncing contacts:', error);
            this.showError('Failed to sync contacts: ' + error.message);
            this.setLoadingState(false);
            document.getElementById('syncing-overlay').style.display = 'none';
        }
    },
    
    // Process contacts from API or storage and display them
    processAndDisplayContacts: function(contacts) {
        // Convert contacts to display format
        this.state.contacts = contacts.map(contact => 
            ContactsService.formatContactForDisplay(contact)
        );
        
        // Set filtered contacts to all contacts initially
        this.state.filteredContacts = this.state.contacts;
        
        // Update the contact count
        document.getElementById('contact-count').textContent = this.state.contacts.length;
        
        // Update the display
        this.updateContactsDisplay();
    },
    
    // Update the contacts display
    updateContactsDisplay: function() {
        const contactsContainer = document.getElementById('contacts-container');
        contactsContainer.innerHTML = '';
        
        // Show message if no contacts
        if (this.state.filteredContacts.length === 0) {
            if (this.state.contacts.length === 0) {
                contactsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No contacts found. Sync to retrieve your contacts.</p>
                    </div>
                `;
            } else {
                contactsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No contacts match your search.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Create HTML for each contact
        this.state.filteredContacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            
            contactElement.innerHTML = `
                <div class="contact-name">${this.escapeHtml(contact.name)}</div>
                ${contact.email ? `<div class="contact-email">${this.escapeHtml(contact.email)}</div>` : ''}
                ${contact.phone ? `<div class="contact-phone">${this.escapeHtml(contact.phone)}</div>` : ''}
            `;
            
            contactsContainer.appendChild(contactElement);
        });
    },
    
    // Update the last sync time display
    updateLastSyncTime: function() {
        const lastSync = StorageService.getLastSyncTime(this.state.userId);
        const lastSyncElement = document.getElementById('last-sync-time');
        
        if (lastSync) {
            const date = new Date(lastSync);
            lastSyncElement.textContent = date.toLocaleString();
        } else {
            lastSyncElement.textContent = 'Never';
        }
    },
    
    // Show error message
    showError: function(message) {
        console.error('App error:', message);
        
        const errorContainer = document.getElementById('error-container');
        errorContainer.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    },
    
    // Set loading state
    setLoadingState: function(isLoading, message) {
        this.state.isLoading = isLoading;
        const loader = document.getElementById('loader');
        
        if (isLoading) {
            loader.style.display = 'block';
            if (message) {
                document.getElementById('sync-status').textContent = message;
            }
        } else {
            loader.style.display = 'none';
        }
    },
    
    // Update online/offline status
    updateOnlineStatus: function() {
        this.state.isOffline = !navigator.onLine;
        const offlineIndicator = document.getElementById('offline-indicator');
        
        if (this.state.isOffline) {
            // Create offline indicator if it doesn't exist
            if (!offlineIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'offline-indicator';
                indicator.className = 'offline-indicator';
                indicator.textContent = 'You are offline';
                document.body.appendChild(indicator);
                
                // Make visible after a short delay for animation
                setTimeout(() => {
                    indicator.className = 'offline-indicator visible';
                }, 100);
            } else {
                offlineIndicator.className = 'offline-indicator visible';
            }
            
            // Disable sync button
            const syncButton = document.getElementById('sync-button');
            if (syncButton) {
                syncButton.disabled = true;
            }
        } else {
            // Hide offline indicator
            if (offlineIndicator) {
                offlineIndicator.className = 'offline-indicator';
            }
            
            // Enable sync button
            const syncButton = document.getElementById('sync-button');
            if (syncButton) {
                syncButton.disabled = false;
            }
        }
    },
    
    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
        if (!text) return '';
        
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize the app when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if config is available
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG object not available. Check if config.js is loaded properly.');
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <h3>Configuration Error</h3>
                <p>The application configuration could not be loaded. Please check your environment variables and refresh the page.</p>
            `;
            errorContainer.style.display = 'block';
        }
        
        // Hide loader
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.display = 'none';
        }
        return;
    }
    
    // Initialize the app
    App.init();
});

// Enable debug mode with URL parameter
if (window.location.search.includes('debug=true')) {
    App.DEBUG_MODE = true;
    console.log('Debug mode enabled');
}
