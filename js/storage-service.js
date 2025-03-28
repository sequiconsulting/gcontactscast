// Storage Service for GContactsCast
// Handles encrypted local storage of contacts

const StorageService = {
    // Internal state
    encryptionKey: null,
    _initialized: false,
    _userId: null,
    
    // Initialize storage with user ID (creates encryption key)
    init: async function(userId) {
        // Validate input
        if (!userId) {
            console.error('Invalid user ID for storage initialization');
            throw new Error('User ID is required for storage initialization');
        }
        
        try {
            // Create a unique encryption key for this user
            const salt = 'gcontactscast-v1-salt';
            const encoder = new TextEncoder();
            
            // More robust key generation
            const keyMaterial = await crypto.subtle.digest(
                'SHA-256',
                encoder.encode(userId + salt)
            );
            
            // Import the key for AES-GCM with more explicit key usage
            this.encryptionKey = await crypto.subtle.importKey(
                'raw', 
                keyMaterial,
                { 
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );
            
            this._initialized = true;
            this._userId = userId;
            console.log('Storage service initialized successfully');
            return true;
        } catch (error) {
            console.error('Detailed storage initialization error:', error);
            
            // Reset state on failure
            this.encryptionKey = null;
            this._initialized = false;
            this._userId = null;
            
            // Provide a more informative error
            throw new Error(`Storage initialization failed: ${error.message}`);
        }
    },
    
    // Check if service is initialized
    _checkInitialized: function() {
        if (!this._initialized || !this.encryptionKey) {
            const error = new Error('Storage service not initialized. Call init() first.');
            console.error(error);
            throw error;
        }
    },
    
    // Encrypt data with improved error handling
    encrypt: async function(data) {
        this._checkInitialized();
        
        try {
            // Validate input
            if (data === undefined || data === null) {
                throw new Error('Cannot encrypt undefined or null data');
            }
            
            // Generate cryptographically secure random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Prepare data with timestamp and metadata for integrity
            const dataWithTimestamp = {
                data: data,
                timestamp: Date.now(),
                version: 'v1'
            };
            
            // Convert data to ArrayBuffer
            const dataStr = JSON.stringify(dataWithTimestamp);
            const dataBuffer = new TextEncoder().encode(dataStr);
            
            // Encrypt the data
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                dataBuffer
            );
            
            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encryptedBuffer), iv.length);
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode.apply(null, result));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error(`Encryption error: ${error.message}`);
        }
    },
    
    // Decrypt data with improved error handling
    decrypt: async function(encryptedData) {
        this._checkInitialized();
        
        try {
            // Validate input
            if (!encryptedData) {
                throw new Error('No encrypted data provided');
            }
            
            // Convert from base64 to Uint8Array
            const bytes = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
            
            // Extract IV (first 12 bytes)
            const iv = bytes.slice(0, 12);
            
            // Extract encrypted data
            const encryptedBuffer = bytes.slice(12);
            
            // Decrypt the data
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                encryptedBuffer
            );
            
            // Parse the decrypted data
            const decryptedText = new TextDecoder().decode(decryptedBuffer);
            const parsedData = JSON.parse(decryptedText);
            
            // Validate decrypted data
            if (!parsedData || !parsedData.data) {
                throw new Error('Decrypted data is invalid');
            }
            
            // Return just the actual data
            return parsedData.data;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error(`Decryption error: ${error.message}`);
        }
    },
    
    // Save contacts to localStorage with enhanced error handling
    saveContacts: async function(contacts, userId) {
        // Validate inputs
        if (!contacts || !Array.isArray(contacts)) {
            console.error('Invalid contacts data');
            throw new Error('Contacts must be a non-empty array');
        }
        
        if (userId !== this._userId) {
            console.log('Reinitializing storage for new user');
            await this.init(userId);
        }
        
        try {
            const encryptedData = await this.encrypt(contacts);
            
            // Use try-catch for localStorage to handle potential quota exceeded errors
            try {
                localStorage.setItem(`contacts_${userId}`, encryptedData);
                localStorage.setItem(`last_sync_${userId}`, Date.now().toString());
            } catch (storageError) {
                if (storageError instanceof DOMException && 
                    (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    console.error('Local storage quota exceeded');
                    throw new Error('Cannot save contacts: Storage is full');
                }
                throw storageError;
            }
            
            console.log(`Saved ${contacts.length} contacts to local storage`);
            return true;
        } catch (error) {
            console.error('Failed to save contacts:', error);
            throw error;
        }
    },
    
    // Load contacts from localStorage with improved error handling
    loadContacts: async function(userId) {
        if (userId !== this._userId) {
            console.log('Reinitializing storage for user');
            await this.init(userId);
        }
        
        try {
            const encryptedData = localStorage.getItem(`contacts_${userId}`);
            
            if (!encryptedData) {
                console.log('No contacts found in local storage');
                return null;
            }
            
            const contacts = await this.decrypt(encryptedData);
            
            if (!contacts || contacts.length === 0) {
                console.log('Decrypted contacts are empty');
                return null;
            }
            
            console.log(`Loaded ${contacts.length} contacts from local storage`);
            return contacts;
        } catch (error) {
            console.error('Failed to load contacts:', error);
            return null;
        }
    },
    
    // Get last sync time with error handling
    getLastSyncTime: function(userId) {
        try {
            const lastSync = localStorage.getItem(`last_sync_${userId}`);
            return lastSync ? parseInt(lastSync) : null;
        } catch (error) {
            console.error('Error retrieving last sync time:', error);
            return null;
        }
    },
    
    // Check if sync is needed with more flexible threshold
    needsSync: function(userId, thresholdHours = 24) {
        try {
            const lastSync = this.getLastSyncTime(userId);
            
            if (!lastSync) {
                console.log('No previous sync found, sync recommended');
                return true; // No previous sync
            }
            
            const now = Date.now();
            const thresholdMs = thresholdHours * 60 * 60 * 1000;
            const timeSinceLastSync = now - lastSync;
            
            const needsSync = timeSinceLastSync > thresholdMs;
            
            console.log(`Time since last sync: ${timeSinceLastSync}ms, Threshold: ${thresholdMs}ms`);
            console.log(needsSync ? 'Sync recommended' : 'Sync not needed');
            
            return needsSync;
        } catch (error) {
            console.error('Error checking sync need:', error);
            return true; // Default to syncing if there's an error
        }
    },
    
    // Clear user data with comprehensive cleanup
    clearUserData: function(userId) {
        try {
            localStorage.removeItem(`contacts_${userId}`);
            localStorage.removeItem(`last_sync_${userId}`);
            
            // Reset internal state
            this.encryptionKey = null;
            this._initialized = false;
            this._userId = null;
            
            console.log('User data cleared from local storage');
        } catch (error) {
            console.error('Error clearing user data:', error);
        }
    }
};
