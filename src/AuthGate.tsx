// src/AuthGate.tsx
import React from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth/AuthContext";

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { session, user, loading, signInWithAzure, signOut } = useAuth();

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">Restoring your session…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Teacher Observation</h2>
          <button className="btn" onClick={signInWithAzure}>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  // Authenticated
  return (
    <div className="auth-root">
      <header className="auth-header">
        Signed in as <strong>{user?.email}</strong>
        <button className="btn" onClick={signOut}>Sign out</button>
      </header>
      <main className="auth-main">{children}</main>
    </div>
  );
};