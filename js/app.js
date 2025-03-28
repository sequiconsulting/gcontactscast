// Main application script for Google Contacts Viewer

const App = {
    // Application state
    state: {
        gapiInited: false,
        gisInited: false,
        isSignedIn: false,
        contacts: [],
        filteredContacts: [],
        userId: null,
        tokenClient: null,
        isLoading: false,
        searchTerm: ''
    },

    // Initialize the application
    init: function() {
        console.log('Initializing application...');
        
        // Set up event listeners
        document.getElementById('signin-button').addEventListener('click', this.handleAuthClick.bind(this));
        document.getElementById('signout-button').addEventListener('click', this.handleSignoutClick.bind(this));
        document.getElementById('sync-button').addEventListener('click', this.handleSyncClick.bind(this));
        document.getElementById('search-input').addEventListener('input', this.handleSearch.bind(this));
        
        // Initialize GAPI and GIS
        this.initializeGapiClient();
        this.loadGisClient();
        
        // Check if offline
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));
        this.updateOnlineStatus();
    },
    
    // Update online status indicator
    updateOnlineStatus: function() {
        if (navigator.onLine) {
            document.getElementById('error-container').style.display = 'none';
        } else {
            document.getElementById('error-container').innerHTML = `
                <h3>You're offline</h3>
                <p>This app can still display your cached contacts while you're offline.</p>
            `;
            document.getElementById('error-container').style.display = 'block';
        }
    },
    
    // Enhanced initialization of the GAPI client
    initializeGapiClient: async function() {
        console.log('Initializing GAPI client...');
        try {
            // Get API_KEY using the getter
            const apiKey = CONFIG.API_KEY;
            
            // Validate API key
            if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY' || apiKey === 'MISSING_CREDENTIAL') {
                console.error('Invalid API key configuration:', apiKey);
                this.showError('Invalid API key configuration. Please check your Netlify environment variables.');
                return;
            }
            
            console.log('Using API key:', apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 3));
            
            await gapi.client.init({
                apiKey: apiKey,
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

    // Enhanced loading of the Google Identity Services client
    loadGisClient: function() {
        console.log('Loading GIS client...');
        
        // Check CONFIG using getter for CLIENT_ID with more detailed validation
        try {
            const clientId = CONFIG.CLIENT_ID;
            console.log('Client ID available:', clientId.substring(0, 3) + '...' + clientId.substring(clientId.length - 3));
            
            if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID' || clientId === 'MISSING_CREDENTIAL') {
                console.error('Invalid CLIENT_ID configuration:', clientId);
                this.showError('Invalid CLIENT_ID configuration. Please check your Netlify environment variables.');
                return;
            }
            
            // Define callback with better error handling
            const tokenCallback = (resp) => {
                console.log('Token callback received:', resp.error ? 'Error' : 'Success');
                
                if (resp.error !== undefined) {
                    // Handle specific errors
                    if (resp.error === 'popup_closed_by_user') {
                        this.showError('Sign in was cancelled. Please try again.');
                    } else {
                        console.error('Authentication error:', resp.error);
                        this.showError('Authentication error: ' + resp.error);
                    }
                    return;
                }
                
                this.onSuccessfulAuth();
            };
            
            // Initialize token client with better error handling
            try {
                this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: CONFIG.SCOPES,
                    callback: tokenCallback,
                    error_callback: (err) => {
                        console.error('Token client error:', err);
                        this.showError('Authentication initialization error: ' + err.type);
                    }
                });
                
                this.state.gisInited = true;
                console.log('GIS client initialized successfully');
                this.maybeEnableButtons();
            } catch (gisError) {
                console.error('GIS initialization error:', gisError);
                this.showError('Failed to initialize authentication: ' + gisError.message);
            }
        } catch (error) {
            console.error('Failed to initialize Google Identity Services client:', error);
            this.showError('Failed to initialize Google Identity Services: ' + error.message);
        }
    },

    // Enhanced function to enable buttons
    maybeEnableButtons: function() {
        const signinButton = document.getElementById('signin-button');
        
        console.log('Checking initialization status:');
        console.log('- GAPI initialized:', this.state.gapiInited);
        console.log('- GIS initialized:', this.state.gisInited);
        
        if (this.state.gapiInited && this.state.gisInited) {
            console.log('Both APIs initialized, enabling sign-in button');
            
            if (signinButton) {
                signinButton.disabled = false;
                console.log('Sign-in button enabled');
            } else {
                console.error('Sign-in button element not found');
            }
            
            // Hide the initial loader
            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) {
                initialLoader.style.display = 'none';
                console.log('Initial loader hidden');
            } else {
                console.error('Initial loader element not found');
            }
        } else {
            console.log('APIs not fully initialized yet, button remains disabled');
        }
    },
    
    // Handle the sign-in button click
    handleAuthClick: function() {
        console.log('Auth button clicked');
        
        if (!this.state.tokenClient) {
            console.error('Token client not initialized');
            this.showError('Authentication not ready. Please try again later.');
            return;
        }
        
        // Show loading indicator
        this.setLoading(true);
        
        // Prompt the user to select an account and grant consent
        try {
            this.state.tokenClient.requestAccessToken({
                prompt: 'consent'
            });
            console.log('Requested access token with consent prompt');
        } catch (error) {
            console.error('Error requesting access token:', error);
            this.showError('Authentication error: ' + error.message);
            this.setLoading(false);
        }
    },
    
    // Handle successful authentication
    onSuccessfulAuth: async function() {
        console.log('Authentication successful');
        this.state.isSignedIn = true;
        
        try {
            // Get user info for display
            const userInfo = await this.getUserInfo();
            document.getElementById('user-name').textContent = userInfo.name;
            
            // Get user ID for storage
            this.state.userId = await ContactsService.getUserId();
            console.log('User ID retrieved:', this.state.userId);
            
            // Initialize storage service
            await StorageService.init(this.state.userId);
            console.log('Storage service initialized');
            
            // Update UI for signed-in state
            this.updateSignedInState(true);
            
            // Check if we need to load contacts
            if (StorageService.needsSync(this.state.userId)) {
                console.log('No cached contacts or cache expired, fetching from Google');
                await this.syncContacts();
            } else {
                console.log('Loading contacts from local storage');
                await this.loadContactsFromStorage();
            }
        } catch (error) {
            console.error('Error during authentication flow:', error);
            this.showError('Error setting up your account: ' + error.message);
            this.setLoading(false);
        }
    },
    
    // Get user info
    getUserInfo: async function() {
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'names'
            });
            
            const name = response.result.names && response.result.names.length > 0
                ? response.result.names[0].displayName
                : 'Unknown User';
                
            return { name: name };
        } catch (error) {
            console.error('Failed to get user info:', error);
            return { name: 'User' };
        }
    },
    
    // Handle syncing contacts
    handleSyncClick: async function() {
        console.log('Sync button clicked');
        
        // Show sync overlay
        document.getElementById('syncing-overlay').style.display = 'flex';
        document.getElementById('sync-status').textContent = 'Syncing...';
        
        try {
            await this.syncContacts();
            document.getElementById('sync-status').textContent = 'Sync completed successfully';
        } catch (error) {
            console.error('Failed to sync contacts:', error);
            document.getElementById('sync-status').textContent = 'Sync failed';
            this.showError('Failed to sync contacts: ' + error.message);
        } finally {
            // Hide sync overlay
            document.getElementById('syncing-overlay').style.display = 'none';
        }
    },
    
    // Sync contacts from Google
    syncContacts: async function() {
        try {
            // Update sync status
            document.getElementById('sync-message').textContent = 'Connecting to Google...';
            
            // Fetch contacts with progress updates
            const updateProgress = (message) => {
                document.getElementById('sync-message').textContent = message;
            };
            
            const rawContacts = await ContactsService.fetchAllContacts(updateProgress);
            console.log(`Fetched ${rawContacts.length} contacts from Google`);
            
            // Process contacts
            updateProgress('Processing contacts...');
            const processedContacts = ContactsService.processContacts(rawContacts);
            
            // Save to local storage
            updateProgress('Saving contacts to local storage...');
            await StorageService.saveContacts(processedContacts, this.state.userId);
            
            // Load contacts to display
            this.state.contacts = processedContacts;
            this.filterAndDisplayContacts();
            
            // Update sync time display
            this.updateLastSyncTime();
            
            console.log('Contact sync completed successfully');
            return true;
        } catch (error) {
            console.error('Error syncing contacts:', error);
            throw error;
        }
    },
    
    // Load contacts from local storage
    loadContactsFromStorage: async function() {
        try {
            this.setLoading(true);
            
            // Try to load from storage
            const contacts = await StorageService.loadContacts(this.state.userId);
            
            if (contacts && contacts.length > 0) {
                console.log(`Loaded ${contacts.length} contacts from local storage`);
                this.state.contacts = contacts;
                this.filterAndDisplayContacts();
                
                // Update sync time display
                this.updateLastSyncTime();
                
                return true;
            } else {
                console.log('No contacts in storage or empty array, fetching from Google');
                return await this.syncContacts();
            }
        } catch (error) {
            console.error('Error loading contacts from storage:', error);
            this.showError('Failed to load contacts: ' + error.message);
            return false;
        } finally {
            this.setLoading(false);
        }
    },
    
    // Update the last sync time display
    updateLastSyncTime: function() {
        const lastSyncElement = document.getElementById('last-sync-time');
        const lastSync = StorageService.getLastSyncTime(this.state.userId);
        
        if (lastSync) {
            const date = new Date(lastSync);
            lastSyncElement.textContent = date.toLocaleString();
        } else {
            lastSyncElement.textContent = 'Never';
        }
    },
    
    // Filter and display contacts
    filterAndDisplayContacts: function() {
        // Apply search filter if any
        if (this.state.searchTerm) {
            const searchTerm = this.state.searchTerm.toLowerCase();
            this.state.filteredContacts = this.state.contacts.filter(contact => {
                // Check names
                if (contact.names && contact.names.length > 0) {
                    const name = contact.names[0].displayName.toLowerCase();
                    if (name.includes(searchTerm)) {
                        return true;
                    }
                }
                
                // Check emails
                if (contact.emailAddresses && contact.emailAddresses.length > 0) {
                    for (const email of contact.emailAddresses) {
                        if (email.value.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                    }
                }
                
                // Check phone numbers
                if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                    for (const phone of contact.phoneNumbers) {
                        if (phone.value.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                    }
                }
                
                return false;
            });
        } else {
            this.state.filteredContacts = this.state.contacts;
        }
        
        // Update contact count
        document.getElementById('contact-count').textContent = this.state.filteredContacts.length;
        
        // Display contacts
        const container = document.getElementById('contacts-container');
        container.innerHTML = '';
        
        if (this.state.filteredContacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No contacts found</p>
                </div>
            `;
            return;
        }
        
        for (const contact of this.state.filteredContacts) {
            const formattedContact = ContactsService.formatContactForDisplay(contact);
            
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            contactElement.innerHTML = `
                <div class="contact-name">${formattedContact.name}</div>
                ${formattedContact.email ? `<div class="contact-email">${formattedContact.email}</div>` : ''}
                ${formattedContact.phone ? `<div class="contact-phone">${formattedContact.phone}</div>` : ''}
            `;
            
            container.appendChild(contactElement);
        }
    },
    
    // Handle search input
    handleSearch: function(event) {
        this.state.searchTerm = event.target.value.trim();
        this.filterAndDisplayContacts();
    },
    
    // Handle sign-out button click
    handleSignoutClick: function() {
        console.log('Sign out button clicked');
        
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            console.log('Token revoked and removed from client');
        }
        
        // Clear user data from storage
        if (this.state.userId) {
            StorageService.clearUserData(this.state.userId);
        }
        
        // Reset state
        this.state.isSignedIn = false;
        this.state.contacts = [];
        this.state.filteredContacts = [];
        this.state.userId = null;
        
        // Update UI
        this.updateSignedInState(false);
        console.log('Signed out successfully');
    },
    
    // Update the UI based on sign-in state
    updateSignedInState: function(isSignedIn) {
        document.getElementById('auth-status').style.display = isSignedIn ? 'none' : 'block';
        document.getElementById('user-info').style.display = isSignedIn ? 'block' : 'none';
        document.getElementById('contacts-card').style.display = isSignedIn ? 'block' : 'none';
    },
    
    // Set loading state
    setLoading: function(isLoading) {
        this.state.isLoading = isLoading;
        document.getElementById('loader').style.display = isLoading ? 'block' : 'none';
    },
    
    // Show error message
    showError: function(message) {
        console.error('Error:', message);
        const errorContainer = document.getElementById('error-container');
        errorContainer.innerHTML = `<p>${message}</p>`;
        errorContainer.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
};

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if all required scripts are loaded
    if (typeof gapi !== 'undefined' && 
        typeof google !== 'undefined' && 
        typeof CONFIG !== 'undefined' &&
        typeof StorageService !== 'undefined' &&
        typeof ContactsService !== 'undefined') {
        // Initialize the app
        App.init();
    } else {
        console.error('Required scripts not loaded');
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <h3>Failed to Load Application</h3>
                <p>One or more required scripts failed to load.</p>
                <button onclick="location.reload()">Reload Page</button>
            `;
            errorContainer.style.display = 'block';
        }
        
        // Hide the initial loader
        const initialLoader = document.getElementById('initial-loader');
        if (initialLoader) {
            initialLoader.style.display = 'none';
        }
    }
});
