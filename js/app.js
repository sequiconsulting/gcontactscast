// Main application code for GContactsCast
// A secure Google Contacts viewer with local encryption

// Main App object with application state and methods
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
        // Set up event listeners
        document.getElementById('signin-button').addEventListener('click', this.handleAuthClick.bind(this));
        document.getElementById('signout-button').addEventListener('click', this.handleSignoutClick.bind(this));
        document.getElementById('sync-button').addEventListener('click', this.handleSyncClick.bind(this));
        document.getElementById('search-input').addEventListener('input', this.handleSearch.bind(this));
        
        // Initialize GAPI and GIS
        this.initializeGapiClient();
        this.loadGisClient();
        
        // Set up online/offline event listeners
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));
        this.updateOnlineStatus();
        
        // Hide the initial loader when initialization is complete
        setTimeout(() => {
            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) {
                initialLoader.style.display = 'none';
            }
        }, 1000);
    },
    
    // Initialize the Google API client
    initializeGapiClient: async function() {
        try {
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000,
                    ontimeout: reject
                });
            });
            
            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: [CONFIG.DISCOVERY_DOC],
            });
            
            this.state.gapiInited = true;
            this.maybeEnableButtons();
        } catch (error) {
            this.showError('Error initializing Google API client: ' + error.message);
        }
    },
    
    // Load Google Identity Services client
    loadGisClient: function() {
        if (!google || !google.accounts || !google.accounts.oauth2) {
            this.showError('Google Identity Services not available');
            return;
        }
        
        this.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES,
            callback: this.handleTokenResponse.bind(this)
        });
        
        this.state.gisInited = true;
        this.maybeEnableButtons();
    },
    
    // Handle OAuth token response
    handleTokenResponse: function(response) {
        if (response.error !== undefined) {
            if (response.error !== 'popup_closed_by_user') {
                this.showError('Authentication error: ' + response.error);
            }
            return;
        }
        
        this.onSuccessfulAuth();
    },
    
    // Enable buttons when APIs are ready
    maybeEnableButtons: function() {
        if (this.state.gapiInited && this.state.gisInited) {
            document.getElementById('signin-button').disabled = false;
        }
    },
    
    // Handle sign-in button click
    handleAuthClick: function() {
        this.state.tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    
    // Handle successful authentication
    onSuccessfulAuth: async function() {
        this.state.isSignedIn = true;
        document.getElementById('auth-status').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('contacts-card').style.display = 'block';
        
        // Get user info and ID
        try {
            this.state.userId = await ContactsService.getUserId();
            
            // Initialize storage service with user ID
            await StorageService.init(this.state.userId);
            
            // Check if we have contacts in storage
            const storedContacts = await StorageService.loadContacts(this.state.userId);
            
            if (storedContacts && storedContacts.length > 0) {
                this.state.contacts = storedContacts;
                this.state.filteredContacts = storedContacts;
                this.renderContacts();
                this.updateLastSyncInfo();
                
                // Check if we need to sync based on time threshold
                if (StorageService.needsSync(this.state.userId)) {
                    this.handleSyncClick();
                }
            } else {
                // No contacts in storage, fetch from API
                this.handleSyncClick();
            }
        } catch (error) {
            this.showError('Error initializing user data: ' + error.message);
        }
    },
    
    // Handle sign-out button click
    handleSignoutClick: function() {
        // Revoke token and reset state
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        
        // Clear storage (optional - comment out to keep data between sessions)
        if (this.state.userId) {
            StorageService.clearUserData(this.state.userId);
        }
        
        // Reset UI
        this.state.isSignedIn = false;
        this.state.contacts = [];
        this.state.filteredContacts = [];
        document.getElementById('auth-status').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('contacts-card').style.display = 'none';
        document.getElementById('contacts-container').innerHTML = '';
        document.getElementById('contact-count').textContent = '0';
    },
    
    // Handle sync button click
    handleSyncClick: async function() {
        if (this.state.isSyncing) return;
        
        this.state.isSyncing = true;
        document.getElementById('sync-button').disabled = true;
        document.getElementById('syncing-overlay').style.display = 'flex';
        document.getElementById('sync-status').textContent = 'Syncing...';
        
        try {
            // Update progress message in the overlay
            const updateProgress = (message) => {
                document.getElementById('sync-message').textContent = message;
            };
            
            // Fetch all contacts
            updateProgress('Connecting to Google...');
            const allContacts = await ContactsService.fetchAllContacts(updateProgress);
            
            // Process contacts
            updateProgress('Processing contacts...');
            const processedContacts = ContactsService.processContacts(allContacts);
            
            // Save to storage
            updateProgress('Encrypting and saving contacts...');
            await StorageService.saveContacts(processedContacts, this.state.userId);
            
            // Update state
            this.state.contacts = processedContacts;
            this.state.filteredContacts = processedContacts;
            
            // Update UI
            this.renderContacts();
            this.updateLastSyncInfo();
            
            document.getElementById('sync-status').textContent = 'Sync completed successfully';
        } catch (error) {
            document.getElementById('sync-status').textContent = 'Sync failed';
            this.showError('Error syncing contacts: ' + error.message);
        } finally {
            // Hide overlay and re-enable button
            document.getElementById('syncing-overlay').style.display = 'none';
            document.getElementById('sync-button').disabled = false;
            this.state.isSyncing = false;
        }
    },
    
    // Handle search input
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            // If search is empty, show all contacts
            this.state.filteredContacts = this.state.contacts;
        } else {
            // Filter contacts by name, email, or phone
            this.state.filteredContacts = this.state.contacts.filter(contact => {
                const name = contact.names && contact.names[0] ? 
                    contact.names[0].displayName.toLowerCase() : '';
                
                // Search in emails
                const emailMatch = contact.emailAddresses && contact.emailAddresses.some(email => 
                    email.value.toLowerCase().includes(searchTerm));
                
                // Search in phone numbers
                const phoneMatch = contact.phoneNumbers && contact.phoneNumbers.some(phone => 
                    phone.value.toLowerCase().includes(searchTerm));
                
                return name.includes(searchTerm) || emailMatch || phoneMatch;
            });
        }
        
        this.renderContacts();
    },
    
    // Render contacts in the UI
    renderContacts: function() {
        const containerEl = document.getElementById('contacts-container');
        const countEl = document.getElementById('contact-count');
        
        // Update count display
        countEl.textContent = this.state.filteredContacts.length;
        
        if (this.state.filteredContacts.length === 0) {
            if (this.state.contacts.length === 0) {
                containerEl.innerHTML = `
                    <div class="empty-state">
                        <p>No contacts found.</p>
                        <p>Sync with Google to view your contacts.</p>
                    </div>
                `;
            } else {
                containerEl.innerHTML = `
                    <div class="empty-state">
                        <p>No contacts match your search.</p>
                        <p>Try a different search term.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Sort contacts by name
        const sortedContacts = [...this.state.filteredContacts].sort((a, b) => {
            const nameA = a.names && a.names[0] ? a.names[0].displayName : '';
            const nameB = b.names && b.names[0] ? b.names[0].displayName : '';
            return nameA.localeCompare(nameB);
        });
        
        // Render contacts
        let html = '';
        
        sortedContacts.forEach(contact => {
            const formattedContact = ContactsService.formatContactForDisplay(contact);
            
            html += `
                <div class="contact-item" data-id="${formattedContact.id}">
                    <div class="contact-name">${formattedContact.name}</div>
                    ${formattedContact.email ? `<div class="contact-email">${formattedContact.email}</div>` : ''}
                    ${formattedContact.phone ? `<div class="contact-phone">${formattedContact.phone}</div>` : ''}
                </div>
            `;
        });
        
        containerEl.innerHTML = html;
    },
    
    // Update the last sync information
    updateLastSyncInfo: function() {
        const lastSyncTime = StorageService.getLastSyncTime(this.state.userId);
        const lastSyncEl = document.getElementById('last-sync-time');
        
        if (lastSyncTime) {
            const date = new Date(lastSyncTime);
            lastSyncEl.textContent = date.toLocaleString();
        } else {
            lastSyncEl.textContent = 'Never';
        }
    },
    
    // Show an error message to the user
    showError: function(message) {
        const errorContainer = document.getElementById('error-container');
        
        if (!errorContainer) return;
        
        errorContainer.innerHTML = `
            <p>${message}</p>
            <button onclick="document.getElementById('error-container').style.display='none'">Dismiss</button>
        `;
        
        errorContainer.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorContainer.style.display === 'block') {
                errorContainer.style.display = 'none';
            }
        }, 10000);
    },
    
    // Update online/offline status indicator
    updateOnlineStatus: function() {
        const isOnline = navigator.onLine;
        
        // Create or get the offline indicator
        let offlineIndicator = document.getElementById('offline-indicator');
        
        if (!offlineIndicator) {
            offlineIndicator = document.createElement('div');
            offlineIndicator.id = 'offline-indicator';
            offlineIndicator.className = 'offline-indicator';
            offlineIndicator.textContent = 'You are offline';
            document.body.appendChild(offlineIndicator);
        }
        
        // Show or hide based on online status
        if (!isOnline) {
            offlineIndicator.classList.add('visible');
            
            // Disable sync button when offline
            const syncButton = document.getElementById('sync-button');
            if (syncButton) {
                syncButton.disabled = true;
                syncButton.title = 'Sync is unavailable while offline';
            }
        } else {
            offlineIndicator.classList.remove('visible');
            
            // Re-enable sync button when online
            const syncButton = document.getElementById('sync-button');
            if (syncButton && !this.state.isSyncing) {
                syncButton.disabled = false;
                syncButton.title = 'Sync your contacts with Google';
            }
        }
    }
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
