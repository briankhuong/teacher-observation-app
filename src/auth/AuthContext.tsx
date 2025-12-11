// src/auth/AuthContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

import {
  msalInstance,
  msalInitPromise
} from "./msalInstance";

import {
  loginRequest
} from "./msalConfig";

import type { AuthenticationResult } from "@azure/msal-browser";
import { fetchUserProfile } from "../db/profiles";


// ---------------------------
// Types
// ---------------------------
interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface SimpleUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

interface AuthContextType {
  session: Session | null;
  user: SimpleUser | null;
  loading: boolean;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// ---------------------------------------------------------
// FIXED: Exchange MSAL ID Token → Supabase session
// ---------------------------------------------------------
// ---------------------------------------------------------
// FIXED: Exchange MSAL ID Token → Supabase session (with better logging)
// ---------------------------------------------------------
async function establishSupabaseSessionFromMsal(
  result: AuthenticationResult
) {
  try {
    const idToken = result.idToken;
    const claims = result.idTokenClaims as { nonce?: string } | undefined;
    const nonce = claims?.nonce;

    console.log("[AuthContext] MSAL claims:", claims);

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "azure",
      token: idToken,
      ...(nonce ? { nonce } : {}),
    });

    if (error) {
      console.error(
        "[AuthContext] Supabase signInWithIdToken error:",
        error.message,
        error.status,
        error
      );
      throw error;
    }

    console.log("[AuthContext] Supabase session data:", data);

    if (data.session) return true;
  } catch (error) {
    console.warn("[AuthContext] Failed to exchange MSAL token:", error);
  }

  return false;
}



// ---------------------------------------------------------
// Provider
// ---------------------------------------------------------
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);


  // -------------------------------------------------------
  // Popup sign-in flow (MSAL recommended for SPAs)
  // -------------------------------------------------------
  const signInWithAzure = useCallback(async () => {
    await msalInitPromise;
    try {
      const response = await msalInstance.loginPopup(loginRequest);

      if (response) {
        const ok = await establishSupabaseSessionFromMsal(response);
        if (!ok) alert("Supabase session failed to establish.");
      }

    } catch (err) {
      console.error("[MSAL] loginPopup failed:", err);
      alert("Microsoft sign-in failed.");
    } finally {
      setLoading(false);
    }
  }, []);


  // -------------------------------------------------------
  // Initial session load + silent refresh
  // -------------------------------------------------------
  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      setLoading(true);

      await msalInstance.handleRedirectPromise();

      const account = msalInstance.getActiveAccount();

      if (account) {
        try {
          const tokenResult = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account,
          });

          await establishSupabaseSessionFromMsal(tokenResult);

        } catch (err) {
          console.warn("[AuthContext] Silent token acquisition failed:", err);
        }
      }

      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!ignore) {
        setSession(currentSession);

        if (currentSession) {
          const profile = await fetchUserProfile(currentSession.user.id);
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email ?? "",
            profile,
          });
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    }

    loadSession();

    // Auth listener for all changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession ?? null);

        if (newSession) {
          const profile = await fetchUserProfile(newSession.user.id);
          setUser({
            id: newSession.user.id,
            email: newSession.user.email ?? "",
            profile,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      ignore = true;
      listener.subscription.unsubscribe();
    };
  }, []);


  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();

      msalInstance.logoutPopup({
        postLogoutRedirectUri:
          import.meta.env.VITE_AZURE_AD_REDIRECT_URI.split("/auth/redirect")[0],
      });

    } catch (err) {
      console.error("[Auth] signOut error:", err);
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);


  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithAzure,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// ---------------------------
// Hook
// ---------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used in <AuthProvider>");
  return ctx;
}
