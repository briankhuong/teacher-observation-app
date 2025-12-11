// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

// 1. Existing AuthProvider (Keep this if it manages general user state after login)
import { AuthProvider } from "./auth/AuthContext";

// 2. Import the MsalAppProvider we created in the last step
import { MsalAppProvider } from "./auth/MsalProvider";

import "./styles.css"; // your global CSS

// Use TypeScript assertion for document.getElementById
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* 3. Wrap the entire application (including BrowserRouter) with the MSAL provider */}
    <MsalAppProvider>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </MsalAppProvider>
  </React.StrictMode>
);

// NOTE: If your existing 'AuthProvider' was previously handling login 
// logic (e.g., using Supabase's built-in email/password), 
// you may need to update 'AuthProvider' later to consume the user 
// context provided by MSAL, or potentially replace it entirely.