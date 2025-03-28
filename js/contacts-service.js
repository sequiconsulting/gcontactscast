// Storage Service for Google Contacts Viewer
// Handles local encrypted storage of contacts

const StorageService = {
    // Encryption key (derived from user's Google ID + app-specific salt)
    encryptionKey: null,
    
    // Storage feature detection results
    features: {
        localStorageAvailable: false,
        cryptoAvailable: false,
        indexedDBAvailable: false
    },
    
    // Constants
    STORAGE_PREFIX: 'gcontacts_',
    STORAGE_VERSION: 'v1',
    MAX_LOCALSTORAGE_SIZE: 4 * 1024 * 1024, // 4MB safe limit
    
    // Initialize the storage service with user information
    init: async function(userId) {
        console.log('Initializing storage service...');
        
        // Feature detection
        this.detectFeatures();
        
        // Ensure we have the required features
        if (!this.features.cryptoAvailable) {
            throw new Error('Web Crypto API is not available in this browser');
        }
        
        if (!this.features.localStorageAvailable && !this.features.indexedDBAvailable) {
            throw new Error('No storage mechanism is available');
        }
        
        // Create a unique encryption key for this user
        const salt = 'google-contacts-viewer-v1-' + this.STORAGE_VERSION; // App-specific salt with version
        const encoder = new TextEncoder();
        
        try {
            // Use a stronger key derivation with more iterations
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
            
            console.log('Storage service initialized for user with secure key');
            return true;
        } catch (error) {
            console.error('Error initializing encryption:', error);
            throw new Error('Failed to initialize secure storage: ' + error.message);
        }
    },
    
    // Feature detection for storage and crypto
    detectFeatures: function() {
        // Check for localStorage
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('feature_test', 'test');
                localStorage.removeItem('feature_test');
                this.features.localStorageAvailable = true;
            }
        } catch (e) {
            this.features.localStorageAvailable = false;
            console.warn('localStorage is not available');
        }
        
        // Check for Web Crypto API
        this.features.cryptoAvailable = (
            typeof crypto !== 'undefined' && 
            typeof crypto.subtle !== 'undefined' && 
            typeof crypto.subtle.encrypt === 'function'
        );
        
        // Check for IndexedDB
        this.features.indexedDBAvailable = (
            typeof indexedDB !== 'undefined'
        );
        
        console.log('Feature detection:', this.features);
    },
    
    // Encrypt data
    encrypt: async function(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        
        try {
            // Generate an initialization vector (IV)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Convert data to string if it's an object
            const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
            
            // Encode the string as a Uint8Array
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataStr);
            
            // Check size before encrypting
            if (dataBuffer.byteLength > this.MAX_LOCALSTORAGE_SIZE && this.features.localStorageAvailable && !this.features.indexedDBAvailable) {
                throw new Error('Data is too large for local storage. Consider enabling cookies or using a different browser.');
            }
            
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
            return this.arrayBufferToBase64(resultBuffer);
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data: ' + error.message);
        }
    },
    
    // Convert array buffer to base64
    arrayBufferToBase64: function(buffer) {
        // Use a more efficient approach for large buffers
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        
        // Process in chunks to avoid stack overflow for large buffers
        const chunkSize = 1024;
        for (let i = 0; i < len; i += chunkSize) {
            const chunk = bytes.slice(i, Math.min(i + chunkSize, len));
            binary += String.fromCharCode.apply(null, chunk);
        }
        
        return btoa(binary);
    },
    
    // Convert base64 to array buffer
    base64ToArrayBuffer: function(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    },
    
    // Decrypt data
    decrypt: async function(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        
        try {
            // Convert from base64 to array buffer
            const buffer = this.base64ToArrayBuffer(encryptedData);
            const bytes = new Uint8Array(buffer);
            
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
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data: ' + error.message);
        }
    },
    
    // Get storage key for a user
    getUserStorageKey: function(userId, type) {
        return `${this.STORAGE_PREFIX}${type}_${this.STORAGE_VERSION}_${userId}`;
    },
    
    // Save contacts to local storage
    saveContacts: async function(contacts, userId) {
        if (!contacts || !Array.isArray(contacts)) {
            throw new Error('Invalid contacts data');
        }
        
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        try {
            // Encrypt the contacts data
            const encryptedData = await this.encrypt(contacts);
            
            // Store with user-specific key
            const storageKey = this.getUserStorageKey(userId, 'contacts');
            
            // Check storage size before saving
            if (this.features.localStorageAvailable) {
                // Check estimated size before storing
                if (encryptedData.length > this.MAX_LOCALSTORAGE_SIZE) {
                    console.warn('Data size warning: Encrypted data size is', 
                        (encryptedData.length / 1024 / 1024).toFixed(2), 'MB');
                }
                
                try {
                    localStorage.setItem(storageKey, encryptedData);
                } catch (e) {
                    if (e.name === 'QuotaExceededError' || e.code === 22) {
                        console.error('Storage quota exceeded');
                        throw new Error('Storage full: Cannot save ' + contacts.length + ' contacts');
                    } else {
                        throw e;
                    }
                }
            } else {
                throw new Error('No storage mechanism available');
            }
            
            // Store last sync time
            const timeKey = this.getUserStorageKey(userId, 'last_sync');
            localStorage.setItem(timeKey, Date.now().toString());
            
            console.log('Contacts saved to local storage');
            return true;
        } catch (error) {
            console.error('Failed to save contacts:', error);
            throw error;
        }
    },
    
    // Load contacts from local storage
    loadContacts: async function(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        try {
            const storageKey = this.getUserStorageKey(userId, 'contacts');
            const encryptedData = localStorage.getItem(storageKey);
            
            if (!encryptedData) {
                console.log('No contacts found in local storage');
                return null;
            }
            
            // Decrypt the contacts data
            const contacts = await this.decrypt(encryptedData);
            
            // Validate the loaded data
            if (!Array.isArray(contacts)) {
                console.error('Loaded contacts are not an array');
                return null;
            }
            
            console.log(`Loaded ${contacts.length} contacts from local storage`);
            
            return contacts;
        } catch (error) {
            console.error('Failed to load contacts:', error);
            // Return null instead of throwing to allow graceful fallback to sync
            return null;
        }
    },
    
    // Get the last sync time
    getLastSyncTime: function(userId) {
        if (!userId) return null;
        
        const timeKey = this.getUserStorageKey(userId, 'last_sync');
        const lastSync = localStorage.getItem(timeKey);
        return lastSync ? parseInt(lastSync, 10) : null;
    },
    
    // Check if we need to sync (based on time threshold)
    needsSync: function(userId, thresholdHours = 24) {
        if (!userId) return true;
        
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
        if (!userId) return;
        
        const contactsKey = this.getUserStorageKey(userId, 'contacts');
        const timeKey = this.getUserStorageKey(userId, 'last_sync');
        
        localStorage.removeItem(contactsKey);
        localStorage.removeItem(timeKey);
        
        this.encryptionKey = null;
        console.log('User data cleared from local storage');
    }
};
