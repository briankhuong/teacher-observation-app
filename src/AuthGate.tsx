// src/AuthGate.tsx (FINAL WORKING CODE)
import React from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth/AuthContext";

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { session, loading, signInWithAzure } = useAuth();

  // 1) While MSAL/Supabase is restoring the session
  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-title">Teacher Observation</div>
          <div className="auth-subtitle">Restoring your session…</div>
        </div>
      </div>
    );
  }

  // 2) Not authenticated → show login screen
  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-title">Teacher Observation</div>
          <div className="auth-subtitle">
            Sign in with your Grapeseed / Office 365 account to continue.
          </div>

          <button
            type="button"
            className="btn auth-btn"
            onClick={signInWithAzure} // Initiates MSAL login redirect
          >
            Sign in with Microsoft
          </button>

          <div className="auth-hint">
            You will be redirected to the Microsoft login page, then back here.
          </div>
        </div>
      </div>
    );
  }

  // 3) Authenticated → render the app content.
  return <>{children}</>;
};