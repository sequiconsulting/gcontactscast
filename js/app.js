// Update the part of GoogleContactsApp.checkDependencies that checks for CONFIG
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
    
    // Verify CONFIG has required properties
    try {
        // Test accessing credentials through getters
        const clientId = CONFIG.CLIENT_ID;
        const apiKey = CONFIG.API_KEY;
        
        if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID' || clientId.length < 10) {
            console.error('Invalid CLIENT_ID configuration');
            this.showFatalError('Invalid CLIENT_ID. Please check your environment variables.');
            return false;
        }
        
        if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY' || apiKey.length < 10) {
            console.error('Invalid API_KEY configuration');
            this.showFatalError('Invalid API_KEY. Please check your environment variables.');
            return false;
        }
    } catch (error) {
        console.error('Error accessing credentials:', error);
        this.showFatalError('Failed to access API credentials: ' + error.message);
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
