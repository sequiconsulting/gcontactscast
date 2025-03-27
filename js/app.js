// Google Contacts Viewer App
// Main application logic

// Main app controller
const GoogleContactsApp = {
    // App state
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false,
        contacts: []
    },

    // DOM elements
    elements: {
        signinButton: document.getElementById('signin-button'),
        signoutButton: document.getElementById('signout-button'),
        authStatus: document.getElementById('auth-status'),
        userInfo: document.getElementById('user-info'),
        contactsCard: document.getElementById('contacts-card'),
        contactsContainer: document.getElementById('contacts-container'),
        userName: document.getElementById('user-name'),
        loader: document.getElementById('loader'),
        searchInput: document.getElementById('search-input'),
        debugInfo: document.getElementById('debug-info') // New element for debugging
    },

    // Initialize the application
    init: function() {
        console.log('Initializing Google Contacts App');
        console.log('Using CLIENT_ID:', CONFIG.CLIENT_ID);
        console.log('Using API_KEY:', CONFIG.API_KEY);
        
        this.setupEventListeners();
        this.loadGapiClient();
        this.loadGisClient();
        this.showDebugInfo();
    },

    // Set up event listeners
    setupEventListeners: function() {
        this.elements.signinButton.addEventListener('click', this.handleAuthClick.bind(this));
        this.elements.signoutButton.addEventListener('click', this.handleSignoutClick.bind(this));
        this.elements.searchInput.addEventListener('input', this.handleSearch.bind(this));
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
            this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: '', // defined later
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
            this.elements.signinButton.disabled = false;
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
            
            if (debugContent) {
                this.elements.debugInfo.innerHTML = debugContent;
                this.elements.debugInfo.style.display = 'block';
            }
        }
    },

    // Handle authentication click
    handleAuthClick: function() {
        const self = this;
        
        this.state.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                this.showError('Authentication error: ' + resp.error);
                return;
            }
            
            self.elements.authStatus.style.display = 'none';
            self.elements.userInfo.style.display = 'block';
            self.elements.contactsCard.style.display = 'block';
            
            await self.getUserInfo();
            self.listConnectionNames();
        };
        
        if (gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            this.state.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip display of account chooser and consent dialog for an existing session
            this.state.tokenClient.requestAccessToken({prompt: ''});
        }
    },

    // Handle sign-out click
    handleSignoutClick: function() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            this.elements.authStatus.style.display = 'block';
            this.elements.userInfo.style.display = 'none';
            this.elements.contactsCard.style.display = 'none';
            this.elements.contactsContainer.innerHTML = '';
            this.state.contacts = [];
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
                
            this.elements.userName.textContent = userName;
        } catch (err) {
            this.showError('Error fetching user profile: ' + err.message);
        }
    },

    // List connections (contacts)
    listConnectionNames: async function() {
        this.elements.loader.style.display = 'block';
        this.elements.contactsContainer.innerHTML = '';
        
        try {
            const response = await gapi.client.people.people.connections.list({
                resourceName: 'people/me',
                pageSize: 100,
                personFields: 'names,emailAddresses,phoneNumbers',
                sortOrder: 'FIRST_NAME_ASCENDING'
            });
            
            const connections = response.result.connections;
            if (!connections || connections.length === 0) {
                this.elements.contactsContainer.innerHTML = '<p>No contacts found.</p>';
                this.elements.loader.style.display = 'none';
                return;
            }
            
            // Store contacts for search functionality
            this.state.contacts = connections;
            
            // Display contacts
            this.renderContacts(connections);
            
        } catch (err) {
            this.showError('Error retrieving contacts: ' + err.message);
        } finally {
            this.elements.loader.style.display = 'none';
        }
    },
    
    // Render contacts to DOM
    renderContacts: function(contacts) {
        const fragment = document.createDocumentFragment();
        
        contacts.forEach((person) => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            
            // Name
            const name = person.names && person.names.length > 0
                ? person.names[0].displayName : 'Unknown';
            const nameElem = document.createElement('div');
            nameElem.className = 'contact-name';
            nameElem.textContent = name;
            contactDiv.appendChild(nameElem);
            
            // Email
            if (person.emailAddresses && person.emailAddresses.length > 0) {
                const emailElem = document.createElement('div');
                emailElem.className = 'contact-email';
                emailElem.textContent = person.emailAddresses[0].value;
                contactDiv.appendChild(emailElem);
            }
            
            // Phone
            if (person.phoneNumbers && person.phoneNumbers.length > 0) {
                const phoneElem = document.createElement('div');
                phoneElem.className = 'contact-phone';
                phoneElem.textContent = person.phoneNumbers[0].value;
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
        this.elements.contactsContainer.innerHTML = '';
        
        if (filteredContacts.length === 0) {
            this.elements.contactsContainer.innerHTML = '<p>No matching contacts found.</p>';
        } else {
            this.renderContacts(filteredContacts);
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
        existingErrors.forEach(element => element.remove());
        
        // Insert at the top of contacts container
        if (this.elements.contactsContainer.firstChild) {
            this.elements.contactsContainer.insertBefore(errorDiv, this.elements.contactsContainer.firstChild);
        } else {
            this.elements.contactsContainer.appendChild(errorDiv);
        }
    },
    
    // Security: Sanitize HTML to prevent XSS
    sanitizeHTML: function(text) {
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
