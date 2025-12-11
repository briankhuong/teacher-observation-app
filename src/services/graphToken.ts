// src/services/graphToken.ts

import { msalInstance } from "../auth/msalInstance";

// The scopes required for your operations: email and files
export const graphScopes = {
    scopes: ["Mail.Send", "Files.ReadWrite.All", "Sites.ReadWrite.All", "User.Read"], 
};

/**
 * Acquires a valid Access Token for the Microsoft Graph API.
 * This is crucial for making calls to send email or update Excel.
 */
export async function getGraphAccessToken(): Promise<string> {
    const activeAccount = msalInstance.getActiveAccount();

    if (!activeAccount) {
        throw new Error("No active MSAL account. Trainer must sign in.");
    }

    try {
        // Attempt to silently acquire a token using the required scopes
        const response = await msalInstance.acquireTokenSilent({
            ...graphScopes,
            account: activeAccount,
        });

        return response.accessToken;

    } catch (error) {
        // If silent acquisition fails (e.g., token expired), prompt user interaction
        console.warn("[MSAL] Silent token acquisition failed. Requesting redirect for user consent.", error);
        
        // This initiates a full-page redirect to Azure AD to get a fresh token.
        // After success, the app will reload and try getGraphAccessToken again.
        msalInstance.acquireTokenRedirect(graphScopes);
        
        // Throw an error to stop execution in the current call stack
        throw new Error("Token refresh initiated. Please wait for redirect.");
    }
}