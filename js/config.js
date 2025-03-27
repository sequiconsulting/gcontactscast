// Configuration file for Google Contacts Viewer
const CONFIG = {
    // These will be replaced at build time using Netlify environment variables
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    API_KEY: process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY',
    SCOPES: 'https://www.googleapis.com/auth/contacts.readonly',
    DISCOVERY_DOC: 'https://people.googleapis.com/$discovery/rest?version=v1'
};
