// Main Application file for GContactsCast
// Handles authentication and UI for the Google Contacts viewer

const App = {
    // Application state
    state: {
        gapiInited: false,
        gisInited: false,
        tokenClient: null,
        userId: null,
        isSignedIn: false,
        contacts: [],
        filteredContacts: [],
        isLoading: false,
        isSyncing: false
    },
    
    // Initialize the application
    init: function() {
        console.log('GContactsCast initializing...');
        
        // Check if CONFIG is loaded properly
        if (typeof CONFIG === 'undefined') {
            this.showError('Configuration not loaded. The application cannot start.');
            document.getElementById('initial-loader').style.display = 'none';
            this.updateSyncStatus('Configuration Error', 'error');
            return;
        }
        
        // Verify CONFIG has valid values
        if (!CONFIG.isValid()) {
            this.showError(
                'Invalid API credentials. The application cannot connect to Google services. ' +
                'Please check that GOOGLE_CLIENT_ID and GOOGLE_API_KEY are properly set ' +
                'in your Netlify environment variables.'
            );
            document.getElementById('initial-loader').style.display = 'none';
            this.updateSyncStatus('Credential Error', 'error');
            return;
        }
        
        // Set up event listeners
        document.getElementById('signin-button').addEventListener('click', this.handleAuthClick.bind(this));
        document.getElementById('signout-button').addEventListener('click', this.handleSignoutClick.bind(this));
        document.getElementById('sync-button').addEventListener('click', this.handleSyncClick.bind(this));
        document.getElementById('search-input').addEventListener('input', this.handleSearch.bind(this));
        
        // Initialize Google API clients
        this.initializeGapiClient();
        this.loadGisClient();
        
        // Set up online/offline detection
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));
        this.updateOnlineStatus();
        
        // Update version display
        const versionEl = document.getElementById('app-version');
        if (versionEl && CONFIG.VERSION) {
            versionEl.textContent = CONFIG.VERSION;
        }
        
        // Initialize sync status
        this.updateSyncStatus('Ready');
    },
    
    // Update sync status with optional styling
    updateSyncStatus: function(message, type = 'info') {
        const syncStatusEl = document.getElementById('sync-status');
        if (!syncStatusEl) return;
        
        syncStatusEl.textContent = message;
        
        // Reset classes
        syncStatusEl.classList.remove('status-error', 'status-warning', 'status-ok');
        
        // Apply appropriate class based on type
        switch(type) {
            case 'error':
                syncStatusEl.classList.add('status-error');
                break;
            case 'warning':
                syncStatusEl.classList.add('status-warning');
                break;
            case 'success':
                syncStatusEl.classList.add('status-ok');
                break;
            default:
                // Default info style
                break;
        }
    },
    
    // Initialize the Google API client
    initializeGapiClient: async function() {
        console.log('Initializing Google API client...');
        
        try {
            // Load the GAPI client
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000,
                    ontimeout: () => reject(new Error('Timeout loading GAPI client'))
                });
            });
            
            // Initialize the client with API key and discovery docs
            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: [CONFIG.DISCOVERY_DOC],
            });
            
            console.log('GAPI client initialized successfully');
            this.state.gapiInited = true;
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Error initializing Google API client:', error);
            this.showError('Failed to initialize Google API client: ' + error.message);
            this.updateSyncStatus('API Initialization Error', 'error');
            document.getElementById('initial-loader').style.display = 'none';
        }
    },
    
    // Load Google Identity Services client
    loadGisClient: function() {
        console.log('Loading Google Identity Services...');
        
        try {
            this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: this.handleTokenResponse.bind(this),
                error_callback: (error) => {
                    this.showError('Authentication error: ' + error.type);
                    this.updateSyncStatus('Authentication Error', 'error');
                }
            });
            
            console.log('Google Identity Services initialized successfully');
            this.state.gisInited = true;
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Error initializing Google Identity Services:', error);
            this.showError('Failed to initialize Google Identity Services: ' + error.message);
            this.updateSyncStatus('GIS Initialization Error', 'error');
            document.getElementById('initial-loader').style.display = 'none';
        }
    },
    
    // Handle OAuth token response
    handleTokenResponse: function(response) {
        if (response.error !== undefined) {
            if (response.error !== 'popup_closed_by_user') {
                this.showError('Authentication error: ' + response.error);
                this.updateSyncStatus('Authentication Failed', 'error');
            }
            return;
        }
        
        this.onSuccessfulAuth();
    },
    
    // Enable buttons when APIs are ready
    maybeEnableButtons: function() {
        if (this.state.gapiInited && this.state.gisInited) {
            const signinButton = document.getElementById('signin-button');
            if (signinButton) {
                signinButton.disabled = false;
                console.log('Sign-in button enabled');
            }
            
            // Hide the initial loader
            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) {
                initialLoader.style.display = 'none';
            }
        }
    },
    
    // Handle sign-in button click
    handleAuthClick: function() {
        if (!this.state.tokenClient) {
            this.showError('Authentication system not initialized yet. Please try again in a moment.');
            this.updateSyncStatus('Auth System Not Ready', 'error');
            return;
        }
        
        this.state.tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    
    // Handle successful authentication
    onSuccessfulAuth: async function() {
        console.log('Authentication successful');
        
        this.state.isSignedIn = true;
        document.getElementById('auth-status').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('contacts-card').style.display = 'block';
        
        try {
            // Update sync status during initialization
            this.updateSyncStatus('Initializing...');
            
            // Get user ID with comprehensive error handling
            try {
                this.state.userId = await ContactsService.getUserId();
                console.log('User ID retrieved:', this.state.userId);
            } catch (userIdError) {
                console.error('Failed to retrieve user ID:', userIdError);
                this.showError('Could not retrieve user identification. Using fallback method.');
                this.state.userId = `fallback_${Date.now()}`;
            }
            
            // Initialize storage
            await StorageService.init(this.state.userId);
            console.log('Storage service initialized');
            
            // Try to load contacts from storage
            const storedContacts = await StorageService.loadContacts(this.state.userId);
            
            if (storedContacts && storedContacts.length > 0) {
                console.log(`Loaded ${storedContacts.length} contacts from local storage`);
                this.state.contacts = storedContacts;
                this.state.filteredContacts = storedContacts;
                this.renderContacts();
                this.updateLastSyncInfo();
                this.updateSyncStatus('Contacts Loaded', 'success');
                
                // Check if we need to sync
                if (StorageService.needsSync(this.state.userId)) {
                    console.log('Contacts need sync based on time threshold');
                    this.updateSyncStatus('Sync Recommended', 'warning');
                    this.handleSyncClick();
                }
            } else {
                console.log('No contacts in storage, fetching from API');
                this.updateSyncStatus('Fetching Contacts...');
                this.handleSyncClick();
            }
        } catch (error) {
            console.error('Error initializing user data:', error);
            this.showError('Error initializing user data: ' + (error.message || 'Unknown error'));
            this.updateSyncStatus('Initialization Error', 'error');
        }
    },
    
    // Rest of the code remains the same as in the previous implementation...
    // (handleSignoutClick, handleSyncClick, handleSearch, renderContacts, 
    //  updateLastSyncInfo, showError, updateOnlineStatus methods)
};
