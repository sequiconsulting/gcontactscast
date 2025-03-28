// Enhanced Storage Service for Google Contacts Viewer
// Handles local encrypted storage of contacts with improved security

const StorageService = {
    // Encryption key (derived from user's Google ID + app-specific salt)
    encryptionKey: null,
    
    // Internal state for security
    _initialized: false,
    _userId: null,
    
    // Initialize the storage service with user information
    init: async function(userId) {
        if (!userId || userId.length < 5) {
            throw new Error('Invalid user ID for storage initialization');
        }
        
        try {
            // Create a unique encryption key for this user
            const salt = 'google-contacts-viewer-v1-' + new Date().getFullYear(); // App-specific salt with year
            const encoder = new TextEncoder();
            
            // Use a stronger key derivation with multiple iterations
            let keyMaterial = encoder.encode(userId + salt);
            
            // Multiple rounds of hashing for stronger key derivation
            for (let i = 0; i < 3; i++) {
                keyMaterial = await crypto.subtle.digest(
                    'SHA-256',
                    keyMaterial
                );
            }
            
            // Import the key for AES-GCM
            this.encryptionKey = await crypto.subtle.importKey(
                'raw',
                keyMaterial,
                { name: 'AES-GCM' },
                false, // Not extractable
                ['encrypt', 'decrypt']
            );
            
            this._initialized = true;
            this._userId = userId;
            
            console.log('Storage service initialized for user');
            return true;
        } catch (error) {
            console.error('Failed to initialize storage service:', error.message);
            this._initialized = false;
            this.encryptionKey = null;
            throw error;
        }
    },
    
    // Verify service is properly initialized
    _verifyInitialized: function() {
        if (!this._initialized || !this.encryptionKey) {
            throw new Error('Storage service not initialized. Call init() first.');
        }
    },
    
    // Encrypt data with improved security
    encrypt: async function(data) {
        this._verifyInitialized();
        
        try {
            // Generate a secure random initialization vector (IV)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Add a timestamp to the data for integrity verification
            const dataWithTimestamp = {
                data: data,
                timestamp: Date.now(),
                integrity: this._userId ? this._generateIntegrityHash(this._userId) : null,
            };
            
            // Convert data to string
            const dataStr = JSON.stringify(dataWithTimestamp);
            
            // Encode the string as a Uint8Array
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataStr);
            
            // Encrypt the data
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                dataBuffer
            );
            
            // Combine the IV and encrypted data for storage
            const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            resultBuffer.set(iv, 0);
            resultBuffer.set(new Uint8Array(encryptedBuffer), iv.length);
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode.apply(null, resultBuffer));
        } catch (error) {
            console.error('Encryption failed:', error.message);
            throw new Error('Failed to encrypt data: ' + error.message);
        }
    },
    
    // Generate a simple integrity hash from user ID
    _generateIntegrityHash: function(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16); // Convert to hex string
    },
    
    // Decrypt data with integrity verification
    decrypt: async function(encryptedData) {
        this._verifyInitialized();
        
        try {
            // Convert from base64
            const binaryString = atob(encryptedData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Extract the IV (first 12 bytes)
            const iv = bytes.slice(0, 12);
            
            // Extract the encrypted data
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
            
            // Decode the data
            const decoder = new TextDecoder();
            const decodedString = decoder.decode(decryptedBuffer);
            
            // Parse JSON
            const parsedData = JSON.parse(decodedString);
            
            // Verify integrity if possible
            if (this._userId && parsedData.integrity) {
                const expectedHash = this._generateIntegrityHash(this._userId);
                if (parsedData.integrity !== expectedHash) {
                    console.warn('Integrity check failed - data may have been tampered with');
                }
            }
            
            // Return just the actual data, not the wrapper
            return parsedData.data;
        } catch (error) {
            console.error('Decryption failed:', error.message);
            throw new Error('Failed to decrypt data: ' + error.message);
        }
    },
    
    // Save contacts to local storage with encryption
    saveContacts: async function(contacts, userId) {
        if (userId !== this._userId) {
            console.warn('User ID mismatch when saving contacts. Reinitializing...');
            await this.init(userId);
        }
        
        try {
            // Encrypt the contacts data
            const encryptedData = await this.encrypt(contacts);
            
            // Store with user-specific key
            localStorage.setItem(`contacts_${userId}`, encryptedData);
            
            // Store last sync time
            localStorage.setItem(`last_sync_${userId}`, Date.now().toString());
            
            console.log(`Saved ${contacts.length} contacts to local storage`);
            return true;
        } catch (error) {
            console.error('Failed to save contacts:', error);
            return false;
        }
    },
    
    // Load contacts from local storage with decryption
    loadContacts: async function(userId) {
        if (userId !== this._userId) {
            console.warn('User ID mismatch when loading contacts. Reinitializing...');
            await this.init(userId);
        }
        
        try {
            const encryptedData = localStorage.getItem(`contacts_${userId}`);
            
            if (!encryptedData) {
                console.log('No contacts found in local storage');
                return null;
            }
            
            // Decrypt the contacts data
            const contacts = await this.decrypt(encryptedData);
            console.log(`Loaded ${contacts.length} contacts from local storage`);
            
            return contacts;
        } catch (error) {
            console.error('Failed to load contacts:', error);
            return null;
        }
    },
    
    // Get the last sync time
    getLastSyncTime: function(userId) {
        const lastSync = localStorage.getItem(`last_sync_${userId}`);
        return lastSync ? parseInt(lastSync, 10) : null;
    },
    
    // Check if we need to sync (based on time threshold)
    needsSync: function(userId, thresholdHours = 24) {
        const lastSync = this.getLastSyncTime(userId);
        
        if (!lastSync) {
            return true; // No previous sync
        }
        
        const now = Date.now();
        const thresholdMs = thresholdHours * 60 * 60 * 1000;
        
        return (now - lastSync) > thresholdMs;
    },
    
    // Clear user data on logout
    clearUserData: function(userId) {
        localStorage.removeItem(`contacts_${userId}`);
        localStorage.removeItem(`last_sync_${userId}`);
        this.encryptionKey = null;
        this._initialized = false;
        this._userId = null;
        console.log('User data cleared from local storage');
    }
};

// Export the StorageService object
// This module is loaded directly in the browser, no need for module.exports
