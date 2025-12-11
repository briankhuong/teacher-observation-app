// src/auth/authConfig.js

export const msalConfig = {
  auth: {
    // 1. Client ID (Application ID)
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID, 
    // 2. Authority URL for your organization
    // Common Authority URL format: "https://login.microsoftonline.com/[Tenant ID]"
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID}`,
    // 3. Redirect URI
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI, 
  },
  cache: {
    cacheLocation: "sessionStorage", // Recommended for web apps
    storeAuthStateInCookie: false, // Recommended for modern browsers
  },
  // We can add system logging here if needed later
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        // console.log(`MSAL [${level}]: ${message}`);
      },
      logLevel: 3, // 3 = Info, 4 = Verbose
      piiLoggingEnabled: false
    }
  }
};

// Scopes (Permissions) requested during initial login and for API calls
export const loginRequest = {
  // Required for basic sign-in
  scopes: ["User.Read", "openid", "profile"], 
};

// Scopes needed later for email and excel (Microsoft Graph API)
export const graphScopes = {
    // Add all the scopes you mentioned for email and Excel.
    // Example high-level scopes:
    scopes: ["Mail.Send", "Files.ReadWrite.All", "User.Read"], 
};