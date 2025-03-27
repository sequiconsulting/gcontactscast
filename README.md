# Google Contacts Viewer

A secure web application that allows users to view their Google Contacts. This application is built to be deployed on Netlify and implements modern security best practices.

## Features

- Secure authentication with Google OAuth 2.0
- View your Google Contacts with names, emails, and phone numbers
- Search functionality to quickly find contacts
- Responsive design that works on desktop and mobile
- Proper security headers and CSP implementation
- Environment variable management for API keys

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Platform account
- Google API credentials (Client ID and API Key)

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

5. Run the build script to process environment variables:
   ```
   npm run build
   ```

6. Start the development server:
   ```
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:8888`

### API Credential Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the People API
4. Create OAuth consent screen (External)
5. Create OAuth 2.0 Client ID (Web application)
   - Add `http://localhost:8888` to Authorized JavaScript origins for local testing
   - Add your Netlify domain (e.g., `https://your-app.netlify.app`) to Authorized JavaScript origins for production
6. Create API Key and restrict it to the People API

### Netlify Deployment

1. Create a new site in Netlify connected to your GitHub repository
2. Add the following environment variables in Netlify's site settings:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_API_KEY`
3. Deploy the site

## Security Features

- Content Security Policy (CSP) to prevent XSS attacks
- X-Frame-Options to prevent clickjacking
- X-XSS-Protection for additional XSS protection
- X-Content-Type-Options to prevent MIME type sniffing
- Referrer-Policy to control HTTP referrers
- Permissions-Policy to limit browser features
- HTML sanitization to prevent client-side injection
- Environment variables for API credentials

## Privacy

This application:
- Does not store any contact data on servers
- Only requests the minimal required permissions
- Processes all data client-side
- Includes a clear privacy statement for users

## License

MIT
