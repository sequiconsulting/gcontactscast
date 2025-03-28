// Contacts Service for GContactsCast
// Handles fetching and processing Google contacts

const ContactsService = {
    // API request constants
    MAX_RESULTS_PER_PAGE: 100,
    DEFAULT_PERSON_FIELDS: 'names,emailAddresses,phoneNumbers,metadata',
    
    // Get user ID for storage
    getUserId: async function() {
        try {
            // Use a more robust method to get a unique user identifier
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'metadata,emailAddresses'
            });
            
            // Try multiple methods to get a unique identifier
            if (response.result) {
                // Prioritize email as a unique identifier if available
                if (response.result.emailAddresses && response.result.emailAddresses.length > 0) {
                    const email = response.result.emailAddresses[0].value;
                    return btoa(email); // Base64 encode to create a safe identifier
                }
                
                // Fallback to metadata sources
                if (response.result.metadata && 
                    response.result.metadata.sources && 
                    response.result.metadata.sources.length > 0) {
                    return response.result.metadata.sources[0].id;
                }
            }
            
            // Last resort: generate a unique ID based on current timestamp
            console.warn('Generating fallback user ID');
            return `fallback_${Date.now()}`;
        } catch (error) {
            console.error('Detailed error getting user ID:', error);
            
            // More detailed error logging
            if (error.result && error.result.error) {
                console.error('Google API Error Details:', 
                    `Code: ${error.result.error.code}`, 
                    `Message: ${error.result.error.message}`
                );
            }
            
            // Provide a fallback mechanism
            return `fallback_${Date.now()}`;
        }
    },
    
    // Fetch all contacts with pagination
    fetchAllContacts: async function(progressCallback, maxPages = 50) {
        try {
            let contacts = [];
            let nextPageToken = null;
            let pageCount = 0;
            
            do {
                if (progressCallback) {
                    progressCallback(`Fetching contacts page ${pageCount + 1}...`);
                }
                
                const response = await gapi.client.people.people.connections.list({
                    resourceName: 'people/me',
                    pageSize: this.MAX_RESULTS_PER_PAGE,
                    personFields: this.DEFAULT_PERSON_FIELDS,
                    pageToken: nextPageToken,
                    sortOrder: 'FIRST_NAME_ASCENDING'
                });
                
                const batch = response.result;
                
                if (batch.connections && batch.connections.length > 0) {
                    contacts = contacts.concat(batch.connections);
                }
                
                nextPageToken = batch.nextPageToken;
                pageCount++;
                
                // Safety check to prevent infinite loops
                if (pageCount >= maxPages && nextPageToken) {
                    console.warn(`Reached maximum page count (${maxPages}). Some contacts may not be included.`);
                    break;
                }
                
                if (progressCallback) {
                    progressCallback(`Loaded ${contacts.length} contacts so far...`);
                }
                
            } while (nextPageToken);
            
            if (progressCallback) {
                progressCallback(`Completed loading ${contacts.length} contacts`);
            }
            
            return contacts;
        } catch (error) {
            console.error('Error fetching contacts:', error);
            
            // More detailed error logging
            if (error.result && error.result.error) {
                console.error('Contacts Fetch Error:', 
                    `Code: ${error.result.error.code}`, 
                    `Message: ${error.result.error.message}`
                );
            }
            
            throw error;
        }
    },
    
    // Process contacts to ensure consistent format and reduce storage size
    processContacts: function(contacts) {
        if (!contacts || !Array.isArray(contacts)) {
            return [];
        }
        
        // Filter out any contacts without names
        return contacts.filter(contact => {
            return contact.names && contact.names.length > 0;
        }).map(contact => {
            // Only keep fields we need
            return {
                resourceName: contact.resourceName,
                names: contact.names,
                emailAddresses: contact.emailAddresses || [],
                phoneNumbers: contact.phoneNumbers || []
            };
        });
    },
    
    // Format a single contact for display
    formatContactForDisplay: function(contact) {
        if (!contact) return null;
        
        return {
            id: contact.resourceName,
            name: contact.names && contact.names.length > 0 
                ? contact.names[0].displayName : 'Unknown',
            email: contact.emailAddresses && contact.emailAddresses.length > 0 
                ? contact.emailAddresses[0].value : '',
            phone: contact.phoneNumbers && contact.phoneNumbers.length > 0 
                ? contact.phoneNumbers[0].value : ''
        };
    }
};
