// Contacts Service for Google Contacts Viewer
// Handles fetching and processing Google contacts

const ContactsService = {
    // Constants for API requests
    MAX_RESULTS_PER_PAGE: 100,
    DEFAULT_PERSON_FIELDS: 'names,emailAddresses,phoneNumbers',
    
    // Get user ID (for storage and identification)
    getUserId: async function() {
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'metadata',
            });
            
            // Get Google source ID as unique identifier
            if (response.result && 
                response.result.metadata && 
                response.result.metadata.sources && 
                response.result.metadata.sources.length > 0) {
                return response.result.metadata.sources[0].id;
            }
            
            throw new Error('Could not retrieve user ID');
        } catch (error) {
            console.error('Error getting user ID:', error);
            throw error;
        }
    },
    
    // Fetch all contacts using pagination
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
            throw error;
        }
    },
    
    // Process contacts to ensure consistent format
    processContacts: function(contacts) {
        if (!contacts || !Array.isArray(contacts)) {
            return [];
        }
        
        // Filter out any contacts without names
        return contacts.filter(contact => {
            return contact.names && contact.names.length > 0;
        }).map(contact => {
            // Only keep fields we need to reduce storage size
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
