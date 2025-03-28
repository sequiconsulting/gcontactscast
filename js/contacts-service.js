// Contacts Service for Google Contacts Viewer
// Handles fetching all contacts with pagination

const ContactsService = {
    // Fetch all contacts with pagination
    fetchAllContacts: async function(progressCallback = null) {
        try {
            let allContacts = [];
            let nextPageToken = null;
            let pageCount = 0;
            const pageSize = 200; // Maximum supported by the API
            
            console.log('Starting contacts fetch with pagination');
            
            do {
                pageCount++;
                console.log(`Fetching contacts page ${pageCount}`);
                
                // Update progress if callback provided
                if (progressCallback) {
                    progressCallback(`Fetching page ${pageCount}...`);
                }
                
                const params = {
                    resourceName: 'people/me',
                    personFields: 'names,emailAddresses,phoneNumbers,photos,metadata',
                    sortOrder: 'FIRST_NAME_ASCENDING',
                    pageSize: pageSize
                };
                
                // Add page token if we have one
                if (nextPageToken) {
                    params.pageToken = nextPageToken;
                }
                
                // Make the API request
                const response = await gapi.client.people.people.connections.list(params);
                
                // Get the contacts from this page
                const pageContacts = response.result.connections || [];
                console.log(`Received ${pageContacts.length} contacts on page ${pageCount}`);
                
                // Add to our collection
                allContacts = allContacts.concat(pageContacts);
                
                // Get the next page token
                nextPageToken = response.result.nextPageToken;
                
                // Small delay to avoid rate limiting
                if (nextPageToken) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } while (nextPageToken);
            
            console.log(`Completed fetching ${allContacts.length} contacts across ${pageCount} pages`);
            return allContacts;
            
        } catch (error) {
            console.error('Error fetching all contacts:', error);
            throw error;
        }
    },
    
    // Process contacts for storage/display
    processContacts: function(contacts) {
        return contacts.map(person => {
            // Extract essential contact information
            const contact = {
                resourceName: person.resourceName,
                etag: person.etag,
                names: person.names || [],
                emailAddresses: person.emailAddresses || [],
                phoneNumbers: person.phoneNumbers || [],
                photos: person.photos || []
            };
            
            return contact;
        });
    },
    
    // Get user ID for storage
    getUserId: async function() {
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'metadata',
            });
            
            // Use the source ID as a unique identifier
            const sourceIds = response.result.metadata?.sources?.map(source => source.id);
            const userId = sourceIds?.[0] || response.result.resourceName;
            
            return userId;
        } catch (error) {
            console.error('Error getting user ID:', error);
            throw error;
        }
    }
};
