// Only the relevant part of app.js that needs to be modified
// In the loadGisClient function, replace:

loadGisClient: function() {
    console.log('Loading GIS client...');
    
    // Check CONFIG using getter for CLIENT_ID
    try {
        const clientId = CONFIG.CLIENT_ID;
        if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
            console.error('Invalid CLIENT_ID. Please check your configuration.');
            this.showError('Invalid CLIENT_ID configuration. Please check the console for details.');
            return;
        }
        
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
            client_id: clientId, // Use the value we retrieved
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

// Similarly for initializeGapiClient:
initializeGapiClient: async function() {
    console.log('Initializing GAPI client...');
    try {
        // Get API_KEY using the getter
        const apiKey = CONFIG.API_KEY;
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
