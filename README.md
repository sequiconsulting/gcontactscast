# GContactsCast

A secure web application that allows users to view their Google Contacts with enhanced privacy and offline functionality. This application is built to be deployed on Netlify and implements modern security best practices.

## Features

- ✅ Secure authentication with Google OAuth 2.0
- ✅ **Encrypted local storage of contacts in the browser using AES-GCM**
- ✅ **No limit on the number of contacts displayed**
- ✅ **Periodic contact synchronization to keep data up-to-date**
- ✅ View your Google Contacts with names, emails, and phone numbers
- ✅ Search functionality to quickly find contacts
- ✅ Responsive design that works on desktop and mobile
- ✅ Proper security headers and CSP implementation
- ✅ Secure environment variable management for API keys

## How It Works

This application differs from regular Google Contacts viewers in several important ways:

1. **Encrypted Local Storage**: All contacts are securely stored in your browser's local storage with AES-GCM encryption
2. **No Data Sent to Servers**: After authentication with Google, all data remains on your device
3. **Pagination Support**: Retrieves all your contacts by automatically handling API pagination
4. **Smart Syncing**: Only re-fetches contacts periodically or when you choose to sync

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm (v7 or higher)
- A Google Cloud Platform account
- Google API credentials (Client ID and API Key)

### Google API Credential Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the People API
   - Go to "APIs & Services" > "Library"
   - Search for "People API" and enable it
4. Create OAuth consent screen (External)
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" and click "Create"
   - Fill in required information (App name, User support email, Developer contact)
   - Add the scope `https://www.googleapis.com/auth/contacts.readonly`
   - Add your email as a test user
5. Create OAuth 2.0 Client ID (Web application)
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add `http://localhost:8888` to Authorized JavaScript origins for local testing
   - Add your Netlify domain (e.g., `https://your-app.netlify.app`) to Authorized JavaScript origins for production
6. Create API Key and restrict it to the People API
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Restrict the key to the People API

### Local Development

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/google-contacts-viewer.git
   cd google-contacts-viewer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the template:
   ```
   cp .env.template .env
   ```

4. Edit the `.env` file and add your Google API credentials:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_API_KEY=your_google_api_key_here
   ```

5. Run the pre-deployment check to verify your setup:
   ```
   node netlify-deployment-check.js
   ```

6. Run the build script:
   ```
   npm run build
   ```

7. Start the development server:
   ```
   npm run dev
   ```

8. Open your browser and navigate to `http://localhost:8888`

### Netlify Deployment

1. Create a new site in Netlify:
   - Go to [Netlify](https://app.netlify.com/) and sign in
   - Click "New site from Git"
   - Choose your Git provider and select your repository
   - Keep the default settings: 
     - Build command: `npm run build`
     - Publish directory: `.`

2. Add environment variables in Netlify:
   - Go to Site settings > Build & deploy > Environment
   - Add the following environment variables:
     - `GOOGLE_CLIENT_ID` (your Google OAuth client ID)
     - `GOOGLE_API_KEY` (your Google API key)

3. Deploy the site:
   - Trigger a new deployment from the Netlify dashboard
   - Your site will be deployed to a URL like `https://your-app.netlify.app`

4. Update Google OAuth settings:
   - Go back to Google Cloud Console
   - Add your Netlify domain (e.g., `https://your-app.netlify.app`) to the Authorized JavaScript origins

5. Test your deployed application:
   - Visit your Netlify URL and ensure authentication works
   - Test contact synchronization and search functionality

## Security Features

- ✅ Content Security Policy (CSP) to prevent XSS attacks
- ✅ X-Frame-Options to prevent clickjacking
- ✅ X-XSS-Protection for additional XSS protection
- ✅ X-Content-Type-Options to prevent MIME type sniffing
- ✅ Referrer-Policy to control HTTP referrers
- ✅ Permissions-Policy to limit browser features
- ✅ HTML sanitization to prevent client-side injection
- ✅ Environment variables for API credentials
- ✅ **AES-GCM encryption for locally stored contacts**
- ✅ **User-specific encryption keys derived from Google ID**
- ✅ **Obfuscated API credentials in built JavaScript**

## Testing and Validation

- Run `node netlify-deployment-check.js` to validate your setup
- Check debug.html in your browser for detailed diagnostics
- View logs in the browser console for initialization information
- Run `npm run verify` to ensure build integrity

## Privacy

This application prioritizes privacy:
- All contact data is stored **only** on your device
- Contacts are encrypted using modern cryptography (AES-GCM)
- Only requests the minimal required permissions
- Processes all data client-side
- Includes a clear privacy statement for users
- No analytics or tracking

## Troubleshooting

- **Authentication Issues**: Check that your Client ID is correctly set and the Authorized JavaScript origins include your domain
- **Missing Contacts**: Ensure you've granted the correct permissions during OAuth
- **Build Errors**: Verify that environment variables are properly set
- **CSP Errors**: Check the browser console for Content Security Policy violations

## License

MIT

## Credits

- Google People API
- Web Crypto API for encryption
- Netlify for hosting
