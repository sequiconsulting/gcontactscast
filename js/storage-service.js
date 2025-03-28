// Storage Service for Google Contacts Viewer
// Handles local encrypted storage of contacts

const StorageService = {
    // Encryption key (derived from user's Google ID + app-specific salt)
    encryptionKey: null,
    
    // Initialize the storage service with user information
    init: async function(userId) {
        // Create a unique encryption key for this user
        const salt = 'google-contacts-viewer-v1'; // App-specific salt
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(userId + salt)
        );
        
        // Import the key for AES-GCM
        this.encryptionKey = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false, // Not extractable
            ['encrypt', 'decrypt']
        );
        
        console.log('Storage service initialized for user');
        return true;
    },
    
    // Encrypt data
    encrypt: async function(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        
        // Generate an initialization vector (IV)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Convert data to string if it's an object
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        
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
    },
    
    // Decrypt data
    decrypt: async function(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        
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
        
        // Parse JSON if possible
        try {
            return JSON.parse(decodedString);
        } catch (e) {
            // If not JSON, return the string
            return decodedString;
        }
    },
    
    // Save contacts to local storage
    saveContacts: async function(contacts, userId) {
        try {
            // Encrypt the contacts data
            const encryptedData = await this.encrypt(contacts);
            
            // Store with user-specific key
            localStorage.setItem(`contacts_${userId}`, encryptedData);
            
            // Store last sync time
            localStorage.setItem(`last_sync_${userId}`, Date.now().toString());
            
            console.log('Contacts saved to local storage');
            return true;
        } catch (error) {
            console.error('Failed to save contacts:', error);
            return false;
        }
    },
    
    // Load contacts from local storage
    loadContacts: async function(userId) {
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
        console.log('User data cleared from local storage');
    }
};
